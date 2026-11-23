// =============================================================================
// OrderCollageTool - 品牌保卡與發票智慧模板庫 (card_templates.js)
// v24: 國際牌雙聯單 + 發票雙型態架構 (首波 Type A 銷貨明細表) + 高解析 Regex 防呆
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
      // 日期框空白避讓自動蓋印參數（兩聯通用，v23 放大 1.2x 為 21.0%）
      stampSpec: {
        centerX: 0.845,
        centerY: 0.365,
        widthRatio: 0.210,
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
        widthRatio: 0.210,
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

    // 1. 建立「淺米白／淺灰保卡底紙」遮罩 + 「紅褐色外框」候選遮罩（雙重驗證徹底排除木紋桌面干擾）(v26)
    const paperMask = new Uint8Array(w * h);
    const borderRawMask = new Uint8Array(w * h);

    for (let y = 1; y < h - 1; y++) {
      const rowOffset = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = (rowOffset + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);

        // 卡片內部底紙：高亮度且低飽和度（淺米白 / 淺灰白紙，木紋桌面飽和度通常較高且較暗）
        if (lum >= 138 && chroma <= 44) {
          paperMask[rowOffset + x] = 1;
        }

        const rgDiff = r - g;
        const rbDiff = r - b;
        if (
          r >= 58 && r <= 238 &&
          g <= 188 && b <= 172 &&
          rgDiff >= 14 && rbDiff >= 20 &&
          rgDiff <= 155
        ) {
          borderRawMask[rowOffset + x] = 1;
        }
      }
    }

    // 1b. 僅保留鄰近存在「淺色紙張」的紅褐色像素（木桌中央的暖棕色像素周圍無白紙，直接剔除）
    const mask = new Uint8Array(w * h);
    const searchRad = 10;
    for (let y = searchRad; y < h - searchRad; y++) {
      const rowOffset = y * w;
      for (let x = searchRad; x < w - searchRad; x++) {
        if (!borderRawMask[rowOffset + x]) continue;
        let paperHits = 0;
        // 採十字與對角線快速取樣鄰域內是否有卡片紙張
        for (let step = 3; step <= searchRad; step += 3) {
          if (paperMask[(y - step) * w + x]) paperHits++;
          if (paperMask[(y + step) * w + x]) paperHits++;
          if (paperMask[y * w + (x - step)]) paperHits++;
          if (paperMask[y * w + (x + step)]) paperHits++;
        }
        if (paperHits >= 2) {
          mask[rowOffset + x] = 1;
        }
      }
    }

    // 計算淺色紙張主體外框作為備援（當光線極端無法抓到紅褐色邊框時，仍可精準切除木桌背景）
    let pMinX = w, pMaxX = 0, pMinY = h, pMaxY = 0, pCount = 0;
    for (let y = 2; y < h - 2; y++) {
      let rowHits = 0;
      for (let x = 2; x < w - 2; x++) {
        if (paperMask[y * w + x]) rowHits++;
      }
      if (rowHits > w * 0.18) {
        if (y < pMinY) pMinY = y;
        if (y > pMaxY) pMaxY = y;
        pCount += rowHits;
      }
    }
    for (let x = 2; x < w - 2; x++) {
      let colHits = 0;
      for (let y = 2; y < h - 2; y++) {
        if (paperMask[y * w + x]) colHits++;
      }
      if (colHits > h * 0.18) {
        if (x < pMinX) pMinX = x;
        if (x > pMaxX) pMaxX = x;
      }
    }
    const hasPaperBox = pCount > 50 && (pMaxX - pMinX) > w * 0.28 && (pMaxY - pMinY) > h * 0.25;
    const invScalePaper = 1 / scale;
    const paperBox = hasPaperBox ? {
      x: Math.max(0, Math.round(pMinX * invScalePaper)),
      y: Math.max(0, Math.round(pMinY * invScalePaper)),
      w: Math.min(sw, Math.round((pMaxX - pMinX) * invScalePaper)),
      h: Math.min(sh, Math.round((pMaxY - pMinY) * invScalePaper))
    } : null;

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

    if (densePts.length < Math.max(35, (w * h) * 0.0015)) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', paperBox };
    }

    // 3. 計算極值四頂點（使用 1.5% 分位點排除極端離群雜點）
    let minSum = Infinity, maxSum = -Infinity;
    let minDiff = Infinity, maxDiff = -Infinity;
    let tl = null, br = null, tr = null, bl = null;

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

    if (filtered.length < 25) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', paperBox };
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
      return { corners: fallbackCorners, detected: false, confidence: 'low', paperBox };
    }

    // 檢查偵測到的四邊形是否具備合理寬高
    const spanW = Math.max(tr.x, br.x) - Math.min(tl.x, bl.x);
    const spanH = Math.max(bl.y, br.y) - Math.min(tl.y, tr.y);
    if (spanW < w * 0.25 || spanH < h * 0.25) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', paperBox };
    }

    // 轉回原圖座標系
    const invScale = 1 / scale;
    const corners = [tl, tr, br, bl].map(p => ({
      x: Math.max(0, Math.min(sw, Math.round(p.x * invScale))),
      y: Math.max(0, Math.min(sh, Math.round(p.y * invScale)))
    }));
    const quadIsLandscape = spanW / Math.max(1, spanH) >= 1.12;

    return { corners, detected: true, confidence: 'high', paperBox, quadIsLandscape };
  }

  /**
   * 裁切並進行「自適應動態對比拉伸（Stretch Min-Max Luminance）」(v26)
   * 棄用全域 Otsu 二值化，避免黑條碼導致熱感應紙淡灰文字被洗成純白
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

    // 計算灰階直方圖並使用局部動態對比拉伸 (2% ~ 90% 分位拉伸 + 柔和灰階保留)
    const imgData = cCtx.getImageData(0, 0, outW, outH);
    const d = imgData.data;

    const hist = new Int32Array(256);
    const total = outW * outH;
    const grays = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const g = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
      grays[i] = g;
      hist[g]++;
    }

    // 找出背景白點 (約 88% 分位) 與最暗墨跡點 (約 2% 分位)
    let pLow = 0;
    let pHigh = 240;
    const lowTarget = Math.floor(total * 0.02);
    const highTarget = Math.floor(total * 0.88);
    let acc = 0;
    for (let t = 0; t < 256; t++) {
      acc += hist[t];
      if (acc >= lowTarget && pLow === 0) pLow = t;
      if (acc >= highTarget) { pHigh = t; break; }
    }

    const span = Math.max(28, pHigh - pLow);
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const g = grays[i];
      // 動態對比拉伸至 [0, 1]，並針對暗色筆畫適度加濃 (gamma 1.25 -> 壓深灰階筆畫)
      let norm = (g - pLow) / span;
      if (norm <= 0) norm = 0;
      else if (norm >= 1) norm = 1;
      else norm = Math.pow(norm, 1.35);

      const val = Math.max(0, Math.min(255, Math.round(norm * 255)));
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
   * 自動偵測拉正後的國際牌保卡屬於第一聯（S203J01）或第二聯（S203B01）(v26)
   */
  async function detectPanasonicSlipType(warpedCanvas, sharedWorker = null) {
    // 1. 若有共用 Worker，依序辨識左下角表單編號（S203J01 / S203B01）與左上聯別標題
    if (sharedWorker) {
      try {
        const codeCrop = createEnhancedOcrCropCanvas(
          warpedCanvas,
          { x: 0.01, y: 0.84, w: 0.25, h: 0.15 },
          2.2
        );
        const res = await sharedWorker.recognize(codeCrop);
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

    // 2. 版面墨跡密度比對：第二聯左下 (Y:33.5%~47.5%) 有獨立型號+機號，而第一聯右下無此雙欄或上方有大量條碼
    const slip2ModelDensity = measureInkDensity(warpedCanvas, CARD_TEMPLATES.panasonic_slip2.ocrRegions.model);
    const slip2SerialDensity = measureInkDensity(warpedCanvas, CARD_TEMPLATES.panasonic_slip2.ocrRegions.serial);
    const slip2LowerAvg = (slip2ModelDensity + slip2SerialDensity) / 2;

    const slip1ModelDensity = measureInkDensity(warpedCanvas, CARD_TEMPLATES.panasonic_slip1.ocrRegions.model);
    const slip1SerialDensity = measureInkDensity(warpedCanvas, CARD_TEMPLATES.panasonic_slip1.ocrRegions.serial);
    const slip1UpperAvg = (slip1ModelDensity + slip1SerialDensity) / 2;

    // 第二聯上方區域 (Y:13%~20%) 多為空白或客戶名，下方 (Y:33.5%~47.5%) 密集有字時優先判為第二聯
    if (slip2LowerAvg >= 0.035 && slip2LowerAvg >= slip1UpperAvg * 0.90) {
      return { templateId: 'panasonic_slip2', reason: '版面欄位結構（第二聯）' };
    }
    return { templateId: 'panasonic_slip1', reason: '版面欄位結構（第一聯）' };
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

  /**
   * 取樣蓋章目標區域周邊紙張空白處的平均亮度 L 與色溫 RGB (v23)
   */
  function sampleStampRegionLighting(cardImg, centerXRatio = 0.845, centerYRatio = 0.365, widthRatio = 0.210) {
    const defaultLighting = { avgL: 235, avgR: 238, avgG: 236, avgB: 232, sampleCount: 0 };
    if (!cardImg || !cardImg.width || !cardImg.height) return defaultLighting;

    const sw = cardImg.width;
    const sh = cardImg.height;
    const sampleW = Math.max(24, Math.round(sw * widthRatio * 0.85));
    const sampleH = Math.max(24, Math.round(sampleW * 0.72));
    const cx = Math.round(sw * centerXRatio);
    const cy = Math.round(sh * centerYRatio);

    const sx = Math.max(0, Math.min(sw - sampleW, cx - Math.round(sampleW / 2)));
    const sy = Math.max(0, Math.min(sh - sampleH, cy - Math.round(sampleH / 2)));
    const w = Math.min(sampleW, sw - sx);
    const h = Math.min(sampleH, sh - sy);
    if (w <= 4 || h <= 4) return defaultLighting;

    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tCtx = tmp.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(cardImg, sx, sy, w, h, 0, 0, w, h);
    const data = tCtx.getImageData(0, 0, w, h).data;

    // 收集像素亮度，排除極深色文字線條，僅統計紙張空白底色
    const candidates = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      candidates.push({ r, g, b, lum });
    }
    if (candidates.length === 0) return defaultLighting;

    // 取亮度前 55% 的紙張空白像素（過濾掉黑字與邊框墨線）
    candidates.sort((a, b) => b.lum - a.lum);
    const topCount = Math.max(10, Math.floor(candidates.length * 0.55));
    let sumR = 0, sumG = 0, sumB = 0, sumL = 0;
    for (let i = 0; i < topCount; i++) {
      sumR += candidates[i].r;
      sumG += candidates[i].g;
      sumB += candidates[i].b;
      sumL += candidates[i].lum;
    }

    return {
      avgL: Math.round(sumL / topCount),
      avgR: Math.round(sumR / topCount),
      avgG: Math.round(sumG / topCount),
      avgB: Math.round(sumB / topCount),
      sampleCount: topCount
    };
  }

  /**
   * 依據目標紙張亮度與色溫調整專櫃印章油墨，消除偏暗照片上的螢光貼紙感 (v23)
   */
  function adaptStampCanvasToLighting(stampImg, dateStr, fontSize, offsetY, lighting) {
    const stampCanvas = document.createElement('canvas');
    stampCanvas.width = stampImg.width;
    stampCanvas.height = stampImg.height;
    const sCtx = stampCanvas.getContext('2d', { willReadFrequently: true });
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.drawImage(stampImg, 0, 0);

    const boxCx = 942;
    const boxCy = 719 + offsetY;
    sCtx.fillStyle = '#003FBC';
    sCtx.font = `bold ${fontSize}px "DFKai-SB", "BiauKai", "標楷體", "MingLiU", "新細明體", serif`;
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(dateStr, boxCx, boxCy);

    const avgL = lighting ? lighting.avgL : 235;
    const paperR = lighting ? lighting.avgR : 235;
    const paperG = lighting ? lighting.avgG : 235;
    const paperB = lighting ? lighting.avgB : 235;

    // 偏暗底紙 (L < 190) 時壓低印章明度並收斂飽和度 10%～22%，並微調紙張色溫融入
    const darkness = avgL < 190 ? Math.min(1, Math.max(0, (190 - avgL) / 110)) : 0;
    const satKeep = avgL < 190 ? (0.88 - darkness * 0.12) : 0.92; // 降低 8% ~ 24% 飽和度消除螢光感
    const brightScale = avgL < 190 ? (1.0 - darkness * 0.38) : 0.96;
    const alphaScale = avgL < 190 ? (0.91 - darkness * 0.08) : 0.94;

    // 底紙偏暖時微幅混入紙張環境光色溫，消除冷藍突兀感
    const warmShift = Math.max(0, (paperR - paperB) / 255) * 0.16;

    const imgData = sCtx.getImageData(0, 0, stampCanvas.width, stampCanvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a === 0) continue;

      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // 1. 收斂飽和度 (向灰階靠攏以去除螢光純藍感)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * satKeep;
      g = lum + (g - lum) * satKeep;
      b = lum + (b - lum) * satKeep;

      // 2. 壓低明度對齊拍攝陰影深度
      r *= brightScale;
      g *= brightScale;
      b *= brightScale;

      // 3. 混入紙張環境色溫
      if (warmShift > 0) {
        r = r * (1 - warmShift) + (paperR * 0.45) * warmShift;
        g = g * (1 - warmShift) + (paperG * 0.45) * warmShift;
        b = b * (1 - warmShift) + (paperB * 0.45) * warmShift;
      }

      d[i] = Math.max(0, Math.min(255, Math.round(r)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      d[i + 3] = Math.max(0, Math.min(255, Math.round(a * alphaScale)));
    }

    sCtx.putImageData(imgData, 0, 0);
    return {
      canvas: stampCanvas,
      avgL,
      darkness,
      satKeep,
      brightScale
    };
  }

  /**
   * 電子發票加強邊緣自動去背裁切（偵測白色紙張輪廓並內縮 1.5% 安全邊距）(v23)
   */
  function autoTrimReceiptImage(srcImg) {
    if (!srcImg || !srcImg.width || !srcImg.height) return null;
    const sw = srcImg.width;
    const sh = srcImg.height;
    if (sw < 60 || sh < 80) return null;

    const maxDim = 560;
    const scale = Math.min(1, maxDim / Math.max(sw, sh));
    const w = Math.max(40, Math.round(sw * scale));
    const h = Math.max(40, Math.round(sh * scale));

    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tCtx = tmp.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(srcImg, 0, 0, w, h);
    const data = tCtx.getImageData(0, 0, w, h).data;

    // 估計外圍 3% 邊框背景平均亮度（用於對比白色發票紙張）
    let edgeSum = 0, edgeCnt = 0;
    const borderMargin = Math.max(2, Math.round(Math.min(w, h) * 0.03));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x < borderMargin || x >= w - borderMargin || y < borderMargin || y >= h - borderMargin) {
          const idx = (y * w + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          edgeSum += lum;
          edgeCnt++;
        }
      }
    }
    const edgeAvgLum = edgeCnt > 0 ? (edgeSum / edgeCnt) : 120;

    // 若四週已經全是極白乾淨掃描圖 (>238)，直接檢查非極白內容外框即可
    const isAlreadyWhiteScan = edgeAvgLum > 236;

    const rowScore = new Float32Array(h);
    const colScore = new Float32Array(w);
    const paperMask = new Uint8Array(w * h);

    for (let y = 0; y < h; y++) {
      let rMatch = 0;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);

        let isForeground = false;
        if (isAlreadyWhiteScan) {
          // 白底掃描檔：找文字或邊框線所在範圍
          if (lum < 220) isForeground = true;
        } else {
          // 實拍發票：找高亮度且低彩度（白／淺灰紙張）區域
          const lumThresh = Math.max(125, Math.min(195, edgeAvgLum + 26));
          if (lum >= lumThresh && chroma <= 52) {
            isForeground = true;
          }
        }
        if (isForeground) {
          paperMask[y * w + x] = 1;
          rMatch++;
          colScore[x]++;
        }
      }
      rowScore[y] = rMatch / w;
    }
    for (let x = 0; x < w; x++) {
      colScore[x] = colScore[x] / h;
    }

    // 找出連續主要紙張跨度（避免桌面反光點干擾）
    function findMainSpan(scores, minRatio) {
      let bestStart = -1, bestEnd = -1, bestLen = 0;
      let curStart = -1;
      const maxGap = Math.max(2, Math.round(scores.length * 0.02));
      let gap = 0;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] >= minRatio) {
          if (curStart < 0) curStart = i;
          gap = 0;
          const len = i - curStart + 1;
          if (len > bestLen) {
            bestLen = len;
            bestStart = curStart;
            bestEnd = i;
          }
        } else if (curStart >= 0) {
          gap++;
          if (gap > maxGap) {
            curStart = -1;
            gap = 0;
          }
        }
      }
      return bestLen > 0 ? [bestStart, bestEnd] : null;
    }

    const colThresh = isAlreadyWhiteScan ? 0.015 : 0.18;
    const rowThresh = isAlreadyWhiteScan ? 0.015 : 0.12;
    const xSpan = findMainSpan(colScore, colThresh);
    const ySpan = findMainSpan(rowScore, rowThresh);
    if (!xSpan || !ySpan) return null;

    let x0 = xSpan[0];
    let x1 = xSpan[1];
    let y0 = ySpan[0];
    let y1 = ySpan[1];

    // 確認裁切範圍合理（至少保留原圖 22% 寬度與 30% 高度，且至少裁掉一部分背景邊緣）
    const spanW = x1 - x0 + 1;
    const spanH = y1 - y0 + 1;
    if (spanW < w * 0.22 || spanH < h * 0.30) return null;

    const trimmedAreaRatio = (spanW * spanH) / (w * h);
    if (trimmedAreaRatio > 0.96 && isAlreadyWhiteScan) return null;

    // 內縮安全邊距 1.2% 水平 / 0.8% 垂直（完全切除紙張邊緣殘留的暗色桌邊／陰影，保留完整上下內容）
    const insetRatioX = isAlreadyWhiteScan ? -0.008 : 0.012;
    const insetRatioY = isAlreadyWhiteScan ? -0.008 : 0.008;
    const invScale = 1 / scale;

    let rx = Math.round(x0 * invScale);
    let ry = Math.round(y0 * invScale);
    let rw = Math.round(spanW * invScale);
    let rh = Math.round(spanH * invScale);

    const insetX = Math.round(rw * insetRatioX);
    const insetY = Math.min(28, Math.round(rh * insetRatioY));
    rx = Math.max(0, rx + insetX);
    ry = Math.max(0, ry + insetY);
    rw = Math.max(40, Math.min(sw - rx, rw - insetX * 2));
    rh = Math.max(40, Math.min(sh - ry, rh - insetY * 2));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = rw;
    outCanvas.height = rh;
    const oCtx = outCanvas.getContext('2d');
    oCtx.imageSmoothingEnabled = true;
    oCtx.imageSmoothingQuality = 'high';
    oCtx.drawImage(srcImg, rx, ry, rw, rh, 0, 0, rw, rh);

    return outCanvas;
  }

  // ===========================================================================
  // 發票辨識雙型態架構 (v24)
  // Type A: invoice_detail_slip (銷貨明細表 / 載具明細型)
  // Type B: invoice_qr_stub (雙 QR Code 電子發票證明聯正本 — 預留擴充接口)
  // ===========================================================================
  const INVOICE_TEMPLATES = {
    invoice_detail_slip: {
      id: 'invoice_detail_slip',
      typeCode: 'Type A',
      label: '銷貨明細表／載具明細型',
      enabled: true,
      minAspectRatio: 1.3,
      keywords: ['銷貨明細表', '載具號碼', '營業人統編', '發票號碼', '退貨用條碼'],
      regions: {
        headerZone: { x: 0.01, y: 0.01, w: 0.98, h: 0.44 },
        invoiceNoZone: { x: 0.01, y: 0.50, w: 0.98, h: 0.38 } // v26: 中下段 Y: 50% ~ 88% 涵蓋退貨條碼上方發票號碼
      }
    },
    invoice_qr_stub: {
      id: 'invoice_qr_stub',
      typeCode: 'Type B',
      label: '雙 QR Code 電子發票證明聯（預留擴充）',
      enabled: false,
      comingSoon: true,
      minAspectRatio: 1.2
    }
  };

  /**
   * 修正易混淆英數（用於發票號碼數字區與統編數字區）
   */
  function fixDigitConfusions(str) {
    return (str || '')
      .toUpperCase()
      .replace(/[OQDU]/g, '0')
      .replace(/[IL|!]/g, '1')
      .replace(/Z/g, '2')
      .replace(/S/g, '5')
      .replace(/G/g, '6')
      .replace(/B/g, '8');
  }

  function fixLetterConfusions(str) {
    return (str || '')
      .toUpperCase()
      .replace(/0/g, 'O')
      .replace(/1/g, 'I')
      .replace(/2/g, 'Z')
      .replace(/5/g, 'S')
      .replace(/8/g, 'B');
  }

  /**
   * 台灣電子發票號碼正規化與 Regex 校驗 ([A-Z]{2}\d{8})，自動移除 '-' 與所有空格輸出連貫格式 (v29)
   */
  function normalizeTaiwanInvoiceNo(rawText) {
    if (!rawText) return '';
    const cleaned = rawText.replace(/\r/g, '\n');

    function extractFromText(scopeText) {
      const upper = scopeText.toUpperCase();
      // 1. 嚴格優先比對標準 2 碼大寫英文 + 8 碼數字（容許 - / 空格斷開）
      const exactRe = /([A-Z]{2})\s*[-—–]?\s*(\d[\d\s]{6,9}\d)/g;
      let m;
      while ((m = exactRe.exec(upper)) !== null) {
        const digits = m[2].replace(/\s+/g, '');
        if (/^\d{8}$/.test(digits) && digits !== '24721268') {
          return `${m[1]}${digits}`;
        }
      }
      // 2. 容許英數混淆修復（如 ZE-9373I662）
      const fuzzyRe = /([A-Z0-9]{2})\s*[-—–]?\s*([A-Z0-9][A-Z0-9\s]{6,10}[A-Z0-9])/g;
      while ((m = fuzzyRe.exec(upper)) !== null) {
        const pfx = fixLetterConfusions(m[1]);
        const num = fixDigitConfusions(m[2].replace(/\s+/g, ''));
        if (/^[A-Z]{2}$/.test(pfx) && /^\d{8}$/.test(num) && num !== '24721268') {
          return `${pfx}${num}`;
        }
      }
      return '';
    }

    // 優先鎖定「發票號碼」關鍵字同行或下一行
    const lines = cleaned.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/發票號碼|發票號|號碼[:：]/.test(line)) {
        const scope = line + ' ' + (lines[i + 1] || '');
        const hit = extractFromText(scope);
        if (hit) return hit;
      }
    }

    // 全域搜尋（支援數字內含空格）
    return extractFromText(cleaned);
  }

  /**
   * 從發票上方 OCR 文字中精準擷取賣方統編 (\d{8}) 與購買日期 (YYYY-MM-DD)，明確排除底部 店:0417 誤判 (v29)
   */
  function parseInvoiceHeaderFields(headerText, fullText = '') {
    const rawHeader = (headerText || '').replace(/\r/g, '\n');
    const rawFull = (fullText || '').replace(/\r/g, '\n');
    const scope = (rawHeader + '\n' + rawFull).replace(/\r/g, '\n');

    // 明確移除底部「店:0417 / 機: / 序:」等門市代碼，嚴禁誤判為日期
    const sanitizeStoreNoise = txt => (txt || '')
      .replace(/店\s*[:：]?\s*\d{3,6}/g, ' ')
      .replace(/機\s*[:：]?\s*\d{2,6}/g, ' ')
      .replace(/序\s*[:：]?\s*\d{2,6}/g, ' ');

    const cleanHeader = sanitizeStoreNoise(rawHeader);
    const cleanScope = sanitizeStoreNoise(scope);

    // 1. 賣方統編（營業人統編後方 8 碼純數字，容許空格）
    let sellerTaxId = '';
    const taxMatch = cleanScope.match(/(?:營業人統編|賣方統編|統編)[^\dA-Z]{0,8}([0-9OILSB\s]{8,11})/i);
    if (taxMatch) {
      const fixed = fixDigitConfusions(taxMatch[1].replace(/\s+/g, ''));
      if (/^\d{8}$/.test(fixed)) sellerTaxId = fixed;
    } else if (/24721268/.test(cleanScope)) {
      sellerTaxId = '24721268';
    }

    // 2. 購買日期：優先鎖定上方日期列（202x-MM-DD / 202x/MM/DD）並校驗月日合法範圍
    const tryExtractAdDate = txt => {
      if (!txt) return '';
      const dateRe = /(202\d)\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/g;
      let dm;
      while ((dm = dateRe.exec(txt)) !== null) {
        const yyyy = parseInt(dm[1], 10);
        const mm = parseInt(dm[2], 10);
        const dd = parseInt(dm[3], 10);
        if (yyyy >= 2020 && yyyy <= 2035 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        }
      }
      return '';
    };

    let dateStr = '';
    // A. 先從 headerText（發票上半部）找載具下方或直接出現的 202x 日期
    const headerLines = cleanHeader.split('\n');
    for (let i = 0; i < headerLines.length; i++) {
      if (/載具/.test(headerLines[i])) {
        const near = headerLines.slice(i, i + 5).join(' ');
        const hit = tryExtractAdDate(near);
        if (hit) {
          dateStr = hit;
          break;
        }
      }
    }
    if (!dateStr) {
      dateStr = tryExtractAdDate(cleanHeader);
    }

    // B. 若 headerText 未涵蓋，取 fullText 前 60% 上方區域再找一次
    if (!dateStr && cleanScope) {
      const allLines = cleanScope.split('\n').filter(l => l.trim());
      const upperLines = allLines.slice(0, Math.max(10, Math.ceil(allLines.length * 0.60)));
      for (let i = 0; i < upperLines.length; i++) {
        if (/載具/.test(upperLines[i])) {
          const hit = tryExtractAdDate(upperLines.slice(i, i + 5).join(' '));
          if (hit) {
            dateStr = hit;
            break;
          }
        }
      }
      if (!dateStr) {
        dateStr = tryExtractAdDate(upperLines.join('\n')) || tryExtractAdDate(cleanScope);
      }
    }

    // C. 最後備援：民國年日期（限明確含年/月/日或 -/. 分隔）
    if (!dateStr) {
      const roc = cleanScope.match(/(11\d|12\d)\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/);
      if (roc) {
        const mm = parseInt(roc[2], 10);
        const dd = parseInt(roc[3], 10);
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          dateStr = `${parseInt(roc[1], 10) + 1911}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        }
      }
    }

    return { sellerTaxId, dateStr };
  }

  /**
   * 過濾保卡 OCR 機種／機號中的條碼雜訊（支援 PSM 6 行內萃取型號 token）(v29)
   */
  function filterWarrantyModelResult(rawText) {
    if (!rawText) return '';
    const upperRaw = rawText.toUpperCase();
    // 優先從全文直接抽取含連字號的標準型號格式 (如 NR-D505XV-W, NA-V150MDH)
    const modelTokens = upperRaw.match(/[A-Z]{1,4}\s*-\s*[A-Z0-9-]{3,14}/g);
    if (modelTokens && modelTokens.length > 0) {
      for (let i = 0; i < modelTokens.length; i++) {
        const cleanedTok = modelTokens[i].replace(/\s+/g, '').replace(/^-+|-+$/g, '');
        if (cleanedTok.length >= 5 && /\d/.test(cleanedTok) && /[A-Z]/.test(cleanedTok)) {
          return cleanedTok;
        }
      }
    }

    const lines = upperRaw
      .split(/\r?\n/)
      .map(s => s.replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, ''))
      .filter(Boolean);
    const valid = lines.filter(tok => {
      if (tok.length < 4) return false;
      const hasDigit = /\d/.test(tok);
      const hasLetter = /[A-Z]/.test(tok);
      if (!hasDigit || !hasLetter) return false;
      const barcodeChars = (tok.match(/[ILUV]/g) || []).length;
      if (barcodeChars / tok.length > 0.70 && (tok.match(/\d/g) || []).length <= 1) return false;
      return true;
    });
    if (valid.length > 0) {
      const withHyphen = valid.find(v => /^[A-Z]{2,4}-[A-Z0-9]{3,}/.test(v));
      return withHyphen || valid[0];
    }
    const fallback = upperRaw.replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '');
    return /\d/.test(fallback) ? fallback : '';
  }

  function filterWarrantySerialResult(rawText) {
    if (!rawText) return '';
    const lines = rawText.toUpperCase()
      .split(/\r?\n/)
      .map(s => s.replace(/\s+/g, '').replace(/[^A-Z0-9]/g, ''))
      .filter(Boolean);
    // 機號至少須含 4 位以上數字（徹底剔除如 VLILOULUVOIDI 等純英文條碼誤判）
    const valid = lines.filter(tok => {
      if (tok.length < 5) return false;
      const digitCount = (tok.match(/\d/g) || []).length;
      return digitCount >= 4;
    });
    if (valid.length > 0) {
      valid.sort((a, b) => (b.match(/\d/g) || []).length - (a.match(/\d/g) || []).length);
      return valid[0];
    }
    const fallback = rawText.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
    return (fallback.match(/\d/g) || []).length >= 4 ? fallback : '';
  }

  /**
   * 離屏高解析度保卡直接合成專櫃印章（避讓座標 X:84.5%, Y:36.5%, W:21.0% ＋ 光影自適應 ＋ multiply）(v25)
   */
  function compositeStampOnOffscreenCard(cleanCardCanvas, stampImg, dateStr, fontSize, offsetY, stampSpec) {
    if (!cleanCardCanvas || !stampImg) return null;
    const spec = stampSpec || {
      centerX: 0.845,
      centerY: 0.365,
      widthRatio: 0.210,
      tiltRangeDeg: 1.5,
      blendMode: 'multiply'
    };

    const lighting = sampleStampRegionLighting(
      cleanCardCanvas,
      spec.centerX,
      spec.centerY,
      spec.widthRatio
    );
    const adapted = adaptStampCanvasToLighting(stampImg, dateStr, fontSize, offsetY, lighting);
    const adaptedStamp = adapted.canvas;

    const cw = cleanCardCanvas.width;
    const ch = cleanCardCanvas.height;
    const stampedCanvas = document.createElement('canvas');
    stampedCanvas.width = cw;
    stampedCanvas.height = ch;
    const ctx = stampedCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. 繪製高清拉正保卡底圖
    ctx.drawImage(cleanCardCanvas, 0, 0, cw, ch);

    // 2. 以 multiply 正片疊底在避讓座標蓋上光影自適應專櫃章
    const stampW = Math.round(cw * spec.widthRatio);
    const stampH = Math.round((stampW * adaptedStamp.height) / Math.max(1, adaptedStamp.width));
    const cx = cw * spec.centerX;
    const cy = ch * spec.centerY;
    const maxTilt = spec.tiltRangeDeg || 1.5;
    const tiltDeg = (Math.random() * 2 - 1) * maxTilt;
    const tiltRad = (tiltDeg * Math.PI) / 180;

    ctx.save();
    ctx.globalCompositeOperation = spec.blendMode || 'multiply';
    ctx.translate(cx, cy);
    ctx.rotate(tiltRad);
    ctx.drawImage(adaptedStamp, -stampW / 2, -stampH / 2, stampW, stampH);
    ctx.restore();

    return {
      stampedCanvas,
      lighting,
      tiltRad
    };
  }

  /**
   * v29: 100% 文字指紋優先確認 ＋ 三角色（order_sheet / receipt / warranty_card）精準鎖定
   * 徹底移除 detectRes.detected 無條件判為保卡之條款，杜絕白紙發票誤入保卡壓扁與蓋章管線
   */
  const ORDER_SHEET_KEYWORDS = [
    '集雅社', '專櫃訂購單', '訂購單', '訂單單號', '實收訂金', '預定交貨日'
  ];
  const RECEIPT_KEYWORDS = [
    '銷貨明細', '明細表', '載具號碼', '載具', '營業人統編', '統編', '發票號碼', '退貨用條碼', '退換貨', '宏匯廣場', '營業人'
  ];
  const WARRANTY_KEYWORDS = [
    'PANASONIC', '商品保證書', '保證書', '台灣松下', '經銷商確認', '經銷商', '顧客收執', '保證內容', '2601335017'
  ];
  const TAIWAN_INVOICE_STRUCT_REGEX = /[A-Z]{2}\s*[-—–]?\s*\d[\d\s]{6,9}\d/;

  function classifyDocumentByTextAndColor(ocrText, detectRes, sw, sh, isManualPanasonic = false) {
    if (isManualPanasonic) {
      return { role: 'warranty_card', reason: '手動指定國際牌保卡模板' };
    }

    const upper = (ocrText || '').toUpperCase();
    const orderHits = [];
    const receiptHits = [];
    const warrantyHits = [];

    ORDER_SHEET_KEYWORDS.forEach(kw => {
      if (upper.includes(kw.toUpperCase())) orderHits.push(kw);
    });
    RECEIPT_KEYWORDS.forEach(kw => {
      if (upper.includes(kw.toUpperCase())) receiptHits.push(kw);
    });
    WARRANTY_KEYWORDS.forEach(kw => {
      if (upper.includes(kw.toUpperCase())) warrantyHits.push(kw);
    });

    const invCodeMatch = upper.match(TAIWAN_INVOICE_STRUCT_REGEX);
    const hasInvoiceStructCode = !!(invCodeMatch && invCodeMatch[0].replace(/\D/g, '') !== '24721268');

    // 1. 100% 鎖定為「發票 (receipt)」：命中台灣發票 2英+8數 結構編號，或命中發票專屬文字指紋
    if (hasInvoiceStructCode) {
      return {
        role: 'receipt',
        reason: `預掃描命中發票編號 (${invCodeMatch[0].replace(/[\s-—–]/g, '')})`
      };
    }
    if (receiptHits.length > 0 && receiptHits.length >= warrantyHits.length) {
      return {
        role: 'receipt',
        reason: `預掃描命中發票指紋 (${receiptHits.slice(0, 3).join('、')})`
      };
    }

    // 2. 100% 鎖定為「訂購單 (order_sheet)」：圖片格式且命中訂購單專屬關鍵字
    if (orderHits.length > 0 && warrantyHits.length === 0) {
      return {
        role: 'order_sheet',
        reason: `預掃描命中訂購單指紋 (${orderHits.slice(0, 3).join('、')})`
      };
    }

    // 3. 100% 鎖定為「保卡 (warranty_card)」：命中保卡專屬關鍵字
    if (warrantyHits.length > 0) {
      return {
        role: 'warranty_card',
        reason: `預掃描命中保卡指紋 (${warrantyHits.slice(0, 3).join('、')})`
      };
    }

    // 4. 無關鍵字命中時之比例與色彩備援（絕不使用 detectRes.detected 直接搶判直立發票）
    const isHorizontal = sw >= sh;
    const aspectHW = sh / Math.max(1, sw);
    const paperBox = detectRes && detectRes.paperBox ? detectRes.paperBox : null;
    const paperAspectHW = paperBox ? (paperBox.h / Math.max(1, paperBox.w)) : 0;
    const isPortraitReceipt = (!isHorizontal && aspectHW > 1.30) || (paperAspectHW > 1.30);
    const paperIsHorizontal = !!(paperBox && (paperBox.w / Math.max(1, paperBox.h)) >= 1.15);

    if (isPortraitReceipt) {
      return { role: 'receipt', reason: '無保卡文字且影像／紙張呈直立長條比例 (H/W > 1.30)' };
    }
    if (detectRes && detectRes.detected && detectRes.quadIsLandscape !== false && (isHorizontal || paperIsHorizontal)) {
      return { role: 'warranty_card', reason: '紅褐色外框＋橫向保卡比例特徵' };
    }
    if (isHorizontal || paperIsHorizontal) {
      return { role: 'warranty_card', reason: '橫向卡片比例特徵' };
    }
    return { role: 'receipt', reason: '預設直向單據特徵' };
  }

  /**
   * v29: Noise-Filtered Text-Anchored Crop — 過濾雜訊字框後，以內部有效文字群外推熱感應紙真實邊界
   * 左右各外擴 12% * textW，上方標題上擴 0.8x 行高（切除上方折角），下方下擴 1.2x 行高，驗證 1.4 <= H/W <= 3.2
   */
  function computeTextAnchoredReceiptCrop(srcImg, ocrData, preScale = 1) {
    if (!srcImg || !ocrData) return null;
    const sw = srcImg.width;
    const sh = srcImg.height;
    const invScale = 1 / Math.max(0.05, preScale);

    // 收集有效文字行或單詞（優先使用 lines，不足 3 行則降級 words）
    const rawItems = (Array.isArray(ocrData.lines) && ocrData.lines.length >= 3)
      ? ocrData.lines
      : (Array.isArray(ocrData.words) ? ocrData.words : []);

    const minBoxW = Math.max(8, sw * 0.015);
    const minBoxH = Math.max(6, sh * 0.005);

    const candidates = [];
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const txt = (item && item.text ? item.text : '').trim();
      const b = item && item.bbox;
      if (!txt || !b) continue;
      if (typeof item.confidence === 'number' && item.confidence < 32) continue;

      const x0 = b.x0 * invScale;
      const y0 = b.y0 * invScale;
      const x1 = b.x1 * invScale;
      const y1 = b.y1 * invScale;
      const bw = x1 - x0;
      const bh = y1 - y0;

      // 過濾極小孤立雜訊點與跨圖異常大框
      if (bw < minBoxW || bh < minBoxH) continue;
      if (bw > sw * 0.92 || bh > sh * 0.14) continue;
      // 必須包含實際中英數印刷字元（剔除純標點／雜線）
      const coreChars = txt.replace(/[^A-Za-z0-9\u4e00-\u9fff]/g, '');
      if (coreChars.length === 0) continue;

      candidates.push({
        text: txt,
        conf: typeof item.confidence === 'number' ? item.confidence : 60,
        x0,
        y0,
        x1,
        y1,
        bw,
        bh,
        cx: (x0 + x1) / 2
      });
    }

    if (candidates.length < 3) return null;

    // 空間聚類去離群：剔除偏離主體文字直欄之桌面邊緣雜訊點
    let boxes = candidates;
    if (candidates.length >= 5) {
      const sortedX0 = [...candidates].map(b => b.x0).sort((a, b) => a - b);
      const sortedX1 = [...candidates].map(b => b.x1).sort((a, b) => a - b);
      const qLowX0 = sortedX0[Math.floor(sortedX0.length * 0.15)];
      const qHighX1 = sortedX1[Math.floor(sortedX1.length * 0.85)];
      const spanGuard = Math.max(sw * 0.14, (qHighX1 - qLowX0) * 0.35);
      const clustered = candidates.filter(b => b.x0 >= qLowX0 - spanGuard && b.x1 <= qHighX1 + spanGuard);
      if (clustered.length >= 3) boxes = clustered;
    }

    if (boxes.length < 3) return null;

    // 計算有效文字行高代表值（中位數）
    const heights = boxes.map(b => b.bh).sort((a, b) => a - b);
    const medianH = heights[Math.floor(heights.length / 2)] || 24;

    // 1. 左右紙張邊界外推（Width Anchors: ±12% * textW）
    const minX0 = Math.min(...boxes.map(b => b.x0));
    const maxX1 = Math.max(...boxes.map(b => b.x1));
    const textW = maxX1 - minX0;
    if (textW < sw * 0.12) return null;

    const cropX0 = Math.max(0, Math.round(minX0 - 0.12 * textW));
    const cropX1 = Math.min(sw, Math.round(maxX1 + 0.12 * textW));

    // 2. 上下紙張邊界外推（Height Anchors: 頂部 +0.8x 行高切除折角、底部 +1.2x 行高）
    const upperBoxes = boxes.filter(b => b.y0 < sh * 0.55).sort((a, b) => a.y0 - b.y0);
    const headerAnchor = upperBoxes.find(b => /宏匯|銷貨明細|明細表|營業人|電子發票/.test(b.text)) || upperBoxes[0] || boxes[0];
    const topAnchorH = Math.max(medianH, Math.min(medianH * 2.2, headerAnchor.bh));
    const cropY0 = Math.max(0, Math.round(headerAnchor.y0 - 0.8 * topAnchorH));

    const sortedByBottom = [...boxes].sort((a, b) => b.y1 - a.y1);
    const bottomAnchor = sortedByBottom.find(b => /退換貨|請持本聯|本聯|店[:：]\d|機[:：]|序[:：]/.test(b.text)) || sortedByBottom[0];
    const botAnchorH = Math.max(medianH, Math.min(medianH * 2.0, bottomAnchor.bh));
    const cropY1 = Math.min(sh, Math.round(bottomAnchor.y1 + 1.2 * botAnchorH));

    const cropW = cropX1 - cropX0;
    const cropH = cropY1 - cropY0;
    if (cropW < sw * 0.18 || cropH < sh * 0.25) return null;

    // 3. 驗證合理熱感應紙高寬比（1.4 <= H/W <= 3.2）
    const hwRatio = cropH / Math.max(1, cropW);
    if (hwRatio < 1.4 || hwRatio > 3.2) return null;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = cropW;
    outCanvas.height = cropH;
    const oCtx = outCanvas.getContext('2d');
    oCtx.imageSmoothingEnabled = true;
    oCtx.imageSmoothingQuality = 'high';
    oCtx.drawImage(srcImg, cropX0, cropY0, cropW, cropH, 0, 0, cropW, cropH);

    return {
      canvas: outCanvas,
      method: 'text_anchors',
      box: { x: cropX0, y: cropY0, w: cropW, h: cropH },
      anchorCount: boxes.length
    };
  }

  global.CardTemplates = {
    BRAND_REGISTRY: CARD_BRAND_REGISTRY,
    TEMPLATES: CARD_TEMPLATES,
    INVOICE_TEMPLATES,
    detectPanasonicCardQuad,
    detectPanasonicSlipType,
    createEnhancedOcrCropCanvas,
    rectifyPerspectivePureJS,
    sampleStampRegionLighting,
    adaptStampCanvasToLighting,
    compositeStampOnOffscreenCard,
    autoTrimReceiptImage,
    classifyDocumentByTextAndColor,
    computeTextAnchoredReceiptCrop,
    normalizeTaiwanInvoiceNo,
    parseInvoiceHeaderFields,
    filterWarrantyModelResult,
    filterWarrantySerialResult
  };
})(window);
