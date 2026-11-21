/**
 * 訂單、保卡與發票拼貼工作台 - 100% 純前端 300DPI 印刷級高解析版
 * 畫布規格: 3508 x 2480 px (橫向 A4 300DPI 印刷級標準)
 * 專櫃色碼: #003FBC
 * 核心功能:
 * 1. 圖片進場 100% 原始長寬比（無自動變形，手動精確控制）
 * 2. 雙擊（點兩下）照片快速開啟/完成「矩形裁切（去桌面背景）」
 * 3. Photoshop 風格「即時跟隨拉扯」自由梯形變形 + 九宮格對齊輔助線
 * 4. 單據內文智慧辨識（PDF 6.0x 純文字 + Tesseract.js OCR，發票日期強制讀發票照片）
 * 5. 局部機號辨識（🎯）與發票號碼辨識（🧾）局部框選 OCR
 * 6. 局部圈選刪除（🧹 矩形塗白橡皮擦，按 Delete 鍵遮除）
 * 7. 全域 Ctrl+Z 歷史復原（Undo）堆疊機制
 * 8. 圖紙輸出範圍工具 + 大(1.0x)/中(0.75x)/小(0.5x) 三段輸出解析度選擇器
 * 9. 櫃位印章自訂字體大小、上下 Y 軸微調與 localStorage 永久記憶
 */

// --- 畫布與全域常數 ---
const DEFAULT_CANVAS_WIDTH = 3508;
const DEFAULT_CANVAS_HEIGHT = 2480;
const MIN_CANVAS_WIDTH = 800;
const MIN_CANVAS_HEIGHT = 600;
let canvasWidth = DEFAULT_CANVAS_WIDTH;
let canvasHeight = DEFAULT_CANVAS_HEIGHT;

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
  x: 150,
  y: 100,
  width: 3208,
  height: 2280
};
let isDraggingExportCrop = false;
let exportCropDragPart = null;
let exportCropInitialRect = null;

// --- 輸出解析度縮放 (預設 1.0: 大 / 100% 原始印刷級高解析度) ---
let exportScale = 1.0;

// --- 矩形裁切拖曳狀態 ---
let isDraggingRectCrop = false;
let rectCropDragPart = null;
let rectCropInitialState = null;

// --- 自由梯形變形角點拖曳狀態 ---
let isDraggingDistortCorner = -1; // 0: TL, 1: TR, 2: BR, 3: BL

// --- 畫布下/左邊緣拖曳調整尺寸狀態 ---
let isResizingCanvas = false;
let canvasResizeEdge = null; // 'bottom' | 'left' | 'bl'
let canvasResizeInitial = null;

// --- 局部 OCR 框選狀態 (機號 / 發票號碼) ---
let ocrRegionMode = null; // null | 'serial' | 'invoice'
let isDrawingOcrBox = false;
let ocrBoxStart = null;
let ocrBoxCurrent = null;

// --- 局部圈選刪除（矩形塗白橡皮擦）狀態 ---
let isEraseMode = false;
let isDrawingEraseBox = false;
let eraseBoxStart = null;
let eraseBoxCurrent = null;

// --- 歷史復原堆疊 (Undo History Stack) ---
const MAX_UNDO_STEPS = 20;
let undoStack = [];
let dragPreSnapshot = null;

// UI 元素快取
const fileInput = document.getElementById('fileInput');
const btnSelectFiles = document.getElementById('btnSelectFiles');
const btnClearCanvas = document.getElementById('btnClearCanvas');
const layersList = document.getElementById('layersList');
const layerCountBadge = document.getElementById('layerCountBadge');
const emptyLayersHint = document.getElementById('emptyLayersHint');

// 縮放、圖紙尺寸與復原控制
const btnUndo = document.getElementById('btnUndo');
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnZoomFit = document.getElementById('btnZoomFit');
const btnZoom100 = document.getElementById('btnZoom100');
const zoomPercent = document.getElementById('zoomPercent');
const canvasSizeLabel = document.getElementById('canvasSizeLabel');
const btnResetCanvasSize = document.getElementById('btnResetCanvasSize');

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

// 局部圈選塗白遮除控制
const eraseControls = document.getElementById('eraseControls');
const btnToggleEraseBox = document.getElementById('btnToggleEraseBox');
const btnApplyEraseBox = document.getElementById('btnApplyEraseBox');
const eraseNotice = document.getElementById('eraseNotice');

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
const sliderTextFontSize = document.getElementById('sliderTextFontSize');
const numTextFontSize = document.getElementById('numTextFontSize');
const valTextFontSize = document.getElementById('valTextFontSize');
const btnTextBold = document.getElementById('btnTextBold');

// 原生字型嵌入與覆寫文字控制項
const inputCustomFont = document.getElementById('inputCustomFont');
const customFontStatus = document.getElementById('customFontStatus');
const inputOverrideText = document.getElementById('inputOverrideText');
const inputOverrideFontSize = document.getElementById('inputOverrideFontSize');
const numOverrideFontSize = document.getElementById('numOverrideFontSize');
const valOverrideFontSize = document.getElementById('valOverrideFontSize');
const btnOverrideBold = document.getElementById('btnOverrideBold');
const overrideColorPresets = document.getElementById('overrideColorPresets');
const btnAddOverrideText = document.getElementById('btnAddOverrideText');

let currentEmbeddedFontFamily = null;
let currentEmbeddedFontName = '系統預設黑體／細明體';
let overrideFontSize = 40;
let overrideIsBold = false;
let overrideColor = '#000000';

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
const btnSerialOcr = document.getElementById('btnSerialOcr');
const btnInvoiceOcr = document.getElementById('btnInvoiceOcr');
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
  updateCanvasSizeUI();
  fitCanvasToViewport();
  updateExportDimensionDisplay();
  render();
  setupEventListeners();
  initPdfJsWorker();
  updateUndoBtnState();
});

// --- 歷史復原（Undo）核心函式 ---
function cloneLayerForUndo(l) {
  const cloned = { ...l };
  if (l.cropRect) cloned.cropRect = { ...l.cropRect };
  if (l.distortCorners) cloned.distortCorners = l.distortCorners.map(c => ({ ...c }));
  if (l.eraseBox) cloned.eraseBox = { ...l.eraseBox };

  if (l.image instanceof HTMLCanvasElement) {
    const c = document.createElement('canvas');
    c.width = l.image.width;
    c.height = l.image.height;
    c.getContext('2d').drawImage(l.image, 0, 0);
    cloned.image = c;
  }
  if (l.rawImage instanceof HTMLCanvasElement) {
    const c = document.createElement('canvas');
    c.width = l.rawImage.width;
    c.height = l.rawImage.height;
    c.getContext('2d').drawImage(l.rawImage, 0, 0);
    cloned.rawImage = c;
  }
  if (l.fullCanvas instanceof HTMLCanvasElement) {
    const c = document.createElement('canvas');
    c.width = l.fullCanvas.width;
    c.height = l.fullCanvas.height;
    c.getContext('2d').drawImage(l.fullCanvas, 0, 0);
    cloned.fullCanvas = c;
  }
  if (l.croppedImage instanceof HTMLCanvasElement) {
    const c = document.createElement('canvas');
    c.width = l.croppedImage.width;
    c.height = l.croppedImage.height;
    c.getContext('2d').drawImage(l.croppedImage, 0, 0);
    cloned.croppedImage = c;
  }
  return cloned;
}

function captureSnapshot(actionName = '') {
  return {
    actionName,
    canvasWidth,
    canvasHeight,
    exportCropActive,
    exportCropRect: { ...exportCropRect },
    layers: layers.map(cloneLayerForUndo),
    activeLayerId: activeLayer ? activeLayer.id : null
  };
}

function pushUndoState(actionName = '') {
  const snap = captureSnapshot(actionName);
  undoStack.push(snap);
  if (undoStack.length > MAX_UNDO_STEPS) {
    undoStack.shift();
  }
  updateUndoBtnState();
}

function updateUndoBtnState() {
  if (btnUndo) {
    btnUndo.disabled = undoStack.length === 0;
  }
}

function hasStateChanged(prev) {
  if (!prev) return false;
  if (canvasWidth !== prev.canvasWidth || canvasHeight !== prev.canvasHeight) return true;
  if (exportCropActive !== prev.exportCropActive) return true;
  if (exportCropRect.x !== prev.exportCropRect.x || exportCropRect.y !== prev.exportCropRect.y ||
      exportCropRect.width !== prev.exportCropRect.width || exportCropRect.height !== prev.exportCropRect.height) return true;
  if (layers.length !== prev.layers.length) return true;
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const pl = prev.layers[i];
    if (!pl || l.id !== pl.id) return true;
    if (l.x !== pl.x || l.y !== pl.y || l.width !== pl.width || l.height !== pl.height || l.rotation !== pl.rotation) return true;
    if (l.flipH !== pl.flipH) return true;
    if (l.text !== pl.text || l.fontSize !== pl.fontSize || l.color !== pl.color || l.bold !== pl.bold) return true;
    if (l.cropRatio !== pl.cropRatio) return true;
  }
  return false;
}

function undo() {
  if (undoStack.length === 0) {
    showToast('目前沒有可復原的操作');
    return;
  }
  const prevState = undoStack.pop();
  canvasWidth = prevState.canvasWidth;
  canvasHeight = prevState.canvasHeight;
  exportCropActive = prevState.exportCropActive;
  exportCropRect = { ...prevState.exportCropRect };
  layers = prevState.layers.map(cloneLayerForUndo);
  activeLayer = layers.find(l => l.id === prevState.activeLayerId) || layers[layers.length - 1] || null;

  updateCanvasSizeUI();
  updateExportDimensionDisplay();
  setActiveLayer(activeLayer);
  render();
  updateUndoBtnState();
  showToast(`已復原上一步操作${prevState.actionName ? '（' + prevState.actionName + '）' : ''}`);
}

if (btnUndo) {
  btnUndo.addEventListener('click', undo);
}

// --- PDF 輕量化文字對比銳化處理（消除灰階柔焦邊緣，使細小黑字筆畫清晰銳利） ---
function sharpenPdfText(targetCanvas) {
  if (!targetCanvas) return;
  const cCtx = targetCanvas.getContext('2d');
  const imgData = cCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = (r * 77 + g * 150 + b * 29) >> 8;

    if (lum > 220) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else if (lum < 110) {
      const f = lum / 110;
      data[i] = Math.round(r * f * 0.7);
      data[i + 1] = Math.round(g * f * 0.7);
      data[i + 2] = Math.round(b * f * 0.7);
    } else {
      const norm = (lum - 110) / 110;
      const targetLum = Math.pow(norm, 1.8) * 220 + 20;
      const ratio = targetLum / (lum || 1);
      data[i] = Math.min(255, Math.round(r * ratio));
      data[i + 1] = Math.min(255, Math.round(g * ratio));
      data[i + 2] = Math.min(255, Math.round(b * ratio));
    }
  }
  cCtx.putImageData(imgData, 0, 0);
}

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
function updateCanvasSizeUI() {
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvasWrapper.style.width = `${canvasWidth}px`;
  canvasWrapper.style.height = `${canvasHeight}px`;
  if (canvasSizeLabel) {
    canvasSizeLabel.textContent = `圖紙尺寸：${canvasWidth} × ${canvasHeight} px`;
  }
}

function setZoom(zoom) {
  currentZoom = Math.max(0.15, Math.min(2.0, zoom));
  canvasWrapper.style.width = `${canvasWidth}px`;
  canvasWrapper.style.height = `${canvasHeight}px`;
  canvasWrapper.style.transform = `scale(${currentZoom})`;
  canvasWrapper.style.transformOrigin = 'top left';
  zoomPercent.textContent = `${Math.round(currentZoom * 100)}%`;
}

function fitCanvasToViewport() {
  const pad = 32;
  const availW = canvasViewport.clientWidth - pad * 2;
  const availH = canvasViewport.clientHeight - pad * 2;
  const scaleW = availW / canvasWidth;
  const scaleH = availH / canvasHeight;
  setZoom(Math.min(scaleW, scaleH));
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvasWidth / rect.width);
  const y = (e.clientY - rect.top) * (canvasHeight / rect.height);
  return { x, y };
}

// --- 圖層物件結構工廠 ---
function createLayerObject(options) {
  return {
    id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    type: options.type || 'image', // 'pdf_order' | 'image' | 'stamp' | 'text'
    name: options.name || '未命名物件',
    x: options.x !== undefined ? options.x : canvasWidth / 2,
    y: options.y !== undefined ? options.y : canvasHeight / 2,
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
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. 純白底色
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. 逐一繪製圖層
  layers.forEach(layer => {
    ctx.save();
    ctx.translate(layer.x, layer.y);
    ctx.rotate(layer.rotation);
    if (layer.flipH) {
      ctx.scale(-1, 1);
    }

    if (layer.type === 'text' || layer.type === 'overrideText') {
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

      // 若處於局部圈選塗白模式，繪製紅色虛線框
      if (!isExporting && layer === activeLayer && isEraseMode) {
        drawLayerEraseBox(layer);
      }
    }

    ctx.restore();
  });

  // 3. 繪製選取框與控制柄
  if (!isExporting && activeLayer && !activeLayer.rectCropMode && !activeLayer.distortMode && !isEraseMode) {
    drawSelectionBox(activeLayer);
  }

  // 4. 繪製圖紙輸出範圍框與半透明暗色遮罩
  if (!isExporting && exportCropActive) {
    drawExportCropOverlay();
  }

  // 5. 繪製局部框選 OCR 矩形框 (機號 / 發票號碼)
  if (!isExporting && isDrawingOcrBox && ocrBoxStart && ocrBoxCurrent) {
    drawOcrBoxOverlay();
  }

  // 6. 繪製畫布下邊界／左邊界／左下角尺寸調整把手
  if (!isExporting) {
    drawCanvasResizeHandles();
  }

  ctx.restore();
}

// 繪製文字圖層 (包含審核備註與原生字型覆寫文字)
function drawTextLayer(layer) {
  const fontWeight = layer.fontWeight || (layer.bold ? 'bold' : 'normal');
  const fontFamily = layer.fontFamily ? `"${layer.fontFamily}", -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", "新細明體", sans-serif` : '-apple-system, BlinkMacSystemFont, "Microsoft JhengHei", "新細明體", sans-serif';
  ctx.font = `${fontWeight} ${layer.fontSize}px ${fontFamily}`;
  ctx.fillStyle = layer.color || '#000000';
  ctx.textBaseline = 'top';

  const lines = (layer.text || '').split('\n');
  const lineHeight = layer.fontSize * 1.35;

  let maxWidth = 0;
  lines.forEach(line => {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  });
  const totalHeight = lines.length * lineHeight;

  const padX = layer.type === 'overrideText' ? 14 : 30;
  const padY = layer.type === 'overrideText' ? 8 : 15;

  layer.width = Math.max(50, Math.round(maxWidth + padX));
  layer.height = Math.max(25, Math.round(totalHeight + padY));

  const startX = -layer.width / 2 + padX / 2;
  const startY = -layer.height / 2 + padY / 2;

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
  ctx.fillRect(0, 0, canvasWidth, ry);
  ctx.fillRect(0, ry + rh, canvasWidth, canvasHeight - (ry + rh));
  ctx.fillRect(0, ry, rx, rh);
  ctx.fillRect(rx + rw, ry, canvasWidth - (rx + rw), rh);

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

// --- 輔助函式：計算相對於圖層中心的旋轉局部座標 ---
function getLayerLocalCoords(layer, cx, cy) {
  const dx = cx - layer.x;
  const dy = cy - layer.y;
  const cos = Math.cos(-layer.rotation);
  const sin = Math.sin(-layer.rotation);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos
  };
}

// --- 繪製 OCR 局部框選選取框 (機號 / 發票號碼) ---
function drawOcrBoxOverlay() {
  if (!isDrawingOcrBox || !ocrBoxStart || !ocrBoxCurrent) return;
  const rx = Math.min(ocrBoxStart.x, ocrBoxCurrent.x);
  const ry = Math.min(ocrBoxStart.y, ocrBoxCurrent.y);
  const rw = Math.abs(ocrBoxCurrent.x - ocrBoxStart.x);
  const rh = Math.abs(ocrBoxCurrent.y - ocrBoxStart.y);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 63, 188, 0.14)';
  ctx.fillRect(rx, ry, rw, rh);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3 / currentZoom;
  ctx.strokeRect(rx, ry, rw, rh);

  ctx.strokeStyle = '#003FBC';
  ctx.lineWidth = 2 / currentZoom;
  ctx.setLineDash([8 / currentZoom, 6 / currentZoom]);
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.setLineDash([]);

  if (rw > 30 && rh > 15) {
    const labelTitle = ocrRegionMode === 'invoice' ? '發票號碼框選' : '機號框選';
    const label = `${labelTitle} ${Math.round(rw)} × ${Math.round(rh)}`;
    ctx.font = `bold ${Math.round(12 / currentZoom)}px -apple-system, sans-serif`;
    const tw = ctx.measureText(label).width;
    const bh = 22 / currentZoom;
    const bw = tw + 16 / currentZoom;
    const by = ry >= bh + 6 ? ry - bh - 6 : ry + 6;
    ctx.fillStyle = '#003FBC';
    ctx.fillRect(rx, by, bw, bh);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rx + 8 / currentZoom, by + bh / 2);
  }
  ctx.restore();
}

// --- 繪製圖層局部圈選塗白遮除紅框 ---
function drawLayerEraseBox(layer) {
  let box = null;
  if (isDrawingEraseBox && eraseBoxStart && eraseBoxCurrent) {
    const p1 = getLayerLocalCoords(layer, eraseBoxStart.x, eraseBoxStart.y);
    const p2 = getLayerLocalCoords(layer, eraseBoxCurrent.x, eraseBoxCurrent.y);
    const lx = Math.min(p1.x, p2.x);
    const ly = Math.min(p1.y, p2.y);
    const lw = Math.abs(p2.x - p1.x);
    const lh = Math.abs(p2.y - p1.y);
    const hw = layer.width / 2;
    const hh = layer.height / 2;
    const clampLx = Math.max(-hw, Math.min(hw, lx));
    const clampLy = Math.max(-hh, Math.min(hh, ly));
    const clampRx = Math.max(-hw, Math.min(hw, lx + lw));
    const clampBy = Math.max(-hh, Math.min(hh, ly + lh));
    box = { x: clampLx, y: clampLy, w: clampRx - clampLx, h: clampBy - clampLy };
  } else if (layer.eraseBox) {
    box = layer.eraseBox;
  }

  if (!box || box.w <= 0 || box.h <= 0) return;

  ctx.save();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
  ctx.fillRect(box.x, box.y, box.w, box.h);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3 / currentZoom;
  ctx.strokeRect(box.x, box.y, box.w, box.h);

  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 2 / currentZoom;
  ctx.setLineDash([8 / currentZoom, 6 / currentZoom]);
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.setLineDash([]);

  if (box.w > 40 && box.h > 20) {
    const text = '塗白清除 (Delete)';
    ctx.font = `bold ${Math.round(12 / currentZoom)}px -apple-system, sans-serif`;
    const tw = ctx.measureText(text).width;
    const bh = 22 / currentZoom;
    const bw = tw + 16 / currentZoom;
    const by = (box.y - bh - 4 / currentZoom >= -layer.height / 2) ? (box.y - bh - 4 / currentZoom) : (box.y + 4 / currentZoom);
    const bx = Math.max(-layer.width / 2, Math.min(layer.width / 2 - bw, box.x));

    ctx.fillStyle = '#DC2626';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + 8 / currentZoom, by + bh / 2);
  }
  ctx.restore();
}

// --- 執行局部塗白遮除並寫入圖層影像 ---
function applyLayerEraseBox() {
  if (!activeLayer || !activeLayer.eraseBox) return;
  const box = activeLayer.eraseBox;

  // 紀錄 Undo
  pushUndoState('局部塗白遮除');

  const img = activeLayer.image;
  if (!img) return;

  let targetCanvas = img;
  if (!(targetCanvas instanceof HTMLCanvasElement)) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const cCtx = c.getContext('2d');
    cCtx.drawImage(img, 0, 0);
    targetCanvas = c;
    activeLayer.image = targetCanvas;
    if (activeLayer.rawImage) activeLayer.rawImage = targetCanvas;
  }

  const hw = activeLayer.width / 2;
  const hh = activeLayer.height / 2;
  const scaleX = targetCanvas.width / activeLayer.width;
  const scaleY = targetCanvas.height / activeLayer.height;

  const px = Math.round((box.x + hw) * scaleX);
  const py = Math.round((box.y + hh) * scaleY);
  const pw = Math.round(box.w * scaleX);
  const ph = Math.round(box.h * scaleY);

  const tCtx = targetCanvas.getContext('2d');
  tCtx.fillStyle = '#FFFFFF';
  tCtx.fillRect(px, py, pw, ph);

  // 若為 PDF 訂單圖層，同步塗白 fullCanvas 以免重新調整滑桿時還原
  if (activeLayer.type === 'pdf_order' && activeLayer.fullCanvas instanceof HTMLCanvasElement) {
    const fCtx = activeLayer.fullCanvas.getContext('2d');
    fCtx.fillStyle = '#FFFFFF';
    fCtx.fillRect(px, py, pw, ph);
  }

  // 若有 croppedImage，亦同步塗白
  if (activeLayer.croppedImage instanceof HTMLCanvasElement) {
    const crCtx = activeLayer.croppedImage.getContext('2d');
    crCtx.fillStyle = '#FFFFFF';
    crCtx.fillRect(px, py, pw, ph);
  }

  activeLayer.eraseBox = null;
  if (btnApplyEraseBox) btnApplyEraseBox.classList.add('hidden');
  render();
  showToast('已塗白遮除該區塊（可繼續框選或按 Esc 退出）');
}

// --- 繪製畫布下邊界與左邊界拖曳把手 ---
function drawCanvasResizeHandles() {
  ctx.save();
  const barLen = 84 / currentZoom;
  const barThick = 10 / currentZoom;
  const cornerSize = 14 / currentZoom;

  // 1. 下邊緣正中央把手
  const bx = canvasWidth / 2 - barLen / 2;
  const by = canvasHeight - barThick - 2 / currentZoom;
  ctx.fillStyle = 'rgba(0, 63, 188, 0.85)';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 / currentZoom;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(bx, by, barLen, barThick, 5 / currentZoom);
  } else {
    ctx.rect(bx, by, barLen, barThick);
  }
  ctx.fill();
  ctx.stroke();

  // 2. 左邊緣正中央把手
  const lx = 2 / currentZoom;
  const ly = canvasHeight / 2 - barLen / 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(lx, ly, barThick, barLen, 5 / currentZoom);
  } else {
    ctx.rect(lx, ly, barThick, barLen);
  }
  ctx.fill();
  ctx.stroke();

  // 3. 左下角把手
  ctx.fillStyle = '#003FBC';
  ctx.fillRect(2 / currentZoom, canvasHeight - cornerSize - 2 / currentZoom, cornerSize, cornerSize);
  ctx.strokeRect(2 / currentZoom, canvasHeight - cornerSize - 2 / currentZoom, cornerSize, cornerSize);

  ctx.restore();
}

// --- 畫布下邊界／左邊界／左下角命中測試 ---
function hitTestCanvasResize(x, y) {
  const edgeThreshold = 16 / currentZoom;
  const barHalf = 52 / currentZoom;

  const nearLeft = x >= 0 && x <= edgeThreshold && y >= 0 && y <= canvasHeight;
  const nearBottom = y >= canvasHeight - edgeThreshold && y <= canvasHeight && x >= 0 && x <= canvasWidth;

  if (nearLeft && nearBottom) {
    return 'bl';
  }
  if (nearBottom && (Math.abs(x - canvasWidth / 2) <= barHalf || y >= canvasHeight - 10 / currentZoom)) {
    return 'bottom';
  }
  if (nearLeft && (Math.abs(y - canvasHeight / 2) <= barHalf || x <= 10 / currentZoom)) {
    return 'left';
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

  // 0A. 若處於「局部 OCR 框選」模式 (機號 / 發票號碼)，開始框選
  if (ocrRegionMode) {
    isDrawingOcrBox = true;
    ocrBoxStart = {
      x: Math.max(0, Math.min(canvasWidth, coords.x)),
      y: Math.max(0, Math.min(canvasHeight, coords.y))
    };
    ocrBoxCurrent = { ...ocrBoxStart };
    render();
    return;
  }

  // 0B. 若處於「局部圈選刪除（塗白）」模式且有選取物件，在該物件上開始畫框
  if (isEraseMode && activeLayer && (activeLayer.type === 'image' || activeLayer.type === 'pdf_order')) {
    isDrawingEraseBox = true;
    eraseBoxStart = { x: coords.x, y: coords.y };
    eraseBoxCurrent = { ...eraseBoxStart };
    activeLayer.eraseBox = null;
    if (btnApplyEraseBox) btnApplyEraseBox.classList.add('hidden');
    render();
    return;
  }

  // 0C. 偵測畫布下邊界／左邊界／左下角尺寸拖曳把手
  const canvasEdge = hitTestCanvasResize(coords.x, coords.y);
  if (canvasEdge) {
    dragPreSnapshot = captureSnapshot('調整畫布尺寸');
    isResizingCanvas = true;
    canvasResizeEdge = canvasEdge;
    canvasResizeInitial = {
      width: canvasWidth,
      height: canvasHeight,
      startClientX: e.clientX,
      startClientY: e.clientY,
      layers: layers.map(l => ({ layer: l, x: l.x })),
      exportCropX: exportCropRect.x,
      exportCropW: exportCropRect.width
    };
    return;
  }

  const hit = hitTest(coords.x, coords.y);

  if (hit) {
    dragPreSnapshot = captureSnapshot('移動/縮放/調整');
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

  // 0A. OCR 局部框選拖曳繪製
  if (isDrawingOcrBox && ocrBoxStart) {
    ocrBoxCurrent = {
      x: Math.max(0, Math.min(canvasWidth, coords.x)),
      y: Math.max(0, Math.min(canvasHeight, coords.y))
    };
    render();
    return;
  }

  // 0B. 局部塗白框選拖曳繪製
  if (isDrawingEraseBox && eraseBoxStart && activeLayer) {
    eraseBoxCurrent = { x: coords.x, y: coords.y };
    render();
    return;
  }

  // 0C. 畫布下邊界／左邊界／左下角拖曳調整圖紙尺寸
  if (isResizingCanvas && canvasResizeInitial) {
    const screenDx = (e.clientX - canvasResizeInitial.startClientX) / currentZoom;
    const screenDy = (e.clientY - canvasResizeInitial.startClientY) / currentZoom;

    if (canvasResizeEdge === 'bottom' || canvasResizeEdge === 'bl') {
      canvasHeight = Math.max(MIN_CANVAS_HEIGHT, Math.round(canvasResizeInitial.height + screenDy));
      if (exportCropRect.y + exportCropRect.height > canvasHeight) {
        exportCropRect.y = Math.max(0, canvasHeight - exportCropRect.height);
        if (exportCropRect.y + exportCropRect.height > canvasHeight) {
          exportCropRect.height = Math.max(200, canvasHeight - exportCropRect.y);
        }
      }
    }

    if (canvasResizeEdge === 'left' || canvasResizeEdge === 'bl') {
      const newW = Math.max(MIN_CANVAS_WIDTH, Math.round(canvasResizeInitial.width - screenDx));
      const deltaW = newW - canvasResizeInitial.width;
      canvasWidth = newW;

      canvasResizeInitial.layers.forEach(item => {
        item.layer.x = item.x + deltaW;
      });

      exportCropRect.x = Math.max(0, Math.min(canvasWidth - 200, Math.round(canvasResizeInitial.exportCropX + deltaW)));
      if (exportCropRect.x + exportCropRect.width > canvasWidth) {
        exportCropRect.width = Math.max(200, canvasWidth - exportCropRect.x);
      }
    }

    updateCanvasSizeUI();
    updateExportDimensionDisplay();
    render();
    return;
  }

  // 1. 拖曳圖紙輸出範圍框（嚴格單邊獨立拉動，絕不連動另一邊）
  if (isDraggingExportCrop) {
    const orig = exportCropInitialRect;
    const minSize = 200;
    const rightEdge = orig.x + orig.width;
    const bottomEdge = orig.y + orig.height;

    let newX = orig.x;
    let newY = orig.y;
    let newW = orig.width;
    let newH = orig.height;

    if (exportCropDragPart === 'body') {
      newX = Math.max(0, Math.min(canvasWidth - orig.width, orig.x + dx));
      newY = Math.max(0, Math.min(canvasHeight - orig.height, orig.y + dy));
    } else {
      // 右邊界：嚴格鎖定左邊界 orig.x
      if (exportCropDragPart.includes('r')) {
        const maxW = canvasWidth - orig.x;
        newW = Math.max(minSize, Math.min(maxW, orig.width + dx));
      }
      // 左邊界：嚴格鎖定右邊界 rightEdge
      if (exportCropDragPart.includes('l')) {
        const maxX = rightEdge - minSize;
        newX = Math.max(0, Math.min(maxX, orig.x + dx));
        newW = rightEdge - newX;
      }
      // 下邊界：嚴格鎖定上邊界 orig.y
      if (exportCropDragPart.includes('b')) {
        const maxH = canvasHeight - orig.y;
        newH = Math.max(minSize, Math.min(maxH, orig.height + dy));
      }
      // 上邊界：嚴格鎖定下邊界 bottomEdge
      if (exportCropDragPart.includes('t')) {
        const maxY = bottomEdge - minSize;
        newY = Math.max(0, Math.min(maxY, orig.y + dy));
        newH = bottomEdge - newY;
      }
    }

    exportCropRect = {
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH)
    };
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

    if (activeLayer.type === 'text' || activeLayer.type === 'overrideText') {
      activeLayer.fontSize = Math.max(10, Math.round(objInitialState.fontSize * newScale));
      if (sliderTextFontSize && numTextFontSize) {
        sliderTextFontSize.value = activeLayer.fontSize;
        numTextFontSize.value = activeLayer.fontSize;
        if (valTextFontSize) valTextFontSize.textContent = `${activeLayer.fontSize}px`;
      }
      if (activeLayer.type === 'overrideText' && inputOverrideFontSize && numOverrideFontSize) {
        inputOverrideFontSize.value = activeLayer.fontSize;
        numOverrideFontSize.value = activeLayer.fontSize;
        if (valOverrideFontSize) valOverrideFontSize.textContent = `${activeLayer.fontSize}px`;
      }
    }

    render();
    return;
  }

  // 7. 動態調整滑鼠游標樣式
  if (ocrRegionMode || (isEraseMode && activeLayer)) {
    canvas.style.cursor = 'crosshair';
    return;
  }

  const canvasEdgeHover = hitTestCanvasResize(coords.x, coords.y);
  if (canvasEdgeHover === 'bl') {
    canvas.style.cursor = 'nesw-resize';
    return;
  } else if (canvasEdgeHover === 'bottom') {
    canvas.style.cursor = 'ns-resize';
    return;
  } else if (canvasEdgeHover === 'left') {
    canvas.style.cursor = 'ew-resize';
    return;
  }

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
  // 0A. OCR 框選完成 (機號或發票號碼)
  if (isDrawingOcrBox && ocrBoxStart && ocrBoxCurrent) {
    isDrawingOcrBox = false;
    const rx = Math.min(ocrBoxStart.x, ocrBoxCurrent.x);
    const ry = Math.min(ocrBoxStart.y, ocrBoxCurrent.y);
    const rw = Math.abs(ocrBoxCurrent.x - ocrBoxStart.x);
    const rh = Math.abs(ocrBoxCurrent.y - ocrBoxStart.y);
    const mode = ocrRegionMode;
    ocrBoxStart = null;
    ocrBoxCurrent = null;
    setOcrRegionMode(null);
    render();

    if (rw < 15 || rh < 10) {
      showToast('框選範圍太小，請重新點擊並拉出清晰區域');
    } else {
      if (mode === 'invoice') {
        runInvoiceRegionOcr(rx, ry, rw, rh);
      } else {
        runSerialRegionOcr(rx, ry, rw, rh);
      }
    }
    return;
  }

  // 0B. 局部塗白框選完成
  if (isDrawingEraseBox && eraseBoxStart && eraseBoxCurrent && activeLayer) {
    isDrawingEraseBox = false;
    const p1 = getLayerLocalCoords(activeLayer, eraseBoxStart.x, eraseBoxStart.y);
    const p2 = getLayerLocalCoords(activeLayer, eraseBoxCurrent.x, eraseBoxCurrent.y);
    const lx = Math.min(p1.x, p2.x);
    const ly = Math.min(p1.y, p2.y);
    const lw = Math.abs(p2.x - p1.x);
    const lh = Math.abs(p2.y - p1.y);

    const hw = activeLayer.width / 2;
    const hh = activeLayer.height / 2;
    const clampLx = Math.max(-hw, Math.min(hw, lx));
    const clampLy = Math.max(-hh, Math.min(hh, ly));
    const clampRx = Math.max(-hw, Math.min(hw, lx + lw));
    const clampBy = Math.max(-hh, Math.min(hh, ly + lh));
    const finalW = clampRx - clampLx;
    const finalH = clampBy - clampLy;

    eraseBoxStart = null;
    eraseBoxCurrent = null;

    if (finalW > 8 && finalH > 8) {
      activeLayer.eraseBox = { x: clampLx, y: clampLy, w: finalW, h: finalH };
      if (btnApplyEraseBox) btnApplyEraseBox.classList.remove('hidden');
      showToast('已圈選欲刪除區域，請按 Delete 鍵或點擊確認清除');
    } else {
      activeLayer.eraseBox = null;
      if (btnApplyEraseBox) btnApplyEraseBox.classList.add('hidden');
    }
    render();
    return;
  }

  // 檢查拖曳操作是否有狀態變更以記錄 Undo
  if (dragPreSnapshot && hasStateChanged(dragPreSnapshot)) {
    undoStack.push(dragPreSnapshot);
    if (undoStack.length > MAX_UNDO_STEPS) undoStack.shift();
    updateUndoBtnState();
  }
  dragPreSnapshot = null;

  isResizingCanvas = false;
  canvasResizeEdge = null;
  canvasResizeInitial = null;
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

  // Ctrl+Z or Cmd+Z (復原)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    undo();
    return;
  }

  if (e.key === 'Escape') {
    if (ocrRegionMode) {
      e.preventDefault();
      setOcrRegionMode(null);
      showToast('已取消 OCR 框選');
      return;
    }
    if (isEraseMode) {
      e.preventDefault();
      toggleEraseMode(false);
      showToast('已結束局部塗白模式');
      return;
    }
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (isEraseMode && activeLayer && activeLayer.eraseBox) {
      e.preventDefault();
      applyLayerEraseBox();
      return;
    }
    if (activeLayer) {
      e.preventDefault();
      deleteActiveLayer();
      return;
    }
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
    const step = e.shiftKey ? 10 : 1;
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
  } else if (hit.layer.type === 'text' || hit.layer.type === 'overrideText') {
    setActiveLayer(hit.layer);
    editTextContent.focus();
    showToast('請在右側面板修改文字內容');
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
    if (eraseControls) eraseControls.classList.add('hidden');
    toggleEraseMode(false);
    return;
  }

  noSelectionHint.classList.add('hidden');
  selectionControls.classList.remove('hidden');

  pdfControls.classList.add('hidden');
  imagePerspectiveControls.classList.add('hidden');
  imageEnhanceControls.classList.add('hidden');
  textControls.classList.add('hidden');

  if (eraseControls) {
    if (layer.type === 'pdf_order' || layer.type === 'image') {
      eraseControls.classList.remove('hidden');
    } else {
      eraseControls.classList.add('hidden');
      toggleEraseMode(false);
    }
  }

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
  } else if (layer.type === 'text' || layer.type === 'overrideText') {
    activeTypeName.textContent = layer.type === 'overrideText' ? '原生字型覆寫文字 (獨立圖層)' : '審核備註文字 (獨立圖層)';
    textControls.classList.remove('hidden');
    editTextContent.value = layer.text;
    btnTextBold.style.backgroundColor = (layer.bold || layer.fontWeight === 'bold') ? '#e2e8f0' : 'transparent';
    updateColorButtonSelection(textControls, layer.color);
    if (sliderTextFontSize && numTextFontSize) {
      sliderTextFontSize.value = layer.fontSize;
      numTextFontSize.value = layer.fontSize;
      if (valTextFontSize) valTextFontSize.textContent = `${layer.fontSize}px`;
    }
    if (layer.type === 'overrideText') {
      if (inputOverrideText) inputOverrideText.value = layer.text;
      if (inputOverrideFontSize && numOverrideFontSize) {
        inputOverrideFontSize.value = layer.fontSize;
        numOverrideFontSize.value = layer.fontSize;
        if (valOverrideFontSize) valOverrideFontSize.textContent = `${layer.fontSize}px`;
      }
      if (btnOverrideBold) {
        btnOverrideBold.style.backgroundColor = (layer.bold || layer.fontWeight === 'bold') ? '#e2e8f0' : 'transparent';
      }
      if (overrideColorPresets) {
        updateColorButtonSelection(overrideColorPresets, layer.color);
      }
    }
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
    } else if (layer.type === 'overrideText') {
      badgeClass = 'badge-override';
      typeLabel = '覆寫文字';
    } else if (layer.type === 'text') {
      badgeClass = 'badge-text';
      typeLabel = '審核備註';
    }

    if (layer.type === 'overrideText') {
      thumbHtml = `<div class="layer-thumb layer-thumb-override" title="${layer.fontName || '原生字型'}">🔤</div>`;
    } else if (layer.type === 'text') {
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

  pushUndoState('調整圖層順序');
  layers.splice(idx, 1);
  layers.splice(targetIdx, 0, layer);
  setActiveLayer(layer);
  render();
}

function deleteLayer(layer) {
  const idx = layers.indexOf(layer);
  if (idx >= 0) {
    pushUndoState('刪除物件');
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

// --- 訂購單 6.0x 超高取樣文字銳利化讀取與 +12px 精準切線 ---
async function importPdfPureFrontend(file) {
  if (!window.pdfjsLib) {
    showToast('瀏覽器尚未載入 PDF.js，請稍後或直接拖入圖片');
    return;
  }

  showToast(`正在 6.0x 超高取樣解析 PDF: ${file.name}...`);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pdf.numPages < 1) {
      showToast('PDF 檔案為空');
      return;
    }

    const page = await pdf.getPage(1);
    const scale = 6.0;
    const viewport = page.getViewport({ scale });

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = viewport.width;
    fullCanvas.height = viewport.height;
    const renderCtx = fullCanvas.getContext('2d');
    renderCtx.imageSmoothingEnabled = true;
    renderCtx.imageSmoothingQuality = 'high';

    await page.render({ canvasContext: renderCtx, viewport }).promise;

    // 輕量化文字對比銳化（消除灰階柔焦邊緣，細小黑字筆畫清晰銳利）
    sharpenPdfText(fullCanvas);

    // 讀取內文文字座標與純文字 (供 OCR 交叉輔助比對品牌型號)
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

    const orderDisplayW = Math.round(canvasWidth * 0.63);
    const aspect = croppedCanvas.width / croppedCanvas.height;
    const orderDisplayH = Math.round(orderDisplayW / aspect);

    const marginX = Math.round(canvasWidth * (40 / 2400));
    const marginY = Math.round(canvasHeight * (40 / 1700));
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

    pushUndoState('匯入 PDF 訂單');
    layers.push(newLayer);
    setActiveLayer(newLayer);
    showToast(`PDF 訂購單已以 6.0x 超高取樣與文字銳利化精準裁切進場`);
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
    pushUndoState('重設訂單高度');
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
          displayW = Math.round(canvasWidth * 0.58);
          const aspect = sw / sh;
          displayH = Math.round(displayW / aspect);

          const marginX = Math.round(canvasWidth * (40 / 2400));
          const marginY = Math.round(canvasHeight * (40 / 1700));
          posX = marginX + displayW / 2;
          posY = canvasHeight - marginY - displayH / 2;
        } else {
          displayH = Math.round(canvasHeight * 0.88);
          const aspect = sw / sh;
          displayW = Math.round(displayH * aspect);

          const marginX = Math.round(canvasWidth * (40 / 2400));
          posX = canvasWidth - marginX - displayW / 2;
          posY = canvasHeight / 2;
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

        pushUndoState('匯入圖片');
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
  pushUndoState('套用矩形裁切');

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
  pushUndoState('還原裁切');

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
  pushUndoState('套用自由梯形變形');
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
  pushUndoState('還原自由梯形變形');

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

// --- 局部圈選塗白遮除控制 ---
function toggleEraseMode(active) {
  if (!activeLayer) return;
  isEraseMode = (typeof active === 'boolean') ? active : !isEraseMode;
  if (btnToggleEraseBox) {
    if (isEraseMode) {
      btnToggleEraseBox.classList.add('active', 'btn-primary');
      btnToggleEraseBox.classList.remove('btn-outline');
      if (eraseNotice) eraseNotice.classList.remove('hidden');
      if (btnApplyEraseBox) btnApplyEraseBox.classList.remove('hidden');
      canvas.style.cursor = 'crosshair';
    } else {
      btnToggleEraseBox.classList.remove('active', 'btn-primary');
      btnToggleEraseBox.classList.add('btn-outline');
      if (eraseNotice) eraseNotice.classList.add('hidden');
      if (btnApplyEraseBox) btnApplyEraseBox.classList.add('hidden');
      canvas.style.cursor = 'default';
    }
  }
  render();
}

if (btnToggleEraseBox) {
  btnToggleEraseBox.addEventListener('click', () => toggleEraseMode());
}

if (btnApplyEraseBox) {
  btnApplyEraseBox.addEventListener('click', () => {
    if (activeLayer && activeLayer.eraseBox) {
      applyLayerEraseBox();
    } else {
      showToast('請先在物件上拖曳拉出要塗白的紅色虛線範圍');
    }
  });
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

    // 依 3508x2480 畫布比例調校印章尺寸 (預設寬度 580px)
    const displayW = 580;
    const displayH = Math.round((displayW * stampImg.height) / stampImg.width);

    const posX = Math.round(canvasWidth * 0.44);
    const posY = Math.round(canvasHeight * 0.85);

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

    pushUndoState('蓋上專櫃印章');
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

// --- 局部框選 OCR 工具 (機號 / 發票號碼) ---
function setOcrRegionMode(mode) {
  ocrRegionMode = mode; // 'serial' | 'invoice' | null
  if (btnSerialOcr) {
    if (mode === 'serial') {
      btnSerialOcr.classList.add('active', 'btn-primary');
      btnSerialOcr.classList.remove('btn-outline');
    } else {
      btnSerialOcr.classList.remove('active', 'btn-primary');
      btnSerialOcr.classList.add('btn-outline');
    }
  }
  if (btnInvoiceOcr) {
    if (mode === 'invoice') {
      btnInvoiceOcr.classList.add('active', 'btn-primary');
      btnInvoiceOcr.classList.remove('btn-outline');
    } else {
      btnInvoiceOcr.classList.remove('active', 'btn-primary');
      btnInvoiceOcr.classList.add('btn-outline');
    }
  }
  canvas.style.cursor = mode ? 'crosshair' : 'default';
}

if (btnSerialOcr) {
  btnSerialOcr.addEventListener('click', () => {
    if (layers.length === 0) {
      showToast('請先將保卡或照片放進畫布再框選機號');
      return;
    }
    const nextMode = (ocrRegionMode === 'serial') ? null : 'serial';
    setOcrRegionMode(nextMode);
    if (nextMode) {
      ocrStatusBox.classList.remove('hidden', 'loading');
      ocrStatusBox.textContent = '🎯 請直接在畫布的保卡「機號」欄位處拖曳拉出矩形框選範圍（Esc 可取消）';
      showToast('已進入機號框選模式，請在畫布上拉出機號區域');
    } else {
      ocrStatusBox.textContent = '已取消機號框選。';
    }
  });
}

if (btnInvoiceOcr) {
  btnInvoiceOcr.addEventListener('click', () => {
    if (layers.length === 0) {
      showToast('請先將發票放進畫布再框選發票號碼');
      return;
    }
    const nextMode = (ocrRegionMode === 'invoice') ? null : 'invoice';
    setOcrRegionMode(nextMode);
    if (nextMode) {
      ocrStatusBox.classList.remove('hidden', 'loading');
      ocrStatusBox.textContent = '🧾 請直接在畫布的發票「發票號碼」處拖曳拉出矩形框選範圍（Esc 可取消）';
      showToast('已進入發票號碼框選模式，請在畫布上拉出發票號碼區域');
    } else {
      ocrStatusBox.textContent = '已取消發票號碼框選。';
    }
  });
}

async function runSerialRegionOcr(rx, ry, rw, rh) {
  if (!window.Tesseract) {
    showToast('Tesseract OCR 引擎尚未載入完成，請檢查網路連線');
    return;
  }

  if (btnSerialOcr) btnSerialOcr.disabled = true;
  ocrStatusBox.classList.remove('hidden');
  ocrStatusBox.classList.add('loading');
  ocrStatusBox.textContent = '⏳ 正在針對框選的機號區域進行高解析度 OCR 辨識...';

  try {
    const cleanCanvas = document.createElement('canvas');
    cleanCanvas.width = canvasWidth;
    cleanCanvas.height = canvasHeight;
    const cCtx = cleanCanvas.getContext('2d');
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';
    cCtx.fillStyle = '#FFFFFF';
    cCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    layers.forEach(layer => {
      cCtx.save();
      cCtx.translate(layer.x, layer.y);
      cCtx.rotate(layer.rotation);
      if (layer.flipH) cCtx.scale(-1, 1);
      if (layer.type === 'text' || layer.type === 'overrideText') {
        const fontWeight = layer.fontWeight || (layer.bold ? 'bold' : 'normal');
        const fontFamily = layer.fontFamily ? `"${layer.fontFamily}", -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif` : '-apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif';
        cCtx.font = `${fontWeight} ${layer.fontSize}px ${fontFamily}`;
        cCtx.fillStyle = layer.color || '#000000';
        cCtx.textBaseline = 'top';
        const lines = (layer.text || '').split('\n');
        const lineHeight = layer.fontSize * 1.35;
        const padX = layer.type === 'overrideText' ? 14 : 30;
        const padY = layer.type === 'overrideText' ? 8 : 15;
        const startX = -layer.width / 2 + padX / 2;
        const startY = -layer.height / 2 + padY / 2;
        lines.forEach((line, idx) => cCtx.fillText(line, startX, startY + idx * lineHeight));
      } else if (layer.image && (layer.image.complete || layer.image instanceof HTMLCanvasElement)) {
        cCtx.drawImage(layer.image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
      }
      cCtx.restore();
    });

    const scaleFactor = rw < 350 || rh < 120 ? 2.5 : 1.5;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(1, Math.round(rw * scaleFactor));
    cropCanvas.height = Math.max(1, Math.round(rh * scaleFactor));
    const crCtx = cropCanvas.getContext('2d');
    crCtx.imageSmoothingEnabled = true;
    crCtx.imageSmoothingQuality = 'high';
    crCtx.fillStyle = '#FFFFFF';
    crCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    crCtx.drawImage(cleanCanvas, rx, ry, rw, rh, 0, 0, cropCanvas.width, cropCanvas.height);

    const result = await window.Tesseract.recognize(cropCanvas, 'eng');
    const rawText = (result && result.data && result.data.text) ? result.data.text : '';
    const serialClean = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!serialClean) {
      ocrStatusBox.classList.remove('loading');
      ocrStatusBox.textContent = '⚠️ 框選區域未辨識出有效英數字，請放大畫面或重新框選較清楚的範圍。';
      showToast('未辨識出有效機號文字');
      return;
    }

    const currentText = inputNewNote.value || '';
    if (currentText.trim() === '') {
      inputNewNote.value = `機號  ${serialClean}`;
    } else {
      const lines = currentText.split(/\r?\n/);
      const serialLineIdx = lines.findIndex(line => /^\s*機號/.test(line));
      if (serialLineIdx >= 0) {
        lines[serialLineIdx] = `機號  ${serialClean}`;
        inputNewNote.value = lines.join('\n');
      } else {
        inputNewNote.value = `${currentText.replace(/\n+$/, '')}\n機號  ${serialClean}`;
      }
    }

    ocrStatusBox.classList.remove('loading');
    ocrStatusBox.textContent = `✅ 機號辨識完成：${serialClean}（已自動填入下方文字區）`;
    showToast(`機號辨識完成：${serialClean}`);
  } catch (err) {
    console.error('局部機號 OCR 發生錯誤:', err);
    ocrStatusBox.classList.remove('loading');
    ocrStatusBox.textContent = '⚠️ 機號辨識過程發生錯誤，請確認網路連線或重試。';
    showToast('機號辨識失敗: ' + err.message);
  } finally {
    if (btnSerialOcr) btnSerialOcr.disabled = false;
  }
}

async function runInvoiceRegionOcr(rx, ry, rw, rh) {
  if (!window.Tesseract) {
    showToast('Tesseract OCR 引擎尚未載入完成，請檢查網路連線');
    return;
  }

  if (btnInvoiceOcr) btnInvoiceOcr.disabled = true;
  ocrStatusBox.classList.remove('hidden');
  ocrStatusBox.classList.add('loading');
  ocrStatusBox.textContent = '⏳ 正在針對框選的發票號碼區域進行高解析度 OCR 辨識...';

  try {
    const cleanCanvas = document.createElement('canvas');
    cleanCanvas.width = canvasWidth;
    cleanCanvas.height = canvasHeight;
    const cCtx = cleanCanvas.getContext('2d');
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';
    cCtx.fillStyle = '#FFFFFF';
    cCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    layers.forEach(layer => {
      cCtx.save();
      cCtx.translate(layer.x, layer.y);
      cCtx.rotate(layer.rotation);
      if (layer.flipH) cCtx.scale(-1, 1);
      if (layer.type === 'text' || layer.type === 'overrideText') {
        const fontWeight = layer.fontWeight || (layer.bold ? 'bold' : 'normal');
        const fontFamily = layer.fontFamily ? `"${layer.fontFamily}", -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif` : '-apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif';
        cCtx.font = `${fontWeight} ${layer.fontSize}px ${fontFamily}`;
        cCtx.fillStyle = layer.color || '#000000';
        cCtx.textBaseline = 'top';
        const lines = (layer.text || '').split('\n');
        const lineHeight = layer.fontSize * 1.35;
        const padX = layer.type === 'overrideText' ? 14 : 30;
        const padY = layer.type === 'overrideText' ? 8 : 15;
        const startX = -layer.width / 2 + padX / 2;
        const startY = -layer.height / 2 + padY / 2;
        lines.forEach((line, idx) => cCtx.fillText(line, startX, startY + idx * lineHeight));
      } else if (layer.image && (layer.image.complete || layer.image instanceof HTMLCanvasElement)) {
        cCtx.drawImage(layer.image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
      }
      cCtx.restore();
    });

    const scaleFactor = rw < 350 || rh < 120 ? 2.5 : 1.5;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(1, Math.round(rw * scaleFactor));
    cropCanvas.height = Math.max(1, Math.round(rh * scaleFactor));
    const crCtx = cropCanvas.getContext('2d');
    crCtx.imageSmoothingEnabled = true;
    crCtx.imageSmoothingQuality = 'high';
    crCtx.fillStyle = '#FFFFFF';
    crCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    crCtx.drawImage(cleanCanvas, rx, ry, rw, rh, 0, 0, cropCanvas.width, cropCanvas.height);

    const result = await window.Tesseract.recognize(cropCanvas, 'eng');
    const rawText = (result && result.data && result.data.text) ? result.data.text : '';
    
    // 辨識 2 碼大寫英文字母 + 8 碼數字（自動移除 - 號或空格）
    let invClean = '';
    const match = rawText.toUpperCase().match(/([A-Z]{2})\s*[-]?\s*(\d{8})/);
    if (match) {
      invClean = `${match[1]}${match[2]}`;
    } else {
      const alnum = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const m2 = alnum.match(/([A-Z]{2}\d{8})/);
      if (m2) {
        invClean = m2[1];
      } else if (alnum.length >= 8) {
        invClean = alnum;
      }
    }

    if (!invClean) {
      ocrStatusBox.classList.remove('loading');
      ocrStatusBox.textContent = '⚠️ 框選區域未辨識出有效發票號碼，請重新框選較清晰的範圍（例：HQ37721024）。';
      showToast('未辨識出有效發票號碼');
      return;
    }

    const currentText = inputNewNote.value || '';
    if (currentText.trim() === '') {
      inputNewNote.value = `發票號碼  ${invClean}`;
    } else {
      const lines = currentText.split(/\r?\n/);
      const invLineIdx = lines.findIndex(line => /^\s*發票號碼/.test(line));
      if (invLineIdx >= 0) {
        lines[invLineIdx] = `發票號碼  ${invClean}`;
        inputNewNote.value = lines.join('\n');
      } else {
        const dateLineIdx = lines.findIndex(line => /^\s*發票購買日期/.test(line));
        if (dateLineIdx >= 0) {
          lines.splice(dateLineIdx + 1, 0, `發票號碼  ${invClean}`);
          inputNewNote.value = lines.join('\n');
        } else {
          inputNewNote.value = `${currentText.replace(/\n+$/, '')}\n發票號碼  ${invClean}`;
        }
      }
    }

    ocrStatusBox.classList.remove('loading');
    ocrStatusBox.textContent = `✅ 發票號碼辨識完成：${invClean}（已自動填入下方文字區）`;
    showToast(`發票號碼辨識完成：${invClean}`);
  } catch (err) {
    console.error('局部發票號碼 OCR 發生錯誤:', err);
    ocrStatusBox.classList.remove('loading');
    ocrStatusBox.textContent = '⚠️ 發票號碼辨識過程發生錯誤，請確認網路連線或重試。';
    showToast('發票號碼辨識失敗: ' + err.message);
  } finally {
    if (btnInvoiceOcr) btnInvoiceOcr.disabled = false;
  }
}

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
    let pdfText = '';
    let photoOcrText = '';

    // 1. 先收集所有 PDF 訂購單的 100% 精準內文 (僅供比對品牌型號，嚴禁用於發票日期)
    layers.forEach(layer => {
      if (layer.type === 'pdf_order' && layer.rawPdfText) {
        pdfText += '\n' + layer.rawPdfText;
      }
    });

    // 2. 針對所有照片圖層 (發票 / 保卡) 執行 OCR
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
          photoOcrText += '\n' + result.data.text;
        }
      }
    }

    const parsed = parseReceiptAndWarrantyText(photoOcrText, pdfText);
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

// 解析混合文字並萃取出指定 5 欄位 (強制發票購買日期僅能來自 photoOcrText)
function parseReceiptAndWarrantyText(photoOcrText = '', pdfText = '') {
  const cleanPhotoText = photoOcrText.replace(/\r/g, '\n');
  const combinedText = (photoOcrText + '\n' + pdfText).replace(/\r/g, '\n');

  // 1. 發票購買日期 (強制僅從照片/發票 OCR 文字中擷取，嚴禁讀取 PDF 訂購單日期)
  let dateStr = '';
  // 優先比對西元 20YY-MM-DD 或 20YY/MM/DD 或 20YY年MM月DD日
  const adMatch = cleanPhotoText.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (adMatch) {
    const yyyy = adMatch[1];
    const mm = adMatch[2].padStart(2, '0');
    const dd = adMatch[3].padStart(2, '0');
    dateStr = `${yyyy}-${mm}-${dd}`;
  } else {
    // 次選比對民國年格式 (如 115年11月21日 或 115-11-21 或 115/11/21)
    const rocMatch = cleanPhotoText.match(/(1\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
    if (rocMatch) {
      const yyyy = parseInt(rocMatch[1], 10) + 1911;
      const mm = rocMatch[2].padStart(2, '0');
      const dd = rocMatch[3].padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    } else {
      const now = new Date();
      dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
  }

  // 2. 發票號碼 (優先從照片 OCR 尋找 2碼大寫英文 + 8碼數字，自動移除中間的 '-' 符號)
  let invoiceNo = '';
  const invPhotoMatch = cleanPhotoText.match(/\b([A-Z]{2})\s*[-]?\s*(\d{8})\b/);
  if (invPhotoMatch) {
    invoiceNo = `${invPhotoMatch[1]}${invPhotoMatch[2]}`;
  } else {
    const invMatch = combinedText.match(/\b([A-Z]{2})\s*[-]?\s*(\d{8})\b/);
    if (invMatch) {
      invoiceNo = `${invMatch[1]}${invMatch[2]}`;
    }
  }

  // 3. 品牌英翻中對照 (結合 PDF 與照片文字)
  let brandZh = '';
  const upperText = combinedText.toUpperCase();
  for (const [eng, zh] of Object.entries(BRAND_MAP)) {
    if (upperText.includes(eng)) {
      brandZh = zh;
      break;
    }
  }

  // 4. 商品型號 (優先抓帶連字號的家電型號如 BD-SX150JJ，結合 PDF 純文字優先精確比對)
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

  // 5. 機號 / 製造號碼 (主要從照片保卡 OCR 文字尋找，排除發票號碼與統編)
  let serialNo = '';
  const lines = cleanPhotoText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('機號') || line.includes('製造號碼') || line.includes('機 號')) {
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

  // 若關鍵字旁未抓到，從照片 OCR 全文中搜尋符合「1~2碼英文 + 5~8碼數字」的製造機號 (如 T633868)
  if (!serialNo) {
    const fallbackSn = cleanPhotoText.toUpperCase().match(/\b([A-Z]{1,2}\d{5,8})\b/g);
    if (fallbackSn) {
      const candidate = fallbackSn.find(t => t !== invoiceNo && t !== '24721268');
      if (candidate) serialNo = candidate;
    }
  }

  return {
    date: dateStr,
    invoiceNo: invoiceNo || '(請確認發票號碼)',
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

  pushUndoState('加入備註文字');
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

let editTextPreState = false;
editTextContent.addEventListener('focus', () => {
  if (activeLayer && (activeLayer.type === 'text' || activeLayer.type === 'overrideText')) {
    pushUndoState('編輯文字內容');
  }
});

editTextContent.addEventListener('input', () => {
  if (activeLayer && (activeLayer.type === 'text' || activeLayer.type === 'overrideText')) {
    activeLayer.text = editTextContent.value;
    const prefix = activeLayer.type === 'overrideText' ? '覆寫' : '備註';
    activeLayer.name = `${prefix}: ${activeLayer.text.slice(0, 8)}...`;
    updateLayersListUI();
    render();
  }
});

btnTextBold.addEventListener('click', () => {
  if (activeLayer && (activeLayer.type === 'text' || activeLayer.type === 'overrideText')) {
    pushUndoState('粗體切換');
    activeLayer.bold = !activeLayer.bold;
    activeLayer.fontWeight = activeLayer.bold ? 'bold' : 'normal';
    btnTextBold.style.backgroundColor = activeLayer.bold ? '#e2e8f0' : 'transparent';
    if (activeLayer.type === 'overrideText' && btnOverrideBold) {
      btnOverrideBold.style.backgroundColor = activeLayer.bold ? '#e2e8f0' : 'transparent';
    }
    render();
  }
});

if (sliderTextFontSize && numTextFontSize) {
  sliderTextFontSize.addEventListener('input', () => {
    if (activeLayer && (activeLayer.type === 'text' || activeLayer.type === 'overrideText')) {
      activeLayer.fontSize = parseInt(sliderTextFontSize.value, 10) || 40;
      numTextFontSize.value = activeLayer.fontSize;
      if (valTextFontSize) valTextFontSize.textContent = `${activeLayer.fontSize}px`;
      if (activeLayer.type === 'overrideText' && inputOverrideFontSize && numOverrideFontSize) {
        inputOverrideFontSize.value = activeLayer.fontSize;
        numOverrideFontSize.value = activeLayer.fontSize;
        if (valOverrideFontSize) valOverrideFontSize.textContent = `${activeLayer.fontSize}px`;
      }
      render();
    }
  });

  numTextFontSize.addEventListener('input', () => {
    if (activeLayer && (activeLayer.type === 'text' || activeLayer.type === 'overrideText')) {
      activeLayer.fontSize = Math.min(200, Math.max(10, parseInt(numTextFontSize.value, 10) || 40));
      sliderTextFontSize.value = activeLayer.fontSize;
      if (valTextFontSize) valTextFontSize.textContent = `${activeLayer.fontSize}px`;
      if (activeLayer.type === 'overrideText' && inputOverrideFontSize && numOverrideFontSize) {
        inputOverrideFontSize.value = activeLayer.fontSize;
        numOverrideFontSize.value = activeLayer.fontSize;
        if (valOverrideFontSize) valOverrideFontSize.textContent = `${activeLayer.fontSize}px`;
      }
      render();
    }
  });
}

textControls.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (activeLayer && (activeLayer.type === 'text' || activeLayer.type === 'overrideText')) {
      pushUndoState('變更文字顏色');
      activeLayer.color = btn.dataset.color;
      updateColorButtonSelection(textControls, activeLayer.color);
      if (activeLayer.type === 'overrideText' && overrideColorPresets) {
        updateColorButtonSelection(overrideColorPresets, activeLayer.color);
      }
      render();
    }
  });
});

// --- 🔤 原生字型嵌入與自訂覆寫文字圖層 ---
if (inputCustomFont) {
  inputCustomFont.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const fontFileName = file.name;
    const fontExt = fontFileName.split('.').pop().toLowerCase();
    let fontFormat = 'truetype';
    if (fontExt === 'otf') fontFormat = 'opentype';
    else if (fontExt === 'woff') fontFormat = 'woff';
    else if (fontExt === 'woff2') fontFormat = 'woff2';

    if (customFontStatus) {
      customFontStatus.textContent = `⏳ 正在載入並解析字型檔: ${fontFileName}...`;
    }
    showToast(`正在載入原生字型: ${fontFileName}...`);

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Data = ev.target.result;
        const fontId = `EmbeddedPDFFont_${Date.now()}`;

        let styleTag = document.getElementById('dynamic-font-style');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'dynamic-font-style';
          document.head.appendChild(styleTag);
        }

        const fontFaceRule = `
          @font-face {
            font-family: '${fontId}';
            src: url('${base64Data}') format('${fontFormat}');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: '${fontId}';
            src: url('${base64Data}') format('${fontFormat}');
            font-weight: bold;
            font-style: normal;
          }
        `;
        styleTag.textContent = fontFaceRule;

        try {
          await document.fonts.load(`40px "${fontId}"`);
          await document.fonts.load(`bold 40px "${fontId}"`);
        } catch (fontLoadErr) {
          console.warn('document.fonts.load 提示:', fontLoadErr);
        }

        currentEmbeddedFontFamily = fontId;
        currentEmbeddedFontName = fontFileName;

        if (customFontStatus) {
          customFontStatus.innerHTML = `✅ 已載入原生字型：<strong style="color: #003FBC;">${fontFileName}</strong>（已鎖定為覆寫文字字型）`;
        }
        showToast(`原生字型「${fontFileName}」已成功嵌入！`);

        if (activeLayer && (activeLayer.type === 'overrideText' || activeLayer.type === 'text')) {
          pushUndoState('套用新嵌入字型');
          activeLayer.fontFamily = fontId;
          activeLayer.fontName = fontFileName;
          render();
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('字型載入失敗:', err);
      if (customFontStatus) {
        customFontStatus.textContent = `⚠️ 字型載入失敗: ${err.message}`;
      }
      showToast(`字型載入失敗: ${err.message}`);
    }
  });
}

if (inputOverrideFontSize && numOverrideFontSize) {
  inputOverrideFontSize.addEventListener('input', () => {
    overrideFontSize = parseInt(inputOverrideFontSize.value, 10) || 40;
    numOverrideFontSize.value = overrideFontSize;
    if (valOverrideFontSize) valOverrideFontSize.textContent = `${overrideFontSize}px`;
    if (activeLayer && activeLayer.type === 'overrideText') {
      activeLayer.fontSize = overrideFontSize;
      if (sliderTextFontSize && numTextFontSize) {
        sliderTextFontSize.value = overrideFontSize;
        numTextFontSize.value = overrideFontSize;
        if (valTextFontSize) valTextFontSize.textContent = `${overrideFontSize}px`;
      }
      render();
    }
  });

  numOverrideFontSize.addEventListener('input', () => {
    overrideFontSize = Math.min(200, Math.max(10, parseInt(numOverrideFontSize.value, 10) || 40));
    inputOverrideFontSize.value = overrideFontSize;
    if (valOverrideFontSize) valOverrideFontSize.textContent = `${overrideFontSize}px`;
    if (activeLayer && activeLayer.type === 'overrideText') {
      activeLayer.fontSize = overrideFontSize;
      if (sliderTextFontSize && numTextFontSize) {
        sliderTextFontSize.value = overrideFontSize;
        numTextFontSize.value = overrideFontSize;
        if (valTextFontSize) valTextFontSize.textContent = `${overrideFontSize}px`;
      }
      render();
    }
  });
}

if (btnOverrideBold) {
  btnOverrideBold.addEventListener('click', () => {
    overrideIsBold = !overrideIsBold;
    btnOverrideBold.style.backgroundColor = overrideIsBold ? '#e2e8f0' : 'transparent';
    if (activeLayer && activeLayer.type === 'overrideText') {
      pushUndoState('切換粗體');
      activeLayer.bold = overrideIsBold;
      activeLayer.fontWeight = overrideIsBold ? 'bold' : 'normal';
      if (btnTextBold) {
        btnTextBold.style.backgroundColor = overrideIsBold ? '#e2e8f0' : 'transparent';
      }
      render();
    }
  });
}

if (overrideColorPresets) {
  overrideColorPresets.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateColorButtonSelection(overrideColorPresets, btn.dataset.color);
      overrideColor = btn.dataset.color;
      if (activeLayer && activeLayer.type === 'overrideText') {
        pushUndoState('變更覆寫文字顏色');
        activeLayer.color = overrideColor;
        updateColorButtonSelection(textControls, activeLayer.color);
        render();
      }
    });
  });
}

if (btnAddOverrideText) {
  btnAddOverrideText.addEventListener('click', () => {
    const text = (inputOverrideText.value || '').trim();
    if (!text) {
      showToast('請先輸入覆寫文字內容');
      return;
    }

    const fontFamily = currentEmbeddedFontFamily || '-apple-system, BlinkMacSystemFont, "Microsoft JhengHei", "新細明體", sans-serif';
    const posX = Math.round(canvasWidth / 2);
    const posY = Math.round(canvasHeight / 2);

    const newLayer = createLayerObject({
      type: 'overrideText',
      name: `覆寫: ${text.slice(0, 10)}`,
      text: text,
      fontFamily: fontFamily,
      fontName: currentEmbeddedFontName,
      fontSize: overrideFontSize,
      bold: overrideIsBold,
      fontWeight: overrideIsBold ? 'bold' : 'normal',
      color: overrideColor,
      x: posX,
      y: posY
    });

    pushUndoState('新增覆寫文字圖層');
    layers.push(newLayer);
    setActiveLayer(newLayer);
    showToast(`已插入覆寫文字「${text.slice(0, 8)}...」到畫布中央，可自由拖曳對齊`);
  });
}

// --- 快速變形控制 ---
btnRotateCCW.addEventListener('click', () => {
  if (activeLayer) {
    pushUndoState('逆時針旋轉 90°');
    activeLayer.rotation -= Math.PI / 2;
    render();
  }
});

btnRotateCW.addEventListener('click', () => {
  if (activeLayer) {
    pushUndoState('順時針旋轉 90°');
    activeLayer.rotation += Math.PI / 2;
    render();
  }
});

btnFlipH.addEventListener('click', () => {
  if (activeLayer) {
    pushUndoState('水平翻轉');
    activeLayer.flipH = !activeLayer.flipH;
    render();
  }
});

btnCenterObj.addEventListener('click', () => {
  if (activeLayer) {
    pushUndoState('居中物件');
    activeLayer.x = canvasWidth / 2;
    activeLayer.y = canvasHeight / 2;
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
  const baseW = exportCropActive ? exportCropRect.width : canvasWidth;
  const baseH = exportCropActive ? exportCropRect.height : canvasHeight;
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

  const baseW = exportCropActive ? exportCropRect.width : canvasWidth;
  const baseH = exportCropActive ? exportCropRect.height : canvasHeight;
  const finalW = Math.round(baseW * exportScale);
  const finalH = Math.round(baseH * exportScale);

  showToast(`正在產生 ${finalW} × ${finalH} px 高解析度圖片...`);

  const bufferCanvas = document.createElement('canvas');
  bufferCanvas.width = canvasWidth;
  bufferCanvas.height = canvasHeight;
  const bufCtx = bufferCanvas.getContext('2d');
  bufCtx.imageSmoothingEnabled = true;
  bufCtx.imageSmoothingQuality = 'high';

  bufCtx.fillStyle = '#FFFFFF';
  bufCtx.fillRect(0, 0, canvasWidth, canvasHeight);

  layers.forEach(layer => {
    bufCtx.save();
    bufCtx.translate(layer.x, layer.y);
    bufCtx.rotate(layer.rotation);
    if (layer.flipH) {
      bufCtx.scale(-1, 1);
    }

    if (layer.type === 'text' || layer.type === 'overrideText') {
      const fontWeight = layer.fontWeight || (layer.bold ? 'bold' : 'normal');
      const fontFamily = layer.fontFamily ? `"${layer.fontFamily}", -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif` : '-apple-system, BlinkMacSystemFont, "Microsoft JhengHei", sans-serif';
      bufCtx.font = `${fontWeight} ${layer.fontSize}px ${fontFamily}`;
      bufCtx.fillStyle = layer.color || '#000000';
      bufCtx.textBaseline = 'top';

      const lines = (layer.text || '').split('\n');
      const lineHeight = layer.fontSize * 1.35;
      const padX = layer.type === 'overrideText' ? 14 : 30;
      const padY = layer.type === 'overrideText' ? 8 : 15;
      const startX = -layer.width / 2 + padX / 2;
      const startY = -layer.height / 2 + padY / 2;

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
    expCtx.drawImage(bufferCanvas, 0, 0, canvasWidth, canvasHeight, 0, 0, finalW, finalH);
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
    pushUndoState('清空畫布');
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

if (btnResetCanvasSize) {
  btnResetCanvasSize.addEventListener('click', () => {
    pushUndoState('重設圖紙尺寸');
    canvasWidth = DEFAULT_CANVAS_WIDTH;
    canvasHeight = DEFAULT_CANVAS_HEIGHT;
    if (exportCropRect.x + exportCropRect.width > canvasWidth) {
      exportCropRect.x = Math.max(0, Math.min(exportCropRect.x, canvasWidth - 200));
      exportCropRect.width = Math.min(exportCropRect.width, canvasWidth - exportCropRect.x);
    }
    if (exportCropRect.y + exportCropRect.height > canvasHeight) {
      exportCropRect.y = Math.max(0, Math.min(exportCropRect.y, canvasHeight - 200));
      exportCropRect.height = Math.min(exportCropRect.height, canvasHeight - exportCropRect.y);
    }
    updateCanvasSizeUI();
    updateExportDimensionDisplay();
    fitCanvasToViewport();
    render();
    showToast('已重設為預設 A4 橫向尺寸 (3508 × 2480 px)');
  });
}

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