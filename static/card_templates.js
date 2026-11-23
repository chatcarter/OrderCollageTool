// =============================================================================
// OrderCollageTool - 品牌保卡智慧模板庫 (card_templates.js)
// v21: 首波建置「國際牌 Panasonic 雙聯單」並預留四大品牌擴充架構
// =============================================================================

(function (global) {
  'use strict';

  /**
   * 品牌登錄檔（四大品牌擴充架構）
   */
  const CARD_BRAND_REGISTRY = [
    {
      brandId: 'panasonic',
      brandName: 'Panasonic',
      brandZh: '國際牌',
      enabled: true,
      description: '國際牌商品保證書（雙聯單：公司聯 S203J01 / 顧客聯 S203B01）'
    },
    {
      brandId: 'lg',
      brandName: 'LG',
      brandZh: '樂金',
      enabled: false,
      comingSoon: true,
      description: 'LG 保證書（預留擴充）'
    },
    {
      brandId: 'samsung',
      brandName: 'Samsung',
      brandZh: '三星',
      enabled: false,
      comingSoon: true,
      description: 'Samsung 保證書（預留擴充）'
    },
    {
      brandId: 'hitachi_sony',
      brandName: 'Hitachi / Sony',
      brandZh: '日立 / 索尼',
      enabled: false,
      comingSoon: true,
      description: '日立 / 索尼保證書（預留擴充）'
    }
  ];

  /**
   * 各品牌保卡模板詳細規格
   */
  const CARD_TEMPLATES = {
    panasonic_slip1: {
      id: 'panasonic_slip1',
      brandId: 'panasonic',
      brand: 'Panasonic',
      brandZh: '國際牌',
      label: '國際牌 第一聯（公司聯 / 經銷商聯 S203J01）',
      shortLabel: '國際牌 第一聯（公司聯）',
      formCode: 'S203J01',
      aspectRatio: 1.48,
      borderColorType: 'panasonic_reddish_brown',
      ocrRegions: {
        model: {
          label: '機種（型號）',
          x: 0.115,
          y: 0.130,
          w: 0.245,
          h: 0.070
        },
        serial: {
          label: '機號（序號）',
          x: 0.410,
          y: 0.130,
          w: 0.240,
          h: 0.070
        }
      },
      // 偵測聯別用的輔助區域
      detectRegions: {
        formCode: { x: 0.01, y: 0.85, w: 0.24, h: 0.14 },
        leftVertical: { x: 0.01, y: 0.15, w: 0.08, h: 0.70 }
      },
      // 日期框空白避讓自動蓋印參數（兩聯通用）
      stampSpec: {
        centerX: 0.845,
        centerY: 0.365,
        widthRatio: 0.175,
        tiltRangeDeg: 1.5,
        blendMode: 'multiply'
      }
    },

    panasonic_slip2: {
      id: 'panasonic_slip2',
      brandId: 'panasonic',
      brand: 'Panasonic',
      brandZh: '國際牌',
      label: '國際牌 第二聯（顧客聯 S203B01）',
      shortLabel: '國際牌 第二聯（顧客聯）',
      formCode: 'S203B01',
      aspectRatio: 1.48,
      borderColorType: 'panasonic_reddish_brown',
      ocrRegions: {
        model: {
          label: '機種（型號）',
          x: 0.105,
          y: 0.335,
          w: 0.250,
          h: 0.070
        },
        serial: {
          label: '機號（序號）',
          x: 0.105,
          y: 0.405,
          w: 0.250,
          h: 0.070
        }
      },
      detectRegions: {
        formCode: { x: 0.01, y: 0.85, w: 0.24, h: 0.14 },
        leftVertical: { x: 0.01, y: 0.15, w: 0.08, h: 0.70 }
      },
      stampSpec: {
        centerX: 0.845,
        centerY: 0.365,
        widthRatio: 0.175,
        tiltRangeDeg: 1.5,
        blendMode: 'multiply'
      }
    }
  };

  /**
   * 偵測國際牌保卡最外圍紅褐色花邊外框的四個頂點 [TL, TR, BR, BL]
   * 回傳原圖座標系之四邊形頂點
   */
  function detectPanasonicCardQuad(srcImg) {
    const sw = srcImg.width;
    const sh = srcImg.height;
    const fallbackCorners = [
      { x: Math.round(sw * 0.04), y: Math.round(sh * 0.04) },
      { x: Math.round(sw * 0.96), y: Math.round(sh * 0.04) },
      { x: Math.round(sw * 0.96), y: Math.round(sh * 0.96) },
      { x: Math.round(sw * 0.04), y: Math.round(sh * 0.96) }
    ];

    if (!sw || !sh || sw < 40 || sh < 40) {
      return { corners: fallbackCorners, detected: false, confidence: 'low' };
    }

    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(sw, sh));
    const w = Math.max(40, Math.round(sw * scale));
    const h = Math.max(40, Math.round(sh * scale));

    const workCanvas = document.createElement('canvas');
    workCanvas.width = w;
    workCanvas.height = h;
    const wCtx = workCanvas.getContext('2d', { willReadFrequently: true });
    wCtx.drawImage(srcImg, 0, 0, w, h);
    const data = wCtx.getImageData(0, 0, w, h).data;

    // 1. 標記紅褐色外框候選像素 (Panasonic 花邊外框特徵)
    const mask = new Uint8Array(w * h);
    for (let y = 2; y < h - 2; y++) {
      const rowOffset = y * w;
      for (let x = 2; x < w - 2; x++) {
        const idx = (rowOffset + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // 紅褐色/暖棕紅色墨跡：R 明顯大於 G 與 B，且非純白高光或純黑陰影
        const rgDiff = r - g;
        const rbDiff = r - b;
        if (
          r >= 68 && r <= 235 &&
          g <= 180 && b <= 165 &&
          rgDiff >= 16 && rbDiff >= 24 &&
          rgDiff <= 150
        ) {
          mask[rowOffset + x] = 1;
        }
      }
    }

    // 2. 5x5 鄰域密度濾波（剔除孤立雜訊點，只保留連續邊框點）
    const densePts = [];
    for (let y = 3; y < h - 3; y++) {
      for (let x = 3; x < w - 3; x++) {
        if (!mask[y * w + x]) continue;
        let count = 0;
        for (let dy = -2; dy <= 2; dy++) {
          const rOff = (y + dy) * w;
          for (let dx = -2; dx <= 2; dx++) {
            count += mask[rOff + (x + dx)];
          }
        }
        if (count >= 4) {
          densePts.push({ x, y });
        }
      }
    }

    if (densePts.length < Math.max(40, (w * h) * 0.002)) {
      return { corners: fallbackCorners, detected: false, confidence: 'low' };
    }

    // 3. 計算極值四頂點（使用 1.5% 分位點排除極端離群雜點）
    let minSum = Infinity, maxSum = -Infinity;
    let minDiff = Infinity, maxDiff = -Infinity;
    let tl = null, br = null, tr = null, bl = null;

    // 先算邊界分位以過濾明顯遠離主體的噪點
    const xs = densePts.map(p => p.x).sort((a, b) => a - b);
    const ys = densePts.map(p => p.y).sort((a, b) => a - b);
    const trim = Math.floor(densePts.length * 0.005);
    const minAllowX = xs[trim] - 6;
    const maxAllowX = xs[xs.length - 1 - trim] + 6;
    const minAllowY = ys[trim] - 6;
    const maxAllowY = ys[ys.length - 1 - trim] + 6;

    const filtered = densePts.filter(
      p => p.x >= minAllowX && p.x <= maxAllowX && p.y >= minAllowY && p.y <= maxAllowY
    );

    if (filtered.length < 30) {
      return { corners: fallbackCorners, detected: false, confidence: 'low' };
    }

    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      const sum = p.x + p.y;
      const diff = p.x - p.y;
      if (sum < minSum) { minSum = sum; tl = p; }
      if (sum > maxSum) { maxSum = sum; br = p; }
      if (diff > maxDiff) { maxDiff = diff; tr = p; }
      if (diff < minDiff) { minDiff = diff; bl = p; }
    }

    if (!tl || !tr || !br || !bl) {
      return { corners: fallbackCorners, detected: false, confidence: 'low' };
    }

    // 檢查偵測到的四邊形是否具備合理寬高
    const spanW = Math.max(tr.x, br.x) - Math.min(tl.x, bl.x);
    const spanH = Math.max(bl.y, br.y) - Math.min(tl.y, tr.y);
    if (spanW < w * 0.25 || spanH < h * 0.25) {
      return { corners: fallbackCorners, detected: false, confidence: 'low' };
    }

    // 轉回原圖座標系
    const invScale = 1 / scale;
    const corners = [tl, tr, br, bl].map(p => ({
      x: Math.max(0, Math.min(sw, Math.round(p.x * invScale))),
      y: Math.max(0, Math.min(sh, Math.round(p.y * invScale)))
    }));

    return { corners, detected: true, confidence: 'high' };
  }

  /**
   * 裁切並強化對比（灰階二值化）以供 Tesseract.js 高精度局部辨識
   */
  function createEnhancedOcrCropCanvas(srcCanvas, region, upscale = 2.5) {
    const sw = srcCanvas.width;
    const sh = srcCanvas.height;
    const rx = Math.max(0, Math.round(region.x * sw));
    const ry = Math.max(0, Math.round(region.y * sh));
    const rw = Math.max(10, Math.min(sw - rx, Math.round(region.w * sw)));
    const rh = Math.max(10, Math.min(sh - ry, Math.round(region.h * sh)));

    const outW = Math.max(20, Math.round(rw * upscale));
    const outH = Math.max(20, Math.round(rh * upscale));

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = outW;
    cropCanvas.height = outH;
    const cCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';
    cCtx.fillStyle = '#FFFFFF';
    cCtx.fillRect(0, 0, outW, outH);
    cCtx.drawImage(srcCanvas, rx, ry, rw, rh, 0, 0, outW, outH);

    // 灰階與自適應對比強化（去除淡底色與表格細線干擾）
    const imgData = cCtx.getImageData(0, 0, outW, outH);
    const d = imgData.data;

    // 計算灰階直方圖以求 Otsu 閾值
    const hist = new Int32Array(256);
    const total = outW * outH;
    const grays = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const g = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
      grays[i] = g;
      hist[g]++;
    }

    let sumAll = 0;
    for (let t = 0; t < 256; t++) sumAll += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let maxVar = 0;
    let threshold = 140;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sumAll - sumB) / wF;
      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      if (varBetween > maxVar) {
        maxVar = varBetween;
        threshold = t;
      }
    }

    // 稍微偏暗一點保留細筆劃，並採用柔和強化避免斷裂
    const cut = Math.min(200, Math.max(85, threshold + 10));
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const g = grays[i];
      const val = g < cut ? Math.max(0, Math.round((g / cut) * 65)) : 255;
      d[p] = val;
      d[p + 1] = val;
      d[p + 2] = val;
      d[p + 3] = 255;
    }
    cCtx.putImageData(imgData, 0, 0);

    return cropCanvas;
  }

  /**
   * 計算區域內深色像素比例（用於離線／快速判斷版型）
   */
  function measureInkDensity(srcCanvas, region) {
    const sw = srcCanvas.width;
    const sh = srcCanvas.height;
    const rx = Math.max(0, Math.round(region.x * sw));
    const ry = Math.max(0, Math.round(region.y * sh));
    const rw = Math.max(4, Math.min(sw - rx, Math.round(region.w * sw)));
    const rh = Math.max(4, Math.min(sh - ry, Math.round(region.h * sh)));

    const tmp = document.createElement('canvas');
    tmp.width = rw;
    tmp.height = rh;
    const tCtx = tmp.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(srcCanvas, rx, ry, rw, rh, 0, 0, rw, rh);
    const data = tCtx.getImageData(0, 0, rw, rh).data;

    let darkCount = 0;
    const total = rw * rh;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 145) darkCount++;
    }
    return darkCount / Math.max(1, total);
  }

  /**
   * 自動偵測拉正後的國際牌保卡屬於第一聯（S203J01）或第二聯（S203B01）
   */
  async function detectPanasonicSlipType(warpedCanvas) {
    // 1. 若 Tesseract.js 可用，嘗試辨識左下角表單編號（S203J01 / S203B01）與上方區域
    if (global.Tesseract) {
      try {
        const codeCrop = createEnhancedOcrCropCanvas(
          warpedCanvas,
          { x: 0.01, y: 0.84, w: 0.24, h: 0.15 },
          2.5
        );
        const res = await global.Tesseract.recognize(codeCrop, 'eng');
        const txt = ((res && res.data && res.data.text) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (txt.includes('J01') || txt.includes('203J') || txt.includes('S203J')) {
          return { templateId: 'panasonic_slip1', reason: `表單編號 (${txt})` };
        }
        if (txt.includes('B01') || txt.includes('203B') || txt.includes('S203B')) {
          return { templateId: 'panasonic_slip2', reason: `表單編號 (${txt})` };
        }
      } catch (e) {
        console.warn('表單編號 OCR 偵測略過:', e);
      }
    }

    // 2. 版面墨跡密度比對（第一聯上方中左 X:41%~65% 為機號欄；第二聯該處多為空白或條款標題）
    const slip1SerialDensity = measureInkDensity(warpedCanvas, CARD_TEMPLATES.panasonic_slip1.ocrRegions.serial);
    const slip2SerialDensity = measureInkDensity(warpedCanvas, CARD_TEMPLATES.panasonic_slip2.ocrRegions.serial);

    if (slip1SerialDensity >= slip2SerialDensity * 0.95) {
      return { templateId: 'panasonic_slip1', reason: '版面欄位結構（第一聯）' };
    }
    return { templateId: 'panasonic_slip2', reason: '版面欄位結構（第二聯）' };
  }

  /**
   * 四角梯形透視自動拉正引擎 (4-Point Perspective Rectification)
   * 將 srcImg 中的四個角點 [TL, TR, BR, BL] 透過 Homography 雙線性插值還原為標準矩形
   */
  function rectifyPerspectivePureJS(srcImg, srcCorners, targetAspectRatio = 1.48, outputWidth = 1800) {
    if (!srcImg || !srcCorners || srcCorners.length !== 4) return null;

    const sw = srcImg.width;
    const sh = srcImg.height;
    const outW = Math.max(200, Math.round(outputWidth));
    const outH = Math.max(150, Math.round(outW / targetAspectRatio));

    // 建立 [0,1]^2 -> srcCorners 之 Homography 映射矩陣
    const x0 = srcCorners[0].x, y0 = srcCorners[0].y;
    const x1 = srcCorners[1].x, y1 = srcCorners[1].y;
    const x2 = srcCorners[2].x, y2 = srcCorners[2].y;
    const x3 = srcCorners[3].x, y3 = srcCorners[3].y;

    const dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3;
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) < 1e-7) return null;

    const g = (sx * dy2 - sy * dx2) / det;
    const h = (dx1 * sy - dy1 * sx) / det;
    const a = x1 - x0 + g * x1;
    const b = x3 - x0 + h * x3;
    const c = x0;
    const d = y1 - y0 + g * y1;
    const e = y3 - y0 + h * y3;
    const f = y0;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = sw;
    srcCanvas.height = sh;
    const sCtx = srcCanvas.getContext('2d');
    sCtx.drawImage(srcImg, 0, 0);
    const sPixels = sCtx.getImageData(0, 0, sw, sh).data;

    const dstCanvas = document.createElement('canvas');
    dstCanvas.width = outW;
    dstCanvas.height = outH;
    const dCtx = dstCanvas.getContext('2d');
    const dstData = dCtx.createImageData(outW, outH);
    const dPixels = dstData.data;

    const invW = 1 / (outW - 1);
    const invH = 1 / (outH - 1);

    for (let y = 0; y < outH; y++) {
      const v = y * invH;
      const rowOffset = y * outW * 4;
      for (let x = 0; x < outW; x++) {
        const u = x * invW;
        const denom = g * u + h * v + 1;
        if (Math.abs(denom) < 1e-8) continue;

        const srcX = (a * u + b * v + c) / denom;
        const srcY = (d * u + e * v + f) / denom;

        const dIdx = rowOffset + x * 4;
        if (srcX >= 0 && srcX <= sw - 1 && srcY >= 0 && srcY <= sh - 1) {
          const px0 = Math.floor(srcX);
          const py0 = Math.floor(srcY);
          const px1 = Math.min(sw - 1, px0 + 1);
          const py1 = Math.min(sh - 1, py0 + 1);

          const wx = srcX - px0;
          const wy = srcY - py0;
          const w00 = (1 - wx) * (1 - wy);
          const w10 = wx * (1 - wy);
          const w01 = (1 - wx) * wy;
          const w11 = wx * wy;

          const idx00 = (py0 * sw + px0) * 4;
          const idx10 = (py0 * sw + px1) * 4;
          const idx01 = (py1 * sw + px0) * 4;
          const idx11 = (py1 * sw + px1) * 4;

          dPixels[dIdx] = Math.round(w00 * sPixels[idx00] + w10 * sPixels[idx10] + w01 * sPixels[idx01] + w11 * sPixels[idx11]);
          dPixels[dIdx + 1] = Math.round(w00 * sPixels[idx00 + 1] + w10 * sPixels[idx10 + 1] + w01 * sPixels[idx01 + 1] + w11 * sPixels[idx11 + 1]);
          dPixels[dIdx + 2] = Math.round(w00 * sPixels[idx00 + 2] + w10 * sPixels[idx10 + 2] + w01 * sPixels[idx01 + 2] + w11 * sPixels[idx11 + 2]);
          dPixels[dIdx + 3] = 255;
        } else {
          dPixels[dIdx] = 255;
          dPixels[dIdx + 1] = 255;
          dPixels[dIdx + 2] = 255;
          dPixels[dIdx + 3] = 255;
        }
      }
    }

    dCtx.putImageData(dstData, 0, 0);
    return dstCanvas;
  }

  global.CardTemplates = {
    BRAND_REGISTRY: CARD_BRAND_REGISTRY,
    TEMPLATES: CARD_TEMPLATES,
    detectPanasonicCardQuad,
    detectPanasonicSlipType,
    createEnhancedOcrCropCanvas,
    rectifyPerspectivePureJS
  };
})(window);
