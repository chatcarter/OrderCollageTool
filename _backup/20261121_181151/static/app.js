/**
 * 訂單、保卡與發票拼貼工作台 - 100% 純前端超高解析升級版
 * 畫布規格: 2400 x 1700 px (橫向 A4 超高解析比例)
 * 專櫃色碼: #003FBC
 * 核心功能:
 * 1. 圖片進場 100% 原始長寬比（無自動變形，手動精確控制）
 * 2. 雙擊（點兩下）照片快速開啟/完成「矩形裁切（去桌面背景）」
 * 3. Photoshop 風格「即時跟隨拉扯」自由梯形變形 + 九宮格對齊輔助線
 * 4. 單據內文智慧辨識（PDF 純文字 + Tesseract.js OCR）與一鍵複製
 * 5. 圖紙輸出範圍工具 + 大中小三段輸出解析度選擇器
 * 6. 櫃位印章自訂字體大小、上下 Y 軸微調與 localStorage 永久記憶
 */

// --- 畫布與全域常數 ---
const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1700;

const DEFAULT_STAMP_FONT_SIZE = 175;
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
let dragStartX = 0;
let dragStartY = 0;
let objInitialState = null;

// --- 圖紙輸出範圍狀態 ---
let exportCropActive = false;
let exportCropRect = {
  x: 100,
  y: 70,
  width: 2200,
  height: 1560
};
let isDraggingExportCrop = false;
let exportCropDragPart = null;
let exportCropInitialRect = null;

// --- 輸出解析度縮放 (預設 0.75: 中 / 75%) ---
let exportScale = 0.75;

// --- 矩形裁切拖曳狀態 ---
let isDraggingRectCrop = false;
let rectCropDragPart = null;
let rectCropInitialState = null;

// --- 自由梯形變形角點拖曳狀態 ---
let isDraggingDistortCorner = -1; // 0: TL, 1: TR, 2: BR, 3: BL

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

// 矩形裁切專用控制
const imagePerspectiveControls = document.getElementById('imagePerspectiveControls');
const btnToggleRectCrop = document.getElementById('btnToggleRectCrop');
const btnApplyRectCrop = document.getElementById('btnApplyRectCrop');
const btnRevertRectCrop = document.getElementById('btnRevertRectCrop');
const rectCropNotice = document.getElementById('rectCropNotice');

// 自由梯形變形專用控制
const btnToggleDistortMode = document.getElementById('btnToggleDistortMode');
const btnApplyDistort = document.getElementById('btnApplyDistort');
const btnRevertDistort = document.getElementById('btnRevertDistort');
const distortNotice = document.getElementById('distortNotice');

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

// OCR 與備註文字控制項
const btnRunOcr = document.getElementById('btnRunOcr');
const ocrStatusBox = document.getElementById('ocrStatusBox');
const inputNewNote = document.getElementById('inputNewNote');
const btnNewNoteBold = document.getElementById('btnNewNoteBold');
const btnCopyNote = document.getElementById('btnCopyNote');
const btnAddNote = document.getElementById('btnAddNote');
let newNoteColor = '#000000';
let newNoteIsBold = false;

// 圖紙輸出範圍與匯出控制項
const btnToggleExportCrop = document.getElementById('btnToggleExportCrop');
const switchExportCrop = document.getElementById('switchExportCrop');
const resBtns = document.querySelectorAll('.res-btn');
const exportDimensionLabel = document.getElementById('exportDimensionLabel');
const inputExportName = document.getElementById('inputExportName');
const btnExportPng = document.getElementById('btnExportPng');

// --- 初始化執行 ---
window.addEventListener('DOMContentLoaded', () => {
  initMinguoDate();
  loadSavedStampSettings();
  updateStampPreview();
  fitCanvasToViewport();
  updateExportDimensionDisplay();
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

    sCtx.drawImage(stampImg, 0, 0);

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
  const pad = 40;
  const availW = canvasViewport.clientWidth - pad * 2;
  const availH = canvasViewport.clientHeight - pad * 2;
  const scaleW = availW / CANVAS_WIDTH;
  const scaleH = availH / CANVAS_HEIGHT;
  setZoom(Math.min(scaleW, scaleH));
}

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
    croppedImage: options.croppedImage || null,
    // PDF 專屬快取與萃取純文字
    fullCanvas: options.fullCanvas || null,
    rawPdfText: options.rawPdfText || '',
    cropRatio: options.cropRatio || 0.6,
    origPdfCropRatio: options.cropRatio || 0.6,
    // 矩形裁切模式
    rectCropMode: false,
    cropRect: null,
    // 自由梯形變形模式 (Photoshop 即時拉扯 Distort)
    distortMode: false,
    distortCorners: null, // 目標四邊形頂點 [{x,y}, {x,y}, {x,y}, {x,y}] (相對於 baseImg 座標系)
    liveDistortPreview: null,
    liveDistortOffset: null,
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
    } else if (!isExporting && layer === activeLayer && layer.distortMode && layer.distortCorners) {
      // 自由梯形變形「即時跟隨拉扯預覽」 + 九宮格參考輔助線
      drawLiveDistortLayer(layer);
    } else if (layer.image && (layer.image.complete || layer.image instanceof HTMLCanvasElement)) {
      ctx.drawImage(
        layer.image,
        -layer.width / 2,
        -layer.height / 2,
        layer.width,
        layer.height
      );

      // 若處於矩形裁切模式，繪製裁切半透明遮罩與 8 控制點
      if (!isExporting && layer === activeLayer && layer.rectCropMode && layer.cropRect) {
        drawLayerRectCropGuides(layer);
      }
    }

    ctx.restore();
  });

  // 3. 繪製選取框與控制柄
  if (!isExporting && activeLayer && !activeLayer.rectCropMode && !activeLayer.distortMode) {
    drawSelectionBox(activeLayer);
  }

  // 4. 繪製圖紙輸出範圍框與半透明暗色遮罩
  if (!isExporting && exportCropActive) {
    drawExportCropOverlay();
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

// --- 矩形裁切輔助繪製 ---
function drawLayerRectCropGuides(layer) {
  const hw = layer.width / 2;
  const hh = layer.height / 2;
  const cr = layer.cropRect;

  const cx = -hw + cr.x * layer.width;
  const cy = -hh + cr.y * layer.height;
  const cw = cr.w * layer.width;
  const ch = cr.h * layer.height;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.48)';
  ctx.fillRect(-hw, -hh, layer.width, cy - (-hh));
  ctx.fillRect(-hw, cy + ch, layer.width, hh - (cy + ch));
  ctx.fillRect(-hw, cy, cx - (-hw), ch);
  ctx.fillRect(cx + cw, cy, hw - (cx + cw), ch);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3 / currentZoom;
  ctx.strokeRect(cx, cy, cw, ch);

  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 2 / currentZoom;
  ctx.setLineDash([8 / currentZoom, 4 / currentZoom]);
  ctx.strokeRect(cx, cy, cw, ch);
  ctx.setLineDash([]);

  const hs = 13 / currentZoom;
  const handles = [
    { id: 'tl', x: cx, y: cy },
    { id: 'tc', x: cx + cw / 2, y: cy },
    { id: 'tr', x: cx + cw, y: cy },
    { id: 'rc', x: cx + cw, y: cy + ch / 2 },
    { id: 'br', x: cx + cw, y: cy + ch },
    { id: 'bc', x: cx + cw / 2, y: cy + ch },
    { id: 'bl', x: cx, y: cy + ch },
    { id: 'lc', x: cx, y: cy + ch / 2 }
  ];

  handles.forEach(h => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.2 / currentZoom;
    ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
  });
}

// --- Photoshop 風格「即時跟隨拉扯」梯形變形 + 九宮格參考輔助線 ---
function drawLiveDistortLayer(layer) {
  const hw = layer.width / 2;
  const hh = layer.height / 2;
  const baseImg = layer.croppedImage || layer.rawImage;

  // 將 4 個目標角點轉換到物件局部顯示座標系
  const pts = layer.distortCorners.map(pt => ({
    x: (pt.x / baseImg.width) * layer.width - hw,
    y: (pt.y / baseImg.height) * layer.height - hh
  }));

  // 1. 繪製即時跟隨拉扯變形的圖片預覽
  if (layer.liveDistortPreview && layer.liveDistortOffset) {
    const off = layer.liveDistortOffset;
    const drawX = (off.minX / baseImg.width) * layer.width - hw;
    const drawY = (off.minY / baseImg.height) * layer.height - hh;
    const drawW = (off.w / baseImg.width) * layer.width;
    const drawH = (off.h / baseImg.height) * layer.height;
    ctx.drawImage(layer.liveDistortPreview, drawX, drawY, drawW, drawH);
  } else {
    ctx.drawImage(baseImg, -hw, -hh, layer.width, layer.height);
  }

  // 2. 繪製九宮格透視網格線 (連接四邊的 1/3 與 2/3 分割點，即時反映透視變形)
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 63, 188, 0.55)';
  ctx.lineWidth = 1.6 / currentZoom;
  ctx.setLineDash([6 / currentZoom, 4 / currentZoom]);

  for (let i = 1; i <= 2; i++) {
    const t = i / 3;
    // 水平等分線
    const leftPt = {
      x: pts[0].x + (pts[3].x - pts[0].x) * t,
      y: pts[0].y + (pts[3].y - pts[0].y) * t
    };
    const rightPt = {
      x: pts[1].x + (pts[2].x - pts[1].x) * t,
      y: pts[1].y + (pts[2].y - pts[1].y) * t
    };
    ctx.beginPath();
    ctx.moveTo(leftPt.x, leftPt.y);
    ctx.lineTo(rightPt.x, rightPt.y);
    ctx.stroke();

    // 垂直等分線
    const topPt = {
      x: pts[0].x + (pts[1].x - pts[0].x) * t,
      y: pts[0].y + (pts[1].y - pts[0].y) * t
    };
    const botPt = {
      x: pts[3].x + (pts[2].x - pts[3].x) * t,
      y: pts[3].y + (pts[2].y - pts[3].y) * t
    };
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(botPt.x, botPt.y);
    ctx.stroke();
  }
  ctx.restore();

  // 3. 繪製外圍水平/垂直標準參考矩形虛線框 (方便對齊水平與垂直邊)
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));

  ctx.save();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
  ctx.lineWidth = 1.5 / currentZoom;
  ctx.setLineDash([4 / currentZoom, 4 / currentZoom]);
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  ctx.restore();

  // 4. 繪製四邊形外框與四個控制標籤
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4 / currentZoom;
  ctx.stroke();

  ctx.strokeStyle = '#D32F2F';
  ctx.lineWidth = 2.6 / currentZoom;
  ctx.setLineDash([10 / currentZoom, 6 / currentZoom]);
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

// 更新即時梯形扭曲預覽畫布 (Forward Distort: 原圖矩形 -> 目標四邊形)
function updateLiveDistortPreview(layer, maxDim = 650) {
  const baseImg = layer.croppedImage || layer.rawImage;
  const corners = layer.distortCorners;
  if (!baseImg || !corners || corners.length !== 4) return;

  const result = forwardWarpQuadPureJS(baseImg, corners, maxDim);
  if (result) {
    layer.liveDistortPreview = result.canvas;
    layer.liveDistortOffset = result.offset;
  }
}

// --- 繪製圖紙輸出範圍框與半透明暗色遮罩 ---
function drawExportCropOverlay() {
  ctx.save();

  const rx = exportCropRect.x;
  const ry = exportCropRect.y;
  const rw = exportCropRect.width;
  const rh = exportCropRect.height;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.48)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, ry);
  ctx.fillRect(0, ry + rh, CANVAS_WIDTH, CANVAS_HEIGHT - (ry + rh));
  ctx.fillRect(0, ry, rx, rh);
  ctx.fillRect(rx + rw, ry, CANVAS_WIDTH - (rx + rw), rh);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5 / currentZoom;
  ctx.strokeRect(rx, ry, rw, rh);

  ctx.strokeStyle = '#003FBC';
  ctx.lineWidth = 2.2 / currentZoom;
  ctx.setLineDash([12 / currentZoom, 8 / currentZoom]);
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.setLineDash([]);

  const hs = 14 / currentZoom;
  const handles = [
    { id: 'tl', x: rx, y: ry },
    { id: 'tc', x: rx + rw / 2, y: ry },
    { id: 'tr', x: rx + rw, y: ry },
    { id: 'rc', x: rx + rw, y: ry + rh / 2 },
    { id: 'br', x: rx + rw, y: ry + rh },
    { id: 'bc', x: rx + rw / 2, y: ry + rh },
    { id: 'bl', x: rx, y: ry + rh },
    { id: 'lc', x: rx, y: ry + rh / 2 }
  ];

  handles.forEach(h => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
    ctx.strokeStyle = '#003FBC';
    ctx.lineWidth = 2.5 / currentZoom;
    ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
  });

  const badgeText = `輸出範圍：${Math.round(rw)} × ${Math.round(rh)} px`;
  ctx.font = `bold ${Math.round(13 / currentZoom)}px -apple-system, sans-serif`;
  const textW = ctx.measureText(badgeText).width;
  const badgeH = 26 / currentZoom;
  const badgeW = textW + 20 / currentZoom;
  const badgeY = (ry >= badgeH + 6) ? (ry - badgeH - 6) : (ry + 8);
  const badgeX = rx + 8;

  ctx.fillStyle = '#003FBC';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 / currentZoom);
  } else {
    ctx.rect(badgeX, badgeY, badgeW, badgeH);
  }
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + 10 / currentZoom, badgeY + badgeH / 2);

  ctx.restore();
}

// --- 圖紙輸出範圍命中測試 ---
function hitTestExportCrop(x, y) {
  if (!exportCropActive) return null;

  const rx = exportCropRect.x;
  const ry = exportCropRect.y;
  const rw = exportCropRect.width;
  const rh = exportCropRect.height;
  const hitRadius = 18 / currentZoom;

  const handles = [
    { id: 'tl', x: rx, y: ry },
    { id: 'tc', x: rx + rw / 2, y: ry },
    { id: 'tr', x: rx + rw, y: ry },
    { id: 'rc', x: rx + rw, y: ry + rh / 2 },
    { id: 'br', x: rx + rw, y: ry + rh },
    { id: 'bc', x: rx + rw / 2, y: ry + rh },
    { id: 'bl', x: rx, y: ry + rh },
    { id: 'lc', x: rx, y: ry + rh / 2 }
  ];

  for (let h of handles) {
    if (Math.hypot(x - h.x, y - h.y) <= hitRadius) {
      return { part: 'export_crop_handle', handle: h.id };
    }
  }

  const borderDist = 12 / currentZoom;
  const nearTop = Math.abs(y - ry) <= borderDist && x >= rx && x <= rx + rw;
  const nearBottom = Math.abs(y - (ry + rh)) <= borderDist && x >= rx && x <= rx + rw;
  const nearLeft = Math.abs(x - rx) <= borderDist && y >= ry && y <= ry + rh;
  const nearRight = Math.abs(x - (rx + rw)) <= borderDist && y >= ry && y <= ry + rh;

  if (nearTop || nearBottom || nearLeft || nearRight) {
    return { part: 'export_crop_body' };
  }

  return null;
}

// --- 物件命中測試 (Hit-Testing) ---
function hitTest(x, y) {
  // 1. 若目前選取物件處於自由梯形變形模式，優先偵測 4 角點
  if (activeLayer && activeLayer.type === 'image' && activeLayer.distortMode && activeLayer.distortCorners) {
    const layer = activeLayer;
    const dx = x - layer.x;
    const dy = y - layer.y;
    const localX = dx * Math.cos(-layer.rotation) - dy * Math.sin(-layer.rotation);
    const localY = dx * Math.sin(-layer.rotation) + dy * Math.cos(-layer.rotation);
    const hw = layer.width / 2;
    const hh = layer.height / 2;
    const baseImg = layer.croppedImage || layer.rawImage;

    const pts = layer.distortCorners.map(pt => ({
      x: (pt.x / baseImg.width) * layer.width - hw,
      y: (pt.y / baseImg.height) * layer.height - hh
    }));

    const hitRadius = 28 / currentZoom;
    for (let cIdx = 0; cIdx < 4; cIdx++) {
      if (Math.hypot(localX - pts[cIdx].x, localY - pts[cIdx].y) <= hitRadius) {
        return { layer, part: 'distort_corner', cornerIdx: cIdx };
      }
    }
  }

  // 2. 若目前選取物件處於矩形裁切模式，偵測 8 個裁切控制柄與裁切框主體
  if (activeLayer && activeLayer.type === 'image' && activeLayer.rectCropMode && activeLayer.cropRect) {
    const layer = activeLayer;
    const dx = x - layer.x;
    const dy = y - layer.y;
    const localX = dx * Math.cos(-layer.rotation) - dy * Math.sin(-layer.rotation);
    const localY = dx * Math.sin(-layer.rotation) + dy * Math.cos(-layer.rotation);
    const hw = layer.width / 2;
    const hh = layer.height / 2;
    const cr = layer.cropRect;

    const cx = -hw + cr.x * layer.width;
    const cy = -hh + cr.y * layer.height;
    const cw = cr.w * layer.width;
    const ch = cr.h * layer.height;
    const hitRadius = 18 / currentZoom;

    const handles = [
      { id: 'tl', x: cx, y: cy },
      { id: 'tc', x: cx + cw / 2, y: cy },
      { id: 'tr', x: cx + cw, y: cy },
      { id: 'rc', x: cx + cw, y: cy + ch / 2 },
      { id: 'br', x: cx + cw, y: cy + ch },
      { id: 'bc', x: cx + cw / 2, y: cy + ch },
      { id: 'bl', x: cx, y: cy + ch },
      { id: 'lc', x: cx, y: cy + ch / 2 }
    ];

    for (let h of handles) {
      if (Math.hypot(localX - h.x, localY - h.y) <= hitRadius) {
        return { layer, part: 'rect_crop_handle', handle: h.id };
      }
    }

    if (localX >= cx && localX <= cx + cw && localY >= cy && localY <= cy + ch) {
      return { layer, part: 'rect_crop_body' };
    }
  }

  // 3. 偵測圖紙輸出範圍框把手與邊框
  const expHit = hitTestExportCrop(x, y);
  if (expHit) {
    return expHit;
  }

  // 4. 偵測目前選取物件之一般控制把手 (旋轉與 4 角等比例縮放)
  if (activeLayer && !activeLayer.rectCropMode && !activeLayer.distortMode) {
    const layer = activeLayer;
    const dx = x - layer.x;
    const dy = y - layer.y;
    const localX = dx * Math.cos(-layer.rotation) - dy * Math.sin(-layer.rotation);
    const localY = dx * Math.sin(-layer.rotation) + dy * Math.cos(-layer.rotation);
    const hw = layer.width / 2;
    const hh = layer.height / 2;
    const handleHitRadius = 20 / currentZoom;
    const rotStemLength = 32 / currentZoom;

    if (Math.hypot(localX - 0, localY - (-hh - rotStemLength)) <= handleHitRadius) {
      return { layer, part: 'rot' };
    }

    if (Math.hypot(localX - (-hw), localY - (-hh)) <= handleHitRadius) return { layer, part: 'tl' };
    if (Math.hypot(localX - hw, localY - (-hh)) <= handleHitRadius) return { layer, part: 'tr' };
    if (Math.hypot(localX - hw, localY - hh) <= handleHitRadius) return { layer, part: 'br' };
    if (Math.hypot(localX - (-hw), localY - hh) <= handleHitRadius) return { layer, part: 'bl' };
  }

  // 5. 由頂層往底層偵測物件本體 (body)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const dx = x - layer.x;
    const dy = y - layer.y;
    const localX = dx * Math.cos(-layer.rotation) - dy * Math.sin(-layer.rotation);
    const localY = dx * Math.sin(-layer.rotation) + dy * Math.cos(-layer.rotation);
    const hw = layer.width / 2;
    const hh = layer.height / 2;

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
    dragStartX = coords.x;
    dragStartY = coords.y;

    if (hit.part === 'export_crop_handle' || hit.part === 'export_crop_body') {
      isDraggingExportCrop = true;
      exportCropDragPart = hit.handle || 'body';
      exportCropInitialRect = { ...exportCropRect };
      render();
      return;
    }

    setActiveLayer(hit.layer);

    objInitialState = {
      x: hit.layer.x,
      y: hit.layer.y,
      width: hit.layer.width,
      height: hit.layer.height,
      rotation: hit.layer.rotation,
      fontSize: hit.layer.fontSize
    };

    if (hit.part === 'distort_corner') {
      isDraggingDistortCorner = hit.cornerIdx;
    } else if (hit.part === 'rect_crop_handle' || hit.part === 'rect_crop_body') {
      isDraggingRectCrop = true;
      rectCropDragPart = hit.handle || 'body';
      rectCropInitialState = { ...hit.layer.cropRect };
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
  const coords = getCanvasCoords(e);
  const dx = coords.x - dragStartX;
  const dy = coords.y - dragStartY;

  // 1. 拖曳圖紙輸出範圍框
  if (isDraggingExportCrop) {
    const orig = exportCropInitialRect;
    let newX = orig.x;
    let newY = orig.y;
    let newW = orig.width;
    let newH = orig.height;

    if (exportCropDragPart === 'body') {
      newX = Math.max(0, Math.min(CANVAS_WIDTH - orig.width, orig.x + dx));
      newY = Math.max(0, Math.min(CANVAS_HEIGHT - orig.height, orig.y + dy));
    } else {
      if (exportCropDragPart.includes('r')) newW = Math.max(200, orig.width + dx);
      if (exportCropDragPart.includes('b')) newH = Math.max(200, orig.height + dy);
      if (exportCropDragPart.includes('l')) {
        const potentialW = orig.width - dx;
        if (potentialW >= 200) {
          newX = orig.x + dx;
          newW = potentialW;
        }
      }
      if (exportCropDragPart.includes('t')) {
        const potentialH = orig.height - dy;
        if (potentialH >= 200) {
          newY = orig.y + dy;
          newH = potentialH;
        }
      }

      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      if (newX + newW > CANVAS_WIDTH) newW = CANVAS_WIDTH - newX;
      if (newY + newH > CANVAS_HEIGHT) newH = CANVAS_HEIGHT - newY;
    }

    exportCropRect = { x: newX, y: newY, width: newW, height: newH };
    updateExportDimensionDisplay();
    render();
    return;
  }

  if (!activeLayer) return;

  // 2. 拖曳自由梯形變形角點 (Photoshop Distort — 允許往外超出原框自由拉寬，並即時渲染圖片)
  if (isDraggingDistortCorner >= 0 && activeLayer.distortMode) {
    const hw = activeLayer.width / 2;
    const hh = activeLayer.height / 2;
    const localX = (coords.x - activeLayer.x) * Math.cos(-activeLayer.rotation) - (coords.y - activeLayer.y) * Math.sin(-activeLayer.rotation);
    const localY = (coords.x - activeLayer.x) * Math.sin(-activeLayer.rotation) + (coords.y - activeLayer.y) * Math.cos(-activeLayer.rotation);

    const baseImg = activeLayer.croppedImage || activeLayer.rawImage;
    // 允許角點向外拉伸至原圖寬高的 -60% ~ +160%，方便把窄梯形拉寬成正長方形
    const minAllowX = -baseImg.width * 0.6;
    const maxAllowX = baseImg.width * 1.6;
    const minAllowY = -baseImg.height * 0.6;
    const maxAllowY = baseImg.height * 1.6;

    const rawX = Math.max(minAllowX, Math.min(maxAllowX, ((localX + hw) / activeLayer.width) * baseImg.width));
    const rawY = Math.max(minAllowY, Math.min(maxAllowY, ((localY + hh) / activeLayer.height) * baseImg.height));

    activeLayer.distortCorners[isDraggingDistortCorner] = { x: rawX, y: rawY };
    updateLiveDistortPreview(activeLayer, 650);
    render();
    return;
  }

  // 3. 拖曳矩形裁切框
  if (isDraggingRectCrop && activeLayer.rectCropMode) {
    const orig = rectCropInitialState;
    const localDx = (dx * Math.cos(-activeLayer.rotation) - dy * Math.sin(-activeLayer.rotation)) / activeLayer.width;
    const localDy = (dx * Math.sin(-activeLayer.rotation) + dy * Math.cos(-activeLayer.rotation)) / activeLayer.height;

    let nx = orig.x;
    let ny = orig.y;
    let nw = orig.w;
    let nh = orig.h;

    if (rectCropDragPart === 'body') {
      nx = Math.max(0, Math.min(1 - orig.w, orig.x + localDx));
      ny = Math.max(0, Math.min(1 - orig.h, orig.y + localDy));
    } else {
      if (rectCropDragPart.includes('r')) nw = Math.max(0.05, Math.min(1 - orig.x, orig.w + localDx));
      if (rectCropDragPart.includes('b')) nh = Math.max(0.05, Math.min(1 - orig.y, orig.h + localDy));
      if (rectCropDragPart.includes('l')) {
        const potentialW = orig.w - localDx;
        if (potentialW >= 0.05 && orig.x + localDx >= 0) {
          nx = orig.x + localDx;
          nw = potentialW;
        }
      }
      if (rectCropDragPart.includes('t')) {
        const potentialH = orig.h - localDy;
        if (potentialH >= 0.05 && orig.y + localDy >= 0) {
          ny = orig.y + localDy;
          nh = potentialH;
        }
      }
    }

    activeLayer.cropRect = { x: nx, y: ny, w: nw, h: nh };
    render();
    return;
  }

  // 4. 移動物件
  if (isDragging) {
    activeLayer.x = objInitialState.x + dx;
    activeLayer.y = objInitialState.y + dy;
    render();
    return;
  }

  // 5. 旋轉物件
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

  // 6. 等比例縮放
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

  // 7. 動態調整滑鼠游標樣式
  const hit = hitTest(coords.x, coords.y);
  if (hit) {
    if (hit.part === 'rot') canvas.style.cursor = 'grab';
    else if (['tl', 'br'].includes(hit.part) || ['tl', 'br'].includes(hit.handle)) canvas.style.cursor = 'nwse-resize';
    else if (['tr', 'bl'].includes(hit.part) || ['tr', 'bl'].includes(hit.handle)) canvas.style.cursor = 'nesw-resize';
    else if (['tc', 'bc'].includes(hit.handle)) canvas.style.cursor = 'ns-resize';
    else if (['lc', 'rc'].includes(hit.handle)) canvas.style.cursor = 'ew-resize';
    else if (hit.part === 'distort_corner') canvas.style.cursor = 'crosshair';
    else canvas.style.cursor = 'move';
  } else {
    canvas.style.cursor = 'default';
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  isResizing = false;
  isRotating = false;
  isDraggingDistortCorner = -1;
  isDraggingRectCrop = false;
  rectCropDragPart = null;
  rectCropInitialState = null;
  isDraggingExportCrop = false;
  exportCropDragPart = null;
  exportCropInitialRect = null;
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
  } else if (e.key === 'Enter' && activeLayer && activeLayer.type === 'image') {
    if (activeLayer.rectCropMode) {
      e.preventDefault();
      btnApplyRectCrop.click();
    } else if (activeLayer.distortMode) {
      e.preventDefault();
      btnApplyDistort.click();
    }
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

// --- 雙擊事件：對著照片點兩下快速開啟/套用「矩形裁切」，對著文字點兩下編輯文字 ---
canvas.addEventListener('dblclick', e => {
  const coords = getCanvasCoords(e);
  const hit = hitTest(coords.x, coords.y);
  if (!hit || !hit.layer) return;

  if (hit.layer.type === 'image') {
    setActiveLayer(hit.layer);
    if (hit.layer.rectCropMode) {
      btnApplyRectCrop.click();
    } else {
      if (hit.layer.distortMode) {
        hit.layer.distortMode = false;
        updateDistortUI(hit.layer);
      }
      hit.layer.rectCropMode = true;
      if (!hit.layer.cropRect) {
        hit.layer.cropRect = { x: 0.04, y: 0.04, w: 0.92, h: 0.92 };
      }
      updateRectCropUI(hit.layer);
      render();
      showToast('已開啟矩形裁切（拖曳框線去除桌面，完成後再點兩下照片即可）');
    }
  } else if (hit.layer.type === 'text') {
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

    updateRectCropUI(layer);
    updateDistortUI(layer);

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

// --- 訂購單 4.5x 超高解析度讀取與 +12px 精準切線 ---
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
    const scale = 4.5;
    const viewport = page.getViewport({ scale });

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = viewport.width;
    fullCanvas.height = viewport.height;
    const renderCtx = fullCanvas.getContext('2d');
    renderCtx.imageSmoothingEnabled = true;
    renderCtx.imageSmoothingQuality = 'high';

    await page.render({ canvasContext: renderCtx, viewport }).promise;

    // 讀取內文文字座標與純文字 (供 OCR 交叉輔助辨識)
    const textContent = await page.getTextContent();
    const pageHeightPt = page.view[3] - page.view[1];
    const extractedStrings = [];

    const keywordsRow = ['實收訂金', '尚餘尾款', '總金額', '含稅', '訂金金額'];
    const keywordsCutoff = ['施工確認', '施工確認項目', '注意事項', '客戶簽名', '訂購人簽名'];

    let foundYList = [];
    let stopYList = [];

    textContent.items.forEach(item => {
      const text = item.str || '';
      if (text.trim()) extractedStrings.push(text.trim());
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
      cropYInCanvas = Math.max(...foundYList) + 12;
    } else if (stopYList.length > 0) {
      cropYInCanvas = Math.min(...stopYList) - 10;
    } else {
      cropYInCanvas = fullCanvas.height * 0.60;
    }

    cropYInCanvas = Math.max(150, Math.min(fullCanvas.height, cropYInCanvas));
    const cropRatio = cropYInCanvas / fullCanvas.height;

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

    const orderDisplayW = Math.round(CANVAS_WIDTH * 0.63);
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
      rawPdfText: extractedStrings.join(' '),
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

// --- 1. 圖片進場處理 (嚴格維持 100% 原始長寬比例進場) ---
function importImagePureFrontend(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const sw = img.width;
        const sh = img.height;

        const isHorizontal = sw >= sh;
        let displayW, displayH, posX, posY;

        if (isHorizontal) {
          displayW = Math.round(CANVAS_WIDTH * 0.58);
          const aspect = sw / sh;
          displayH = Math.round(displayW / aspect);

          const marginX = 40;
          const marginY = 40;
          posX = marginX + displayW / 2;
          posY = CANVAS_HEIGHT - marginY - displayH / 2;
        } else {
          displayH = Math.round(CANVAS_HEIGHT * 0.88);
          const aspect = sw / sh;
          displayW = Math.round(displayH * aspect);

          const marginX = 40;
          posX = CANVAS_WIDTH - marginX - displayW / 2;
          posY = CANVAS_HEIGHT / 2;
        }

        const newLayer = createLayerObject({
          type: 'image',
          name: file.name,
          image: img,
          rawImage: img,
          width: displayW,
          height: displayH,
          x: posX,
          y: posY
        });

        layers.push(newLayer);
        setActiveLayer(newLayer);

        showToast(`已載入原圖: ${file.name}`);
        resolve();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- 2. 矩形裁切 (去桌面背景工具) ---
function updateRectCropUI(layer) {
  if (!layer || layer.type !== 'image') return;
  const inMode = !!layer.rectCropMode;

  btnToggleRectCrop.textContent = inMode ? '關閉裁切模式' : '開啟矩形裁切';
  if (inMode) {
    btnToggleRectCrop.classList.add('active', 'btn-primary');
    btnToggleRectCrop.classList.remove('btn-outline');
    rectCropNotice.classList.remove('hidden');
    btnApplyRectCrop.classList.remove('hidden');
  } else {
    btnToggleRectCrop.classList.remove('active', 'btn-primary');
    btnToggleRectCrop.classList.add('btn-outline');
    rectCropNotice.classList.add('hidden');
    btnApplyRectCrop.classList.add('hidden');
  }

  if (layer.croppedImage) {
    btnRevertRectCrop.classList.remove('hidden');
  } else {
    btnRevertRectCrop.classList.add('hidden');
  }
}

btnToggleRectCrop.addEventListener('click', () => {
  if (!activeLayer || activeLayer.type !== 'image') return;

  activeLayer.rectCropMode = !activeLayer.rectCropMode;
  if (activeLayer.rectCropMode) {
    if (activeLayer.distortMode) {
      activeLayer.distortMode = false;
      updateDistortUI(activeLayer);
    }
    if (!activeLayer.cropRect) {
      activeLayer.cropRect = { x: 0.04, y: 0.04, w: 0.92, h: 0.92 };
    }
  }

  updateRectCropUI(activeLayer);
  render();
});

btnApplyRectCrop.addEventListener('click', () => {
  if (!activeLayer || !activeLayer.cropRect) return;

  const baseImg = activeLayer.rawImage;
  const cr = activeLayer.cropRect;

  const sx = Math.round(cr.x * baseImg.width);
  const sy = Math.round(cr.y * baseImg.height);
  const sw = Math.max(10, Math.round(cr.w * baseImg.width));
  const sh = Math.max(10, Math.round(cr.h * baseImg.height));

  const cCanvas = document.createElement('canvas');
  cCanvas.width = sw;
  cCanvas.height = sh;
  const cCtx = cCanvas.getContext('2d');
  cCtx.imageSmoothingEnabled = true;
  cCtx.imageSmoothingQuality = 'high';
  cCtx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, sw, sh);

  activeLayer.croppedImage = cCanvas;
  activeLayer.warpedImage = null;
  activeLayer.image = cCanvas;
  activeLayer.width = Math.round(activeLayer.width * cr.w);
  activeLayer.height = Math.round(activeLayer.height * cr.h);
  activeLayer.rectCropMode = false;
  activeLayer.cropRect = null;
  activeLayer.distortCorners = null;
  activeLayer.liveDistortPreview = null;

  if (activeLayer.scanEnhance) {
    applyDocumentEnhancePureJS(activeLayer);
  }

  updateRectCropUI(activeLayer);
  updateDistortUI(activeLayer);
  updateLayersListUI();
  render();
  showToast('矩形裁切已完成');
});

btnRevertRectCrop.addEventListener('click', () => {
  if (!activeLayer || !activeLayer.rawImage) return;

  activeLayer.croppedImage = null;
  activeLayer.warpedImage = null;
  activeLayer.image = activeLayer.rawImage;
  activeLayer.cropRect = null;
  activeLayer.rectCropMode = false;
  activeLayer.distortCorners = null;
  activeLayer.liveDistortPreview = null;

  const aspect = activeLayer.rawImage.width / activeLayer.rawImage.height;
  activeLayer.height = Math.round(activeLayer.width / aspect);

  if (activeLayer.scanEnhance) {
    applyDocumentEnhancePureJS(activeLayer);
  }

  updateRectCropUI(activeLayer);
  updateDistortUI(activeLayer);
  updateLayersListUI();
  render();
  showToast('已還原原始未裁切圖片');
});

// --- 2. 自由梯形變形 (Photoshop 即時跟隨拉扯 Distort) ---
function updateDistortUI(layer) {
  if (!layer || layer.type !== 'image') return;
  const inMode = !!layer.distortMode;

  btnToggleDistortMode.textContent = inMode ? '關閉變形模式' : '開啟自由梯形變形';
  if (inMode) {
    btnToggleDistortMode.classList.add('active', 'btn-primary');
    btnToggleDistortMode.classList.remove('btn-outline');
    distortNotice.classList.remove('hidden');
    btnApplyDistort.classList.remove('hidden');
  } else {
    btnToggleDistortMode.classList.remove('active', 'btn-primary');
    btnToggleDistortMode.classList.add('btn-outline');
    distortNotice.classList.add('hidden');
    btnApplyDistort.classList.add('hidden');
  }

  if (layer.warpedImage) {
    btnRevertDistort.classList.remove('hidden');
  } else {
    btnRevertDistort.classList.add('hidden');
  }
}

btnToggleDistortMode.addEventListener('click', () => {
  if (!activeLayer || activeLayer.type !== 'image') return;

  activeLayer.distortMode = !activeLayer.distortMode;
  if (activeLayer.distortMode) {
    if (activeLayer.rectCropMode) {
      activeLayer.rectCropMode = false;
      updateRectCropUI(activeLayer);
    }

    const baseImg = activeLayer.croppedImage || activeLayer.rawImage;
    if (!activeLayer.distortCorners || activeLayer.distortCorners.length !== 4) {
      activeLayer.distortCorners = [
        { x: 0, y: 0 },
        { x: baseImg.width, y: 0 },
        { x: baseImg.width, y: baseImg.height },
        { x: 0, y: baseImg.height }
      ];
    }
    updateLiveDistortPreview(activeLayer, 650);
  }

  updateDistortUI(activeLayer);
  render();
});

// 套用自由梯形變形 (以 100% 高解析度把原圖扭曲映射至目標四邊形並定型)
btnApplyDistort.addEventListener('click', () => {
  if (!activeLayer || !activeLayer.distortCorners || activeLayer.distortCorners.length !== 4) return;
  showToast('正在套用高解析度梯形變形...');

  const baseImg = activeLayer.croppedImage || activeLayer.rawImage;
  const corners = activeLayer.distortCorners;

  // maxDim 設為 0 代表使用 100% 原始高解析像素計算
  const result = forwardWarpQuadPureJS(baseImg, corners, 0);
  if (result && result.canvas) {
    activeLayer.warpedImage = result.canvas;
    activeLayer.image = result.canvas;

    // 同步更新圖層在畫布上的顯示尺寸與中心位置，確保與預覽畫面分毫不差
    const scaleX = activeLayer.width / baseImg.width;
    const scaleY = activeLayer.height / baseImg.height;
    const oldCenterLocalX = (result.offset.minX + result.offset.w / 2) - baseImg.width / 2;
    const oldCenterLocalY = (result.offset.minY + result.offset.h / 2) - baseImg.height / 2;

    const shiftX = oldCenterLocalX * scaleX;
    const shiftY = oldCenterLocalY * scaleY;
    activeLayer.x += shiftX * Math.cos(activeLayer.rotation) - shiftY * Math.sin(activeLayer.rotation);
    activeLayer.y += shiftX * Math.sin(activeLayer.rotation) + shiftY * Math.cos(activeLayer.rotation);

    activeLayer.width = Math.max(30, Math.round(result.offset.w * scaleX));
    activeLayer.height = Math.max(30, Math.round(result.offset.h * scaleY));

    activeLayer.distortMode = false;
    activeLayer.distortCorners = null;
    activeLayer.liveDistortPreview = null;
    activeLayer.liveDistortOffset = null;

    if (activeLayer.scanEnhance) {
      applyDocumentEnhancePureJS(activeLayer);
    }

    updateDistortUI(activeLayer);
    updateLayersListUI();
    render();
    showToast('自由梯形變形已套用完成');
  }
});

btnRevertDistort.addEventListener('click', () => {
  if (!activeLayer) return;

  activeLayer.warpedImage = null;
  activeLayer.image = activeLayer.croppedImage || activeLayer.rawImage;
  activeLayer.distortCorners = null;
  activeLayer.liveDistortPreview = null;
  activeLayer.liveDistortOffset = null;
  activeLayer.distortMode = false;

  const aspect = activeLayer.image.width / activeLayer.image.height;
  activeLayer.height = Math.round(activeLayer.width / aspect);

  if (activeLayer.scanEnhance) {
    applyDocumentEnhancePureJS(activeLayer);
  }

  updateDistortUI(activeLayer);
  updateLayersListUI();
  render();
  showToast('已還原未變形圖片');
});

/**
 * 正向四邊形透視拉伸演算法 (Forward Distort Warp)
 * 將原始矩形圖片 (0,0)-(sw,sh) 映射到使用者拖曳出的任意四邊形 dstCorners [TL, TR, BR, BL]
 * @param {HTMLImageElement|HTMLCanvasElement} srcImg
 * @param {Array<{x:number,y:number}>} dstCorners
 * @param {number} maxDim 若大於 0 則限制輸出最大邊長以供 60fps 即時拖曳預覽；0 則為 100% 原解析度
 */
function forwardWarpQuadPureJS(srcImg, dstCorners, maxDim = 0) {
  const sw = srcImg.width;
  const sh = srcImg.height;

  const minX = Math.min(...dstCorners.map(p => p.x));
  const maxX = Math.max(...dstCorners.map(p => p.x));
  const minY = Math.min(...dstCorners.map(p => p.y));
  const maxY = Math.max(...dstCorners.map(p => p.y));

  const bboxW = Math.max(10, maxX - minX);
  const bboxH = Math.max(10, maxY - minY);

  let scale = 1.0;
  if (maxDim > 0 && Math.max(bboxW, bboxH) > maxDim) {
    scale = maxDim / Math.max(bboxW, bboxH);
  }

  const outW = Math.max(10, Math.round(bboxW * scale));
  const outH = Math.max(10, Math.round(bboxH * scale));

  // 建立單位正方形 [0,1]^2 -> 目標四邊形 (正規化至 [0, outW] x [0, outH]) 之 Homography 矩陣 H
  const q = dstCorners.map(p => ({
    x: (p.x - minX) * scale,
    y: (p.y - minY) * scale
  }));

  const x0 = q[0].x, y0 = q[0].y;
  const x1 = q[1].x, y1 = q[1].y;
  const x2 = q[2].x, y2 = q[2].y;
  const x3 = q[3].x, y3 = q[3].y;

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

  // 計算伴隨矩陣 (Adjugate Matrix) 作為逆矩陣 H^-1，將輸出畫布上的每個目標像素反查回原圖 [0,1]^2
  const invA = e - f * h;
  const invB = c * h - b;
  const invC = b * f - c * e;
  const invD = f * g - d;
  const invE = a - c * g;
  const invF = c * d - a * f;
  const invG = d * h - e * g;
  const invH = b * g - a * h;
  const invI = a * e - b * d;

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

  for (let y = 0; y < outH; y++) {
    const rowOffset = y * outW * 4;
    for (let x = 0; x < outW; x++) {
      const denom = invG * x + invH * y + invI;
      if (Math.abs(denom) < 1e-8) continue;

      const u = (invA * x + invB * y + invC) / denom;
      const v = (invD * x + invE * y + invF) / denom;

      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        const srcX = u * (sw - 1);
        const srcY = v * (sh - 1);
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

        const dIdx = rowOffset + x * 4;
        dPixels[dIdx] = Math.round(w00 * sPixels[idx00] + w10 * sPixels[idx10] + w01 * sPixels[idx01] + w11 * sPixels[idx11]);
        dPixels[dIdx + 1] = Math.round(w00 * sPixels[idx00 + 1] + w10 * sPixels[idx10 + 1] + w01 * sPixels[idx01 + 1] + w11 * sPixels[idx11 + 1]);
        dPixels[dIdx + 2] = Math.round(w00 * sPixels[idx00 + 2] + w10 * sPixels[idx10 + 2] + w01 * sPixels[idx01 + 2] + w11 * sPixels[idx11 + 2]);
        dPixels[dIdx + 3] = 255;
      }
    }
  }

  dCtx.putImageData(dstData, 0, 0);
  return {
    canvas: dstCanvas,
    offset: { minX, minY, w: bboxW, h: bboxH }
  };
}

// --- 文件掃描美化 (去陰影/增白/對比) ---
switchScanEnhance.addEventListener('change', () => {
  if (!activeLayer || activeLayer.type !== 'image') return;
  activeLayer.scanEnhance = switchScanEnhance.checked;

  if (activeLayer.scanEnhance) {
    enhanceSliders.classList.remove('hidden');
    applyDocumentEnhancePureJS(activeLayer);
  } else {
    enhanceSliders.classList.add('hidden');
    activeLayer.image = activeLayer.warpedImage || activeLayer.croppedImage || activeLayer.rawImage;
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

function applyDocumentEnhancePureJS(layer) {
  const baseImg = layer.warpedImage || layer.croppedImage || layer.rawImage;
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

  const thumbScale = Math.min(1.0, 160 / Math.max(w, h));
  const tw = Math.max(10, Math.round(w * thumbScale));
  const th = Math.max(10, Math.round(h * thumbScale));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = tw;
  thumbCanvas.height = th;
  const tCtx = thumbCanvas.getContext('2d');
  tCtx.drawImage(baseImg, 0, 0, tw, th);
  const thumbData = tCtx.getImageData(0, 0, tw, th).data;

  const lumThumb = new Float32Array(tw * th);
  for (let i = 0; i < thumbData.length; i += 4) {
    lumThumb[i / 4] = 0.299 * thumbData[i] + 0.587 * thumbData[i + 1] + 0.114 * thumbData[i + 2];
  }

  for (let y = 0; y < h; y++) {
    const ty = Math.min(th - 1, Math.floor(y * thumbScale));
    const rowOffset = y * w * 4;
    const thumbRowOffset = ty * tw;

    for (let x = 0; x < w; x++) {
      const tx = Math.min(tw - 1, Math.floor(x * thumbScale));
      const bgLum = Math.max(30, lumThumb[thumbRowOffset + tx]);

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

// --- 櫃位印章蓋上畫布 ---
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

    const displayW = 400;
    const displayH = Math.round((displayW * stampImg.height) / stampImg.width);

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

// --- 3. 單據文字辨識 (PDF 純文字 + Tesseract.js OCR) 與一鍵複製 ---
const BRAND_MAP = {
  'HITACHI': '日立',
  'LG': '樂金',
  'SAMSUNG': '三星',
  'PANASONIC': '國際',
  'MITSUBISHI': '三菱',
  'SHARP': '夏普',
  'DAIKIN': '大金',
  'TOSHIBA': '東芝',
  'SONY': '索尼',
  'CHIMEI': '奇美',
  'SAMPO': '聲寶',
  'TECO': '東元',
  'TATUNG': '大同',
  'DYSON': '戴森',
  'BOSCH': '博世',
  'WHIRLPOOL': '惠而浦'
};

btnRunOcr.addEventListener('click', async () => {
  if (layers.length === 0) {
    showToast('請先將訂單、發票或保卡放進畫布再進行辨識');
    return;
  }

  btnRunOcr.disabled = true;
  ocrStatusBox.classList.remove('hidden');
  ocrStatusBox.classList.add('loading');
  ocrStatusBox.textContent = '⏳ 正在分析畫布上的訂單、發票與保卡文字，首次啟動約需數秒...';

  try {
    let combinedText = '';

    // 1. 先收集所有 PDF 訂購單的 100% 精準內文
    layers.forEach(layer => {
      if (layer.type === 'pdf_order' && layer.rawPdfText) {
        combinedText += '\n' + layer.rawPdfText;
      }
    });

    // 2. 針對所有照片圖層 (保卡 / 發票) 執行 OCR
    const imageLayers = layers.filter(l => l.type === 'image' && l.image);
    if (imageLayers.length > 0 && window.Tesseract) {
      for (let i = 0; i < imageLayers.length; i++) {
        const layer = imageLayers[i];
        ocrStatusBox.textContent = `⏳ 正在辨識照片 (${i + 1}/${imageLayers.length})：${layer.name}...`;

        // 將目前圖層影像繪製到暫存 Canvas 以供辨識
        const tempCanvas = document.createElement('canvas');
        const img = layer.image;
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(img, 0, 0);

        const result = await window.Tesseract.recognize(tempCanvas, 'eng+chi_tra');
        if (result && result.data && result.data.text) {
          combinedText += '\n' + result.data.text;
        }
      }
    }

    const parsed = parseReceiptAndWarrantyText(combinedText);
    const formattedOutput = [
      `發票購買日期   ${parsed.date}`,
      `發票號碼  ${parsed.invoiceNo}`,
      `${parsed.brand}   ${parsed.model}`,
      `機號  ${parsed.serialNo}`,
      `賣方統編  24721268`
    ].join('\n');

    inputNewNote.value = formattedOutput;
    ocrStatusBox.classList.remove('loading');
    ocrStatusBox.textContent = '✅ 辨識完成！請確認下方文字是否正確（可微調後複製或加入畫布）。';
    showToast('單據資訊辨識完成！');
  } catch (err) {
    console.error('OCR 辨識發生錯誤:', err);
    ocrStatusBox.classList.remove('loading');
    ocrStatusBox.textContent = '⚠️ 辨識過程發生錯誤，請確認網路連線或手動輸入。';
    showToast('OCR 辨識失敗: ' + err.message);
  } finally {
    btnRunOcr.disabled = false;
  }
});

// 解析混合文字並萃取出指定 5 欄位
function parseReceiptAndWarrantyText(rawText) {
  const cleanText = rawText.replace(/\r/g, '\n');

  // 1. 發票購買日期 (固定西元 YYYY-MM-DD)
  let dateStr = '';
  const dateMatch = cleanText.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (dateMatch) {
    const yyyy = dateMatch[1];
    const mm = dateMatch[2].padStart(2, '0');
    const dd = dateMatch[3].padStart(2, '0');
    dateStr = `${yyyy}-${mm}-${dd}`;
  } else {
    const now = new Date();
    dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  // 2. 發票號碼 (2碼大寫英文 + 8碼數字，自動移除中間的 '-' 符號)
  let invoiceNo = '';
  const invMatch = cleanText.match(/\b([A-Z]{2})\s*[-]?\s*(\d{8})\b/);
  if (invMatch) {
    invoiceNo = `${invMatch[1]}${invMatch[2]}`;
  }

  // 3. 品牌英翻中對照
  let brandZh = '';
  const upperText = cleanText.toUpperCase();
  for (const [eng, zh] of Object.entries(BRAND_MAP)) {
    if (upperText.includes(eng)) {
      brandZh = zh;
      break;
    }
  }

  // 4. 商品型號 (優先抓帶連字號的家電型號如 BD-SX150JJ，或從 PDF 品名抓取)
  let modelStr = '';
  const hyphenModelMatch = upperText.match(/\b([A-Z]{2,4}-[A-Z0-9]{4,12})\b/);
  if (hyphenModelMatch) {
    modelStr = hyphenModelMatch[1];
  } else {
    // 嘗試從無連字號型號推測 (例如 BDSX150JJW -> BD-SX150JJ)
    const compactModelMatch = upperText.match(/\b([A-Z]{2})([A-Z]{2}\d{2,4}[A-Z0-9]{1,4})\b/);
    if (compactModelMatch) {
      modelStr = `${compactModelMatch[1]}-${compactModelMatch[2].replace(/W$/, '')}`;
    }
  }

  // 5. 機號 / 製造號碼 (排除發票號碼與統編，尋找如 T633868 的英數序號)
  let serialNo = '';
  const lines = cleanText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('機號') || line.includes('製造號碼') || line.includes('機 號')) {
      // 檢查同一行或下一行
      const targetScope = line + ' ' + (lines[i + 1] || '');
      const snMatch = targetScope.toUpperCase().match(/\b([A-Z0-9]{6,14})\b/g);
      if (snMatch) {
        const validSn = snMatch.find(token =>
          /\d/.test(token) &&
          token !== '24721268' &&
          token !== invoiceNo &&
          token !== modelStr.replace('-', '')
        );
        if (validSn) {
          serialNo = validSn;
          break;
        }
      }
    }
  }

  // 若關鍵字旁未抓到，從全文中搜尋符合「1~2碼英文 + 5~8碼數字」的製造機號 (如 T633868)
  if (!serialNo) {
    const fallbackSn = upperText.match(/\b([A-Z]{1,2}\d{5,8})\b/g);
    if (fallbackSn) {
      const candidate = fallbackSn.find(t => t !== invoiceNo);
      if (candidate) serialNo = candidate;
    }
  }

  return {
    date: dateStr,
    invoiceNo: invoiceNo || '(請手動確認發票號碼)',
    brand: brandZh || '(品牌)',
    model: modelStr || '(請確認型號)',
    serialNo: serialNo || '(請確認機號)'
  };
}

// 一鍵複製文字框內容
btnCopyNote.addEventListener('click', async () => {
  const text = (inputNewNote.value || '').trim();
  if (!text) {
    showToast('目前沒有可複製的文字內容');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast('已複製全部文字！可直接貼上 LINE 或申請網頁');
  } catch (err) {
    // 備用複製方式 (相容本機 file:/// 權限)
    inputNewNote.select();
    document.execCommand('copy');
    showToast('已複製全部文字！');
  }
});

// --- 審核備註文字加入畫布 ---
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
    y: 1580
  });

  layers.push(newTextLayer);
  setActiveLayer(newTextLayer);
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

// --- 圖紙輸出範圍控制項連動 ---
function toggleExportCrop(active) {
  exportCropActive = (typeof active === 'boolean') ? active : !exportCropActive;

  if (switchExportCrop) {
    switchExportCrop.checked = exportCropActive;
  }

  if (btnToggleExportCrop) {
    if (exportCropActive) {
      btnToggleExportCrop.classList.add('active', 'btn-primary');
      btnToggleExportCrop.classList.remove('btn-outline');
    } else {
      btnToggleExportCrop.classList.remove('active', 'btn-primary');
      btnToggleExportCrop.classList.add('btn-outline');
    }
  }

  updateExportDimensionDisplay();
  render();

  if (exportCropActive) {
    showToast('已開啟圖紙輸出範圍框，可自由拖曳四邊四角');
  } else {
    showToast('已關閉輸出範圍框，恢復全畫布匯出');
  }
}

if (btnToggleExportCrop) {
  btnToggleExportCrop.addEventListener('click', () => toggleExportCrop());
}

if (switchExportCrop) {
  switchExportCrop.addEventListener('change', () => toggleExportCrop(switchExportCrop.checked));
}

// --- 輸出解析度「大 / 中 / 小」三段選擇器與尺寸計算 ---
resBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    resBtns.forEach(b => {
      b.classList.remove('active', 'btn-primary');
      b.classList.add('btn-outline');
    });
    btn.classList.add('active', 'btn-primary');
    btn.classList.remove('btn-outline');
    exportScale = parseFloat(btn.dataset.scale) || 0.75;
    updateExportDimensionDisplay();
  });
});

function updateExportDimensionDisplay() {
  const baseW = exportCropActive ? exportCropRect.width : CANVAS_WIDTH;
  const baseH = exportCropActive ? exportCropRect.height : CANVAS_HEIGHT;
  const finalW = Math.round(baseW * exportScale);
  const finalH = Math.round(baseH * exportScale);

  if (exportDimensionLabel) {
    exportDimensionLabel.textContent = `${finalW} × ${finalH} px`;
  }
}

// --- 高解析度 PNG 匯出 ---
btnExportPng.addEventListener('click', () => {
  if (layers.length === 0) {
    showToast('畫布目前沒有任何物件');
    return;
  }

  const baseW = exportCropActive ? exportCropRect.width : CANVAS_WIDTH;
  const baseH = exportCropActive ? exportCropRect.height : CANVAS_HEIGHT;
  const finalW = Math.round(baseW * exportScale);
  const finalH = Math.round(baseH * exportScale);

  showToast(`正在產生 ${finalW} × ${finalH} px 高解析度圖片...`);

  const bufferCanvas = document.createElement('canvas');
  bufferCanvas.width = CANVAS_WIDTH;
  bufferCanvas.height = CANVAS_HEIGHT;
  const bufCtx = bufferCanvas.getContext('2d');
  bufCtx.imageSmoothingEnabled = true;
  bufCtx.imageSmoothingQuality = 'high';

  bufCtx.fillStyle = '#FFFFFF';
  bufCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  layers.forEach(layer => {
    bufCtx.save();
    bufCtx.translate(layer.x, layer.y);
    bufCtx.rotate(layer.rotation);
    if (layer.flipH) {
      bufCtx.scale(-1, 1);
    }

    if (layer.type === 'text') {
      const fontWeight = layer.bold ? 'bold ' : '';
      bufCtx.font = `${fontWeight}${layer.fontSize}px -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif`;
      bufCtx.fillStyle = layer.color;
      bufCtx.textBaseline = 'top';

      const lines = layer.text.split('\n');
      const lineHeight = layer.fontSize * 1.35;
      const startX = -layer.width / 2 + 15;
      const startY = -layer.height / 2 + 8;

      lines.forEach((line, idx) => {
        bufCtx.fillText(line, startX, startY + idx * lineHeight);
      });
    } else if (layer.image && (layer.image.complete || layer.image instanceof HTMLCanvasElement)) {
      bufCtx.drawImage(
        layer.image,
        -layer.width / 2,
        -layer.height / 2,
        layer.width,
        layer.height
      );
    }

    bufCtx.restore();
  });

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = finalW;
  exportCanvas.height = finalH;
  const expCtx = exportCanvas.getContext('2d');
  expCtx.imageSmoothingEnabled = true;
  expCtx.imageSmoothingQuality = 'high';

  if (exportCropActive) {
    const sx = Math.round(exportCropRect.x);
    const sy = Math.round(exportCropRect.y);
    const sw = Math.round(exportCropRect.width);
    const sh = Math.round(exportCropRect.height);
    expCtx.drawImage(bufferCanvas, sx, sy, sw, sh, 0, 0, finalW, finalH);
  } else {
    expCtx.drawImage(bufferCanvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0, finalW, finalH);
  }

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
    showToast(`已成功下載圖片: ${filename} (${finalW} × ${finalH} px)`);
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