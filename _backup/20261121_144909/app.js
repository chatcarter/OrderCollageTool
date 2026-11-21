/**
 * 訂單、保卡與發票拼貼工作台 - 100% 純前端超高解析升級版
 * 畫布規格: 2400 x 1700 px (橫向 A4 超高解析比例)
 * 專櫃色碼: #003FBC
 * 核心升級:
 * 1. 保卡/發票進場自動偵測白紙輪廓去背景裁邊 + 手動四角微調與還原
 * 2. 櫃位印章日期字體放大 1.4x、上下 Y 軸微調、即時預覽與 localStorage 永久記憶
 * 3. 訂購單 PDF 4.5x 超高解析渲染與 +12px 精準切線（切齊總金額下方）
 * 4. 三欄式黃金版面自動定位與適配比例
 */

// --- 畫布與全域常數 ---
const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1700;

const DEFAULT_STAMP_FONT_SIZE = 175; // 放大約 1.4 倍
const DEFAULT_STAMP_OFFSET_Y = 0;
const STORAGE_KEY_FONT_SIZE = 'order_collage_stamp_font_size';
const STORAGE_KEY_OFFSET_Y = 'order_collage_stamp_offset_y';

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const canvasWrapper = document.getElementById('canvasWrapper');
const canvasViewport = document.getElementById('canvasViewport');
const dropOverlay = document.getElementById('dropOverlay');

// 圖層陣列 (index 0 為最底層)
let layers = [];
let activeLayer = null;

// 互動與縮放狀態
let currentZoom = 1.0;
let isDragging = false;
let isResizing = false;
let isRotating = false;
let resizeHandle = null; // 'tl', 'tr', 'br', 'bl'
let isDraggingCorner = -1; // 0: TL, 1: TR, 2: BR, 3: BL
let dragStartX = 0;
let dragStartY = 0;
let objInitialState = null;

// UI 元素快取
const fileInput = document.getElementById('fileInput');
const btnSelectFiles = document.getElementById('btnSelectFiles');
const btnClearCanvas = document.getElementById('btnClearCanvas');
const layersList = document.getElementById('layersList');
const layerCountBadge = document.getElementById('layerCountBadge');
const emptyLayersHint = document.getElementById('emptyLayersHint');

// 縮放控制
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnZoomFit = document.getElementById('btnZoomFit');
const btnZoom100 = document.getElementById('btnZoom100');
const zoomPercent = document.getElementById('zoomPercent');

// 選取物件動態控制
const noSelectionHint = document.getElementById('noSelectionHint');
const selectionControls = document.getElementById('selectionControls');
const activeTypeName = document.getElementById('activeTypeName');

// PDF 專用控制
const pdfControls = document.getElementById('pdfControls');
const sliderPdfCrop = document.getElementById('sliderPdfCrop');
const pdfCropVal = document.getElementById('pdfCropVal');
const btnResetPdfCrop = document.getElementById('btnResetPdfCrop');

// 透視校正專用控制
const imagePerspectiveControls = document.getElementById('imagePerspectiveControls');
const btnToggleCornerMode = document.getElementById('btnToggleCornerMode');
const btnApplyWarp = document.getElementById('btnApplyWarp');
const btnRevertWarp = document.getElementById('btnRevertWarp');
const cornerCalibrationNotice = document.getElementById('cornerCalibrationNotice');

// 掃描美化專用控制
const imageEnhanceControls = document.getElementById('imageEnhanceControls');
const switchScanEnhance = document.getElementById('switchScanEnhance');
const enhanceSliders = document.getElementById('enhanceSliders');
const sliderShadow = document.getElementById('sliderShadow');
const valShadow = document.getElementById('valShadow');
const sliderBrightness = document.getElementById('sliderBrightness');
const valBrightness = document.getElementById('valBrightness');
const sliderContrast = document.getElementById('sliderContrast');
const valContrast = document.getElementById('valContrast');

// 文字專用控制
const textControls = document.getElementById('textControls');
const editTextContent = document.getElementById('editTextContent');
const btnTextBold = document.getElementById('btnTextBold');

// 快速變形控制
const btnRotateCCW = document.getElementById('btnRotateCCW');
const btnRotateCW = document.getElementById('btnRotateCW');
const btnFlipH = document.getElementById('btnFlipH');
const btnCenterObj = document.getElementById('btnCenterObj');
const btnDeleteActive = document.getElementById('btnDeleteActive');

// 印章控制項
const stampPreviewImg = document.getElementById('stampPreviewImg');
const inputStampDate = document.getElementById('inputStampDate');
const sliderStampFontSize = document.getElementById('sliderStampFontSize');
const valStampFontSize = document.getElementById('valStampFontSize');
const sliderStampOffsetY = document.getElementById('sliderStampOffsetY');
const valStampOffsetY = document.getElementById('valStampOffsetY');
const btnResetStampSettings = document.getElementById('btnResetStampSettings');
const btnAddStamp = document.getElementById('btnAddStamp');

// 備註文字控制項
const inputNewNote = document.getElementById('inputNewNote');
const btnNewNoteBold = document.getElementById('btnNewNoteBold');
const btnAddNote = document.getElementById('btnAddNote');
let newNoteColor = '#000000';
let newNoteIsBold = false;

// 匯出控制項
const inputExportName = document.getElementById('inputExportName');
const btnExportPng = document.getElementById('btnExportPng');

// --- 初始化執行 ---
window.addEventListener('DOMContentLoaded', () => {
  initMinguoDate();
  loadSavedStampSettings();
  updateStampPreview();
  fitCanvasToViewport();
  render();
  setupEventListeners();
  initPdfJsWorker();
});

// 初始化民國年格式
function initMinguoDate() {
  const now = new Date();
  const minguoYear = now.getFullYear() - 1911;
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  inputStampDate.value = `${minguoYear}.${m}.${d}`;
}

// 載入 localStorage 保存的印章設定
function loadSavedStampSettings() {
  try {
    const savedFontSize = localStorage.getItem(STORAGE_KEY_FONT_SIZE);
    if (savedFontSize !== null) {
      sliderStampFontSize.value = savedFontSize;
      valStampFontSize.textContent = `${savedFontSize}px`;
    } else {
      sliderStampFontSize.value = DEFAULT_STAMP_FONT_SIZE;
      valStampFontSize.textContent = `${DEFAULT_STAMP_FONT_SIZE}px`;
    }

    const savedOffsetY = localStorage.getItem(STORAGE_KEY_OFFSET_Y);
    if (savedOffsetY !== null) {
      sliderStampOffsetY.value = savedOffsetY;
      const sign = parseInt(savedOffsetY, 10) >= 0 ? '+' : '';
      valStampOffsetY.textContent = `${sign}${savedOffsetY}px`;
    } else {
      sliderStampOffsetY.value = DEFAULT_STAMP_OFFSET_Y;
      valStampOffsetY.textContent = `+${DEFAULT_STAMP_OFFSET_Y}px`;
    }
  } catch (e) {
    console.warn('無法存取 localStorage:', e);
  }
}

// 即時渲染並更新印章預覽圖
function updateStampPreview() {
  const dateStr = (inputStampDate.value || '').trim() || '115.11.21';
  const fontSize = parseInt(sliderStampFontSize.value, 10) || DEFAULT_STAMP_FONT_SIZE;
  const offsetY = parseInt(sliderStampOffsetY.value, 10) || 0;

  const stampImg = new Image();
  stampImg.onload = () => {
    const stampCanvas = document.createElement('canvas');
    stampCanvas.width = stampImg.width;
    stampCanvas.height = stampImg.height;
    const sCtx = stampCanvas.getContext('2d');
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';

    // 繪製基底透明印章
    sCtx.drawImage(stampImg, 0, 0);

    // 印章尺寸 1844 x 1440，中心座標 (942, 719)
    const boxCx = 942;
    const boxCy = 719 + offsetY;

    sCtx.fillStyle = '#003FBC';
    sCtx.font = `bold ${fontSize}px "DFKai-SB", "BiauKai", "標楷體", "MingLiU", "新細明體", serif`;
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(dateStr, boxCx, boxCy);

    stampPreviewImg.src = stampCanvas.toDataURL('image/png');
  };

  if (typeof STAMP_CLEAN_BASE64 !== 'undefined' && STAMP_CLEAN_BASE64) {
    stampImg.src = STAMP_CLEAN_BASE64;
  } else {
    stampImg.src = 'assets/stamp_clean.png';
  }
}

// 監聽印章控制項微調事件
sliderStampFontSize.addEventListener('input', () => {
  valStampFontSize.textContent = `${sliderStampFontSize.value}px`;
  try {
    localStorage.setItem(STORAGE_KEY_FONT_SIZE, sliderStampFontSize.value);
  } catch (e) {}
  updateStampPreview();
});

sliderStampOffsetY.addEventListener('input', () => {
  const y = parseInt(sliderStampOffsetY.value, 10);
  const sign = y >= 0 ? '+' : '';
  valStampOffsetY.textContent = `${sign}${y}px`;
  try {
    localStorage.setItem(STORAGE_KEY_OFFSET_Y, sliderStampOffsetY.value);
  } catch (e) {}
  updateStampPreview();
});

inputStampDate.addEventListener('input', updateStampPreview);

btnResetStampSettings.addEventListener('click', () => {
  sliderStampFontSize.value = DEFAULT_STAMP_FONT_SIZE;
  valStampFontSize.textContent = `${DEFAULT_STAMP_FONT_SIZE}px`;
  sliderStampOffsetY.value = DEFAULT_STAMP_OFFSET_Y;
  valStampOffsetY.textContent = `+${DEFAULT_STAMP_OFFSET_Y}px`;
  try {
    localStorage.removeItem(STORAGE_KEY_FONT_SIZE);
    localStorage.removeItem(STORAGE_KEY_OFFSET_Y);
  } catch (e) {}
  updateStampPreview();
  showToast('已重設印章字體大小與垂直位置');
});

// 初始化 PDF.js Worker
function initPdfJsWorker() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

// --- 縮放與視窗適應 ---
function setZoom(zoom) {
  currentZoom = Math.max(0.15, Math.min(2.0, zoom));
  canvasWrapper.style.transform = `scale(${currentZoom})`;
  canvasWrapper.style.transformOrigin = 'center center';
  zoomPercent.textContent = `${Math.round(currentZoom * 100)}%`;
}

function fitCanvasToViewport() {
  const vpWidth = canvasViewport.clientWidth - 80;
  const vpHeight = canvasViewport.clientHeight - 80;
  const scaleX = vpWidth / CANVAS_WIDTH;
  const scaleY = vpHeight / CANVAS_HEIGHT;
  const fitScale = Math.min(scaleX, scaleY, 1.0);
  setZoom(fitScale);
}

window.addEventListener('resize', fitCanvasToViewport);

// 座標轉換 (螢幕滑鼠座標 -> 2400x1700 畫布真實座標)
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
  return { x, y };
}

// --- 圖層物件結構工廠 ---
function createLayerObject(options) {
  return {
    id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    type: options.type || 'image', // 'pdf_order' | 'image' | 'stamp' | 'text'
    name: options.name || '未命名物件',
    x: options.x !== undefined ? options.x : CANVAS_WIDTH / 2,
    y: options.y !== undefined ? options.y : CANVAS_HEIGHT / 2,
    width: options.width || 600,
    height: options.height || 400,
    rotation: options.rotation || 0,
    flipH: false,
    image: options.image || null,
    rawImage: options.rawImage || options.image || null,
    warpedImage: options.warpedImage || null,
    // PDF 專屬快取
    fullCanvas: options.fullCanvas || null,
    cropRatio: options.cropRatio || 0.6,
    origPdfCropRatio: options.cropRatio || 0.6,
    // 透視校正專用 (相對於 rawImage 原始尺寸之 4 點座標)
    cornerMode: false,
    corners: options.corners || null,
    // 文件美化專用
    scanEnhance: false,
    shadowStrength: 70,
    brightness: 0,
    contrast: 120,
    // 文字圖層專用
    text: options.text || '',
    color: options.color || '#000000',
    bold: options.bold || false,
    fontSize: options.fontSize || 42
  };
}

// --- 畫布繪製核心 (Render Pipeline) ---
function render(isExporting = false) {
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. 純白底色 (2400 x 1700)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. 逐一繪製圖層
  layers.forEach(layer => {
    ctx.save();
    ctx.translate(layer.x, layer.y);
    ctx.rotate(layer.rotation);
    if (layer.flipH) {
      ctx.scale(-1, 1);
    }

    if (layer.type === 'text') {
      drawTextLayer(layer);
    } else if (layer.image && (layer.image.complete || layer.image instanceof HTMLCanvasElement)) {
      ctx.drawImage(
        layer.image,
        -layer.width / 2,
        -layer.height / 2,
        layer.width,
        layer.height
      );

      // 角點校正模式時，繪製四點標籤與連線
      if (!isExporting && layer === activeLayer && layer.cornerMode && layer.corners) {
        drawCornerCalibrationGuides(layer);
      }
    }

    ctx.restore();
  });

  // 3. 繪製選取框與控制柄 (匯出時自動隱藏)
  if (!isExporting && activeLayer && !activeLayer.cornerMode) {
    drawSelectionBox(activeLayer);
  }

  ctx.restore();
}

// 繪製文字圖層
function drawTextLayer(layer) {
  const fontWeight = layer.bold ? 'bold ' : '';
  ctx.font = `${fontWeight}${layer.fontSize}px -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif`;
  ctx.fillStyle = layer.color;
  ctx.textBaseline = 'top';

  const lines = layer.text.split('\n');
  const lineHeight = layer.fontSize * 1.35;

  let maxWidth = 0;
  lines.forEach(line => {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  });
  const totalHeight = lines.length * lineHeight;

  layer.width = Math.max(100, maxWidth + 30);
  layer.height = Math.max(50, totalHeight + 15);

  const startX = -layer.width / 2 + 15;
  const startY = -layer.height / 2 + 8;

  lines.forEach((line, idx) => {
    ctx.fillText(line, startX, startY + idx * lineHeight);
  });
}

// 繪製選取框與四角縮放柄 + 頂部旋轉柄
function drawSelectionBox(layer) {
  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate(layer.rotation);

  const hw = layer.width / 2;
  const hh = layer.height / 2;
  const handleSize = 12 / currentZoom;
  const rotStemLength = 32 / currentZoom;

  ctx.strokeStyle = '#003FBC';
  ctx.lineWidth = 2.0 / currentZoom;
  ctx.setLineDash([8 / currentZoom, 5 / currentZoom]);
  ctx.strokeRect(-hw, -hh, layer.width, layer.height);
  ctx.setLineDash([]);

  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh }
  ];

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#003FBC';
  ctx.lineWidth = 2.2 / currentZoom;

  corners.forEach(c => {
    ctx.beginPath();
    ctx.rect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  });

  // 頂部旋轉控制柄
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo(0, -hh - rotStemLength);
  ctx.strokeStyle = '#003FBC';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -hh - rotStemLength, handleSize * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = '#003FBC';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8 / currentZoom;
  ctx.stroke();

  ctx.restore();
}

// 繪製四點角點引導線與標籤
function drawCornerCalibrationGuides(layer) {
  const hw = layer.width / 2;
  const hh = layer.height / 2;
  const baseImg = layer.rawImage;

  const pts = layer.corners.map(pt => ({
    x: (pt.x / baseImg.width) * layer.width - hw,
    y: (pt.y / baseImg.height) * layer.height - hh
  }));

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.strokeStyle = '#D32F2F';
  ctx.lineWidth = 3 / currentZoom;
  ctx.setLineDash([10 / currentZoom, 5 / currentZoom]);
  ctx.stroke();
  ctx.setLineDash([]);

  const labels = ['左上', '右上', '右下', '左下'];
  const handleRadius = 18 / currentZoom;

  pts.forEach((pt, idx) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#D32F2F';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5 / currentZoom;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(13 / currentZoom)}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[idx], pt.x, pt.y);
  });
}

// --- 命中測試 (Hit-Testing) ---
function hitTest(x, y) {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const dx = x - layer.x;
    const dy = y - layer.y;
    const localX = dx * Math.cos(-layer.rotation) - dy * Math.sin(-layer.rotation);
    const localY = dx * Math.sin(-layer.rotation) + dy * Math.cos(-layer.rotation);

    const hw = layer.width / 2;
    const hh = layer.height / 2;

    if (layer === activeLayer) {
      if (layer.cornerMode && layer.corners) {
        const baseImg = layer.rawImage;
        const pts = layer.corners.map(pt => ({
          x: (pt.x / baseImg.width) * layer.width - hw,
          y: (pt.y / baseImg.height) * layer.height - hh
        }));
        const hitRadius = 26 / currentZoom;
        for (let cIdx = 0; cIdx < 4; cIdx++) {
          if (Math.hypot(localX - pts[cIdx].x, localY - pts[cIdx].y) <= hitRadius) {
            return { layer, part: 'corner_calib', cornerIdx: cIdx };
          }
        }
      } else {
        const handleHitRadius = 20 / currentZoom;
        const rotStemLength = 32 / currentZoom;

        // 旋轉柄
        if (Math.hypot(localX - 0, localY - (-hh - rotStemLength)) <= handleHitRadius) {
          return { layer, part: 'rot' };
        }

        // 四角柄
        if (Math.hypot(localX - (-hw), localY - (-hh)) <= handleHitRadius) return { layer, part: 'tl' };
        if (Math.hypot(localX - hw, localY - (-hh)) <= handleHitRadius) return { layer, part: 'tr' };
        if (Math.hypot(localX - hw, localY - hh) <= handleHitRadius) return { layer, part: 'br' };
        if (Math.hypot(localX - (-hw), localY - hh) <= handleHitRadius) return { layer, part: 'bl' };
      }
    }

    if (localX >= -hw && localX <= hw && localY >= -hh && localY <= hh) {
      return { layer, part: 'body' };
    }
  }

  return null;
}

// --- 滑鼠操作事件監聽 ---
canvas.addEventListener('mousedown', e => {
  const coords = getCanvasCoords(e);
  const hit = hitTest(coords.x, coords.y);

  if (hit) {
    setActiveLayer(hit.layer);
    dragStartX = coords.x;
    dragStartY = coords.y;

    objInitialState = {
      x: hit.layer.x,
      y: hit.layer.y,
      width: hit.layer.width,
      height: hit.layer.height,
      rotation: hit.layer.rotation,
      fontSize: hit.layer.fontSize
    };

    if (hit.part === 'corner_calib') {
      isDraggingCorner = hit.cornerIdx;
    } else if (hit.part === 'rot') {
      isRotating = true;
    } else if (['tl', 'tr', 'br', 'bl'].includes(hit.part)) {
      isResizing = true;
      resizeHandle = hit.part;
    } else if (hit.part === 'body') {
      isDragging = true;
    }
  } else {
    setActiveLayer(null);
  }
  render();
});

window.addEventListener('mousemove', e => {
  if (!activeLayer) return;
  const coords = getCanvasCoords(e);
  const dx = coords.x - dragStartX;
  const dy = coords.y - dragStartY;

  // 拖曳校正角點
  if (isDraggingCorner >= 0 && activeLayer.cornerMode) {
    const hw = activeLayer.width / 2;
    const hh = activeLayer.height / 2;
    const localX = (coords.x - activeLayer.x) * Math.cos(-activeLayer.rotation) - (coords.y - activeLayer.y) * Math.sin(-activeLayer.rotation);
    const localY = (coords.x - activeLayer.x) * Math.sin(-activeLayer.rotation) + (coords.y - activeLayer.y) * Math.cos(-activeLayer.rotation);

    const baseImg = activeLayer.rawImage;
    const rawX = Math.max(0, Math.min(baseImg.width, ((localX + hw) / activeLayer.width) * baseImg.width));
    const rawY = Math.max(0, Math.min(baseImg.height, ((localY + hh) / activeLayer.height) * baseImg.height));

    activeLayer.corners[isDraggingCorner] = { x: rawX, y: rawY };
    render();
    return;
  }

  // 移動物件
  if (isDragging) {
    activeLayer.x = objInitialState.x + dx;
    activeLayer.y = objInitialState.y + dy;
    render();
    return;
  }

  // 旋轉物件
  if (isRotating) {
    const angle = Math.atan2(coords.y - activeLayer.y, coords.x - activeLayer.x) + Math.PI / 2;
    const deg = (angle * 180 / Math.PI) % 360;
    const snapThreshold = 3;
    let finalAngle = angle;
    [0, 90, 180, 270, 360].forEach(snapDeg => {
      if (Math.abs(deg - snapDeg) < snapThreshold || Math.abs(deg + 360 - snapDeg) < snapThreshold) {
        finalAngle = (snapDeg * Math.PI) / 180;
      }
    });
    activeLayer.rotation = finalAngle;
    render();
    return;
  }

  // 等比例縮放
  if (isResizing) {
    const origW = objInitialState.width;
    const origH = objInitialState.height;
    const aspect = origW / origH;

    const localDx = dx * Math.cos(-objInitialState.rotation) - dy * Math.sin(-objInitialState.rotation);
    const localDy = dx * Math.sin(-objInitialState.rotation) + dy * Math.cos(-objInitialState.rotation);

    let scaleDelta = 0;
    if (resizeHandle === 'br') {
      scaleDelta = (localDx + localDy * aspect) / (2 * origW);
    } else if (resizeHandle === 'tl') {
      scaleDelta = (-localDx - localDy * aspect) / (2 * origW);
    } else if (resizeHandle === 'tr') {
      scaleDelta = (localDx - localDy * aspect) / (2 * origW);
    } else if (resizeHandle === 'bl') {
      scaleDelta = (-localDx + localDy * aspect) / (2 * origW);
    }

    const newScale = Math.max(0.08, 1 + scaleDelta * 2);
    activeLayer.width = Math.round(origW * newScale);
    activeLayer.height = Math.round(origH * newScale);

    if (activeLayer.type === 'text') {
      activeLayer.fontSize = Math.max(14, Math.round(objInitialState.fontSize * newScale));
    }

    render();
    return;
  }

  // 游標樣式
  const hit = hitTest(coords.x, coords.y);
  if (hit) {
    if (hit.part === 'rot') canvas.style.cursor = 'grab';
    else if (['tl', 'br'].includes(hit.part)) canvas.style.cursor = 'nwse-resize';
    else if (['tr', 'bl'].includes(hit.part)) canvas.style.cursor = 'nesw-resize';
    else if (hit.part === 'corner_calib') canvas.style.cursor = 'crosshair';
    else canvas.style.cursor = 'move';
  } else {
    canvas.style.cursor = 'default';
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  isResizing = false;
  isRotating = false;
  isDraggingCorner = -1;
  resizeHandle = null;
  objInitialState = null;
  render();
});

// 鍵盤操作
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if ((e.key === 'Delete' || e.key === 'Backspace') && activeLayer) {
    e.preventDefault();
    deleteActiveLayer();
  } else if (activeLayer && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    const step = e.shiftKey ? 12 : 2;
    if (e.key === 'ArrowUp') activeLayer.y -= step;
    if (e.key === 'ArrowDown') activeLayer.y += step;
    if (e.key === 'ArrowLeft') activeLayer.x -= step;
    if (e.key === 'ArrowRight') activeLayer.x += step;
    render();
  }
});

// 雙擊編輯文字
canvas.addEventListener('dblclick', e => {
  const coords = getCanvasCoords(e);
  const hit = hitTest(coords.x, coords.y);
  if (hit && hit.layer.type === 'text') {
    editTextContent.focus();
    showToast('請在右側面板修改備註文字');
  }
});

// --- 選取狀態與右側面板同步 ---
function setActiveLayer(layer) {
  activeLayer = layer;
  updateLayersListUI();

  if (!layer) {
    noSelectionHint.classList.remove('hidden');
    selectionControls.classList.add('hidden');
    activeTypeName.textContent = '未選取任何物件';
    return;
  }

  noSelectionHint.classList.add('hidden');
  selectionControls.classList.remove('hidden');

  pdfControls.classList.add('hidden');
  imagePerspectiveControls.classList.add('hidden');
  imageEnhanceControls.classList.add('hidden');
  textControls.classList.add('hidden');

  if (layer.type === 'pdf_order') {
    activeTypeName.textContent = '訂購單 (PDF)';
    pdfControls.classList.remove('hidden');
    sliderPdfCrop.value = Math.round((layer.cropRatio || 0.6) * 100);
    pdfCropVal.textContent = `${sliderPdfCrop.value}%`;
  } else if (layer.type === 'image') {
    activeTypeName.textContent = '照片 (保卡 / 發票)';
    imagePerspectiveControls.classList.remove('hidden');
    imageEnhanceControls.classList.remove('hidden');

    updateCornerModeUI(layer.cornerMode);

    switchScanEnhance.checked = !!layer.scanEnhance;
    if (layer.scanEnhance) {
      enhanceSliders.classList.remove('hidden');
      sliderShadow.value = layer.shadowStrength;
      valShadow.textContent = `${layer.shadowStrength}%`;
      sliderBrightness.value = layer.brightness;
      valBrightness.textContent = layer.brightness;
      sliderContrast.value = layer.contrast;
      valContrast.textContent = `${(layer.contrast / 100).toFixed(1)}x`;
    } else {
      enhanceSliders.classList.add('hidden');
    }
  } else if (layer.type === 'stamp') {
    activeTypeName.textContent = '專櫃印章 (獨立圖層)';
  } else if (layer.type === 'text') {
    activeTypeName.textContent = '審核備註文字';
    textControls.classList.remove('hidden');
    editTextContent.value = layer.text;
    btnTextBold.style.backgroundColor = layer.bold ? '#e2e8f0' : 'transparent';
    updateColorButtonSelection(textControls, layer.color);
  }

  render();
}

function updateColorButtonSelection(container, activeColor) {
  const btns = container.querySelectorAll('.color-btn');
  btns.forEach(b => {
    if (b.dataset.color.toLowerCase() === activeColor.toLowerCase()) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

// --- 圖層管理清單 UI ---
function updateLayersListUI() {
  layersList.innerHTML = '';
  layerCountBadge.textContent = `${layers.length} 個物件`;

  if (layers.length === 0) {
    emptyLayersHint.classList.remove('hidden');
    layersList.appendChild(emptyLayersHint);
    return;
  }
  emptyLayersHint.classList.add('hidden');

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const item = document.createElement('div');
    item.className = `layer-item ${layer === activeLayer ? 'active' : ''}`;

    let thumbHtml = '';
    let badgeClass = 'badge-img';
    let typeLabel = '保卡/發票';

    if (layer.type === 'pdf_order') {
      badgeClass = 'badge-pdf';
      typeLabel = 'PDF 訂單';
    } else if (layer.type === 'stamp') {
      badgeClass = 'badge-stamp';
      typeLabel = '專櫃印章';
    } else if (layer.type === 'text') {
      badgeClass = 'badge-text';
      typeLabel = '審核備註';
    }

    if (layer.type === 'text') {
      thumbHtml = `<div class="layer-thumb layer-thumb-text">T</div>`;
    } else if (layer.image) {
      const src = layer.image instanceof HTMLCanvasElement ? layer.image.toDataURL() : layer.image.src;
      thumbHtml = `<img src="${src}" class="layer-thumb" alt="縮圖">`;
    }

    item.innerHTML = `
      ${thumbHtml}
      <div class="layer-info">
        <div class="layer-name" title="${layer.name}">${layer.name}</div>
        <span class="layer-type-badge ${badgeClass}">${typeLabel}</span>
      </div>
      <div class="layer-actions">
        <button class="layer-btn btn-layer-up" title="上移一層 (往頂層)">▲</button>
        <button class="layer-btn btn-layer-down" title="下移一層 (往底層)">▼</button>
        <button class="layer-btn btn-layer-del" title="刪除此圖層">🗑️</button>
      </div>
    `;

    item.addEventListener('click', e => {
      if (e.target.closest('.layer-actions')) return;
      setActiveLayer(layer);
    });

    item.querySelector('.btn-layer-up').addEventListener('click', e => {
      e.stopPropagation();
      moveLayer(layer, 1);
    });

    item.querySelector('.btn-layer-down').addEventListener('click', e => {
      e.stopPropagation();
      moveLayer(layer, -1);
    });

    item.querySelector('.btn-layer-del').addEventListener('click', e => {
      e.stopPropagation();
      deleteLayer(layer);
    });

    layersList.appendChild(item);
  }
}

function moveLayer(layer, direction) {
  const idx = layers.indexOf(layer);
  if (idx < 0) return;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= layers.length) return;

  layers.splice(idx, 1);
  layers.splice(targetIdx, 0, layer);
  setActiveLayer(layer);
  render();
}

function deleteLayer(layer) {
  const idx = layers.indexOf(layer);
  if (idx >= 0) {
    layers.splice(idx, 1);
    if (activeLayer === layer) {
      setActiveLayer(layers[layers.length - 1] || null);
    } else {
      updateLayersListUI();
      render();
    }
  }
}

function deleteActiveLayer() {
  if (activeLayer) deleteLayer(activeLayer);
}

// --- 檔案匯入處理 (純前端解析) ---
async function handleFiles(fileList) {
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      await importPdfPureFrontend(file);
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      await importImagePureFrontend(file);
    } else {
      showToast(`不支援的檔案格式: ${file.name}`);
    }
  }
}

// --- 3. 訂購單 4.5x 超高解析度讀取與 +12px 精準切線 ---
async function importPdfPureFrontend(file) {
  if (!window.pdfjsLib) {
    showToast('瀏覽器尚未載入 PDF.js，請稍後或直接拖入圖片');
    return;
  }

  showToast(`正在 4.5x 超高解析度解析 PDF: ${file.name}...`);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pdf.numPages < 1) {
      showToast('PDF 檔案為空');
      return;
    }

    const page = await pdf.getPage(1);
    // 提升渲染解析度至 4.5x
    const scale = 4.5;
    const viewport = page.getViewport({ scale });

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = viewport.width;
    fullCanvas.height = viewport.height;
    const renderCtx = fullCanvas.getContext('2d');
    renderCtx.imageSmoothingEnabled = true;
    renderCtx.imageSmoothingQuality = 'high';

    await page.render({ canvasContext: renderCtx, viewport }).promise;

    // 讀取內文文字座標
    const textContent = await page.getTextContent();
    const pageHeightPt = page.view[3] - page.view[1];

    const keywordsRow = ['實收訂金', '尚餘尾款', '總金額', '含稅', '訂金金額'];
    const keywordsCutoff = ['施工確認', '施工確認項目', '注意事項', '客戶簽名', '訂購人簽名'];

    let foundYList = [];
    let stopYList = [];

    textContent.items.forEach(item => {
      const text = item.str || '';
      const ptY = item.transform[5];
      const canvasY = (pageHeightPt - ptY) * scale;

      for (const kw of keywordsRow) {
        if (text.includes(kw)) {
          foundYList.push(canvasY);
          break;
        }
      }
      for (const kw of keywordsCutoff) {
        if (text.includes(kw)) {
          stopYList.push(canvasY);
          break;
        }
      }
    });

    let cropYInCanvas = null;
    if (foundYList.length > 0) {
      // 縮減下緣留邊至 +12px，切齊總金額橫線正下方，杜絕施工條款字頭
      cropYInCanvas = Math.max(...foundYList) + 12;
    } else if (stopYList.length > 0) {
      cropYInCanvas = Math.min(...stopYList) - 10;
    } else {
      cropYInCanvas = fullCanvas.height * 0.60;
    }

    cropYInCanvas = Math.max(150, Math.min(fullCanvas.height, cropYInCanvas));
    const cropRatio = cropYInCanvas / fullCanvas.height;

    // 裁切訂購單影像
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = fullCanvas.width;
    croppedCanvas.height = cropYInCanvas;
    const cropCtx = croppedCanvas.getContext('2d');
    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';
    cropCtx.drawImage(
      fullCanvas,
      0, 0, fullCanvas.width, cropYInCanvas,
      0, 0, fullCanvas.width, cropYInCanvas
    );

    // --- 4. 三欄式黃金版面：訂購單放置於左上角，寬度佔約 63% ---
    const orderDisplayW = Math.round(CANVAS_WIDTH * 0.63); // 2400 * 0.63 = 1512 px
    const aspect = croppedCanvas.width / croppedCanvas.height;
    const orderDisplayH = Math.round(orderDisplayW / aspect);

    const marginX = 40;
    const marginY = 40;
    const posX = marginX + orderDisplayW / 2;
    const posY = marginY + orderDisplayH / 2;

    const newLayer = createLayerObject({
      type: 'pdf_order',
      name: file.name,
      image: croppedCanvas,
      rawImage: croppedCanvas,
      fullCanvas: fullCanvas,
      cropRatio: cropRatio,
      width: orderDisplayW,
      height: orderDisplayH,
      x: posX,
      y: posY
    });

    layers.push(newLayer);
    setActiveLayer(newLayer);
    showToast(`PDF 訂購單已以 4.5x 超高解析度精準裁切進場`);
  } catch (err) {
    showToast(`PDF 讀取失敗: ${err.message}`);
    console.error(err);
  }
}

// 訂單裁切高度滑桿即時微調
sliderPdfCrop.addEventListener('input', () => {
  pdfCropVal.textContent = `${sliderPdfCrop.value}%`;
  reCropPdfPureFrontend();
});

function reCropPdfPureFrontend() {
  if (!activeLayer || activeLayer.type !== 'pdf_order' || !activeLayer.fullCanvas) return;
  const ratio = parseInt(sliderPdfCrop.value, 10) / 100.0;
  const fullCanvas = activeLayer.fullCanvas;
  const newCropHeight = Math.max(100, Math.min(fullCanvas.height, Math.round(fullCanvas.height * ratio)));

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = fullCanvas.width;
  croppedCanvas.height = newCropHeight;
  const cropCtx = croppedCanvas.getContext('2d');
  cropCtx.imageSmoothingEnabled = true;
  cropCtx.imageSmoothingQuality = 'high';
  cropCtx.drawImage(
    fullCanvas,
    0, 0, fullCanvas.width, newCropHeight,
    0, 0, fullCanvas.width, newCropHeight
  );

  const aspect = croppedCanvas.width / croppedCanvas.height;
  activeLayer.height = Math.round(activeLayer.width / aspect);
  activeLayer.image = croppedCanvas;
  activeLayer.cropRatio = ratio;
  render();
}

btnResetPdfCrop.addEventListener('click', () => {
  if (activeLayer && activeLayer.origPdfCropRatio) {
    sliderPdfCrop.value = Math.round(activeLayer.origPdfCropRatio * 100);
    pdfCropVal.textContent = `${sliderPdfCrop.value}%`;
    reCropPdfPureFrontend();
  }
});

// --- 1. 自動白紙輪廓偵測與去背景裁邊演算法 ---
function detectDocumentCorners(img) {
  const sw = img.width;
  const sh = img.height;

  // 建立低解析分析畫布以達到毫秒級即時運算
  const maxDim = 220;
  const scale = Math.min(1.0, maxDim / Math.max(sw, sh));
  const tw = Math.max(20, Math.round(sw * scale));
  const th = Math.max(20, Math.round(sh * scale));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = tw;
  thumbCanvas.height = th;
  const tCtx = thumbCanvas.getContext('2d');
  tCtx.drawImage(img, 0, 0, tw, th);
  const imgData = tCtx.getImageData(0, 0, tw, th).data;

  // 1. 計算白紙像素遮罩 (亮度高且色彩飽和度低)
  // 木紋/桌面背景通常為深色或高色彩飽和度
  const isPaper = new Uint8Array(tw * th);
  let paperCount = 0;

  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);

    // 白紙判定：亮度大於 125 且色彩飽和度小於 55
    if (lum > 125 && sat < 55) {
      isPaper[i / 4] = 1;
      paperCount++;
    }
  }

  // 若白紙面積太少 (< 18%) 或已經幾乎填滿整個視圖 (> 95%)，則代表無需自動裁切桌面
  const totalPixels = tw * th;
  const ratio = paperCount / totalPixels;
  if (ratio < 0.18 || ratio > 0.95) {
    return {
      autoDetected: false,
      corners: [
        { x: 0, y: 0 },
        { x: sw, y: 0 },
        { x: sw, y: sh },
        { x: 0, y: sh }
      ]
    };
  }

  // 2. 尋找白紙主區域之 4 個極值頂點 (TL: min x+y, TR: max x-y, BR: max x+y, BL: min x-y)
  // 加入 3x3 鄰域濾波排除孤立雜訊點
  let minSum = Infinity, tlPt = { x: 0, y: 0 };
  let maxDiff = -Infinity, trPt = { x: tw - 1, y: 0 };
  let maxSum = -Infinity, brPt = { x: tw - 1, y: th - 1 };
  let minDiff = Infinity, blPt = { x: 0, y: th - 1 };

  for (let y = 1; y < th - 1; y++) {
    for (let x = 1; x < tw - 1; x++) {
      const idx = y * tw + x;
      if (isPaper[idx] === 1) {
        // 檢查 8 鄰域至少有 5 個也是白紙點，避免噪點干擾
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (isPaper[(y + dy) * tw + (x + dx)] === 1) neighbors++;
          }
        }
        if (neighbors >= 5) {
          const sum = x + y;
          const diff = x - y;

          if (sum < minSum) { minSum = sum; tlPt = { x, y }; }
          if (diff > maxDiff) { maxDiff = diff; trPt = { x, y }; }
          if (sum > maxSum) { maxSum = sum; brPt = { x, y }; }
          if (diff < minDiff) { minDiff = diff; blPt = { x, y }; }
        }
      }
    }
  }

  // 計算偵測到的四邊形面積
  const quadArea = 0.5 * Math.abs(
    (tlPt.x * trPt.y - trPt.x * tlPt.y) +
    (trPt.x * brPt.y - brPt.x * trPt.y) +
    (brPt.x * blPt.y - blPt.x * brPt.y) +
    (blPt.x * tlPt.y - tlPt.x * blPt.y)
  );

  // 若四邊形面積合理 (> 20% 且 < 95%)，則視為有效白紙邊界
  if (quadArea / totalPixels >= 0.20 && quadArea / totalPixels <= 0.95) {
    const scaleX = sw / tw;
    const scaleY = sh / th;
    const finalCorners = [
      { x: Math.max(0, Math.min(sw, tlPt.x * scaleX)), y: Math.max(0, Math.min(sh, tlPt.y * scaleY)) },
      { x: Math.max(0, Math.min(sw, trPt.x * scaleX)), y: Math.max(0, Math.min(sh, trPt.y * scaleY)) },
      { x: Math.max(0, Math.min(sw, brPt.x * scaleX)), y: Math.max(0, Math.min(sh, brPt.y * scaleY)) },
      { x: Math.max(0, Math.min(sw, blPt.x * scaleX)), y: Math.max(0, Math.min(sh, blPt.y * scaleY)) }
    ];

    return {
      autoDetected: true,
      corners: finalCorners
    };
  }

  return {
    autoDetected: false,
    corners: [
      { x: 0, y: 0 },
      { x: sw, y: 0 },
      { x: sw, y: sh },
      { x: 0, y: sh }
    ]
  };
}

// 圖片進場處理 (自動去背景裁邊 + 三欄式黃金版面定位)
function importImagePureFrontend(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const sw = img.width;
        const sh = img.height;

        // 1. 自動偵測白紙輪廓並去背景拉正
        const detection = detectDocumentCorners(img);
        let displayImg = img;
        let warpedCanvas = null;

        if (detection.autoDetected) {
          warpedCanvas = warpPerspectivePureJS(img, detection.corners);
          if (warpedCanvas) {
            displayImg = warpedCanvas;
          }
        }

        // 2. 判斷橫向 (保卡) 或直向 (發票)，套用三欄式黃金版面
        const isHorizontal = displayImg.width >= displayImg.height;
        let displayW, displayH, posX, posY;

        if (isHorizontal) {
          // --- 保卡 / 橫向單據：左下角，寬度約 58% 對齊訂購單 ---
          displayW = Math.round(CANVAS_WIDTH * 0.58); // 1392 px
          const aspect = displayImg.width / displayImg.height;
          displayH = Math.round(displayW / aspect);

          const marginX = 40;
          const marginY = 40;
          posX = marginX + displayW / 2;
          posY = CANVAS_HEIGHT - marginY - displayH / 2;
        } else {
          // --- 發票 / 直式明細：右側直立區，高度佔滿約 88% ---
          displayH = Math.round(CANVAS_HEIGHT * 0.88); // 1496 px
          const aspect = displayImg.width / displayImg.height;
          displayW = Math.round(displayH * aspect);

          const marginX = 40;
          posX = CANVAS_WIDTH - marginX - displayW / 2;
          posY = CANVAS_HEIGHT / 2;
        }

        const newLayer = createLayerObject({
          type: 'image',
          name: file.name,
          image: displayImg,
          rawImage: img,
          warpedImage: warpedCanvas,
          width: displayW,
          height: displayH,
          x: posX,
          y: posY,
          corners: detection.corners
        });

        layers.push(newLayer);
        setActiveLayer(newLayer);

        if (detection.autoDetected) {
          showToast(`已載入 ${file.name} 並自動切除桌面背景拉正`);
        } else {
          showToast(`已載入原圖: ${file.name}`);
        }

        resolve();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- 四點透視手動微調切換 ---
function updateCornerModeUI(inMode) {
  if (inMode) {
    btnToggleCornerMode.textContent = '退出角點微調';
    btnToggleCornerMode.classList.remove('btn-outline');
    btnToggleCornerMode.classList.add('btn-danger');
    btnApplyWarp.classList.remove('hidden');
    btnRevertWarp.classList.remove('hidden');
    cornerCalibrationNotice.classList.remove('hidden');
  } else {
    btnToggleCornerMode.textContent = '調整四角裁切';
    btnToggleCornerMode.classList.add('btn-outline');
    btnToggleCornerMode.classList.remove('btn-danger');
    btnApplyWarp.classList.add('hidden');
    btnRevertWarp.classList.add('hidden');
    cornerCalibrationNotice.classList.add('hidden');
  }
}

btnToggleCornerMode.addEventListener('click', () => {
  if (!activeLayer || activeLayer.type !== 'image') return;
  activeLayer.cornerMode = !activeLayer.cornerMode;
  if (activeLayer.cornerMode && (!activeLayer.corners || activeLayer.corners.length !== 4)) {
    const baseImg = activeLayer.rawImage;
    activeLayer.corners = [
      { x: 0, y: 0 },
      { x: baseImg.width, y: 0 },
      { x: baseImg.width, y: baseImg.height },
      { x: 0, y: baseImg.height }
    ];
  }
  updateCornerModeUI(activeLayer.cornerMode);
  render();
});

// 手動微調套用拉正
btnApplyWarp.addEventListener('click', () => {
  if (!activeLayer || !activeLayer.corners || activeLayer.corners.length !== 4) return;
  showToast('正在執行手動透視校正...');

  const baseImg = activeLayer.rawImage;
  const corners = activeLayer.corners;

  const warpedCanvas = warpPerspectivePureJS(baseImg, corners);
  if (warpedCanvas) {
    activeLayer.warpedImage = warpedCanvas;
    activeLayer.image = warpedCanvas;

    const aspect = warpedCanvas.width / warpedCanvas.height;
    activeLayer.height = Math.round(activeLayer.width / aspect);
    activeLayer.cornerMode = false;
    updateCornerModeUI(false);

    if (activeLayer.scanEnhance) {
      applyDocumentEnhancePureJS(activeLayer);
    } else {
      render();
    }

    showToast('四角校正拉正完成');
  }
});

// 單應性透視變換演算法
function warpPerspectivePureJS(srcImg, corners) {
  const [tl, tr, br, bl] = corners;

  const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
  const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const dstW = Math.max(30, Math.round(Math.max(widthA, widthB)));

  const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
  const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
  const dstH = Math.max(30, Math.round(Math.max(heightA, heightB)));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcImg.width;
  srcCanvas.height = srcImg.height;
  const sCtx = srcCanvas.getContext('2d');
  sCtx.drawImage(srcImg, 0, 0);
  const srcData = sCtx.getImageData(0, 0, srcImg.width, srcImg.height);
  const sPixels = srcData.data;
  const sw = srcImg.width;
  const sh = srcImg.height;

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dCtx = dstCanvas.getContext('2d');
  const dstData = dCtx.createImageData(dstW, dstH);
  const dPixels = dstData.data;

  const x0 = tl.x, y0 = tl.y;
  const x1 = tr.x, y1 = tr.y;
  const x2 = br.x, y2 = br.y;
  const x3 = bl.x, y3 = bl.y;

  const dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;

  let g = 0, h = 0;
  if (Math.abs(det) > 1e-7) {
    g = (sx * dy2 - sy * dx2) / det;
    h = (dx1 * sy - dy1 * sx) / det;
  }
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;

  for (let y = 0; y < dstH; y++) {
    const t = dstH > 1 ? y / (dstH - 1) : 0;
    const rowOffset = y * dstW * 4;

    for (let x = 0; x < dstW; x++) {
      const s = dstW > 1 ? x / (dstW - 1) : 0;
      const denom = g * s + h * t + 1;
      const srcX = (a * s + b * t + c) / denom;
      const srcY = (d * s + e * t + f) / denom;

      const dIdx = rowOffset + x * 4;

      if (srcX >= 0 && srcX < sw - 1 && srcY >= 0 && srcY < sh - 1) {
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const wx = srcX - x0;
        const wy = srcY - y0;
        const w00 = (1 - wx) * (1 - wy);
        const w10 = wx * (1 - wy);
        const w01 = (1 - wx) * wy;
        const w11 = wx * wy;

        const idx00 = (y0 * sw + x0) * 4;
        const idx10 = (y0 * sw + x1) * 4;
        const idx01 = (y1 * sw + x0) * 4;
        const idx11 = (y1 * sw + x1) * 4;

        dPixels[dIdx] = Math.round(w00 * sPixels[idx00] + w10 * sPixels[idx10] + w01 * sPixels[idx01] + w11 * sPixels[idx11]);
        dPixels[dIdx + 1] = Math.round(w00 * sPixels[idx00 + 1] + w10 * sPixels[idx10 + 1] + w01 * sPixels[idx01 + 1] + w11 * sPixels[idx11 + 1]);
        dPixels[dIdx + 2] = Math.round(w00 * sPixels[idx00 + 2] + w10 * sPixels[idx10 + 2] + w01 * sPixels[idx01 + 2] + w11 * sPixels[idx11 + 2]);
        dPixels[dIdx + 3] = 255;
      } else {
        dPixels[dIdx + 3] = 0;
      }
    }
  }

  dCtx.putImageData(dstData, 0, 0);
  return dstCanvas;
}

// 還原原始未裁切全圖
btnRevertWarp.addEventListener('click', () => {
  if (!activeLayer || !activeLayer.rawImage) return;
  activeLayer.warpedImage = null;
  activeLayer.image = activeLayer.rawImage;

  const aspect = activeLayer.rawImage.width / activeLayer.rawImage.height;
  activeLayer.height = Math.round(activeLayer.width / aspect);
  activeLayer.cornerMode = false;
  activeLayer.corners = [
    { x: 0, y: 0 },
    { x: activeLayer.rawImage.width, y: 0 },
    { x: activeLayer.rawImage.width, y: activeLayer.rawImage.height },
    { x: 0, y: activeLayer.rawImage.height }
  ];
  updateCornerModeUI(false);

  if (activeLayer.scanEnhance) {
    applyDocumentEnhancePureJS(activeLayer);
  } else {
    render();
  }
  showToast('已還原為原始未裁切全圖');
});

// --- 文件掃描美化 (去陰影/增白/對比) ---
switchScanEnhance.addEventListener('change', () => {
  if (!activeLayer || activeLayer.type !== 'image') return;
  activeLayer.scanEnhance = switchScanEnhance.checked;

  if (activeLayer.scanEnhance) {
    enhanceSliders.classList.remove('hidden');
    applyDocumentEnhancePureJS(activeLayer);
  } else {
    enhanceSliders.classList.add('hidden');
    activeLayer.image = activeLayer.warpedImage || activeLayer.rawImage;
    render();
    showToast('已關閉美化，恢復原始照片');
  }
});

let enhanceDebounceTimer = null;
function triggerDocumentEnhance() {
  clearTimeout(enhanceDebounceTimer);
  enhanceDebounceTimer = setTimeout(() => {
    if (!activeLayer || !activeLayer.scanEnhance) return;
    activeLayer.shadowStrength = parseInt(sliderShadow.value, 10);
    activeLayer.brightness = parseInt(sliderBrightness.value, 10);
    activeLayer.contrast = parseInt(sliderContrast.value, 10);
    applyDocumentEnhancePureJS(activeLayer);
  }, 60);
}

sliderShadow.addEventListener('input', () => {
  valShadow.textContent = `${sliderShadow.value}%`;
  triggerDocumentEnhance();
});
sliderBrightness.addEventListener('input', () => {
  valBrightness.textContent = sliderBrightness.value;
  triggerDocumentEnhance();
});
sliderContrast.addEventListener('input', () => {
  valContrast.textContent = `${(sliderContrast.value / 100).toFixed(1)}x`;
  triggerDocumentEnhance();
});

// 純前端美化濾鏡演算法
function applyDocumentEnhancePureJS(layer) {
  const baseImg = layer.warpedImage || layer.rawImage;
  const w = baseImg.width;
  const h = baseImg.height;

  const canvasTemp = document.createElement('canvas');
  canvasTemp.width = w;
  canvasTemp.height = h;
  const ctxTemp = canvasTemp.getContext('2d');
  ctxTemp.drawImage(baseImg, 0, 0);

  const imgData = ctxTemp.getImageData(0, 0, w, h);
  const data = imgData.data;

  const shadowRatio = layer.shadowStrength / 100.0;
  const contrastFactor = layer.contrast / 100.0;
  const brightness = layer.brightness;

  const thumbScale = Math.min(1.0, 300 / Math.max(w, h));
  const tw = Math.max(10, Math.round(w * thumbScale));
  const th = Math.max(10, Math.round(h * thumbScale));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = tw;
  thumbCanvas.height = th;
  const tCtx = thumbCanvas.getContext('2d');
  tCtx.drawImage(baseImg, 0, 0, tw, th);
  const tData = tCtx.getImageData(0, 0, tw, th).data;

  for (let y = 0; y < h; y++) {
    const ty = Math.min(th - 1, Math.floor(y * thumbScale));
    const rowOffset = y * w * 4;

    for (let x = 0; x < w; x++) {
      const tx = Math.min(tw - 1, Math.floor(x * thumbScale));
      const tIdx = (ty * tw + tx) * 4;
      const bgLum = Math.max(30, (tData[tIdx] + tData[tIdx + 1] + tData[tIdx + 2]) / 3);

      const idx = rowOffset + x * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      if (shadowRatio > 0.01) {
        const factor = 240.0 / bgLum;
        const normR = Math.min(255, r * factor);
        const normG = Math.min(255, g * factor);
        const normB = Math.min(255, b * factor);

        r = (1.0 - shadowRatio) * r + shadowRatio * normR;
        g = (1.0 - shadowRatio) * g + shadowRatio * normG;
        b = (1.0 - shadowRatio) * b + shadowRatio * normB;
      }

      data[idx] = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128 + brightness));
      data[idx + 1] = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128 + brightness));
      data[idx + 2] = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128 + brightness));
    }
  }

  ctxTemp.putImageData(imgData, 0, 0);
  layer.image = canvasTemp;
  render();
}

// --- 2. 櫃位印章蓋上畫布 (支援自訂字體大小、Y 軸高度與適配保卡尺寸) ---
btnAddStamp.addEventListener('click', () => {
  const dateStr = (inputStampDate.value || '').trim() || '115.11.21';
  const fontSize = parseInt(sliderStampFontSize.value, 10) || DEFAULT_STAMP_FONT_SIZE;
  const offsetY = parseInt(sliderStampOffsetY.value, 10) || 0;
  showToast(`正在蓋上專櫃印章 (${dateStr})...`);

  const stampImg = new Image();
  stampImg.onload = () => {
    const stampCanvas = document.createElement('canvas');
    stampCanvas.width = stampImg.width;
    stampCanvas.height = stampImg.height;
    const sCtx = stampCanvas.getContext('2d');
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

    // 適配保卡「經銷商確認章」欄位的預設寬度 (400px)
    const displayW = 400;
    const displayH = Math.round((displayW * stampImg.height) / stampImg.width);

    // 預設放置於左下方保卡「經銷商蓋章」區域
    const posX = 1060;
    const posY = 1450;

    const newStamp = createLayerObject({
      type: 'stamp',
      name: `專櫃印章 (${dateStr})`,
      image: stampCanvas,
      rawImage: stampCanvas,
      width: displayW,
      height: displayH,
      x: posX,
      y: posY
    });

    layers.push(newStamp);
    setActiveLayer(newStamp);
    showToast('專櫃印章已蓋上畫布');
  };

  if (typeof STAMP_CLEAN_BASE64 !== 'undefined' && STAMP_CLEAN_BASE64) {
    stampImg.src = STAMP_CLEAN_BASE64;
  } else {
    stampImg.src = 'assets/stamp_clean.png';
  }
});

// --- 審核備註文字功能 ---
btnAddNote.addEventListener('click', () => {
  const text = (inputNewNote.value || '').trim();
  if (!text) {
    showToast('請先輸入備註文字');
    return;
  }

  const newTextLayer = createLayerObject({
    type: 'text',
    name: `備註: ${text.slice(0, 8)}...`,
    text: text,
    color: newNoteColor,
    bold: newNoteIsBold,
    fontSize: 44,
    x: 1050,
    y: 1620
  });

  layers.push(newTextLayer);
  setActiveLayer(newTextLayer);
  inputNewNote.value = '';
  showToast('備註文字已加入畫布');
});

btnNewNoteBold.addEventListener('click', () => {
  newNoteIsBold = !newNoteIsBold;
  btnNewNoteBold.style.backgroundColor = newNoteIsBold ? '#e2e8f0' : 'transparent';
});

document.getElementById('newNoteColorPresets').querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    updateColorButtonSelection(document.getElementById('newNoteColorPresets'), btn.dataset.color);
    newNoteColor = btn.dataset.color;
  });
});

editTextContent.addEventListener('input', () => {
  if (activeLayer && activeLayer.type === 'text') {
    activeLayer.text = editTextContent.value;
    activeLayer.name = `備註: ${activeLayer.text.slice(0, 8)}...`;
    updateLayersListUI();
    render();
  }
});

btnTextBold.addEventListener('click', () => {
  if (activeLayer && activeLayer.type === 'text') {
    activeLayer.bold = !activeLayer.bold;
    btnTextBold.style.backgroundColor = activeLayer.bold ? '#e2e8f0' : 'transparent';
    render();
  }
});

textControls.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (activeLayer && activeLayer.type === 'text') {
      activeLayer.color = btn.dataset.color;
      updateColorButtonSelection(textControls, activeLayer.color);
      render();
    }
  });
});

// --- 快速變形控制 ---
btnRotateCCW.addEventListener('click', () => {
  if (activeLayer) {
    activeLayer.rotation -= Math.PI / 2;
    render();
  }
});

btnRotateCW.addEventListener('click', () => {
  if (activeLayer) {
    activeLayer.rotation += Math.PI / 2;
    render();
  }
});

btnFlipH.addEventListener('click', () => {
  if (activeLayer) {
    activeLayer.flipH = !activeLayer.flipH;
    render();
  }
});

btnCenterObj.addEventListener('click', () => {
  if (activeLayer) {
    activeLayer.x = CANVAS_WIDTH / 2;
    activeLayer.y = CANVAS_HEIGHT / 2;
    render();
  }
});

btnDeleteActive.addEventListener('click', deleteActiveLayer);

// --- 高解析度無損 PNG 匯出 (2400 x 1700) ---
btnExportPng.addEventListener('click', () => {
  if (layers.length === 0) {
    showToast('畫布目前沒有任何物件');
    return;
  }

  showToast('正在產生 2400 × 1700 超高解析度 PNG 圖片...');

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = CANVAS_WIDTH;
  exportCanvas.height = CANVAS_HEIGHT;
  const expCtx = exportCanvas.getContext('2d');
  expCtx.imageSmoothingEnabled = true;
  expCtx.imageSmoothingQuality = 'high';

  expCtx.fillStyle = '#FFFFFF';
  expCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  layers.forEach(layer => {
    expCtx.save();
    expCtx.translate(layer.x, layer.y);
    expCtx.rotate(layer.rotation);
    if (layer.flipH) {
      expCtx.scale(-1, 1);
    }

    if (layer.type === 'text') {
      const fontWeight = layer.bold ? 'bold ' : '';
      expCtx.font = `${fontWeight}${layer.fontSize}px -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif`;
      expCtx.fillStyle = layer.color;
      expCtx.textBaseline = 'top';

      const lines = layer.text.split('\n');
      const lineHeight = layer.fontSize * 1.35;
      const startX = -layer.width / 2 + 15;
      const startY = -layer.height / 2 + 8;

      lines.forEach((line, idx) => {
        expCtx.fillText(line, startX, startY + idx * lineHeight);
      });
    } else if (layer.image && (layer.image.complete || layer.image instanceof HTMLCanvasElement)) {
      expCtx.drawImage(
        layer.image,
        -layer.width / 2,
        -layer.height / 2,
        layer.width,
        layer.height
      );
    }

    expCtx.restore();
  });

  exportCanvas.toBlob(blob => {
    if (!blob) {
      showToast('匯出失敗，請確認圖片載入完整');
      return;
    }
    const filename = (inputExportName.value || '客戶訂單發票保卡').trim() + '.png';
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`已成功下載圖片: ${filename}`);
  }, 'image/png');
});

// --- 清空畫布 ---
btnClearCanvas.addEventListener('click', () => {
  if (layers.length === 0) return;
  if (confirm('確定要清空畫布上的所有物件嗎？')) {
    layers = [];
    setActiveLayer(null);
    render();
    showToast('畫布已清空');
  }
});

// --- 縮放與工具列事件 ---
btnZoomIn.addEventListener('click', () => setZoom(currentZoom + 0.08));
btnZoomOut.addEventListener('click', () => setZoom(currentZoom - 0.08));
btnZoomFit.addEventListener('click', fitCanvasToViewport);
btnZoom100.addEventListener('click', () => setZoom(1.0));

canvasViewport.addEventListener('wheel', e => {
  if (e.altKey || e.ctrlKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setZoom(currentZoom + delta);
  }
}, { passive: false });

btnSelectFiles.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  if (e.target.files && e.target.files.length > 0) {
    handleFiles(e.target.files);
    fileInput.value = '';
  }
});

// 拖曳進場事件
function setupEventListeners() {
  ['dragenter', 'dragover'].forEach(name => {
    canvasViewport.addEventListener(name, e => {
      e.preventDefault();
      e.stopPropagation();
      dropOverlay.classList.add('active');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    canvasViewport.addEventListener(name, e => {
      e.preventDefault();
      e.stopPropagation();
      dropOverlay.classList.remove('active');
    });
  });

  canvasViewport.addEventListener('drop', e => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 2600);
}
