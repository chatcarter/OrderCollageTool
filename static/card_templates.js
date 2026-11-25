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
      enabled: true,
      description: 'LG 台灣樂金電器股份有限公司商品保證書 (lg_tw)'
    },
    {
      brandId: 'mitsubishi',
      brandName: 'Mitsubishi',
      brandZh: '三菱',
      enabled: true,
      description: '台灣三菱電機股份有限公司商品保證書 (mitsubishi_tw)'
    },
    {
      brandId: 'hitachi',
      brandName: 'Hitachi',
      brandZh: '日立',
      enabled: true,
      description: '台灣日立阿奇立克家電製品保證書 (hitachi_tw)'
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
      brandId: 'sony',
      brandName: 'Sony',
      brandZh: '索尼',
      enabled: false,
      comingSoon: true,
      description: 'Sony 保證書（預留擴充）'
    }
  ];

  /**
   * 國際牌保證書封版專屬核心規格（獨立隔離，後續新增 LG / Samsung 等品牌僅新增獨立條目）(v30)
   */
  const PANASONIC_STAMP_SPEC = Object.freeze({
    centerX: 0.845,
    centerY: 0.395,
    widthRatio: 0.210,
    tiltRangeDeg: 1.5,
    blendMode: 'multiply'
  });

  const PANASONIC_WARRANTY_CONFIG = Object.freeze({
    brandId: 'panasonic',
    aspectRatio: 1.48,
    borderColorType: 'panasonic_reddish_brown',
    stampSpec: PANASONIC_STAMP_SPEC,
    detectRegions: Object.freeze({
      formCode: Object.freeze({ x: 0.01, y: 0.85, w: 0.24, h: 0.14 }),
      leftVertical: Object.freeze({ x: 0.01, y: 0.15, w: 0.08, h: 0.70 })
    }),
    slip1Regions: Object.freeze({
      model: Object.freeze({ label: '機種（型號）', x: 0.115, y: 0.130, w: 0.245, h: 0.070 }),
      serial: Object.freeze({ label: '機號（序號）', x: 0.410, y: 0.130, w: 0.240, h: 0.070 }),
      leftInfoBlock: Object.freeze({ label: '左側基本資料整塊區（第一聯）', x: 0.025, y: 0.105, w: 0.650, h: 0.125 })
    }),
    slip2Regions: Object.freeze({
      model: Object.freeze({ label: '機種（型號）', x: 0.055, y: 0.305, w: 0.280, h: 0.068 }),
      serial: Object.freeze({ label: '機號（序號）', x: 0.055, y: 0.382, w: 0.280, h: 0.068 }),
      leftInfoBlock: Object.freeze({ label: '左側基本資料整塊區（第二聯）', x: 0.020, y: 0.275, w: 0.365, h: 0.205 })
    })
  });

  /**
   * 各品牌保卡模板詳細規格（以品牌獨立封裝，供未來擴充多品牌互不干擾）
   */
  const CARD_TEMPLATES = {
    panasonic_slip1: {
      id: 'panasonic_slip1',
      brandId: PANASONIC_WARRANTY_CONFIG.brandId,
      brand: 'Panasonic',
      brandZh: '國際牌',
      label: '國際牌 第一聯（公司聯 / 經銷商聯 S203J01）',
      shortLabel: '國際牌 第一聯（公司聯）',
      formCode: 'S203J01',
      aspectRatio: PANASONIC_WARRANTY_CONFIG.aspectRatio,
      borderColorType: PANASONIC_WARRANTY_CONFIG.borderColorType,
      ocrRegions: {
        model: { ...PANASONIC_WARRANTY_CONFIG.slip1Regions.model },
        serial: { ...PANASONIC_WARRANTY_CONFIG.slip1Regions.serial },
        leftInfoBlock: { ...PANASONIC_WARRANTY_CONFIG.slip1Regions.leftInfoBlock }
      },
      detectRegions: {
        formCode: { ...PANASONIC_WARRANTY_CONFIG.detectRegions.formCode },
        leftVertical: { ...PANASONIC_WARRANTY_CONFIG.detectRegions.leftVertical }
      },
      stampSpec: { ...PANASONIC_STAMP_SPEC }
    },

    panasonic_slip2: {
      id: 'panasonic_slip2',
      brandId: PANASONIC_WARRANTY_CONFIG.brandId,
      brand: 'Panasonic',
      brandZh: '國際牌',
      label: '國際牌 第二聯（顧客聯 S203B01）',
      shortLabel: '國際牌 第二聯（顧客聯）',
      formCode: 'S203B01',
      aspectRatio: PANASONIC_WARRANTY_CONFIG.aspectRatio,
      borderColorType: PANASONIC_WARRANTY_CONFIG.borderColorType,
      ocrRegions: {
        model: { ...PANASONIC_WARRANTY_CONFIG.slip2Regions.model },
        serial: { ...PANASONIC_WARRANTY_CONFIG.slip2Regions.serial },
        leftInfoBlock: { ...PANASONIC_WARRANTY_CONFIG.slip2Regions.leftInfoBlock }
      },
      detectRegions: {
        formCode: { ...PANASONIC_WARRANTY_CONFIG.detectRegions.formCode },
        leftVertical: { ...PANASONIC_WARRANTY_CONFIG.detectRegions.leftVertical }
      },
      stampSpec: { ...PANASONIC_STAMP_SPEC }
    }
  };

  // 別名映射：供外部查詢 panasonic_warranty 封版設定（預設對應第二聯顧客聯座標與共用封版比例）
  CARD_TEMPLATES.panasonic_warranty = CARD_TEMPLATES.panasonic_slip2;

  /**
   * LG 台灣樂金電器保證書獨立命名空間規格 (lg_tw，嚴格隔離絕不干擾 Panasonic 邏輯) (v46/v52)
   */
  const LG_TW_STAMP_SPEC = Object.freeze({
    centerX: 0.730,
    centerY: 0.585,
    widthRatio: 0.172,
    tiltRangeDeg: 1.5,
    blendMode: 'multiply'
  });

  const LG_TW_WARRANTY_CONFIG = Object.freeze({
    brandId: 'lg',
    aspectRatio: 1.42,
    borderColorType: 'lg_white_sticker',
    stampSpec: LG_TW_STAMP_SPEC,
    ocrRegions: Object.freeze({
      model: Object.freeze({ label: '機型（LG）', x: 0.415, y: 0.285, w: 0.220, h: 0.095 }),
      serial: Object.freeze({ label: '機號（LG）', x: 0.675, y: 0.285, w: 0.265, h: 0.095 }),
      barcodeSerial: Object.freeze({ label: '機號上方一維條碼（Code 128）', x: 0.595, y: 0.145, w: 0.370, h: 0.175 }),
      topFormBlock: Object.freeze({ label: 'LG 基本資料列（商品名／機型／機號）', x: 0.050, y: 0.275, w: 0.900, h: 0.120 }),
      dealerAndQrBlock: Object.freeze({ label: '經銷商店章與右側QR碼雙地標區', x: 0.540, y: 0.420, w: 0.440, h: 0.560 })
    }),
    dealerBoxSearchRegion: Object.freeze({
      x: 0.58, y: 0.43, w: 0.38, h: 0.36
    })
  });

  CARD_TEMPLATES.lg_tw = {
    id: 'lg_tw',
    brandId: LG_TW_WARRANTY_CONFIG.brandId,
    brand: 'LG',
    brandZh: 'LG',
    label: 'LG 台灣樂金電器保證書 (lg_tw)',
    shortLabel: 'LG 台灣樂金保證書',
    formCode: 'LG_TW',
    aspectRatio: LG_TW_WARRANTY_CONFIG.aspectRatio,
    borderColorType: LG_TW_WARRANTY_CONFIG.borderColorType,
    ocrRegions: {
      model: { ...LG_TW_WARRANTY_CONFIG.ocrRegions.model },
      serial: { ...LG_TW_WARRANTY_CONFIG.ocrRegions.serial },
      topFormBlock: { ...LG_TW_WARRANTY_CONFIG.ocrRegions.topFormBlock }
    },
    stampSpec: { ...LG_TW_STAMP_SPEC }
  };

  /**
   * 台灣三菱電機商品保證書獨立命名空間規格 (mitsubishi_tw，嚴格隔離絕不干擾 Panasonic 與 LG 邏輯) (v53/v54 放大1.4倍四邊對齊定版)
   */
  const MITSUBISHI_TW_STAMP_SPEC = Object.freeze({
    centerX: 0.218,
    centerY: 0.788,
    widthRatio: 0.285,
    tiltRangeDeg: 1.5,
    blendMode: 'multiply'
  });

  const MITSUBISHI_TW_WARRANTY_CONFIG = Object.freeze({
    brandId: 'mitsubishi',
    aspectRatio: 1.58,
    borderColorType: 'mitsubishi_white_dual_red',
    stampSpec: MITSUBISHI_TW_STAMP_SPEC,
    ocrRegions: Object.freeze({
      model: Object.freeze({ label: '機型（三菱）', x: 0.115, y: 0.158, w: 0.125, h: 0.057 }),
      serial: Object.freeze({ label: '製造號碼（三菱）', x: 0.340, y: 0.140, w: 0.195, h: 0.095 }),
      topFormBlock: Object.freeze({ label: '三菱機型與製造號碼區', x: 0.025, y: 0.125, w: 0.620, h: 0.130 }),
      dealerStampZone: Object.freeze({ label: '三菱左下經銷商與電話錨點區', x: 0.015, y: 0.500, w: 0.480, h: 0.430 })
    }),
    dealerBoxSearchRegion: Object.freeze({
      x: 0.015, y: 0.500, w: 0.480, h: 0.430
    })
  });

  CARD_TEMPLATES.mitsubishi_tw = {
    id: 'mitsubishi_tw',
    brandId: MITSUBISHI_TW_WARRANTY_CONFIG.brandId,
    brand: 'Mitsubishi',
    brandZh: '三菱',
    label: '台灣三菱電機商品保證書 (mitsubishi_tw)',
    shortLabel: '台灣三菱電機保證書',
    formCode: 'MITSUBISHI_TW',
    aspectRatio: MITSUBISHI_TW_WARRANTY_CONFIG.aspectRatio,
    borderColorType: MITSUBISHI_TW_WARRANTY_CONFIG.borderColorType,
    ocrRegions: {
      model: { ...MITSUBISHI_TW_WARRANTY_CONFIG.ocrRegions.model },
      serial: { ...MITSUBISHI_TW_WARRANTY_CONFIG.ocrRegions.serial },
      topFormBlock: { ...MITSUBISHI_TW_WARRANTY_CONFIG.ocrRegions.topFormBlock },
      dealerStampZone: { ...MITSUBISHI_TW_WARRANTY_CONFIG.ocrRegions.dealerStampZone }
    },
    stampSpec: { ...MITSUBISHI_TW_STAMP_SPEC }
  };

  /**
   * 台灣日立阿奇立克家電製品保證書獨立命名空間規格 (hitachi_tw，嚴格隔離絕不干擾 Panasonic、LG 與三菱邏輯) (v60/v61 印章原地放大1.1倍)
   */
  const HITACHI_TW_STAMP_SPEC = Object.freeze({
    centerX: 0.858,
    centerY: 0.455,
    widthRatio: 0.237,
    tiltRangeDeg: 1.5,
    blendMode: 'multiply'
  });

  const HITACHI_TW_WARRANTY_CONFIG = Object.freeze({
    brandId: 'hitachi',
    aspectRatio: 1.52,
    borderColorType: 'hitachi_white_dual_black',
    stampSpec: HITACHI_TW_STAMP_SPEC,
    ocrRegions: Object.freeze({
      model: Object.freeze({ label: '型號（日立商品列右側）', x: 0.320, y: 0.455, w: 0.380, h: 0.105 }),
      serial: Object.freeze({ label: '機號（日立機號列右側）', x: 0.160, y: 0.555, w: 0.200, h: 0.090 }),
      formBlock: Object.freeze({ label: '日立商品／機號／購買日期表單區', x: 0.030, y: 0.430, w: 0.720, h: 0.240 }),
      dealerStampZone: Object.freeze({ label: '日立右上經銷商確認章與 HITACHI 錨點區', x: 0.680, y: 0.120, w: 0.305, h: 0.580 })
    }),
    dealerBoxSearchRegion: Object.freeze({
      x: 0.680, y: 0.140, w: 0.310, h: 0.560
    })
  });

  CARD_TEMPLATES.hitachi_tw = {
    id: 'hitachi_tw',
    brandId: HITACHI_TW_WARRANTY_CONFIG.brandId,
    brand: 'Hitachi',
    brandZh: '日立',
    label: '台灣日立家電製品保證書 (hitachi_tw)',
    shortLabel: '台灣日立家電保證書',
    formCode: 'HITACHI_TW',
    aspectRatio: HITACHI_TW_WARRANTY_CONFIG.aspectRatio,
    borderColorType: HITACHI_TW_WARRANTY_CONFIG.borderColorType,
    ocrRegions: {
      model: { ...HITACHI_TW_WARRANTY_CONFIG.ocrRegions.model },
      serial: { ...HITACHI_TW_WARRANTY_CONFIG.ocrRegions.serial },
      formBlock: { ...HITACHI_TW_WARRANTY_CONFIG.ocrRegions.formBlock },
      dealerStampZone: { ...HITACHI_TW_WARRANTY_CONFIG.ocrRegions.dealerStampZone }
    },
    stampSpec: { ...HITACHI_TW_STAMP_SPEC }
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

    // 轉回原圖座標系，並將頂部兩點 (TL, TR) 沿各自左右邊線方向往上外擴 6.5% 卡片高度（約 1 公分）以完整露出藍色 Panasonic LOGO (v33)
    const invScale = 1 / scale;
    const rawCorners = [tl, tr, br, bl].map(p => ({
      x: Math.max(0, Math.min(sw, Math.round(p.x * invScale))),
      y: Math.max(0, Math.min(sh, Math.round(p.y * invScale)))
    }));
    const TOP_LOGO_EXPAND_RATIO = 0.065;
    const [rawTL, rawTR, rawBR, rawBL] = rawCorners;
    const expandedTL = {
      x: Math.max(0, Math.min(sw, Math.round(rawTL.x + (rawTL.x - rawBL.x) * TOP_LOGO_EXPAND_RATIO))),
      y: Math.max(0, Math.min(sh, Math.round(rawTL.y + (rawTL.y - rawBL.y) * TOP_LOGO_EXPAND_RATIO)))
    };
    const expandedTR = {
      x: Math.max(0, Math.min(sw, Math.round(rawTR.x + (rawTR.x - rawBR.x) * TOP_LOGO_EXPAND_RATIO))),
      y: Math.max(0, Math.min(sh, Math.round(rawTR.y + (rawTR.y - rawBR.y) * TOP_LOGO_EXPAND_RATIO)))
    };
    const corners = [expandedTL, expandedTR, rawBR, rawBL];
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
   * LG 局部專項高對比二值化放大裁切 (v48/v49/v51：4.0x 超清放大 ＋ 自適應二值化 ＋ 形態學去噪 ＋ 由下而上切除虛點底線)
   */
  function createAdaptiveBinarizedOcrCropCanvas(srcCanvas, region, upscale = 4.0, options = {}) {
    const sw = srcCanvas.width;
    const sh = srcCanvas.height;
    const rx = Math.max(0, Math.round(region.x * sw));
    const ry = Math.max(0, Math.round(region.y * sh));
    const rw = Math.max(10, Math.min(sw - rx, Math.round(region.w * sw)));
    const rh = Math.max(10, Math.min(sh - ry, Math.round(region.h * sh)));

    const pad = 22;
    const contentW = Math.max(24, Math.round(rw * upscale));
    const contentH = Math.max(24, Math.round(rh * upscale));
    const outW = contentW + pad * 2;
    const outH = contentH + pad * 2;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = outW;
    cropCanvas.height = outH;
    const cCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    cCtx.fillStyle = '#FFFFFF';
    cCtx.fillRect(0, 0, outW, outH);
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';
    cCtx.drawImage(srcCanvas, rx, ry, rw, rh, pad, pad, contentW, contentH);

    const imgData = cCtx.getImageData(0, 0, outW, outH);
    const d = imgData.data;
    const total = outW * outH;
    const grays = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      grays[i] = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
    }

    const stride = outW + 1;
    const integral = new Int32Array(stride * (outH + 1));
    for (let y = 1; y <= outH; y++) {
      let rowSum = 0;
      const gRow = (y - 1) * outW;
      const iRow = y * stride;
      const prevRow = (y - 1) * stride;
      for (let x = 1; x <= outW; x++) {
        rowSum += grays[gRow + x - 1];
        integral[iRow + x] = integral[prevRow + x] + rowSum;
      }
    }

    const rad = Math.max(14, Math.min(54, Math.round(contentH * 0.26)));
    const threshDelta = (options && typeof options.thresholdOffset === 'number') ? options.thresholdOffset : 19;
    const bin = new Uint8Array(total);
    for (let y = 0; y < outH; y++) {
      const y0 = Math.max(0, y - rad);
      const y1 = Math.min(outH - 1, y + rad);
      const row0 = y0 * stride;
      const row1 = (y1 + 1) * stride;
      for (let x = 0; x < outW; x++) {
        const x0 = Math.max(0, x - rad);
        const x1 = Math.min(outW - 1, x + rad);
        const area = (x1 - x0 + 1) * (y1 - y0 + 1);
        const sum = integral[row1 + x1 + 1] - integral[row0 + x1 + 1] - integral[row1 + x0] + integral[row0 + x0];
        const localMean = sum / area;
        const g = grays[y * outW + x];
        bin[y * outW + x] = (g < localMean - threshDelta) ? 1 : 0;
      }
    }

    // 形態學 3x3 去孤立雜訊點 ＋ 填補筆畫內 1px 微孔
    if (options.despeckle !== false) {
      const cleanedBin = new Uint8Array(bin);
      for (let y = 1; y < outH - 1; y++) {
        for (let x = 1; x < outW - 1; x++) {
          const idx = y * outW + x;
          let nb = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const row = (y + dy) * outW;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (bin[row + x + dx]) nb++;
            }
          }
          if (bin[idx] && nb <= 1) cleanedBin[idx] = 0;
          else if (!bin[idx] && nb >= 7) cleanedBin[idx] = 1;
        }
      }
      bin.set(cleanedBin);
    }

    // 偵測並抹除文字腳底水平小虛點底線（........），保留中間連字號 '-'（位於 y 0.36..0.54）與主文字筆畫
    if (options.stripDottedUnderline !== false) {
      const visited = new Uint8Array(total);
      const queue = new Int32Array(total);
      const maxDotW = Math.max(10, Math.round(contentH * 0.13));
      const maxDotH = Math.max(9, Math.round(contentH * 0.12));
      const dotMinY = pad + Math.round(contentH * 0.54);

      for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
          const startIdx = y * outW + x;
          if (!bin[startIdx] || visited[startIdx]) continue;
          let head = 0, tail = 0;
          queue[tail++] = startIdx;
          visited[startIdx] = 1;
          let minX = x, maxX = x, minY = y, maxY = y;
          while (head < tail) {
            const idx = queue[head++];
            const cy = Math.floor(idx / outW);
            const cx = idx - cy * outW;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
            for (let dy = -1; dy <= 1; dy++) {
              const ny = cy + dy;
              if (ny < 0 || ny >= outH) continue;
              for (let dx = -1; dx <= 1; dx++) {
                const nx = cx + dx;
                if (nx < 0 || nx >= outW) continue;
                const nIdx = ny * outW + nx;
                if (bin[nIdx] && !visited[nIdx]) {
                  visited[nIdx] = 1;
                  queue[tail++] = nIdx;
                }
              }
            }
          }
          const compW = maxX - minX + 1;
          const compH = maxY - minY + 1;
          const compCenterY = (minY + maxY) * 0.5;
          if (compCenterY >= dotMinY && compW <= maxDotW && compH <= maxDotH) {
            for (let k = 0; k < tail; k++) {
              bin[queue[k]] = 0;
            }
          }
        }
      }

      // 由文字下緣往上檢查：若有獨立於主字元帶下方之低密度虛點底線列，整段抹除
      if (options.stripBottomDotBand !== false) {
        const rowInk = new Int32Array(outH);
        const minActiveInk = Math.max(4, Math.round(contentW * 0.012));
        for (let y = pad; y < outH - pad; y++) {
          let cnt = 0;
          const off = y * outW;
          for (let x = pad; x < outW - pad; x++) {
            if (bin[off + x]) cnt++;
          }
          rowInk[y] = cnt;
        }
        let bestBand = null;
        let runS = -1;
        const coreTopMax = pad + Math.round(contentH * 0.65);
        for (let y = pad; y < outH - pad; y++) {
          if (rowInk[y] >= minActiveInk) {
            if (runS < 0) runS = y;
          } else if (runS >= 0) {
            const hSpan = y - runS;
            if (runS <= coreTopMax && (!bestBand || hSpan > bestBand.h)) {
              bestBand = { y0: runS, y1: y - 1, h: hSpan };
            }
            runS = -1;
          }
        }
        if (runS >= 0) {
          const hSpan = (outH - pad) - runS;
          if (runS <= coreTopMax && (!bestBand || hSpan > bestBand.h)) {
            bestBand = { y0: runS, y1: outH - pad - 1, h: hSpan };
          }
        }
        if (bestBand && bestBand.h >= Math.max(10, Math.round(contentH * 0.16))) {
          for (let y = bestBand.y1 + 2; y < outH; y++) {
            const off = y * outW;
            for (let x = 0; x < outW; x++) bin[off + x] = 0;
          }
        }
      }
    }

    for (let i = 0; i < total; i++) {
      const val = bin[i] ? 0 : 255;
      const p = i * 4;
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
  function sampleStampRegionLighting(cardImg, centerXRatio = 0.845, centerYRatio = 0.395, widthRatio = 0.210) {
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

    // 收集像素亮度，排除極深色文字線條，僅統計紙張空白底色及左右明暗梯度 (v37)
    const candidates = [];
    const leftCands = [];
    const rightCands = [];
    const midX = w / 2;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = (py * w + px) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const item = { r, g, b, lum };
        candidates.push(item);
        if (px < midX) leftCands.push(item);
        else rightCands.push(item);
      }
    }
    if (candidates.length === 0) return defaultLighting;

    const avgSideLum = arr => {
      if (arr.length === 0) return null;
      arr.sort((a, b) => b.lum - a.lum);
      const cnt = Math.max(4, Math.floor(arr.length * 0.55));
      let s = 0;
      for (let i = 0; i < cnt; i++) s += arr[i].lum;
      return Math.round(s / cnt);
    };

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

    const avgL = Math.round(sumL / topCount);
    return {
      avgL,
      avgR: Math.round(sumR / topCount),
      avgG: Math.round(sumG / topCount),
      avgB: Math.round(sumB / topCount),
      leftAvgL: avgSideLum(leftCands) ?? avgL,
      rightAvgL: avgSideLum(rightCands) ?? avgL,
      sampleCount: topCount
    };
  }

  /**
   * 依據目標紙張亮度、左右明暗梯度、色溫及同色系藍色深淺微調 (-40 ~ +40) 調整專櫃印章油墨 (v37)
   */
  function adaptStampCanvasToLighting(stampImg, dateStr, fontSize, offsetY, lighting, blueTone = 0) {
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
    const leftAvgL = lighting && typeof lighting.leftAvgL === 'number' ? lighting.leftAvgL : avgL;
    const rightAvgL = lighting && typeof lighting.rightAvgL === 'number' ? lighting.rightAvgL : avgL;

    // 偏暗底紙 (L < 190) 時壓低印章明度並收斂飽和度 10%～22%，並微調紙張色溫融入
    const darkness = avgL < 190 ? Math.min(1, Math.max(0, (190 - avgL) / 110)) : 0;
    let satKeep = avgL < 190 ? (0.88 - darkness * 0.12) : 0.92;
    let brightScale = avgL < 190 ? (1.0 - darkness * 0.38) : 0.96;
    let alphaScale = avgL < 190 ? (0.91 - darkness * 0.08) : 0.94;

    // 同色系專櫃藍色濃淡微調 (-40 淡藍 ➔ 0 自動光影 ➔ +40 深海軍藍)，絕不偏離藍色色相
    const toneNorm = Math.max(-1, Math.min(1, Number(blueTone || 0) / 40));
    const lightenLift = toneNorm < 0 ? (-toneNorm) * 0.42 : 0;
    if (toneNorm < 0) {
      satKeep *= (1 - (-toneNorm) * 0.22);
      alphaScale *= (1 - (-toneNorm) * 0.16);
    } else if (toneNorm > 0) {
      brightScale *= (1 - toneNorm * 0.46);
      satKeep = Math.min(1.05, satKeep + toneNorm * 0.08);
      alphaScale = Math.min(0.99, alphaScale * (1 + toneNorm * 0.06));
    }

    // 底紙偏暖時微幅混入紙張環境光色溫，消除冷藍突兀感
    const warmShift = Math.max(0, (paperR - paperB) / 255) * 0.16;
    // 左右明暗梯度微調（±12% 以內平滑融合左右陰影差）
    const lrDiff = Math.max(-60, Math.min(60, rightAvgL - leftAvgL));
    const sw = stampCanvas.width;

    const imgData = sCtx.getImageData(0, 0, sw, stampCanvas.height);
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

      // 2. 壓低明度對齊拍攝陰影深度，並套用左右明暗梯度
      let pxScale = brightScale;
      if (Math.abs(lrDiff) > 4) {
        const pxX = (i >> 2) % sw;
        const u = pxX / Math.max(1, sw - 1) - 0.5; // -0.5 .. +0.5
        pxScale *= Math.max(0.75, Math.min(1.18, 1 + (lrDiff / 255) * 0.35 * u));
      }
      r *= pxScale;
      g *= pxScale;
      b *= pxScale;

      // 3. 淡藍提亮（朝淺藍紙光方向平滑拉高明度而不改變色相）
      if (lightenLift > 0) {
        r = r + (208 - r) * lightenLift;
        g = g + (223 - g) * lightenLift;
        b = b + (248 - b) * lightenLift;
      } else if (toneNorm > 0) {
        // 深海軍藍濃度補強（壓深 R/G 保留高純度深藍）
        const deepContrast = toneNorm * 0.24;
        r *= (1 - deepContrast * 0.65);
        g *= (1 - deepContrast * 0.45);
      }

      // 4. 混入紙張環境色溫
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
   * 過濾保卡 OCR 機種／機號中的條碼雜訊（排除誤讀進機號之純數字＋邊線 I，支援 PSM 6）(v30)
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
      // 嚴格剔除誤讀到的機號＋垂直邊線雜訊（例：02926020033I）
      if (/^\d{7,}[IL|]?$/.test(tok)) return false;
      const digitsOnly = (tok.match(/\d/g) || []).length;
      if (!tok.includes('-') && digitsOnly / tok.length >= 0.80) return false;
      const hasDigit = digitsOnly > 0;
      const hasLetter = /[A-Z]/.test(tok);
      if (!hasDigit || !hasLetter) return false;
      const barcodeChars = (tok.match(/[ILUV]/g) || []).length;
      if (barcodeChars / tok.length > 0.70 && digitsOnly <= 1) return false;
      return true;
    });
    if (valid.length > 0) {
      const withHyphen = valid.find(v => /^[A-Z]{2,4}-[A-Z0-9]{3,}/.test(v));
      return withHyphen || valid[0];
    }
    const fallback = upperRaw.replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '');
    if (/^\d{7,}[IL|]?$/.test(fallback)) return '';
    return (/\d/.test(fallback) && /[A-Z]/.test(fallback)) ? fallback : '';
  }

  function stripSerialMisreadPrefix(rawTok) {
    if (!rawTok) return '';
    let s = rawTok.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // 剝除左側中文字（「機號」）誤認為英文字母的前綴（如 IS / NO / SN / N0 / 1S + 9~12 位純數字）
    const prefixNum = s.match(/^(?:IS|NO|SN|N0|1S|I8|[A-Z]{1,3})(\d{9,12})[IL|]?$/);
    if (prefixNum) return prefixNum[1];
    // 剝除純數字尾端垂直表格框線誤讀之 I / L
    if (/^\d{9,13}[IL]$/.test(s)) return s.slice(0, -1);
    return s;
  }

  function filterWarrantySerialResult(rawText) {
    if (!rawText) return '';
    const lines = rawText.toUpperCase()
      .split(/\r?\n/)
      .map(s => stripSerialMisreadPrefix(s))
      .filter(Boolean);
    // 優先匹配標準 9~12 位純數字機號（如 02926020033）
    const pure9to12 = lines.find(tok => /^\d{9,12}$/.test(tok));
    if (pure9to12) return pure9to12;
    const inlineNumMatch = rawText.toUpperCase().match(/(?:IS|NO|SN|S\/?N)?[\s:/-]*(\d{9,12})\b/);
    if (inlineNumMatch) return inlineNumMatch[1];

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
    const fallback = stripSerialMisreadPrefix(rawText);
    return (fallback.match(/\d/g) || []).length >= 4 ? fallback : '';
  }

  /**
   * v31: 解析保卡左側基本資料整塊區（雙語錨點讀取：機種/型號 + 機號前綴淨化）
   */
  function parsePanasonicLeftInfoBlock(rawText) {
    if (!rawText) return { model: '', serialNo: '' };
    const lines = rawText.replace(/\r/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
    let model = '';
    let serialNo = '';

    // 1. 優先依「機種 / 型號 / MODEL」雙語錨點解析機種
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/機種|機\s*種|型號|MODEL|TYPE/i.test(line)) {
        const after = line.replace(/^.*?(?:機種|機\s*種|型號|MODEL|TYPE)\s*[:：]?\s*/i, '');
        const candidate = filterWarrantyModelResult(after + '\n' + (lines[i + 1] || ''));
        if (candidate) {
          model = candidate;
          break;
        }
      }
    }
    if (!model) {
      model = filterWarrantyModelResult(rawText);
    }

    // 2. 優先依「機號 / 製造號碼 / SERIAL / S/N」雙語錨點解析機號並剝除左側中文字誤認前綴
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/機號|機\s*號|製造號碼|SERIAL|S\/?N/i.test(line)) {
        const after = line.replace(/^.*?(?:機號|機\s*號|製造號碼|SERIAL|S\/?N)\s*[:：]?\s*/i, '');
        const scope = after + '\n' + (lines[i + 1] || '');
        const mNum = scope.toUpperCase().match(/(?:IS|NO|SN|N0|S\/?N|[A-Z]{1,3})?[\s:/-]*(\d{9,12})(?:[IL|]|\b)/);
        if (mNum) {
          serialNo = mNum[1];
          break;
        }
        const cand = filterWarrantySerialResult(scope);
        if (cand && cand !== model.replace(/-/g, '')) {
          serialNo = cand;
          break;
        }
      }
    }
    if (!serialNo) {
      serialNo = filterWarrantySerialResult(rawText);
    }

    return { model, serialNo };
  }

  /**
   * v31: 訂購單原生純文字型號交叉比對校正（Levenshtein + 視覺混淆權重，相似度 >= 65% 且前綴相符即校正）
   */
  function crossVerifyModelWithOrderSheet(candidateModel, orderItemModels, targetBrand = 'PANASONIC') {
    if (!candidateModel || !Array.isArray(orderItemModels) || orderItemModels.length === 0) {
      return { corrected: false, model: candidateModel || '', similarity: 0 };
    }

    const norm = s => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const visualNorm = s => norm(s).replace(/VW|VV/g, 'W').replace(/0/g, 'O').replace(/1|I/g, 'L');

    const candUpper = candidateModel.toUpperCase().trim();
    const candNorm = norm(candUpper);
    const candVis = visualNorm(candUpper);
    if (candNorm.length < 4) {
      return { corrected: false, model: candidateModel, similarity: 0 };
    }

    function levenshtein(a, b) {
      const m = a.length, n = b.length;
      if (m === 0) return n;
      if (n === 0) return m;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      return dp[m][n];
    }

    // 同品牌優先過濾（若清單中無明確品牌標記則全體比對）
    const targetUpper = (targetBrand || '').toUpperCase();
    const brandPool = orderItemModels.filter(item =>
      item && item.model && (!targetUpper || !item.brand || item.brand.toUpperCase().includes(targetUpper) || targetUpper.includes(item.brand.toUpperCase()))
    );
    const pool = brandPool.length > 0 ? brandPool : orderItemModels.filter(item => item && item.model);

    let bestItem = null;
    let bestSim = 0;

    for (let i = 0; i < pool.length; i++) {
      const stdModel = pool[i].model.toUpperCase().trim();
      const stdNorm = norm(stdModel);
      const stdVis = visualNorm(stdModel);
      if (stdNorm.length < 4) continue;

      // 前綴相符驗證（前 2 碼英數或連字號前前綴一致，如 NR == NR）
      const candPrefix = (candUpper.split('-')[0] || candNorm.slice(0, 2)).slice(0, 2);
      const stdPrefix = (stdModel.split('-')[0] || stdNorm.slice(0, 2)).slice(0, 2);
      if (candPrefix !== stdPrefix) continue;

      const simNorm = 1 - levenshtein(candNorm, stdNorm) / Math.max(candNorm.length, stdNorm.length);
      const simVis = 1 - levenshtein(candVis, stdVis) / Math.max(candVis.length, stdVis.length);
      const sim = Math.max(simNorm, simVis);

      if (sim > bestSim) {
        bestSim = sim;
        bestItem = stdModel;
      }
    }

    if (bestItem && bestSim >= 0.65) {
      return {
        corrected: bestItem !== candUpper,
        model: bestItem,
        similarity: Math.round(bestSim * 100) / 100
      };
    }

    return { corrected: false, model: candidateModel, similarity: Math.round(bestSim * 100) / 100 };
  }

  /**
   * 離屏高解析度保卡直接合成專櫃印章（避讓座標 X:84.5%, Y:39.5%, W:21.0% ＋ 光影自適應 ＋ 藍色深淺 ＋ multiply）(v37)
   */
  function compositeStampOnOffscreenCard(cleanCardCanvas, stampImg, dateStr, fontSize, offsetY, stampSpec, blueTone = 0) {
    if (!cleanCardCanvas || !stampImg) return null;
    const spec = stampSpec || {
      centerX: 0.845,
      centerY: 0.395,
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
    const adapted = adaptStampCanvasToLighting(stampImg, dateStr, fontSize, offsetY, lighting, blueTone);
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
    'PANASONIC', '商品保證書', '保證書', '台灣松下', '經銷商確認', '經銷商', '顧客收執', '保證內容', '2601335017',
    '台灣樂金', '樂金電器', '經銷商店章', '產品註冊登錄', 'LG LINE', '0800-898-899', 'WWW.LG.COM',
    '三菱電機', '台灣三菱電機', 'MITSUBISHI', '本欄請蓋店章', '製造號碼',
    '家電製品保證書', '阿奇立克日立', '經銷商確認章', 'HITACHI', 'HITACHI-HOMEAPPLIANCES'
  ];
  const TAIWAN_INVOICE_STRUCT_REGEX = /[A-Z]{2}\s*[-—–]?\s*\d[\d\s]{6,9}\d/;

  function classifyDocumentByTextAndColor(ocrText, detectRes, sw, sh, isManualPanasonic = false) {
    if (isManualPanasonic) {
      return { role: 'warranty_card', reason: '手動指定國際牌保卡模板' };
    }

    const upper = String(ocrText || '').toUpperCase();

    // 0. v47 最高優先級：LG 台灣樂金保證書專屬 6 組地標強制判定（優先權高於發票編號／QR Code／比例偵測）
    const hasPanasonicExclusive = /PANASONIC|台灣松下|國際牌|商品保證書/.test(upper.replace(/\s+/g, ''));
    if (!hasPanasonicExclusive) {
      const lgForceMatch = detectLgWarrantyByText(ocrText);
      if (lgForceMatch && lgForceMatch.isLg) {
        return {
          role: 'warranty_card',
          forcedTemplateId: 'lg_tw',
          reason: `強制命中 LG 保卡地標 (${lgForceMatch.matchedLandmarks.slice(0, 3).join('、')})`
        };
      }
    }

    // 0b. v53 最高優先級：台灣三菱電機保證書專屬 8 組地標強制判定（注意：三菱抬頭含「商品保證書」，僅排除國際牌品牌字樣）
    const hasPanasonicBrandOnly = /PANASONIC|台灣松下|國際牌/.test(upper.replace(/\s+/g, ''));
    if (!hasPanasonicBrandOnly) {
      const mitsuForceMatch = detectMitsubishiWarrantyByText(ocrText);
      if (mitsuForceMatch && mitsuForceMatch.isMitsubishi) {
        return {
          role: 'warranty_card',
          forcedTemplateId: 'mitsubishi_tw',
          reason: `強制命中三菱電機保卡地標 (${mitsuForceMatch.matchedLandmarks.slice(0, 3).join('、')})`
        };
      }
    }

    // 0c. v60 最高優先級：台灣日立家電製品保證書專屬地標強制判定（優先權高於發票編號／QR Code 偵測）
    if (!hasPanasonicBrandOnly) {
      const hitachiForceMatch = detectHitachiWarrantyByText(ocrText);
      if (hitachiForceMatch && hitachiForceMatch.isHitachi) {
        return {
          role: 'warranty_card',
          forcedTemplateId: 'hitachi_tw',
          reason: `強制命中台灣日立保卡地標 (${hitachiForceMatch.matchedLandmarks.slice(0, 3).join('、')})`
        };
      }
    }

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
   * v31: 純文字地標強制比例外擴一刀裁切常數配置（頂部多留約 1.5 公分確保完整露出「宏匯廣場」大字）
   */
  const RECEIPT_LANDMARK_CROP_CONFIG = Object.freeze({
    bodyExpandXRatio: 0.15,        // 左右各強制外擴 0.15 * bodyW（約實體 2 公分紙邊留白）
    headerFallbackHalfW: 1.10,     // 僅抓到頂部標題宏匯廣場時，以 headerCenterX ± 1.10 * headerW 為左右邊界
    topExpandHeaderH: 2.2,         // 鎖定頂部標題（HONHUI PLAZA / 銷貨明細表）往上強制外擴 2.2 * headerHeight（多留約 1.5 公分露出「宏匯廣場」）
    topExpandBodyWRatio: 0.24,     // 或往上外擴 0.24 * bodyW，確保上方大字與自然紙邊絕不被切頭
    topExpandMacroDirectH: 1.0,    // 若直接抓到「宏匯」大字頂框，往上保留 1.0 * headerHeight 自然頂邊
    bottomExpandLineH: 1.5,        // 優先地標①（最底行 機:/序:/帳:/櫃:/商品退換貨請持本聯/請妥善保管）往下外擴 1.5 * lineHeight
    invFallbackExtendW: 0.75,      // 備援地標②（發票號碼/退貨用條碼下緣）往下外擴 0.75 * bodyW（約 4 公分）
    minCropSizePx: 50              // 移除 H/W 比例拒切限制：只要 cropW > 50 && cropH > 50 即強制裁切
  });

  /**
   * v30: 純文字地標強制比例外擴一刀裁切（徹底放棄背景色與外框偵測，只要 cropW > 50 && cropH > 50 即強制一刀裁切）
   */
  function computeTextAnchoredReceiptCrop(srcImg, ocrData, preScale = 1) {
    if (!srcImg || !ocrData) return null;
    const sw = srcImg.width;
    const sh = srcImg.height;
    const invScale = 1 / Math.max(0.05, preScale);
    const cfg = RECEIPT_LANDMARK_CROP_CONFIG;

    // 收集有效文字行或單詞（支援 lines、words 及 blocks 遞迴展開）
    let lineItems = Array.isArray(ocrData.lines) ? ocrData.lines : [];
    let wordItems = Array.isArray(ocrData.words) ? ocrData.words : [];
    if (lineItems.length === 0 && wordItems.length === 0 && Array.isArray(ocrData.blocks)) {
      const flatLines = [];
      const flatWords = [];
      ocrData.blocks.forEach(blk => {
        (blk.paragraphs || []).forEach(para => {
          (para.lines || []).forEach(ln => {
            flatLines.push(ln);
            (ln.words || []).forEach(wd => flatWords.push(wd));
          });
        });
      });
      lineItems = flatLines;
      wordItems = flatWords;
    }
    const rawItems = lineItems.length >= 2 ? lineItems : (wordItems.length > 0 ? wordItems : lineItems);

    const minBoxW = Math.max(6, sw * 0.010);
    const minBoxH = Math.max(5, sh * 0.004);

    const candidates = [];
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const txt = (item && item.text ? item.text : '').trim();
      const b = item && item.bbox;
      if (!txt || !b) continue;
      if (typeof item.confidence === 'number' && item.confidence < 25) continue;

      const x0 = b.x0 * invScale;
      const y0 = b.y0 * invScale;
      const x1 = b.x1 * invScale;
      const y1 = b.y1 * invScale;
      const bw = x1 - x0;
      const bh = y1 - y0;

      if (bw < minBoxW || bh < minBoxH) continue;
      if (bw > sw * 0.94 || bh > sh * 0.16) continue;
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

    if (candidates.length === 0) return null;

    // 空間聚類去離群：剔除偏離主體文字直欄之桌面邊緣孤立雜訊點
    let boxes = candidates;
    if (candidates.length >= 5) {
      const sortedX0 = [...candidates].map(b => b.x0).sort((a, b) => a - b);
      const sortedX1 = [...candidates].map(b => b.x1).sort((a, b) => a - b);
      const qLowX0 = sortedX0[Math.floor(sortedX0.length * 0.15)];
      const qHighX1 = sortedX1[Math.floor(sortedX1.length * 0.85)];
      const spanGuard = Math.max(sw * 0.14, (qHighX1 - qLowX0) * 0.35);
      const clustered = candidates.filter(b => b.x0 >= qLowX0 - spanGuard && b.x1 <= qHighX1 + spanGuard);
      if (clustered.length >= 1) boxes = clustered;
    }

    // 計算有效文字行高代表值（中位數）
    const heights = boxes.map(b => b.bh).sort((a, b) => a - b);
    const medianH = heights[Math.floor(heights.length / 2)] || 24;

    // 鎖定頂部標題地標（宏匯廣場 / HONHUI PLAZA / 銷貨明細表）
    const upperBoxes = boxes.filter(b => b.y0 < sh * 0.60).sort((a, b) => a.y0 - b.y0);
    const headerLandmark =
      upperBoxes.find(b => /宏匯|HONHUI|PLAZA|銷貨明細|明細表/i.test(b.text)) ||
      upperBoxes[0] ||
      [...boxes].sort((a, b) => a.y0 - b.y0)[0];

    // 1. 左右寬度強制裁切（X 軸）：優先取主體文字行（聯合(連)/發票金額/發票號碼...），否則用頂部標題外擴 1.10 * headerW
    const bodyLandmarkBoxes = boxes.filter(b => /聯合|發票金額|發票號碼|營業人|載具|統編|合計|金額|點|[A-Z]{2}\s*[-—–]?\s*\d{8}/i.test(b.text));
    const widthRefBoxes = bodyLandmarkBoxes.length >= 2 ? bodyLandmarkBoxes : boxes;

    let cropX0, cropX1, bodyW;
    if (widthRefBoxes.length >= 2) {
      const minX = Math.min(...widthRefBoxes.map(b => b.x0));
      const maxX = Math.max(...widthRefBoxes.map(b => b.x1));
      bodyW = Math.max(cfg.minCropSizePx, maxX - minX);
      cropX0 = Math.max(0, Math.round(minX - cfg.bodyExpandXRatio * bodyW));
      cropX1 = Math.min(sw, Math.round(maxX + cfg.bodyExpandXRatio * bodyW));
    } else {
      const headerW = Math.max(40, headerLandmark.x1 - headerLandmark.x0);
      const headerCenterX = (headerLandmark.x0 + headerLandmark.x1) / 2;
      cropX0 = Math.max(0, Math.round(headerCenterX - cfg.headerFallbackHalfW * headerW));
      cropX1 = Math.min(sw, Math.round(headerCenterX + cfg.headerFallbackHalfW * headerW));
      bodyW = Math.max(headerW * 1.5, cropX1 - cropX0);
    }

    // 2. 頂部高度強制裁切（Y 軸上緣）：鎖定頂部標題往下外擴上緣（若鎖定於 HONHUI PLAZA/銷貨明細表，強制上擴 max(2.2 * headerH, 0.24 * bodyW) 多留 1.5 公分完整露出「宏匯廣場」大字）
    const headerHeight = Math.max(medianH, Math.min(medianH * 2.5, headerLandmark.bh));
    const hasTopChineseLogo = /宏匯/.test(headerLandmark.text);
    const topExpandPx = hasTopChineseLogo
      ? Math.max(cfg.topExpandMacroDirectH * headerHeight, 0.12 * bodyW)
      : Math.max(cfg.topExpandHeaderH * headerHeight, cfg.topExpandBodyWRatio * bodyW);
    const cropY0 = Math.max(0, Math.round(headerLandmark.y0 - topExpandPx));

    // 3. 底部高度強制裁切（Y 軸下緣）：優先地標①（機:/序:/帳:/櫃:/商品退換貨/請妥善保管）➔ 備援地標②（發票號碼/退貨用條碼）
    const sortedByBottom = [...boxes].sort((a, b) => b.y1 - a.y1);
    const bottomPriority1 = sortedByBottom.find(b =>
      /機[:：]|序[:：]|帳[:：]|櫃[:：]|商品退換貨|請持本聯|請妥善保管|退換貨/i.test(b.text)
    );
    const invFallback2 = sortedByBottom.find(b =>
      /發票號碼|退貨用條碼|退貨條碼|[A-Z]{2}\s*[-—–]?\s*\d[\d\s]{6,9}\d/i.test(b.text)
    );

    let cropY1;
    let bottomMethod = 'fallback_last_line';
    if (bottomPriority1) {
      const lineH = Math.max(medianH, Math.min(medianH * 2.0, bottomPriority1.bh));
      cropY1 = Math.min(sh, Math.round(bottomPriority1.y1 + cfg.bottomExpandLineH * lineH));
      bottomMethod = 'priority1_bottom_line';
    } else if (invFallback2) {
      cropY1 = Math.min(sh, Math.round(invFallback2.y1 + cfg.invFallbackExtendW * bodyW));
      bottomMethod = 'fallback2_invoice_no';
    } else {
      const lowestBox = sortedByBottom[0];
      cropY1 = Math.min(sh, Math.round(lowestBox.y1 + Math.max(cfg.bottomExpandLineH * medianH, 0.75 * bodyW)));
    }

    const cropW = cropX1 - cropX0;
    const cropH = cropY1 - cropY0;
    if (cropW <= cfg.minCropSizePx || cropH <= cfg.minCropSizePx) return null;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = cropW;
    outCanvas.height = cropH;
    const oCtx = outCanvas.getContext('2d');
    oCtx.imageSmoothingEnabled = true;
    oCtx.imageSmoothingQuality = 'high';
    oCtx.drawImage(srcImg, cropX0, cropY0, cropW, cropH, 0, 0, cropW, cropH);

    return {
      canvas: outCanvas,
      method: `landmark_forced_${bottomMethod}`,
      box: { x: cropX0, y: cropY0, w: cropW, h: cropH },
      anchorCount: boxes.length
    };
  }

  // ===========================================================================
  // LG 台灣樂金電器保證書獨立引擎 (lg_tw，v46/v47：6組地標強制分類 / 四點擴邊拉正 / 經銷商店章方框校準 / 型號機號防呆)
  // ===========================================================================
  function detectLgWarrantyByText(ocrText) {
    const rawUpper = String(ocrText || '').toUpperCase();
    if (!rawUpper.trim()) {
      return { isLg: false, hitCount: 0, matchedLandmarks: [], uniqueHits: [], comboHits: [] };
    }
    const compactUpper = rawUpper.replace(/[\s\-—–‐‑‒―~～_]+/g, '');

    const hasCompany =
      rawUpper.includes('台灣樂金電器股份有限公司') ||
      compactUpper.includes('台灣樂金電器股份有限公司') ||
      rawUpper.includes('臺灣樂金電器股份有限公司') ||
      compactUpper.includes('臺灣樂金電器股份有限公司') ||
      rawUpper.includes('台灣樂金') ||
      compactUpper.includes('台灣樂金') ||
      rawUpper.includes('臺灣樂金') ||
      compactUpper.includes('臺灣樂金') ||
      rawUpper.includes('樂金電器') ||
      compactUpper.includes('樂金電器');

    const hasServicePhone =
      rawUpper.includes('0800-898-899') ||
      compactUpper.includes('0800898899');

    const hasWebsite =
      rawUpper.includes('WWW.LG.COM') ||
      compactUpper.includes('WWW.LG.COM');

    const hasRegQrLabel =
      rawUpper.includes('產品註冊登錄') ||
      compactUpper.includes('產品註冊登錄');

    const uniqueLandmarks = [];
    if (hasCompany) uniqueLandmarks.push('台灣樂金電器股份有限公司');
    if (hasServicePhone) uniqueLandmarks.push('0800-898-899');
    if (hasWebsite) uniqueLandmarks.push('www.lg.com');
    if (hasRegQrLabel) uniqueLandmarks.push('產品註冊登錄');

    const hasLgBrand =
      /(?:^|[^A-Z0-9])LG(?:[^A-Z0-9]|$)/.test(rawUpper) ||
      /(?:^|[^A-Z])LG(?:[^A-Z]|$)/.test(compactUpper);

    const hasWarrantyWord =
      rawUpper.includes('保證書') ||
      compactUpper.includes('保證書');

    const hasDealerBoxWord =
      rawUpper.includes('經銷商店章') ||
      compactUpper.includes('經銷商店章');

    const hasLineAccountWord =
      rawUpper.includes('LG LINE官方帳號') ||
      compactUpper.includes('LGLINE官方帳號') ||
      rawUpper.includes('LINE官方帳號') ||
      compactUpper.includes('LINE官方帳號');

    const comboLandmarks = [];
    if (hasLgBrand) comboLandmarks.push('LG');
    if (hasWarrantyWord) comboLandmarks.push('保證書');
    if (hasDealerBoxWord) comboLandmarks.push('經銷商店章');
    if (hasLineAccountWord) comboLandmarks.push('LG LINE官方帳號');

    const matchedLandmarks = [...uniqueLandmarks, ...comboLandmarks];
    const isLg = uniqueLandmarks.length >= 1 || comboLandmarks.length >= 2;
    return {
      isLg,
      hitCount: matchedLandmarks.length,
      matchedLandmarks,
      uniqueHits: uniqueLandmarks,
      comboHits: comboLandmarks
    };
  }

  function detectLgCardQuad(srcImg) {
    const sw = srcImg && srcImg.width ? srcImg.width : 0;
    const sh = srcImg && srcImg.height ? srcImg.height : 0;
    const fallbackCorners = [
      { x: Math.round(sw * 0.02), y: Math.round(sh * 0.02) },
      { x: Math.round(sw * 0.98), y: Math.round(sh * 0.02) },
      { x: Math.round(sw * 0.98), y: Math.round(sh * 0.98) },
      { x: Math.round(sw * 0.02), y: Math.round(sh * 0.98) }
    ];
    if (!sw || !sh || sw < 60 || sh < 60) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.42 };
    }

    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(sw, sh));
    const w = Math.max(60, Math.round(sw * scale));
    const h = Math.max(60, Math.round(sh * scale));

    const workCanvas = document.createElement('canvas');
    workCanvas.width = w;
    workCanvas.height = h;
    const wCtx = workCanvas.getContext('2d', { willReadFrequently: true });
    wCtx.drawImage(srcImg, 0, 0, w, h);
    const data = wCtx.getImageData(0, 0, w, h).data;

    const total = w * h;
    const lum = new Float32Array(total);
    const sat = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const r = data[p], g = data[p + 1], b = data[p + 2];
      lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      sat[i] = Math.max(r, g, b) - Math.min(r, g, b);
    }

    const pickQuantile = (arr, q) => {
      if (!arr || arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * q)));
      return sorted[idx];
    };

    // 1. 取中央保證書白紙參考（75% 亮度以忽略黑字與條碼）＋ 外緣桌面樣本
    const centerLums = [];
    const centerSats = [];
    for (let y = Math.floor(h * 0.28); y < Math.floor(h * 0.72); y += 2) {
      for (let x = Math.floor(w * 0.30); x < Math.floor(w * 0.70); x += 2) {
        const idx = y * w + x;
        centerLums.push(lum[idx]);
        centerSats.push(sat[idx]);
      }
    }
    const paperLumRef = pickQuantile(centerLums, 0.75);
    const paperSatRef = pickQuantile(centerSats, 0.40);

    // 2. 四向邊界階躍掃描（局部對比抗漸層陰影）+ RANSAC 直線擬合，精準找出白紙四條邊
    const winOut = Math.max(6, Math.round(Math.min(w, h) * 0.024));
    const winIn = Math.max(8, Math.round(Math.min(w, h) * 0.034));

    const scanBorderCandidates = side => {
      const pts = [];
      if (side === 'left' || side === 'right') {
        const yStart = Math.round(h * 0.14);
        const yEnd = Math.round(h * 0.86);
        for (let y = yStart; y <= yEnd; y += 2) {
          const rowOff = y * w;
          let bestPos = -1;
          let bestScore = -Infinity;
          if (side === 'left') {
            const xMax = Math.round(w * 0.48);
            for (let x = winOut + 2; x <= xMax; x++) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = x - winOut; k <= x - 2; k++) {
                outSum += lum[rowOff + k];
                outSatSum += sat[rowOff + k];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = x + 2; k <= Math.min(w - 1, x + winIn); k++) {
                inLums.push(lum[rowOff + k]);
                inSats.push(sat[rowOff + k]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(paperLumRef - 65, outL + 10) && (jump >= 11 || (jump >= 6 && satDrop >= 6))) {
                const localStep = Math.max(0, lum[rowOff + Math.min(w - 1, x + 2)] - lum[rowOff + Math.max(0, x - 2)]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) {
                  bestScore = score;
                  bestPos = x;
                }
              }
            }
          } else {
            const xMin = Math.round(w * 0.52);
            for (let x = w - winOut - 3; x >= xMin; x--) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = x + 2; k <= x + winOut; k++) {
                outSum += lum[rowOff + k];
                outSatSum += sat[rowOff + k];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = Math.max(0, x - winIn); k <= x - 2; k++) {
                inLums.push(lum[rowOff + k]);
                inSats.push(sat[rowOff + k]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(105, paperLumRef - 95, outL + 9) && (jump >= 9 || (jump >= 5 && satDrop >= 5))) {
                const localStep = Math.max(0, lum[rowOff + Math.max(0, x - 2)] - lum[rowOff + Math.min(w - 1, x + 2)]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) {
                  bestScore = score;
                  bestPos = x;
                }
              }
            }
          }
          if (bestPos >= 0) pts.push({ x: bestPos, y });
        }
      } else {
        const xStart = Math.round(w * 0.18);
        const xEnd = Math.round(w * 0.82);
        for (let x = xStart; x <= xEnd; x += 2) {
          let bestPos = -1;
          let bestScore = -Infinity;
          if (side === 'top') {
            const yMax = Math.round(h * 0.45);
            for (let y = winOut + 2; y <= yMax; y++) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = y - winOut; k <= y - 2; k++) {
                const idx = k * w + x;
                outSum += lum[idx];
                outSatSum += sat[idx];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = y + 2; k <= Math.min(h - 1, y + winIn); k++) {
                const idx = k * w + x;
                inLums.push(lum[idx]);
                inSats.push(sat[idx]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(paperLumRef - 65, outL + 10) && (jump >= 10 || (jump >= 6 && satDrop >= 6))) {
                const localStep = Math.max(0, lum[Math.min(h - 1, y + 2) * w + x] - lum[Math.max(0, y - 2) * w + x]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) {
                  bestScore = score;
                  bestPos = y;
                }
              }
            }
          } else {
            const yMin = Math.round(h * 0.55);
            for (let y = h - winOut - 3; y >= yMin; y--) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = y + 2; k <= y + winOut; k++) {
                const idx = k * w + x;
                outSum += lum[idx];
                outSatSum += sat[idx];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = Math.max(0, y - winIn); k <= y - 2; k++) {
                const idx = k * w + x;
                inLums.push(lum[idx]);
                inSats.push(sat[idx]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(105, paperLumRef - 95, outL + 9) && (jump >= 9 || (jump >= 5 && satDrop >= 5))) {
                const localStep = Math.max(0, lum[Math.max(0, y - 2) * w + x] - lum[Math.min(h - 1, y + 2) * w + x]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) {
                  bestScore = score;
                  bestPos = y;
                }
              }
            }
          }
          if (bestPos >= 0) pts.push({ x, y: bestPos });
        }
      }
      return pts;
    };

    const fitLineRansac = (pts, isVertical, minNeeded) => {
      if (!pts || pts.length < minNeeded) return null;
      let bestInliers = [];
      let bestSlope = 0;
      let bestIntercept = 0;
      const step = Math.max(1, Math.floor(pts.length / 24));
      for (let i = 0; i < pts.length; i += step) {
        for (let j = i + Math.max(2, step); j < pts.length; j += step) {
          const p1 = pts[i], p2 = pts[j];
          const dv = isVertical ? (p2.y - p1.y) : (p2.x - p1.x);
          if (Math.abs(dv) < 12) continue;
          const slope = isVertical ? (p2.x - p1.x) / dv : (p2.y - p1.y) / dv;
          if (Math.abs(slope) > 0.25) continue;
          const intercept = isVertical ? (p1.x - slope * p1.y) : (p1.y - slope * p1.x);
          const inliers = [];
          for (let k = 0; k < pts.length; k++) {
            const pk = pts[k];
            const pred = isVertical ? (slope * pk.y + intercept) : (slope * pk.x + intercept);
            const actual = isVertical ? pk.x : pk.y;
            if (Math.abs(actual - pred) <= 3.5) inliers.push(pk);
          }
          if (inliers.length > bestInliers.length) {
            bestInliers = inliers;
            bestSlope = slope;
            bestIntercept = intercept;
          }
        }
      }
      if (bestInliers.length < minNeeded) return null;
      // 最小二乘法精修內點
      let sumU = 0, sumV = 0, sumUU = 0, sumUV = 0;
      bestInliers.forEach(p => {
        const u = isVertical ? p.y : p.x;
        const v = isVertical ? p.x : p.y;
        sumU += u; sumV += v; sumUU += u * u; sumUV += u * v;
      });
      const n = bestInliers.length;
      const denom = n * sumUU - sumU * sumU;
      if (Math.abs(denom) > 1e-4) {
        const refinedSlope = (n * sumUV - sumU * sumV) / denom;
        if (Math.abs(refinedSlope) <= 0.25) {
          bestSlope = refinedSlope;
          bestIntercept = (sumV - refinedSlope * sumU) / n;
        }
      }
      return { slope: bestSlope, intercept: bestIntercept, count: bestInliers.length, isVertical };
    };

    const leftPts = scanBorderCandidates('left');
    const rightPts = scanBorderCandidates('right');
    const topPts = scanBorderCandidates('top');
    const bottomPts = scanBorderCandidates('bottom');

    const minVNeeded = Math.max(8, Math.round(h * 0.08));
    const minHNeeded = Math.max(8, Math.round(w * 0.08));
    let lineL = fitLineRansac(leftPts, true, minVNeeded);
    let lineR = fitLineRansac(rightPts, true, minVNeeded);
    let lineT = fitLineRansac(topPts, false, minHNeeded);
    let lineB = fitLineRansac(bottomPts, false, minHNeeded);

    // 3. 若某邊白紙貼齊照片外緣而無桌邊階躍，檢查該緣 3px 帶是否為白紙色，若符合則貼齊外緣
    const checkRimIsPaper = side => {
      const rLums = [], rSats = [];
      if (side === 'left' || side === 'right') {
        const rx = side === 'left' ? 3 : w - 4;
        for (let y = Math.round(h * 0.22); y <= Math.round(h * 0.78); y += 3) {
          rLums.push(lum[y * w + rx]);
          rSats.push(sat[y * w + rx]);
        }
      } else {
        const ry = side === 'top' ? 3 : h - 4;
        for (let x = Math.round(w * 0.25); x <= Math.round(w * 0.75); x += 3) {
          rLums.push(lum[ry * w + x]);
          rSats.push(sat[ry * w + x]);
        }
      }
      return pickQuantile(rLums, 0.78) >= paperLumRef - 36 && pickQuantile(rSats, 0.35) <= paperSatRef + 18;
    };

    if (!lineL && checkRimIsPaper('left')) lineL = { slope: 0, intercept: 2, isVertical: true, isRim: true };
    if (!lineR && checkRimIsPaper('right')) lineR = { slope: 0, intercept: w - 3, isVertical: true, isRim: true };
    if (!lineT && checkRimIsPaper('top')) lineT = { slope: 0, intercept: 2, isVertical: false, isRim: true };
    if (!lineB && checkRimIsPaper('bottom')) lineB = { slope: 0, intercept: h - 3, isVertical: false, isRim: true };

    // 4. 備援：對仍未定位之邊，從中央紙張連通白色區域推估安全邊界
    if (!lineL || !lineR || !lineT || !lineB) {
      const borderSamples = [];
      const mx = Math.max(2, Math.floor(w * 0.03));
      const my = Math.max(2, Math.floor(h * 0.03));
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          if (x < mx || x >= w - mx || y < my || y >= h - my) {
            borderSamples.push(lum[y * w + x]);
          }
        }
      }
      const deskLum = pickQuantile(borderSamples, 0.35);
      const lumDiff = paperLumRef - deskLum;
      if (lumDiff >= 10) {
        const thresh = deskLum + lumDiff * 0.45;
        const paperPtsX = [], paperPtsY = [];
        for (let y = 4; y < h - 4; y += 2) {
          for (let x = 4; x < w - 4; x += 2) {
            if (lum[y * w + x] >= thresh && sat[y * w + x] <= paperSatRef + 22) {
              paperPtsX.push(x);
              paperPtsY.push(y);
            }
          }
        }
        if (paperPtsX.length >= 80) {
          if (!lineL) lineL = { slope: 0, intercept: pickQuantile(paperPtsX, 0.02), isVertical: true };
          if (!lineR) lineR = { slope: 0, intercept: pickQuantile(paperPtsX, 0.98), isVertical: true };
          if (!lineT) lineT = { slope: 0, intercept: pickQuantile(paperPtsY, 0.02), isVertical: false };
          if (!lineB) lineB = { slope: 0, intercept: pickQuantile(paperPtsY, 0.98), isVertical: false };
        }
      }
    }

    if (!lineL || !lineR || !lineT || !lineB) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.42 };
    }

    // 解直線交點 (x = av*y + bv, y = ah*x + bh)
    const intersectVH = (vLine, hLine) => {
      const denom = 1 - vLine.slope * hLine.slope;
      if (Math.abs(denom) < 1e-3) return null;
      const y = (hLine.slope * vLine.intercept + hLine.intercept) / denom;
      const x = vLine.slope * y + vLine.intercept;
      return { x, y };
    };

    const tlW = intersectVH(lineL, lineT);
    const trW = intersectVH(lineR, lineT);
    const brW = intersectVH(lineR, lineB);
    const blW = intersectVH(lineL, lineB);
    if (!tlW || !trW || !brW || !blW) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.42 };
    }

    const avgSpanW = (Math.hypot(trW.x - tlW.x, trW.y - tlW.y) + Math.hypot(brW.x - blW.x, brW.y - blW.y)) * 0.5;
    const avgSpanH = (Math.hypot(blW.x - tlW.x, blW.y - tlW.y) + Math.hypot(brW.x - trW.x, brW.y - trW.y)) * 0.5;
    const estAspect = avgSpanW / Math.max(1, avgSpanH);
    if (avgSpanW < w * 0.30 || avgSpanH < h * 0.30 || estAspect < 1.05 || estAspect > 1.95) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.42 };
    }

    // 轉回原圖座標，四邊收緊至僅保留約 3mm（~0.6%）乾淨紙邊，徹底裁除右側與下方深色／木頭桌面背景
    const invScale = 1 / scale;
    const rawCorners = [tlW, trW, brW, blW].map(p => ({
      x: p.x * invScale,
      y: p.y * invScale
    }));
    const cx = (rawCorners[0].x + rawCorners[1].x + rawCorners[2].x + rawCorners[3].x) * 0.25;
    const cy = (rawCorners[0].y + rawCorners[1].y + rawCorners[2].y + rawCorners[3].y) * 0.25;
    const padRatio = 0.006;

    const expandedCorners = rawCorners.map(p => ({
      x: Math.max(0, Math.min(sw, Math.round(p.x + (p.x - cx) * padRatio))),
      y: Math.max(0, Math.min(sh, Math.round(p.y + (p.y - cy) * padRatio)))
    }));

    return {
      corners: expandedCorners,
      detected: true,
      confidence: 'high',
      estimatedAspect: Number(Math.max(1.15, Math.min(1.80, estAspect)).toFixed(3))
    };
  }

  /**
   * 偵測 LG 保卡「經銷商店章」文字 ＋ 右側「LG LINE官方帳號 QR Code」垂直雙地標與圓角矩形框 (v48)
   */
  function detectLgDealerBoxStampSpec(cleanCardCanvas, dealerOcrAnchor = null) {
    const fallbackSpec = { ...LG_TW_STAMP_SPEC };
    if (!cleanCardCanvas || !cleanCardCanvas.width || !cleanCardCanvas.height) {
      return fallbackSpec;
    }

    const cw = cleanCardCanvas.width;
    const ch = cleanCardCanvas.height;

    // 1. 偵測右下角第二個 QR Code（LG LINE官方帳號 上方二維碼方塊）
    let qrAnchor = null;
    try {
      const qx0 = Math.round(cw * 0.54);
      const qy0 = Math.round(ch * 0.66);
      const qw = Math.max(40, Math.round(cw * 0.43));
      const qh = Math.max(40, Math.round(ch * 0.29));
      const qScale = Math.min(1, 260 / qw);
      const sw = Math.max(30, Math.round(qw * qScale));
      const sh = Math.max(30, Math.round(qh * qScale));

      const qCan = document.createElement('canvas');
      qCan.width = sw;
      qCan.height = sh;
      const qCtx = qCan.getContext('2d', { willReadFrequently: true });
      qCtx.drawImage(cleanCardCanvas, qx0, qy0, qw, qh, 0, 0, sw, sh);
      const qData = qCtx.getImageData(0, 0, sw, sh).data;

      const qLums = [];
      for (let i = 0; i < sw * sh; i += 2) {
        const p = i * 4;
        qLums.push(0.299 * qData[p] + 0.587 * qData[p + 1] + 0.114 * qData[p + 2]);
      }
      qLums.sort((a, b) => a - b);
      const qBgLum = qLums[Math.floor(qLums.length * 0.80)] || 215;
      const qDarkThresh = Math.max(55, qBgLum - 30);

      // 統計上半 85% 高度（避開最底部 QR 說明文字列）各垂直行黑點數，定位雙 QR 碼 X 區間
      const yScanLimit = Math.round(sh * 0.84);
      const colDark = new Int32Array(sw);
      for (let y = 2; y < yScanLimit; y++) {
        for (let x = 2; x < sw - 2; x++) {
          const p = (y * sw + x) * 4;
          const l = 0.299 * qData[p] + 0.587 * qData[p + 1] + 0.114 * qData[p + 2];
          if (l < qDarkThresh) colDark[x]++;
        }
      }

      const activeX = new Uint8Array(sw);
      const minColHits = Math.max(4, Math.round(sh * 0.16));
      for (let x = 0; x < sw; x++) {
        if (colDark[x] >= minColHits) activeX[x] = 1;
      }
      // 填平 QR 碼內部 <= 3px 白間隙
      const bridgedX = new Uint8Array(activeX);
      for (let x = 1; x < sw - 1; x++) {
        if (!activeX[x]) {
          let hasL = false, hasR = false;
          for (let d = 1; d <= 3; d++) {
            if (x - d >= 0 && activeX[x - d]) hasL = true;
            if (x + d < sw && activeX[x + d]) hasR = true;
          }
          if (hasL && hasR) bridgedX[x] = 1;
        }
      }

      const xClusters = [];
      let cStart = -1;
      for (let x = 0; x < sw; x++) {
        if (bridgedX[x] && cStart < 0) cStart = x;
        else if (!bridgedX[x] && cStart >= 0) {
          xClusters.push({ x0: cStart, x1: x - 1, w: x - cStart });
          cStart = -1;
        }
      }
      if (cStart >= 0) xClusters.push({ x0: cStart, x1: sw - 1, w: sw - cStart });

      const validQrClusters = xClusters.filter(c => {
        const wNorm = (c.w / qScale) / cw;
        return wNorm >= 0.065 && wNorm <= 0.195;
      });

      if (validQrClusters.length > 0) {
        // 選最右側符合寬度的方形 QR（即 LG LINE官方帳號 QR Code）
        const rightQr = validQrClusters[validQrClusters.length - 1];
        const rowDark = new Int32Array(sh);
        for (let y = 0; y < sh; y++) {
          let cnt = 0;
          for (let x = rightQr.x0; x <= rightQr.x1; x++) {
            const p = (y * sw + x) * 4;
            const l = 0.299 * qData[p] + 0.587 * qData[p + 1] + 0.114 * qData[p + 2];
            if (l < qDarkThresh) cnt++;
          }
          rowDark[y] = cnt;
        }
        const minRowHits = Math.max(4, Math.round(rightQr.w * 0.18));
        const activeY = new Uint8Array(sh);
        for (let y = 0; y < sh; y++) {
          if (rowDark[y] >= minRowHits) activeY[y] = 1;
        }
        const bridgedY = new Uint8Array(activeY);
        for (let y = 1; y < sh - 1; y++) {
          if (!activeY[y]) {
            let hasU = false, hasD = false;
            for (let d = 1; d <= 3; d++) {
              if (y - d >= 0 && activeY[y - d]) hasU = true;
              if (y + d < sh && activeY[y + d]) hasD = true;
            }
            if (hasU && hasD) bridgedY[y] = 1;
          }
        }
        let bestYCluster = null;
        let ys = -1;
        for (let y = 0; y < sh; y++) {
          if (bridgedY[y] && ys < 0) ys = y;
          else if (!bridgedY[y] && ys >= 0) {
            const hSpan = y - ys;
            if (!bestYCluster || hSpan > bestYCluster.h) {
              bestYCluster = { y0: ys, y1: y - 1, h: hSpan };
            }
            ys = -1;
          }
        }
        if (ys >= 0) {
          const hSpan = sh - ys;
          if (!bestYCluster || hSpan > bestYCluster.h) bestYCluster = { y0: ys, y1: sh - 1, h: hSpan };
        }
        if (bestYCluster) {
          const qrWOrig = rightQr.w / qScale;
          const qrHOrig = bestYCluster.h / qScale;
          const ratioSq = qrWOrig / Math.max(1, qrHOrig);
          if (ratioSq >= 0.72 && ratioSq <= 1.38) {
            qrAnchor = {
              centerX: (qx0 + (rightQr.x0 + rightQr.x1) * 0.5 / qScale) / cw,
              topY: (qy0 + bestYCluster.y0 / qScale) / ch,
              bottomY: (qy0 + bestYCluster.y1 / qScale) / ch,
              widthNorm: qrWOrig / cw,
              heightNorm: qrHOrig / ch,
              sizeNormW: ((qrWOrig + qrHOrig) * 0.5) / cw,
              sizeNormH: ((qrWOrig + qrHOrig) * 0.5) / ch
            };
          }
        }
      }
    } catch (qrErr) {
      console.warn('LG 右側 QR Code 幾何定位忽略:', qrErr);
    }

    // 2. 結合「經銷商店章 OCR 地標」與「右側 QR Code」取得水平同軸中心，在緊湊視窗內偵測圓角方框邊線
    const validLabelAnchor = (dealerOcrAnchor && dealerOcrAnchor.centerX > 0.55 && dealerOcrAnchor.centerX < 0.96)
      ? dealerOcrAnchor
      : null;

    const coaxialGuessX = (validLabelAnchor && qrAnchor)
      ? (validLabelAnchor.centerX + qrAnchor.centerX) * 0.5
      : ((validLabelAnchor && validLabelAnchor.centerX) || (qrAnchor && qrAnchor.centerX) || fallbackSpec.centerX);

    const halfWinW = Math.max(cw * 0.125, qrAnchor ? qrAnchor.widthNorm * cw * 1.05 : cw * 0.125);
    const rx = Math.max(Math.round(cw * 0.50), Math.min(cw - 50, Math.round(coaxialGuessX * cw - halfWinW)));
    const rw = Math.max(40, Math.min(cw - rx, Math.round(halfWinW * 2)));
    // 嚴格從 y=0.43 起掃描（完全避開上方「並請您妥善保存...」項目文字行）
    const ry = Math.round(ch * 0.43);
    const bottomCapY = validLabelAnchor
      ? Math.round((validLabelAnchor.bottomY + 0.045) * ch)
      : (qrAnchor ? Math.round((qrAnchor.topY - 0.015) * ch) : Math.round(ch * 0.78));
    const rh = Math.max(40, Math.min(ch - ry, bottomCapY - ry));

    const tmp = document.createElement('canvas');
    tmp.width = rw;
    tmp.height = rh;
    const tCtx = tmp.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(cleanCardCanvas, rx, ry, rw, rh, 0, 0, rw, rh);
    const data = tCtx.getImageData(0, 0, rw, rh).data;

    const lums = [];
    for (let i = 0; i < rw * rh; i += 3) {
      const p = i * 4;
      lums.push(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
    }
    lums.sort((a, b) => a - b);
    const bgLum = lums[Math.floor(lums.length * 0.78)] || 220;
    const darkThresh = Math.max(55, bgLum - 22);

    const colDarkCounts = new Int32Array(rw);
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const p = (y * rw + x) * 4;
        const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        if (lum < darkThresh) {
          colDarkCounts[x]++;
        }
      }
    }

    const pickPeakInRange = (arr, startIdx, endIdx, minRequired) => {
      let bestIdx = -1;
      let bestVal = 0;
      const s = Math.max(0, startIdx);
      const e = Math.min(arr.length - 1, endIdx);
      for (let i = s; i <= e; i++) {
        const val = arr[i] + (i > 0 ? arr[i - 1] * 0.5 : 0) + (i + 1 < arr.length ? arr[i + 1] * 0.5 : 0);
        if (arr[i] >= minRequired && val > bestVal) {
          bestVal = val;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const leftWallRel = pickPeakInRange(colDarkCounts, Math.round(rw * 0.04), Math.round(rw * 0.44), Math.round(rh * 0.22));
    const rightWallRel = pickPeakInRange(colDarkCounts, Math.round(rw * 0.56), Math.round(rw * 0.96), Math.round(rh * 0.22));

    // 僅在偵測到的左右牆線內側投影水平上下邊線，徹底避免左側印刷文字誤判成上框線
    const rowProjX0 = (leftWallRel >= 0 && rightWallRel > leftWallRel) ? Math.min(rw - 1, leftWallRel + 4) : Math.round(rw * 0.18);
    const rowProjX1 = (leftWallRel >= 0 && rightWallRel > leftWallRel) ? Math.max(rowProjX0 + 8, rightWallRel - 4) : Math.round(rw * 0.82);
    const rowProjSpan = Math.max(8, rowProjX1 - rowProjX0 + 1);
    const rowDarkCounts = new Int32Array(rh);
    for (let y = 0; y < rh; y++) {
      let rowDark = 0;
      for (let x = rowProjX0; x <= rowProjX1; x++) {
        const p = (y * rw + x) * 4;
        const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        if (lum < darkThresh) rowDark++;
      }
      rowDarkCounts[y] = rowDark;
    }

    const topWallRel = pickPeakInRange(rowDarkCounts, Math.round(rh * 0.02), Math.round(rh * 0.45), Math.round(rowProjSpan * 0.38));
    const bottomWallRel = pickPeakInRange(rowDarkCounts, Math.round(rh * 0.62), Math.round(rh * 0.98), Math.round(rowProjSpan * 0.38));

    let boxCenterX = null;
    let boxWRatio = null;
    let boxTopNorm = null;
    let boxBottomNorm = null;
    if (leftWallRel >= 0 && rightWallRel > leftWallRel) {
      const candWRatio = (rightWallRel - leftWallRel) / cw;
      const candCenterX = (rx + (leftWallRel + rightWallRel) * 0.5) / cw;
      if (candWRatio >= 0.115 && candWRatio <= 0.235 && Math.abs(candCenterX - coaxialGuessX) <= 0.055) {
        boxCenterX = candCenterX;
        boxWRatio = candWRatio;
      }
    }
    if (topWallRel >= 0) boxTopNorm = (ry + topWallRel) / ch;
    if (bottomWallRel >= 0) boxBottomNorm = (ry + bottomWallRel) / ch;

    // 3. 依據 4 個紅圈特寫幾何基準精準鎖定（v51/v52：Y 與寬度比例完全鎖定，僅將水平中心再向左微調 0.3cm 即 centerX - 0.015）：
    //    - 寬度為圓角方框淨寬之 1.12 倍（左右梅花與「集／司」下方對稱微跨左右框線）
    //    - 印章水平中心再向左偏移 0.015（預設 centerX 0.730）
    //    - 底弧最低點停在「經銷商店章」文字頂緣上方 2px~4px，上拱頂微跨上框線（預設 centerY 0.585）
    let finalCenterX;
    if (boxCenterX !== null) {
      finalCenterX = ((boxCenterX * 0.85) + (coaxialGuessX * 0.15)) - 0.015;
    } else if (validLabelAnchor && qrAnchor) {
      finalCenterX = ((validLabelAnchor.centerX + qrAnchor.centerX) * 0.5) - 0.015;
    } else if (validLabelAnchor || qrAnchor) {
      finalCenterX = coaxialGuessX - 0.015;
    } else {
      finalCenterX = fallbackSpec.centerX;
    }

    const netBoxWidthRatio = boxWRatio || (qrAnchor ? qrAnchor.widthNorm * 1.06 : 0.154);
    const stampWidthRatio = Math.max(0.158, Math.min(0.215, netBoxWidthRatio * 1.12));

    // 實測專櫃圓角橢圓章真實寬高比為 1.2806 (1844x1440)
    const estStampHNorm = (stampWidthRatio * cw / 1.2806) / ch;
    const estQrHNorm = qrAnchor ? qrAnchor.heightNorm : 0.145;
    const clearGapNorm = Math.max(2, Math.min(4, Math.round(ch * 0.0025))) / ch;

    const labelTopEdgeNorm = validLabelAnchor
      ? Math.max(0.50, validLabelAnchor.topY)
      : (boxBottomNorm !== null
          ? (boxBottomNorm - Math.max(0.036, estQrHNorm * 0.24))
          : (qrAnchor ? (qrAnchor.topY - 0.068) : 0.683));

    const bottomArcTargetNorm = labelTopEdgeNorm - clearGapNorm;
    let finalCenterY = bottomArcTargetNorm - estStampHNorm * 0.5;

    // 若實測上框線與底部文字錨點高度落差過大，安全限縮於上拱微跨範圍內且底弧絕不碰觸「經銷商店章」
    if (boxTopNorm !== null) {
      const upperMaxCenterY = bottomArcTargetNorm - estStampHNorm * 0.5;
      const reasonableMinCenterY = Math.max(0.46, boxTopNorm - estStampHNorm * 0.24 + estStampHNorm * 0.5);
      if (finalCenterY < reasonableMinCenterY && reasonableMinCenterY <= upperMaxCenterY) {
        finalCenterY = (finalCenterY + reasonableMinCenterY) * 0.5;
      }
      if (finalCenterY > upperMaxCenterY) {
        finalCenterY = upperMaxCenterY;
      }
    }

    return {
      centerX: Number(Math.max(0.60, Math.min(0.86, finalCenterX)).toFixed(4)),
      centerY: Number(Math.max(0.48, Math.min(0.66, finalCenterY)).toFixed(4)),
      widthRatio: Number(stampWidthRatio.toFixed(4)),
      tiltRangeDeg: 1.5,
      blendMode: 'multiply'
    };
  }

  /**
   * 純 JS Code 128 一維條碼掃描線解碼器（v49：支援 Start A/B/C 與 Mod-103 校驗和，免依賴外掛即 100% 精確讀取機號條碼）
   */
  const CODE128_PATTERNS = [
    '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
    '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
    '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
    '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
    '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
    '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
    '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
    '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
    '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
    '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
    '114131','311141','411131','211412','211214','211232','2331112'
  ];

  // 預先建立 ISO/IEC 15417 T1-T4 邊緣到同類邊緣雜湊表（抗油墨擴張與陰影模糊）
  const CODE128_T_TABLE = (() => {
    const map = Object.create(null);
    for (let idx = 0; idx < 106; idx++) {
      const p = CODE128_PATTERNS[idx];
      const d = [Number(p[0]), Number(p[1]), Number(p[2]), Number(p[3]), Number(p[4]), Number(p[5])];
      const key = `${d[0] + d[1]}-${d[1] + d[2]}-${d[2] + d[3]}-${d[3] + d[4]}`;
      if (!map[key]) map[key] = [];
      map[key].push({ idx, d, barSum: d[0] + d[2] + d[4] });
    }
    return map;
  })();

  function decodeCode128FromCanvas(srcCanvas) {
    if (!srcCanvas || !srcCanvas.width || !srcCanvas.height) return '';
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '';
    const data = ctx.getImageData(0, 0, w, h).data;

    const matchPattern = widths6 => {
      const sum = widths6[0] + widths6[1] + widths6[2] + widths6[3] + widths6[4] + widths6[5];
      if (sum <= 0) return -1;
      const modW = sum / 11;
      if (modW < 0.7) return -1;

      // 優先比對標準 6 寬度字串
      let pat = '';
      for (let i = 0; i < 6; i++) {
        const m = Math.max(1, Math.min(4, Math.round(widths6[i] / modW)));
        pat += String(m);
      }
      const exactIdx = CODE128_PATTERNS.indexOf(pat);
      if (exactIdx >= 0) return exactIdx;

      // 抗油墨擴張：以 T1-T4 邊緣距（b+s 抵銷邊緣位移 δ）精準比對
      const t1 = Math.max(2, Math.min(7, Math.round((widths6[0] + widths6[1]) / modW)));
      const t2 = Math.max(2, Math.min(7, Math.round((widths6[1] + widths6[2]) / modW)));
      const t3 = Math.max(2, Math.min(7, Math.round((widths6[2] + widths6[3]) / modW)));
      const t4 = Math.max(2, Math.min(7, Math.round((widths6[3] + widths6[4]) / modW)));
      const cands = CODE128_T_TABLE[`${t1}-${t2}-${t3}-${t4}`];
      if (!cands || cands.length === 0) return -1;
      if (cands.length === 1) return cands[0].idx;

      const obsBarNorm = ((widths6[0] + widths6[2] + widths6[4]) / sum) * 11;
      let bestCand = cands[0];
      let bestErr = Infinity;
      for (let c = 0; c < cands.length; c++) {
        const err = Math.abs(obsBarNorm - cands[c].barSum);
        if (err < bestErr) {
          bestErr = err;
          bestCand = cands[c];
        }
      }
      return bestCand.idx;
    };

    const decodeRowRuns = runs => {
      if (!runs || runs.length < 20) return '';
      for (let sIdx = 0; sIdx + 18 < runs.length; sIdx++) {
        if (!runs[sIdx].isDark) continue;
        if (sIdx > 0 && runs[sIdx - 1].len < runs[sIdx].len * 0.85) continue;
        const w6 = [
          runs[sIdx].len, runs[sIdx + 1].len, runs[sIdx + 2].len,
          runs[sIdx + 3].len, runs[sIdx + 4].len, runs[sIdx + 5].len
        ];
        const startCode = matchPattern(w6);
        if (startCode !== 103 && startCode !== 104 && startCode !== 105) continue;

        let mode = startCode === 103 ? 'A' : (startCode === 105 ? 'C' : 'B');
        const codes = [];
        let checkSum = startCode;
        let weight = 1;
        let pos = sIdx + 6;
        let foundStop = false;

        while (pos + 6 <= runs.length) {
          // 優先偵測 7 條空（13 modules）Stop 終止符 106 ('2331112')，避免被 6 條空截斷永遠無法結束
          if (pos + 7 <= runs.length) {
            const s7 = runs[pos].len + runs[pos + 1].len + runs[pos + 2].len +
                       runs[pos + 3].len + runs[pos + 4].len + runs[pos + 5].len + runs[pos + 6].len;
            if (s7 > 0) {
              const m13 = s7 / 13;
              const t0 = Math.round((runs[pos].len + runs[pos + 1].len) / m13);
              const t1 = Math.round((runs[pos + 1].len + runs[pos + 2].len) / m13);
              const t2 = Math.round((runs[pos + 2].len + runs[pos + 3].len) / m13);
              const t3 = Math.round((runs[pos + 3].len + runs[pos + 4].len) / m13);
              const t4 = Math.round((runs[pos + 4].len + runs[pos + 5].len) / m13);
              const t5 = Math.round((runs[pos + 5].len + runs[pos + 6].len) / m13);
              let pat7 = '';
              for (let k = 0; k < 7; k++) {
                pat7 += String(Math.max(1, Math.min(4, Math.round(runs[pos + k].len / m13))));
              }
              if ((t0 === 5 && t1 === 6 && t2 === 4 && t3 === 2 && t4 === 2 && t5 === 3) || pat7 === '2331112') {
                foundStop = true;
                break;
              }
            }
          }
          const symW6 = [
            runs[pos].len, runs[pos + 1].len, runs[pos + 2].len,
            runs[pos + 3].len, runs[pos + 4].len, runs[pos + 5].len
          ];
          const val = matchPattern(symW6);
          if (val < 0) break;
          codes.push(val);
          pos += 6;
        }
        if (!foundStop || codes.length < 2) continue;

        const checkDigit = codes.pop();
        for (let c = 0; c < codes.length; c++) {
          checkSum += codes[c] * (weight++);
        }
        if ((checkSum % 103) !== checkDigit) continue;

        let out = '';
        let shiftNext = false;
        for (let c = 0; c < codes.length; c++) {
          const code = codes[c];
          if (mode === 'C') {
            if (code <= 99) {
              out += String(code).padStart(2, '0');
            } else if (code === 100) {
              mode = 'B';
            } else if (code === 101) {
              mode = 'A';
            }
          } else {
            const activeMode = shiftNext ? (mode === 'A' ? 'B' : 'A') : mode;
            shiftNext = false;
            if (code === 99) {
              mode = 'C';
            } else if (code === 100 && activeMode === 'A') {
              mode = 'B';
            } else if (code === 101 && activeMode === 'B') {
              mode = 'A';
            } else if (code === 98) {
              shiftNext = true;
            } else if (code <= 95) {
              if (activeMode === 'B') {
                out += String.fromCharCode(code + 32);
              } else {
                if (code <= 63) out += String.fromCharCode(code + 32);
              }
            }
          }
        }
        if (out.length >= 6) return out;
      }
      return '';
    };

    const ySamples = [];
    for (let frac = 0.16; frac <= 0.84; frac += 0.05) {
      ySamples.push(Math.max(1, Math.min(h - 2, Math.round(h * frac))));
    }
    const threshOffsets = [0, -14, 14, -26, 26];
    const halfWin = Math.max(16, Math.round(w * 0.10));

    for (let yi = 0; yi < ySamples.length; yi++) {
      const y = ySamples[yi];
      const rowLums = new Float32Array(w);
      const prefix = new Float32Array(w + 1);
      let minL = 255, maxL = 0;
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        rowLums[x] = l;
        prefix[x + 1] = prefix[x] + l;
        if (l < minL) minL = l;
        if (l > maxL) maxL = l;
      }
      if (maxL - minL < 24) continue;

      // 先以局部滑動均值二值化（抗左右陰影漸層）
      for (const localBias of [-8, 0, -16]) {
        const runs = [];
        const th0 = (prefix[Math.min(w, halfWin + 1)] / Math.min(w, halfWin + 1)) + localBias;
        let curDark = rowLums[0] < th0;
        let runLen = 1;
        for (let x = 1; x < w; x++) {
          const x0 = Math.max(0, x - halfWin);
          const x1 = Math.min(w - 1, x + halfWin);
          const localMean = (prefix[x1 + 1] - prefix[x0]) / (x1 - x0 + 1);
          const isD = rowLums[x] < localMean + localBias;
          if (isD === curDark) {
            runLen++;
          } else {
            runs.push({ isDark: curDark, len: runLen });
            curDark = isD;
            runLen = 1;
          }
        }
        runs.push({ isDark: curDark, len: runLen });
        const decodedLocal = decodeRowRuns(runs);
        if (decodedLocal) return decodedLocal;
      }

      const baseMid = (minL + maxL) * 0.5;
      for (let ti = 0; ti < threshOffsets.length; ti++) {
        const th = baseMid + threshOffsets[ti];
        const runs = [];
        let curDark = rowLums[0] < th;
        let runLen = 1;
        for (let x = 1; x < w; x++) {
          const isD = rowLums[x] < th;
          if (isD === curDark) {
            runLen++;
          } else {
            runs.push({ isDark: curDark, len: runLen });
            curDark = isD;
            runLen = 1;
          }
        }
        runs.push({ isDark: curDark, len: runLen });
        const decoded = decodeRowRuns(runs);
        if (decoded) return decoded;
      }
    }
    return '';
  }

  function filterLgModelResult(rawText) {
    if (!rawText) return '';
    const cleaned = rawText.toUpperCase()
      .replace(/MBM\d{5,}/g, ' ')
      .replace(/REV[.\d_]*/g, ' ')
      .replace(/0800[-\s]?\d{3}[-\s]?\d{3}/g, ' ')
      .replace(/\b2162[-\s]?1196\b/g, ' ');

    const normalizeModelToken = rawTok => {
      let tok = (rawTok || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '');
      if (!tok) return '';
      const mapDigitChar = ch => ({ B: '8', O: '0', D: '0', I: '1', L: '1', S: '5', Z: '2', G: '6', T: '7' }[ch] || ch);
      const mapTailAlphaChar = ch => ({ '8': 'B', '0': 'O', '5': 'S', '1': 'I', '2': 'Z', '6': 'G' }[ch] || ch);
      // 修復遺失連字號之 LG 洗乾衣機／家電型號（如 WDSIB18PB / WDS1818P8 -> WD-S1818PB）
      const noHyphenWd = tok.match(/^WD-?([A-Z])([A-Z0-9]{4})([A-Z0-9]{2,3})$/);
      if (noHyphenWd) {
        const seriesLetter = noHyphenWd[1];
        const fixedDigits = noHyphenWd[2].split('').map(mapDigitChar).join('');
        if (/^\d{4}$/.test(fixedDigits) && /[A-Z]/.test(noHyphenWd[3])) {
          const fixedTail = noHyphenWd[3].split('').map(mapTailAlphaChar).join('');
          tok = `WD-${seriesLetter}${fixedDigits}${fixedTail}`;
        }
      }
      // 修正在型號數字區段中的字元混淆（如 WD-S1B18PB -> WD-S1818PB、WD-SB818PB -> WD-S8818PB）
      const washMatch = tok.match(/^([A-Z]{1,4}-[A-Z])([A-Z0-9]{3,6})([A-Z0-9]{0,4})$/);
      if (washMatch) {
        const head = washMatch[1];
        const mid = washMatch[2];
        const tail = washMatch[3];
        if ((mid.match(/\d/g) || []).length >= 2) {
          const fixedMid = mid.split('').map(mapDigitChar).join('');
          tok = `${head}${fixedMid}${tail}`;
        }
      }
      // 通用防呆：數字夾心字母（例如 1B18 -> 1818、25I5 -> 2515）還原為數字
      let prev;
      do {
        prev = tok;
        tok = tok.replace(/(\d)([BOISZ])(\d)/g, (_, d1, midCh, d2) => `${d1}${mapDigitChar(midCh)}${d2}`);
      } while (tok !== prev);
      // 結尾 2~3 碼英文顏色／規格碼校正（例如 WD-S1818P8 -> WD-S1818PB、P0 -> PO、5B -> SB）
      const tailSpecMatch = tok.match(/^([A-Z]{1,4}-[A-Z]{1,4}\d{2,4})([A-Z][085126]|[085126][A-Z]|[A-Z]{2}[085126])$/);
      if (tailSpecMatch) {
        tok = `${tailSpecMatch[1]}${tailSpecMatch[2].split('').map(mapTailAlphaChar).join('')}`;
      }
      return tok;
    };

    // 優先匹配 LG 常見含連字號型號（如 WD-S1818PB, WT-SD199HVG, GR-QPL88BS）
    const hyphenMatch = cleaned.match(/\b([A-Z]{1,4}\s*-\s*[A-Z0-9]{2,10}(?:-[A-Z0-9]{1,4})?)\b/g);
    if (hyphenMatch) {
      for (let i = 0; i < hyphenMatch.length; i++) {
        const tok = normalizeModelToken(hyphenMatch[i].replace(/\s+/g, ''));
        if (tok.length >= 5 && /[A-Z]/.test(tok) && /\d/.test(tok)) {
          return tok;
        }
      }
    }

    // 支援無連字號機型（如 OLED65C4PTA / AS651DSS0）
    const tokens = cleaned.split(/[\s\r\n:：]+/).map(t => t.replace(/[^A-Z0-9-]/g, '')).filter(Boolean);
    for (let i = 0; i < tokens.length; i++) {
      const tok = normalizeModelToken(tokens[i]);
      if (tok.length < 5 || tok.length > 18) continue;
      if (/^\d{3}[A-Z]{4,}\d{2,}$/.test(tok)) continue; // 排除 LG 機號格式
      if (/^MBM\d+/.test(tok)) continue;
      if (/[A-Z]{2,}/.test(tok) && /\d{2,}/.test(tok)) {
        return tok;
      }
    }
    return '';
  }

  function normalizeLgSerialTokenByPosition(rawTok) {
    const s = (rawTok || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.length < 9 || s.length > 15) return '';
    if (/^MBM/.test(s) || /^REV/.test(s) || /^LG/.test(s)) return '';

    const toHeadDigit = ch => ({ O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', T: '7', B: '8' }[ch] || ch);
    const toTailDigit = ch => ({ O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', A: '5', G: '6', T: '7', Y: '7', B: '8' }[ch] || ch);
    const toMidAlpha = ch => ({ '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '6': 'G', '8': 'B' }[ch] || ch);

    const chars = s.split('');
    // LG 台灣標準 12 碼機號結構：[3碼數字] + [6碼大寫英文字母] + [3碼數字]（如 610 + PNNAEQ + 687）
    for (let i = 0; i < Math.min(3, chars.length); i++) {
      chars[i] = toHeadDigit(chars[i]);
    }
    for (let i = Math.max(3, chars.length - 3); i < chars.length; i++) {
      chars[i] = toTailDigit(chars[i]);
    }
    if (chars.length === 12) {
      for (let i = 3; i < 9; i++) {
        chars[i] = toMidAlpha(chars[i]);
      }
    } else {
      for (let i = 3; i < chars.length - 3; i++) {
        if (/[012568]/.test(chars[i]) && i < chars.length - 4) {
          chars[i] = toMidAlpha(chars[i]);
        }
      }
    }

    const fixed = chars.join('');
    if (/^\d{3}[A-Z]{6}\d{3}$/.test(fixed)) return fixed;
    if (/^\d{3}[A-Z]{3,8}\d{2,5}$/.test(fixed)) return fixed;
    if (/^\d{3}[A-Z0-9]{6,11}$/.test(fixed) && (fixed.match(/\d/g) || []).length >= 5 && (fixed.match(/[A-Z]/g) || []).length >= 3) {
      return fixed;
    }
    return '';
  }

  function filterLgSerialResult(rawText) {
    if (!rawText) return '';
    const cleaned = rawText.toUpperCase()
      .replace(/MBM\d{5,}/g, ' ')
      .replace(/REV[.\d_]*/g, ' ');
    const tokens = cleaned.split(/[\s\r\n:：/|]+/).filter(Boolean);
    const candidates = [];

    for (let i = 0; i < tokens.length; i++) {
      const normalized = normalizeLgSerialTokenByPosition(tokens[i]);
      if (normalized) candidates.push(normalized);
    }

    const compact = cleaned.replace(/[^A-Z0-9]/g, '');
    // 優先從密集字串中擷取精確 12 碼 [3碼數字][6碼英文][3碼數字]
    const strict12 = compact.match(/\d{3}[A-Z]{6}\d{3}/);
    if (strict12) return strict12[0];

    const loose12 = compact.match(/[0-9OQDILZSGTB]{3}[A-Z012568]{6}[0-9OQDILZSGTBYA]{3}/g);
    if (loose12) {
      loose12.forEach(chunk => {
        const normalized = normalizeLgSerialTokenByPosition(chunk);
        if (normalized) candidates.push(normalized);
      });
    }

    const fallbackMatch = compact.match(/\d{3}[A-Z0-9]{6,11}/);
    if (fallbackMatch) {
      const normalized = normalizeLgSerialTokenByPosition(fallbackMatch[0]);
      if (normalized) candidates.push(normalized);
    }

    const best12 = candidates.find(c => /^\d{3}[A-Z]{6}\d{3}$/.test(c));
    if (best12) return best12;
    return candidates[0] || '';
  }

  function parseLgTopFormRow(rawText) {
    if (!rawText) return { model: '', serialNo: '' };
    const flat = rawText.replace(/\r/g, '\n');
    let model = '';
    let serialNo = '';

    const modelAnchor = flat.match(/(?:機型|機\s*型|MODEL|TYPE)\s*[:：.]*\s*([^\n]+)/i);
    if (modelAnchor) {
      const beforeSerial = modelAnchor[1].split(/機號|機\s*號|SERIAL/i)[0];
      model = filterLgModelResult(beforeSerial);
    }
    if (!model) {
      model = filterLgModelResult(flat);
    }

    const serialAnchor = flat.match(/(?:機號|機\s*號|SERIAL|S\/?N)\s*[:：.]*\s*([^\n]+)/i);
    if (serialAnchor) {
      serialNo = filterLgSerialResult(serialAnchor[1]);
    }
    if (!serialNo) {
      serialNo = filterLgSerialResult(flat);
    }
    return { model, serialNo };
  }

  // ===========================================================================
  // 台灣三菱電機商品保證書獨立引擎 (mitsubishi_tw，v53：8組地標偵測 / 對角雙紅標四點校正 / 6紅框十字蓋章 / 機型與製造號碼)
  // ===========================================================================
  function detectMitsubishiWarrantyByText(ocrText) {
    const rawUpper = String(ocrText || '').toUpperCase();
    if (!rawUpper.trim()) {
      return { isMitsubishi: false, hitCount: 0, matchedLandmarks: [], uniqueHits: [], comboHits: [] };
    }
    const compactUpper = rawUpper.replace(/[\s\-—–‐‑‒―~～_]+/g, '');

    // 專屬唯一地標（命中任 1 項即無條件鎖定 mitsubishi_tw）
    const hasTitleOrDealer =
      rawUpper.includes('三菱電機公司商品保證書') ||
      compactUpper.includes('三菱電機公司商品保證書') ||
      rawUpper.includes('三菱電機商品保證書') ||
      compactUpper.includes('三菱電機商品保證書') ||
      rawUpper.includes('三菱電機經銷商') ||
      compactUpper.includes('三菱電機經銷商');

    const hasCompany =
      rawUpper.includes('台灣三菱電機股份有限公司') ||
      compactUpper.includes('台灣三菱電機股份有限公司') ||
      rawUpper.includes('臺灣三菱電機股份有限公司') ||
      compactUpper.includes('臺灣三菱電機股份有限公司') ||
      rawUpper.includes('台灣三菱電機') ||
      compactUpper.includes('台灣三菱電機') ||
      rawUpper.includes('臺灣三菱電機') ||
      compactUpper.includes('臺灣三菱電機');

    const hasWebsite =
      rawUpper.includes('MITSUBISHIELECTRIC.COM.TW') ||
      compactUpper.includes('MITSUBISHIELECTRIC.COM.TW') ||
      rawUpper.includes('MITSUBISHIELECTRIC') ||
      compactUpper.includes('MITSUBISHIELECTRIC');

    const hasStampPrompt =
      rawUpper.includes('本欄請蓋店章') ||
      compactUpper.includes('本欄請蓋店章') ||
      rawUpper.includes('本欄請藍店章') ||
      compactUpper.includes('本欄請藍店章');

    const uniqueLandmarks = [];
    if (hasTitleOrDealer) uniqueLandmarks.push('三菱電機公司商品保證書');
    if (hasCompany) uniqueLandmarks.push('台灣三菱電機股份有限公司');
    if (hasWebsite) uniqueLandmarks.push('MitsubishiElectric.com.tw');
    if (hasStampPrompt) uniqueLandmarks.push('本欄請蓋店章');

    // 組合地標（命中任 2 項即鎖定 mitsubishi_tw）
    const hasBrandWord =
      rawUpper.includes('三菱電機') ||
      compactUpper.includes('三菱電機') ||
      rawUpper.includes('MITSUBISHI ELECTRIC') ||
      compactUpper.includes('MITSUBISHIELECTRIC') ||
      /(?:^|[^A-Z0-9])MITSUBISHI(?:[^A-Z0-9]|$)/.test(rawUpper);

    const hasWarrantyWord =
      rawUpper.includes('保證書') ||
      compactUpper.includes('保證書');

    const hasSerialWord =
      rawUpper.includes('製造號碼') ||
      compactUpper.includes('製造號碼');

    const hasQrServiceWord =
      rawUpper.includes('線上報修') ||
      compactUpper.includes('線上報修') ||
      rawUpper.includes('保證書登錄') ||
      compactUpper.includes('保證書登錄');

    const comboLandmarks = [];
    if (hasBrandWord) comboLandmarks.push('三菱電機');
    if (hasWarrantyWord) comboLandmarks.push('保證書');
    if (hasSerialWord) comboLandmarks.push('製造號碼');
    if (hasQrServiceWord) comboLandmarks.push('線上報修/保證書登錄');

    const matchedLandmarks = [...uniqueLandmarks, ...comboLandmarks];
    const isMitsubishi = uniqueLandmarks.length >= 1 || comboLandmarks.length >= 2;
    return {
      isMitsubishi,
      hitCount: matchedLandmarks.length,
      matchedLandmarks,
      uniqueHits: uniqueLandmarks,
      comboHits: comboLandmarks
    };
  }

  function detectMitsubishiCardQuad(srcImg) {
    const sw = srcImg && srcImg.width ? srcImg.width : 0;
    const sh = srcImg && srcImg.height ? srcImg.height : 0;
    const fallbackCorners = [
      { x: Math.round(sw * 0.02), y: Math.round(sh * 0.02) },
      { x: Math.round(sw * 0.98), y: Math.round(sh * 0.02) },
      { x: Math.round(sw * 0.98), y: Math.round(sh * 0.98) },
      { x: Math.round(sw * 0.02), y: Math.round(sh * 0.98) }
    ];
    if (!sw || !sh || sw < 60 || sh < 60) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.58 };
    }

    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(sw, sh));
    const w = Math.max(60, Math.round(sw * scale));
    const h = Math.max(60, Math.round(sh * scale));

    const workCanvas = document.createElement('canvas');
    workCanvas.width = w;
    workCanvas.height = h;
    const wCtx = workCanvas.getContext('2d', { willReadFrequently: true });
    wCtx.drawImage(srcImg, 0, 0, w, h);
    const data = wCtx.getImageData(0, 0, w, h).data;

    const total = w * h;
    const lum = new Float32Array(total);
    const sat = new Float32Array(total);

    // 1. 偵測對角雙紅標視覺錨點（左上 MITSUBISHI 紅鑽 ＋ 右下「台灣三菱電機股份有限公司」紅方印）
    let tlRedMinX = w, tlRedMinY = h, tlRedMaxX = -1, tlRedMaxY = -1, tlRedCount = 0;
    let brRedMinX = w, brRedMinY = h, brRedMaxX = -1, brRedMaxY = -1, brRedCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const p = idx * 4;
        const r = data[p], g = data[p + 1], b = data[p + 2];
        lum[idx] = 0.299 * r + 0.587 * g + 0.114 * b;
        sat[idx] = Math.max(r, g, b) - Math.min(r, g, b);
        const redness = r - Math.max(g, b);
        if (redness >= 28 && r >= 108) {
          if (x <= w * 0.42 && y <= h * 0.36) {
            tlRedCount++;
            if (x < tlRedMinX) tlRedMinX = x;
            if (y < tlRedMinY) tlRedMinY = y;
            if (x > tlRedMaxX) tlRedMaxX = x;
            if (y > tlRedMaxY) tlRedMaxY = y;
          } else if (x >= w * 0.54 && y >= h * 0.54) {
            brRedCount++;
            if (x < brRedMinX) brRedMinX = x;
            if (y < brRedMinY) brRedMinY = y;
            if (x > brRedMaxX) brRedMaxX = x;
            if (y > brRedMaxY) brRedMaxY = y;
          }
        }
      }
    }

    const pickQuantile = (arr, q) => {
      if (!arr || arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * q)));
      return sorted[idx];
    };

    const centerLums = [];
    const centerSats = [];
    for (let y = Math.floor(h * 0.28); y < Math.floor(h * 0.72); y += 2) {
      for (let x = Math.floor(w * 0.30); x < Math.floor(w * 0.70); x += 2) {
        const idx = y * w + x;
        centerLums.push(lum[idx]);
        centerSats.push(sat[idx]);
      }
    }
    const paperLumRef = pickQuantile(centerLums, 0.75);
    const paperSatRef = pickQuantile(centerSats, 0.40);

    const winOut = Math.max(6, Math.round(Math.min(w, h) * 0.024));
    const winIn = Math.max(8, Math.round(Math.min(w, h) * 0.034));

    const scanBorderCandidates = side => {
      const pts = [];
      if (side === 'left' || side === 'right') {
        const yStart = Math.round(h * 0.14);
        const yEnd = Math.round(h * 0.86);
        for (let y = yStart; y <= yEnd; y += 2) {
          const rowOff = y * w;
          let bestPos = -1;
          let bestScore = -Infinity;
          if (side === 'left') {
            const xMax = Math.round(w * 0.48);
            for (let x = winOut + 2; x <= xMax; x++) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = x - winOut; k <= x - 2; k++) {
                outSum += lum[rowOff + k];
                outSatSum += sat[rowOff + k];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = x + 2; k <= Math.min(w - 1, x + winIn); k++) {
                inLums.push(lum[rowOff + k]);
                inSats.push(sat[rowOff + k]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(105, paperLumRef - 95, outL + 9) && (jump >= 9 || (jump >= 5 && satDrop >= 5))) {
                const localStep = Math.max(0, lum[rowOff + Math.min(w - 1, x + 2)] - lum[rowOff + Math.max(0, x - 2)]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) { bestScore = score; bestPos = x; }
              }
            }
          } else {
            const xMin = Math.round(w * 0.52);
            for (let x = w - winOut - 3; x >= xMin; x--) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = x + 2; k <= x + winOut; k++) {
                outSum += lum[rowOff + k];
                outSatSum += sat[rowOff + k];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = Math.max(0, x - winIn); k <= x - 2; k++) {
                inLums.push(lum[rowOff + k]);
                inSats.push(sat[rowOff + k]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(105, paperLumRef - 95, outL + 9) && (jump >= 9 || (jump >= 5 && satDrop >= 5))) {
                const localStep = Math.max(0, lum[rowOff + Math.max(0, x - 2)] - lum[rowOff + Math.min(w - 1, x + 2)]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) { bestScore = score; bestPos = x; }
              }
            }
          }
          if (bestPos >= 0) pts.push({ x: bestPos, y });
        }
      } else {
        const xStart = Math.round(w * 0.16);
        const xEnd = Math.round(w * 0.84);
        for (let x = xStart; x <= xEnd; x += 2) {
          let bestPos = -1;
          let bestScore = -Infinity;
          if (side === 'top') {
            const yMax = Math.round(h * 0.44);
            for (let y = winOut + 2; y <= yMax; y++) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = y - winOut; k <= y - 2; k++) {
                const idx = k * w + x;
                outSum += lum[idx];
                outSatSum += sat[idx];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = y + 2; k <= Math.min(h - 1, y + winIn); k++) {
                const idx = k * w + x;
                inLums.push(lum[idx]);
                inSats.push(sat[idx]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(105, paperLumRef - 95, outL + 9) && (jump >= 9 || (jump >= 5 && satDrop >= 5))) {
                const localStep = Math.max(0, lum[Math.min(h - 1, y + 2) * w + x] - lum[Math.max(0, y - 2) * w + x]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) { bestScore = score; bestPos = y; }
              }
            }
          } else {
            const yMin = Math.round(h * 0.56);
            for (let y = h - winOut - 3; y >= yMin; y--) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = y + 2; k <= y + winOut; k++) {
                const idx = k * w + x;
                outSum += lum[idx];
                outSatSum += sat[idx];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = Math.max(0, y - winIn); k <= y - 2; k++) {
                const idx = k * w + x;
                inLums.push(lum[idx]);
                inSats.push(sat[idx]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(105, paperLumRef - 95, outL + 9) && (jump >= 9 || (jump >= 5 && satDrop >= 5))) {
                const localStep = Math.max(0, lum[Math.max(0, y - 2) * w + x] - lum[Math.min(h - 1, y + 2) * w + x]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) { bestScore = score; bestPos = y; }
              }
            }
          }
          if (bestPos >= 0) pts.push({ x, y: bestPos });
        }
      }
      return pts;
    };

    const fitLineRansac = (pts, isVertical, minNeeded) => {
      if (!pts || pts.length < minNeeded) return null;
      let bestInliers = [];
      let bestSlope = 0;
      let bestIntercept = 0;
      const step = Math.max(1, Math.floor(pts.length / 24));
      for (let i = 0; i < pts.length; i += step) {
        for (let j = i + Math.max(2, step); j < pts.length; j += step) {
          const p1 = pts[i], p2 = pts[j];
          const dv = isVertical ? (p2.y - p1.y) : (p2.x - p1.x);
          if (Math.abs(dv) < 12) continue;
          const slope = isVertical ? (p2.x - p1.x) / dv : (p2.y - p1.y) / dv;
          if (Math.abs(slope) > 0.25) continue;
          const intercept = isVertical ? (p1.x - slope * p1.y) : (p1.y - slope * p1.x);
          const inliers = [];
          for (let k = 0; k < pts.length; k++) {
            const pk = pts[k];
            const pred = isVertical ? (slope * pk.y + intercept) : (slope * pk.x + intercept);
            const actual = isVertical ? pk.x : pk.y;
            if (Math.abs(actual - pred) <= 3.5) inliers.push(pk);
          }
          if (inliers.length > bestInliers.length) {
            bestInliers = inliers;
            bestSlope = slope;
            bestIntercept = intercept;
          }
        }
      }
      if (bestInliers.length < minNeeded) return null;
      let sumU = 0, sumV = 0, sumUU = 0, sumUV = 0;
      bestInliers.forEach(p => {
        const u = isVertical ? p.y : p.x;
        const v = isVertical ? p.x : p.y;
        sumU += u; sumV += v; sumUU += u * u; sumUV += u * v;
      });
      const n = bestInliers.length;
      const denom = n * sumUU - sumU * sumU;
      if (Math.abs(denom) > 1e-4) {
        const refinedSlope = (n * sumUV - sumU * sumV) / denom;
        if (Math.abs(refinedSlope) <= 0.25) {
          bestSlope = refinedSlope;
          bestIntercept = (sumV - refinedSlope * sumU) / n;
        }
      }
      return { slope: bestSlope, intercept: bestIntercept, count: bestInliers.length, isVertical };
    };

    const minVNeeded = Math.max(8, Math.round(h * 0.08));
    const minHNeeded = Math.max(8, Math.round(w * 0.08));
    let lineL = fitLineRansac(scanBorderCandidates('left'), true, minVNeeded);
    let lineR = fitLineRansac(scanBorderCandidates('right'), true, minVNeeded);
    let lineT = fitLineRansac(scanBorderCandidates('top'), false, minHNeeded);
    let lineB = fitLineRansac(scanBorderCandidates('bottom'), false, minHNeeded);

    const checkRimIsPaper = side => {
      const rLums = [], rSats = [];
      if (side === 'left' || side === 'right') {
        const rx = side === 'left' ? 3 : w - 4;
        for (let y = Math.round(h * 0.22); y <= Math.round(h * 0.78); y += 3) {
          rLums.push(lum[y * w + rx]);
          rSats.push(sat[y * w + rx]);
        }
      } else {
        const ry = side === 'top' ? 3 : h - 4;
        for (let x = Math.round(w * 0.25); x <= Math.round(w * 0.75); x += 3) {
          rLums.push(lum[ry * w + x]);
          rSats.push(sat[ry * w + x]);
        }
      }
      return pickQuantile(rLums, 0.78) >= paperLumRef - 38 && pickQuantile(rSats, 0.35) <= paperSatRef + 18;
    };

    if (!lineL && checkRimIsPaper('left')) lineL = { slope: 0, intercept: 2, isVertical: true, isRim: true };
    if (!lineR && checkRimIsPaper('right')) lineR = { slope: 0, intercept: w - 3, isVertical: true, isRim: true };
    if (!lineT && checkRimIsPaper('top')) lineT = { slope: 0, intercept: 2, isVertical: false, isRim: true };
    if (!lineB && checkRimIsPaper('bottom')) lineB = { slope: 0, intercept: h - 3, isVertical: false, isRim: true };

    if (!lineL || !lineR || !lineT || !lineB) {
      const borderSamples = [];
      const mx = Math.max(2, Math.floor(w * 0.03));
      const my = Math.max(2, Math.floor(h * 0.03));
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          if (x < mx || x >= w - mx || y < my || y >= h - my) borderSamples.push(lum[y * w + x]);
        }
      }
      const deskLum = pickQuantile(borderSamples, 0.35);
      const lumDiff = paperLumRef - deskLum;
      if (lumDiff >= 10) {
        const thresh = deskLum + lumDiff * 0.45;
        const paperPtsX = [], paperPtsY = [];
        for (let y = 4; y < h - 4; y += 2) {
          for (let x = 4; x < w - 4; x += 2) {
            if (lum[y * w + x] >= thresh && sat[y * w + x] <= paperSatRef + 22) {
              paperPtsX.push(x);
              paperPtsY.push(y);
            }
          }
        }
        if (paperPtsX.length >= 80) {
          if (!lineL) lineL = { slope: 0, intercept: pickQuantile(paperPtsX, 0.02), isVertical: true };
          if (!lineR) lineR = { slope: 0, intercept: pickQuantile(paperPtsX, 0.98), isVertical: true };
          if (!lineT) lineT = { slope: 0, intercept: pickQuantile(paperPtsY, 0.02), isVertical: false };
          if (!lineB) lineB = { slope: 0, intercept: pickQuantile(paperPtsY, 0.98), isVertical: false };
        }
      }
    }

    if (!lineL || !lineR || !lineT || !lineB) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.58 };
    }

    const intersectVH = (vLine, hLine) => {
      const denom = 1 - vLine.slope * hLine.slope;
      if (Math.abs(denom) < 1e-3) return null;
      const y = (hLine.slope * vLine.intercept + hLine.intercept) / denom;
      const x = vLine.slope * y + vLine.intercept;
      return { x, y };
    };

    let tlW = intersectVH(lineL, lineT);
    let trW = intersectVH(lineR, lineT);
    let brW = intersectVH(lineR, lineB);
    let blW = intersectVH(lineL, lineB);
    if (!tlW || !trW || !brW || !blW) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.58 };
    }

    // 對角雙紅標保底護欄：確保四邊形絕不內縮切掉左上紅鑽 LOGO 與右下台灣三菱電機紅色公司章
    if (tlRedCount >= 18) {
      const safeMinX = Math.max(0, tlRedMinX - w * 0.025);
      const safeMinY = Math.max(0, tlRedMinY - h * 0.028);
      if (tlW.x > safeMinX) { tlW.x = safeMinX; blW.x = Math.min(blW.x, safeMinX); }
      if (tlW.y > safeMinY) { tlW.y = safeMinY; trW.y = Math.min(trW.y, safeMinY); }
    }
    if (brRedCount >= 18) {
      const safeMaxX = Math.min(w, brRedMaxX + w * 0.028);
      const safeMaxY = Math.min(h, brRedMaxY + h * 0.028);
      if (brW.x < safeMaxX) { brW.x = safeMaxX; trW.x = Math.max(trW.x, safeMaxX); }
      if (brW.y < safeMaxY) { brW.y = safeMaxY; blW.y = Math.max(blW.y, safeMaxY); }
    }

    const avgSpanW = (Math.hypot(trW.x - tlW.x, trW.y - tlW.y) + Math.hypot(brW.x - blW.x, brW.y - blW.y)) * 0.5;
    const avgSpanH = (Math.hypot(blW.x - tlW.x, blW.y - tlW.y) + Math.hypot(brW.x - trW.x, brW.y - trW.y)) * 0.5;
    const estAspect = avgSpanW / Math.max(1, avgSpanH);
    if (avgSpanW < w * 0.30 || avgSpanH < h * 0.30 || estAspect < 1.15 || estAspect > 2.05) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.58 };
    }

    // 四邊保留約 3mm~5mm（~0.8%）均勻呼吸白邊，維持橫式原比例透視校正
    const invScale = 1 / scale;
    const rawCorners = [tlW, trW, brW, blW].map(p => ({
      x: p.x * invScale,
      y: p.y * invScale
    }));
    const cx = (rawCorners[0].x + rawCorners[1].x + rawCorners[2].x + rawCorners[3].x) * 0.25;
    const cy = (rawCorners[0].y + rawCorners[1].y + rawCorners[2].y + rawCorners[3].y) * 0.25;
    const padRatio = 0.008;

    const expandedCorners = rawCorners.map(p => ({
      x: Math.max(0, Math.min(sw, Math.round(p.x + (p.x - cx) * padRatio))),
      y: Math.max(0, Math.min(sh, Math.round(p.y + (p.y - cy) * padRatio)))
    }));

    return {
      corners: expandedCorners,
      detected: true,
      confidence: (tlRedCount >= 18 || brRedCount >= 18) ? 'high' : 'medium',
      estimatedAspect: Number(Math.max(1.30, Math.min(1.85, estAspect)).toFixed(3))
    };
  }

  /**
   * 依據使用者 6 紅框十字基準鎖定台灣三菱電機保證書左下「三菱電機經銷商」印章落點 (v53)
   * 1. 左邊界：緊貼「三菱電機經銷商：」之「機」字右側（避開左側 店名/電話/地址）
   * 2. 上邊界：頂端拱頂緊貼「購買日期： 年」下方水平分隔線
   * 3. 右邊界：右外弧微壓「三菱電機經銷商」與「（本欄請蓋店章）」間之中柱垂直分隔線 1~2px
   * 4. 水平中線對齊左側「電話：」一列，底弧貼齊表格最底緣外框線
   */
  function detectMitsubishiDealerStampSpec(cleanCardCanvas, mitsuOcrAnchors = null) {
    const fallbackSpec = { ...MITSUBISHI_TW_STAMP_SPEC };
    if (!cleanCardCanvas || !cleanCardCanvas.width || !cleanCardCanvas.height) {
      return fallbackSpec;
    }

    const cw = cleanCardCanvas.width;
    const ch = cleanCardCanvas.height;
    const rx = Math.round(cw * 0.015);
    const ry = Math.round(ch * 0.50);
    const rw = Math.max(60, Math.round(cw * 0.48));
    const rh = Math.max(60, Math.round(ch * 0.43));

    const tmp = document.createElement('canvas');
    tmp.width = rw;
    tmp.height = rh;
    const tCtx = tmp.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(cleanCardCanvas, rx, ry, rw, rh, 0, 0, rw, rh);
    const data = tCtx.getImageData(0, 0, rw, rh).data;

    const lums = [];
    for (let i = 0; i < rw * rh; i += 3) {
      const p = i * 4;
      lums.push(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
    }
    lums.sort((a, b) => a - b);
    const bgLum = lums[Math.floor(lums.length * 0.78)] || 222;
    const darkThresh = Math.max(58, bgLum - 24);

    // 偵測「中柱垂直分隔線」（位於保卡 x: 0.27 ~ 0.42 之間，分隔「三菱電機經銷商」與「本欄請蓋店章」）
    const colDark = new Int32Array(rw);
    const yProj0 = Math.round(rh * 0.18);
    const yProj1 = Math.round(rh * 0.88);
    const vProjSpan = Math.max(10, yProj1 - yProj0 + 1);
    for (let y = yProj0; y <= yProj1; y++) {
      for (let x = 0; x < rw; x++) {
        const p = (y * rw + x) * 4;
        const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        if (l < darkThresh) colDark[x]++;
      }
    }

    const pickPeakInRange = (arr, startIdx, endIdx, minReq) => {
      let bestIdx = -1;
      let bestVal = 0;
      const s = Math.max(0, startIdx);
      const e = Math.min(arr.length - 1, endIdx);
      for (let i = s; i <= e; i++) {
        const val = arr[i] + (i > 0 ? arr[i - 1] * 0.5 : 0) + (i + 1 < arr.length ? arr[i + 1] * 0.5 : 0);
        if (arr[i] >= minReq && val > bestVal) {
          bestVal = val;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const divStartX = Math.max(0, Math.round(cw * 0.27) - rx);
    const divEndX = Math.min(rw - 1, Math.round(cw * 0.42) - rx);
    const centerDividerRel = pickPeakInRange(colDark, divStartX, divEndX, Math.round(vProjSpan * 0.42));
    const centerDividerNorm = centerDividerRel >= 0 ? (rx + centerDividerRel) / cw : null;

    // 僅在左側格（三菱電機經銷商欄位內側）投影水平表格線：找出「購買日期」下方線與最底外框線
    const rowDark = new Int32Array(rh);
    const hProjX0 = Math.round(cw * 0.05) - rx;
    const hProjX1 = Math.min(rw - 1, (centerDividerRel >= 0 ? centerDividerRel - 6 : Math.round(cw * 0.32) - rx));
    const hProjSpan = Math.max(10, hProjX1 - hProjX0 + 1);
    for (let y = 0; y < rh; y++) {
      let cnt = 0;
      for (let x = Math.max(0, hProjX0); x <= hProjX1; x++) {
        const p = (y * rw + x) * 4;
        const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        if (l < darkThresh) cnt++;
      }
      rowDark[y] = cnt;
    }

    const purchaseLineRel = pickPeakInRange(
      rowDark,
      Math.max(0, Math.round(ch * 0.57) - ry),
      Math.min(rh - 1, Math.round(ch * 0.69) - ry),
      Math.round(hProjSpan * 0.42)
    );
    const bottomTableLineRel = pickPeakInRange(
      rowDark,
      Math.max(0, Math.round(ch * 0.79) - ry),
      Math.min(rh - 1, Math.round(ch * 0.91) - ry),
      Math.round(hProjSpan * 0.42)
    );

    const purchaseBottomNorm = purchaseLineRel >= 0 ? (ry + purchaseLineRel) / ch : null;
    const tableBottomNorm = bottomTableLineRel >= 0 ? (ry + bottomTableLineRel) / ch : null;

    // 結合 OCR 文字錨點與 v54 1.4x 四邊對位校準（左貼「機」字、上貼「購買日期：年」橫線、右微壓中柱線 1~2px、下貼最底框線）
    const anchors = mitsuOcrAnchors || {};
    const leftEdgeNorm = (typeof anchors.dealerRightX === 'number' && anchors.dealerRightX >= 0.050 && anchors.dealerRightX <= 0.115)
      ? anchors.dealerRightX + 0.002
      : 0.0655;

    let dividerEdgeNorm = (centerDividerNorm !== null && centerDividerNorm >= 0.30 && centerDividerNorm <= 0.41)
      ? centerDividerNorm
      : 0.3490;

    if (typeof anchors.rightStampPromptLeftX === 'number' && anchors.rightStampPromptLeftX > 0.32) {
      dividerEdgeNorm = Math.min(dividerEdgeNorm, anchors.rightStampPromptLeftX - 0.004);
    }

    // 右邊界微壓中柱垂直分隔線 1.5px（~0.001），絕不侵入右側「（本欄請蓋店章）」，寬度鎖定於 1.4x (約 0.285，絕不縮回 0.205)
    // v56: 依實測回饋水平向右微調約 2mm (centerX + 0.010)，垂直高度 Y 與寬高比保持不變
    const rightEdgeTargetNorm = dividerEdgeNorm + (1.5 / Math.max(100, cw));
    let stampWidthRatio = rightEdgeTargetNorm - leftEdgeNorm;
    stampWidthRatio = Math.max(0.268, Math.min(0.302, stampWidthRatio));
    let stampCenterX = rightEdgeTargetNorm - stampWidthRatio * 0.5 + 0.010;

    if (centerDividerNorm === null && !(typeof anchors.dealerRightX === 'number' && anchors.dealerRightX <= 0.115)) {
      stampCenterX = fallbackSpec.centerX;
      stampWidthRatio = fallbackSpec.widthRatio;
    }

    // v57 垂直落點單點鎖定：保持 horizontal centerX / widthRatio 不變，直接將印章底緣弧線最低點切齊表格最底部黑色水平外框線（保底 0.788，夾限 [0.775, 0.802]）
    const estStampHNorm = (stampWidthRatio * cw / 1.2806) / ch;
    let stampCenterY = fallbackSpec.centerY;
    if (tableBottomNorm !== null) {
      const bottomLineNorm = Math.max(0.84, tableBottomNorm);
      stampCenterY = bottomLineNorm - estStampHNorm * 0.5;
    }

    return {
      centerX: Number(Math.max(0.195, Math.min(0.245, stampCenterX)).toFixed(4)),
      centerY: Number(Math.max(0.775, Math.min(0.802, stampCenterY)).toFixed(4)),
      widthRatio: Number(stampWidthRatio.toFixed(4)),
      tiltRangeDeg: 1.5,
      blendMode: 'multiply'
    };
  }

  function filterMitsubishiModelResult(rawText) {
    if (!rawText) return '';
    try {
      const cleanedRaw = String(rawText)
        .replace(/MHS[-\s]?\d{2}[-\s]?\d{5,8}/gi, ' ')
        .replace(/0800[-\s]?\d{3}[-\s]?\d{3}/g, ' ')
        .replace(/\(02\)\s*\d{4}[-\s]?\d{4}/g, ' ')
        .replace(/2728[-\s]?2288/g, ' ');

      const mapNumChar = ch => ({
        O: '0', D: '0', Q: '0',
        I: '1', L: '1', i: '1', l: '1',
        Z: '2', z: '2',
        S: '5', s: '5',
        G: '6', b: '6',
        B: '8'
      }[ch] || String(ch).toUpperCase());

      const normalizeMitsuModelToken = (rawTok, rawCaseTok = '') => {
        let tok = String(rawTok || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '');
        if (!tok || /^MHS-?\d/.test(tok)) return '';

        // 校準三菱標準前綴與漏連字號（MR-/MJ-/MSZ-/MUZ-）
        tok = tok.replace(/^(MR|MJ|MSZ|MUZ)([A-Z][A-Z0-9-]{2,})$/, '$1-$2');
        tok = tok.replace(/^(?:NR|MP|MH|MN|MB|MK)-?([A-Z][A-Z0-9-]{2,})$/, 'MR-$1');
        tok = tok.replace(/^(?:NJ|MI|HJ)-?([EF][A-Z0-9-]{2,})$/, 'MJ-$1');
        tok = tok.replace(/^(?:NSZ|M5Z|MS2|HSZ)-?([A-Z][A-Z0-9-]{2,})$/, 'MSZ-$1');
        tok = tok.replace(/^(?:NUZ|MU2|HVZ)-?([A-Z][A-Z0-9-]{2,})$/, 'MUZ-$1');

        const rawCaseCompact = String(rawCaseTok || '').replace(/[^A-Za-z0-9-]/g, '');
        const mitsuMatch = tok.match(/^([A-Z]{2,4}-[A-Z]{1,3})([0-9OIQDGLZSB]{2,3})([A-Z]{0,3}(?:-[A-Z0-9]{1,3}){0,3})$/);
        if (mitsuMatch) {
          let numPart = mitsuMatch[2];
          const caseMatch = rawCaseCompact.match(/^[A-Za-z]{2,4}-?[A-Za-z]{1,3}([0-9OIQDGLZSBoiqdglzsb]{2,3})/);
          if (caseMatch && caseMatch[1].length === numPart.length) {
            numPart = caseMatch[1];
          }
          const fixedNum = numPart.split('').map(mapNumChar).join('');
          if (/^\d{2,3}$/.test(fixedNum)) {
            tok = `${mitsuMatch[1]}${fixedNum}${mitsuMatch[3]}`;
          }
        }
        // 數字夾心字母還原（如 6IN -> 61N 中的 IN，或 6I8 -> 618）
        tok = tok.replace(/(\d)([OIQDGLZB])(\d)/g, (_, a, b, c) => `${a}${mapNumChar(b)}${c}`);
        return tok;
      };

      const scoreTok = tok => {
        if (!tok) return -1;
        let sc = tok.length;
        if (/^(?:MR|MJ|MSZ|MUZ)-/.test(tok)) sc += 50;
        if (/^(?:MR|MJ|MSZ|MUZ)-[A-Z]{1,3}\d{2,3}/.test(tok)) sc += 25;
        return sc;
      };

      const candidates = [];
      const multiHyphen = cleanedRaw.match(/\b([A-Za-z]{2,4}(?:\s*-\s*)?[A-Za-z0-9]{2,8}(?:\s*-\s*[A-Za-z0-9]{1,4}){0,3})\b/g);
      if (multiHyphen) {
        for (let i = 0; i < multiHyphen.length; i++) {
          const compactCase = multiHyphen[i].replace(/\s+/g, '');
          const tok = normalizeMitsuModelToken(compactCase.toUpperCase(), compactCase);
          if (tok.length >= 5 && /[A-Z]{2}/.test(tok) && /\d/.test(tok) && !/^MHS/.test(tok)) {
            candidates.push(tok);
          }
        }
      }

      const tokens = cleanedRaw.split(/[\s\r\n:：]+/).filter(Boolean);
      for (let i = 0; i < tokens.length; i++) {
        const compactCase = tokens[i].replace(/[^A-Za-z0-9-]/g, '');
        const tok = normalizeMitsuModelToken(compactCase.toUpperCase(), compactCase);
        if (tok.length < 5 || tok.length > 22) continue;
        if (/^MHS/.test(tok) || /^\d+$/.test(tok)) continue;
        if (/[A-Z]{2,}/.test(tok) && /\d{2,}/.test(tok)) {
          candidates.push(tok);
        }
      }

      if (candidates.length === 0) return '';
      candidates.sort((a, b) => scoreTok(b) - scoreTok(a));
      return candidates[0];
    } catch (err) {
      console.warn('filterMitsubishiModelResult 略過例外:', err);
      return '';
    }
  }

  function filterMitsubishiSerialResult(rawText) {
    if (!rawText) return '';
    const cleaned = String(rawText).toUpperCase()
      .replace(/MHS[-\s]?\d{2}[-\s]?\d{5,8}/g, ' ')
      .replace(/0800[-\s]?\d{3}[-\s]?\d{3}/g, ' ')
      .replace(/2728[-\s]?2288/g, ' ');

    const toDigit = ch => ({ O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', T: '7', B: '8' }[ch] || ch);
    const tokens = cleaned.split(/[\s\r\n:：/|]+/).filter(Boolean);
    const candidates = [];

    for (let i = 0; i < tokens.length; i++) {
      const rawTok = tokens[i].replace(/[^A-Z0-9]/g, '');
      if (rawTok.length < 5 || rawTok.length > 10) continue;
      const fixed = rawTok.split('').map(toDigit).join('');
      if (/^\d{5,10}$/.test(fixed) && fixed !== '24721268' && fixed !== '27282288') {
        candidates.push(fixed);
      }
    }

    if (candidates.length === 0) {
      const compact = cleaned.replace(/[^A-Z0-9]/g, '');
      const m = compact.match(/[0-9OQDILZSTBG]{5,10}/g);
      if (m) {
        m.forEach(chunk => {
          const fixed = chunk.split('').map(toDigit).join('');
          if (/^\d{5,10}$/.test(fixed) && fixed !== '24721268' && fixed !== '27282288') {
            candidates.push(fixed);
          }
        });
      }
    }

    // 優先回傳 6~8 碼純數字製造號碼（如 600067）
    const preferred = candidates.find(c => c.length >= 6 && c.length <= 8);
    return preferred || candidates[0] || '';
  }

  function parseMitsubishiTopFormRow(rawText) {
    if (!rawText) return { model: '', serialNo: '' };
    const flat = String(rawText).replace(/\r/g, '\n');
    let model = '';
    let serialNo = '';

    const modelAnchor = flat.match(/(?:機型|機\s*型|MODEL|TYPE)\s*[:：.]*\s*([^\n]+)/i);
    if (modelAnchor) {
      const beforeSerial = modelAnchor[1].split(/製造號碼|製\s*造\s*號\s*碼|SERIAL/i)[0];
      model = filterMitsubishiModelResult(beforeSerial);
    }
    if (!model) {
      model = filterMitsubishiModelResult(flat);
    }

    const serialAnchor = flat.match(/(?:製造號碼|製\s*造\s*號\s*碼|號碼|SERIAL|S\/?N)\s*[:：.]*\s*([^\n]+)/i);
    if (serialAnchor) {
      serialNo = filterMitsubishiSerialResult(serialAnchor[1]);
    }
    if (!serialNo) {
      serialNo = filterMitsubishiSerialResult(flat);
    }
    return { model, serialNo };
  }

  // ===========================================================================
  // 台灣日立阿奇立克家電製品保證書獨立引擎 (hitachi_tw，v60：專屬地標防誤判 / 雙黑框四點校正 / 經銷商確認章右側十字蓋章 / 商品型號與機號)
  // ===========================================================================
  function detectHitachiWarrantyByText(ocrText) {
    const rawUpper = String(ocrText || '').toUpperCase();
    if (!rawUpper.trim()) {
      return { isHitachi: false, hitCount: 0, matchedLandmarks: [], uniqueHits: [], comboHits: [] };
    }
    const compactUpper = rawUpper.replace(/[\s\-—–‐‑‒―~～_.:：]+/g, '');

    // 專屬唯一地標（命中任 1 項即無條件鎖定為日立保卡，優先權高於發票／QR Code）
    const hasCompany =
      rawUpper.includes('阿奇立克日立台灣家電股份有限公司') ||
      compactUpper.includes('阿奇立克日立台灣家電股份有限公司') ||
      rawUpper.includes('阿奇立克日立') ||
      compactUpper.includes('阿奇立克日立') ||
      (compactUpper.includes('阿奇立克') && compactUpper.includes('日立'));

    const hasWebsite =
      rawUpper.includes('HITACHI-HOMEAPPLIANCES.COM.TW') ||
      compactUpper.includes('HITACHIHOMEAPPLIANCESCOMTW') ||
      rawUpper.includes('HITACHI-HOMEAPPLIANCES') ||
      compactUpper.includes('HITACHIHOMEAPPLIANCES');

    const hasAddress =
      rawUpper.includes('台北市南京東路3段65號2樓') ||
      compactUpper.includes('台北市南京東路3段65號2樓') ||
      rawUpper.includes('南京東路3段65號2樓') ||
      compactUpper.includes('南京東路3段65號2樓') ||
      compactUpper.includes('南京東路三段65號2樓') ||
      (compactUpper.includes('南京東路') && compactUpper.includes('65號2樓'));

    const uniqueLandmarks = [];
    if (hasCompany) uniqueLandmarks.push('阿奇立克日立台灣家電股份有限公司');
    if (hasWebsite) uniqueLandmarks.push('hitachi-homeappliances.com.tw');
    if (hasAddress) uniqueLandmarks.push('台北市南京東路3段65號2樓');

    // 組合地標（命中任 2 項即鎖定為日立保卡）
    const hasHitachiWord =
      /(?:^|[^A-Z0-9])HITACHI(?:[^A-Z0-9]|$)/.test(rawUpper) ||
      compactUpper.includes('HITACHI');

    const hasTitleWord =
      rawUpper.includes('家電製品保證書') ||
      compactUpper.includes('家電製品保證書');

    const hasConfirmStampWord =
      rawUpper.includes('經銷商確認章') ||
      compactUpper.includes('經銷商確認章');

    const hasSkuWord =
      /SKU\s*NO\.?/i.test(rawUpper) ||
      compactUpper.includes('SKUNO');

    const comboLandmarks = [];
    if (hasHitachiWord) comboLandmarks.push('HITACHI');
    if (hasTitleWord) comboLandmarks.push('家電製品保證書');
    if (hasConfirmStampWord) comboLandmarks.push('經銷商確認章');
    if (hasSkuWord) comboLandmarks.push('SKU NO.');

    const matchedLandmarks = [...uniqueLandmarks, ...comboLandmarks];
    const isHitachi = uniqueLandmarks.length >= 1 || comboLandmarks.length >= 2;
    return {
      isHitachi,
      hitCount: matchedLandmarks.length,
      matchedLandmarks,
      uniqueHits: uniqueLandmarks,
      comboHits: comboLandmarks
    };
  }

  function detectHitachiCardQuad(srcImg) {
    const sw = srcImg && srcImg.width ? srcImg.width : 0;
    const sh = srcImg && srcImg.height ? srcImg.height : 0;
    const fallbackCorners = [
      { x: Math.round(sw * 0.02), y: Math.round(sh * 0.02) },
      { x: Math.round(sw * 0.98), y: Math.round(sh * 0.02) },
      { x: Math.round(sw * 0.98), y: Math.round(sh * 0.98) },
      { x: Math.round(sw * 0.02), y: Math.round(sh * 0.98) }
    ];
    if (!sw || !sh || sw < 60 || sh < 60) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.52 };
    }

    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(sw, sh));
    const w = Math.max(60, Math.round(sw * scale));
    const h = Math.max(60, Math.round(sh * scale));

    const workCanvas = document.createElement('canvas');
    workCanvas.width = w;
    workCanvas.height = h;
    const wCtx = workCanvas.getContext('2d', { willReadFrequently: true });
    wCtx.drawImage(srcImg, 0, 0, w, h);
    const data = wCtx.getImageData(0, 0, w, h).data;

    const total = w * h;
    const lum = new Float32Array(total);
    const sat = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const r = data[p], g = data[p + 1], b = data[p + 2];
      lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      sat[i] = Math.max(r, g, b) - Math.min(r, g, b);
    }

    const pickQuantile = (arr, q) => {
      if (!arr || arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * q)));
      return sorted[idx];
    };

    const centerLums = [];
    const centerSats = [];
    for (let y = Math.floor(h * 0.25); y < Math.floor(h * 0.75); y += 2) {
      for (let x = Math.floor(w * 0.25); x < Math.floor(w * 0.75); x += 2) {
        const idx = y * w + x;
        centerLums.push(lum[idx]);
        centerSats.push(sat[idx]);
      }
    }
    const paperLumRef = pickQuantile(centerLums, 0.78);
    const paperSatRef = pickQuantile(centerSats, 0.40);

    const winOut = Math.max(6, Math.round(Math.min(w, h) * 0.024));
    const winIn = Math.max(8, Math.round(Math.min(w, h) * 0.034));

    const scanBorderCandidates = side => {
      const pts = [];
      if (side === 'left' || side === 'right') {
        const yStart = Math.round(h * 0.14);
        const yEnd = Math.round(h * 0.86);
        for (let y = yStart; y <= yEnd; y += 2) {
          const rowOff = y * w;
          let bestPos = -1;
          let bestScore = -Infinity;
          if (side === 'left') {
            const xMax = Math.round(w * 0.48);
            for (let x = winOut + 2; x <= xMax; x++) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = x - winOut; k <= x - 2; k++) {
                outSum += lum[rowOff + k];
                outSatSum += sat[rowOff + k];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = x + 2; k <= Math.min(w - 1, x + winIn); k++) {
                inLums.push(lum[rowOff + k]);
                inSats.push(sat[rowOff + k]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(paperLumRef - 65, outL + 10) && (jump >= 11 || (jump >= 6 && satDrop >= 6))) {
                const localStep = Math.max(0, lum[rowOff + Math.min(w - 1, x + 2)] - lum[rowOff + Math.max(0, x - 2)]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) {
                  bestScore = score;
                  bestPos = x;
                }
              }
            }
          } else {
            const xMin = Math.round(w * 0.52);
            for (let x = w - winOut - 3; x >= xMin; x--) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = x + 2; k <= x + winOut; k++) {
                outSum += lum[rowOff + k];
                outSatSum += sat[rowOff + k];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = Math.max(0, x - winIn); k <= x - 2; k++) {
                inLums.push(lum[rowOff + k]);
                inSats.push(sat[rowOff + k]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(105, paperLumRef - 95, outL + 9) && (jump >= 9 || (jump >= 5 && satDrop >= 5))) {
                const localStep = Math.max(0, lum[rowOff + Math.max(0, x - 2)] - lum[rowOff + Math.min(w - 1, x + 2)]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) {
                  bestScore = score;
                  bestPos = x;
                }
              }
            }
          }
          if (bestPos >= 0) pts.push({ x: bestPos, y });
        }
      } else {
        const xStart = Math.round(w * 0.16);
        const xEnd = Math.round(w * 0.84);
        for (let x = xStart; x <= xEnd; x += 2) {
          let bestPos = -1;
          let bestScore = -Infinity;
          if (side === 'top') {
            const yMax = Math.round(h * 0.45);
            for (let y = winOut + 2; y <= yMax; y++) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = y - winOut; k <= y - 2; k++) {
                const idx = k * w + x;
                outSum += lum[idx];
                outSatSum += sat[idx];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = y + 2; k <= Math.min(h - 1, y + winIn); k++) {
                const idx = k * w + x;
                inLums.push(lum[idx]);
                inSats.push(sat[idx]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(paperLumRef - 65, outL + 10) && (jump >= 10 || (jump >= 6 && satDrop >= 6))) {
                const localStep = Math.max(0, lum[Math.min(h - 1, y + 2) * w + x] - lum[Math.max(0, y - 2) * w + x]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) {
                  bestScore = score;
                  bestPos = y;
                }
              }
            }
          } else {
            const yMin = Math.round(h * 0.55);
            for (let y = h - winOut - 3; y >= yMin; y--) {
              let outSum = 0, outSatSum = 0, outCnt = 0;
              for (let k = y + 2; k <= y + winOut; k++) {
                const idx = k * w + x;
                outSum += lum[idx];
                outSatSum += sat[idx];
                outCnt++;
              }
              const inLums = [], inSats = [];
              for (let k = Math.max(0, y - winIn); k <= y - 2; k++) {
                const idx = k * w + x;
                inLums.push(lum[idx]);
                inSats.push(sat[idx]);
              }
              const outL = outSum / Math.max(1, outCnt);
              const outS = outSatSum / Math.max(1, outCnt);
              const inL80 = pickQuantile(inLums, 0.80);
              const inS25 = pickQuantile(inSats, 0.25);
              const jump = inL80 - outL;
              const satDrop = outS - inS25;
              if (inL80 >= Math.max(105, paperLumRef - 95, outL + 9) && (jump >= 9 || (jump >= 5 && satDrop >= 5))) {
                const localStep = Math.max(0, lum[Math.max(0, y - 2) * w + x] - lum[Math.min(h - 1, y + 2) * w + x]);
                const score = jump + Math.max(0, satDrop) * 0.7 + localStep * 0.6;
                if (score > bestScore) {
                  bestScore = score;
                  bestPos = y;
                }
              }
            }
          }
          if (bestPos >= 0) pts.push({ x, y: bestPos });
        }
      }
      return pts;
    };

    const fitLineRansac = (pts, isVertical, minNeeded) => {
      if (!pts || pts.length < minNeeded) return null;
      let bestInliers = [];
      let bestSlope = 0;
      let bestIntercept = 0;
      const step = Math.max(1, Math.floor(pts.length / 24));
      for (let i = 0; i < pts.length; i += step) {
        for (let j = i + Math.max(2, step); j < pts.length; j += step) {
          const p1 = pts[i], p2 = pts[j];
          const dv = isVertical ? (p2.y - p1.y) : (p2.x - p1.x);
          if (Math.abs(dv) < 12) continue;
          const slope = isVertical ? (p2.x - p1.x) / dv : (p2.y - p1.y) / dv;
          if (Math.abs(slope) > 0.25) continue;
          const intercept = isVertical ? (p1.x - slope * p1.y) : (p1.y - slope * p1.x);
          const inliers = [];
          for (let k = 0; k < pts.length; k++) {
            const pk = pts[k];
            const pred = isVertical ? (slope * pk.y + intercept) : (slope * pk.x + intercept);
            const actual = isVertical ? pk.x : pk.y;
            if (Math.abs(actual - pred) <= 3.5) inliers.push(pk);
          }
          if (inliers.length > bestInliers.length) {
            bestInliers = inliers;
            bestSlope = slope;
            bestIntercept = intercept;
          }
        }
      }
      if (bestInliers.length < minNeeded) return null;
      let sumU = 0, sumV = 0, sumUU = 0, sumUV = 0;
      bestInliers.forEach(p => {
        const u = isVertical ? p.y : p.x;
        const v = isVertical ? p.x : p.y;
        sumU += u; sumV += v; sumUU += u * u; sumUV += u * v;
      });
      const n = bestInliers.length;
      const denom = n * sumUU - sumU * sumU;
      if (Math.abs(denom) > 1e-4) {
        const refinedSlope = (n * sumUV - sumU * sumV) / denom;
        if (Math.abs(refinedSlope) <= 0.25) {
          bestSlope = refinedSlope;
          bestIntercept = (sumV - refinedSlope * sumU) / n;
        }
      }
      return { slope: bestSlope, intercept: bestIntercept, count: bestInliers.length, isVertical };
    };

    const leftPts = scanBorderCandidates('left');
    const rightPts = scanBorderCandidates('right');
    const topPts = scanBorderCandidates('top');
    const bottomPts = scanBorderCandidates('bottom');

    const minVNeeded = Math.max(8, Math.round(h * 0.08));
    const minHNeeded = Math.max(8, Math.round(w * 0.08));
    let lineL = fitLineRansac(leftPts, true, minVNeeded);
    let lineR = fitLineRansac(rightPts, true, minVNeeded);
    let lineT = fitLineRansac(topPts, false, minHNeeded);
    let lineB = fitLineRansac(bottomPts, false, minHNeeded);

    const checkRimIsPaper = side => {
      const rLums = [], rSats = [];
      if (side === 'left' || side === 'right') {
        const rx = side === 'left' ? 3 : w - 4;
        for (let y = Math.round(h * 0.22); y <= Math.round(h * 0.78); y += 3) {
          rLums.push(lum[y * w + rx]);
          rSats.push(sat[y * w + rx]);
        }
      } else {
        const ry = side === 'top' ? 3 : h - 4;
        for (let x = Math.round(w * 0.25); x <= Math.round(w * 0.75); x += 3) {
          rLums.push(lum[ry * w + x]);
          rSats.push(sat[ry * w + x]);
        }
      }
      return pickQuantile(rLums, 0.78) >= paperLumRef - 36 && pickQuantile(rSats, 0.35) <= paperSatRef + 18;
    };

    if (!lineL && checkRimIsPaper('left')) lineL = { slope: 0, intercept: 2, isVertical: true, isRim: true };
    if (!lineR && checkRimIsPaper('right')) lineR = { slope: 0, intercept: w - 3, isVertical: true, isRim: true };
    if (!lineT && checkRimIsPaper('top')) lineT = { slope: 0, intercept: 2, isVertical: false, isRim: true };
    if (!lineB && checkRimIsPaper('bottom')) lineB = { slope: 0, intercept: h - 3, isVertical: false, isRim: true };

    if (!lineL || !lineR || !lineT || !lineB) {
      const borderSamples = [];
      const mx = Math.max(2, Math.floor(w * 0.03));
      const my = Math.max(2, Math.floor(h * 0.03));
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          if (x < mx || x >= w - mx || y < my || y >= h - my) {
            borderSamples.push(lum[y * w + x]);
          }
        }
      }
      const deskLum = pickQuantile(borderSamples, 0.35);
      const lumDiff = paperLumRef - deskLum;
      if (lumDiff >= 10) {
        const thresh = deskLum + lumDiff * 0.45;
        const paperPtsX = [], paperPtsY = [];
        for (let y = 4; y < h - 4; y += 2) {
          for (let x = 4; x < w - 4; x += 2) {
            if (lum[y * w + x] >= thresh && sat[y * w + x] <= paperSatRef + 22) {
              paperPtsX.push(x);
              paperPtsY.push(y);
            }
          }
        }
        if (paperPtsX.length >= 80) {
          if (!lineL) lineL = { slope: 0, intercept: pickQuantile(paperPtsX, 0.02), isVertical: true };
          if (!lineR) lineR = { slope: 0, intercept: pickQuantile(paperPtsX, 0.98), isVertical: true };
          if (!lineT) lineT = { slope: 0, intercept: pickQuantile(paperPtsY, 0.02), isVertical: false };
          if (!lineB) lineB = { slope: 0, intercept: pickQuantile(paperPtsY, 0.98), isVertical: false };
        }
      }
    }

    if (!lineL || !lineR || !lineT || !lineB) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.52 };
    }

    const intersectVH = (vLine, hLine) => {
      const denom = 1 - vLine.slope * hLine.slope;
      if (Math.abs(denom) < 1e-3) return null;
      const y = (hLine.slope * vLine.intercept + hLine.intercept) / denom;
      const x = vLine.slope * y + vLine.intercept;
      return { x, y };
    };

    const tlW = intersectVH(lineL, lineT);
    const trW = intersectVH(lineR, lineT);
    const brW = intersectVH(lineR, lineB);
    const blW = intersectVH(lineL, lineB);
    if (!tlW || !trW || !brW || !blW) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.52 };
    }

    const avgSpanW = (Math.hypot(trW.x - tlW.x, trW.y - tlW.y) + Math.hypot(brW.x - blW.x, brW.y - blW.y)) * 0.5;
    const avgSpanH = (Math.hypot(blW.x - tlW.x, blW.y - tlW.y) + Math.hypot(brW.x - trW.x, brW.y - trW.y)) * 0.5;
    const estAspect = avgSpanW / Math.max(1, avgSpanH);
    if (avgSpanW < w * 0.30 || avgSpanH < h * 0.30 || estAspect < 1.05 || estAspect > 1.95) {
      return { corners: fallbackCorners, detected: false, confidence: 'low', estimatedAspect: 1.52 };
    }

    // 保留雙線黑框外側約 3mm~5mm（~0.8%）均勻呼吸白邊，完整保留左上「家電製品保證書」、右上「HITACHI」與右下資訊
    const invScale = 1 / scale;
    const rawCorners = [tlW, trW, brW, blW].map(p => ({
      x: p.x * invScale,
      y: p.y * invScale
    }));
    const cx = (rawCorners[0].x + rawCorners[1].x + rawCorners[2].x + rawCorners[3].x) * 0.25;
    const cy = (rawCorners[0].y + rawCorners[1].y + rawCorners[2].y + rawCorners[3].y) * 0.25;
    const padRatio = 0.008;

    const expandedCorners = rawCorners.map(p => ({
      x: Math.max(0, Math.min(sw, Math.round(p.x + (p.x - cx) * padRatio))),
      y: Math.max(0, Math.min(sh, Math.round(p.y + (p.y - cy) * padRatio)))
    }));

    return {
      corners: expandedCorners,
      detected: true,
      confidence: 'high',
      estimatedAspect: Number(Math.max(1.20, Math.min(1.85, estAspect)).toFixed(3))
    };
  }

  /**
   * 台灣日立家電製品保證書專屬印章對位 (v60)
   * 1. 左邊界：緊貼右側「經銷商確認章」直排文字右緣（不遮蓋文字）
   * 2. 右邊界：緊貼右側表格內框線（不超出雙線黑框）
   * 3. 垂直對位：位於右上 HITACHI 正下方，中央日期方框對應左側「商品」列，底緣外弧貼齊「購買日期」列下方水平分隔線
   */
  function detectHitachiDealerStampSpec(cleanCardCanvas, hitachiOcrAnchors = null) {
    const fallbackSpec = { ...HITACHI_TW_STAMP_SPEC };
    if (!cleanCardCanvas || !cleanCardCanvas.width || !cleanCardCanvas.height) {
      return fallbackSpec;
    }

    const cw = cleanCardCanvas.width;
    const ch = cleanCardCanvas.height;
    const rx = Math.round(cw * 0.680);
    const ry = Math.round(ch * 0.140);
    const rw = Math.max(60, Math.round(cw * 0.310));
    const rh = Math.max(60, Math.round(ch * 0.560));

    const tmp = document.createElement('canvas');
    tmp.width = rw;
    tmp.height = rh;
    const tCtx = tmp.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(cleanCardCanvas, rx, ry, rw, rh, 0, 0, rw, rh);
    const data = tCtx.getImageData(0, 0, rw, rh).data;

    const lums = [];
    for (let i = 0; i < rw * rh; i += 3) {
      const p = i * 4;
      lums.push(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
    }
    lums.sort((a, b) => a - b);
    const bgLum = lums[Math.floor(lums.length * 0.78)] || 222;
    const darkThresh = Math.max(58, bgLum - 26);

    const pickPeakInRange = (arr, startIdx, endIdx, minReq) => {
      let bestIdx = -1;
      let bestVal = 0;
      const s = Math.max(0, startIdx);
      const e = Math.min(arr.length - 1, endIdx);
      for (let i = s; i <= e; i++) {
        const val = arr[i] + (i > 0 ? arr[i - 1] * 0.5 : 0) + (i + 1 < arr.length ? arr[i + 1] * 0.5 : 0);
        if (arr[i] >= minReq && val > bestVal) {
          bestVal = val;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    // 1. 投影右側垂直線：偵測「經銷商確認章」左側分隔線與最右側雙線外框內線
    const colDark = new Int32Array(rw);
    const yProj0 = Math.round(ch * 0.310) - ry;
    const yProj1 = Math.min(rh - 1, Math.round(ch * 0.620) - ry);
    const vSpan = Math.max(10, yProj1 - Math.max(0, yProj0) + 1);
    for (let y = Math.max(0, yProj0); y <= yProj1; y++) {
      for (let x = 0; x < rw; x++) {
        const p = (y * rw + x) * 4;
        const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        if (l < darkThresh) colDark[x]++;
      }
    }

    const innerRightLineRel = pickPeakInRange(
      colDark,
      Math.max(0, Math.round(cw * 0.945) - rx),
      Math.min(rw - 1, Math.round(cw * 0.988) - rx),
      Math.round(vSpan * 0.45)
    );
    const innerRightNorm = innerRightLineRel >= 0 ? (rx + innerRightLineRel) / cw : 0.968;

    const confirmLeftDivRel = pickPeakInRange(
      colDark,
      Math.max(0, Math.round(cw * 0.700) - rx),
      Math.min(rw - 1, Math.round(cw * 0.755) - rx),
      Math.round(vSpan * 0.42)
    );
    const confirmLeftDivNorm = confirmLeftDivRel >= 0 ? (rx + confirmLeftDivRel) / cw : null;

    // 2. 投影水平線：偵測右側印章欄上分隔線（HITACHI 下方）與下分隔線（購買日期列底部水平線）
    const rowDark = new Int32Array(rh);
    const hProjX0 = Math.max(0, Math.round(cw * 0.760) - rx);
    const hProjX1 = Math.min(rw - 1, Math.round(cw * 0.955) - rx);
    const hSpan = Math.max(10, hProjX1 - hProjX0 + 1);
    for (let y = 0; y < rh; y++) {
      let cnt = 0;
      for (let x = hProjX0; x <= hProjX1; x++) {
        const p = (y * rw + x) * 4;
        const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        if (l < darkThresh) cnt++;
      }
      rowDark[y] = cnt;
    }

    const topDividerRel = pickPeakInRange(
      rowDark,
      Math.max(0, Math.round(ch * 0.265) - ry),
      Math.min(rh - 1, Math.round(ch * 0.345) - ry),
      Math.round(hSpan * 0.40)
    );
    const purchaseBottomRel = pickPeakInRange(
      rowDark,
      Math.max(0, Math.round(ch * 0.545) - ry),
      Math.min(rh - 1, Math.round(ch * 0.655) - ry),
      Math.round(hSpan * 0.42)
    );

    const anchors = hitachiOcrAnchors || {};

    // 左外弧線緊貼「經銷商確認章」直排文字右側
    let leftBoundNorm = 0.752;
    if (typeof anchors.confirmTextRightX === 'number' && anchors.confirmTextRightX >= 0.715 && anchors.confirmTextRightX <= 0.785) {
      leftBoundNorm = anchors.confirmTextRightX + 0.004;
    } else if (confirmLeftDivNorm !== null) {
      leftBoundNorm = Math.max(0.742, Math.min(0.775, confirmLeftDivNorm + 0.028));
    }

    // 右外弧線緊貼右側表格內框線（不超出雙線外框）
    const rightBoundNorm = Math.max(0.945, Math.min(0.985, innerRightNorm - 0.003));

    const baseWidthRatio = Math.max(0.195, Math.min(0.236, rightBoundNorm - leftBoundNorm));
    let stampCenterX = (leftBoundNorm + rightBoundNorm) * 0.5;
    stampCenterX = Math.max(0.838, Math.min(0.880, stampCenterX));

    // v61: 保持 centerX / centerY 中心座標計算完全不變，僅將 widthRatio 原地放大 1.1 倍（夾限 [0.225, 0.250]）
    const estStampHNorm = (baseWidthRatio * cw / 1.2806) / ch;
    let bottomLineNorm = 0.608;
    if (typeof anchors.purchaseRowBottomY === 'number' && anchors.purchaseRowBottomY >= 0.550 && anchors.purchaseRowBottomY <= 0.660) {
      bottomLineNorm = anchors.purchaseRowBottomY;
    } else if (purchaseBottomRel >= 0) {
      bottomLineNorm = (ry + purchaseBottomRel) / ch;
    }

    let stampCenterY = bottomLineNorm - estStampHNorm * 0.5;
    if (topDividerRel >= 0) {
      const topDivNorm = (ry + topDividerRel) / ch;
      stampCenterY = Math.max(stampCenterY, topDivNorm + estStampHNorm * 0.48);
    }
    if (typeof anchors.hitachiBottomY === 'number' && anchors.hitachiBottomY >= 0.16 && anchors.hitachiBottomY <= 0.34) {
      stampCenterY = Math.max(stampCenterY, anchors.hitachiBottomY + estStampHNorm * 0.50);
    }

    const enlargedWidthRatio = Math.max(0.225, Math.min(0.250, baseWidthRatio * 1.10));

    return {
      centerX: Number(stampCenterX.toFixed(4)),
      centerY: Number(Math.max(0.425, Math.min(0.485, stampCenterY)).toFixed(4)),
      widthRatio: Number(enlargedWidthRatio.toFixed(4)),
      tiltRangeDeg: 1.5,
      blendMode: 'multiply'
    };
  }

  function filterHitachiModelResult(rawText) {
    if (!rawText) return '';
    try {
      const cleanedRaw = String(rawText)
        .replace(/24721268/g, ' ')
        .replace(/0800[-\s]?\d{3}[-\s]?\d{3}/g, ' ')
        .replace(/\(02\)\s*\d{4}[-\s]?\d{4}/g, ' ')
        .replace(/2516[-\s]?0500/g, ' ')
        .replace(/SKU\s*NO\.?/gi, ' ')
        .replace(/HITACHI/gi, ' ');

      const mapNumChar = ch => ({
        O: '0', D: '0', Q: '0',
        I: '1', L: '1', i: '1', l: '1',
        Z: '2', z: '2',
        S: '5', s: '5',
        G: '6', b: '6',
        B: '8'
      }[ch] || String(ch).toUpperCase());

      const normalizeHitachiModelToken = rawTok => {
        let tok = String(rawTok || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '');
        if (!tok || /^24721268$/.test(tok)) return '';

        // 校準日立常見前綴與漏連字號（BD-/RS-/RAS-/RAC-/RD-/CV-/BW-/MRO-/HT-/SF-/RG-/RZ-/PV-/RV-）
        tok = tok.replace(/^(BD|RS|RAS|RAC|RD|CV|BW|MRO|HT|SF|RG|RZ|PV|RV|RB|RM|HS)([A-Z0-9]{2,})$/, '$1-$2');
        tok = tok.replace(/^(?:8D|6D)-?([A-Z]{1,3}\d{2,4}[A-Z0-9]*)$/, 'BD-$1');
        tok = tok.replace(/^(?:R5|8S)-?([A-Z]{0,2}\d{2,4}[A-Z0-9]*)$/, 'RS-$1');
        tok = tok.replace(/^(?:RA5|8AS)-?(\d{2,3}[A-Z0-9]*)$/, 'RAS-$1');
        tok = tok.replace(/^(?:R0)-?(\d{2,3}[A-Z0-9]*)$/, 'RD-$1');

        // 校準容量數字夾心錯字（如 BD-SX15OJJ -> BD-SX150JJ），保留尾碼字母
        const hitMatch = tok.match(/^([A-Z]{2,4}-[A-Z]{0,3})([0-9OIQDGLZSB]{2,4})([A-Z0-9-]*)$/);
        if (hitMatch) {
          const fixedNum = hitMatch[2].split('').map(mapNumChar).join('');
          if (/^\d{2,4}$/.test(fixedNum)) {
            tok = `${hitMatch[1]}${fixedNum}${hitMatch[3]}`;
          }
        }
        tok = tok.replace(/(\d)([OIQDGLZB])(\d)/g, (_, a, b, c) => `${a}${mapNumChar(b)}${c}`);
        return tok;
      };

      const scoreTok = tok => {
        if (!tok) return -1;
        let sc = tok.length;
        if (/^(?:BD|RS|RAS|RAC|RD|CV|BW|MRO|HT|SF|RG|RZ|PV|RV|RB|RM|HS)-/.test(tok)) sc += 50;
        if (/^[A-Z]{2,4}-[A-Z]{0,3}\d{2,4}[A-Z0-9-]*$/.test(tok)) sc += 25;
        return sc;
      };

      const candidates = [];
      // 修復連字號後末碼單字元偶發空白拆字（如 "BD-SX150J J" -> "BD-SX150JJ"，嚴格排除後方接續數字的機號）
      const deSpacedRaw = cleanedRaw.replace(/\b((?:BD|RS|RAS|RAC|RD|CV|BW|MRO|HT|SF|RG|RZ|PV|RV|RB|RM|HS)-[A-Z0-9]{3,9})\s+([A-Z])(?![A-Z0-9])/gi, '$1$2');
      const multiHyphen = deSpacedRaw.match(/\b([A-Za-z0-9]{2,4}(?:\s*-\s*)?[A-Za-z0-9]{2,12}(?:\s*-\s*[A-Za-z0-9]{1,4})?)\b/g);
      if (multiHyphen) {
        for (let i = 0; i < multiHyphen.length; i++) {
          const compact = multiHyphen[i].replace(/\s+/g, '');
          const tok = normalizeHitachiModelToken(compact);
          if (tok.length >= 5 && /[A-Z]{2}/.test(tok) && /\d{2}/.test(tok)) {
            candidates.push(tok);
          }
        }
      }

      const tokens = deSpacedRaw.split(/[\s\r\n:：/|,，]+/).filter(Boolean);
      for (let i = 0; i < tokens.length; i++) {
        const tok = normalizeHitachiModelToken(tokens[i]);
        if (tok.length < 5 || tok.length > 22) continue;
        if (/^\d+$/.test(tok)) continue;
        if (/[A-Z]{2,}/.test(tok) && /\d{2,}/.test(tok)) {
          candidates.push(tok);
        }
      }

      if (candidates.length === 0) return '';
      candidates.sort((a, b) => scoreTok(b) - scoreTok(a));
      return candidates[0];
    } catch (err) {
      console.warn('filterHitachiModelResult 略過例外:', err);
      return '';
    }
  }

  function filterHitachiSerialResult(rawText) {
    if (!rawText) return '';
    try {
      const cleaned = String(rawText).toUpperCase()
        .replace(/24721268/g, ' ')
        .replace(/0800[-\s]?\d{3}[-\s]?\d{3}/g, ' ')
        .replace(/2516[-\s]?0500/g, ' ')
        .replace(/[A-Z]{2,4}-[A-Z0-9-]{3,}/g, ' ');

      const toDigit = ch => ({ O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', B: '8' }[ch] || ch);
      const rawTokens = cleaned.split(/[\s\r\n:：/|]+/).filter(Boolean);
      const tokenPool = [...rawTokens];
      // 若開頭英文字母與後方數字間被空白拆開（例如 "T 633868"），額外合併相鄰組
      for (let i = 0; i < rawTokens.length - 1; i++) {
        const t1 = rawTokens[i].replace(/[^A-Z0-9]/g, '');
        const t2 = rawTokens[i + 1].replace(/[^A-Z0-9]/g, '');
        if (/^[A-Z]{1,2}$/.test(t1) && /^[0-9OQDILZSBG]{5,7}$/.test(t2)) {
          tokenPool.push(t1 + t2);
        }
      }
      const candidates = [];

      for (let i = 0; i < tokenPool.length; i++) {
        const rawTok = tokenPool[i].replace(/[^A-Z0-9]/g, '');
        if (rawTok.length < 5 || rawTok.length > 14) continue;
        if (rawTok === '24721268' || rawTok === '25160500' || rawTok === 'HITACHI') continue;

        // 1. 最高權重：1~2 碼大寫英文 + 5~7 碼數字（如 T633868）
        const alphaNumMatch = rawTok.match(/^([A-Z]{1,2})([0-9OQDILZSBG]{5,7})$/);
        if (alphaNumMatch) {
          const fixedDigits = alphaNumMatch[2].split('').map(toDigit).join('');
          if (/^\d{5,7}$/.test(fixedDigits)) {
            candidates.push({ val: `${alphaNumMatch[1]}${fixedDigits}`, score: 140 + fixedDigits.length });
            continue;
          }
        }

        // 2. 次高權重：純 6~7 碼數字（開頭細字英文字母遺失時仍保留輸出，絕不丟棄為空）
        const pureDigits = rawTok.split('').map(toDigit).join('');
        if (/^\d{6,7}$/.test(pureDigits) && pureDigits !== '24721268' && pureDigits !== '25160500') {
          candidates.push({ val: pureDigits, score: 90 + pureDigits.length });
          continue;
        }

        // 3. 一般 6~12 碼英數字混排備援
        if (/^[A-Z0-9]{6,12}$/.test(rawTok) && /\d{4,}/.test(rawTok)) {
          candidates.push({ val: rawTok, score: 60 + rawTok.length });
        }
      }

      if (candidates.length === 0) return '';
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].val;
    } catch (err) {
      console.warn('filterHitachiSerialResult 略過例外:', err);
      return '';
    }
  }

  function parseHitachiFormBlock(rawText) {
    if (!rawText) return { model: '', serialNo: '' };
    const flat = String(rawText).replace(/\r/g, '\n');
    let model = '';
    let serialNo = '';

    const productAnchor = flat.match(/(?:商品|型號|機型|MODEL)\s*[:：.]*\s*([\s\S]{1,90}?)(?=機號|購買日期|經銷商|$)/i);
    if (productAnchor) {
      model = filterHitachiModelResult(productAnchor[1]);
    }
    if (!model) {
      model = filterHitachiModelResult(flat);
    }

    const serialAnchor = flat.match(/(?:機號|機\s*號|製造號碼|SERIAL|S\/?N)\s*[:：.]*\s*([\s\S]{1,60}?)(?=購買日期|SKU|經銷商|阿奇立克|$)/i);
    if (serialAnchor) {
      serialNo = filterHitachiSerialResult(serialAnchor[1]);
    }
    if (!serialNo) {
      serialNo = filterHitachiSerialResult(flat);
    }
    return { model, serialNo };
  }

  global.CardTemplates = {
    BRAND_REGISTRY: CARD_BRAND_REGISTRY,
    PANASONIC_WARRANTY_CONFIG,
    LG_TW_WARRANTY_CONFIG,
    MITSUBISHI_TW_WARRANTY_CONFIG,
    HITACHI_TW_WARRANTY_CONFIG,
    RECEIPT_LANDMARK_CROP_CONFIG,
    TEMPLATES: CARD_TEMPLATES,
    INVOICE_TEMPLATES,
    detectPanasonicCardQuad,
    detectPanasonicSlipType,
    detectLgWarrantyByText,
    detectLgCardQuad,
    detectLgDealerBoxStampSpec,
    detectMitsubishiWarrantyByText,
    detectMitsubishiCardQuad,
    detectMitsubishiDealerStampSpec,
    detectHitachiWarrantyByText,
    detectHitachiCardQuad,
    detectHitachiDealerStampSpec,
    createEnhancedOcrCropCanvas,
    createAdaptiveBinarizedOcrCropCanvas,
    decodeCode128FromCanvas,
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
    filterWarrantySerialResult,
    filterLgModelResult,
    filterLgSerialResult,
    parseLgTopFormRow,
    filterMitsubishiModelResult,
    filterMitsubishiSerialResult,
    parseMitsubishiTopFormRow,
    filterHitachiModelResult,
    filterHitachiSerialResult,
    parseHitachiFormBlock,
    parsePanasonicLeftInfoBlock,
    crossVerifyModelWithOrderSheet
  };
})(window);
