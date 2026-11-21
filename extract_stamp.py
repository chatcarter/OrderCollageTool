import os
import zipfile
import io
from PIL import Image
import numpy as np

def extract_and_clean_stamp(docx_path="本櫃印章.docx", output_path="assets/stamp_clean.png"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 1. Extract image from docx
    raw_img_bytes = None
    if os.path.exists(docx_path):
        with zipfile.ZipFile(docx_path, 'r') as z:
            for filename in z.namelist():
                if filename.startswith('word/media/') and filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    raw_img_bytes = z.read(filename)
                    break
    
    if raw_img_bytes is None:
        if os.path.exists("assets/stamp_raw.png"):
            with open("assets/stamp_raw.png", "rb") as f:
                raw_img_bytes = f.read()
        else:
            raise FileNotFoundError("無法找到印章圖片來源 (本櫃印章.docx 或 assets/stamp_raw.png)")

    # 2. Process image with Pillow and NumPy
    img = Image.open(io.BytesIO(raw_img_bytes)).convert("RGB")
    arr = np.array(img, dtype=np.float32) # H x W x 3

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    # Calculate whiteness score (paper brightness)
    # Blue ink absorbs red and green light heavily
    whiteness = 0.35 * r + 0.55 * g + 0.10 * b

    # Map whiteness to alpha:
    # High whiteness (> 235) is white paper background -> alpha = 0
    # Lower whiteness (< 130) is dense blue ink -> alpha = 255
    alpha = np.zeros_like(whiteness)
    mask = whiteness < 235.0
    alpha[mask] = (235.0 - whiteness[mask]) / (235.0 - 130.0)
    alpha = np.clip(alpha, 0.0, 1.0)
    # Smooth gamma curve
    alpha = np.power(alpha, 0.85) * 255.0
    # Noise cutoff
    alpha[alpha < 15.0] = 0.0

    # Clean stamp with uniform #003FBC (R=0, G=63, B=188)
    h, w = arr.shape[:2]
    out_arr = np.zeros((h, w, 4), dtype=np.uint8)
    out_arr[:, :, 0] = 0    # R
    out_arr[:, :, 1] = 63   # G
    out_arr[:, :, 2] = 188  # B
    out_arr[:, :, 3] = np.uint8(np.round(alpha))

    clean_img = Image.fromarray(out_arr, mode="RGBA")
    clean_img.save(output_path, "PNG")
    print(f"專櫃印章去背完成，已儲存至: {output_path} (尺寸: {w}x{h})")
    return output_path

if __name__ == "__main__":
    extract_and_clean_stamp()
