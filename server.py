import os
import io
import re
import uuid
import base64
import math
import numpy as np
from flask import Flask, request, jsonify, send_from_directory, send_file
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__, static_folder="static")

# In-memory storage for cached PDF pages
PDF_CACHE = {}

def get_base64_from_image(pil_img, format="PNG"):
    buffered = io.BytesIO()
    pil_img.save(buffered, format=format)
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/{format.lower()};base64,{img_str}"

def decode_base64_image(data_uri):
    if "," in data_uri:
        data_uri = data_uri.split(",", 1)[1]
    img_bytes = base64.b64decode(data_uri)
    return Image.open(io.BytesIO(img_bytes))

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/<path:filename>")
def serve_static(filename):
    if os.path.exists(os.path.join("static", filename)):
        return send_from_directory("static", filename)
    elif os.path.exists(os.path.join("assets", filename)):
        return send_from_directory("assets", filename)
    return ("Not Found", 404)

@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory("assets", filename)

@app.route("/api/stamp", methods=["GET"])
def get_stamp_info():
    stamp_path = os.path.join("assets", "stamp_clean.png")
    if not os.path.exists(stamp_path):
        try:
            from extract_stamp import extract_and_clean_stamp
            extract_and_clean_stamp()
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
    
    return jsonify({
        "status": "ok",
        "url": "/assets/stamp_clean.png",
        "center": {"x": 942.5, "y": 719.0},
        "box": {"x": 520, "y": 528, "w": 845, "h": 382},
        "total_size": {"w": 1844, "h": 1440}
    })

@app.route("/api/generate_stamp_with_date", methods=["POST"])
def generate_stamp_with_date():
    try:
        data = request.get_json() or {}
        date_text = data.get("date_text", "115.11.21")
        
        stamp_path = os.path.join("assets", "stamp_clean.png")
        if not os.path.exists(stamp_path):
            from extract_stamp import extract_and_clean_stamp
            extract_and_clean_stamp()

        base_stamp = Image.open(stamp_path).convert("RGBA")
        w, h = base_stamp.size

        # Central date box coordinates:
        # X: 520 to 1365 (w=845), Y: 528 to 910 (h=382)
        box_cx = 942
        box_cy = 719

        # Render date onto an overlay
        txt_overlay = Image.new("RGBA", (w, h), (255, 255, 255, 0))
        draw = ImageDraw.Draw(txt_overlay)

        # Look for fonts: KaiTi / MingLiU / BiauKai / SimHei / Arial
        font_paths = [
            "C:\\Windows\\Fonts\\kaiu.ttf",      # 標楷體 (DFKai-SB)
            "C:\\Windows\\Fonts\\mingliu.ttc",   # 新細明體
            "C:\\Windows\\Fonts\\msjh.ttc",      # 微軟正黑體
            "C:\\Windows\\Fonts\\simsun.ttc",
            "C:\\Windows\\Fonts\\arial.ttf"
        ]
        font = None
        font_size = 140
        for fp in font_paths:
            if os.path.exists(fp):
                try:
                    font = ImageFont.truetype(fp, font_size)
                    break
                except Exception:
                    pass
        if font is None:
            font = ImageFont.load_default()

        # Measure text
        bbox = draw.textbbox((0, 0), date_text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]

        # Center in box
        tx = box_cx - tw / 2 - bbox[0]
        ty = box_cy - th / 2 - bbox[1]

        # Draw date text with exact ink color: #003FBC (R: 0, G: 63, B: 188)
        draw.text((tx, ty), date_text, font=font, fill=(0, 63, 188, 255))

        # Composite together
        composite = Image.alpha_composite(base_stamp, txt_overlay)
        data_uri = get_base64_from_image(composite, format="PNG")

        return jsonify({
            "status": "ok",
            "data_uri": data_uri,
            "date_text": date_text,
            "width": w,
            "height": h
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/upload_pdf", methods=["POST"])
def upload_pdf():
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return jsonify({"status": "error", "message": "後端尚未安裝 PyMuPDF (fitz) 套件"}), 500

    if "file" not in request.files:
        return jsonify({"status": "error", "message": "未收到上傳檔案"}), 400

    file = request.files["file"]
    pdf_bytes = file.read()

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if len(doc) == 0:
            return jsonify({"status": "error", "message": "PDF 檔案為空"}), 400

        page = doc[0]
        scale = 2.5
        matrix = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        img_full = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        # Detect cut line based on text coordinates
        # Search for: "實收訂金金額", "尚餘尾款", "總金額(含稅)", "總金額", "訂金", "尾款"
        text_page = page.get_text("blocks")
        found_y1_list = []
        stop_y0_list = []

        keywords_row = ["實收訂金", "尚餘尾款", "總金額", "含稅", "訂金金額"]
        keywords_cutoff = ["施工確認", "施工確認項目", "注意事項", "客戶簽名", "訂購人簽名"]

        for b in text_page:
            # b: (x0, y0, x1, y1, text, block_no, block_type)
            b_text = b[4]
            for kw in keywords_row:
                if kw in b_text:
                    found_y1_list.append(b[3])
            for kw in keywords_cutoff:
                if kw in b_text:
                    stop_y0_list.append(b[1])

        crop_y_pt = None
        if found_y1_list:
            # Take the lowest target row coordinate + 15 pt margin
            crop_y_pt = max(found_y1_list) + 15
        elif stop_y0_list:
            crop_y_pt = min(stop_y0_list) - 5
        else:
            # Default to 60% of page height
            crop_y_pt = page.rect.height * 0.60

        # Ensure inside page bounds
        crop_y_px = int(crop_y_pt * scale)
        crop_y_px = max(100, min(pix.height, crop_y_px))

        # Crop from top header (y=0) to crop_y_px
        img_cropped = img_full.crop((0, 0, pix.width, crop_y_px))

        pdf_id = str(uuid.uuid4())
        PDF_CACHE[pdf_id] = {
            "full_image": img_full,
            "width": pix.width,
            "height": pix.height,
            "crop_y": crop_y_px
        }

        cropped_data_uri = get_base64_from_image(img_cropped, format="PNG")

        return jsonify({
            "status": "ok",
            "pdf_id": pdf_id,
            "cropped_data_uri": cropped_data_uri,
            "crop_y": crop_y_px,
            "full_width": pix.width,
            "full_height": pix.height,
            "crop_ratio": round(crop_y_px / pix.height, 4)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": f"處理 PDF 失敗: {str(e)}"}), 500

@app.route("/api/crop_pdf", methods=["POST"])
def crop_pdf():
    try:
        data = request.get_json() or {}
        pdf_id = data.get("pdf_id")
        crop_ratio = float(data.get("crop_ratio", 0.6))
        
        if pdf_id not in PDF_CACHE:
            return jsonify({"status": "error", "message": "找不到快取的 PDF 影像"}), 404

        cached = PDF_CACHE[pdf_id]
        img_full = cached["full_image"]
        w = cached["width"]
        h = cached["height"]

        crop_y_px = int(h * crop_ratio)
        crop_y_px = max(50, min(h, crop_y_px))

        img_cropped = img_full.crop((0, 0, w, crop_y_px))
        cropped_data_uri = get_base64_from_image(img_cropped, format="PNG")

        return jsonify({
            "status": "ok",
            "cropped_data_uri": cropped_data_uri,
            "crop_y": crop_y_px,
            "crop_ratio": round(crop_y_px / h, 4)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/perspective_transform", methods=["POST"])
def perspective_transform():
    try:
        import cv2
    except ImportError:
        return jsonify({"status": "error", "message": "後端尚未安裝 OpenCV (cv2) 套件"}), 500

    try:
        data = request.get_json() or {}
        image_data = data.get("image_data")
        points = data.get("points") # [[x0,y0], [x1,y1], [x2,y2], [x3,y3]] tl, tr, br, bl

        if not image_data or not points or len(points) != 4:
            return jsonify({"status": "error", "message": "缺少影像資料或角點不足 4 點"}), 400

        pil_img = decode_base64_image(image_data).convert("RGB")
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

        pts_src = np.array(points, dtype=np.float32)
        (tl, tr, br, bl) = pts_src

        # Calculate width of new image
        width_a = np.linalg.norm(br - bl)
        width_b = np.linalg.norm(tr - tl)
        max_width = max(int(width_a), int(width_b))

        # Calculate height of new image
        height_a = np.linalg.norm(tr - br)
        height_b = np.linalg.norm(tl - bl)
        max_height = max(int(height_a), int(height_b))

        if max_width <= 10 or max_height <= 10:
            return jsonify({"status": "error", "message": "選取區域過小"}), 400

        pts_dst = np.array([
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1]
        ], dtype=np.float32)

        M = cv2.getPerspectiveTransform(pts_src, pts_dst)
        warped = cv2.warpPerspective(cv_img, M, (max_width, max_height), flags=cv2.INTER_LANCZOS4)

        warped_rgb = cv2.cvtColor(warped, cv2.COLOR_BGR2RGB)
        out_pil = Image.fromarray(warped_rgb)
        out_data_uri = get_base64_from_image(out_pil, format="PNG")

        return jsonify({
            "status": "ok",
            "data_uri": out_data_uri,
            "width": max_width,
            "height": max_height
        })
    except Exception as e:
        return jsonify({"status": "error", "message": f"透視變形校正失敗: {str(e)}"}), 500

@app.route("/api/document_scan_enhance", methods=["POST"])
def document_scan_enhance():
    try:
        import cv2
    except ImportError:
        return jsonify({"status": "error", "message": "後端尚未安裝 OpenCV (cv2) 套件"}), 500

    try:
        data = request.get_json() or {}
        image_data = data.get("image_data")
        shadow_strength = float(data.get("shadow_strength", 70)) / 100.0  # 0.0 - 1.0
        brightness = float(data.get("brightness", 0))                      # -50 to 50
        contrast = float(data.get("contrast", 1.2))                        # 0.5 to 2.5

        if not image_data:
            return jsonify({"status": "error", "message": "缺少影像資料"}), 400

        pil_img = decode_base64_image(image_data).convert("RGB")
        img_np = np.array(pil_img) # H x W x 3 RGB

        # Document scan shadow removal algorithm
        # Divide by estimated background illumination
        result = img_np.astype(np.float32)
        
        if shadow_strength > 0.01:
            # Estimate background per channel using morphological dilation + large blur
            bg_channels = []
            for ch in range(3):
                plane = img_np[:, :, ch]
                dilated = cv2.dilate(plane, np.ones((7, 7), np.uint8))
                bg = cv2.medianBlur(dilated, 21)
                bg = cv2.GaussianBlur(bg, (51, 51), 0)
                bg_channels.append(bg.astype(np.float32))
            
            bg_img = np.stack(bg_channels, axis=2)
            bg_img = np.maximum(bg_img, 1.0) # avoid division by zero

            # Illumination normalization
            divided = (result / bg_img) * 255.0
            divided = np.clip(divided, 0, 255)

            # Blend based on shadow_strength
            result = (1.0 - shadow_strength) * result + shadow_strength * divided

        # Apply contrast and brightness
        result = (result - 128.0) * contrast + 128.0 + brightness
        result = np.clip(result, 0, 255).astype(np.uint8)

        out_pil = Image.fromarray(result)
        out_data_uri = get_base64_from_image(out_pil, format="PNG")

        return jsonify({
            "status": "ok",
            "data_uri": out_data_uri
        })
    except Exception as e:
        return jsonify({"status": "error", "message": f"影像美化失敗: {str(e)}"}), 500

if __name__ == "__main__":
    # Ensure stamp exists
    try:
        from extract_stamp import extract_and_clean_stamp
        if not os.path.exists("assets/stamp_clean.png"):
            extract_and_clean_stamp()
    except Exception as e:
        print("Note: Could not initialize stamp:", e)

    print("=" * 60)
    print(" 訂單、保卡與發票拼貼工作台伺服器已啟動")
    print(" 請在瀏覽器開啟: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5000, debug=False)
