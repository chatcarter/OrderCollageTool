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
const DEFAULT_STAMP_BLUE_TONE = 0;
const STORAGE_KEY_FONT_SIZE = 'order_collage_stamp_font_size';
const STORAGE_KEY_OFFSET_Y = 'order_collage_stamp_offset_y';
const STORAGE_KEY_BLUE_TONE = 'order_collage_stamp_blue_tone';

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

// --- 品牌保卡四角透視拉正拖曳狀態 (v21) ---
let isDraggingCardRectifyCorner = -1; // 0: TL, 1: TR, 2: BR, 3: BL

// --- 畫布右邊緣／下邊緣／右下角拖曳調整尺寸狀態 (v35) ---
let isResizingCanvas = false;
let canvasResizeEdge = null; // 'bottom' | 'right' | 'br'
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
let isMovingEraseBox = false;
let eraseBoxMoveStart = null;

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

// 手機端極簡模式 UI 快取 (v38)
const mobilePdfInput = document.getElementById('mobilePdfInput');
const mobilePhotoInput = document.getElementById('mobilePhotoInput');
const btnMobileSelectPdf = document.getElementById('btnMobileSelectPdf');
const btnMobileSelectPhotos = document.getElementById('btnMobileSelectPhotos');
const btnMobileClear = document.getElementById('btnMobileClear');
const btnMobileStampShortcut = document.getElementById('btnMobileStampShortcut');
const btnMobileDownload = document.getElementById('btnMobileDownload');
const btnMobileShare = document.getElementById('btnMobileShare');
const btnMobileSwitchDesktop = document.getElementById('btnMobileSwitchDesktop');
const btnHeaderSwitchMobile = document.getElementById('btnHeaderSwitchMobile');
const mBadgeOrder = document.getElementById('mBadgeOrder');
const mBadgeCard = document.getElementById('mBadgeCard');
const mBadgeReceipt = document.getElementById('mBadgeReceipt');
const canvasStage = document.getElementById('canvasStage');
const mobileStampEditBar = document.getElementById('mobileStampEditBar');
const mobileBlueToneSlider = document.getElementById('mobileBlueToneSlider');
const mobileBlueToneVal = document.getElementById('mobileBlueToneVal');
const btnMobileChangeStampDate = document.getElementById('btnMobileChangeStampDate');
const btnMobileResetBlueTone = document.getElementById('btnMobileResetBlueTone');
const btnMobileDoneEdit = document.getElementById('btnMobileDoneEdit');
const mobileTextEditModalBackdrop = document.getElementById('mobileTextEditModalBackdrop');
const mobileTextEditTextarea = document.getElementById('mobileTextEditTextarea');
const btnCancelMobileTextEdit = document.getElementById('btnCancelMobileTextEdit');
const btnConfirmMobileTextEdit = document.getElementById('btnConfirmMobileTextEdit');
const mobileCompleteOverlay = document.getElementById('mobileCompleteOverlay');
const desktopBatchStatusPanel = document.getElementById('desktopBatchStatusPanel');
const desktopBatchRows = document.getElementById('desktopBatchRows');
const desktopStatusOrder = document.getElementById('desktopStatusOrder');
const desktopStatusReceipt = document.getElementById('desktopStatusReceipt');
const desktopStatusCard = document.getElementById('desktopStatusCard');
const desktopBatchCompleteCard = document.getElementById('desktopBatchCompleteCard');

// 縮放、圖紙尺寸與復原控制
const btnUndo = document.getElementById('btnUndo');
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnReloadRawBatch = document.getElementById('btnReloadRawBatch');
const btnZoomFit = document.getElementById('btnZoomFit');
const btnZoom100 = document.getElementById('btnZoom100');

// --- v56: 原始匯入檔案快照池（供「🔄 重新讀取」一鍵無重整重跑完整流程） ---
const _lastImportedRawFiles = {
  orderPdf: null,
  cardImage: null,
  receiptImage: null,
  extraImages: []
};
let _isReloadingRawBatch = false;

function getSavedRawFilesForReload() {
  const list = [];
  if (_lastImportedRawFiles.orderPdf) list.push(_lastImportedRawFiles.orderPdf);
  if (_lastImportedRawFiles.cardImage) list.push(_lastImportedRawFiles.cardImage);
  if (_lastImportedRawFiles.receiptImage) list.push(_lastImportedRawFiles.receiptImage);
  if (_lastImportedRawFiles.extraImages && _lastImportedRawFiles.extraImages.length > 0) {
    _lastImportedRawFiles.extraImages.forEach(f => {
      if (f) list.push(f);
    });
  }
  return list;
}

function updateReloadRawBatchButtonState() {
  if (!btnReloadRawBatch) return;
  btnReloadRawBatch.disabled = getSavedRawFilesForReload().length === 0 || _isReloadingRawBatch;
}

function recordImportedRawFileByRole(roleKey, file) {
  if (!file) return;
  if (roleKey === 'orderPdf') {
    _lastImportedRawFiles.orderPdf = file;
  } else if (roleKey === 'cardImage') {
    _lastImportedRawFiles.cardImage = file;
  } else if (roleKey === 'receiptImage') {
    _lastImportedRawFiles.receiptImage = file;
  } else {
    const sig = `${file.name}_${file.size}_${file.lastModified || 0}`;
    const exists = _lastImportedRawFiles.extraImages.some(
      f => f && `${f.name}_${f.size}_${f.lastModified || 0}` === sig
    );
    if (!exists) {
      _lastImportedRawFiles.extraImages.push(file);
    }
  }
  updateReloadRawBatchButtonState();
}
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

// 保卡手寫客戶資料生成器控制項 (v20 - 20 種高差異化人物字跡)
const inputHandwritingText = document.getElementById('inputHandwritingText');
const hwPersonaBadge = document.getElementById('hwPersonaBadge');
const hwStrokeStatus = document.getElementById('hwStrokeStatus');
const hwCategoryTabs = document.getElementById('hwCategoryTabs');
const hwPersonaButtons = document.getElementById('hwPersonaButtons');
const hwPersonaSelect = document.getElementById('hwPersonaSelect');
const hwColorPresets = document.getElementById('hwColorPresets');
const hwTipGroup = document.getElementById('hwTipGroup');
const sliderHwSpacing = document.getElementById('sliderHwSpacing');
const valHwSpacing = document.getElementById('valHwSpacing');
const sliderHwNeatness = document.getElementById('sliderHwNeatness');
const valHwNeatness = document.getElementById('valHwNeatness');
const hwMainPreviewCanvas = document.getElementById('hwMainPreviewCanvas');
const btnHwResample = document.getElementById('btnHwResample');
const btnAddHandwriting = document.getElementById('btnAddHandwriting');

// 選取手寫圖層專用二次微調控制項
const handwritingControls = document.getElementById('handwritingControls');
const editHwText = document.getElementById('editHwText');
const editHwPersona = document.getElementById('editHwPersona');
const editHwColorPresets = document.getElementById('editHwColorPresets');
const editHwTipGroup = document.getElementById('editHwTipGroup');
const sliderEditHwSpacing = document.getElementById('sliderEditHwSpacing');
const valEditHwSpacing = document.getElementById('valEditHwSpacing');
const sliderEditHwNeatness = document.getElementById('sliderEditHwNeatness');
const valEditHwNeatness = document.getElementById('valEditHwNeatness');

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
const inputStampBlueTone = document.getElementById('inputStampBlueTone');
const valStampBlueTone = document.getElementById('valStampBlueTone');
const btnResetStampBlueTone = document.getElementById('btnResetStampBlueTone');
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

// 品牌保卡智慧辨識與自動蓋章控制項 (v21/v22/v23/v26)
const canvasOcrStatusPill = document.getElementById('canvasOcrStatusPill');
const switchAutoSmartCard = document.getElementById('switchAutoSmartCard');
const switchAutoLayout = document.getElementById('switchAutoLayout');
const btnAutoLayout = document.getElementById('btnAutoLayout');
const selectCardTemplateMode = document.getElementById('selectCardTemplateMode');
const cardTemplateBadge = document.getElementById('cardTemplateBadge');
const btnToggleCardRectify = document.getElementById('btnToggleCardRectify');
const btnApplyCardRectify = document.getElementById('btnApplyCardRectify');
const cardRectifyNotice = document.getElementById('cardRectifyNotice');
const cardSmartStatus = document.getElementById('cardSmartStatus');
const inputCardModel = document.getElementById('inputCardModel');
const btnCopyCardModel = document.getElementById('btnCopyCardModel');
const inputCardSerial = document.getElementById('inputCardSerial');
const btnCopyCardSerial = document.getElementById('btnCopyCardSerial');
const btnRerunCardOcr = document.getElementById('btnRerunCardOcr');
const btnSyncCardToNote = document.getElementById('btnSyncCardToNote');
const btnAutoStampCard = document.getElementById('btnAutoStampCard');

// 保卡印章日期輸入對話框控制項 (v34)
const stampDateModalBackdrop = document.getElementById('stampDateModalBackdrop');
const modalStampDateInput = document.getElementById('modalStampDateInput');
const modalStampDatePreview = document.getElementById('modalStampDatePreview');
const modalStampDateError = document.getElementById('modalStampDateError');
const btnConfirmModalStampDate = document.getElementById('btnConfirmModalStampDate');

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
  if (typeof initMobileWorkbenchControls === 'function') initMobileWorkbenchControls();
  if (typeof detectMobileWorkbenchMode === 'function') detectMobileWorkbenchMode();
  updateCanvasSizeUI();
  fitCanvasToViewport();
  updateExportDimensionDisplay();
  render();
  setupEventListeners();
  initPdfJsWorker();
  updateUndoBtnState();
  initHandwritingGenerator();
  initSmartWarrantyModule();
  if (typeof initStampDateModal === 'function') initStampDateModal();
  if (typeof updateMobileWorkflowBadges === 'function') updateMobileWorkflowBadges();
  if (document.body.classList.contains('is-mobile-mode')) {
    requestAnimationFrame(() => fitMobileCanvasToViewport());
    setTimeout(() => {
      if (document.body.classList.contains('is-mobile-mode') && !getMobileEditingStampLayer()) {
        fitMobileCanvasToViewport();
      }
    }, 100);
  }
});

// --- 歷史復原（Undo）核心函式 ---
function cloneLayerForUndo(l) {
  const cloned = { ...l };
  if (l.cropRect) cloned.cropRect = { ...l.cropRect };
  if (l.distortCorners) cloned.distortCorners = l.distortCorners.map(c => ({ ...c }));
  if (l.eraseBox) cloned.eraseBox = { ...l.eraseBox };
  if (l.hwOptions) cloned.hwOptions = { ...l.hwOptions };
  if (l.stampSpec) cloned.stampSpec = { ...l.stampSpec };

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

function getCurrentStampBlueTone() {
  if (!inputStampBlueTone) return DEFAULT_STAMP_BLUE_TONE;
  const v = parseInt(inputStampBlueTone.value, 10);
  return Number.isFinite(v) ? Math.max(-40, Math.min(40, v)) : DEFAULT_STAMP_BLUE_TONE;
}

function formatBlueToneLabel(tone) {
  const t = parseInt(tone, 10) || 0;
  if (t === 0) return '0 (自動光影)';
  if (t < 0) return `${t} (偏淡)`;
  return `+${t} (深藍)`;
}

function syncBlueToneDisplayValues(toneVal) {
  const t = Math.max(-40, Math.min(40, parseInt(toneVal, 10) || 0));
  if (inputStampBlueTone) inputStampBlueTone.value = t;
  if (valStampBlueTone) valStampBlueTone.textContent = formatBlueToneLabel(t);
  if (mobileBlueToneSlider) mobileBlueToneSlider.value = t;
  if (mobileBlueToneVal) mobileBlueToneVal.textContent = t > 0 ? `+${t}` : `${t}`;
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

    if (inputStampBlueTone && valStampBlueTone) {
      const savedTone = localStorage.getItem(STORAGE_KEY_BLUE_TONE);
      const toneVal = savedTone !== null ? Math.max(-40, Math.min(40, parseInt(savedTone, 10) || 0)) : DEFAULT_STAMP_BLUE_TONE;
      syncBlueToneDisplayValues(toneVal);
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
  const blueTone = getCurrentStampBlueTone();

  const stampImg = new Image();
  stampImg.onload = () => {
    if (window.CardTemplates && typeof window.CardTemplates.adaptStampCanvasToLighting === 'function') {
      const adapted = window.CardTemplates.adaptStampCanvasToLighting(
        stampImg,
        dateStr,
        fontSize,
        offsetY,
        { avgL: 245, avgR: 245, avgG: 245, avgB: 245, leftAvgL: 245, rightAvgL: 245 },
        blueTone
      );
      stampPreviewImg.src = adapted.canvas.toDataURL('image/png');
      return;
    }

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
    console.warn('STAMP_CLEAN_BASE64 尚未載入，請確認 static/stamp_data.js');
  }
}

sliderStampFontSize.addEventListener('input', () => {
  valStampFontSize.textContent = `${sliderStampFontSize.value}px`;
  try {
    localStorage.setItem(STORAGE_KEY_FONT_SIZE, sliderStampFontSize.value);
  } catch (e) {}
  updateStampPreview();
  if (typeof scheduleLiveStampRefresh === 'function') scheduleLiveStampRefresh();
});

sliderStampOffsetY.addEventListener('input', () => {
  const y = parseInt(sliderStampOffsetY.value, 10);
  const sign = y >= 0 ? '+' : '';
  valStampOffsetY.textContent = `${sign}${y}px`;
  try {
    localStorage.setItem(STORAGE_KEY_OFFSET_Y, sliderStampOffsetY.value);
  } catch (e) {}
  updateStampPreview();
  if (typeof scheduleLiveStampRefresh === 'function') scheduleLiveStampRefresh();
});

inputStampDate.addEventListener('input', () => {
  updateStampPreview();
  if (typeof scheduleLiveStampRefresh === 'function') scheduleLiveStampRefresh();
});

const resetBlueToneToDefault = (showMsg = false) => {
  syncBlueToneDisplayValues(DEFAULT_STAMP_BLUE_TONE);
  try {
    localStorage.removeItem(STORAGE_KEY_BLUE_TONE);
  } catch (e) {}
  updateStampPreview();
  if (typeof refreshAllStampsAppearance === 'function') {
    refreshAllStampsAppearance(false);
  }
  if (showMsg) showToast('已將專櫃藍色深淺歸零（恢復自動光影配色）');
};

const applyBlueToneSliderValue = rawVal => {
  const toneVal = Math.max(-40, Math.min(40, parseInt(rawVal, 10) || 0));
  syncBlueToneDisplayValues(toneVal);
  try {
    localStorage.setItem(STORAGE_KEY_BLUE_TONE, String(toneVal));
  } catch (e) {}
  updateStampPreview();
  if (typeof scheduleLiveStampRefresh === 'function') {
    scheduleLiveStampRefresh();
  }
};

if (inputStampBlueTone) {
  inputStampBlueTone.addEventListener('input', () => {
    applyBlueToneSliderValue(inputStampBlueTone.value);
  });
  inputStampBlueTone.addEventListener('dblclick', () => {
    resetBlueToneToDefault(true);
  });
}

if (btnResetStampBlueTone) {
  btnResetStampBlueTone.addEventListener('click', () => {
    resetBlueToneToDefault(true);
  });
}

btnResetStampSettings.addEventListener('click', () => {
  sliderStampFontSize.value = DEFAULT_STAMP_FONT_SIZE;
  valStampFontSize.textContent = `${DEFAULT_STAMP_FONT_SIZE}px`;
  sliderStampOffsetY.value = DEFAULT_STAMP_OFFSET_Y;
  valStampOffsetY.textContent = `+${DEFAULT_STAMP_OFFSET_Y}px`;
  if (inputStampBlueTone) inputStampBlueTone.value = DEFAULT_STAMP_BLUE_TONE;
  if (valStampBlueTone) valStampBlueTone.textContent = formatBlueToneLabel(DEFAULT_STAMP_BLUE_TONE);
  try {
    localStorage.removeItem(STORAGE_KEY_FONT_SIZE);
    localStorage.removeItem(STORAGE_KEY_OFFSET_Y);
    localStorage.removeItem(STORAGE_KEY_BLUE_TONE);
  } catch (e) {}
  updateStampPreview();
  if (typeof refreshAllStampsAppearance === 'function') {
    refreshAllStampsAppearance(false);
  }
  showToast('已重設印章字體、位置與藍色深淺');
});

// 初始化 PDF.js Worker
function initPdfJsWorker() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

// --- 縮放與視窗適應 ---
let mobileFitScale = 0.1;
let mobileViewScale = 1.0;

function updateCanvasSizeUI() {
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  if (document.body.classList.contains('is-mobile-mode')) {
    setZoom(currentZoom);
  } else {
    canvasWrapper.style.width = `${canvasWidth}px`;
    canvasWrapper.style.height = `${canvasHeight}px`;
  }
  if (canvasSizeLabel) {
    canvasSizeLabel.textContent = `圖紙尺寸：${canvasWidth} × ${canvasHeight} px`;
  }
}

function setZoom(zoom) {
  const isMobile = document.body.classList.contains('is-mobile-mode');
  if (isMobile) {
    const minZoom = Math.max(0.03, Math.min(mobileFitScale || 0.05, 1.0));
    const maxZoom = 3.0;
    currentZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    mobileViewScale = currentZoom;

    const visualW = Math.max(1, Math.round(canvasWidth * currentZoom));
    const visualH = Math.max(1, Math.round(canvasHeight * currentZoom));

    if (canvasStage) {
      canvasStage.style.width = `${visualW}px`;
      canvasStage.style.height = `${visualH}px`;
    }
    canvasWrapper.style.width = `${visualW}px`;
    canvasWrapper.style.height = `${visualH}px`;
    canvasWrapper.style.transform = 'none';
    canvasWrapper.style.transformOrigin = 'top left';
    canvasWrapper.style.marginLeft = '';
    canvasWrapper.style.marginTop = '';
    canvasWrapper.style.marginRight = '';
    canvasWrapper.style.marginBottom = '';
    canvas.style.width = `${visualW}px`;
    canvas.style.height = `${visualH}px`;
  } else {
    currentZoom = Math.max(0.15, Math.min(2.0, zoom));
    if (canvasStage) {
      canvasStage.style.width = '';
      canvasStage.style.height = '';
    }
    canvasWrapper.style.width = `${canvasWidth}px`;
    canvasWrapper.style.height = `${canvasHeight}px`;
    canvasWrapper.style.transform = `scale(${currentZoom})`;
    canvasWrapper.style.transformOrigin = 'top left';
    canvasWrapper.style.marginLeft = '';
    canvasWrapper.style.marginTop = '';
    canvasWrapper.style.marginRight = '';
    canvasWrapper.style.marginBottom = '';
    canvas.style.width = '';
    canvas.style.height = '';
  }

  if (zoomPercent) {
    zoomPercent.textContent = `${Math.round(currentZoom * 100)}%`;
  }
}

function fitMobileCanvasToViewport() {
  if (!canvasViewport) return;
  const pad = 12;
  const availW = Math.max(120, canvasViewport.clientWidth - pad * 2);
  const availH = Math.max(120, canvasViewport.clientHeight - pad * 2);
  const scaleW = availW / Math.max(1, canvasWidth);
  const scaleH = availH / Math.max(1, canvasHeight);
  const fitScale = Math.max(0.03, Math.min(scaleW, scaleH));
  mobileFitScale = fitScale;
  mobileViewScale = fitScale;
  setZoom(mobileViewScale);
  canvasViewport.scrollLeft = 0;
  canvasViewport.scrollTop = 0;
}

function fitCanvasToViewport() {
  if (document.body.classList.contains('is-mobile-mode')) {
    fitMobileCanvasToViewport();
    return;
  }
  const pad = 32;
  const availW = Math.max(120, canvasViewport.clientWidth - pad * 2);
  const availH = Math.max(120, canvasViewport.clientHeight - pad * 2);
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
    // 品牌保卡四角透視拉正模式 (v21/v23/v25/v28)
    docRole: options.docRole || null, // 'order_sheet' | 'warranty_card' | 'receipt'
    cardRectifyMode: false,
    cardQuadCorners: null,
    cardTemplateId: null,
    isRectifiedCard: false,
    rectifiedCleanCanvas: options.rectifiedCleanCanvas || null,
    hasBakedStamp: !!options.hasBakedStamp,
    isReceipt: !!options.isReceipt,
    attachedCardId: options.attachedCardId || null,
    stampSpec: options.stampSpec || null,
    isAutoFiveLineNote: !!options.isAutoFiveLineNote,
    userEdited: !!options.userEdited,
    blendMode: options.blendMode || null,
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
      if (layer.type === 'handwriting' || layer.blendMode === 'multiply') {
        ctx.globalCompositeOperation = 'multiply';
      }
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

      // 若處於品牌保卡四角透視拉正模式，繪製青色四邊形框與 4 角點控制柄
      if (!isExporting && layer === activeLayer && layer.cardRectifyMode && layer.cardQuadCorners) {
        drawCardRectifyOverlay(layer);
      }

      // 若處於局部圈選塗白模式，繪製紅色虛線框
      if (!isExporting && layer === activeLayer && isEraseMode) {
        drawLayerEraseBox(layer);
      }
    }

    ctx.restore();
  });

  // 3. 繪製選取框與控制柄（手機預覽狀態預設隱藏外框防誤觸，僅於雙擊進入編輯狀態才繪製）
  const isMobileModeActive = document.body.classList.contains('is-mobile-mode');
  if (
    !isExporting &&
    activeLayer &&
    !activeLayer._isInlineEditing &&
    !activeLayer.rectCropMode &&
    !activeLayer.distortMode &&
    !activeLayer.cardRectifyMode &&
    !isEraseMode &&
    (!isMobileModeActive || mobileEditingLayerId === activeLayer.id)
  ) {
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

  // 6. 繪製畫布右邊界／下邊界／右下角尺寸調整把手（電腦版顯示）
  if (!isExporting && !isMobileModeActive) {
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

  if (layer._isInlineEditing) return;

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

// --- 繪製圖層局部圈選塗白遮除框（Windows 小畫家 MS Paint 風格）---
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
  // 1. 半透明淡藍色選取區域遮罩
  ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
  ctx.fillRect(box.x, box.y, box.w, box.h);

  // 2. Windows 小畫家風格黑白相間高對比虛線邊框
  // 底層黑色實線
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5 / currentZoom;
  ctx.setLineDash([]);
  ctx.strokeRect(box.x, box.y, box.w, box.h);

  // 表層白色虛線 (在黑色、文字或彩色照片上皆極清晰)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5 / currentZoom;
  ctx.setLineDash([6 / currentZoom, 6 / currentZoom]);
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.setLineDash([]);

  // 3. 繪製小畫家風格四角與邊界控制小方塊
  const handleSize = 6 / currentZoom;
  const halfH = handleSize / 2;
  const handles = [
    { x: box.x, y: box.y }, // 左上
    { x: box.x + box.w / 2, y: box.y }, // 上中
    { x: box.x + box.w, y: box.y }, // 右上
    { x: box.x + box.w, y: box.y + box.h / 2 }, // 右中
    { x: box.x + box.w, y: box.y + box.h }, // 右下
    { x: box.x + box.w / 2, y: box.y + box.h }, // 下中
    { x: box.x, y: box.y + box.h }, // 左下
    { x: box.x, y: box.y + box.h / 2 }, // 左中
  ];
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2 / currentZoom;
  handles.forEach(h => {
    ctx.fillRect(h.x - halfH, h.y - halfH, handleSize, handleSize);
    ctx.strokeRect(h.x - halfH, h.y - halfH, handleSize, handleSize);
  });

  // 4. 浮動操作提示標籤
  if (box.w > 40 && box.h > 15) {
    const text = '✂️ 塗白清除 (按 Delete · 方向鍵微調)';
    ctx.font = `bold ${Math.round(12 / currentZoom)}px -apple-system, sans-serif`;
    const tw = ctx.measureText(text).width;
    const bh = 24 / currentZoom;
    const bw = tw + 18 / currentZoom;
    const by = (box.y - bh - 6 / currentZoom >= -layer.height / 2) ? (box.y - bh - 6 / currentZoom) : (box.y + box.h + 6 / currentZoom);
    const bx = Math.max(-layer.width / 2, Math.min(layer.width / 2 - bw, box.x));

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1 / currentZoom;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + 9 / currentZoom, by + bh / 2);
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

// --- 繪製畫布右邊緣、下邊緣與右下角拖曳把手（僅於編輯畫面顯示，匯出與列印時自動隔離）(v35) ---
function drawCanvasResizeHandles() {
  ctx.save();
  const barLen = 84 / currentZoom;
  const barThick = 10 / currentZoom;
  const cornerSize = 14 / currentZoom;

  ctx.fillStyle = 'rgba(0, 63, 188, 0.85)';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 / currentZoom;

  // 1. 下邊緣正中央把手 (Bottom Handle)
  const bx = canvasWidth / 2 - barLen / 2;
  const by = canvasHeight - barThick - 2 / currentZoom;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(bx, by, barLen, barThick, 5 / currentZoom);
  } else {
    ctx.rect(bx, by, barLen, barThick);
  }
  ctx.fill();
  ctx.stroke();

  // 2. 右邊緣正中央把手 (Right Handle)
  const rx = canvasWidth - barThick - 2 / currentZoom;
  const ry = canvasHeight / 2 - barLen / 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(rx, ry, barThick, barLen, 5 / currentZoom);
  } else {
    ctx.rect(rx, ry, barThick, barLen);
  }
  ctx.fill();
  ctx.stroke();

  // 3. 右下角把手 (Bottom-Right Handle)
  ctx.fillStyle = '#003FBC';
  ctx.fillRect(
    canvasWidth - cornerSize - 2 / currentZoom,
    canvasHeight - cornerSize - 2 / currentZoom,
    cornerSize,
    cornerSize
  );
  ctx.strokeRect(
    canvasWidth - cornerSize - 2 / currentZoom,
    canvasHeight - cornerSize - 2 / currentZoom,
    cornerSize,
    cornerSize
  );

  ctx.restore();
}

// --- 畫布右邊緣／下邊緣／右下角命中測試 (v35) ---
function hitTestCanvasResize(x, y) {
  const edgeThreshold = 18 / currentZoom;
  const barHalf = 52 / currentZoom;
  const cornerHit = 24 / currentZoom;

  const nearRight = x >= canvasWidth - edgeThreshold && x <= canvasWidth && y >= 0 && y <= canvasHeight;
  const nearBottom = y >= canvasHeight - edgeThreshold && y <= canvasHeight && x >= 0 && x <= canvasWidth;

  if (Math.hypot(canvasWidth - x, canvasHeight - y) <= cornerHit || (nearRight && nearBottom)) {
    return 'br';
  }
  if (nearBottom && (Math.abs(x - canvasWidth / 2) <= barHalf || y >= canvasHeight - 10 / currentZoom)) {
    return 'bottom';
  }
  if (nearRight && (Math.abs(y - canvasHeight / 2) <= barHalf || x >= canvasWidth - 10 / currentZoom)) {
    return 'right';
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

  // 1-1. 若目前選取物件處於品牌保卡四角透視拉正模式，優先偵測 4 角點
  if (activeLayer && activeLayer.type === 'image' && activeLayer.cardRectifyMode && activeLayer.cardQuadCorners) {
    const layer = activeLayer;
    const dx = x - layer.x;
    const dy = y - layer.y;
    const localX = dx * Math.cos(-layer.rotation) - dy * Math.sin(-layer.rotation);
    const localY = dx * Math.sin(-layer.rotation) + dy * Math.cos(-layer.rotation);
    const hw = layer.width / 2;
    const hh = layer.height / 2;
    const baseImg = layer.croppedImage || layer.rawImage || layer.image;

    const pts = layer.cardQuadCorners.map(pt => ({
      x: (pt.x / baseImg.width) * layer.width - hw,
      y: (pt.y / baseImg.height) * layer.height - hh
    }));

    const hitRadius = 28 / currentZoom;
    for (let cIdx = 0; cIdx < 4; cIdx++) {
      if (Math.hypot(localX - pts[cIdx].x, localY - pts[cIdx].y) <= hitRadius) {
        return { layer, part: 'card_rectify_corner', cornerIdx: cIdx };
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

  // 4. 若目前選取物件本身就是專櫃印章，優先偵測其控制把手 (旋轉與 4 角縮放)
  const hitRadiusForHandles = (document.body.classList.contains('is-mobile-mode') ? 30 : 22) / currentZoom;
  const hitRotStemLength = 32 / currentZoom;
  const hitTestLayerControlHandles = targetLayer => {
    if (!targetLayer || targetLayer.rectCropMode || targetLayer.distortMode) return null;
    const dx = x - targetLayer.x;
    const dy = y - targetLayer.y;
    const localX = dx * Math.cos(-targetLayer.rotation) - dy * Math.sin(-targetLayer.rotation);
    const localY = dx * Math.sin(-targetLayer.rotation) + dy * Math.cos(-targetLayer.rotation);
    const hw = targetLayer.width / 2;
    const hh = targetLayer.height / 2;

    if (Math.hypot(localX - 0, localY - (-hh - hitRotStemLength)) <= hitRadiusForHandles) {
      return { layer: targetLayer, part: 'rot' };
    }
    if (Math.hypot(localX - (-hw), localY - (-hh)) <= hitRadiusForHandles) return { layer: targetLayer, part: 'tl' };
    if (Math.hypot(localX - hw, localY - (-hh)) <= hitRadiusForHandles) return { layer: targetLayer, part: 'tr' };
    if (Math.hypot(localX - hw, localY - hh) <= hitRadiusForHandles) return { layer: targetLayer, part: 'br' };
    if (Math.hypot(localX - (-hw), localY - hh) <= hitRadiusForHandles) return { layer: targetLayer, part: 'bl' };
    return null;
  };

  if (activeLayer && activeLayer.type === 'stamp') {
    const stampHandleHit = hitTestLayerControlHandles(activeLayer);
    if (stampHandleHit) return stampHandleHit;
  }

  // 4.5 v56 最高敏感度專屬優先通道：優先偵測「專櫃印章 (stamp)」圖層本體與放大熱區，不被下方保卡／邊框攔截
  const stampHitPad = (document.body.classList.contains('is-mobile-mode') ? 26 : 16) / currentZoom;
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer || layer.type !== 'stamp') continue;
    const dx = x - layer.x;
    const dy = y - layer.y;
    const localX = dx * Math.cos(-layer.rotation) - dy * Math.sin(-layer.rotation);
    const localY = dx * Math.sin(-layer.rotation) + dy * Math.cos(-layer.rotation);
    const hw = layer.width / 2 + stampHitPad;
    const hh = layer.height / 2 + stampHitPad;
    if (localX >= -hw && localX <= hw && localY >= -hh && localY <= hh) {
      return { layer, part: 'body' };
    }
  }

  // 4.8 其餘已選取物件之一般控制把手 (旋轉與 4 角等比例縮放)
  if (activeLayer && activeLayer.type !== 'stamp') {
    const generalHandleHit = hitTestLayerControlHandles(activeLayer);
    if (generalHandleHit) return generalHandleHit;
  }

  // 5. 由頂層往底層偵測一般物件本體 (body)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer || layer.type === 'stamp') continue;
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

  // 0B. 局部圈選刪除（塗白）MS Paint 選取框處理
  if (isEraseMode && activeLayer && (activeLayer.type === 'image' || activeLayer.type === 'pdf_order')) {
    const localP = getLayerLocalCoords(activeLayer, coords.x, coords.y);
    const box = activeLayer.eraseBox;

    // 檢查是否點擊在已存在的選取框內部 -> 進入拖曳移動選取框模式
    if (box && localP.x >= box.x && localP.x <= box.x + box.w && localP.y >= box.y && localP.y <= box.y + box.h) {
      isMovingEraseBox = true;
      eraseBoxMoveStart = {
        clickLocalX: localP.x,
        clickLocalY: localP.y,
        origBoxX: box.x,
        origBoxY: box.y
      };
      return;
    }

    // 點在選取框外部 -> 放棄舊框並開始拉出新選取框
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
    if (hit.layer.type !== 'stamp' && typeof getMobileEditingStampLayer === 'function' && getMobileEditingStampLayer()) {
      exitMobileEditMode(true);
    }

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
    } else if (hit.part === 'card_rectify_corner') {
      isDraggingCardRectifyCorner = hit.cornerIdx;
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
    if (typeof exitMobileEditMode === 'function') {
      exitMobileEditMode(true);
    }
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

  // 0B-1. 平移已存在的塗白選取框（MS Paint 風格拖曳移動）
  if (isMovingEraseBox && activeLayer && activeLayer.eraseBox && eraseBoxMoveStart) {
    const localP = getLayerLocalCoords(activeLayer, coords.x, coords.y);
    const deltaX = localP.x - eraseBoxMoveStart.clickLocalX;
    const deltaY = localP.y - eraseBoxMoveStart.clickLocalY;
    const hw = activeLayer.width / 2;
    const hh = activeLayer.height / 2;
    const box = activeLayer.eraseBox;

    let newX = eraseBoxMoveStart.origBoxX + deltaX;
    let newY = eraseBoxMoveStart.origBoxY + deltaY;

    // 限制選取框不超出圖片邊界
    newX = Math.max(-hw, Math.min(hw - box.w, newX));
    newY = Math.max(-hh, Math.min(hh - box.h, newY));

    box.x = Math.round(newX);
    box.y = Math.round(newY);
    render();
    return;
  }

  // 0B-2. 局部塗白框選拖曳繪製
  if (isDrawingEraseBox && eraseBoxStart && activeLayer) {
    eraseBoxCurrent = { x: coords.x, y: coords.y };
    render();
    return;
  }

  // 0C. 畫布右邊緣／下邊緣／右下角拖曳調整圖紙尺寸（固定左上原點 (0,0)，左側物件原地不動，右下角支援 Shift 等比例延伸）(v35)
  if (isResizingCanvas && canvasResizeInitial) {
    const screenDx = (e.clientX - canvasResizeInitial.startClientX) / currentZoom;
    const screenDy = (e.clientY - canvasResizeInitial.startClientY) / currentZoom;

    if (canvasResizeEdge === 'br' && e.shiftKey) {
      const ratio = canvasResizeInitial.width / Math.max(1, canvasResizeInitial.height);
      const candW = Math.max(MIN_CANVAS_WIDTH, Math.round(canvasResizeInitial.width + screenDx));
      const candH = Math.max(MIN_CANVAS_HEIGHT, Math.round(canvasResizeInitial.height + screenDy));
      if (
        Math.abs(screenDx) / Math.max(1, canvasResizeInitial.width) >=
        Math.abs(screenDy) / Math.max(1, canvasResizeInitial.height)
      ) {
        canvasWidth = candW;
        canvasHeight = Math.max(MIN_CANVAS_HEIGHT, Math.round(candW / ratio));
      } else {
        canvasHeight = candH;
        canvasWidth = Math.max(MIN_CANVAS_WIDTH, Math.round(candH * ratio));
      }
    } else {
      if (canvasResizeEdge === 'bottom' || canvasResizeEdge === 'br') {
        canvasHeight = Math.max(MIN_CANVAS_HEIGHT, Math.round(canvasResizeInitial.height + screenDy));
      }
      if (canvasResizeEdge === 'right' || canvasResizeEdge === 'br') {
        canvasWidth = Math.max(MIN_CANVAS_WIDTH, Math.round(canvasResizeInitial.width + screenDx));
      }
    }

    if (exportCropRect.x + exportCropRect.width > canvasWidth) {
      exportCropRect.x = Math.max(0, canvasWidth - exportCropRect.width);
      if (exportCropRect.x + exportCropRect.width > canvasWidth) {
        exportCropRect.width = Math.max(200, canvasWidth - exportCropRect.x);
      }
    }
    if (exportCropRect.y + exportCropRect.height > canvasHeight) {
      exportCropRect.y = Math.max(0, canvasHeight - exportCropRect.height);
      if (exportCropRect.y + exportCropRect.height > canvasHeight) {
        exportCropRect.height = Math.max(200, canvasHeight - exportCropRect.y);
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

  // 2-1. 拖曳品牌保卡四角透視拉正控制點 (v21)
  if (isDraggingCardRectifyCorner >= 0 && activeLayer.cardRectifyMode && activeLayer.cardQuadCorners) {
    const hw = activeLayer.width / 2;
    const hh = activeLayer.height / 2;
    const localX = (coords.x - activeLayer.x) * Math.cos(-activeLayer.rotation) - (coords.y - activeLayer.y) * Math.sin(-activeLayer.rotation);
    const localY = (coords.x - activeLayer.x) * Math.sin(-activeLayer.rotation) + (coords.y - activeLayer.y) * Math.cos(-activeLayer.rotation);
    const baseImg = activeLayer.croppedImage || activeLayer.rawImage || activeLayer.image;

    const rawX = Math.max(0, Math.min(baseImg.width, ((localX + hw) / activeLayer.width) * baseImg.width));
    const rawY = Math.max(0, Math.min(baseImg.height, ((localY + hh) / activeLayer.height) * baseImg.height));

    activeLayer.cardQuadCorners[isDraggingCardRectifyCorner] = { x: Math.round(rawX), y: Math.round(rawY) };
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

  // 4~6. 共用拖曳移動 / 旋轉 / 等比例縮放
  if (applyActiveLayerPointerDrag(coords, dx, dy)) {
    return;
  }

  // 7. 動態調整滑鼠游標樣式
  if (ocrRegionMode) {
    canvas.style.cursor = 'crosshair';
    return;
  }
  if (isEraseMode && activeLayer && (activeLayer.type === 'image' || activeLayer.type === 'pdf_order')) {
    if (activeLayer.eraseBox) {
      const localP = getLayerLocalCoords(activeLayer, coords.x, coords.y);
      const box = activeLayer.eraseBox;
      if (localP.x >= box.x && localP.x <= box.x + box.w && localP.y >= box.y && localP.y <= box.y + box.h) {
        canvas.style.cursor = 'move';
        return;
      }
    }
    canvas.style.cursor = 'crosshair';
    return;
  }

  const canvasEdgeHover = hitTestCanvasResize(coords.x, coords.y);
  if (canvasEdgeHover === 'br') {
    canvas.style.cursor = 'nwse-resize';
    return;
  } else if (canvasEdgeHover === 'bottom') {
    canvas.style.cursor = 'ns-resize';
    return;
  } else if (canvasEdgeHover === 'right') {
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

  // 0B-1. 平移選取框結束
  if (isMovingEraseBox) {
    isMovingEraseBox = false;
    eraseBoxMoveStart = null;
    render();
    return;
  }

  // 0B-2. 局部塗白框選完成
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

    if (finalW > 6 && finalH > 6) {
      activeLayer.eraseBox = { x: clampLx, y: clampLy, w: finalW, h: finalH };
      if (btnApplyEraseBox) btnApplyEraseBox.classList.remove('hidden');
      showToast('已圈選範圍：可拖曳或以方向鍵微調，按 Delete 執行塗白');
    } else {
      activeLayer.eraseBox = null;
      if (btnApplyEraseBox) btnApplyEraseBox.classList.add('hidden');
    }
    render();
    return;
  }

  finishPointerDragSession();
});

function applyActiveLayerPointerDrag(coords, dx, dy) {
  if (!activeLayer || !objInitialState) return false;
  if (isDragging) {
    activeLayer.x = objInitialState.x + dx;
    activeLayer.y = objInitialState.y + dy;
    render();
    return true;
  }
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
    return true;
  }
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
    return true;
  }
  return false;
}

function finishPointerDragSession() {
  // 檢查拖曳操作是否有狀態變更以記錄 Undo
  const movedStampLayer = (activeLayer && activeLayer.type === 'stamp' && (isDragging || isResizing || isRotating))
    ? activeLayer
    : null;

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
  isDraggingCardRectifyCorner = -1;
  isDraggingRectCrop = false;
  rectCropDragPart = null;
  rectCropInitialState = null;
  isDraggingExportCrop = false;
  exportCropDragPart = null;
  exportCropInitialRect = null;
  resizeHandle = null;
  objInitialState = null;

  // v37/v56: 拖曳或縮放印章圖層放開瞬間，標記已手動微調避免自動排版重置落點，並重採樣紙張光影更新 Multiply 融合色調
  if (movedStampLayer) {
    if (dragPreSnapshot && hasStateChanged(dragPreSnapshot)) {
      movedStampLayer.userMovedStamp = true;
    }
    if (typeof refreshSingleStandaloneStampLayer === 'function') {
      refreshSingleStandaloneStampLayer(movedStampLayer, true);
    }
  }
  render();
}

// --- 手機觸控操作：預設防誤觸預覽（雙指縮放畫布／單指安全檢視）＋ 雙擊印章進入藍色框編輯（單指移動／雙指捏合縮放）＋ 雙擊文字彈窗編輯 (v38/v40) ---
let mobileEditingLayerId = null;
let isTouchDraggingLayer = false;
let mobilePinchState = null;
let mobileStampPinchState = null;
let mobileTapCandidate = null;
let lastMobileTap = null;

canvasViewport.addEventListener('touchstart', e => {
  const isMobileUI = document.body.classList.contains('is-mobile-mode');

  if (e.touches.length === 2) {
    e.preventDefault();
    mobileTapCandidate = null;
    isTouchDraggingLayer = false;
    isDragging = false;
    isResizing = false;
    isRotating = false;
    dragPreSnapshot = null;
    objInitialState = null;

    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) || 1;
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;

    const activeStampForPinch = isMobileUI
      ? ((typeof getMobileEditingStampLayer === 'function' && getMobileEditingStampLayer()) ||
         (activeLayer && activeLayer.type === 'stamp' ? activeLayer : null))
      : null;

    if (activeStampForPinch) {
      mobilePinchState = null;
      mobileStampPinchState = {
        layer: activeStampForPinch,
        startDist: dist,
        startW: activeStampForPinch.width,
        startH: activeStampForPinch.height,
        preSnapshot: captureSnapshot('雙指縮放專櫃印章')
      };
      return;
    }

    mobileStampPinchState = null;
    const stageRect = (canvasStage || canvasWrapper).getBoundingClientRect();
    mobilePinchState = {
      startDist: dist,
      startZoom: currentZoom,
      startStageX: (midX - stageRect.left) / Math.max(0.01, currentZoom),
      startStageY: (midY - stageRect.top) / Math.max(0.01, currentZoom),
      viewRect: canvasViewport.getBoundingClientRect()
    };
    return;
  }

  if (e.touches.length === 1 && !mobilePinchState && !mobileStampPinchState) {
    const touch = e.touches[0];
    const coords = getCanvasCoords(touch);

    if (isMobileUI) {
      const editStamp = typeof getMobileEditingStampLayer === 'function'
        ? getMobileEditingStampLayer()
        : null;
      const hit = hitTest(coords.x, coords.y);

      mobileTapCandidate = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        coords: coords,
        moved: false,
        tapOutsideToExit: false
      };

      // v56: 手機單指觸碰印章圖層瞬間，零延遲亮起藍色虛線方框並鎖定畫布捲動，直接原地拖曳移動／控制點縮放
      const directTouchStamp = (hit && hit.layer && hit.layer.type === 'stamp')
        ? hit.layer
        : (editStamp && hit && hit.layer === editStamp ? editStamp : null);

      if (directTouchStamp) {
        e.preventDefault();
        isTouchDraggingLayer = true;
        dragPreSnapshot = captureSnapshot('觸控移動/縮放印章');
        dragStartX = coords.x;
        dragStartY = coords.y;
        setActiveLayer(directTouchStamp);
        objInitialState = {
          x: directTouchStamp.x,
          y: directTouchStamp.y,
          width: directTouchStamp.width,
          height: directTouchStamp.height,
          rotation: directTouchStamp.rotation,
          fontSize: directTouchStamp.fontSize
        };
        if (hit && hit.part === 'rot') {
          isRotating = true;
        } else if (hit && ['tl', 'tr', 'br', 'bl'].includes(hit.part)) {
          isResizing = true;
          resizeHandle = hit.part;
        } else {
          isDragging = true;
        }
        render();
        return;
      }

      if (editStamp) {
        // 在印章編輯狀態下點到外面：標記單擊結束編輯（允許仍可雙擊其他元件）
        mobileTapCandidate.tapOutsideToExit = true;
        setActiveLayer(null);
        isTouchDraggingLayer = false;
        render();
        return;
      }

      // v40: 手機預覽模式下，單指觸控非印章物件保留順暢捲動檢視與雙擊喚醒編輯，同時點擊空白區熄滅印章虛線框
      if (activeLayer && activeLayer.type === 'stamp') {
        setActiveLayer(null);
        render();
      }
      isTouchDraggingLayer = false;
      return;
    }

    // 桌面觸控裝置保留既有單指拖曳行為
    const hit = hitTest(coords.x, coords.y);
    if (hit && hit.part !== 'export_crop_handle' && hit.part !== 'export_crop_body') {
      e.preventDefault();
      isTouchDraggingLayer = true;
      dragPreSnapshot = captureSnapshot('觸控移動/縮放');
      dragStartX = coords.x;
      dragStartY = coords.y;
      setActiveLayer(hit.layer);
    if (hit.layer.type !== 'stamp' && typeof getMobileEditingStampLayer === 'function' && getMobileEditingStampLayer()) {
      exitMobileEditMode(true);
    }
      objInitialState = {
        x: hit.layer.x,
        y: hit.layer.y,
        width: hit.layer.width,
        height: hit.layer.height,
        rotation: hit.layer.rotation,
        fontSize: hit.layer.fontSize
      };
      if (hit.part === 'rot') {
        isRotating = true;
      } else if (['tl', 'tr', 'br', 'bl'].includes(hit.part)) {
        isResizing = true;
        resizeHandle = hit.part;
      } else {
        isDragging = true;
      }
      render();
    } else {
      isTouchDraggingLayer = false;
    }
  }
}, { passive: false });

canvasViewport.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && mobileStampPinchState && mobileStampPinchState.layer) {
    e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) || 1;
    const scaleRatio = Math.max(0.25, Math.min(4.0, dist / mobileStampPinchState.startDist));
    const targetLayer = mobileStampPinchState.layer;
    const aspect = mobileStampPinchState.startH / Math.max(1, mobileStampPinchState.startW);
    const minStampW = 140;
    const maxStampW = Math.round(canvasWidth * 0.65);
    const nextW = Math.max(minStampW, Math.min(maxStampW, Math.round(mobileStampPinchState.startW * scaleRatio)));
    targetLayer.width = nextW;
    targetLayer.height = Math.max(80, Math.round(nextW * aspect));
    render();
    return;
  }

  if (e.touches.length === 2 && mobilePinchState) {
    e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) || 1;
    const curMidX = (t1.clientX + t2.clientX) / 2;
    const curMidY = (t1.clientY + t2.clientY) / 2;
    const targetZoom = mobilePinchState.startZoom * (dist / mobilePinchState.startDist);
    setZoom(targetZoom);

    const rect = mobilePinchState.viewRect;
    const pad = 12;
    const visualW = Math.round(canvasWidth * currentZoom);
    const visualH = Math.round(canvasHeight * currentZoom);
    const marginLeft = Math.max(pad, (canvasViewport.clientWidth - visualW) / 2);
    const marginTop = Math.max(pad, (canvasViewport.clientHeight - visualH) / 2);
    canvasViewport.scrollLeft = Math.max(0, marginLeft + mobilePinchState.startStageX * currentZoom - (curMidX - rect.left));
    canvasViewport.scrollTop = Math.max(0, marginTop + mobilePinchState.startStageY * currentZoom - (curMidY - rect.top));
    return;
  }

  if (e.touches.length === 1 && mobileTapCandidate) {
    const t = e.touches[0];
    if (Math.hypot(t.clientX - mobileTapCandidate.startX, t.clientY - mobileTapCandidate.startY) > 12) {
      mobileTapCandidate.moved = true;
    }
  }

  if (e.touches.length === 1 && isTouchDraggingLayer && activeLayer) {
    e.preventDefault();
    const coords = getCanvasCoords(e.touches[0]);
    const dx = coords.x - dragStartX;
    const dy = coords.y - dragStartY;
    applyActiveLayerPointerDrag(coords, dx, dy);
  }
}, { passive: false });

const handleCanvasTouchEnd = e => {
  if (e.touches.length < 2 && mobileStampPinchState) {
    const finishedLayer = mobileStampPinchState.layer;
    const preSnap = mobileStampPinchState.preSnapshot;
    mobileStampPinchState = null;
    if (preSnap && hasStateChanged(preSnap)) {
      if (finishedLayer) finishedLayer.userMovedStamp = true;
      undoStack.push(preSnap);
      if (undoStack.length > MAX_UNDO_STEPS) undoStack.shift();
      updateUndoBtnState();
    }
    if (finishedLayer && typeof refreshSingleStandaloneStampLayer === 'function') {
      refreshSingleStandaloneStampLayer(finishedLayer, true);
    }
    render();
  }

  if (e.touches.length < 2) {
    mobilePinchState = null;
  }

  if (e.touches.length === 0 && isTouchDraggingLayer) {
    isTouchDraggingLayer = false;
    finishPointerDragSession();
  }

  if (e.touches.length === 0 && mobileTapCandidate) {
    const tap = mobileTapCandidate;
    mobileTapCandidate = null;
    const now = Date.now();
    if (!tap.moved && (now - tap.startTime) < 320 && document.body.classList.contains('is-mobile-mode')) {
      const isDoubleTap = !!(
        lastMobileTap &&
        (now - lastMobileTap.time) < 350 &&
        Math.hypot(tap.startX - lastMobileTap.x, tap.startY - lastMobileTap.y) < 42
      );
      if (isDoubleTap) {
        lastMobileTap = null;
        if (typeof handleMobileCanvasDoubleTap === 'function') {
          handleMobileCanvasDoubleTap(tap.coords);
        }
      } else {
        lastMobileTap = { time: now, x: tap.startX, y: tap.startY };
        if (tap.tapOutsideToExit && typeof exitMobileEditMode === 'function') {
          exitMobileEditMode(true);
        }
      }
    }
  }
};
canvasViewport.addEventListener('touchend', handleCanvasTouchEnd, { passive: false });
canvasViewport.addEventListener('touchcancel', handleCanvasTouchEnd, { passive: false });

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

  // 方向鍵優先微調：若處於塗白選取框存在狀態，優先移動選取框（不移動底層圖片）
  if (isEraseMode && activeLayer && activeLayer.eraseBox && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const hw = activeLayer.width / 2;
    const hh = activeLayer.height / 2;
    const box = activeLayer.eraseBox;
    if (e.key === 'ArrowUp') box.y = Math.max(-hh, box.y - step);
    if (e.key === 'ArrowDown') box.y = Math.min(hh - box.h, box.y + step);
    if (e.key === 'ArrowLeft') box.x = Math.max(-hw, box.x - step);
    if (e.key === 'ArrowRight') box.x = Math.min(hw - box.w, box.x + step);
    render();
    return;
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (isEraseMode && activeLayer && activeLayer.eraseBox) {
      e.preventDefault();
      applyLayerEraseBox();
      return;
    }
    if (isEraseMode && activeLayer) {
      // 只要處於圈選塗白模式，即使尚未拉出選取框，也嚴禁誤刪整個圖層！
      e.preventDefault();
      showToast('目前處於圈選塗白模式，請先框選欲刪除區域再按 Delete');
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
    } else if (activeLayer.cardRectifyMode && btnApplyCardRectify) {
      e.preventDefault();
      btnApplyCardRectify.click();
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

// --- 雙擊事件：對著專櫃印章點兩下喚醒浮動調整列；對著照片點兩下快速開啟/套用「矩形裁切」；對著文字點兩下編輯文字 ---
canvas.addEventListener('dblclick', e => {
  const coords = getCanvasCoords(e);
  const hit = hitTest(coords.x, coords.y);
  if (!hit || !hit.layer) return;

  if (hit.layer.type === 'stamp') {
    if (typeof enterMobileStampEditMode === 'function') {
      enterMobileStampEditMode(hit.layer);
    } else {
      setActiveLayer(hit.layer);
    }
    showToast('已開啟印章編輯工具列（可改日期／調整藍色深淺／拖曳移動）');
    return;
  }

  if (hit.layer.type === 'image') {
    setActiveLayer(hit.layer);
    if (hit.layer.type !== 'stamp' && typeof getMobileEditingStampLayer === 'function' && getMobileEditingStampLayer()) {
      exitMobileEditMode(true);
    }
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
    if (hit.layer.type !== 'stamp' && typeof getMobileEditingStampLayer === 'function' && getMobileEditingStampLayer()) {
      exitMobileEditMode(true);
    }
    openInlineTextEditor(hit.layer);
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
  if (handwritingControls) handwritingControls.classList.add('hidden');

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
    if (typeof updateCardRectifyUI === 'function') updateCardRectifyUI(layer);

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
  } else if (layer.type === 'handwriting') {
    activeTypeName.textContent = '保卡手寫資料 (正片疊底)';
    if (handwritingControls && layer.hwOptions) {
      handwritingControls.classList.remove('hidden');
      const opt = layer.hwOptions;
      if (editHwText) editHwText.value = opt.text || '';
      if (editHwPersona) editHwPersona.value = String(opt.personaId || 0);
      if (editHwColorPresets) updateColorButtonSelection(editHwColorPresets, opt.color || '#1A1A1A');
      if (editHwTipGroup) {
        editHwTipGroup.querySelectorAll('.hw-tip-btn').forEach(b => {
          b.classList.toggle('active', parseFloat(b.dataset.tip) === (opt.tipSize || 0.7));
        });
      }
      const sp = opt.spacingLevel || 5;
      const nt = opt.neatnessLevel || 5;
      if (sliderEditHwSpacing) sliderEditHwSpacing.value = sp;
      if (valEditHwSpacing) valEditHwSpacing.textContent = formatSpacingLabel(sp);
      if (sliderEditHwNeatness) sliderEditHwNeatness.value = nt;
      if (valEditHwNeatness) valEditHwNeatness.textContent = formatNeatnessLabel(nt);
    }
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
  if (typeof updateMobileWorkflowBadges === 'function') {
    updateMobileWorkflowBadges();
  }
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
    } else if (layer.type === 'handwriting') {
      badgeClass = 'badge-hw';
      typeLabel = '手寫資料';
    } else if (layer.type === 'overrideText') {
      badgeClass = 'badge-override';
      typeLabel = '覆寫文字';
    } else if (layer.type === 'text') {
      badgeClass = 'badge-text';
      typeLabel = '審核備註';
    }

    if (layer.type === 'handwriting') {
      thumbHtml = `<div class="layer-thumb layer-thumb-hw" title="手寫筆跡">✍️</div>`;
    } else if (layer.type === 'overrideText') {
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

// --- 電腦版三件組純 CSS 零耗能進度面板控制 (v45) ---
const desktopBatchProgress = {
  hasShownComplete: false,
  switchTimer: null,
  fadeTimer: null,
  hideTimer: null
};

function clearDesktopBatchTimers() {
  if (desktopBatchProgress.switchTimer) {
    clearTimeout(desktopBatchProgress.switchTimer);
    desktopBatchProgress.switchTimer = null;
  }
  if (desktopBatchProgress.fadeTimer) {
    clearTimeout(desktopBatchProgress.fadeTimer);
    desktopBatchProgress.fadeTimer = null;
  }
  if (desktopBatchProgress.hideTimer) {
    clearTimeout(desktopBatchProgress.hideTimer);
    desktopBatchProgress.hideTimer = null;
  }
}

function setDesktopRoleRowState(role, state) {
  const rowMap = {
    order: { el: desktopStatusOrder, label: '訂單' },
    receipt: { el: desktopStatusReceipt, label: '發票' },
    card: { el: desktopStatusCard, label: '保卡' }
  };
  const target = rowMap[role];
  if (!target || !target.el) return;

  const iconEl = target.el.querySelector('.batch-status-icon');
  const textEl = target.el.querySelector('.batch-status-text');

  if (state === 'hidden') {
    target.el.classList.add('hidden');
    target.el.classList.remove('is-done');
    return;
  }

  target.el.classList.remove('hidden');
  if (state === 'done') {
    target.el.classList.add('is-done');
    if (iconEl) iconEl.textContent = '✓';
    if (textEl) textEl.textContent = `${target.label} 處理完成`;
  } else {
    target.el.classList.remove('is-done');
    if (iconEl) iconEl.textContent = '⏳';
    if (textEl) textEl.textContent = `${target.label} 處理中...`;
  }
}

function resetDesktopBatchStatusPanel() {
  clearDesktopBatchTimers();
  desktopBatchProgress.hasShownComplete = false;
  if (desktopBatchStatusPanel) {
    desktopBatchStatusPanel.classList.add('hidden');
    desktopBatchStatusPanel.classList.remove('fade-out', 'is-complete-center');
  }
  if (desktopBatchRows) desktopBatchRows.classList.remove('hidden');
  if (desktopBatchCompleteCard) desktopBatchCompleteCard.classList.add('hidden');
  setDesktopRoleRowState('order', 'hidden');
  setDesktopRoleRowState('receipt', 'hidden');
  setDesktopRoleRowState('card', 'hidden');
}

function beginDesktopBatchProgress(files) {
  if (document.body.classList.contains('is-mobile-mode') || !desktopBatchStatusPanel) return;
  clearDesktopBatchTimers();

  let hasPdf = false;
  let imageCount = 0;
  files.forEach(f => {
    const ext = (f.name || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') hasPdf = true;
    else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) imageCount++;
  });

  if (!hasPdf && imageCount === 0) return;

  const hasOrderLayer = layers.some(l => l.type === 'pdf_order' || l.docRole === 'order_sheet');
  const hasReceiptLayer = layers.some(l => l.type === 'image' && (l.docRole === 'receipt' || l.isReceipt));
  const cardLayers = layers.filter(l => l.type === 'image' && (l.docRole === 'warranty_card' || l.isRectifiedCard));
  const hasCardLayer = cardLayers.length > 0;
  const isCardDone = hasCardLayer && (cardLayers.some(c => c.hasBakedStamp) || layers.some(s => s.type === 'stamp'));

  desktopBatchStatusPanel.classList.remove('hidden', 'fade-out', 'is-complete-center');
  if (desktopBatchRows) desktopBatchRows.classList.remove('hidden');
  if (desktopBatchCompleteCard) desktopBatchCompleteCard.classList.add('hidden');

  if (hasPdf) {
    setDesktopRoleRowState('order', 'processing');
  } else if (hasOrderLayer) {
    setDesktopRoleRowState('order', 'done');
  } else {
    setDesktopRoleRowState('order', 'hidden');
  }

  if (imageCount >= 2 && (hasPdf || hasOrderLayer)) {
    setDesktopRoleRowState('receipt', 'processing');
    setDesktopRoleRowState('card', 'processing');
  } else {
    setDesktopRoleRowState('receipt', hasReceiptLayer ? 'done' : 'hidden');
    setDesktopRoleRowState('card', isCardDone ? 'done' : (hasCardLayer ? 'processing' : 'hidden'));
  }
}

function markDesktopBatchRoleStatus(role, state) {
  if (document.body.classList.contains('is-mobile-mode') || !desktopBatchStatusPanel) return;
  clearDesktopBatchTimers();
  desktopBatchStatusPanel.classList.remove('hidden', 'fade-out', 'is-complete-center');
  if (desktopBatchRows) desktopBatchRows.classList.remove('hidden');
  if (desktopBatchCompleteCard) desktopBatchCompleteCard.classList.add('hidden');
  setDesktopRoleRowState(role, state);
}

function checkDesktopBatchCompletion(isBatchEnd = false) {
  if (document.body.classList.contains('is-mobile-mode') || !desktopBatchStatusPanel) return;

  const hasOrder = layers.some(l => l.type === 'pdf_order' || l.docRole === 'order_sheet');
  const hasReceipt = layers.some(l => l.type === 'image' && (l.docRole === 'receipt' || l.isReceipt));
  const cardLayers = layers.filter(l => l.type === 'image' && (l.docRole === 'warranty_card' || l.isRectifiedCard));
  const hasCard = cardLayers.length > 0;
  const isCardStamped = hasCard && (cardLayers.some(c => c.hasBakedStamp) || layers.some(s => s.type === 'stamp'));

  if (!hasOrder || !hasReceipt || !hasCard) {
    desktopBatchProgress.hasShownComplete = false;
  }

  if (hasOrder) setDesktopRoleRowState('order', 'done');
  if (hasReceipt) setDesktopRoleRowState('receipt', 'done');
  if (isCardStamped) setDesktopRoleRowState('card', 'done');

  if (hasOrder && hasReceipt && isCardStamped) {
    if (desktopBatchProgress.hasShownComplete) return;
    desktopBatchProgress.hasShownComplete = true;
    clearDesktopBatchTimers();

    desktopBatchProgress.switchTimer = setTimeout(() => {
      if (!desktopBatchStatusPanel || document.body.classList.contains('is-mobile-mode')) return;
      if (desktopBatchRows) desktopBatchRows.classList.add('hidden');
      if (desktopBatchCompleteCard) desktopBatchCompleteCard.classList.remove('hidden');
      desktopBatchStatusPanel.classList.remove('hidden', 'fade-out');
      desktopBatchStatusPanel.classList.add('is-complete-center');

      desktopBatchProgress.fadeTimer = setTimeout(() => {
        if (!desktopBatchStatusPanel) return;
        desktopBatchStatusPanel.classList.add('fade-out');
        desktopBatchProgress.hideTimer = setTimeout(() => {
          resetDesktopBatchStatusPanel();
          desktopBatchProgress.hasShownComplete = true;
        }, 380);
      }, 1500);
    }, 260);
    return;
  }

  if (isBatchEnd) {
    const waitingCardDate = hasCard && !isCardStamped && typeof pendingStampDateWaiter !== 'undefined' && !!pendingStampDateWaiter;
    if (!waitingCardDate) {
      clearDesktopBatchTimers();
      desktopBatchProgress.fadeTimer = setTimeout(() => {
        if (!desktopBatchStatusPanel) return;
        desktopBatchStatusPanel.classList.add('fade-out');
        desktopBatchProgress.hideTimer = setTimeout(() => {
          if (desktopBatchStatusPanel) desktopBatchStatusPanel.classList.add('hidden');
        }, 380);
      }, 950);
    }
  }
}

// --- 檔案匯入處理 (純前端解析；第一時間轉靜態陣列快照防手機多選參考釋放) ---
async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  beginDesktopBatchProgress(files);

  let hasImageFile = false;
  for (let i = 0; i < files.length; i++) {
    const extCheck = (files[i].name || '').split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(extCheck)) {
      hasImageFile = true;
      break;
    }
  }
  // v34: 只要匯入檔案包含圖片，立刻非阻斷彈出民國日期輸入框，同時背景繼續解析、辨識與排版
  if (hasImageFile && typeof openStampDatePromptIfNeeded === 'function') {
    openStampDatePromptIfNeeded();
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = (file.name || '').split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      await importPdfPureFrontend(file);
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      await importImagePureFrontend(file);
    } else {
      showToast(`不支援的檔案格式: ${file.name}`);
    }
  }

  checkDesktopBatchCompletion(true);

  if (document.body.classList.contains('is-mobile-mode')) {
    if (typeof getMobileEditingStampLayer === 'function' && !getMobileEditingStampLayer()) {
      fitCanvasToViewport();
    }
    if (typeof checkAndShowMobileCompletionOverlay === 'function') {
      checkAndShowMobileCompletionOverlay();
    }
  }
}

// --- 專櫃訂購單 PDF 原生座標精準遮白 ＋ 前 6 欄裁切 ＋ 贈品過濾切片重組引擎 (v43) ---
function extractPdfMappedItems(textContent, page, viewport, scale) {
  const Util = window.pdfjsLib && window.pdfjsLib.Util;
  const pageView = page && page.view ? page.view : [0, 0, viewport.width / scale, viewport.height / scale];
  const vx0 = pageView[0] || 0;
  const vy0 = pageView[1] || 0;
  const pageH = (pageView[3] - vy0) || (viewport.height / scale);
  const mapped = [];

  (textContent.items || []).forEach(item => {
    const str = item.str || '';
    if (!str.trim()) return;
    let x, baselineY, hPx;
    if (Util && typeof Util.transform === 'function' && item.transform) {
      const tx = Util.transform(viewport.transform, item.transform);
      x = tx[4];
      baselineY = tx[5];
      const vecH = Math.hypot(tx[2], tx[3]);
      hPx = Math.max(8, (item.height ? item.height * scale : vecH) || (10 * scale));
    } else {
      const ptX = (item.transform ? item.transform[4] : 0) - vx0;
      const ptY = (item.transform ? item.transform[5] : 0) - vy0;
      x = ptX * scale;
      baselineY = (pageH - ptY) * scale;
      hPx = Math.max(8, (item.height || 10) * scale);
    }
    const wPx = Math.max(2, (item.width || 0) * scale);
    const top = baselineY - hPx * 0.92;
    const bottom = baselineY + hPx * 0.24;
    const midY = (top + bottom) * 0.5;
    mapped.push({
      str,
      x,
      right: x + wPx,
      top,
      bottom,
      midY,
      h: hPx,
      w: wPx
    });
  });

  return mapped;
}

function groupPdfItemsIntoRows(mappedItems, scale) {
  const sorted = [...mappedItems].sort((a, b) => a.midY - b.midY || a.x - b.x);
  const rows = [];

  sorted.forEach(it => {
    const tolY = Math.max(4 * scale, it.h * 0.55);
    let targetRow = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (Math.abs(rows[i].midY - it.midY) <= tolY) {
        targetRow = rows[i];
        break;
      }
      if (it.midY - rows[i].midY > tolY * 2.5) break;
    }
    if (!targetRow) {
      targetRow = {
        items: [it],
        top: it.top,
        bottom: it.bottom,
        midY: it.midY
      };
      rows.push(targetRow);
    } else {
      targetRow.items.push(it);
      targetRow.top = Math.min(targetRow.top, it.top);
      targetRow.bottom = Math.max(targetRow.bottom, it.bottom);
      let sumMid = 0;
      targetRow.items.forEach(m => { sumMid += m.midY; });
      targetRow.midY = sumMid / targetRow.items.length;
    }
  });

  rows.forEach(r => {
    r.items.sort((a, b) => a.x - b.x);
    r.fullText = r.items.map(i => i.str).join(' ');
  });

  return rows;
}

function findPdfHorizontalGridLineY(srcCanvas, minY, maxY, xStart, xEnd, fallbackY) {
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(srcCanvas.height - 1, Math.ceil(maxY));
  const x0 = Math.max(0, Math.floor(xStart));
  const x1 = Math.min(srcCanvas.width - 1, Math.ceil(xEnd));
  if (y1 <= y0 || x1 <= x0 + 20) return fallbackY;

  const ctx = srcCanvas.getContext('2d');
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const data = ctx.getImageData(x0, y0, w, h).data;
  const stepX = Math.max(2, Math.floor(w / 180));

  let bestY = -1;
  let bestRatio = 0;
  for (let py = 0; py < h; py++) {
    let dark = 0;
    let total = 0;
    const rowOff = py * w * 4;
    for (let px = 0; px < w; px += stepX) {
      const idx = rowOff + px * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < 190) dark++;
      total++;
    }
    const ratio = total > 0 ? dark / total : 0;
    if (ratio >= 0.42 && ratio > bestRatio) {
      bestRatio = ratio;
      bestY = y0 + py;
    }
  }
  return bestY >= 0 ? bestY : fallbackY;
}

function findPdfVerticalGridLineX(srcCanvas, minX, maxX, yStart, yEnd, fallbackX) {
  const x0 = Math.max(0, Math.floor(minX));
  const x1 = Math.min(srcCanvas.width - 1, Math.ceil(maxX));
  const y0 = Math.max(0, Math.floor(yStart));
  const y1 = Math.min(srcCanvas.height - 1, Math.ceil(yEnd));
  if (x1 <= x0 || y1 <= y0 + 10) return fallbackX;

  const ctx = srcCanvas.getContext('2d');
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const data = ctx.getImageData(x0, y0, w, h).data;
  const stepY = Math.max(1, Math.floor(h / 40));

  let bestX = -1;
  let bestRatio = 0;
  for (let px = 0; px < w; px++) {
    let dark = 0;
    let total = 0;
    for (let py = 0; py < h; py += stepY) {
      const idx = (py * w + px) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < 190) dark++;
      total++;
    }
    const ratio = total > 0 ? dark / total : 0;
    if (ratio >= 0.45 && ratio > bestRatio) {
      bestRatio = ratio;
      bestX = x0 + px;
    }
  }
  return bestX >= 0 ? bestX : fallbackX;
}

function findBestWhiteSplitX(srcCanvas, approxX, topY, bottomY, searchRadius) {
  const x0 = Math.max(0, Math.floor(approxX - searchRadius));
  const x1 = Math.min(srcCanvas.width - 1, Math.ceil(approxX + searchRadius));
  const y0 = Math.max(0, Math.floor(topY));
  const y1 = Math.min(srcCanvas.height - 1, Math.ceil(bottomY));
  if (x1 <= x0 || y1 <= y0) return Math.round(approxX);

  const ctx = srcCanvas.getContext('2d');
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const data = ctx.getImageData(x0, y0, w, h).data;

  let bestX = Math.round(approxX);
  let bestScore = Infinity;
  for (let px = 0; px < w; px++) {
    let inkSum = 0;
    for (let py = 0; py < h; py++) {
      const idx = (py * w + px) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      inkSum += (255 - lum);
    }
    const absDist = Math.abs((x0 + px) - approxX);
    const score = inkSum + absDist * 4;
    if (score < bestScore) {
      bestScore = score;
      bestX = x0 + px;
    }
  }
  return bestX;
}

function maskFieldClusterOnRow(ctx, row, labelRegex, stopRegex, scale) {
  let masked = 0;
  for (let i = 0; i < row.items.length; i++) {
    const startItem = row.items[i];
    if (!labelRegex.test(startItem.str)) continue;

    let minX = startItem.x;
    let maxR = startItem.right;
    let minT = startItem.top;
    let maxB = startItem.bottom;
    let j = i + 1;

    while (j < row.items.length) {
      const next = row.items[j];
      const gap = next.x - maxR;
      if (gap > 36 * scale || (stopRegex && stopRegex.test(next.str))) {
        break;
      }
      maxR = Math.max(maxR, next.right);
      minT = Math.min(minT, next.top);
      maxB = Math.max(maxB, next.bottom);
      j++;
    }

    const padX = Math.round(4 * scale);
    const padY = Math.round(2.5 * scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(
      Math.max(0, Math.floor(minX - padX)),
      Math.max(0, Math.floor(minT - padY)),
      Math.ceil(maxR - minX + padX * 2),
      Math.ceil(maxB - minT + padY * 2)
    );
    masked++;
    i = j - 1;
  }
  return masked;
}

function purifyDepartmentSalespersonRow(workCanvas, row, scale) {
  const ctx = workCanvas.getContext('2d');
  const startIdx = row.items.findIndex(it => it.str.includes('專櫃名稱'));
  if (startIdx < 0) return false;

  const cluster = [row.items[startIdx]];
  let maxR = row.items[startIdx].right;
  for (let j = startIdx + 1; j < row.items.length; j++) {
    const next = row.items[j];
    const gap = next.x - maxR;
    if (gap > 34 * scale || /訂單單號|訂單編號|頁次|製表日期|客戶名稱/.test(next.str)) {
      break;
    }
    cluster.push(next);
    maxR = Math.max(maxR, next.right);
  }

  let combined = '';
  const charSegments = [];
  const measCanvas = document.createElement('canvas');
  const measCtx = measCanvas.getContext('2d');

  cluster.forEach(it => {
    const str = it.str || '';
    measCtx.font = `${Math.max(10, Math.round(it.h))}px "Microsoft JhengHei", "PingFang TC", sans-serif`;
    const charWidths = [];
    let totalW = 0;
    for (let k = 0; k < str.length; k++) {
      const cw = measCtx.measureText(str[k]).width || 1;
      charWidths.push(cw);
      totalW += cw;
    }
    let acc = 0;
    for (let k = 0; k < str.length; k++) {
      const x0 = it.x + it.w * (acc / Math.max(1, totalW));
      acc += charWidths[k];
      const x1 = it.x + it.w * (acc / Math.max(1, totalW));
      charSegments.push({ ch: str[k], x0, x1, top: it.top, bottom: it.bottom });
      combined += str[k];
    }
  });

  const deptIdx = combined.indexOf('專櫃名稱');
  if (deptIdx < 0) return false;
  const deptEndIdx = deptIdx + 4;
  if (deptEndIdx >= charSegments.length) return false;

  const afterDept = combined.slice(deptEndIdx);
  const hasSalesLabel = /業務|\/|／/.test(afterDept);
  if (!hasSalesLabel) return false;

  let colonIdx = -1;
  for (let k = deptEndIdx; k < combined.length; k++) {
    if (combined[k] === ':' || combined[k] === '：') {
      colonIdx = k;
      break;
    }
  }
  if (colonIdx < 0) return false;

  let tailSlashIdx = combined.length;
  for (let k = colonIdx + 1; k < combined.length; k++) {
    if (combined[k] === '/' || combined[k] === '／') {
      tailSlashIdx = k;
      break;
    }
  }
  if (tailSlashIdx <= colonIdx + 1) return false;

  let rowTop = cluster[0].top;
  let rowBottom = cluster[0].bottom;
  cluster.forEach(it => {
    rowTop = Math.min(rowTop, it.top);
    rowBottom = Math.max(rowBottom, it.bottom);
  });
  const clipTop = Math.max(0, Math.floor(rowTop - 2.5 * scale));
  const clipBottom = Math.min(workCanvas.height, Math.ceil(rowBottom + 2.5 * scale));
  const clipH = Math.max(1, clipBottom - clipTop);

  const rawAfterDeptX = charSegments[deptEndIdx - 1].x1;
  const rawColonX = charSegments[colonIdx].x0;
  const rawAfterStoreX = charSegments[tailSlashIdx - 1].x1;

  const xAfterDept = findBestWhiteSplitX(workCanvas, rawAfterDeptX, clipTop, clipBottom, 3 * scale);
  const xColon = findBestWhiteSplitX(workCanvas, rawColonX, clipTop, clipBottom, 3 * scale);
  const xAfterStore = findBestWhiteSplitX(workCanvas, rawAfterStoreX, clipTop, clipBottom, 3 * scale);
  const xClearEnd = Math.min(workCanvas.width, Math.ceil(maxR + 10 * scale));

  const storeSliceW = Math.max(1, xAfterStore - xColon);
  const storeSliceCanvas = document.createElement('canvas');
  storeSliceCanvas.width = storeSliceW;
  storeSliceCanvas.height = clipH;
  storeSliceCanvas.getContext('2d').drawImage(
    workCanvas,
    xColon, clipTop, storeSliceW, clipH,
    0, 0, storeSliceW, clipH
  );

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(xAfterDept, clipTop, Math.max(1, xClearEnd - xAfterDept), clipH);

  const pasteX = Math.round(xAfterDept + Math.max(1, scale * 0.8));
  ctx.drawImage(storeSliceCanvas, pasteX, clipTop);
  return true;
}

function buildPurifiedOrderSheetCanvas(fullCanvas, textContent, page, viewport, scale, fallbackCropY) {
  const workCanvas = document.createElement('canvas');
  workCanvas.width = fullCanvas.width;
  workCanvas.height = fullCanvas.height;
  workCanvas.getContext('2d').drawImage(fullCanvas, 0, 0);

  const mappedItems = extractPdfMappedItems(textContent, page, viewport, scale);
  if (mappedItems.length < 5) {
    const fb = document.createElement('canvas');
    fb.width = fullCanvas.width;
    fb.height = fallbackCropY;
    fb.getContext('2d').drawImage(workCanvas, 0, 0, fullCanvas.width, fallbackCropY, 0, 0, fullCanvas.width, fallbackCropY);
    return { canvas: fb, cropRatio: fallbackCropY / fullCanvas.height, removedGiftCount: 0, maskedCount: 0 };
  }

  const rows = groupPdfItemsIntoRows(mappedItems, scale);
  const workCtx = workCanvas.getContext('2d');
  let maskedCount = 0;

  // 1 & 2. 遮蓋左側「頁次」「製表日期」與右側「訂單單號」
  const maskLabelRegex = /頁次|製表日期|訂單單號|訂單編號/;
  const maskStopRegex = /專櫃名稱|客戶名稱|客戶電話|訂單日期|項次|序號|品名/;
  rows.forEach(row => {
    if (maskLabelRegex.test(row.fullText)) {
      maskedCount += maskFieldClusterOnRow(workCtx, row, maskLabelRegex, maskStopRegex, scale);
    }
  });

  // 3. 將「專櫃名稱/業務姓名:宏匯/許庭愷」向量像素重組為「專櫃名稱:宏匯」
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].fullText.includes('專櫃名稱')) {
      purifyDepartmentSalespersonRow(workCanvas, rows[i], scale);
      break;
    }
  }

  // 4. 偵測第 6 欄「數量」右緣（作為紅框純白挖空起點），並計算紫線安全右邊界（保護上方「注意：...。」與下方「總金額(含稅):...」）(v44)
  const headerIdx = rows.findIndex(r =>
    r.items.some(it => it.str.includes('數量')) &&
    (
      r.items.some(it => /預計交貨日|交貨日|贈品否|贈品活動/.test(it.str)) ||
      r.items.some(it => /品名|品號|貨號|序號|項次|規格/.test(it.str))
    )
  );

  let qtyColRightEdgeX = workCanvas.width;
  let qtyHeaderRow = null;
  let nextRightColItem = null;
  if (headerIdx >= 0) {
    qtyHeaderRow = rows[headerIdx];
    const qtyItem = qtyHeaderRow.items.find(it => it.str.includes('數量'));
    const rightHeaderCandidates = qtyHeaderRow.items.filter(it => qtyItem && it.x > qtyItem.right + 4 * scale);
    nextRightColItem = rightHeaderCandidates.length > 0 ? rightHeaderCandidates[0] : null;

    if (qtyItem && nextRightColItem) {
      let maxQtyColRight = qtyItem.right;
      const qtyColLeftBound = qtyItem.x - 18 * scale;
      const qtyColRightBound = nextRightColItem.x - 3 * scale;
      for (let rIdx = headerIdx + 1; rIdx < rows.length; rIdx++) {
        const rr = rows[rIdx];
        if (/收款|實收訂金|尚餘尾款|總金額|施工確認|注意事項/.test(rr.fullText)) break;
        rr.items.forEach(it => {
          if (it.x >= qtyColLeftBound && it.right <= qtyColRightBound) {
            maxQtyColRight = Math.max(maxQtyColRight, it.right);
          }
        });
      }

      const scanMinX = Math.max(qtyItem.right, maxQtyColRight) + 2 * scale;
      const scanMaxX = nextRightColItem.x - 2 * scale;
      const fallbackRightX = Math.min(
        nextRightColItem.x - 5 * scale,
        Math.max(qtyItem.right, maxQtyColRight) + 18 * scale
      );
      const borderX = scanMaxX > scanMinX + 2
        ? findPdfVerticalGridLineX(workCanvas, scanMinX, scanMaxX, qtyHeaderRow.top, qtyHeaderRow.bottom + 40 * scale, -1)
        : -1;
      qtyColRightEdgeX = borderX >= 0
        ? Math.min(nextRightColItem.x - 2 * scale, borderX + Math.ceil(scale * 0.8))
        : Math.round(fallbackRightX);
      qtyColRightEdgeX = Math.max(Math.round(workCanvas.width * 0.40), Math.min(workCanvas.width, qtyColRightEdgeX));
    }
  }

  let bottomStartIdx = -1;
  if (headerIdx >= 0) {
    bottomStartIdx = rows.findIndex((r, idx) =>
      idx > headerIdx && /收款日期|收款方式|收款:|收款：|實收訂金|訂金金額|尚餘尾款|總金額/.test(r.fullText)
    );
  }

  const cutoffIdx = rows.findIndex((r, idx) =>
    (bottomStartIdx >= 0 ? idx >= bottomStartIdx : true) &&
    /施工確認|注意事項|客戶簽名|訂購人簽名/.test(r.fullText)
  );
  const activeEndIdx = cutoffIdx >= 0 ? cutoffIdx : rows.length;

  // 紫線安全裁切右緣：取「注意:...。」與「總金額(含稅):...」兩行最右緣之最大值，再預留 20px 安全白邊
  let maxNoticeRight = 0;
  let maxNoticeBottom = 0;
  let maxTotalRight = 0;
  for (let i = 0; i < activeEndIdx; i++) {
    const r = rows[i];
    if (!/注意事項/.test(r.fullText) && /注意\s*[:：]|若該訂單出貨|超過廠商活動|無贈送贈品/.test(r.fullText)) {
      r.items.forEach(it => {
        maxNoticeRight = Math.max(maxNoticeRight, it.right);
      });
      maxNoticeBottom = Math.max(maxNoticeBottom, r.bottom);
    }
    if (/總金額|含稅|尚餘尾款|實收訂金|訂金金額/.test(r.fullText)) {
      r.items.forEach(it => {
        maxTotalRight = Math.max(maxTotalRight, it.right);
      });
    }
  }

  const protectedTextRight = Math.max(maxNoticeRight, maxTotalRight);
  const safeRightPadPx = 20;
  let cropRightX = workCanvas.width;
  if (protectedTextRight > 0) {
    cropRightX = Math.max(qtyColRightEdgeX + safeRightPadPx, Math.ceil(protectedTextRight + safeRightPadPx));
    cropRightX = Math.min(workCanvas.width, cropRightX);
  } else if (qtyColRightEdgeX < workCanvas.width) {
    cropRightX = workCanvas.width;
  }

  // 5 & 6. 紅框純白挖空右側三欄（保留上方注意與下方金額）＋ 黑名單過濾贈品列 ＋ 底部收款區無縫貼齊
  if (headerIdx >= 0 && bottomStartIdx > headerIdx) {
    const headerRow = rows[headerIdx];
    const bottomFirstRow = rows[bottomStartIdx];
    const itemRows = rows.slice(headerIdx + 1, bottomStartIdx);

    if (itemRows.length > 0) {
      const seqHeader = headerRow.items.find(it => /序號|項次|序|項/.test(it.str));
      const seqMaxX = seqHeader ? (seqHeader.right + 28 * scale) : (qtyColRightEdgeX * 0.16);

      const itemBlocks = [];
      itemRows.forEach(r => {
        const leftItems = r.items.filter(it => it.x < qtyColRightEdgeX);
        if (leftItems.length === 0) return;
        const firstIt = leftItems[0];
        const isSeqStart = firstIt.x <= seqMaxX && /^\d{1,4}$/.test(firstIt.str.trim());
        const rowLeft6Text = leftItems.map(it => it.str).join(' ');

        if (isSeqStart || itemBlocks.length === 0) {
          itemBlocks.push({
            rows: [r],
            text: rowLeft6Text
          });
        } else {
          const curBlock = itemBlocks[itemBlocks.length - 1];
          curBlock.rows.push(r);
          curBlock.text += ' ' + rowLeft6Text;
        }
      });

      if (itemBlocks.length > 0) {
        const lineScanLeft = Math.round(qtyColRightEdgeX * 0.06);
        const lineScanRight = Math.round(qtyColRightEdgeX * 0.94);

        const firstItemTop = itemBlocks[0].rows[0].top;
        const headerBottomMid = Math.round((headerRow.bottom + firstItemTop) * 0.5);
        const headerBottomLineY = findPdfHorizontalGridLineY(
          workCanvas,
          headerRow.bottom - 1 * scale,
          firstItemTop + 1 * scale,
          lineScanLeft,
          lineScanRight,
          headerBottomMid
        );
        const headerSliceEndY = Math.min(firstItemTop - 1, headerBottomLineY + Math.ceil(1.2 * scale));

        const lastItemRow = itemBlocks[itemBlocks.length - 1].rows[itemBlocks[itemBlocks.length - 1].rows.length - 1];
        const paymentTopMid = Math.round((lastItemRow.bottom + bottomFirstRow.top) * 0.5);
        const paymentTopLineY = findPdfHorizontalGridLineY(
          workCanvas,
          lastItemRow.bottom + 1 * scale,
          bottomFirstRow.top - 1 * scale,
          lineScanLeft,
          lineScanRight,
          paymentTopMid
        );
        const itemsAreaEndY = Math.max(lastItemRow.bottom + 1, paymentTopLineY - Math.ceil(1.0 * scale));
        const paymentSliceStartY = Math.max(lastItemRow.bottom + 1, paymentTopLineY - Math.ceil(2.5 * scale));

        // v44 紅框純白挖空：從「數量」欄位右緣起至紫線 cropRightX，垂直從表頭右三欄上緣至最後一筆明細下緣
        if (nextRightColItem && qtyColRightEdgeX < cropRightX) {
          const safeTopFloor = maxNoticeBottom > 0 ? Math.ceil(maxNoticeBottom + 2) : 0;
          const redBoxTopY = Math.max(safeTopFloor, Math.floor(headerRow.top - 3.5 * scale));
          const redBoxH = Math.max(0, itemsAreaEndY - redBoxTopY);
          if (redBoxH > 0) {
            workCtx.fillStyle = '#FFFFFF';
            workCtx.fillRect(qtyColRightEdgeX, redBoxTopY, cropRightX - qtyColRightEdgeX, redBoxH);
          }
        }

        for (let b = 0; b < itemBlocks.length; b++) {
          const blk = itemBlocks[b];
          blk.topY = (b === 0) ? headerSliceEndY : itemBlocks[b - 1].bottomY;
          if (b < itemBlocks.length - 1) {
            const curEnd = blk.rows[blk.rows.length - 1].bottom;
            const nextStart = itemBlocks[b + 1].rows[0].top;
            const sepMid = Math.round((curEnd + nextStart) * 0.5);
            const gridY = findPdfHorizontalGridLineY(
              workCanvas,
              curEnd - 1 * scale,
              nextStart + 1 * scale,
              lineScanLeft,
              lineScanRight,
              sepMid
            );
            blk.bottomY = Math.min(nextStart - 1, gridY + Math.ceil(1.2 * scale));
          } else {
            blk.bottomY = itemsAreaEndY;
          }
          blk.isGift = /贈品|獨家贈|贈|GIFT|SP-/i.test(blk.text);
        }

        const filteredBlocks = itemBlocks.filter(blk => !blk.isGift);
        const keptBlocks = filteredBlocks.length > 0 ? filteredBlocks : itemBlocks;
        const removedGiftCount = itemBlocks.length - keptBlocks.length;

        const summaryEndRows = rows.filter((r, idx) =>
          idx >= bottomStartIdx && idx < activeEndIdx && /實收訂金|尚餘尾款|總金額|含稅|訂金金額/.test(r.fullText)
        );
        const cutoffRows = rows.filter((r, idx) =>
          idx >= bottomStartIdx && /施工確認|注意事項|客戶簽名|訂購人簽名/.test(r.fullText)
        );
        const summaryMaxBottom = summaryEndRows.length > 0
          ? Math.max(...summaryEndRows.map(r => r.bottom))
          : bottomFirstRow.bottom;
        const cutoffMinTop = cutoffRows.length > 0
          ? Math.min(...cutoffRows.map(r => r.top))
          : Math.min(workCanvas.height, fallbackCropY + 20 * scale);
        const summaryBottomLineY = findPdfHorizontalGridLineY(
          workCanvas,
          summaryMaxBottom + 1 * scale,
          Math.min(cutoffMinTop - 2 * scale, summaryMaxBottom + 24 * scale),
          lineScanLeft,
          lineScanRight,
          Math.min(cutoffMinTop - 4 * scale, Math.max(fallbackCropY, summaryMaxBottom + 5 * scale))
        );
        const bottomSliceEndY = Math.max(
          paymentSliceStartY + 20,
          Math.min(workCanvas.height, Math.round(summaryBottomLineY + 3 * scale))
        );
        const headerSliceH = Math.max(10, headerSliceEndY);
        const keptItemsH = keptBlocks.reduce((sum, blk) => sum + Math.max(1, blk.bottomY - blk.topY), 0);
        const bottomGap = Math.round(3 * scale);
        const bottomSliceH = Math.max(10, bottomSliceEndY - paymentSliceStartY);
        const totalStitchedH = headerSliceH + keptItemsH + bottomGap + bottomSliceH;

        const stitchedCanvas = document.createElement('canvas');
        stitchedCanvas.width = cropRightX;
        stitchedCanvas.height = totalStitchedH;
        const sCtx = stitchedCanvas.getContext('2d');
        sCtx.fillStyle = '#FFFFFF';
        sCtx.fillRect(0, 0, cropRightX, totalStitchedH);

        let destY = 0;
        sCtx.drawImage(workCanvas, 0, 0, cropRightX, headerSliceH, 0, destY, cropRightX, headerSliceH);
        destY += headerSliceH;

        keptBlocks.forEach(blk => {
          const bh = Math.max(1, blk.bottomY - blk.topY);
          sCtx.drawImage(workCanvas, 0, blk.topY, cropRightX, bh, 0, destY, cropRightX, bh);
          destY += bh;
        });

        destY += bottomGap;
        sCtx.drawImage(workCanvas, 0, paymentSliceStartY, cropRightX, bottomSliceH, 0, destY, cropRightX, bottomSliceH);

        return {
          canvas: stitchedCanvas,
          cropRatio: 1.0,
          removedGiftCount,
          maskedCount
        };
      }
    }
  }

  // Fallback：維持紫線安全裁切寬度與底部裁切
  const simpleH = Math.max(150, Math.min(workCanvas.height, fallbackCropY));
  if (qtyHeaderRow && nextRightColItem && qtyColRightEdgeX < cropRightX) {
    const safeTopFloor = maxNoticeBottom > 0 ? Math.ceil(maxNoticeBottom + 2) : 0;
    const redBoxTopY = Math.max(safeTopFloor, Math.floor(qtyHeaderRow.top - 3.5 * scale));
    if (simpleH > redBoxTopY) {
      workCtx.fillStyle = '#FFFFFF';
      workCtx.fillRect(qtyColRightEdgeX, redBoxTopY, cropRightX - qtyColRightEdgeX, simpleH - redBoxTopY);
    }
  }
  const fallbackCanvas = document.createElement('canvas');
  fallbackCanvas.width = cropRightX;
  fallbackCanvas.height = simpleH;
  fallbackCanvas.getContext('2d').drawImage(workCanvas, 0, 0, cropRightX, simpleH, 0, 0, cropRightX, simpleH);
  return {
    canvas: fallbackCanvas,
    cropRatio: simpleH / workCanvas.height,
    removedGiftCount: 0,
    maskedCount
  };
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

    recordImportedRawFileByRole('orderPdf', file);

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

    // v43: 保留完整 rawPdfText 與型號答案庫後，執行遮白去敏 ＋ 前 6 欄裁切 ＋ 贈品過濾重組
    const purifiedRes = buildPurifiedOrderSheetCanvas(
      fullCanvas,
      textContent,
      page,
      viewport,
      scale,
      cropYInCanvas
    );
    const croppedCanvas = purifiedRes.canvas;
    const cropRatio = purifiedRes.cropRatio;

    const autoLayoutEnabled = !switchAutoLayout || switchAutoLayout.checked;
    const orderDisplayW = autoLayoutEnabled ? (canvasWidth - 20) : Math.round(canvasWidth * 0.63);
    const aspect = croppedCanvas.width / croppedCanvas.height;
    const orderDisplayH = Math.round(orderDisplayW / aspect);

    const posX = autoLayoutEnabled ? Math.round(canvasWidth / 2) : (Math.round(canvasWidth * (40 / 2400)) + orderDisplayW / 2);
    const posY = autoLayoutEnabled ? (10 + orderDisplayH / 2) : (Math.round(canvasHeight * (40 / 1700)) + orderDisplayH / 2);

    const newLayer = createLayerObject({
      type: 'pdf_order',
      docRole: 'order_sheet',
      name: file.name,
      image: croppedCanvas,
      rawImage: croppedCanvas,
      fullCanvas: croppedCanvas,
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
    if (typeof extractOrderSheetModels === 'function') {
      extractOrderSheetModels(extractedStrings.join('\n'));
    }
    if (typeof applyOrderCrossVerificationToCurrentCard === 'function') {
      applyOrderCrossVerificationToCurrentCard();
    }
    if (typeof autoArrangeWorkbenchLayout === 'function') {
      autoArrangeWorkbenchLayout(false);
    }
    markDesktopBatchRoleStatus('order', 'done');
    const giftNote = purifiedRes.removedGiftCount > 0 ? `（已自動略過 ${purifiedRes.removedGiftCount} 筆贈品列）` : '';
    showToast(`PDF 訂購單已完成去敏精簡與 6.0x 置頂滿版進場${giftNote}`);
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
      img.onload = async () => {
        const sw = img.width;
        const sh = img.height;

        const isHorizontal = sw >= sh;
        const aspectHW = sh / Math.max(1, sw);
        const modeValInit = selectCardTemplateMode ? selectCardTemplateMode.value : 'auto';
        const isManualPanasonicInit = modeValInit && modeValInit.startsWith('panasonic_');
        const isManualLgInit = modeValInit === 'lg_tw';
        const isManualMitsubishiInit = modeValInit === 'mitsubishi_tw';

        const autoSmartEnabled = !switchAutoSmartCard || switchAutoSmartCard.checked;
        const autoLayoutEnabled = !switchAutoLayout || switchAutoLayout.checked;

        // v29: 第一時間執行 1280px 高對比灰階預掃描 ＋ 三角色（order_sheet / receipt / warranty_card）文字指紋 100% 鎖定
        const detectRes = (!isManualLgInit && !isManualMitsubishiInit && window.CardTemplates && window.CardTemplates.detectPanasonicCardQuad)
          ? window.CardTemplates.detectPanasonicCardQuad(img)
          : { detected: false, paperBox: null };

        let preScan = { text: '', data: null, scale: 1 };
        if (autoSmartEnabled && !isManualPanasonicInit && typeof quickPreScanImageText === 'function') {
          setCanvasOcrPill(`🔍 正在執行高對比預掃描判別單據類型: ${file.name}...`, 'loading');
          preScan = await quickPreScanImageText(img);
        }

        const docClassify = (window.CardTemplates && window.CardTemplates.classifyDocumentByTextAndColor)
          ? (isManualLgInit
              ? { role: 'warranty_card', forcedTemplateId: 'lg_tw', reason: '手動指定 LG 台灣樂金保證書' }
              : (isManualMitsubishiInit
                  ? { role: 'warranty_card', forcedTemplateId: 'mitsubishi_tw', reason: '手動指定台灣三菱電機商品保證書' }
                  : window.CardTemplates.classifyDocumentByTextAndColor(preScan.text, detectRes, sw, sh, isManualPanasonicInit)))
          : { role: (!isHorizontal && aspectHW > 1.30) ? 'receipt' : 'warranty_card', reason: '比例備援判定' };

        const docRole = docClassify.role; // 'order_sheet' | 'receipt' | 'warranty_card'
        const isReceiptImg = docRole === 'receipt';
        const isOrderSheetImg = docRole === 'order_sheet';
        const isWarrantyCandidate = docRole === 'warranty_card';

        recordImportedRawFileByRole(
          isOrderSheetImg ? 'orderPdf' : (isWarrantyCandidate ? 'cardImage' : (isReceiptImg ? 'receiptImage' : 'extra')),
          file
        );

        if (isReceiptImg) markDesktopBatchRoleStatus('receipt', 'processing');
        else if (isOrderSheetImg) markDesktopBatchRoleStatus('order', 'processing');
        else if (isWarrantyCandidate) markDesktopBatchRoleStatus('card', 'processing');

        let trimmedCanvas = null;
        let activeImg = img;
        let rectifiedCleanCanvas = null;
        let stampedCardCanvas = null;
        let cardQuadCorners = null;
        let cardTemplateId = null;
        let isRectifiedCard = false;
        let hasBakedStamp = false;

        // 分支 A：電子發票／銷貨明細專屬管線（嚴格鎖死：絕不進入 1.48:1 壓扁拉正、絕不蓋專櫃印章！）
        if (isReceiptImg) {
          let anchorCropRes = null;
          if (preScan.data && window.CardTemplates && window.CardTemplates.computeTextAnchoredReceiptCrop) {
            anchorCropRes = window.CardTemplates.computeTextAnchoredReceiptCrop(img, preScan.data, preScan.scale);
          }
          if (anchorCropRes && anchorCropRes.canvas) {
            trimmedCanvas = anchorCropRes.canvas;
            activeImg = trimmedCanvas;
          } else if (window.CardTemplates && window.CardTemplates.autoTrimReceiptImage) {
            trimmedCanvas = window.CardTemplates.autoTrimReceiptImage(img);
            if (trimmedCanvas) {
              activeImg = trimmedCanvas;
            }
          }

          if (autoSmartEnabled && typeof runReceiptHighResOcr === 'function') {
            showToast(`🔍 已鎖定發票（${docClassify.reason}），正在辨識日期與發票號碼...`);
            await runReceiptHighResOcr(activeImg, preScan.text);
          }
        }
        // 分支 O：圖片格式訂購單專屬管線（保持原圖比例置頂 100% 滿版，絕不裁切或蓋章）
        else if (isOrderSheetImg) {
          activeImg = img;
          if (preScan.text && typeof extractOrderSheetModels === 'function') {
            extractOrderSheetModels(preScan.text);
          }
          if (typeof applyOrderCrossVerificationToCurrentCard === 'function') {
            applyOrderCrossVerificationToCurrentCard();
          }
          showToast(`📄 已鎖定訂購單圖片（${docClassify.reason}），將置頂 100% 滿版排版`);
        }
        // 分支 B：保卡專屬管線（嚴格依品牌獨立路由：LG lg_tw / 三菱 mitsubishi_tw / 國際牌 Panasonic / 未建檔品牌）
        let isUnmatchedBrandCard = false;
        let preCalibratedStampSpec = null;
        let preLgDealerOcrAnchor = null;
        let preLgOcrData = null;
        let preMitsuDealerOcrAnchors = null;
        let preMitsuOcrData = null;
        if (isWarrantyCandidate && autoSmartEnabled && window.CardTemplates) {
          const preTextUpper = (preScan.text || '').toUpperCase();
          const lgMatch = (!isManualPanasonicInit && !isManualMitsubishiInit && window.CardTemplates.detectLgWarrantyByText)
            ? window.CardTemplates.detectLgWarrantyByText(preScan.text)
            : { isLg: false };
          const isPanasonicBrandText =
            preTextUpper.includes('PANASONIC') ||
            preTextUpper.includes('NATIONAL') ||
            preTextUpper.includes('國際牌') ||
            preTextUpper.includes('台灣松下');
          const looksLikeLg = !!(
            isManualLgInit ||
            (!isManualPanasonicInit && !isManualMitsubishiInit && !isPanasonicBrandText && (docClassify.forcedTemplateId === 'lg_tw' || lgMatch.isLg))
          );
          const mitsuMatch = (!looksLikeLg && !isManualPanasonicInit && window.CardTemplates.detectMitsubishiWarrantyByText)
            ? window.CardTemplates.detectMitsubishiWarrantyByText(preScan.text)
            : { isMitsubishi: false };
          const looksLikeMitsubishi = !looksLikeLg && !!(
            isManualMitsubishiInit ||
            (!isManualPanasonicInit && !isPanasonicBrandText && (docClassify.forcedTemplateId === 'mitsubishi_tw' || mitsuMatch.isMitsubishi))
          );
          const looksLikePanasonic = !looksLikeLg && !looksLikeMitsubishi && !!(
            detectRes.detected ||
            isManualPanasonicInit ||
            isPanasonicBrandText ||
            preTextUpper.includes('松下')
          );

          if (looksLikeLg) {
            const tplLg = resolveCardTemplate('lg_tw');
            const offscreenW = Math.max(1800, Math.min(3200, sw || 1800));
            const lgQuad = window.CardTemplates.detectLgCardQuad
              ? window.CardTemplates.detectLgCardQuad(img)
              : { detected: false };
            const lgAspect = (lgQuad && lgQuad.estimatedAspect)
              ? lgQuad.estimatedAspect
              : (tplLg ? tplLg.aspectRatio : 1.42);

            if (lgQuad.detected && lgQuad.corners) {
              cardQuadCorners = lgQuad.corners;
              const warpedLg = window.CardTemplates.rectifyPerspectivePureJS(
                img,
                lgQuad.corners,
                lgAspect,
                offscreenW
              );
              if (warpedLg) {
                rectifiedCleanCanvas = warpedLg;
                isRectifiedCard = true;
              }
            }

            if (!rectifiedCleanCanvas && detectRes.paperBox) {
              const pb = detectRes.paperBox;
              const pbAspect = pb.w / Math.max(1, pb.h);
              const trimCanvas = document.createElement('canvas');
              trimCanvas.width = offscreenW;
              trimCanvas.height = Math.round(offscreenW / Math.max(1.15, Math.min(1.85, pbAspect)));
              const trCtx = trimCanvas.getContext('2d');
              trCtx.imageSmoothingEnabled = true;
              trCtx.imageSmoothingQuality = 'high';
              trCtx.drawImage(img, pb.x, pb.y, pb.w, pb.h, 0, 0, trimCanvas.width, trimCanvas.height);
              rectifiedCleanCanvas = trimCanvas;
              isRectifiedCard = true;
            }

            if (!rectifiedCleanCanvas) {
              const fbCanvas = document.createElement('canvas');
              fbCanvas.width = offscreenW;
              fbCanvas.height = Math.round(offscreenW / (sw / Math.max(1, sh)));
              const fbCtx = fbCanvas.getContext('2d');
              fbCtx.imageSmoothingEnabled = true;
              fbCtx.imageSmoothingQuality = 'high';
              fbCtx.drawImage(img, 0, 0, fbCanvas.width, fbCanvas.height);
              rectifiedCleanCanvas = fbCanvas;
              isRectifiedCard = true;
            }

            activeImg = rectifiedCleanCanvas;

            const lgOcrProxy = {
              type: 'image',
              warpedImage: rectifiedCleanCanvas,
              rectifiedCleanCanvas: rectifiedCleanCanvas,
              rawSourceImg: img,
              templateId: 'lg_tw',
              cardTemplateId: 'lg_tw'
            };
            await runLgCardTargetedOcr(lgOcrProxy, preScan.text);
            preLgDealerOcrAnchor = lgOcrProxy._lgDealerOcrAnchor || null;
            preLgOcrData = lgOcrProxy.ocrData || null;
            if (window.CardTemplates.detectLgDealerBoxStampSpec) {
              preCalibratedStampSpec = window.CardTemplates.detectLgDealerBoxStampSpec(
                rectifiedCleanCanvas,
                preLgDealerOcrAnchor
              );
            }
            cardTemplateId = 'lg_tw';
          } else if (looksLikeMitsubishi) {
            const tplMitsu = resolveCardTemplate('mitsubishi_tw');
            const offscreenW = Math.max(1800, Math.min(3200, sw || 1800));
            const mitsuQuad = window.CardTemplates.detectMitsubishiCardQuad
              ? window.CardTemplates.detectMitsubishiCardQuad(img)
              : { detected: false };
            const mitsuAspect = (mitsuQuad && mitsuQuad.estimatedAspect)
              ? mitsuQuad.estimatedAspect
              : (tplMitsu ? tplMitsu.aspectRatio : 1.58);

            if (mitsuQuad.detected && mitsuQuad.corners) {
              cardQuadCorners = mitsuQuad.corners;
              const warpedMitsu = window.CardTemplates.rectifyPerspectivePureJS(
                img,
                mitsuQuad.corners,
                mitsuAspect,
                offscreenW
              );
              if (warpedMitsu) {
                rectifiedCleanCanvas = warpedMitsu;
                isRectifiedCard = true;
              }
            }

            if (!rectifiedCleanCanvas && detectRes.paperBox) {
              const pb = detectRes.paperBox;
              const pbAspect = pb.w / Math.max(1, pb.h);
              const trimCanvas = document.createElement('canvas');
              trimCanvas.width = offscreenW;
              trimCanvas.height = Math.round(offscreenW / Math.max(1.25, Math.min(1.90, pbAspect)));
              const trCtx = trimCanvas.getContext('2d');
              trCtx.imageSmoothingEnabled = true;
              trCtx.imageSmoothingQuality = 'high';
              trCtx.drawImage(img, pb.x, pb.y, pb.w, pb.h, 0, 0, trimCanvas.width, trimCanvas.height);
              rectifiedCleanCanvas = trimCanvas;
              isRectifiedCard = true;
            }

            if (!rectifiedCleanCanvas) {
              const fbCanvas = document.createElement('canvas');
              fbCanvas.width = offscreenW;
              fbCanvas.height = Math.round(offscreenW / (sw / Math.max(1, sh)));
              const fbCtx = fbCanvas.getContext('2d');
              fbCtx.imageSmoothingEnabled = true;
              fbCtx.imageSmoothingQuality = 'high';
              fbCtx.drawImage(img, 0, 0, fbCanvas.width, fbCanvas.height);
              rectifiedCleanCanvas = fbCanvas;
              isRectifiedCard = true;
            }

            activeImg = rectifiedCleanCanvas;

            const mitsuOcrProxy = {
              type: 'image',
              warpedImage: rectifiedCleanCanvas,
              rectifiedCleanCanvas: rectifiedCleanCanvas,
              rawSourceImg: img,
              templateId: 'mitsubishi_tw',
              cardTemplateId: 'mitsubishi_tw'
            };
            await runMitsubishiCardTargetedOcr(mitsuOcrProxy, preScan.text);
            preMitsuDealerOcrAnchors = mitsuOcrProxy._mitsubishiDealerOcrAnchors || null;
            preMitsuOcrData = mitsuOcrProxy.ocrData || null;
            if (window.CardTemplates.detectMitsubishiDealerStampSpec) {
              preCalibratedStampSpec = window.CardTemplates.detectMitsubishiDealerStampSpec(
                rectifiedCleanCanvas,
                preMitsuDealerOcrAnchors
              );
            }
            cardTemplateId = 'mitsubishi_tw';
          } else {
            const tpl = resolveCardTemplate(isManualPanasonicInit ? modeValInit : 'auto');
            const aspectRatio = tpl ? tpl.aspectRatio : 1.48;
            const offscreenW = Math.max(1800, Math.min(3200, sw || 1800));

            if (detectRes.detected || isManualPanasonicInit) {
              cardQuadCorners = detectRes.corners;
              const warped = window.CardTemplates.rectifyPerspectivePureJS(
                img,
                detectRes.corners,
                aspectRatio,
                offscreenW
              );
              if (warped) {
                rectifiedCleanCanvas = warped;
                isRectifiedCard = true;
              }
            }

            // 若紅褐色外框在極端光線下未命中，利用淺色紙張輪廓裁切（Auto-Trim 切除木紋桌邊）
            if (!rectifiedCleanCanvas && detectRes.paperBox) {
              const pb = detectRes.paperBox;
              const pbAspect = pb.w / Math.max(1, pb.h);
              const trimCanvas = document.createElement('canvas');
              trimCanvas.width = offscreenW;
              trimCanvas.height = Math.round(offscreenW / Math.max(1.15, Math.min(1.8, pbAspect)));
              const trCtx = trimCanvas.getContext('2d');
              trCtx.imageSmoothingEnabled = true;
              trCtx.imageSmoothingQuality = 'high';
              trCtx.drawImage(img, pb.x, pb.y, pb.w, pb.h, 0, 0, trimCanvas.width, trimCanvas.height);
              rectifiedCleanCanvas = trimCanvas;
              isRectifiedCard = true;
              setCardSmartStatus(`ℹ️ 已鎖定保卡（${docClassify.reason}），並透過紙張輪廓切除桌面背景。`, false);
            }

            if (!rectifiedCleanCanvas) {
              const fbCanvas = document.createElement('canvas');
              fbCanvas.width = offscreenW;
              fbCanvas.height = Math.round(offscreenW / (sw / Math.max(1, sh)));
              const fbCtx = fbCanvas.getContext('2d');
              fbCtx.imageSmoothingEnabled = true;
              fbCtx.imageSmoothingQuality = 'high';
              fbCtx.drawImage(img, 0, 0, fbCanvas.width, fbCanvas.height);
              rectifiedCleanCanvas = fbCanvas;
              isRectifiedCard = true;
            }

            activeImg = rectifiedCleanCanvas;

            if (looksLikePanasonic) {
              // v34: 國際牌在未蓋章最高解析度底圖執行雙語 OCR 與交叉校正，最後排版後蓋章
              const ocrLayerProxy = {
                type: 'image',
                warpedImage: rectifiedCleanCanvas,
                rectifiedCleanCanvas: rectifiedCleanCanvas,
                rawSourceImg: img,
                cardTemplateId: isManualPanasonicInit ? modeValInit : null
              };
              await runCardTargetedOcr(ocrLayerProxy);
              cardTemplateId = ocrLayerProxy.cardTemplateId;
            } else {
              isUnmatchedBrandCard = true;
              cardTemplateId = null;
            }
          }
        }

        // 依訂購單 100% 基準之 70% : 3% : 27% 比例進場擺放 (v32)
        const effW = activeImg.width;
        const effH = activeImg.height;
        let displayW, displayH, posX, posY;

        const orderRef = [...layers].reverse().find(l => l.type === 'pdf_order' || l.docRole === 'order_sheet');
        const refFullW = orderRef ? orderRef.width : (canvasWidth - 20);

        if (docRole === 'order_sheet') {
          displayW = canvasWidth - 20;
          const aspect = effW / Math.max(1, effH);
          displayH = Math.round(displayW / aspect);
          posX = Math.round(canvasWidth / 2);
          posY = 10 + displayH / 2;
        } else if (docRole === 'warranty_card') {
          displayW = Math.round(refFullW * 0.70);
          const aspect = effW / Math.max(1, effH);
          displayH = Math.round(displayW / aspect);
          posX = 10 + displayW / 2;
          posY = canvasHeight - 40 - displayH / 2;
        } else {
          displayW = Math.round(refFullW * 0.27);
          const aspect = effW / Math.max(1, effH);
          displayH = Math.round(displayW / aspect);
          posX = canvasWidth - 10 - displayW / 2;
          posY = canvasHeight / 2;
        }

        const newLayer = createLayerObject({
          type: 'image',
          docRole: docRole,
          name: file.name,
          image: activeImg,
          rawImage: img,
          warpedImage: stampedCardCanvas || rectifiedCleanCanvas,
          croppedImage: trimmedCanvas,
          rectifiedCleanCanvas: rectifiedCleanCanvas,
          hasBakedStamp: hasBakedStamp,
          isReceipt: isReceiptImg,
          width: displayW,
          height: displayH,
          x: posX,
          y: posY
        });
        newLayer.cardQuadCorners = cardQuadCorners;
        newLayer.cardTemplateId = cardTemplateId;
        newLayer.templateId = cardTemplateId;
        newLayer.isRectifiedCard = isRectifiedCard;
        newLayer.isUnmatchedBrandCard = isUnmatchedBrandCard;
        if (preLgOcrData) {
          newLayer.ocrData = preLgOcrData;
          newLayer._lgVerifiedModel = preLgOcrData.model || '';
          newLayer._lgVerifiedSerial = preLgOcrData.serial || '';
        }
        if (preMitsuOcrData) {
          newLayer.ocrData = preMitsuOcrData;
          newLayer._mitsubishiVerifiedModel = preMitsuOcrData.model || '';
          newLayer._mitsubishiVerifiedSerial = preMitsuOcrData.serial || '';
        }
        if (preLgDealerOcrAnchor) newLayer._lgDealerOcrAnchor = preLgDealerOcrAnchor;
        if (preMitsuDealerOcrAnchors) newLayer._mitsubishiDealerOcrAnchors = preMitsuDealerOcrAnchors;
        if (preCalibratedStampSpec) newLayer._calibratedStampSpec = preCalibratedStampSpec;

        pushUndoState('匯入圖片');
        layers.push(newLayer);
        setActiveLayer(newLayer);

        // v29: 無條件自動執行三物件不重疊排版與即時 5 行文字同步
        if (typeof autoArrangeWorkbenchLayout === 'function') {
          autoArrangeWorkbenchLayout(false);
        }
        if (typeof syncSummaryTextLayer === 'function') {
          const hasAnyOcr = !!(
            cachedReceiptOcrInfo.date ||
            cachedReceiptOcrInfo.invoiceNo ||
            cachedReceiptOcrInfo.model ||
            cachedReceiptOcrInfo.serialNo
          );
          syncSummaryTextLayer(hasAnyOcr);
        } else {
          render();
        }

        const isMobileUI = document.body.classList.contains('is-mobile-mode');
        // v34/v38: 國際牌自動在最後蓋章；其他未建檔品牌於手機端顯示底部「蓋上專櫃印章」快捷鈕由使用者單手點蓋並自由拖曳
        if (
          isWarrantyCandidate &&
          autoSmartEnabled &&
          newLayer.rectifiedCleanCanvas &&
          !(isUnmatchedBrandCard && isMobileUI) &&
          typeof finalizeWarrantyCardStampAfterLayout === 'function'
        ) {
          await finalizeWarrantyCardStampAfterLayout(newLayer);
        }

        if (typeof updateMobileWorkflowBadges === 'function') {
          updateMobileWorkflowBadges();
        }

        const cardHasInteractiveStamp = hasWarrantyCardStampAttached(newLayer);
        if (isReceiptImg) {
          markDesktopBatchRoleStatus('receipt', 'done');
        } else if (isOrderSheetImg) {
          markDesktopBatchRoleStatus('order', 'done');
        } else if (isWarrantyCandidate && (cardHasInteractiveStamp || !autoSmartEnabled)) {
          markDesktopBatchRoleStatus('card', 'done');
        }

        if (cardHasInteractiveStamp) {
          showToast(`已完成保卡拉正與互動式自動蓋章: ${file.name}`);
        } else if (trimmedCanvas) {
          showToast(`已完成發票去邊與排版: ${file.name}`);
        } else if (isUnmatchedBrandCard && isMobileUI) {
          showToast(`已載入並裁切保卡，請點擊下方「蓋上專櫃印章」自由蓋印: ${file.name}`);
        } else if (isWarrantyCandidate && autoSmartEnabled) {
          showToast(`保卡已拉正排版，等待輸入日期蓋章: ${file.name}`);
        } else {
          showToast(`已載入原圖: ${file.name}`);
        }

        resolve();
      };
      img.onerror = () => {
        showToast(`圖片解碼失敗: ${file.name}`);
        resolve();
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      showToast(`檔案讀取失敗: ${file.name}`);
      resolve();
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

// --- 局部圈選塗白遮除控制（MS Paint 矩形選取）---
function toggleEraseMode(active) {
  if (!activeLayer) return;
  isEraseMode = (typeof active === 'boolean') ? active : !isEraseMode;
  if (btnToggleEraseBox) {
    if (isEraseMode) {
      btnToggleEraseBox.classList.add('active');
      btnToggleEraseBox.classList.remove('btn-outline');
      if (eraseNotice) eraseNotice.classList.remove('hidden');
      if (activeLayer.eraseBox && btnApplyEraseBox) {
        btnApplyEraseBox.classList.remove('hidden');
      } else if (btnApplyEraseBox) {
        btnApplyEraseBox.classList.add('hidden');
      }
      canvas.style.cursor = 'crosshair';
      showToast('已開啟小畫家塗白選取框：請在單據上拉出選取範圍');
    } else {
      btnToggleEraseBox.classList.remove('active');
      btnToggleEraseBox.classList.add('btn-outline');
      if (eraseNotice) eraseNotice.classList.add('hidden');
      if (btnApplyEraseBox) btnApplyEraseBox.classList.add('hidden');
      if (activeLayer) activeLayer.eraseBox = null;
      isDrawingEraseBox = false;
      isMovingEraseBox = false;
      eraseBoxStart = null;
      eraseBoxCurrent = null;
      eraseBoxMoveStart = null;
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
      showToast('請先在物件上拖曳拉出要塗白的選取範圍');
    }
  });
}

// --- 櫃位印章蓋上畫布（v37: 自動落點紙張光影採樣 ＋ 同色系深淺 ＋ Multiply 混合）---
btnAddStamp.addEventListener('click', async () => {
  const dateStr = (inputStampDate.value || '').trim() || '115.11.21';
  const fontSize = parseInt(sliderStampFontSize.value, 10) || DEFAULT_STAMP_FONT_SIZE;
  const offsetY = parseInt(sliderStampOffsetY.value, 10) || 0;
  showToast(`正在採樣底紙光影並蓋上專櫃印章 (${dateStr})...`);

  try {
    const stampImg = await ensureStampImageLoaded();
    const displayW = 580;
    const displayH = Math.round((displayW * stampImg.height) / stampImg.width);
    const posX = Math.round(canvasWidth * 0.44);
    const posY = Math.round(canvasHeight * 0.85);

    const newStamp = createLayerObject({
      type: 'stamp',
      name: `專櫃印章 (${dateStr})`,
      image: stampImg,
      rawImage: stampImg,
      blendMode: 'multiply',
      width: displayW,
      height: displayH,
      x: posX,
      y: posY
    });
    newStamp.stampDate = dateStr;
    newStamp.stampFontSize = fontSize;
    newStamp.stampOffsetY = offsetY;

    pushUndoState('蓋上專櫃印章');
    layers.push(newStamp);
    await refreshSingleStandaloneStampLayer(newStamp, true);
    setActiveLayer(newStamp);

    const avgL = newStamp.cachedLighting ? newStamp.cachedLighting.avgL : 245;
    showToast(avgL < 195
      ? `專櫃印章已自動融合底紙光影 (L=${avgL}) 並套用 Multiply`
      : '專櫃印章已套用 Multiply 自然融合蓋上畫布');
  } catch (err) {
    console.error('手動蓋上印章失敗:', err);
    showToast('印章圖檔載入失敗，請確認 stamp_data.js');
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
    const activeWarrantyCard = typeof getTargetWarrantyImageLayer === 'function' ? getTargetWarrantyImageLayer() : null;
    if (activeWarrantyCard && (activeWarrantyCard.cardTemplateId === 'lg_tw' || activeWarrantyCard.templateId === 'lg_tw') && activeWarrantyCard.ocrData) {
      parsed.brand = 'LG';
      if (activeWarrantyCard.ocrData.model) parsed.model = activeWarrantyCard.ocrData.model;
      if (activeWarrantyCard.ocrData.serial) parsed.serialNo = activeWarrantyCard.ocrData.serial;
    } else if (activeWarrantyCard && (activeWarrantyCard.cardTemplateId === 'mitsubishi_tw' || activeWarrantyCard.templateId === 'mitsubishi_tw') && activeWarrantyCard.ocrData) {
      parsed.brand = '三菱';
      if (activeWarrantyCard.ocrData.model) parsed.model = activeWarrantyCard.ocrData.model;
      if (activeWarrantyCard.ocrData.serial) parsed.serialNo = activeWarrantyCard.ocrData.serial;
    }
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

// --- 高解析度 PNG 匯出核心與下載／分享 ---
function buildExportPngBlob() {
  return new Promise(resolve => {
    if (layers.length === 0) {
      showToast('畫布目前沒有任何物件');
      resolve(null);
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
        if (layer.type === 'handwriting' || layer.blendMode === 'multiply') {
          bufCtx.globalCompositeOperation = 'multiply';
        }
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
        resolve(null);
        return;
      }
      const filename = ((inputExportName && inputExportName.value) || '客戶訂單發票保卡').trim() + '.png';
      resolve({ blob, filename, finalW, finalH });
    }, 'image/png');
  });
}

function triggerPngBlobDownload(blob, filename, finalW, finalH) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  showToast(`已成功下載圖片: ${filename} (${finalW} × ${finalH} px)`);
}

btnExportPng.addEventListener('click', async () => {
  const res = await buildExportPngBlob();
  if (!res) return;
  triggerPngBlobDownload(res.blob, res.filename, res.finalW, res.finalH);
});

// --- 清空畫布（電腦版／手機版共用） ---
function clearWorkbenchSession(forceConfirm = true) {
  if (layers.length === 0) {
    if (typeof updateMobileWorkflowBadges === 'function') updateMobileWorkflowBadges();
    return;
  }
  if (forceConfirm && !confirm('確定要清空畫布上的所有物件嗎？')) return;
  pushUndoState('清空畫布');
  layers = [];
  if (typeof resetStampDateSession === 'function') {
    resetStampDateSession();
  }
  if (typeof cachedOrderItemModels !== 'undefined') {
    cachedOrderItemModels = [];
  }
  if (typeof cachedReceiptOcrInfo !== 'undefined') {
    cachedReceiptOcrInfo.date = '';
    cachedReceiptOcrInfo.invoiceNo = '';
    cachedReceiptOcrInfo.brand = '';
    cachedReceiptOcrInfo.model = '';
    cachedReceiptOcrInfo.serialNo = '';
    cachedReceiptOcrInfo.sellerTaxId = '24721268';
  }
  if (inputCardModel) inputCardModel.value = '';
  if (inputCardSerial) inputCardSerial.value = '';
  if (typeof exitMobileEditMode === 'function') exitMobileEditMode(true);
  if (typeof resetMobileCompletionOverlayState === 'function') resetMobileCompletionOverlayState();
  if (typeof resetDesktopBatchStatusPanel === 'function') resetDesktopBatchStatusPanel();
  setActiveLayer(null);
  if (typeof updateMobileWorkflowBadges === 'function') updateMobileWorkflowBadges();
  if (document.body.classList.contains('is-mobile-mode')) fitCanvasToViewport();
  render();
  showToast('畫布已清空');
}

btnClearCanvas.addEventListener('click', () => clearWorkbenchSession(true));

async function reloadImportedRawBatch() {
  if (_isReloadingRawBatch) return;
  const rawFiles = getSavedRawFilesForReload();
  if (rawFiles.length === 0) {
    showToast('尚未匯入任何原始檔案，無法重新讀取');
    return;
  }

  _isReloadingRawBatch = true;
  updateReloadRawBatchButtonState();
  try {
    clearWorkbenchSession(false);
    undoStack = [];
    updateUndoBtnState();
    if (inputNewNote) inputNewNote.value = '';
    if (inputStampDate) inputStampDate.value = '';
    if (typeof resetDesktopBatchStatusPanel === 'function') {
      resetDesktopBatchStatusPanel();
    }
    showToast(`🔄 正在使用已匯入的原始檔案 (${rawFiles.length} 份) 重新辨識、裁切與蓋章...`);
    await handleFiles(rawFiles);
  } finally {
    _isReloadingRawBatch = false;
    updateReloadRawBatchButtonState();
  }
}

if (btnReloadRawBatch) {
  btnReloadRawBatch.addEventListener('click', () => {
    reloadImportedRawBatch();
  });
}

// --- 縮放與工具列事件 ---
btnZoomIn.addEventListener('click', () => setZoom(currentZoom + 0.08));
btnZoomOut.addEventListener('click', () => setZoom(currentZoom - 0.08));
if (btnZoomFit) btnZoomFit.addEventListener('click', fitCanvasToViewport);
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
  const pickedFiles = Array.from(e.target.files || []);
  fileInput.value = '';
  if (pickedFiles.length > 0) {
    handleFiles(pickedFiles);
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

// =========================================================================
// ✍️ 保卡手寫客戶資料生成器 (v20 - 20 種高差異化人物字跡 ＋ 油性原子筆物理引擎)
// =========================================================================

const HW_STORAGE_KEY = 'orderCollage_hwSettings_v20_personas';

const HW_CATEGORY_LABELS = {
  female: '👩 女性／清秀細膩',
  male: '👨 男性／職場商務',
  elder: '👴 長輩／傳統硬筆',
  special: '🎨 特殊風格／極端對比'
};

// 20 種鮮明人物字跡庫（五大結構性幾何參數徹底拉開視覺差異）
const HW_CHAR_PERSONAS = [
  // 【女性／清秀細膩類（5 種）】
  { id: 0, category: 'female', name: '#01 細膩女會計', widthRatio: 0.88, heightRatio: 0.94, slantDeg: 0.5, baselineSlope: 0.0, cornerRoundness: 0.25, jitterAmp: 0.018, tremorAmp: 0, dotWeight: 0.50, strokeWeightMult: 0.90, waveAmp: 0, simplifyEnd: 0 },
  { id: 1, category: 'female', name: '#02 溫柔女老師', widthRatio: 1.00, heightRatio: 1.02, slantDeg: 2.0, baselineSlope: 0.5, cornerRoundness: 0.54, jitterAmp: 0.025, tremorAmp: 0, dotWeight: 0.55, strokeWeightMult: 0.96, waveAmp: 0, simplifyEnd: 0 },
  { id: 2, category: 'female', name: '#03 可愛女大學生', widthRatio: 1.08, heightRatio: 0.95, slantDeg: -3.0, baselineSlope: -1.0, cornerRoundness: 0.90, jitterAmp: 0.055, tremorAmp: 0, dotWeight: 0.62, strokeWeightMult: 1.04, waveAmp: 0.01, simplifyEnd: 0 },
  { id: 3, category: 'female', name: '#04 俐落專櫃小姐', widthRatio: 0.88, heightRatio: 1.12, slantDeg: 5.0, baselineSlope: 2.0, cornerRoundness: 0.30, jitterAmp: 0.032, tremorAmp: 0, dotWeight: 0.45, strokeWeightMult: 0.92, waveAmp: 0, simplifyEnd: 0 },
  { id: 4, category: 'female', name: '#05 典雅家庭主婦', widthRatio: 0.98, heightRatio: 0.98, slantDeg: 1.0, baselineSlope: 0.0, cornerRoundness: 0.40, jitterAmp: 0.030, tremorAmp: 0, dotWeight: 0.55, strokeWeightMult: 0.98, waveAmp: 0, simplifyEnd: 0 },

  // 【男性／職場商務類（5 種）】
  { id: 5, category: 'male', name: '#06 超級男業務(快寫)', widthRatio: 1.04, heightRatio: 0.96, slantDeg: 11.0, baselineSlope: 8.0, cornerRoundness: 0.72, jitterAmp: 0.100, tremorAmp: 0, dotWeight: 0.40, strokeWeightMult: 0.95, waveAmp: 0.02, simplifyEnd: 0.14 },
  { id: 6, category: 'male', name: '#07 沉穩男主管', widthRatio: 1.18, heightRatio: 0.98, slantDeg: 2.5, baselineSlope: 1.5, cornerRoundness: 0.18, jitterAmp: 0.038, tremorAmp: 0, dotWeight: 0.85, strokeWeightMult: 1.18, waveAmp: 0, simplifyEnd: 0 },
  { id: 7, category: 'male', name: '#08 工程師理組男', widthRatio: 0.96, heightRatio: 0.96, slantDeg: 0.0, baselineSlope: 0.0, cornerRoundness: 0.05, jitterAmp: 0.020, tremorAmp: 0, dotWeight: 0.50, strokeWeightMult: 0.98, waveAmp: 0, simplifyEnd: 0 },
  { id: 8, category: 'male', name: '#09 隨性年輕男大生', widthRatio: 1.02, heightRatio: 0.95, slantDeg: 6.5, baselineSlope: 3.5, cornerRoundness: 0.65, jitterAmp: 0.180, tremorAmp: 0, dotWeight: 0.52, strokeWeightMult: 1.00, waveAmp: 0.04, simplifyEnd: 0.06 },
  { id: 9, category: 'male', name: '#10 急躁外送/司機大哥', widthRatio: 1.06, heightRatio: 0.94, slantDeg: 8.5, baselineSlope: 4.5, cornerRoundness: 0.60, jitterAmp: 0.150, tremorAmp: 0.010, dotWeight: 0.45, strokeWeightMult: 1.04, waveAmp: 0.085, simplifyEnd: 0.12 },

  // 【長輩／傳統硬筆類（5 種）】
  { id: 10, category: 'elder', name: '#11 退休老校長(硬筆)', widthRatio: 1.00, heightRatio: 1.04, slantDeg: 1.5, baselineSlope: 2.5, cornerRoundness: 0.22, jitterAmp: 0.035, tremorAmp: 0.008, dotWeight: 0.95, strokeWeightMult: 1.08, waveAmp: 0, simplifyEnd: 0, horizThinVertThick: true },
  { id: 11, category: 'elder', name: '#12 慈祥阿嬤／長輩', widthRatio: 1.08, heightRatio: 1.08, slantDeg: -1.5, baselineSlope: -1.0, cornerRoundness: 0.55, jitterAmp: 0.085, tremorAmp: 0.035, dotWeight: 0.72, strokeWeightMult: 1.12, waveAmp: 0.02, simplifyEnd: 0 },
  { id: 12, category: 'elder', name: '#13 傳統老闆／阿伯', widthRatio: 1.24, heightRatio: 0.94, slantDeg: 4.0, baselineSlope: 4.0, cornerRoundness: 0.48, jitterAmp: 0.120, tremorAmp: 0.015, dotWeight: 0.80, strokeWeightMult: 1.15, waveAmp: 0.03, simplifyEnd: 0.05 },
  { id: 13, category: 'elder', name: '#14 嚴謹老會計師', widthRatio: 0.94, heightRatio: 0.96, slantDeg: 0.0, baselineSlope: 0.0, cornerRoundness: 0.02, jitterAmp: 0.012, tremorAmp: 0, dotWeight: 0.62, strokeWeightMult: 0.94, waveAmp: 0, simplifyEnd: 0 },
  { id: 14, category: 'elder', name: '#15 豪邁老師傅/工人', widthRatio: 1.14, heightRatio: 1.02, slantDeg: 5.5, baselineSlope: 3.0, cornerRoundness: 0.30, jitterAmp: 0.160, tremorAmp: 0.020, dotWeight: 0.88, strokeWeightMult: 1.22, waveAmp: 0.03, simplifyEnd: 0.06 },

  // 【特殊風格／極端對比類（5 種）】
  { id: 15, category: 'special', name: '#16 建築設計手繪風', widthRatio: 0.78, heightRatio: 1.18, slantDeg: 3.0, baselineSlope: 1.5, cornerRoundness: 0.04, jitterAmp: 0.028, tremorAmp: 0, dotWeight: 0.42, strokeWeightMult: 0.88, waveAmp: 0, simplifyEnd: 0 },
  { id: 16, category: 'special', name: '#17 扁平可愛胖胖體', widthRatio: 1.32, heightRatio: 0.86, slantDeg: -1.0, baselineSlope: 0.0, cornerRoundness: 0.95, jitterAmp: 0.060, tremorAmp: 0, dotWeight: 0.70, strokeWeightMult: 1.12, waveAmp: 0.01, simplifyEnd: 0 },
  { id: 17, category: 'special', name: '#18 左撇子獨特傾角', widthRatio: 0.98, heightRatio: 1.00, slantDeg: -9.0, baselineSlope: -4.5, cornerRoundness: 0.45, jitterAmp: 0.075, tremorAmp: 0, dotWeight: 0.60, strokeWeightMult: 1.00, waveAmp: 0.02, simplifyEnd: 0 },
  { id: 18, category: 'special', name: '#19 潦草醫生/急件簽名', widthRatio: 1.10, heightRatio: 0.92, slantDeg: 14.0, baselineSlope: 9.0, cornerRoundness: 0.85, jitterAmp: 0.220, tremorAmp: 0.015, dotWeight: 0.38, strokeWeightMult: 0.96, waveAmp: 0.05, simplifyEnd: 0.22 },
  { id: 19, category: 'special', name: '#20 國小學童一筆一畫', widthRatio: 1.06, heightRatio: 1.06, slantDeg: 0.5, baselineSlope: 0.0, cornerRoundness: 0.14, jitterAmp: 0.080, tremorAmp: 0.012, dotWeight: 0.92, strokeWeightMult: 1.18, waveAmp: 0.02, simplifyEnd: 0 }
];

let hwState = {
  personaId: 0,
  activeCategory: 'female',
  color: '#1A1A1A',
  tipSize: 0.7,
  spacingLevel: 5,
  neatnessLevel: 5,
  seed: 20261122
};

function formatSpacingLabel(sp) {
  const s = Math.max(1, Math.min(10, Number(sp) || 5));
  if (s <= 2) return `${s} (寬鬆分格)`;
  if (s <= 4) return `${s} (偏寬)`;
  if (s <= 6) return `${s} (標準)`;
  if (s <= 8) return `${s} (偏緊)`;
  return `${s} (極緊靠)`;
}

function formatNeatnessLabel(nt) {
  const n = Math.max(1, Math.min(10, Number(nt) || 5));
  if (n <= 2) return `${n} (極認真)`;
  if (n <= 4) return `${n} (偏工整)`;
  if (n <= 6) return `${n} (標準)`;
  if (n <= 8) return `${n} (偏隨性)`;
  return `${n} (極隨性)`;
}

// 10 級左右字距倍率對映 (1 最寬 1.48x -> 5 標準 1.00x -> 10 最緊靠 0.66x)
function getSpacingMultiplier(sLevel) {
  const s = Math.max(1, Math.min(10, Number(sLevel) || 5));
  if (s <= 5) {
    return 1.48 - ((s - 1) / 4) * 0.48;
  }
  return 1.00 - ((s - 5) / 5) * 0.34;
}

// 結合人物預設幾何參數與「微調工整度」(1 認真 -> 10 隨性)
function getEffectivePersonaParams(personaId, neatnessLevel = 5) {
  const p = HW_CHAR_PERSONAS[personaId] || HW_CHAR_PERSONAS[0];
  const n = Math.max(1, Math.min(10, Number(neatnessLevel) || 5));
  const delta = (n - 5) / 5; // -0.8 .. +1.0
  const jitterScale = Math.max(0.35, 1 + delta * 0.65);
  return {
    ...p,
    jitterAmp: p.jitterAmp * jitterScale,
    slantDeg: p.slantDeg + delta * (p.slantDeg >= 0 ? 1.8 : -1.2),
    cornerRoundness: Math.max(0.02, Math.min(0.98, p.cornerRoundness + delta * 0.12)),
    waveAmp: (p.waveAmp || 0) + Math.max(0, delta) * 0.025
  };
}

const hanziStrokeCache = new Map();
const hanziFetchInFlight = new Map();
let hwPreviewRenderTimer = null;

// 高擬真英數字與常用符號向量手寫路徑庫 ([0..1, 0..1] 正規化空間)
const HW_ASCII_GLYPHS = {
  '0': [[[0.52,0.16],[0.30,0.22],[0.20,0.48],[0.26,0.76],[0.50,0.84],[0.74,0.74],[0.78,0.44],[0.68,0.20],[0.48,0.16]]],
  '1': [[[0.34,0.28],[0.50,0.16],[0.50,0.50],[0.49,0.83]]],
  '2': [[[0.24,0.30],[0.38,0.16],[0.64,0.17],[0.74,0.32],[0.62,0.52],[0.38,0.70],[0.22,0.83],[0.52,0.82],[0.78,0.82]]],
  '3': [[[0.26,0.24],[0.48,0.15],[0.70,0.23],[0.66,0.40],[0.44,0.47],[0.68,0.54],[0.75,0.71],[0.56,0.83],[0.26,0.78]]],
  '4': [[[0.62,0.16],[0.40,0.42],[0.20,0.62],[0.52,0.61],[0.80,0.60]], [[0.64,0.18],[0.63,0.54],[0.62,0.84]]],
  '5': [[[0.72,0.18],[0.48,0.18],[0.30,0.19],[0.27,0.46],[0.52,0.44],[0.74,0.54],[0.72,0.74],[0.50,0.84],[0.26,0.78]]],
  '6': [[[0.66,0.18],[0.42,0.24],[0.26,0.48],[0.26,0.74],[0.48,0.84],[0.72,0.76],[0.72,0.56],[0.50,0.48],[0.28,0.56]]],
  '7': [[[0.22,0.20],[0.50,0.19],[0.76,0.18],[0.58,0.50],[0.42,0.84]]],
  '8': [[[0.52,0.46],[0.30,0.38],[0.28,0.22],[0.50,0.15],[0.72,0.23],[0.68,0.39],[0.48,0.48],[0.26,0.59],[0.26,0.76],[0.50,0.84],[0.74,0.74],[0.72,0.56],[0.50,0.47]]],
  '9': [[[0.72,0.34],[0.64,0.18],[0.42,0.16],[0.26,0.29],[0.30,0.47],[0.52,0.50],[0.72,0.38],[0.68,0.64],[0.54,0.84]]],
  'A': [[[0.50,0.15],[0.35,0.50],[0.20,0.84]], [[0.50,0.15],[0.65,0.50],[0.80,0.84]], [[0.30,0.58],[0.52,0.57],[0.72,0.57]]],
  'B': [[[0.26,0.16],[0.25,0.50],[0.25,0.84]], [[0.26,0.17],[0.58,0.17],[0.70,0.29],[0.62,0.45],[0.26,0.48],[0.64,0.52],[0.75,0.68],[0.62,0.82],[0.25,0.83]]],
  'C': [[[0.74,0.26],[0.54,0.16],[0.32,0.24],[0.22,0.50],[0.32,0.76],[0.56,0.84],[0.76,0.74]]],
  'D': [[[0.26,0.16],[0.25,0.50],[0.25,0.84]], [[0.26,0.17],[0.56,0.19],[0.76,0.36],[0.76,0.64],[0.56,0.81],[0.25,0.83]]],
  'E': [[[0.28,0.17],[0.27,0.50],[0.26,0.83]], [[0.28,0.17],[0.52,0.17],[0.74,0.16]], [[0.27,0.49],[0.48,0.49],[0.66,0.48]], [[0.26,0.83],[0.52,0.82],[0.76,0.82]]],
  'F': [[[0.28,0.17],[0.27,0.50],[0.26,0.84]], [[0.28,0.17],[0.52,0.17],[0.74,0.16]], [[0.27,0.49],[0.48,0.49],[0.66,0.48]]],
  'G': [[[0.72,0.26],[0.52,0.16],[0.30,0.24],[0.22,0.50],[0.32,0.76],[0.56,0.84],[0.76,0.72],[0.76,0.52],[0.54,0.52]]],
  'H': [[[0.26,0.16],[0.25,0.50],[0.24,0.84]], [[0.74,0.16],[0.73,0.50],[0.72,0.84]], [[0.25,0.49],[0.50,0.48],[0.74,0.48]]],
  'I': [[[0.34,0.17],[0.50,0.17],[0.66,0.17]], [[0.50,0.17],[0.50,0.50],[0.49,0.83]], [[0.34,0.83],[0.50,0.83],[0.66,0.83]]],
  'J': [[[0.66,0.17],[0.66,0.56],[0.58,0.78],[0.40,0.84],[0.24,0.72]]],
  'K': [[[0.26,0.16],[0.25,0.50],[0.24,0.84]], [[0.74,0.18],[0.48,0.38],[0.26,0.52],[0.52,0.68],[0.76,0.84]]],
  'L': [[[0.28,0.16],[0.26,0.52],[0.26,0.83],[0.52,0.82],[0.76,0.82]]],
  'M': [[[0.20,0.84],[0.23,0.48],[0.26,0.17],[0.50,0.56],[0.74,0.17],[0.77,0.50],[0.80,0.84]]],
  'N': [[[0.24,0.84],[0.25,0.48],[0.26,0.17],[0.52,0.52],[0.74,0.83],[0.75,0.48],[0.76,0.16]]],
  'O': [[[0.50,0.16],[0.28,0.24],[0.20,0.50],[0.28,0.76],[0.50,0.84],[0.74,0.76],[0.80,0.50],[0.72,0.24],[0.48,0.16]]],
  'P': [[[0.26,0.16],[0.25,0.50],[0.24,0.84]], [[0.26,0.17],[0.58,0.17],[0.74,0.30],[0.68,0.47],[0.46,0.52],[0.25,0.51]]],
  'Q': [[[0.50,0.16],[0.28,0.24],[0.20,0.50],[0.28,0.76],[0.50,0.84],[0.74,0.76],[0.80,0.50],[0.72,0.24],[0.48,0.16]], [[0.56,0.64],[0.70,0.76],[0.84,0.88]]],
  'R': [[[0.26,0.16],[0.25,0.50],[0.24,0.84]], [[0.26,0.17],[0.58,0.17],[0.72,0.30],[0.66,0.46],[0.26,0.50],[0.54,0.64],[0.76,0.84]]],
  'S': [[[0.72,0.24],[0.52,0.15],[0.30,0.22],[0.28,0.38],[0.52,0.48],[0.74,0.59],[0.72,0.76],[0.48,0.84],[0.24,0.76]]],
  'T': [[[0.20,0.17],[0.50,0.17],[0.80,0.17]], [[0.50,0.17],[0.49,0.50],[0.48,0.84]]],
  'U': [[[0.24,0.17],[0.25,0.56],[0.34,0.78],[0.52,0.84],[0.70,0.76],[0.76,0.52],[0.76,0.17]]],
  'V': [[[0.22,0.17],[0.36,0.52],[0.50,0.84],[0.64,0.52],[0.78,0.17]]],
  'W': [[[0.16,0.17],[0.26,0.54],[0.34,0.83],[0.50,0.42],[0.66,0.83],[0.74,0.54],[0.84,0.17]]],
  'X': [[[0.22,0.17],[0.50,0.50],[0.78,0.84]], [[0.78,0.17],[0.50,0.50],[0.22,0.84]]],
  'Y': [[[0.22,0.17],[0.36,0.36],[0.50,0.52],[0.64,0.36],[0.78,0.17]], [[0.50,0.52],[0.49,0.68],[0.48,0.84]]],
  'Z': [[[0.22,0.18],[0.50,0.18],[0.76,0.18],[0.48,0.50],[0.22,0.82],[0.50,0.82],[0.78,0.82]]],
  'a': [[[0.68,0.44],[0.48,0.38],[0.28,0.48],[0.26,0.70],[0.44,0.82],[0.66,0.72],[0.70,0.46],[0.72,0.74],[0.78,0.82]]],
  'b': [[[0.26,0.16],[0.26,0.50],[0.26,0.82]], [[0.26,0.54],[0.48,0.38],[0.70,0.48],[0.72,0.70],[0.52,0.82],[0.27,0.76]]],
  'c': [[[0.72,0.46],[0.52,0.38],[0.30,0.46],[0.26,0.66],[0.42,0.82],[0.70,0.78]]],
  'd': [[[0.70,0.48],[0.50,0.38],[0.28,0.48],[0.26,0.70],[0.46,0.82],[0.70,0.72]], [[0.72,0.16],[0.71,0.50],[0.72,0.82]]],
  'e': [[[0.26,0.60],[0.54,0.58],[0.74,0.52],[0.66,0.40],[0.44,0.38],[0.26,0.52],[0.28,0.74],[0.50,0.83],[0.74,0.76]]],
  'f': [[[0.68,0.22],[0.54,0.16],[0.44,0.26],[0.44,0.56],[0.44,0.84]], [[0.28,0.44],[0.46,0.44],[0.64,0.43]]],
  'g': [[[0.70,0.44],[0.48,0.38],[0.28,0.48],[0.28,0.70],[0.50,0.78],[0.70,0.66],[0.72,0.44],[0.70,0.82],[0.56,0.96],[0.34,0.94]]],
  'h': [[[0.26,0.16],[0.26,0.50],[0.26,0.82]], [[0.26,0.54],[0.46,0.39],[0.66,0.44],[0.72,0.64],[0.74,0.82]]],
  'i': [[[0.49,0.22],[0.51,0.24]], [[0.48,0.42],[0.49,0.62],[0.50,0.82]]],
  'j': [[[0.56,0.22],[0.58,0.24]], [[0.56,0.42],[0.56,0.74],[0.46,0.94],[0.30,0.92]]],
  'k': [[[0.28,0.16],[0.28,0.50],[0.27,0.82]], [[0.68,0.40],[0.48,0.52],[0.30,0.60],[0.52,0.72],[0.72,0.83]]],
  'l': [[[0.48,0.16],[0.49,0.50],[0.50,0.82]]],
  'm': [[[0.18,0.42],[0.20,0.64],[0.20,0.82]], [[0.20,0.52],[0.34,0.39],[0.48,0.48],[0.49,0.82]], [[0.49,0.52],[0.64,0.39],[0.78,0.48],[0.80,0.82]]],
  'n': [[[0.26,0.42],[0.26,0.64],[0.26,0.82]], [[0.26,0.52],[0.46,0.39],[0.68,0.46],[0.72,0.64],[0.74,0.82]]],
  'o': [[[0.50,0.38],[0.30,0.46],[0.24,0.64],[0.34,0.80],[0.54,0.83],[0.72,0.72],[0.74,0.52],[0.58,0.39],[0.46,0.39]]],
  'p': [[[0.28,0.40],[0.28,0.68],[0.27,0.96]], [[0.28,0.48],[0.50,0.38],[0.72,0.48],[0.72,0.68],[0.52,0.80],[0.29,0.74]]],
  'q': [[[0.70,0.46],[0.48,0.38],[0.28,0.48],[0.28,0.70],[0.48,0.80],[0.70,0.68]], [[0.72,0.40],[0.71,0.68],[0.72,0.96]]],
  'r': [[[0.30,0.42],[0.30,0.64],[0.30,0.82]], [[0.30,0.54],[0.46,0.40],[0.66,0.42],[0.74,0.48]]],
  's': [[[0.68,0.44],[0.48,0.38],[0.30,0.44],[0.32,0.56],[0.54,0.62],[0.70,0.70],[0.64,0.81],[0.42,0.83],[0.26,0.76]]],
  't': [[[0.46,0.20],[0.46,0.54],[0.50,0.78],[0.64,0.82],[0.74,0.76]], [[0.28,0.42],[0.48,0.41],[0.68,0.40]]],
  'u': [[[0.26,0.42],[0.28,0.66],[0.38,0.81],[0.56,0.80],[0.70,0.66]], [[0.72,0.42],[0.72,0.64],[0.74,0.82]]],
  'v': [[[0.24,0.42],[0.38,0.64],[0.50,0.82],[0.62,0.64],[0.76,0.42]]],
  'w': [[[0.18,0.42],[0.28,0.64],[0.36,0.82],[0.50,0.54],[0.64,0.82],[0.72,0.64],[0.82,0.42]]],
  'x': [[[0.26,0.42],[0.50,0.62],[0.74,0.82]], [[0.74,0.42],[0.50,0.62],[0.26,0.82]]],
  'y': [[[0.26,0.42],[0.38,0.62],[0.50,0.78]], [[0.74,0.42],[0.56,0.68],[0.42,0.88],[0.28,0.96]]],
  'z': [[[0.26,0.42],[0.50,0.42],[0.72,0.42],[0.48,0.62],[0.26,0.82],[0.50,0.82],[0.74,0.82]]],
  '@': [[[0.68,0.48],[0.56,0.38],[0.40,0.44],[0.38,0.62],[0.52,0.68],[0.68,0.56],[0.70,0.42],[0.68,0.66],[0.80,0.68],[0.86,0.46],[0.74,0.24],[0.46,0.18],[0.22,0.34],[0.18,0.64],[0.36,0.84],[0.68,0.84]]],
  '.': [[[0.46,0.78],[0.50,0.82]]],
  ',': [[[0.52,0.76],[0.46,0.88]]],
  '-': [[[0.26,0.54],[0.50,0.53],[0.74,0.53]]],
  '_': [[[0.16,0.86],[0.50,0.86],[0.84,0.86]]],
  '/': [[[0.72,0.16],[0.48,0.50],[0.26,0.84]]],
  ':': [[[0.48,0.36],[0.51,0.39]], [[0.48,0.74],[0.51,0.77]]],
  '(': [[[0.62,0.14],[0.44,0.32],[0.38,0.52],[0.44,0.72],[0.62,0.88]]],
  ')': [[[0.38,0.14],[0.56,0.32],[0.62,0.52],[0.56,0.72],[0.38,0.88]]],
  '+': [[[0.50,0.30],[0.50,0.72]], [[0.28,0.51],[0.72,0.51]]],
  '~': [[[0.18,0.56],[0.36,0.44],[0.64,0.64],[0.82,0.50]]],
  '#': [[[0.38,0.20],[0.32,0.82]], [[0.66,0.20],[0.60,0.82]], [[0.20,0.40],[0.80,0.40]], [[0.18,0.62],[0.78,0.62]]],
  '，': [[[0.46,0.74],[0.36,0.88]]],
  '。': [[[0.40,0.72],[0.30,0.76],[0.30,0.86],[0.42,0.88],[0.50,0.80],[0.42,0.72]]],
  '、': [[[0.36,0.70],[0.48,0.84]]],
  '：': [[[0.48,0.36],[0.51,0.39]], [[0.48,0.74],[0.51,0.77]]],
  '（': [[[0.64,0.14],[0.44,0.32],[0.38,0.52],[0.44,0.72],[0.64,0.88]]],
  '）': [[[0.36,0.14],[0.56,0.32],[0.62,0.52],[0.56,0.72],[0.36,0.88]]],
  '－': [[[0.20,0.52],[0.50,0.52],[0.80,0.52]]],
  '／': [[[0.74,0.16],[0.48,0.50],[0.22,0.84]]]
};

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isCJKChar(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF);
}

// 取得繁體中文向量筆順資料 (hanzi-writer-data CDN + 記憶體快取)
async function fetchHanziStrokes(ch) {
  if (hanziStrokeCache.has(ch)) return hanziStrokeCache.get(ch);
  if (hanziFetchInFlight.has(ch)) return hanziFetchInFlight.get(ch);

  const encoded = encodeURIComponent(ch);
  const urls = [
    `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encoded}.json`,
    `https://unpkg.com/hanzi-writer-data@2.0/${encoded}.json`
  ];

  const promise = (async () => {
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (data && Array.isArray(data.medians) && data.medians.length > 0) {
          // 轉換 hanzi-writer-data (1024x1024, y: 900 -> -124) 至 [0..1, 0..1]
          const strokes = data.medians.map(median =>
            median.map(pt => [
              Math.max(0.02, Math.min(0.98, pt[0] / 1024)),
              Math.max(0.02, Math.min(0.98, (900 - pt[1]) / 1024))
            ])
          );
          hanziStrokeCache.set(ch, strokes);
          return strokes;
        }
      } catch (err) {
        // try next CDN
      }
    }
    hanziStrokeCache.set(ch, null);
    return null;
  })();

  hanziFetchInFlight.set(ch, promise);
  const result = await promise;
  hanziFetchInFlight.delete(ch);
  return result;
}

// 離線或缺字時的有機筆順骨架備援（保證絕不出現空白或系統電腦字型）
function synthesizeFallbackCjkStrokes(ch) {
  const code = ch.charCodeAt(0);
  const rng = mulberry32(code * 2654435761);
  const strokes = [];
  const count = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    if (i % 3 === 0) {
      const y = 0.18 + t * 0.65 + (rng() - 0.5) * 0.06;
      strokes.push([[0.18 + rng() * 0.1, y], [0.5, y - 0.02], [0.82 - rng() * 0.1, y]]);
    } else if (i % 3 === 1) {
      const x = 0.24 + (i / count) * 0.52;
      strokes.push([[x, 0.16 + rng() * 0.08], [x + (rng() - 0.5) * 0.04, 0.5], [x, 0.84 - rng() * 0.06]]);
    } else {
      strokes.push([[0.32 + rng() * 0.25, 0.28 + rng() * 0.2], [0.5 + (rng() - 0.5) * 0.15, 0.55], [0.76 - rng() * 0.1, 0.80]]);
    }
  }
  return strokes;
}

async function ensureCharsLoaded(text) {
  const chars = Array.from(new Set(Array.from(text || '').filter(ch => isCJKChar(ch))));
  const missing = chars.filter(ch => !hanziStrokeCache.has(ch));
  if (missing.length === 0) {
    if (hwStrokeStatus) hwStrokeStatus.textContent = '筆順模擬就緒';
    return;
  }
  if (hwStrokeStatus) hwStrokeStatus.textContent = `載入筆順 (${missing.length}字)...`;
  await Promise.all(missing.map(ch => fetchHanziStrokes(ch)));
  if (hwStrokeStatus) hwStrokeStatus.textContent = '油性原子筆就緒';
  scheduleHandwritingPreviewUpdate(20);
}

// 繪製速乾油性原子筆單筆劃（起筆微頓墨點 ＋ 均勻俐落中段 ＋ 乾脆收筆，徹底零牽絲）
function drawBallpointStroke(tCtx, pts, baseWidth, color, prof, arcJitter, tremorPx, rng) {
  if (!pts || pts.length < 2) return;

  const roundness = prof.cornerRoundness;
  const samples = [];
  if (pts.length === 2) {
    const p0 = pts[0];
    const p1 = pts[1];
    const midX = (p0[0] + p1[0]) / 2 + (rng() - 0.5) * arcJitter;
    const midY = (p0[1] + p1[1]) / 2 + (rng() - 0.5) * arcJitter;
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const it = 1 - t;
      let sx = it * it * p0[0] + 2 * it * t * midX + t * t * p1[0];
      let sy = it * it * p0[1] + 2 * it * t * midY + t * t * p1[1];
      if (tremorPx > 0 && s > 0 && s < steps) {
        sx += (rng() - 0.5) * tremorPx;
        sy += (rng() - 0.5) * tremorPx;
      }
      samples.push([sx, sy]);
    }
  } else {
    const ctrlTension = 0.15 + roundness * 0.72;
    samples.push(pts[0]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const subSteps = 4;
      if (i < pts.length - 2) {
        const p2 = pts[i + 2];
        const mx1 = p0[0] + (p1[0] - p0[0]) * (1 - ctrlTension * 0.42);
        const my1 = p0[1] + (p1[1] - p0[1]) * (1 - ctrlTension * 0.42);
        const mx2 = (p1[0] + p2[0]) / 2;
        const my2 = (p1[1] + p2[1]) / 2;
        for (let s = 1; s <= subSteps; s++) {
          const t = s / subSteps;
          const it = 1 - t;
          let sx = it * it * mx1 + 2 * it * t * p1[0] + t * t * mx2;
          let sy = it * it * my1 + 2 * it * t * p1[1] + t * t * my2;
          if (tremorPx > 0) {
            sx += (rng() - 0.5) * tremorPx;
            sy += (rng() - 0.5) * tremorPx;
          }
          samples.push([sx, sy]);
        }
      } else {
        for (let s = 1; s <= subSteps; s++) {
          const t = s / subSteps;
          let sx = p0[0] + (p1[0] - p0[0]) * t;
          let sy = p0[1] + (p1[1] - p0[1]) * t;
          if (tremorPx > 0 && s < subSteps) {
            sx += (rng() - 0.5) * tremorPx;
            sy += (rng() - 0.5) * tremorPx;
          }
          samples.push([sx, sy]);
        }
      }
    }
  }

  // 判斷筆畫方向（供硬筆橫細豎粗風格使用）
  const dxAll = Math.abs(pts[pts.length - 1][0] - pts[0][0]);
  const dyAll = Math.abs(pts[pts.length - 1][1] - pts[0][1]);
  let dirMult = 1.0;
  if (prof.horizThinVertThick) {
    dirMult = dyAll > dxAll * 1.15 ? 1.24 : (dxAll > dyAll * 1.25 ? 0.80 : 1.0);
  }

  // 原子筆起筆微頓墨點（力度依人物 dotWeight 調整）
  const dotWeight = prof.dotWeight !== undefined ? prof.dotWeight : 0.55;
  tCtx.save();
  tCtx.fillStyle = color;
  tCtx.globalAlpha = 0.92;
  tCtx.beginPath();
  tCtx.arc(samples[0][0], samples[0][1], Math.max(0.7, baseWidth * (0.42 + dotWeight * 0.34) * dirMult), 0, Math.PI * 2);
  tCtx.fill();

  tCtx.strokeStyle = color;
  tCtx.lineCap = 'round';
  tCtx.lineJoin = 'round';

  const total = samples.length - 1;
  for (let i = 0; i < total; i++) {
    const t = i / Math.max(1, total - 1);
    let pressure = 1.0;
    if (t < 0.14) {
      pressure = (1.02 + dotWeight * 0.18) - (t / 0.14) * (0.04 + dotWeight * 0.16);
    } else if (t > 0.86) {
      pressure = 0.98 - ((t - 0.86) / 0.14) * 0.20;
    } else {
      pressure = 0.98 + (rng() - 0.5) * 0.05;
    }

    tCtx.lineWidth = Math.max(0.7, baseWidth * dirMult * pressure);
    tCtx.globalAlpha = 0.90 + pressure * 0.06;
    tCtx.beginPath();
    tCtx.moveTo(samples[i][0], samples[i][1]);
    tCtx.lineTo(samples[i + 1][0], samples[i + 1][1]);
    tCtx.stroke();
  }
  tCtx.restore();
}

// 核心渲染函式：將多行手寫資料渲染至目標 Canvas（或產生高解析透明底離屏 Canvas）
function renderHandwritingToCanvas(options, targetCanvas = null, maxBoxW = 0, maxBoxH = 0) {
  const text = (options.text || '').replace(/\r\n/g, '\n');
  const color = options.color || '#1A1A1A';
  const tipSize = options.tipSize || 0.7;
  const personaId = options.personaId !== undefined ? Number(options.personaId) : 0;
  const spacingLevel = Math.max(1, Math.min(10, options.spacingLevel || 5));
  const neatnessLevel = Math.max(1, Math.min(10, options.neatnessLevel || 5));
  const baseSeed = options.seed || 20261122;

  const prof = getEffectivePersonaParams(personaId, neatnessLevel);
  const spacingMult = getSpacingMultiplier(spacingLevel);

  const lines = text.split('\n');
  const fontSize = options.fontSize || 68;
  const lineHeight = fontSize * 1.48;
  const padX = Math.round(fontSize * 0.48);
  const padY = Math.round(fontSize * 0.36);

  function getCharAdvance(ch) {
    if (ch === ' ') return fontSize * 0.40 * spacingMult;
    if (isCJKChar(ch)) return fontSize * prof.widthRatio * 1.04 * spacingMult;
    if (/[0-9A-Z]/.test(ch)) return fontSize * 0.62 * prof.widthRatio * spacingMult;
    if ("iltfjr.,:'\"!|".includes(ch)) return fontSize * 0.40 * prof.widthRatio * spacingMult;
    return fontSize * 0.54 * prof.widthRatio * spacingMult;
  }

  let maxLineW = fontSize * 2;
  lines.forEach(line => {
    let w = 0;
    for (const ch of line) w += getCharAdvance(ch);
    if (w > maxLineW) maxLineW = w;
  });

  const contentW = Math.ceil(maxLineW + padX * 2);
  const contentH = Math.ceil(Math.max(1, lines.length) * lineHeight + padY * 2);

  const offCanvas = document.createElement('canvas');
  offCanvas.width = Math.max(120, contentW);
  offCanvas.height = Math.max(60, contentH);
  const oCtx = offCanvas.getContext('2d');

  // 筆尖粗細倍率 (0.4mm 細, 0.7mm 中, 1.1mm 粗) * 人物筆觸力道倍率
  const tipFactor = tipSize <= 0.45 ? 0.025 : (tipSize <= 0.8 ? 0.038 : 0.056);
  const strokeBaseWidth = Math.max(1.0, fontSize * tipFactor * (prof.strokeWeightMult || 1.0));

  const slantTan = Math.tan((prof.slantDeg * Math.PI) / 180);
  const baselineSlopeTan = Math.tan(((prof.baselineSlope || 0) * Math.PI) / 180);
  const arcJitter = fontSize * prof.jitterAmp * 0.22;
  const tremorPx = fontSize * (prof.tremorAmp || 0);

  lines.forEach((line, lineIdx) => {
    let cursorX = padX;
    const baseLineY = padY + lineIdx * lineHeight;

    const chars = Array.from(line);
    chars.forEach((ch, charIdx) => {
      const adv = getCharAdvance(ch);
      if (ch === ' ' || ch === '\t') {
        cursorX += adv;
        return;
      }

      const charSeed = (baseSeed + lineIdx * 9973 + charIdx * 313 + ch.charCodeAt(0) * 17) >>> 0;
      const rng = mulberry32(charSeed);

      // 依人物幾何參數產生大小誤差、波浪基線跳動與微傾角
      const scaleW = 1 + (rng() - 0.5) * 2 * prof.jitterAmp;
      const scaleH = 1 + (rng() - 0.5) * 2 * prof.jitterAmp;
      const waveY = Math.sin(charIdx * 0.95 + lineIdx * 1.9) * fontSize * (prof.waveAmp || 0);
      const driftY = waveY + (rng() - 0.5) * fontSize * prof.jitterAmp * 0.55;
      const driftX = (rng() - 0.5) * fontSize * prof.jitterAmp * 0.25;
      const microRot = ((rng() - 0.5) * 2 * (1.2 + prof.jitterAmp * 28) * Math.PI) / 180;

      let rawStrokes = null;
      if (HW_ASCII_GLYPHS[ch]) {
        rawStrokes = HW_ASCII_GLYPHS[ch];
      } else if (hanziStrokeCache.has(ch) && hanziStrokeCache.get(ch)) {
        rawStrokes = hanziStrokeCache.get(ch);
      } else if (isCJKChar(ch)) {
        rawStrokes = synthesizeFallbackCjkStrokes(ch);
      } else {
        rawStrokes = HW_ASCII_GLYPHS['-'];
      }

      const glyphW = (isCJKChar(ch) ? fontSize : fontSize * 0.72) * prof.widthRatio * scaleW;
      const glyphH = fontSize * prof.heightRatio * scaleH;
      const cx = cursorX + adv * 0.48 + driftX;
      const cy = baseLineY + fontSize * 0.52 + driftY;

      const transformedStrokes = rawStrokes.map((stroke, sIdx) => {
        // 急件快寫/草寫風格略微簡化收尾筆劃長度
        const simplify = prof.simplifyEnd || 0;
        const sJitterX = (rng() - 0.5) * fontSize * prof.jitterAmp * 0.22;
        const sJitterY = (rng() - 0.5) * fontSize * prof.jitterAmp * 0.22;
        return stroke.map((pt, pIdx) => {
          let px = pt[0];
          let py = pt[1];
          if (simplify > 0 && pIdx === stroke.length - 1 && sIdx > 0) {
            px = px + (rng() - 0.35) * simplify * 0.18;
            py = py + (rng() - 0.5) * simplify * 0.18;
          }
          const nx = px - 0.5;
          const ny = py - 0.5;
          const lx = nx * glyphW + (rng() - 0.5) * fontSize * prof.jitterAmp * 0.16;
          // 施加橫畫上揚/下傾角度 (baselineSlope)
          const ly = ny * glyphH - nx * glyphH * baselineSlopeTan + (rng() - 0.5) * fontSize * prof.jitterAmp * 0.16;
          // 施加左右傾角 (slantDeg) 與微旋轉
          const sx = lx - ly * slantTan;
          const rx = sx * Math.cos(microRot) - ly * Math.sin(microRot);
          const ry = sx * Math.sin(microRot) + ly * Math.cos(microRot);
          return [cx + rx + sJitterX, cy + ry + sJitterY];
        });
      });

      // 每一筆劃獨立落筆、隨落隨停，徹底零牽絲
      transformedStrokes.forEach(pts => {
        drawBallpointStroke(oCtx, pts, strokeBaseWidth, color, prof, arcJitter, tremorPx, rng);
      });

      cursorX += adv;
    });
  });

  if (!targetCanvas) {
    return offCanvas;
  }

  const tCtx = targetCanvas.getContext('2d');
  const dstW = maxBoxW || targetCanvas.width;
  const dstH = maxBoxH || targetCanvas.height;
  targetCanvas.width = dstW;
  targetCanvas.height = dstH;
  tCtx.clearRect(0, 0, dstW, dstH);

  const scale = Math.min((dstW - 8) / offCanvas.width, (dstH - 6) / offCanvas.height, 1.0);
  const drawW = offCanvas.width * scale;
  const drawH = offCanvas.height * scale;
  tCtx.imageSmoothingEnabled = true;
  tCtx.imageSmoothingQuality = 'high';
  tCtx.drawImage(offCanvas, (dstW - drawW) / 2, (dstH - drawH) / 2, drawW, drawH);
  return targetCanvas;
}

function saveHwSettings() {
  try {
    localStorage.setItem(HW_STORAGE_KEY, JSON.stringify({
      personaId: hwState.personaId,
      activeCategory: hwState.activeCategory,
      color: hwState.color,
      tipSize: hwState.tipSize,
      spacingLevel: hwState.spacingLevel,
      neatnessLevel: hwState.neatnessLevel
    }));
  } catch (e) {}
}

function loadHwSettings() {
  try {
    const raw = localStorage.getItem(HW_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.personaId !== undefined) hwState.personaId = Math.max(0, Math.min(19, Number(saved.personaId) || 0));
    if (saved.activeCategory && HW_CATEGORY_LABELS[saved.activeCategory]) hwState.activeCategory = saved.activeCategory;
    if (saved.color) hwState.color = saved.color;
    if (saved.tipSize) hwState.tipSize = Number(saved.tipSize) || 0.7;
    if (saved.spacingLevel) hwState.spacingLevel = Math.max(1, Math.min(10, Number(saved.spacingLevel) || 5));
    if (saved.neatnessLevel) hwState.neatnessLevel = Math.max(1, Math.min(10, Number(saved.neatnessLevel) || 5));
  } catch (e) {}
}

function populateHwPersonaSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  ['female', 'male', 'elder', 'special'].forEach(cat => {
    const grp = document.createElement('optgroup');
    grp.label = HW_CATEGORY_LABELS[cat];
    HW_CHAR_PERSONAS.filter(p => p.category === cat).forEach(p => {
      const opt = document.createElement('option');
      opt.value = String(p.id);
      opt.textContent = p.name;
      grp.appendChild(opt);
    });
    selectEl.appendChild(grp);
  });
}

function renderHwPersonaButtons() {
  if (!hwPersonaButtons) return;
  hwPersonaButtons.innerHTML = '';
  const list = HW_CHAR_PERSONAS.filter(p => p.category === hwState.activeCategory);
  list.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `hw-persona-btn ${p.id === hwState.personaId ? 'active' : ''}`;
    btn.dataset.personaId = String(p.id);
    btn.textContent = p.name;
    btn.addEventListener('click', () => {
      hwState.personaId = p.id;
      saveHwSettings();
      syncHwUIFromState();
      renderMainHwPreview();
    });
    hwPersonaButtons.appendChild(btn);
  });
}

function syncHwUIFromState() {
  const persona = HW_CHAR_PERSONAS[hwState.personaId] || HW_CHAR_PERSONAS[0];
  if (hwPersonaBadge) hwPersonaBadge.textContent = persona.name;

  if (hwCategoryTabs) {
    hwCategoryTabs.querySelectorAll('.hw-cat-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === hwState.activeCategory);
    });
  }
  renderHwPersonaButtons();

  if (hwPersonaSelect) hwPersonaSelect.value = String(hwState.personaId);
  if (hwColorPresets) updateColorButtonSelection(hwColorPresets, hwState.color);
  if (hwTipGroup) {
    hwTipGroup.querySelectorAll('.hw-tip-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.tip) === hwState.tipSize);
    });
  }
  if (sliderHwSpacing) sliderHwSpacing.value = hwState.spacingLevel;
  if (valHwSpacing) valHwSpacing.textContent = formatSpacingLabel(hwState.spacingLevel);
  if (sliderHwNeatness) sliderHwNeatness.value = hwState.neatnessLevel;
  if (valHwNeatness) valHwNeatness.textContent = formatNeatnessLabel(hwState.neatnessLevel);
}

function renderMainHwPreview() {
  if (!hwMainPreviewCanvas || !inputHandwritingText) return;
  const rawText = inputHandwritingText.value || '王小明';
  renderHandwritingToCanvas({
    text: rawText,
    personaId: hwState.personaId,
    color: hwState.color,
    tipSize: hwState.tipSize,
    spacingLevel: hwState.spacingLevel,
    neatnessLevel: hwState.neatnessLevel,
    seed: hwState.seed,
    fontSize: 44
  }, hwMainPreviewCanvas, 340, 140);
}

function renderAllHandwritingPreviews() {
  renderMainHwPreview();
}

function scheduleHandwritingPreviewUpdate(delayMs = 50) {
  clearTimeout(hwPreviewRenderTimer);
  hwPreviewRenderTimer = setTimeout(() => {
    renderMainHwPreview();
  }, delayMs);
}

function rebuildActiveHandwritingLayer(recordUndo = true) {
  if (!activeLayer || activeLayer.type !== 'handwriting' || !activeLayer.hwOptions) return;
  if (recordUndo) pushUndoState('調整手寫客戶資料');

  const opt = activeLayer.hwOptions;
  const newCanvas = renderHandwritingToCanvas({
    ...opt,
    fontSize: 68
  });

  const keepScale = activeLayer.width / Math.max(1, activeLayer.image ? activeLayer.image.width : newCanvas.width);

  activeLayer.image = newCanvas;
  activeLayer.rawImage = newCanvas;
  activeLayer.width = Math.round(newCanvas.width * keepScale);
  activeLayer.height = Math.round(newCanvas.height * keepScale);
  const previewLine = (opt.text || '').split('\n')[0].trim().slice(0, 14) || '客戶手寫資料';
  activeLayer.name = `手寫: ${previewLine}`;

  ensureCharsLoaded(opt.text || '');
  updateLayersListUI();
  render();
}

function initHandwritingGenerator() {
  if (!inputHandwritingText) return;
  loadHwSettings();
  populateHwPersonaSelect(hwPersonaSelect);
  populateHwPersonaSelect(editHwPersona);
  syncHwUIFromState();

  ensureCharsLoaded(inputHandwritingText.value);
  renderMainHwPreview();

  inputHandwritingText.addEventListener('input', () => {
    ensureCharsLoaded(inputHandwritingText.value);
    scheduleHandwritingPreviewUpdate(80);
  });

  if (hwCategoryTabs) {
    hwCategoryTabs.querySelectorAll('.hw-cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        hwState.activeCategory = tab.dataset.cat;
        const firstInCat = HW_CHAR_PERSONAS.find(p => p.category === hwState.activeCategory);
        if (firstInCat) hwState.personaId = firstInCat.id;
        saveHwSettings();
        syncHwUIFromState();
        renderMainHwPreview();
      });
    });
  }

  if (hwPersonaSelect) {
    hwPersonaSelect.addEventListener('change', () => {
      const pid = parseInt(hwPersonaSelect.value, 10) || 0;
      const persona = HW_CHAR_PERSONAS[pid] || HW_CHAR_PERSONAS[0];
      hwState.personaId = persona.id;
      hwState.activeCategory = persona.category;
      saveHwSettings();
      syncHwUIFromState();
      renderMainHwPreview();
    });
  }

  if (hwColorPresets) {
    hwColorPresets.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        hwState.color = btn.dataset.color;
        saveHwSettings();
        syncHwUIFromState();
        scheduleHandwritingPreviewUpdate(20);
      });
    });
  }

  if (hwTipGroup) {
    hwTipGroup.querySelectorAll('.hw-tip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        hwState.tipSize = parseFloat(btn.dataset.tip) || 0.7;
        saveHwSettings();
        syncHwUIFromState();
        scheduleHandwritingPreviewUpdate(20);
      });
    });
  }

  if (sliderHwSpacing) {
    sliderHwSpacing.addEventListener('input', () => {
      hwState.spacingLevel = parseInt(sliderHwSpacing.value, 10) || 5;
      saveHwSettings();
      syncHwUIFromState();
      scheduleHandwritingPreviewUpdate(30);
    });
  }

  if (sliderHwNeatness) {
    sliderHwNeatness.addEventListener('input', () => {
      hwState.neatnessLevel = parseInt(sliderHwNeatness.value, 10) || 5;
      saveHwSettings();
      syncHwUIFromState();
      scheduleHandwritingPreviewUpdate(30);
    });
  }

  if (btnHwResample) {
    btnHwResample.addEventListener('click', () => {
      hwState.seed = Math.floor(Math.random() * 10000000) + 1;
      renderMainHwPreview();
    });
  }

  if (btnAddHandwriting) {
    btnAddHandwriting.addEventListener('click', async () => {
      const text = (inputHandwritingText.value || '').trim();
      if (!text) {
        showToast('請先輸入客戶資料文字！');
        return;
      }
      await ensureCharsLoaded(text);
      pushUndoState('蓋上手寫客戶資料');

      const hwOptions = {
        text,
        personaId: hwState.personaId,
        color: hwState.color,
        tipSize: hwState.tipSize,
        spacingLevel: hwState.spacingLevel,
        neatnessLevel: hwState.neatnessLevel,
        seed: hwState.seed || (Date.now() % 10000000)
      };

      const hwCanvas = renderHandwritingToCanvas({
        ...hwOptions,
        fontSize: 68
      });

      const firstLine = text.split('\n')[0].trim().slice(0, 14) || '客戶資料';
      const newLayer = createLayerObject({
        type: 'handwriting',
        name: `手寫: ${firstLine}`,
        x: canvasWidth / 2,
        y: canvasHeight / 2,
        width: hwCanvas.width,
        height: hwCanvas.height,
        image: hwCanvas,
        rawImage: hwCanvas
      });
      newLayer.hwOptions = hwOptions;

      layers.push(newLayer);
      setActiveLayer(newLayer);
      showToast(`已蓋上保卡（${HW_CHAR_PERSONAS[hwState.personaId].name}）`);
    });
  }

  // 選取手寫圖層後的二次微調綁定
  if (editHwText) {
    editHwText.addEventListener('input', () => {
      if (!activeLayer || activeLayer.type !== 'handwriting' || !activeLayer.hwOptions) return;
      activeLayer.hwOptions.text = editHwText.value;
      rebuildActiveHandwritingLayer(false);
    });
  }
  if (editHwPersona) {
    editHwPersona.addEventListener('change', () => {
      if (!activeLayer || activeLayer.type !== 'handwriting' || !activeLayer.hwOptions) return;
      activeLayer.hwOptions.personaId = parseInt(editHwPersona.value, 10) || 0;
      rebuildActiveHandwritingLayer(true);
    });
  }
  if (editHwColorPresets) {
    editHwColorPresets.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!activeLayer || activeLayer.type !== 'handwriting' || !activeLayer.hwOptions) return;
        activeLayer.hwOptions.color = btn.dataset.color;
        updateColorButtonSelection(editHwColorPresets, btn.dataset.color);
        rebuildActiveHandwritingLayer(true);
      });
    });
  }
  if (editHwTipGroup) {
    editHwTipGroup.querySelectorAll('.hw-tip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!activeLayer || activeLayer.type !== 'handwriting' || !activeLayer.hwOptions) return;
        activeLayer.hwOptions.tipSize = parseFloat(btn.dataset.tip) || 0.7;
        editHwTipGroup.querySelectorAll('.hw-tip-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        rebuildActiveHandwritingLayer(true);
      });
    });
  }
  if (sliderEditHwSpacing) {
    sliderEditHwSpacing.addEventListener('input', () => {
      if (!activeLayer || activeLayer.type !== 'handwriting' || !activeLayer.hwOptions) return;
      const sp = parseInt(sliderEditHwSpacing.value, 10) || 5;
      activeLayer.hwOptions.spacingLevel = sp;
      if (valEditHwSpacing) valEditHwSpacing.textContent = formatSpacingLabel(sp);
      rebuildActiveHandwritingLayer(false);
    });
    sliderEditHwSpacing.addEventListener('change', () => {
      if (!activeLayer || activeLayer.type !== 'handwriting') return;
      pushUndoState('調整手寫左右字距');
    });
  }
  if (sliderEditHwNeatness) {
    sliderEditHwNeatness.addEventListener('input', () => {
      if (!activeLayer || activeLayer.type !== 'handwriting' || !activeLayer.hwOptions) return;
      const nt = parseInt(sliderEditHwNeatness.value, 10) || 5;
      activeLayer.hwOptions.neatnessLevel = nt;
      if (valEditHwNeatness) valEditHwNeatness.textContent = formatNeatnessLabel(nt);
      rebuildActiveHandwritingLayer(false);
    });
    sliderEditHwNeatness.addEventListener('change', () => {
      if (!activeLayer || activeLayer.type !== 'handwriting') return;
      pushUndoState('微調手寫工整度');
    });
  }
}


// =============================================================================
// 8. 品牌保卡智慧辨識、四角透視自動拉正與日期框避讓蓋章 (v21)
// =============================================================================

function drawCardRectifyOverlay(layer) {
  if (!layer.cardQuadCorners || layer.cardQuadCorners.length !== 4) return;
  const baseImg = layer.croppedImage || layer.rawImage || layer.image;
  if (!baseImg) return;

  const hw = layer.width / 2;
  const hh = layer.height / 2;
  const pts = layer.cardQuadCorners.map(pt => ({
    x: (pt.x / baseImg.width) * layer.width - hw,
    y: (pt.y / baseImg.height) * layer.height - hh
  }));

  ctx.save();
  // 1. 外部半透明遮罩 (evenodd 挖空四邊形內部)
  ctx.beginPath();
  ctx.rect(-hw, -hh, layer.width, layer.height);
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.fill('evenodd');

  // 2. 九宮格透視參考線
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.72)';
  ctx.lineWidth = Math.max(1.5, 2 / currentZoom);
  ctx.setLineDash([6 / currentZoom, 4 / currentZoom]);
  for (let i = 1; i <= 2; i++) {
    const t = i / 3;
    // 水平等分線 (左邊到右邊)
    const lx = pts[0].x + (pts[3].x - pts[0].x) * t;
    const ly = pts[0].y + (pts[3].y - pts[0].y) * t;
    const rx = pts[1].x + (pts[2].x - pts[1].x) * t;
    const ry = pts[1].y + (pts[2].y - pts[1].y) * t;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // 垂直等分線 (上邊到下邊)
    const tx = pts[0].x + (pts[1].x - pts[0].x) * t;
    const ty = pts[0].y + (pts[1].y - pts[0].y) * t;
    const bx = pts[3].x + (pts[2].x - pts[3].x) * t;
    const by = pts[3].y + (pts[2].y - pts[3].y) * t;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // 3. 四邊形主外框 (白底 + 青藍虛線)
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(3, 5 / currentZoom);
  ctx.stroke();
  ctx.strokeStyle = '#003FBC';
  ctx.lineWidth = Math.max(2, 3 / currentZoom);
  ctx.setLineDash([10 / currentZoom, 6 / currentZoom]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. 四個角點可拖曳控制柄
  const cornerLabels = ['左上', '右上', '右下', '左下'];
  const r = Math.max(10, 14 / currentZoom);
  pts.forEach((p, idx) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#06B6D4';
    ctx.fill();
    ctx.lineWidth = Math.max(2, 3 / currentZoom);
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.font = `bold ${Math.max(11, Math.round(13 / currentZoom))}px "Microsoft JhengHei", sans-serif`;
    ctx.fillStyle = '#0F172A';
    const labelOffsetY = idx < 2 ? -(r + 12 / currentZoom) : (r + 16 / currentZoom);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    const tw = ctx.measureText(cornerLabels[idx]).width + 10;
    const th = 20 / currentZoom;
    ctx.fillRect(p.x - tw / 2, p.y + labelOffsetY - th / 2, tw, th);
    ctx.fillStyle = '#003FBC';
    ctx.fillText(cornerLabels[idx], p.x, p.y + labelOffsetY);
  });

  ctx.restore();
}

function updateCardRectifyUI(layer) {
  if (!btnToggleCardRectify || !cardRectifyNotice) return;
  const inMode = !!(layer && layer.type === 'image' && layer.cardRectifyMode);
  btnToggleCardRectify.textContent = inMode ? '取消四角框選' : '📐 四角偵測與拉正';
  if (inMode) {
    btnToggleCardRectify.classList.add('active', 'btn-primary');
    btnToggleCardRectify.classList.remove('btn-outline');
    cardRectifyNotice.classList.remove('hidden');
  } else {
    btnToggleCardRectify.classList.remove('active', 'btn-primary');
    btnToggleCardRectify.classList.add('btn-outline');
    cardRectifyNotice.classList.add('hidden');
  }

  if (cardTemplateBadge) {
    if (layer && layer.cardTemplateId && window.CardTemplates && window.CardTemplates.TEMPLATES[layer.cardTemplateId]) {
      cardTemplateBadge.textContent = window.CardTemplates.TEMPLATES[layer.cardTemplateId].shortLabel;
    } else {
      cardTemplateBadge.textContent = '國際牌雙聯';
    }
  }
}

function setCardSmartStatus(text, isLoading = false) {
  if (!cardSmartStatus) return;
  cardSmartStatus.classList.remove('hidden');
  if (isLoading) {
    cardSmartStatus.classList.add('loading');
  } else {
    cardSmartStatus.classList.remove('loading');
  }
  cardSmartStatus.textContent = text;
}

function getTargetWarrantyImageLayer() {
  if (
    activeLayer &&
    activeLayer.type === 'image' &&
    activeLayer.docRole !== 'receipt' &&
    activeLayer.docRole !== 'order_sheet' &&
    !activeLayer.isReceipt
  ) {
    return activeLayer;
  }
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].type === 'image' && layers[i].docRole === 'warranty_card') return layers[i];
  }
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].type === 'image' && layers[i].isRectifiedCard) return layers[i];
  }
  for (let i = layers.length - 1; i >= 0; i--) {
    if (
      layers[i].type === 'image' &&
      layers[i].docRole !== 'receipt' &&
      layers[i].docRole !== 'order_sheet' &&
      !layers[i].isReceipt
    ) {
      return layers[i];
    }
  }
  return null;
}

function resolveCardTemplate(modeVal) {
  if (!window.CardTemplates) return null;
  if (modeVal && window.CardTemplates.TEMPLATES[modeVal]) {
    return window.CardTemplates.TEMPLATES[modeVal];
  }
  return window.CardTemplates.TEMPLATES.panasonic_slip1;
}

let pillHideTimer = null;
function setCanvasOcrPill(message, variant = 'loading') {
  if (!canvasOcrStatusPill) return;
  if (pillHideTimer) {
    clearTimeout(pillHideTimer);
    pillHideTimer = null;
  }
  if (!message || variant === 'hidden') {
    canvasOcrStatusPill.classList.add('hidden');
    canvasOcrStatusPill.classList.remove('warning', 'success');
    return;
  }
  canvasOcrStatusPill.textContent = message;
  canvasOcrStatusPill.classList.remove('hidden', 'warning', 'success');
  if (variant === 'warning') {
    canvasOcrStatusPill.classList.add('warning');
    pillHideTimer = setTimeout(() => canvasOcrStatusPill.classList.add('hidden'), 9000);
  } else if (variant === 'success') {
    canvasOcrStatusPill.classList.add('success');
    pillHideTimer = setTimeout(() => canvasOcrStatusPill.classList.add('hidden'), 4500);
  }
}

function getOcrErrorDisplayMessage(err) {
  const isFileProtocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
  if (isFileProtocol) {
    return '⚠️ 本機模式 OCR 受限，建議使用線上版或雙擊文字手動編輯';
  }
  return `⚠️ OCR 辨識受限 (${(err && err.message) || '請稍後重試或雙擊文字手動編輯'})`;
}

// 單一序列 OCR 排隊器與共用 Worker（杜絕多 Worker 同時建立互搶崩潰）(v26)
let ocrTaskQueue = Promise.resolve();
function enqueueOcrTask(taskFn) {
  const next = ocrTaskQueue.then(() => taskFn(), () => taskFn());
  ocrTaskQueue = next.catch(() => {});
  return next;
}

let warrantyEngLineWorker = null;
let sharedChiEngWorker = null;

async function getWarrantyLineOcrWorker() {
  if (!window.Tesseract || typeof window.Tesseract.createWorker !== 'function') return null;
  if (warrantyEngLineWorker) return warrantyEngLineWorker;
  const worker = await window.Tesseract.createWorker('eng', 1, { workerBlobURL: false });
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
    tessedit_pageseg_mode: '7'
  });
  warrantyEngLineWorker = worker;
  return warrantyEngLineWorker;
}

async function getSharedChiEngWorker() {
  if (!window.Tesseract || typeof window.Tesseract.createWorker !== 'function') return null;
  if (sharedChiEngWorker) return sharedChiEngWorker;
  sharedChiEngWorker = await window.Tesseract.createWorker('eng+chi_tra', 1, { workerBlobURL: false });
  return sharedChiEngWorker;
}

/**
 * v29: 匯入前高對比灰階預掃描（長邊至少 1280px ＋ 動態對比拉伸），回傳 OCR 文字與 Bounding Box 供 100% 指紋鎖定及邊界外推裁切
 */
async function quickPreScanImageText(img) {
  if (!img || !img.width || !img.height) {
    return { text: '', data: null, scale: 1 };
  }
  const minLongEdge = 1280;
  const maxSide = Math.max(img.width, img.height);
  const scale = Math.min(2.0, minLongEdge / Math.max(1, maxSide));

  let proxyCanvas = null;
  if (window.CardTemplates && typeof window.CardTemplates.createEnhancedOcrCropCanvas === 'function') {
    proxyCanvas = window.CardTemplates.createEnhancedOcrCropCanvas(
      img,
      { x: 0, y: 0, w: 1, h: 1 },
      scale
    );
  } else {
    const pw = Math.max(1, Math.round(img.width * scale));
    const ph = Math.max(1, Math.round(img.height * scale));
    proxyCanvas = document.createElement('canvas');
    proxyCanvas.width = pw;
    proxyCanvas.height = ph;
    proxyCanvas.getContext('2d').drawImage(img, 0, 0, pw, ph);
  }
  const actualScale = proxyCanvas.width / Math.max(1, img.width);

  return enqueueOcrTask(async () => {
    if (!window.Tesseract) return { text: '', data: null, scale: actualScale };
    try {
      let chiEngWorker = null;
      try {
        chiEngWorker = await getSharedChiEngWorker();
      } catch (wErr) {
        console.warn('預掃描共用中英 Worker 初始化受限:', wErr);
      }
      const res = chiEngWorker
        ? await chiEngWorker.recognize(proxyCanvas)
        : await window.Tesseract.recognize(proxyCanvas, 'eng+chi_tra');
      return {
        text: (res && res.data && res.data.text) || '',
        data: (res && res.data) || null,
        scale: actualScale
      };
    } catch (err) {
      console.warn('中英預掃描失敗，嘗試純英數備援預掃描:', err);
      try {
        const engRes = await window.Tesseract.recognize(proxyCanvas, 'eng');
        return {
          text: (engRes && engRes.data && engRes.data.text) || '',
          data: (engRes && engRes.data) || null,
          scale: actualScale
        };
      } catch (err2) {
        console.warn('快速關鍵字預掃描完全受限（將降級為比例與色彩分流）:', err2);
        return { text: '', data: null, scale: actualScale };
      }
    }
  });
}

/**
 * v28: 非空值 OCR 狀態合併保護 — 嚴格隔離發票欄位與保卡欄位，空字串絕不洗掉既有有效結果
 */
function mergeOcrSummaryFields(sourceRole, fields, options = {}) {
  if (!fields || typeof cachedReceiptOcrInfo === 'undefined') return;
  const isValidNonEmpty = val => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed) return false;
    if (trimmed.includes('請確認') || trimmed.includes('XXXX') || trimmed === 'YYYY-MM-DD') return false;
    return true;
  };

  if (sourceRole === 'receipt') {
    if (isValidNonEmpty(fields.date)) cachedReceiptOcrInfo.date = fields.date.trim();
    if (isValidNonEmpty(fields.invoiceNo)) cachedReceiptOcrInfo.invoiceNo = fields.invoiceNo.trim();
    if (typeof fields.sellerTaxId === 'string' && /^\d{8}$/.test(fields.sellerTaxId.trim())) {
      cachedReceiptOcrInfo.sellerTaxId = fields.sellerTaxId.trim();
    }
  } else if (sourceRole === 'warranty_card') {
    if (options && options.forceOverwrite) {
      if (isValidNonEmpty(fields.brand)) cachedReceiptOcrInfo.brand = fields.brand.trim();
      if (typeof fields.model === 'string') {
        cachedReceiptOcrInfo.model = isValidNonEmpty(fields.model) ? fields.model.trim() : '';
      }
      if (typeof fields.serialNo === 'string') {
        cachedReceiptOcrInfo.serialNo = isValidNonEmpty(fields.serialNo) ? fields.serialNo.trim() : '';
      }
    } else {
      if (isValidNonEmpty(fields.brand)) cachedReceiptOcrInfo.brand = fields.brand.trim();
      if (isValidNonEmpty(fields.model)) cachedReceiptOcrInfo.model = fields.model.trim();
      if (isValidNonEmpty(fields.serialNo)) cachedReceiptOcrInfo.serialNo = fields.serialNo.trim();
    }
  }
}

async function runLgCardTargetedOcr(layer, preScanText = '') {
  return enqueueOcrTask(async () => {
    if (!layer || layer.type !== 'image' || !window.CardTemplates) return;
    const srcCanvas = layer.rectifiedCleanCanvas || layer.warpedImage || layer.croppedImage || layer.rawImage || layer.image;
    if (!srcCanvas) return;

    const tpl = resolveCardTemplate('lg_tw');
    if (!tpl) return;

    layer.cardTemplateId = 'lg_tw';
    layer.templateId = 'lg_tw';
    if (cardTemplateBadge) cardTemplateBadge.textContent = tpl.shortLabel;
    setCanvasOcrPill('🔍 正在執行 LG 保卡一維條碼解碼與 3.5x 局部專項辨識...', 'loading');

    if (!window.Tesseract) {
      const msg = getOcrErrorDisplayMessage(new Error('Tesseract 未載入'));
      setCardSmartStatus(msg, false);
      setCanvasOcrPill(msg, 'warning');
      return;
    }

    setCardSmartStatus(`⏳ 已鎖定「${tpl.shortLabel}」，正在解碼條碼並辨識機型／機號...`, true);

    // v51: 進入 LG 專項辨識前先行清空舊全域機號快取，徹底防止舊誤讀（如 010PNNAR657）殘留
    if (typeof cachedReceiptOcrInfo !== 'undefined') {
      cachedReceiptOcrInfo.brand = 'LG';
      cachedReceiptOcrInfo.serialNo = '';
    }

    let worker = null;
    try {
      worker = await getWarrantyLineOcrWorker();
    } catch (wErr) {
      console.warn('Tesseract Eng Worker 初始化受限:', wErr);
    }

    // 偵測「機號」上方一維條碼下緣（限定於條碼帶 y 0.13..0.275 與高密度門檻 0.24，絕不截到下方機號文字頂端）
    const findBarcodeBottomGuardNorm = (canvas, regX0, regX1) => {
      try {
        const cw = canvas.width;
        const ch = canvas.height;
        const rx = Math.max(0, Math.round(cw * regX0));
        const rw = Math.max(20, Math.round(cw * (regX1 - regX0)));
        const ry = Math.max(0, Math.round(ch * 0.13));
        const rh = Math.max(16, Math.round(ch * 0.145));
        const tCan = document.createElement('canvas');
        tCan.width = rw;
        tCan.height = rh;
        const tCtx = tCan.getContext('2d', { willReadFrequently: true });
        tCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);
        const d = tCtx.getImageData(0, 0, rw, rh).data;
        let runStart = -1;
        let lastBarcodeEnd = -1;
        const minRunH = Math.max(6, Math.round(ch * 0.025));
        for (let y = 0; y < rh; y++) {
          let darkCnt = 0;
          for (let x = 0; x < rw; x += 2) {
            const p = (y * rw + x) * 4;
            const lum = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
            if (lum < 115) darkCnt++;
          }
          const frac = (darkCnt * 2) / rw;
          if (frac >= 0.24) {
            if (runStart < 0) runStart = y;
          } else if (runStart >= 0) {
            if (y - runStart >= minRunH) lastBarcodeEnd = y;
            runStart = -1;
          }
        }
        if (runStart >= 0 && rh - runStart >= minRunH) lastBarcodeEnd = rh;
        if (lastBarcodeEnd >= 0) {
          return Math.min(0.280, (ry + lastBarcodeEnd) / ch + 0.005);
        }
      } catch (_) {}
      return null;
    };

    const mapOcrItemsNorm = (ocrData, region, cropCanvas, padPx = 0) => {
      if (!ocrData || !cropCanvas) return [];
      const contentW = Math.max(1, cropCanvas.width - padPx * 2);
      const contentH = Math.max(1, cropCanvas.height - padPx * 2);
      const rawItems = [];
      if (Array.isArray(ocrData.words) && ocrData.words.length > 0) {
        rawItems.push(...ocrData.words);
      } else if (Array.isArray(ocrData.lines)) {
        rawItems.push(...ocrData.lines);
      }
      if (rawItems.length === 0 && Array.isArray(ocrData.blocks)) {
        ocrData.blocks.forEach(blk => {
          (blk.paragraphs || []).forEach(para => {
            (para.lines || []).forEach(ln => {
              if (Array.isArray(ln.words) && ln.words.length > 0) rawItems.push(...ln.words);
              else rawItems.push(ln);
            });
          });
        });
      }
      return rawItems
        .filter(it => it && it.bbox && (it.text || '').trim())
        .map(it => ({
          text: String(it.text || '').trim(),
          x0: region.x + ((it.bbox.x0 - padPx) / contentW) * region.w,
          y0: region.y + ((it.bbox.y0 - padPx) / contentH) * region.h,
          x1: region.x + ((it.bbox.x1 - padPx) / contentW) * region.w,
          y1: region.y + ((it.bbox.y1 - padPx) / contentH) * region.h
        }));
    };

    try {
      let modelClean = '';
      let serialClean = '';
      let serialFromBarcode = false;
      let fallbackRowModel = '';
      let fallbackRowSerial = '';
      let crossVerifiedNote = '';
      let modelLabelBox = null;
      let serialLabelBox = null;

      // 0. 第一段（最高權威）：一維條碼多倍放大（2x / 3x）高對比黑白二值化銳化 ＋ 雙重解碼重試（Code 128 / Code 39）
      const tryDecodeLgUpperBarcodeSerial = async (canvas, rawSrcImg = null) => {
        const specBarcodeReg = { x: 0.56, y: 0.17, w: 0.34, h: 0.15 };
        const defaultBarcodeReg = (tpl.ocrRegions && tpl.ocrRegions.barcodeSerial) || { x: 0.595, y: 0.145, w: 0.370, h: 0.175 };
        const widerBarcodeReg = { x: 0.54, y: 0.10, w: 0.44, h: 0.25 };
        const rawRegs = [specBarcodeReg, defaultBarcodeReg, widerBarcodeReg];
        const candidateCanvases = [];

        const makeHardBinarizedCrop = (srcCan, reg, scale) => {
          const rx = Math.max(0, Math.round(reg.x * srcCan.width));
          const ry = Math.max(0, Math.round(reg.y * srcCan.height));
          const rw = Math.max(20, Math.min(srcCan.width - rx, Math.round(reg.w * srcCan.width)));
          const rh = Math.max(20, Math.min(srcCan.height - ry, Math.round(reg.h * srcCan.height)));
          const outW = Math.round(rw * scale);
          const outH = Math.round(rh * scale);
          const out = document.createElement('canvas');
          out.width = outW;
          out.height = outH;
          const ctx = out.getContext('2d', { willReadFrequently: true });
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(srcCan, rx, ry, rw, rh, 0, 0, outW, outH);
          const imgD = ctx.getImageData(0, 0, outW, outH);
          const d = imgD.data;
          let minL = 255, maxL = 0;
          const lums = new Uint8Array(outW * outH);
          for (let i = 0; i < lums.length; i++) {
            const p = i * 4;
            const l = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
            lums[i] = l;
            if (l < minL) minL = l;
            if (l > maxL) maxL = l;
          }
          const th = Math.round((minL + maxL) * 0.48);
          for (let i = 0; i < lums.length; i++) {
            const v = lums[i] < th ? 0 : 255;
            const p = i * 4;
            d[p] = v; d[p + 1] = v; d[p + 2] = v; d[p + 3] = 255;
          }
          ctx.putImageData(imgD, 0, 0);
          return out;
        };

        rawRegs.forEach(reg => {
          const rx = Math.max(0, Math.round(reg.x * canvas.width));
          const ry = Math.max(0, Math.round(reg.y * canvas.height));
          const rw = Math.max(20, Math.min(canvas.width - rx, Math.round(reg.w * canvas.width)));
          const rh = Math.max(20, Math.min(canvas.height - ry, Math.round(reg.h * canvas.height)));

          const native1x = document.createElement('canvas');
          native1x.width = rw;
          native1x.height = rh;
          native1x.getContext('2d', { willReadFrequently: true }).drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);
          candidateCanvases.push(native1x);

          // 2x 與 3x 黑白高對比二值化銳化畫布
          candidateCanvases.push(makeHardBinarizedCrop(canvas, reg, 2.0));
          candidateCanvases.push(makeHardBinarizedCrop(canvas, reg, 3.0));

          if (window.CardTemplates.createAdaptiveBinarizedOcrCropCanvas) {
            candidateCanvases.push(
              window.CardTemplates.createAdaptiveBinarizedOcrCropCanvas(canvas, reg, 2.0, {
                despeckle: false,
                stripDottedUnderline: false,
                stripBottomDotBand: false
              })
            );
            candidateCanvases.push(
              window.CardTemplates.createAdaptiveBinarizedOcrCropCanvas(canvas, reg, 3.0, {
                despeckle: false,
                stripDottedUnderline: false,
                stripBottomDotBand: false
              })
            );
          }

          if (window.CardTemplates.createEnhancedOcrCropCanvas) {
            candidateCanvases.push(window.CardTemplates.createEnhancedOcrCropCanvas(canvas, reg, 2.0));
          }
        });
        candidateCanvases.push(canvas);
        if (rawSrcImg && rawSrcImg !== canvas) {
          candidateCanvases.push(rawSrcImg);
        }

        const acceptBarcodeCandidate = rawVal => {
          const txt = String(rawVal || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (!txt || /^MBM\d+/.test(txt) || /^REV/.test(txt) || txt.length < 9 || txt.length > 15) return '';
          if (/^\d{3}[A-Z]{6}\d{3}$/.test(txt)) return txt;
          if (/^\d{3}[A-Z0-9]{6,11}$/.test(txt) && (txt.match(/\d/g) || []).length >= 5) return txt;
          if (window.CardTemplates.filterLgSerialResult) {
            return window.CardTemplates.filterLgSerialResult(txt);
          }
          return '';
        };

        if (typeof window.BarcodeDetector === 'function') {
          try {
            const detector = new window.BarcodeDetector({ formats: ['code_128', 'code_39'] });
            for (let i = 0; i < candidateCanvases.length; i++) {
              const detected = await detector.detect(candidateCanvases[i]);
              if (Array.isArray(detected)) {
                for (let j = 0; j < detected.length; j++) {
                  const hit = acceptBarcodeCandidate(detected[j] && detected[j].rawValue);
                  if (hit) return hit;
                }
              }
            }
          } catch (bdErr) {
            console.warn('原生 BarcodeDetector 條碼解碼略過，切換純 JS Code 128:', bdErr);
          }
        }

        if (window.CardTemplates && typeof window.CardTemplates.decodeCode128FromCanvas === 'function') {
          for (let i = 0; i < candidateCanvases.length; i++) {
            const c = candidateCanvases[i];
            if (!c || !c.width || !c.height || typeof c.getContext !== 'function') continue;
            const jsDecoded = window.CardTemplates.decodeCode128FromCanvas(c);
            const hit = acceptBarcodeCandidate(jsDecoded);
            if (hit) return hit;
          }
        }
        return '';
      };

      const barcodeHitSerial = await tryDecodeLgUpperBarcodeSerial(srcCanvas, layer.rawSourceImg || layer.rawImage);
      if (barcodeHitSerial) {
        serialClean = barcodeHitSerial;
        serialFromBarcode = true;
      }

      let chiEngWorker = null;
      try {
        chiEngWorker = await getSharedChiEngWorker();
      } catch (wErr2) {
        console.warn('共用中英 Worker 初始化受限:', wErr2);
      }

      // 1. 掃描上方基本資料列取得「機型」「機號」標籤座標與備援文字
      const topRegion = (tpl.ocrRegions && tpl.ocrRegions.topFormBlock)
        ? tpl.ocrRegions.topFormBlock
        : { x: 0.05, y: 0.25, w: 0.90, h: 0.14 };

      if (window.CardTemplates.createEnhancedOcrCropCanvas) {
        const topRowCrop = window.CardTemplates.createEnhancedOcrCropCanvas(srcCanvas, topRegion, 2.2);
        let topRowRes = null;
        try {
          if (chiEngWorker) {
            await chiEngWorker.setParameters({ tessedit_pageseg_mode: '6' });
            try {
              topRowRes = await chiEngWorker.recognize(topRowCrop);
            } finally {
              await chiEngWorker.setParameters({ tessedit_pageseg_mode: '3' }).catch(() => {});
            }
          } else {
            topRowRes = await window.Tesseract.recognize(topRowCrop, 'eng+chi_tra');
          }
        } catch (blkErr) {
          console.warn('LG 上方資料列雙語 OCR 失敗:', blkErr);
        }

        const topRowText = (topRowRes && topRowRes.data && topRowRes.data.text) || '';
        if (topRowText && window.CardTemplates.parseLgTopFormRow) {
          const parsedRow = window.CardTemplates.parseLgTopFormRow(topRowText);
          fallbackRowModel = parsedRow.model || '';
          fallbackRowSerial = parsedRow.serialNo || '';
        }

        const topItems = mapOcrItemsNorm(topRowRes && topRowRes.data, topRegion, topRowCrop, 0);
        for (let i = 0; i < topItems.length; i++) {
          const item = topItems[i];
          const compact = item.text.replace(/\s+/g, '');
          if (!modelLabelBox && item.x0 >= 0.28 && item.x1 <= 0.56 && (/機型|MODEL/i.test(compact) || compact === '型')) {
            modelLabelBox = item;
          }
          if (!serialLabelBox && item.x0 >= 0.50 && item.x1 <= 0.80 && (/機號|SERIAL/i.test(compact) || compact === '號')) {
            serialLabelBox = item;
          }
        }
      }

      // 2. 第二段：鎖定「機號」文字區塊 4.0x 超清放大 ＋ 形態學去噪 ＋ 由下而上切除虛點底線 ＋ 純英數單行白名單 OCR
      const cropFn = window.CardTemplates.createAdaptiveBinarizedOcrCropCanvas || window.CardTemplates.createEnhancedOcrCropCanvas;
      if (cropFn) {
        const defaultModelReg = (tpl.ocrRegions && tpl.ocrRegions.model) || { x: 0.415, y: 0.285, w: 0.220, h: 0.095 };
        const defaultSerialReg = (tpl.ocrRegions && tpl.ocrRegions.serial) || { x: 0.675, y: 0.285, w: 0.265, h: 0.095 };

        const modelRoi = modelLabelBox
          ? (() => {
              const rx = Math.max(0.35, modelLabelBox.x1 - 0.004);
              const rxEnd = serialLabelBox
                ? Math.max(rx + 0.14, serialLabelBox.x0 - 0.008)
                : Math.min(0.68, rx + 0.23);
              const ry = Math.max(0.22, modelLabelBox.y0 - 0.025);
              const rh = Math.min(0.105, Math.max(0.062, (modelLabelBox.y1 - modelLabelBox.y0) + 0.040));
              return { x: rx, y: ry, w: Math.max(0.14, rxEnd - rx), h: rh };
            })()
          : defaultModelReg;

        const barcodeGuardTop = findBarcodeBottomGuardNorm(srcCanvas, 0.56, 0.94);
        const safeSerialAnchor = (serialLabelBox && serialLabelBox.x1 <= 0.72) ? serialLabelBox : null;
        const serialRoi = safeSerialAnchor
          ? (() => {
              const rx = Math.max(0.62, safeSerialAnchor.x1 - 0.004);
              const rw = Math.max(0.18, Math.min(0.975 - rx, 0.30));
              const rawY = Math.max(0.22, safeSerialAnchor.y0 - 0.032);
              const guardSafe = (barcodeGuardTop && barcodeGuardTop <= safeSerialAnchor.y0 - 0.020)
                ? barcodeGuardTop
                : rawY;
              const ry = Math.max(rawY, guardSafe);
              const rh = Math.min(0.105, Math.max(0.064, safeSerialAnchor.y1 + 0.015 - ry));
              return { x: rx, y: ry, w: rw, h: rh };
            })()
          : (() => {
              const ry = barcodeGuardTop ? Math.max(0.275, barcodeGuardTop) : 0.280;
              const rh = Math.max(0.070, 0.380 - ry);
              return { x: defaultSerialReg.x, y: ry, w: defaultSerialReg.w, h: rh };
            })();

        // 指定精準雙組「機號」ROI：錨點右側裁切 ＋ 使用者規範座標 x:58%~92%, y:28%~38%
        const directSerialRoi = (() => {
          const ry = barcodeGuardTop ? Math.max(0.280, barcodeGuardTop) : 0.280;
          const rh = Math.max(0.068, 0.380 - ry);
          return { x: 0.580, y: ry, w: 0.320, h: rh };
        })();

        const modelCrop = cropFn(srcCanvas, modelRoi, 3.5, { despeckle: true, stripDottedUnderline: true, stripBottomDotBand: true });

        let rawModel = '';
        if (worker) {
          await worker.setParameters({
            tessedit_pageseg_mode: '7',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
          });
          const mRes = await worker.recognize(modelCrop);
          rawModel = (mRes && mRes.data && mRes.data.text) || '';
        } else {
          const mRes = await window.Tesseract.recognize(modelCrop, 'eng');
          rawModel = (mRes && mRes.data && mRes.data.text) || '';
        }
        if (rawModel && window.CardTemplates.filterLgModelResult) {
          modelClean = window.CardTemplates.filterLgModelResult(rawModel);
        }

        if (!serialFromBarcode) {
          const tightRightSerialRoi = (() => {
            const ry = barcodeGuardTop ? Math.max(0.268, barcodeGuardTop) : 0.268;
            const rh = Math.max(0.068, 0.365 - ry);
            return { x: 0.645, y: ry, w: 0.275, h: rh };
          })();
          const serialRois = [serialRoi, tightRightSerialRoi, directSerialRoi];
          const serialCandidates = [];
          for (let rIdx = 0; rIdx < serialRois.length; rIdx++) {
            const sCrop = cropFn(srcCanvas, serialRois[rIdx], 4.0, {
              despeckle: true,
              stripDottedUnderline: true,
              stripBottomDotBand: true
            });
            const psmList = rIdx === 0 ? ['7'] : ['7', '8'];
            for (let pIdx = 0; pIdx < psmList.length; pIdx++) {
              let rawSerial = '';
              if (worker) {
                await worker.setParameters({
                  tessedit_pageseg_mode: psmList[pIdx],
                  tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                });
                const sRes = await worker.recognize(sCrop);
                rawSerial = (sRes && sRes.data && sRes.data.text) || '';
              } else {
                const sRes = await window.Tesseract.recognize(sCrop, 'eng');
                rawSerial = (sRes && sRes.data && sRes.data.text) || '';
              }
              if (rawSerial && window.CardTemplates.filterLgSerialResult) {
                const parsed = window.CardTemplates.filterLgSerialResult(rawSerial);
                if (parsed) {
                  serialCandidates.push(parsed);
                  if (/^\d{3}[A-Z]{6}\d{3}$/.test(parsed)) {
                    serialClean = parsed;
                    break;
                  }
                }
              }
            }
            if (serialClean) break;
          }
          if (!serialClean && serialCandidates.length > 0) {
            serialClean = serialCandidates.find(c => c.length === 12) || serialCandidates[0];
          }
          // 恢復預設白名單（保留 '-' 供後續其他模板使用）
          if (worker) {
            await worker.setParameters({
              tessedit_pageseg_mode: '7',
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
            }).catch(() => {});
          }
        }
      }

      if (!modelClean && fallbackRowModel) modelClean = fallbackRowModel;
      if (!serialClean && fallbackRowSerial) serialClean = fallbackRowSerial;

      if ((!modelClean || !serialClean) && preScanText && window.CardTemplates.parseLgTopFormRow) {
        const fallbackParsed = window.CardTemplates.parseLgTopFormRow(preScanText);
        if (!modelClean && fallbackParsed.model) modelClean = fallbackParsed.model;
        if (!serialClean && fallbackParsed.serialNo) serialClean = fallbackParsed.serialNo;
      }

      // 3. 偵測右側「經銷商店章」印刷文字幾何位置作為雙地標同軸錨點
      if (tpl.ocrRegions && tpl.ocrRegions.dealerAndQrBlock && window.CardTemplates.createEnhancedOcrCropCanvas && chiEngWorker) {
        try {
          const dRegion = tpl.ocrRegions.dealerAndQrBlock;
          const dCrop = window.CardTemplates.createEnhancedOcrCropCanvas(srcCanvas, dRegion, 2.0);
          await chiEngWorker.setParameters({ tessedit_pageseg_mode: '6' });
          let dRes = null;
          try {
            dRes = await chiEngWorker.recognize(dCrop);
          } finally {
            await chiEngWorker.setParameters({ tessedit_pageseg_mode: '3' }).catch(() => {});
          }
          if (dRes && dRes.data) {
            const dLines = Array.isArray(dRes.data.lines) ? dRes.data.lines : [];
            const dWords = Array.isArray(dRes.data.words) ? dRes.data.words : [];
            const dItems = [
              ...mapOcrItemsNorm({ lines: dLines }, dRegion, dCrop, 0),
              ...mapOcrItemsNorm({ words: dWords }, dRegion, dCrop, 0)
            ];
            const dealerBox = dItems.find(it => {
              const t = it.text.replace(/\s+/g, '');
              return /經銷商店章|經銷商|店章/.test(t) && it.y0 >= 0.48 && it.y1 <= 0.78 && it.x0 >= 0.58;
            });
            if (dealerBox) {
              layer._lgDealerOcrAnchor = {
                centerX: (dealerBox.x0 + dealerBox.x1) * 0.5,
                topY: dealerBox.y0,
                bottomY: dealerBox.y1,
                width: dealerBox.x1 - dealerBox.x0
              };
            }
          }
        } catch (anchorErr) {
          console.warn('LG 經銷商店章文字錨點偵測略過:', anchorErr);
        }
      }

      if (
        modelClean &&
        Array.isArray(cachedOrderItemModels) &&
        cachedOrderItemModels.length > 0 &&
        window.CardTemplates.crossVerifyModelWithOrderSheet
      ) {
        const cv = window.CardTemplates.crossVerifyModelWithOrderSheet(modelClean, cachedOrderItemModels, 'LG');
        if (cv && cv.corrected && cv.model) {
          crossVerifiedNote = `（已依訂購單交叉校正：${modelClean} ➔ ${cv.model}）`;
          modelClean = cv.model;
        } else if (cv && cv.similarity >= 0.65 && cv.model === modelClean) {
          crossVerifiedNote = '（已與訂購單 100% 核對無誤）';
        }
      }

      // 關鍵修正（v49/v50）：無條件強制寫回 layer.ocrData / 專項輸入與全域快取，禁止舊全域 OCR 覆蓋條碼／局部結果
      if (inputCardModel) inputCardModel.value = modelClean || '';
      if (inputCardSerial) inputCardSerial.value = serialClean || '';
      layer._lgVerifiedModel = modelClean || '';
      layer._lgVerifiedSerial = serialClean || '';
      layer.ocrData = {
        brand: 'LG',
        model: modelClean || '',
        serial: serialClean || '',
        serialFromBarcode: !!serialFromBarcode,
        updatedAt: Date.now()
      };

      mergeOcrSummaryFields('warranty_card', {
        brand: 'LG',
        model: modelClean,
        serialNo: serialClean
      }, { forceOverwrite: true });

      if (typeof syncSummaryTextLayer === 'function') {
        syncSummaryTextLayer(true);
      }

      const serialSrcLabel = serialFromBarcode ? '【條碼直讀】' : '';
      setCardSmartStatus(
        `✅ 辨識完成（${tpl.shortLabel}）${crossVerifiedNote}\n機型：${modelClean || '未讀出'} ｜ 機號${serialSrcLabel}：${serialClean || '未讀出'}`,
        false
      );
      setCanvasOcrPill(`✅ LG 保卡辨識完成：${modelClean || '-'} / ${serialClean || '-'}`, 'success');
      showToast(`LG 保卡辨識完成${serialSrcLabel}：${modelClean || '-'} / ${serialClean || '-'}`);
    } catch (err) {
      console.error('LG 保卡 OCR 失敗:', err);
      const errMsg = getOcrErrorDisplayMessage(err);
      setCardSmartStatus(errMsg, false);
      setCanvasOcrPill(errMsg, 'warning');
      showToast(errMsg);
    }
  });
}

async function runMitsubishiCardTargetedOcr(layer, preScanText = '') {
  return enqueueOcrTask(async () => {
    if (!layer || layer.type !== 'image' || !window.CardTemplates) return;
    const srcCanvas = layer.rectifiedCleanCanvas || layer.warpedImage || layer.croppedImage || layer.rawImage || layer.image;
    if (!srcCanvas) return;

    const tpl = resolveCardTemplate('mitsubishi_tw');
    if (!tpl) return;

    layer.cardTemplateId = 'mitsubishi_tw';
    layer.templateId = 'mitsubishi_tw';
    if (cardTemplateBadge) cardTemplateBadge.textContent = tpl.shortLabel;
    setCanvasOcrPill('🔍 正在辨識台灣三菱電機保證書之機型／製造號碼與經銷商錨點...', 'loading');

    if (!window.Tesseract) {
      const msg = getOcrErrorDisplayMessage(new Error('Tesseract 未載入'));
      setCardSmartStatus(msg, false);
      setCanvasOcrPill(msg, 'warning');
      return;
    }

    setCardSmartStatus(`⏳ 已鎖定「${tpl.shortLabel}」，正在辨識機型與製造號碼...`, true);

    if (typeof cachedReceiptOcrInfo !== 'undefined') {
      cachedReceiptOcrInfo.brand = '三菱';
      cachedReceiptOcrInfo.model = '';
      cachedReceiptOcrInfo.serialNo = '';
    }

    let worker = null;
    try {
      worker = await getWarrantyLineOcrWorker();
    } catch (wErr) {
      console.warn('Tesseract Eng Worker 初始化受限:', wErr);
    }

    const mapOcrItemsNorm = (ocrData, region, cropCanvas, padPx = 0) => {
      if (!ocrData || !cropCanvas) return [];
      const contentW = Math.max(1, cropCanvas.width - padPx * 2);
      const contentH = Math.max(1, cropCanvas.height - padPx * 2);
      const rawItems = [];
      if (Array.isArray(ocrData.words) && ocrData.words.length > 0) {
        rawItems.push(...ocrData.words);
      } else if (Array.isArray(ocrData.lines)) {
        rawItems.push(...ocrData.lines);
      }
      if (rawItems.length === 0 && Array.isArray(ocrData.blocks)) {
        ocrData.blocks.forEach(blk => {
          (blk.paragraphs || []).forEach(para => {
            (para.lines || []).forEach(ln => {
              if (Array.isArray(ln.words) && ln.words.length > 0) rawItems.push(...ln.words);
              else rawItems.push(ln);
            });
          });
        });
      }
      return rawItems
        .filter(it => it && it.bbox && (it.text || '').trim())
        .map(it => ({
          text: String(it.text || '').trim(),
          x0: region.x + ((it.bbox.x0 - padPx) / contentW) * region.w,
          y0: region.y + ((it.bbox.y0 - padPx) / contentH) * region.h,
          x1: region.x + ((it.bbox.x1 - padPx) / contentW) * region.w,
          y1: region.y + ((it.bbox.y1 - padPx) / contentH) * region.h
        }));
    };

    try {
      let modelClean = '';
      let serialClean = '';
      let fallbackRowModel = '';
      let fallbackRowSerial = '';
      let crossVerifiedNote = '';
      let modelLabelBox = null;
      let serialLabelBox = null;

      let chiEngWorker = null;
      try {
        chiEngWorker = await getSharedChiEngWorker();
      } catch (wErr2) {
        console.warn('共用中英 Worker 初始化受限:', wErr2);
      }

      // 1. 掃描上方「機型」與「製造號碼」欄位區塊取得文字錨點與備援文字
      const topRegion = (tpl.ocrRegions && tpl.ocrRegions.topFormBlock)
        ? tpl.ocrRegions.topFormBlock
        : { x: 0.025, y: 0.125, w: 0.620, h: 0.130 };

      if (window.CardTemplates.createEnhancedOcrCropCanvas) {
        const topCrop = window.CardTemplates.createEnhancedOcrCropCanvas(srcCanvas, topRegion, 2.2);
        let topRes = null;
        try {
          if (chiEngWorker) {
            await chiEngWorker.setParameters({ tessedit_pageseg_mode: '6' });
            try {
              topRes = await chiEngWorker.recognize(topCrop);
            } finally {
              await chiEngWorker.setParameters({ tessedit_pageseg_mode: '3' }).catch(() => {});
            }
          } else {
            topRes = await window.Tesseract.recognize(topCrop, 'eng+chi_tra');
          }
        } catch (blkErr) {
          console.warn('三菱上方資料列雙語 OCR 失敗:', blkErr);
        }

        const topText = (topRes && topRes.data && topRes.data.text) || '';
        if (topText && window.CardTemplates.parseMitsubishiTopFormRow) {
          const parsedRow = window.CardTemplates.parseMitsubishiTopFormRow(topText);
          fallbackRowModel = parsedRow.model || '';
          fallbackRowSerial = parsedRow.serialNo || '';
        }

        const topItems = mapOcrItemsNorm(topRes && topRes.data, topRegion, topCrop, 0);
        for (let i = 0; i < topItems.length; i++) {
          const item = topItems[i];
          const compact = item.text.replace(/\s+/g, '');
          if (!modelLabelBox && item.x0 <= 0.16 && item.x1 <= 0.22 && (/機型|MODEL/i.test(compact) || compact === '型')) {
            modelLabelBox = item;
          }
          if (!serialLabelBox && item.x0 >= 0.22 && item.x1 <= 0.42 && (/製造號碼|製造|號碼|SERIAL/i.test(compact) || compact === '碼')) {
            serialLabelBox = item;
          }
        }
      }

      // 2. 局部單行專項辨識（v59 安全輕量版：機型避開「機型：」與黑框線，取純英數視窗 11.5%~24.0% / 15.8%~21.5% 放大 3.5x，全程 try/catch 保護）
      const cropFn = window.CardTemplates.createAdaptiveBinarizedOcrCropCanvas || window.CardTemplates.createEnhancedOcrCropCanvas;
      if (cropFn) {
        try {
          const defaultModelReg = { x: 0.115, y: 0.158, w: 0.125, h: 0.057 };
          const defaultSerialReg = (tpl.ocrRegions && tpl.ocrRegions.serial) || { x: 0.340, y: 0.140, w: 0.195, h: 0.095 };

          const anchorModelRoi = (modelLabelBox && modelLabelBox.x1 <= 0.16)
            ? (() => {
                const rx = Math.max(0.112, Math.min(0.135, modelLabelBox.x1 + 0.004));
                const rxEnd = serialLabelBox
                  ? Math.max(rx + 0.105, Math.min(0.244, serialLabelBox.x0 - 0.012))
                  : 0.240;
                const ry = Math.max(0.152, Math.min(0.172, modelLabelBox.y0 - 0.006));
                const rh = Math.max(0.046, Math.min(0.068, (modelLabelBox.y1 - modelLabelBox.y0) + 0.014));
                return { x: rx, y: ry, w: Math.max(0.105, rxEnd - rx), h: rh };
              })()
            : null;

          const anchorSerialRoi = (serialLabelBox && serialLabelBox.x1 <= 0.42)
            ? (() => {
                const rx = Math.max(0.295, serialLabelBox.x1 - 0.004);
                const rw = Math.max(0.13, Math.min(0.58 - rx, 0.21));
                const ry = Math.max(0.115, serialLabelBox.y0 - 0.018);
                const rh = Math.min(0.105, Math.max(0.060, (serialLabelBox.y1 - serialLabelBox.y0) + 0.036));
                return { x: rx, y: ry, w: rw, h: rh };
              })()
            : null;

          const modelRois = anchorModelRoi ? [anchorModelRoi, defaultModelReg] : [defaultModelReg];
          let bestModelScore = 0;
          for (let i = 0; i < modelRois.length; i++) {
            try {
              const mCrop = cropFn(srcCanvas, modelRois[i], 3.5, {
                despeckle: true,
                stripDottedUnderline: true,
                stripBottomDotBand: false
              });
              let rawM = '';
              if (worker) {
                await worker.setParameters({
                  tessedit_pageseg_mode: '7',
                  tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
                });
                const mRes = await worker.recognize(mCrop);
                rawM = (mRes && mRes.data && mRes.data.text) || '';
              } else {
                const mRes = await window.Tesseract.recognize(mCrop, 'eng');
                rawM = (mRes && mRes.data && mRes.data.text) || '';
              }
              if (rawM && window.CardTemplates.filterMitsubishiModelResult) {
                const parsedM = window.CardTemplates.filterMitsubishiModelResult(rawM);
                if (parsedM) {
                  const sc = /^(?:MR|MJ|MSZ|MUZ)-[A-Z]{1,3}\d{2,3}/.test(parsedM) ? 100 : parsedM.length;
                  if (sc > bestModelScore) {
                    bestModelScore = sc;
                    modelClean = parsedM;
                  }
                  if (sc >= 100) break;
                }
              }
            } catch (mErr) {
              console.warn('三菱機型局部 OCR 單次重試略過:', mErr);
            }
          }

          const serialRois = anchorSerialRoi ? [anchorSerialRoi, defaultSerialReg] : [defaultSerialReg];
          for (let i = 0; i < serialRois.length; i++) {
            try {
              const sCrop = cropFn(srcCanvas, serialRois[i], 3.0, {
                despeckle: true,
                stripDottedUnderline: true,
                stripBottomDotBand: false
              });
              let rawS = '';
              if (worker) {
                await worker.setParameters({
                  tessedit_pageseg_mode: '7',
                  tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                });
                const sRes = await worker.recognize(sCrop);
                rawS = (sRes && sRes.data && sRes.data.text) || '';
              } else {
                const sRes = await window.Tesseract.recognize(sCrop, 'eng');
                rawS = (sRes && sRes.data && sRes.data.text) || '';
              }
              if (rawS && window.CardTemplates.filterMitsubishiSerialResult) {
                const parsedS = window.CardTemplates.filterMitsubishiSerialResult(rawS);
                if (parsedS) {
                  serialClean = parsedS;
                  break;
                }
              }
            } catch (sErr) {
              console.warn('三菱製造號碼局部 OCR 單次重試略過:', sErr);
            }
          }

          if (worker) {
            await worker.setParameters({
              tessedit_pageseg_mode: '7',
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
            }).catch(() => {});
          }
        } catch (localOcrErr) {
          console.warn('三菱局部字元 OCR 流程略過，保留上方列備援文字:', localOcrErr);
        }
      }

      if (!modelClean && fallbackRowModel) modelClean = fallbackRowModel;
      if (!serialClean && fallbackRowSerial) serialClean = fallbackRowSerial;

      if ((!modelClean || !serialClean) && preScanText && window.CardTemplates.parseMitsubishiTopFormRow) {
        const fallbackParsed = window.CardTemplates.parseMitsubishiTopFormRow(preScanText);
        if (!modelClean && fallbackParsed.model) modelClean = fallbackParsed.model;
        if (!serialClean && fallbackParsed.serialNo) serialClean = fallbackParsed.serialNo;
      }

      // 3. 偵測左下「三菱電機經銷商 / 購買日期 / 電話 / 本欄請蓋店章」文字錨點以輔助 6 紅框十字蓋章對位
      if (tpl.ocrRegions && tpl.ocrRegions.dealerStampZone && window.CardTemplates.createEnhancedOcrCropCanvas && chiEngWorker) {
        try {
          const zRegion = tpl.ocrRegions.dealerStampZone;
          const zCrop = window.CardTemplates.createEnhancedOcrCropCanvas(srcCanvas, zRegion, 2.0);
          await chiEngWorker.setParameters({ tessedit_pageseg_mode: '6' });
          let zRes = null;
          try {
            zRes = await chiEngWorker.recognize(zCrop);
          } finally {
            await chiEngWorker.setParameters({ tessedit_pageseg_mode: '3' }).catch(() => {});
          }
          if (zRes && zRes.data) {
            const zLines = Array.isArray(zRes.data.lines) ? zRes.data.lines : [];
            const zWords = Array.isArray(zRes.data.words) ? zRes.data.words : [];
            const zItems = [
              ...mapOcrItemsNorm({ lines: zLines }, zRegion, zCrop, 0),
              ...mapOcrItemsNorm({ words: zWords }, zRegion, zCrop, 0)
            ];

            const dealerAnchor = zItems.find(it => {
              const t = it.text.replace(/\s+/g, '');
              return /三菱電機經銷商|電機經銷商|經銷商/.test(t) && it.x0 <= 0.16 && it.x1 <= 0.22 && it.y0 >= 0.56 && it.y1 <= 0.72;
            });
            const purchaseAnchor = zItems.find(it => {
              const t = it.text.replace(/\s+/g, '');
              return /購買日期|購買/.test(t) && it.y0 >= 0.52 && it.y1 <= 0.66;
            });
            const phoneAnchor = zItems.find(it => {
              const t = it.text.replace(/\s+/g, '');
              return /電話|話[:：]?/.test(t) && it.x0 <= 0.12 && it.y0 >= 0.66 && it.y1 <= 0.82;
            });
            const rightPromptAnchor = zItems.find(it => {
              const t = it.text.replace(/\s+/g, '');
              return /本欄請蓋店章|請蓋店章|店章/.test(t) && it.x0 >= 0.31 && it.y0 >= 0.64;
            });

            layer._mitsubishiDealerOcrAnchors = {
              dealerRightX: dealerAnchor ? dealerAnchor.x1 : null,
              purchaseBottomY: purchaseAnchor ? purchaseAnchor.y1 : null,
              phoneCenterY: phoneAnchor ? ((phoneAnchor.y0 + phoneAnchor.y1) * 0.5) : null,
              rightStampPromptLeftX: rightPromptAnchor ? rightPromptAnchor.x0 : null
            };
          }
        } catch (anchorErr) {
          console.warn('三菱左下經銷商文字錨點偵測略過:', anchorErr);
        }
      }

      // 4. 訂購單品名型號交叉比對校正（含 try/catch 保護，優先採用訂購單標準三菱型號）
      try {
        if (Array.isArray(cachedOrderItemModels) && cachedOrderItemModels.length > 0) {
          if (modelClean && window.CardTemplates.crossVerifyModelWithOrderSheet) {
            const cv = window.CardTemplates.crossVerifyModelWithOrderSheet(modelClean, cachedOrderItemModels, 'MITSUBISHI');
            if (cv && cv.corrected && cv.model) {
              crossVerifiedNote = `（已依訂購單交叉校正：${modelClean} ➔ ${cv.model}）`;
              modelClean = cv.model;
            } else if (cv && cv.similarity >= 0.65 && cv.model === modelClean) {
              crossVerifiedNote = '（已與訂購單 100% 核對無誤）';
            }
          }
          if (!crossVerifiedNote) {
            const mitsuPool = cachedOrderItemModels.filter(item =>
              item && item.model && (
                (item.brand && item.brand.toUpperCase().includes('MITSUBISHI')) ||
                /^(?:MR|MJ|MSZ|MUZ)-/i.test(item.model.trim())
              )
            );
            if (mitsuPool.length > 0) {
              const normClean = (modelClean || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
              const digitsMatch = normClean.match(/\d{2,3}/);
              let picked = null;
              if (normClean) {
                picked = mitsuPool.find(item => {
                  const stdNorm = item.model.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  return stdNorm.includes(normClean) || normClean.includes(stdNorm) ||
                    (digitsMatch && stdNorm.includes(digitsMatch[0]) && mitsuPool.length === 1);
                });
              } else if (mitsuPool.length === 1) {
                picked = mitsuPool[0];
              }
              if (picked && picked.model) {
                const stdM = picked.model.toUpperCase().trim();
                crossVerifiedNote = modelClean
                  ? `（已依訂購單比對校正：${modelClean} ➔ ${stdM}）`
                  : `（已優先採用訂購單三菱型號：${stdM}）`;
                modelClean = stdM;
              }
            }
          }
        }
      } catch (cvErr) {
        console.warn('三菱訂購單交叉比對略過:', cvErr);
      }

      // 5. 強制無條件寫回專項結果（禁止舊全域 OCR 覆蓋），並即時帶入左下 5 行大字（三菱）
      if (inputCardModel) inputCardModel.value = modelClean || '';
      if (inputCardSerial) inputCardSerial.value = serialClean || '';
      layer._mitsubishiVerifiedModel = modelClean || '';
      layer._mitsubishiVerifiedSerial = serialClean || '';
      layer.ocrData = {
        brand: '三菱',
        model: modelClean || '',
        serial: serialClean || '',
        updatedAt: Date.now()
      };

      mergeOcrSummaryFields('warranty_card', {
        brand: '三菱',
        model: modelClean,
        serialNo: serialClean
      }, { forceOverwrite: true });

      if (typeof syncSummaryTextLayer === 'function') {
        syncSummaryTextLayer(true);
      }

      setCardSmartStatus(
        `✅ 辨識完成（${tpl.shortLabel}）${crossVerifiedNote}\n機型：${modelClean || '未讀出'} ｜ 製造號碼：${serialClean || '未讀出'}`,
        false
      );
      setCanvasOcrPill(`✅ 三菱保卡辨識完成：${modelClean || '-'} / ${serialClean || '-'}`, 'success');
      showToast(`三菱保卡辨識完成：${modelClean || '-'} / ${serialClean || '-'}`);
    } catch (err) {
      console.error('三菱保卡 OCR 失敗:', err);
      const errMsg = getOcrErrorDisplayMessage(err);
      setCardSmartStatus(errMsg, false);
      setCanvasOcrPill(errMsg, 'warning');
      showToast(errMsg);
    }
  });
}

async function runCardTargetedOcr(layer) {
  if (layer && (layer.cardTemplateId === 'lg_tw' || (selectCardTemplateMode && selectCardTemplateMode.value === 'lg_tw'))) {
    return runLgCardTargetedOcr(layer);
  }
  if (layer && (layer.cardTemplateId === 'mitsubishi_tw' || (selectCardTemplateMode && selectCardTemplateMode.value === 'mitsubishi_tw'))) {
    return runMitsubishiCardTargetedOcr(layer);
  }
  return enqueueOcrTask(async () => {
    if (!layer || layer.type !== 'image' || !window.CardTemplates) return;
    const srcCanvas = layer.rectifiedCleanCanvas || layer.warpedImage || layer.croppedImage || layer.rawImage || layer.image;
    if (!srcCanvas) return;

    const modeVal = selectCardTemplateMode ? selectCardTemplateMode.value : 'auto';
    let templateId = modeVal;
    let detectReason = '手動指定';

    setCanvasOcrPill('🔍 正在辨識保卡聯別與機種／機號...', 'loading');

    let worker = null;
    try {
      worker = await getWarrantyLineOcrWorker();
    } catch (wErr) {
      console.warn('Tesseract Worker 初始化受限:', wErr);
    }

    if (modeVal === 'auto' || !window.CardTemplates.TEMPLATES[modeVal]) {
      setCardSmartStatus('⏳ 正在自動判別國際牌第一聯 / 第二聯與欄位座標...', true);
      const detected = await window.CardTemplates.detectPanasonicSlipType(srcCanvas, worker);
      templateId = detected.templateId;
      detectReason = detected.reason;
    }

    const tpl = resolveCardTemplate(templateId);
    if (!tpl) return;

    layer.cardTemplateId = tpl.id;
    if (cardTemplateBadge) cardTemplateBadge.textContent = tpl.shortLabel;

    if (!window.Tesseract) {
      const msg = getOcrErrorDisplayMessage(new Error('Tesseract 未載入'));
      setCardSmartStatus(msg, false);
      setCanvasOcrPill(msg, 'warning');
      return;
    }

    setCardSmartStatus(`⏳ 已鎖定「${tpl.shortLabel}」，正在序列辨識機種與機號...`, true);

    try {
      // v31: 優先採用「整塊左側基本資料區（雙語中英混排 PSM=6）」整片掃描，徹底避開窄細框切偏或誤吃邊線
      let modelClean = '';
      let serialClean = '';
      let crossVerifiedNote = '';

      if (tpl.ocrRegions && tpl.ocrRegions.leftInfoBlock) {
        const leftBlockCrop = window.CardTemplates.createEnhancedOcrCropCanvas(
          srcCanvas,
          tpl.ocrRegions.leftInfoBlock,
          3.0
        );
        let leftBlockText = '';
        try {
          const chiEngWorker = await getSharedChiEngWorker();
          if (chiEngWorker) {
            await chiEngWorker.setParameters({ tessedit_pageseg_mode: '6' });
            try {
              const blockRes = await chiEngWorker.recognize(leftBlockCrop);
              leftBlockText = (blockRes && blockRes.data && blockRes.data.text) || '';
            } finally {
              await chiEngWorker.setParameters({ tessedit_pageseg_mode: '3' }).catch(() => {});
            }
          } else {
            const blockRes = await window.Tesseract.recognize(leftBlockCrop, 'eng+chi_tra');
            leftBlockText = (blockRes && blockRes.data && blockRes.data.text) || '';
          }
        } catch (blkErr) {
          console.warn('整塊左側雙語 OCR 降級為純英數整塊掃描:', blkErr);
          if (worker) {
            await worker.setParameters({ tessedit_pageseg_mode: '6' });
            try {
              const engBlk = await worker.recognize(leftBlockCrop);
              leftBlockText = (engBlk && engBlk.data && engBlk.data.text) || '';
            } finally {
              await worker.setParameters({ tessedit_pageseg_mode: '7' }).catch(() => {});
            }
          }
        }

        if (leftBlockText && window.CardTemplates.parsePanasonicLeftInfoBlock) {
          const parsedLeft = window.CardTemplates.parsePanasonicLeftInfoBlock(leftBlockText);
          if (parsedLeft.model) modelClean = parsedLeft.model;
          if (parsedLeft.serialNo) serialClean = parsedLeft.serialNo;
        }
      }

      // 若整塊雙語區仍有任一欄位未讀出，再以精準隔離框進行純英數 PSM=6 補強
      if (!modelClean || !serialClean) {
        const isolateRegion = r => ({ x: r.x, y: r.y, w: r.w, h: r.h });
        const modelCrop = window.CardTemplates.createEnhancedOcrCropCanvas(srcCanvas, isolateRegion(tpl.ocrRegions.model), 3.0);
        const serialCrop = window.CardTemplates.createEnhancedOcrCropCanvas(srcCanvas, isolateRegion(tpl.ocrRegions.serial), 3.0);

        let rawModel = '';
        let rawSerial = '';
        if (worker) {
          await worker.setParameters({ tessedit_pageseg_mode: '6' });
          try {
            if (!modelClean) {
              const modelRes = await worker.recognize(modelCrop);
              rawModel = (modelRes && modelRes.data && modelRes.data.text) || '';
            }
            if (!serialClean) {
              const serialRes = await worker.recognize(serialCrop);
              rawSerial = (serialRes && serialRes.data && serialRes.data.text) || '';
            }
          } finally {
            await worker.setParameters({ tessedit_pageseg_mode: '7' }).catch(() => {});
          }
        } else {
          if (!modelClean) {
            const mRes = await window.Tesseract.recognize(modelCrop, 'eng');
            rawModel = (mRes && mRes.data && mRes.data.text) || '';
          }
          if (!serialClean) {
            const sRes = await window.Tesseract.recognize(serialCrop, 'eng');
            rawSerial = (sRes && sRes.data && sRes.data.text) || '';
          }
        }

        if (!modelClean && rawModel) {
          modelClean = window.CardTemplates.filterWarrantyModelResult
            ? window.CardTemplates.filterWarrantyModelResult(rawModel)
            : rawModel.toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '');
        }
        if (!serialClean && rawSerial) {
          serialClean = window.CardTemplates.filterWarrantySerialResult
            ? window.CardTemplates.filterWarrantySerialResult(rawSerial)
            : rawSerial.toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
      }

      // v31: 訂購單原生純文字型號交叉比對校正（同品牌相似度 >= 65% 且前綴相符即 100% 修正誤字）
      if (
        modelClean &&
        Array.isArray(cachedOrderItemModels) &&
        cachedOrderItemModels.length > 0 &&
        window.CardTemplates.crossVerifyModelWithOrderSheet
      ) {
        const brandKey = (tpl.brand || 'PANASONIC').toUpperCase();
        const cv = window.CardTemplates.crossVerifyModelWithOrderSheet(modelClean, cachedOrderItemModels, brandKey);
        if (cv && cv.corrected && cv.model) {
          crossVerifiedNote = `（已依訂購單交叉校正：${modelClean} ➔ ${cv.model}）`;
          modelClean = cv.model;
        } else if (cv && cv.similarity >= 0.65 && cv.model === modelClean) {
          crossVerifiedNote = '（已與訂購單 100% 核對無誤）';
        }
      }

      if (inputCardModel && modelClean) inputCardModel.value = modelClean;
      if (inputCardSerial && serialClean) inputCardSerial.value = serialClean;

      mergeOcrSummaryFields('warranty_card', {
        brand: '國際',
        model: modelClean,
        serialNo: serialClean
      });

      // v26: 移除 layers.length > 0 限制，取得有效欄位後立即強制同步 5 行文字
      if (typeof syncSummaryTextLayer === 'function') {
        syncSummaryTextLayer(true);
      }

      setCardSmartStatus(
        `✅ 辨識完成（${tpl.shortLabel} / ${detectReason}）${crossVerifiedNote}\n機種：${modelClean || '未讀出'} ｜ 機號：${serialClean || '未讀出'}`,
        false
      );
      setCanvasOcrPill(`✅ 保卡辨識完成：${modelClean || '-'} / ${serialClean || '-'}`, 'success');
      showToast(`保卡欄位辨識完成：${modelClean || '-'} / ${serialClean || '-'}`);
    } catch (err) {
      console.error('保卡指定欄位 OCR 失敗:', err);
      const errMsg = getOcrErrorDisplayMessage(err);
      setCardSmartStatus(errMsg, false);
      setCanvasOcrPill(errMsg, 'warning');
      showToast(errMsg);
    }
  });
}

function toggleCardRectifyMode(forceState = null) {
  const layer = getTargetWarrantyImageLayer();
  if (!layer) {
    showToast('請先匯入並選取一張保卡照片');
    return;
  }
  if (layer !== activeLayer) setActiveLayer(layer);

  const nextState = forceState !== null ? !!forceState : !layer.cardRectifyMode;
  layer.cardRectifyMode = nextState;

  if (nextState) {
    if (layer.rectCropMode) {
      layer.rectCropMode = false;
      updateRectCropUI(layer);
    }
    if (layer.distortMode) {
      layer.distortMode = false;
      updateDistortUI(layer);
    }
    toggleEraseMode(false);

    const baseImg = layer.croppedImage || layer.rawImage || layer.image;
    if (window.CardTemplates && baseImg) {
      const modeVal = selectCardTemplateMode ? selectCardTemplateMode.value : 'auto';
      const isLgMode = layer.cardTemplateId === 'lg_tw' || modeVal === 'lg_tw';
      const isMitsuMode = layer.cardTemplateId === 'mitsubishi_tw' || modeVal === 'mitsubishi_tw';
      const detectRes = isLgMode && window.CardTemplates.detectLgCardQuad
        ? window.CardTemplates.detectLgCardQuad(baseImg)
        : (isMitsuMode && window.CardTemplates.detectMitsubishiCardQuad
            ? window.CardTemplates.detectMitsubishiCardQuad(baseImg)
            : window.CardTemplates.detectPanasonicCardQuad(baseImg));
      layer.cardQuadCorners = detectRes.corners;
      if (detectRes.detected) {
        setCardSmartStatus(
          isLgMode
            ? '✅ 已自動偵測 LG 白底保證書四角並保留 0.5cm 呼吸邊界，可直接微調或點擊「✨ 拉正 + 辨識」。'
            : (isMitsuMode
                ? '✅ 已自動偵測台灣三菱電機保證書四角（雙紅標對角校準），可直接微調或點擊「✨ 拉正 + 辨識」。'
                : '✅ 已自動偵測國際牌紅褐色外框四角，可直接微調或點擊「✨ 拉正 + 辨識」。'),
          false
        );
      } else {
        setCardSmartStatus('ℹ️ 未偵測到明顯外框，已帶入預設四角，請手動拖曳對齊保卡四邊角點。', false);
      }
    }
  }

  updateCardRectifyUI(layer);
  render();
}

async function applyCardRectifyAndOcr(targetLayer = null, autoStampAfter = false) {
  const layer = targetLayer || getTargetWarrantyImageLayer();
  if (!layer || !window.CardTemplates) {
    showToast('請先匯入並選取保卡照片');
    return;
  }
  if (layer !== activeLayer) setActiveLayer(layer);

  const baseImg = layer.croppedImage || layer.rawImage || layer.image;
  if (!baseImg) return;

  const modeVal = selectCardTemplateMode ? selectCardTemplateMode.value : 'auto';
  const effectiveMode = (modeVal === 'auto' && layer.cardTemplateId) ? layer.cardTemplateId : modeVal;
  if (!layer.cardQuadCorners || layer.cardQuadCorners.length !== 4) {
    const detectRes = (effectiveMode === 'lg_tw' && window.CardTemplates.detectLgCardQuad)
      ? window.CardTemplates.detectLgCardQuad(baseImg)
      : ((effectiveMode === 'mitsubishi_tw' && window.CardTemplates.detectMitsubishiCardQuad)
          ? window.CardTemplates.detectMitsubishiCardQuad(baseImg)
          : window.CardTemplates.detectPanasonicCardQuad(baseImg));
    layer.cardQuadCorners = detectRes.corners;
  }

  layer._calibratedStampSpec = null;
  layer._lgDealerOcrAnchor = null;
  layer._mitsubishiDealerOcrAnchors = null;
  const tpl = resolveCardTemplate(effectiveMode);
  let aspectRatio = tpl ? tpl.aspectRatio : 1.48;
  if ((effectiveMode === 'lg_tw' || effectiveMode === 'mitsubishi_tw') && Array.isArray(layer.cardQuadCorners) && layer.cardQuadCorners.length === 4) {
    const q = layer.cardQuadCorners;
    const qW = (Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) + Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y)) * 0.5;
    const qH = (Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y) + Math.hypot(q[2].x - q[1].x, q[2].y - q[1].y)) * 0.5;
    if (qH > 10) aspectRatio = Math.max(1.15, Math.min(1.85, qW / qH));
  }

  setCardSmartStatus('⏳ 正在執行四角梯形透視自動拉正...', true);

  // v24: 依原圖高解析度進行透視拉正 (至少 1800px，最高保留至 2600px 無損細字)
  const highResOutW = Math.max(1800, Math.min(2600, baseImg.width || 1800));
  const rectifiedCanvas = window.CardTemplates.rectifyPerspectivePureJS(
    baseImg,
    layer.cardQuadCorners,
    aspectRatio,
    highResOutW
  );

  if (!rectifiedCanvas) {
    setCardSmartStatus('⚠️ 四角座標異常，無法執行透視拉正，請調整四個角點後再試。', false);
    showToast('透視拉正失敗，請確認四個角點未重疊');
    return;
  }

  pushUndoState('保卡透視自動拉正');

  layer.rectifiedCleanCanvas = rectifiedCanvas;
  layer.warpedImage = rectifiedCanvas;
  layer.image = rectifiedCanvas;
  layer.hasBakedStamp = false;
  layer.scanEnhance = false;
  layer.cardRectifyMode = false;
  layer.isRectifiedCard = true;
  layer.rotation = 0;

  // 依照 1.48 : 1 標準比例重新計算畫布上的顯示尺寸，保持寬度比例自然
  const keepW = Math.max(480, layer.width);
  layer.width = Math.round(keepW);
  layer.height = Math.round(keepW / aspectRatio);

  if (switchScanEnhance) switchScanEnhance.checked = false;
  if (enhanceSliders) enhanceSliders.classList.add('hidden');
  updateCardRectifyUI(layer);
  render();

  await runCardTargetedOcr(layer);

  if (autoStampAfter || (switchAutoSmartCard && switchAutoSmartCard.checked)) {
    await autoStampWarrantyCard(layer);
  }
}

let cachedStampBaseImg = null;
function ensureStampImageLoaded() {
  return new Promise((resolve, reject) => {
    if (cachedStampBaseImg && cachedStampBaseImg.complete && cachedStampBaseImg.naturalWidth > 0) {
      resolve(cachedStampBaseImg);
      return;
    }
    // v26: 強制 100% 優先使用內嵌 STAMP_CLEAN_BASE64，徹底消除 file:/// Tainted Canvas SecurityError
    if (typeof STAMP_CLEAN_BASE64 === 'undefined' || !STAMP_CLEAN_BASE64) {
      reject(new Error('STAMP_CLEAN_BASE64 未定義，請確認 static/stamp_data.js 已載入'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      cachedStampBaseImg = img;
      resolve(img);
    };
    img.onerror = err => reject(err);
    img.src = STAMP_CLEAN_BASE64;
  });
}

function resolveCalibratedStampSpecForCardLayer(cardLayer, cleanCanvas) {
  const modeVal = selectCardTemplateMode ? selectCardTemplateMode.value : 'auto';
  const tpl = resolveCardTemplate((cardLayer && cardLayer.cardTemplateId) || modeVal);
  if (cardLayer && cardLayer.cardTemplateId === 'lg_tw') {
    if (cardLayer._calibratedStampSpec) return cardLayer._calibratedStampSpec;
    if (cleanCanvas && window.CardTemplates && typeof window.CardTemplates.detectLgDealerBoxStampSpec === 'function') {
      const calibrated = window.CardTemplates.detectLgDealerBoxStampSpec(
        cleanCanvas,
        cardLayer._lgDealerOcrAnchor || null
      );
      cardLayer._calibratedStampSpec = calibrated;
      return calibrated;
    }
  }
  if (cardLayer && cardLayer.cardTemplateId === 'mitsubishi_tw') {
    if (cardLayer._calibratedStampSpec) return cardLayer._calibratedStampSpec;
    if (cleanCanvas && window.CardTemplates && typeof window.CardTemplates.detectMitsubishiDealerStampSpec === 'function') {
      const calibrated = window.CardTemplates.detectMitsubishiDealerStampSpec(
        cleanCanvas,
        cardLayer._mitsubishiDealerOcrAnchors || null
      );
      cardLayer._calibratedStampSpec = calibrated;
      return calibrated;
    }
  }
  return (tpl && tpl.stampSpec) || {
    centerX: 0.845,
    centerY: 0.395,
    widthRatio: 0.210,
    tiltRangeDeg: 1.5,
    blendMode: 'multiply'
  };
}

function hasWarrantyCardStampAttached(cardLayer) {
  if (!cardLayer) return false;
  if (cardLayer.hasBakedStamp) return true;
  return layers.some(s => s && s.type === 'stamp' && s.attachedCardId === cardLayer.id);
}

// v56: 保留未蓋章高清保卡底圖（rectifiedCleanCanvas）並掛載可即時拖曳／雙擊調色的獨立 Multiply 印章圖層，徹底解決重編消失問題
async function attachInteractiveStampToCardLayer(cardLayer, stampImg, dateStr, fontSize, offsetY, stampSpec, options = {}) {
  if (!cardLayer || !layers.includes(cardLayer) || !stampImg) return null;

  let cleanCanvas = cardLayer.rectifiedCleanCanvas;
  if (!cleanCanvas) {
    const rawSrc = cardLayer.warpedImage || cardLayer.croppedImage || cardLayer.image || cardLayer.rawImage;
    if (!rawSrc) return null;
    cleanCanvas = document.createElement('canvas');
    cleanCanvas.width = rawSrc.width;
    cleanCanvas.height = rawSrc.height;
    cleanCanvas.getContext('2d').drawImage(rawSrc, 0, 0);
    cardLayer.rectifiedCleanCanvas = cleanCanvas;
  }

  // 永遠保持保卡本體為乾淨未烘烤底圖（hasBakedStamp = false），避免雙擊或重複蓋印互相覆寫
  cardLayer.image = cleanCanvas;
  cardLayer.warpedImage = cleanCanvas;
  cardLayer.hasBakedStamp = false;
  cardLayer.isRectifiedCard = true;
  cardLayer.bakedStampMeta = null;

  // 移除此保卡既有附著印章後重建最新定位與日期
  layers = layers.filter(l => !(l.type === 'stamp' && l.attachedCardId === cardLayer.id));

  const spec = stampSpec || resolveCalibratedStampSpecForCardLayer(cardLayer, cleanCanvas);
  const stampAspect = stampImg.height / Math.max(1, stampImg.width);
  const displayW = Math.max(120, Math.round(cardLayer.width * (spec.widthRatio || 0.210)));
  const displayH = Math.max(80, Math.round(displayW * stampAspect));
  const localDx = ((spec.centerX ?? 0.845) - 0.5) * cardLayer.width;
  const localDy = ((spec.centerY ?? 0.395) - 0.5) * cardLayer.height;
  const cosR = Math.cos(cardLayer.rotation || 0);
  const sinR = Math.sin(cardLayer.rotation || 0);
  const posX = Math.round(cardLayer.x + localDx * cosR - localDy * sinR);
  const posY = Math.round(cardLayer.y + localDx * sinR + localDy * cosR);
  const tiltRad = typeof options.tiltRad === 'number'
    ? options.tiltRad
    : (((spec.tiltRangeDeg || 1.5) * 0.35 * (Math.PI / 180)) * (Math.random() > 0.5 ? 1 : -1));

  const stampLayer = createLayerObject({
    type: 'stamp',
    name: `專櫃印章 (${dateStr})`,
    image: stampImg,
    rawImage: stampImg,
    blendMode: 'multiply',
    width: displayW,
    height: displayH,
    x: posX,
    y: posY,
    rotation: tiltRad
  });
  stampLayer.attachedCardId = cardLayer.id;
  stampLayer.stampSpec = { ...spec, tiltRad };
  stampLayer.stampDate = dateStr;
  stampLayer.stampFontSize = fontSize;
  stampLayer.stampOffsetY = offsetY;
  stampLayer.userMovedStamp = false;

  const cardIdx = layers.indexOf(cardLayer);
  if (cardIdx >= 0) {
    layers.splice(cardIdx + 1, 0, stampLayer);
  } else {
    layers.push(stampLayer);
  }

  await refreshSingleStandaloneStampLayer(stampLayer, true);
  if (typeof updateMobileWorkflowBadges === 'function') {
    updateMobileWorkflowBadges();
  }
  return stampLayer;
}

async function autoStampWarrantyCard(targetLayer = null) {
  const cardLayer = targetLayer || getTargetWarrantyImageLayer();
  if (!cardLayer) {
    showToast('畫布上尚未有保卡圖片，請先匯入保卡');
    return;
  }

  const dateStr = (inputStampDate && inputStampDate.value.trim()) || '115.11.21';
  const fontSize = (sliderStampFontSize && parseInt(sliderStampFontSize.value, 10)) || DEFAULT_STAMP_FONT_SIZE;
  const offsetY = (sliderStampOffsetY && parseInt(sliderStampOffsetY.value, 10)) || 0;

  let stampImg;
  try {
    stampImg = await ensureStampImageLoaded();
  } catch (err) {
    console.error('專櫃印章圖檔載入失敗:', err);
    showToast('專櫃印章圖檔載入失敗，請檢查 stamp_data.js');
    return;
  }

  // v25/v56: 保持未蓋章乾淨保卡底圖，並掛載可即時按壓拖曳與雙擊編修的互動式印章圖層
  let cleanCanvas = cardLayer.rectifiedCleanCanvas;
  if (!cleanCanvas) {
    const rawSrc = cardLayer.warpedImage || cardLayer.croppedImage || cardLayer.image || cardLayer.rawImage;
    if (!rawSrc) return;
    cleanCanvas = document.createElement('canvas');
    cleanCanvas.width = rawSrc.width;
    cleanCanvas.height = rawSrc.height;
    cleanCanvas.getContext('2d').drawImage(rawSrc, 0, 0);
    cardLayer.rectifiedCleanCanvas = cleanCanvas;
  }

  const stampSpec = resolveCalibratedStampSpecForCardLayer(cardLayer, cleanCanvas);
  pushUndoState('保卡避讓自動蓋章');
  const stampLayer = await attachInteractiveStampToCardLayer(cardLayer, stampImg, dateStr, fontSize, offsetY, stampSpec);
  if (stampLayer) {
    setActiveLayer(stampLayer);
    if (!switchAutoLayout || switchAutoLayout.checked) {
      autoArrangeWorkbenchLayout(false);
    } else {
      render();
    }
    if (typeof markDesktopBatchRoleStatus === 'function') {
      markDesktopBatchRoleStatus('card', 'done');
    }
    if (typeof checkDesktopBatchCompletion === 'function') {
      checkDesktopBatchCompletion(false);
    }
    const avgL = stampLayer.cachedLighting ? stampLayer.cachedLighting.avgL : 245;
    const lightingNote = avgL < 190 ? ` · 暗部油墨融合 L=${avgL}` : '';
    showToast(`已於保卡蓋上互動式專櫃印章 (${dateStr}${lightingNote})`);
  }
}

// =============================================================================
// 8-1. 保卡民國日期輸入對話框 ＋ 非阻斷背景辨識與最後蓋章流程 (v34)
// =============================================================================

let confirmedSessionStampDate = null;
let pendingStampDateWaiter = null;

function normalizeMinguoStampDateInput(raw) {
  const s = (raw || '').trim();
  if (!s) {
    return { valid: false, reason: '請輸入民國日期（例如 1150417）' };
  }

  let year, month, day;
  const compactMatch = s.match(/^(\d{3})(\d{2})(\d{2})$/);
  if (compactMatch) {
    year = parseInt(compactMatch[1], 10);
    month = parseInt(compactMatch[2], 10);
    day = parseInt(compactMatch[3], 10);
  } else {
    const sepMatch = s.match(/^(\d{2,3})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})$/);
    if (!sepMatch) {
      return { valid: false, reason: '格式錯誤，請直接輸入 7 碼數字（如 1150417）或 115.04.17' };
    }
    year = parseInt(sepMatch[1], 10);
    month = parseInt(sepMatch[2], 10);
    day = parseInt(sepMatch[3], 10);
  }

  if (year < 90 || year > 199 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, reason: '請確認民國年份（如 115）及合法月份日期（01～12 / 01～31）' };
  }

  const formatted = `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
  return { valid: true, formatted };
}

function resetStampDateSession() {
  confirmedSessionStampDate = null;
  if (pendingStampDateWaiter) {
    const waiter = pendingStampDateWaiter;
    pendingStampDateWaiter = null;
    waiter.resolve(null);
  }
  if (stampDateModalBackdrop) {
    stampDateModalBackdrop.classList.add('hidden');
  }
  if (modalStampDateInput) {
    modalStampDateInput.value = '';
  }
  if (modalStampDateError) {
    modalStampDateError.classList.add('hidden');
    modalStampDateError.textContent = '';
  }
  if (modalStampDatePreview) {
    modalStampDatePreview.textContent = '格式範例：輸入 1150417 自動轉為 115.04.17';
  }
}

function openStampDatePromptIfNeeded() {
  if (confirmedSessionStampDate) {
    return Promise.resolve(confirmedSessionStampDate);
  }
  if (pendingStampDateWaiter) {
    if (stampDateModalBackdrop) stampDateModalBackdrop.classList.remove('hidden');
    if (modalStampDateInput) setTimeout(() => modalStampDateInput.focus(), 20);
    return pendingStampDateWaiter.promise;
  }

  let resolveFn;
  const promise = new Promise(resolve => {
    resolveFn = resolve;
  });
  pendingStampDateWaiter = { promise, resolve: resolveFn };

  if (modalStampDateInput) modalStampDateInput.value = '';
  if (modalStampDateError) {
    modalStampDateError.classList.add('hidden');
    modalStampDateError.textContent = '';
  }
  if (modalStampDatePreview) {
    modalStampDatePreview.textContent = '格式範例：輸入 1150417 自動轉為 115.04.17';
  }
  if (stampDateModalBackdrop) {
    stampDateModalBackdrop.classList.remove('hidden');
  }
  if (modalStampDateInput) {
    setTimeout(() => modalStampDateInput.focus(), 20);
  }
  return promise;
}

async function applyConfirmedStampToCardLayer(cardLayer, dateStr) {
  if (!cardLayer || !layers.includes(cardLayer) || !dateStr) return false;
  if (cardLayer._isStamping || hasWarrantyCardStampAttached(cardLayer)) return false;

  cardLayer._isStamping = true;
  try {
    let stampImg;
    try {
      stampImg = await ensureStampImageLoaded();
    } catch (err) {
      console.error('專櫃印章圖檔載入失敗:', err);
      return false;
    }

    let cleanCanvas = cardLayer.rectifiedCleanCanvas;
    if (!cleanCanvas) {
      const rawSrc = cardLayer.warpedImage || cardLayer.croppedImage || cardLayer.image || cardLayer.rawImage;
      if (!rawSrc) return false;
      cleanCanvas = document.createElement('canvas');
      cleanCanvas.width = rawSrc.width;
      cleanCanvas.height = rawSrc.height;
      cleanCanvas.getContext('2d').drawImage(rawSrc, 0, 0);
      cardLayer.rectifiedCleanCanvas = cleanCanvas;
    }

    const stampSpec = resolveCalibratedStampSpecForCardLayer(cardLayer, cleanCanvas);
    const fontSize = (sliderStampFontSize && parseInt(sliderStampFontSize.value, 10)) || DEFAULT_STAMP_FONT_SIZE;
    const offsetY = (sliderStampOffsetY && parseInt(sliderStampOffsetY.value, 10)) || 0;

    if (!layers.includes(cardLayer)) return false;
    const stampLayer = await attachInteractiveStampToCardLayer(cardLayer, stampImg, dateStr, fontSize, offsetY, stampSpec);
    if (stampLayer) {
      updateLayersListUI();
      render();
      if (typeof markDesktopBatchRoleStatus === 'function') {
        markDesktopBatchRoleStatus('card', 'done');
      }
      if (typeof checkDesktopBatchCompletion === 'function') {
        checkDesktopBatchCompletion(false);
      }
      if (document.body.classList.contains('is-mobile-mode')) {
        requestAnimationFrame(() => {
          if (typeof getMobileEditingStampLayer === 'function' && !getMobileEditingStampLayer()) {
            fitCanvasToViewport();
          }
          if (typeof checkAndShowMobileCompletionOverlay === 'function') {
            checkAndShowMobileCompletionOverlay();
          }
        });
      }
      setCanvasOcrPill(`✅ 已依指定日期蓋上可調式專櫃印章 (${dateStr})`, 'success');
      showToast(`已依指定日期於保卡蓋上專櫃印章 (${dateStr}，可直接按壓拖曳或雙擊改色改期)`);
      return true;
    }
    return false;
  } finally {
    cardLayer._isStamping = false;
  }
}

// =============================================================================
// 8-2. 手動印章落點紙張光影採樣 ＋ 同色系深淺即時重繪引擎 (v37)
// =============================================================================

function sampleBackdropLightingForStampLayer(stampLayer) {
  const defaultLighting = { avgL: 242, avgR: 242, avgG: 242, avgB: 242, leftAvgL: 242, rightAvgL: 242 };
  if (!stampLayer) return defaultLighting;

  const sampleW = 100;
  const sampleH = 72;
  const tmp = document.createElement('canvas');
  tmp.width = sampleW;
  tmp.height = sampleH;
  const tCtx = tmp.getContext('2d', { willReadFrequently: true });

  tCtx.fillStyle = '#FFFFFF';
  tCtx.fillRect(0, 0, sampleW, sampleH);

  const patchW = Math.max(10, stampLayer.width || 580);
  const patchH = Math.max(10, stampLayer.height || 420);
  const patchLeft = stampLayer.x - patchW / 2;
  const patchTop = stampLayer.y - patchH / 2;
  const sx = sampleW / patchW;
  const sy = sampleH / patchH;

  const stampIdx = layers.indexOf(stampLayer);
  const maxIdx = stampIdx >= 0 ? stampIdx : layers.length;

  tCtx.save();
  tCtx.scale(sx, sy);
  tCtx.translate(-patchLeft, -patchTop);

  for (let i = 0; i < maxIdx; i++) {
    const bg = layers[i];
    if (!bg || (bg.type !== 'image' && bg.type !== 'pdf_order')) continue;
    const bgImg = bg.rectifiedCleanCanvas || bg.image;
    if (!bgImg || !(bgImg.complete || bgImg instanceof HTMLCanvasElement)) continue;

    tCtx.save();
    tCtx.translate(bg.x, bg.y);
    tCtx.rotate(bg.rotation || 0);
    if (bg.flipH) tCtx.scale(-1, 1);
    tCtx.drawImage(bgImg, -bg.width / 2, -bg.height / 2, bg.width, bg.height);
    tCtx.restore();
  }
  tCtx.restore();

  const data = tCtx.getImageData(0, 0, sampleW, sampleH).data;
  const candidates = [];
  const leftCands = [];
  const rightCands = [];
  const midX = sampleW / 2;

  for (let py = 0; py < sampleH; py++) {
    for (let px = 0; px < sampleW; px++) {
      const idx = (py * sampleW + px) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
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
    rightAvgL: avgSideLum(rightCands) ?? avgL
  };
}

async function refreshSingleStandaloneStampLayer(stampLayer, resampleLighting = true) {
  if (!stampLayer || stampLayer.type !== 'stamp') return;
  if (!window.CardTemplates || typeof window.CardTemplates.adaptStampCanvasToLighting !== 'function') return;

  let stampImg;
  try {
    stampImg = await ensureStampImageLoaded();
  } catch (e) {
    return;
  }

  const dateStr = stampLayer.stampDate || (inputStampDate && inputStampDate.value.trim()) || '115.11.21';
  const fontSize = (sliderStampFontSize && parseInt(sliderStampFontSize.value, 10)) || stampLayer.stampFontSize || DEFAULT_STAMP_FONT_SIZE;
  const offsetY = (sliderStampOffsetY && parseInt(sliderStampOffsetY.value, 10)) ?? (stampLayer.stampOffsetY || 0);
  const blueTone = getCurrentStampBlueTone();

  if (resampleLighting || !stampLayer.cachedLighting) {
    stampLayer.cachedLighting = sampleBackdropLightingForStampLayer(stampLayer);
  }

  const adapted = window.CardTemplates.adaptStampCanvasToLighting(
    stampImg,
    dateStr,
    fontSize,
    offsetY,
    stampLayer.cachedLighting,
    blueTone
  );
  stampLayer.image = adapted.canvas;
  stampLayer.blendMode = 'multiply';
  stampLayer.stampDate = dateStr;
  stampLayer.stampFontSize = fontSize;
  stampLayer.stampOffsetY = offsetY;
  stampLayer.name = `專櫃印章 (${dateStr})`;
  updateLayersListUI();
  render();
}

let isRefreshingAllStamps = false;
let pendingStampRefreshResample = false;

async function refreshAllStampsAppearance(resampleLighting = false) {
  if (isRefreshingAllStamps) {
    pendingStampRefreshResample = pendingStampRefreshResample || resampleLighting;
    return;
  }
  isRefreshingAllStamps = true;
  try {
    let stampImg = null;
    try {
      stampImg = await ensureStampImageLoaded();
    } catch (e) {
      return;
    }

    const dateStr = (inputStampDate && inputStampDate.value.trim()) || '115.11.21';
    const fontSize = (sliderStampFontSize && parseInt(sliderStampFontSize.value, 10)) || DEFAULT_STAMP_FONT_SIZE;
    const offsetY = (sliderStampOffsetY && parseInt(sliderStampOffsetY.value, 10)) || 0;
    const blueTone = getCurrentStampBlueTone();
    const modeVal = selectCardTemplateMode ? selectCardTemplateMode.value : 'auto';

    let changed = false;
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      if (!l) continue;

      if (l.type === 'stamp' && window.CardTemplates && typeof window.CardTemplates.adaptStampCanvasToLighting === 'function') {
        if (resampleLighting || !l.cachedLighting) {
          l.cachedLighting = sampleBackdropLightingForStampLayer(l);
        }
        const adapted = window.CardTemplates.adaptStampCanvasToLighting(
          stampImg,
          dateStr,
          fontSize,
          offsetY,
          l.cachedLighting,
          blueTone
        );
        l.image = adapted.canvas;
        l.blendMode = 'multiply';
        l.stampDate = dateStr;
        l.stampFontSize = fontSize;
        l.stampOffsetY = offsetY;
        l.name = `專櫃印章 (${dateStr})`;
        changed = true;
      } else if (
        l.type === 'image' &&
        l.hasBakedStamp &&
        l.rectifiedCleanCanvas &&
        window.CardTemplates &&
        typeof window.CardTemplates.compositeStampOnOffscreenCard === 'function'
      ) {
        const stampSpec = resolveCalibratedStampSpecForCardLayer(l, l.rectifiedCleanCanvas);
        const baked = window.CardTemplates.compositeStampOnOffscreenCard(
          l.rectifiedCleanCanvas,
          stampImg,
          dateStr,
          fontSize,
          offsetY,
          stampSpec,
          blueTone
        );
        if (baked && baked.stampedCanvas) {
          l.warpedImage = baked.stampedCanvas;
          l.image = baked.stampedCanvas;
          changed = true;
        }
      }
    }

    if (changed) {
      updateLayersListUI();
      render();
    }
  } finally {
    isRefreshingAllStamps = false;
    if (pendingStampRefreshResample) {
      const nextResample = pendingStampRefreshResample;
      pendingStampRefreshResample = false;
      refreshAllStampsAppearance(nextResample);
    }
  }
}

let liveStampRefreshTimer = null;
function scheduleLiveStampRefresh() {
  if (liveStampRefreshTimer) clearTimeout(liveStampRefreshTimer);
  liveStampRefreshTimer = setTimeout(() => {
    liveStampRefreshTimer = null;
    refreshAllStampsAppearance(false);
  }, 45);
}

async function finalizeWarrantyCardStampAfterLayout(cardLayer) {
  if (!cardLayer || !layers.includes(cardLayer)) return;
  if (confirmedSessionStampDate) {
    await applyConfirmedStampToCardLayer(cardLayer, confirmedSessionStampDate);
    return;
  }

  const waitPromise = openStampDatePromptIfNeeded();
  setCanvasOcrPill('⏳ 背景辨識與排版已完成，等待確認保卡印章日期後蓋章...', 'loading');
  waitPromise.then(chosenDate => {
    if (chosenDate && layers.includes(cardLayer) && !hasWarrantyCardStampAttached(cardLayer)) {
      applyConfirmedStampToCardLayer(cardLayer, chosenDate);
    }
  });
}

let pendingStampDateEditCallback = null;

function openStampDateEditDialog(initialDateStr, onConfirm) {
  if (!stampDateModalBackdrop || !modalStampDateInput) return;
  pendingStampDateEditCallback = typeof onConfirm === 'function' ? onConfirm : null;
  const initVal = (initialDateStr || '').trim();
  modalStampDateInput.value = initVal;
  if (modalStampDateError) {
    modalStampDateError.classList.add('hidden');
    modalStampDateError.textContent = '';
  }
  if (modalStampDatePreview) {
    const check = normalizeMinguoStampDateInput(initVal);
    modalStampDatePreview.textContent = check.valid
      ? `✓ 目前印章日期：${check.formatted}（輸入 7 碼如 1150417 可改期）`
      : '格式範例：輸入 1150417 自動轉為 115.04.17';
  }
  stampDateModalBackdrop.classList.remove('hidden');
  setTimeout(() => {
    modalStampDateInput.focus();
    if (typeof modalStampDateInput.select === 'function') {
      modalStampDateInput.select();
    }
  }, 20);
}

function initStampDateModal() {
  if (!stampDateModalBackdrop || !modalStampDateInput || !btnConfirmModalStampDate) return;

  const submitDate = () => {
    const check = normalizeMinguoStampDateInput(modalStampDateInput.value);
    if (!check.valid) {
      if (modalStampDateError) {
        modalStampDateError.textContent = check.reason;
        modalStampDateError.classList.remove('hidden');
      }
      modalStampDateInput.focus();
      return;
    }

    confirmedSessionStampDate = check.formatted;
    if (inputStampDate) {
      inputStampDate.value = check.formatted;
    }
    if (modalStampDateError) {
      modalStampDateError.classList.add('hidden');
    }
    stampDateModalBackdrop.classList.add('hidden');

    if (pendingStampDateEditCallback) {
      const cb = pendingStampDateEditCallback;
      pendingStampDateEditCallback = null;
      cb(check.formatted);
      return;
    }

    if (pendingStampDateWaiter) {
      const waiter = pendingStampDateWaiter;
      pendingStampDateWaiter = null;
      waiter.resolve(check.formatted);
    }

    // 若畫布上已有未蓋章的保卡圖層，立即補蓋專櫃印章（未建檔品牌於手機端保留由快捷鈕放可拖曳印章）
    const isMobileUI = document.body.classList.contains('is-mobile-mode');
    const targetCard = [...layers].reverse().find(
      l => l.type === 'image' && (l.docRole === 'warranty_card' || l.isRectifiedCard) && !hasWarrantyCardStampAttached(l)
    );
    if (targetCard && !(targetCard.isUnmatchedBrandCard && isMobileUI)) {
      applyConfirmedStampToCardLayer(targetCard, check.formatted);
    } else if (targetCard && targetCard.isUnmatchedBrandCard && isMobileUI) {
      if (typeof updateMobileWorkflowBadges === 'function') updateMobileWorkflowBadges();
      showToast(`已確認日期 (${check.formatted})，請點下方「蓋上專櫃印章」蓋印並自由拖曳調整`);
    } else {
      showToast(`已鎖定保卡印章日期 (${check.formatted})，背景排版完成後將自動蓋章`);
    }
  };

  modalStampDateInput.addEventListener('input', () => {
    if (modalStampDateError) {
      modalStampDateError.classList.add('hidden');
    }
    const raw = modalStampDateInput.value.trim();
    if (!raw) {
      if (modalStampDatePreview) modalStampDatePreview.textContent = '格式範例：輸入 1150417 自動轉為 115.04.17';
      return;
    }
    const check = normalizeMinguoStampDateInput(raw);
    if (modalStampDatePreview) {
      modalStampDatePreview.textContent = check.valid
        ? `✓ 印章將蓋印日期：${check.formatted}`
        : `輸入中：${raw}（可打 7 碼如 1150417）`;
    }
  });

  modalStampDateInput.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      submitDate();
    }
  });

  btnConfirmModalStampDate.addEventListener('click', submitDate);

  stampDateModalBackdrop.addEventListener('click', e => {
    if (e.target === stampDateModalBackdrop && pendingStampDateEditCallback) {
      pendingStampDateEditCallback = null;
      stampDateModalBackdrop.classList.add('hidden');
    }
  });
}

function initSmartWarrantyModule() {
  // v22: 預先載入專櫃印章圖檔，確保首次上傳保卡即自動蓋印不空白
  ensureStampImageLoaded().catch(() => {});

  if (btnToggleCardRectify) {
    btnToggleCardRectify.addEventListener('click', () => {
      toggleCardRectifyMode();
    });
  }

  if (btnApplyCardRectify) {
    btnApplyCardRectify.addEventListener('click', () => {
      applyCardRectifyAndOcr();
    });
  }

  if (btnRerunCardOcr) {
    btnRerunCardOcr.addEventListener('click', () => {
      const layer = getTargetWarrantyImageLayer();
      if (!layer) {
        showToast('請先匯入並選取保卡圖片');
        return;
      }
      runCardTargetedOcr(layer);
    });
  }

  if (selectCardTemplateMode) {
    selectCardTemplateMode.addEventListener('change', () => {
      const modeVal = selectCardTemplateMode.value;
      const layer = getTargetWarrantyImageLayer();
      if (modeVal !== 'auto' && window.CardTemplates && window.CardTemplates.TEMPLATES[modeVal]) {
        const tpl = window.CardTemplates.TEMPLATES[modeVal];
        if (cardTemplateBadge) cardTemplateBadge.textContent = tpl.shortLabel;
        if (layer) {
          layer.cardTemplateId = tpl.id;
          if (layer.isRectifiedCard) {
            runCardTargetedOcr(layer);
          }
        }
      }
    });
  }

  if (btnCopyCardModel) {
    btnCopyCardModel.addEventListener('click', () => {
      const val = (inputCardModel && inputCardModel.value.trim()) || '';
      if (!val) { showToast('機種欄位目前為空'); return; }
      navigator.clipboard.writeText(val).then(() => showToast(`已複製機種：${val}`));
    });
  }

  if (btnCopyCardSerial) {
    btnCopyCardSerial.addEventListener('click', () => {
      const val = (inputCardSerial && inputCardSerial.value.trim()) || '';
      if (!val) { showToast('機號欄位目前為空'); return; }
      navigator.clipboard.writeText(val).then(() => showToast(`已複製機號：${val}`));
    });
  }

  if (btnSyncCardToNote) {
    btnSyncCardToNote.addEventListener('click', () => {
      const modelVal = (inputCardModel && inputCardModel.value.trim()) || '';
      const serialVal = (inputCardSerial && inputCardSerial.value.trim()) || '';
      if (!modelVal && !serialVal) {
        showToast('請先辨識或輸入機種／機號');
        return;
      }
      if (!inputNewNote) return;
      const currentText = inputNewNote.value || '';
      let lines = currentText.trim() ? currentText.split(/\r?\n/) : [];
      if (modelVal) {
        const idx = lines.findIndex(l => /^\s*(品牌|型號|機種)/.test(l));
        if (idx >= 0) lines[idx] = `國際牌 ${modelVal}`;
        else lines.push(`國際牌 ${modelVal}`);
      }
      if (serialVal) {
        const idx = lines.findIndex(l => /^\s*機號/.test(l));
        if (idx >= 0) lines[idx] = `機號  ${serialVal}`;
        else lines.push(`機號  ${serialVal}`);
      }
      inputNewNote.value = lines.join('\n');
      if (modelVal) cachedReceiptOcrInfo.model = modelVal;
      if (serialVal) cachedReceiptOcrInfo.serialNo = serialVal;
      const cardTarget = typeof getTargetWarrantyImageLayer === 'function' ? getTargetWarrantyImageLayer() : null;
      if (cardTarget) {
        if (!cardTarget.ocrData) cardTarget.ocrData = {};
        if (modelVal) { cardTarget.ocrData.model = modelVal; cardTarget._lgVerifiedModel = modelVal; }
        if (serialVal) { cardTarget.ocrData.serial = serialVal; cardTarget._lgVerifiedSerial = serialVal; }
      }
      if (typeof syncSummaryTextLayer === 'function' && layers.length > 0) {
        syncSummaryTextLayer(true);
      }
      showToast('已將機種與機號帶入單據備註與畫布 5 行核對字');
    });
  }

  if (btnAutoStampCard) {
    btnAutoStampCard.addEventListener('click', () => {
      autoStampWarrantyCard();
    });
  }

  if (btnAutoLayout) {
    btnAutoLayout.addEventListener('click', () => {
      autoArrangeWorkbenchLayout(true);
    });
  }

  const syncSidebarCardInputsToFiveLine = () => {
    const modelStr = inputCardModel ? inputCardModel.value.trim() : '';
    const serialStr = inputCardSerial ? inputCardSerial.value.trim() : '';
    if (inputCardModel) cachedReceiptOcrInfo.model = modelStr;
    if (inputCardSerial) cachedReceiptOcrInfo.serialNo = serialStr;
    const cardTarget = typeof getTargetWarrantyImageLayer === 'function' ? getTargetWarrantyImageLayer() : null;
    if (cardTarget) {
      if (!cardTarget.ocrData) cardTarget.ocrData = {};
      cardTarget.ocrData.model = modelStr;
      cardTarget.ocrData.serial = serialStr;
      cardTarget._lgVerifiedModel = modelStr;
      cardTarget._lgVerifiedSerial = serialStr;
    }
    if (typeof syncSummaryTextLayer === 'function' && layers.length > 0) {
      syncSummaryTextLayer(true);
    }
  };
  if (inputCardModel) inputCardModel.addEventListener('input', syncSidebarCardInputsToFiveLine);
  if (inputCardSerial) inputCardSerial.addEventListener('input', syncSidebarCardInputsToFiveLine);
}

// =============================================================================
// 9. 自適應不重疊排版引擎、自動 5 行核對文字與雙擊原地編輯 (v23)
// =============================================================================

let cachedReceiptOcrInfo = {
  date: '',
  invoiceNo: '',
  brand: '',
  model: '',
  serialNo: '',
  sellerTaxId: '24721268'
};

// v31: 訂購單原生純文字品名／型號標準答案庫（供保卡近似誤字交叉比對校正）
let cachedOrderItemModels = [];

function extractOrderSheetModels(rawOrderText) {
  if (!rawOrderText || typeof rawOrderText !== 'string') return cachedOrderItemModels;
  const upper = rawOrderText.toUpperCase();

  const detectedBrands = [];
  Object.keys(BRAND_MAP).forEach(eng => {
    if (upper.includes(eng) || upper.includes(BRAND_MAP[eng])) {
      detectedBrands.push(eng);
    }
  });
  const defaultBrand = detectedBrands.length === 1 ? detectedBrands[0] : (upper.includes('PANASONIC') || upper.includes('國際') ? 'PANASONIC' : (detectedBrands[0] || 'PANASONIC'));

  const modelRegex = /\b([A-Z]{1,4}-[A-Z0-9]{2,12}(?:-[A-Z0-9]{1,5}|\/[A-Z0-9]{1,4}){0,3})\b/g;
  const lines = upper.replace(/\r/g, '\n').split('\n');

  lines.forEach(line => {
    let lineBrand = '';
    Object.keys(BRAND_MAP).forEach(eng => {
      if (!lineBrand && (line.includes(eng) || line.includes(BRAND_MAP[eng]))) {
        lineBrand = eng;
      }
    });
    const useBrand = lineBrand || defaultBrand;

    let m;
    while ((m = modelRegex.exec(line)) !== null) {
      const tok = m[1].trim();
      if (tok.length < 5) continue;
      if (!/[A-Z]/.test(tok) || !/\d/.test(tok)) continue;
      // 排除發票號碼與日期或電話格式
      if (/^[A-Z]{2}-\d{8}$/.test(tok)) continue;
      if (!cachedOrderItemModels.some(item => item.model === tok)) {
        cachedOrderItemModels.push({ brand: useBrand, model: tok });
      }
    }
  });

  return cachedOrderItemModels;
}

function applyOrderCrossVerificationToCurrentCard() {
  if (!Array.isArray(cachedOrderItemModels) || cachedOrderItemModels.length === 0) return false;
  if (!window.CardTemplates || typeof window.CardTemplates.crossVerifyModelWithOrderSheet !== 'function') return false;

  const curModel = (inputCardModel && inputCardModel.value.trim()) || cachedReceiptOcrInfo.model || '';
  if (!curModel) return false;

  const targetCard = typeof getTargetWarrantyImageLayer === 'function' ? getTargetWarrantyImageLayer() : null;
  const targetTplId = targetCard ? (targetCard.cardTemplateId || targetCard.templateId || '') : '';
  const targetBrandKey = targetTplId === 'lg_tw'
    ? 'LG'
    : (targetTplId === 'mitsubishi_tw' ? 'MITSUBISHI' : 'PANASONIC');
  const cv = window.CardTemplates.crossVerifyModelWithOrderSheet(curModel, cachedOrderItemModels, targetBrandKey);
  if (cv && cv.corrected && cv.model) {
    cachedReceiptOcrInfo.model = cv.model;
    if (inputCardModel) inputCardModel.value = cv.model;
    if (targetCard) {
      if (!targetCard.ocrData) targetCard.ocrData = {};
      targetCard.ocrData.model = cv.model;
      targetCard._lgVerifiedModel = cv.model;
    }
    setCardSmartStatus(
      `✅ 已依訂購單交叉校正型號：${curModel} ➔ ${cv.model}（相似度 ${Math.round(cv.similarity * 100)}%）`,
      false
    );
    if (typeof syncSummaryTextLayer === 'function') {
      syncSummaryTextLayer(true);
    }
    return true;
  }
  return false;
}

/**
 * v28: 單一序列排隊高解析發票 OCR — 支援預掃描文字合併與非空值狀態保護，僅更新發票欄位
 */
async function runReceiptHighResOcr(fullResSource, preScanText = '') {
  return enqueueOcrTask(async () => {
    if (!fullResSource) return;
    if (!window.Tesseract) {
      const msg = getOcrErrorDisplayMessage(new Error('Tesseract 未載入'));
      setCardSmartStatus(msg, false);
      setCanvasOcrPill(msg, 'warning');
      return;
    }

    setCanvasOcrPill('🔍 正在辨識發票日期與發票號碼...', 'loading');
    setCardSmartStatus('⏳ 正在序列執行發票多區段對比拉伸 OCR...', true);

    try {
      const sw = fullResSource.width;
      const sh = fullResSource.height;
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = sw;
      fullCanvas.height = sh;
      fullCanvas.getContext('2d').drawImage(fullResSource, 0, 0);

      const tplA = window.CardTemplates && window.CardTemplates.INVOICE_TEMPLATES
        ? window.CardTemplates.INVOICE_TEMPLATES.invoice_detail_slip
        : null;

      let headerText = '';
      let invoiceZoneText = '';
      let invoiceZoneEngText = '';

      let chiEngWorker = null;
      let engWorker = null;
      try {
        chiEngWorker = await getSharedChiEngWorker();
      } catch (e1) {
        console.warn('共用中英 Worker 建置受限:', e1);
      }
      try {
        engWorker = await getWarrantyLineOcrWorker();
      } catch (e2) {
        console.warn('共用英數 Worker 建置受限:', e2);
      }

      const runChiEng = async targetCanvas => {
        if (chiEngWorker) return await chiEngWorker.recognize(targetCanvas);
        return await window.Tesseract.recognize(targetCanvas, 'eng+chi_tra');
      };

      if (tplA && window.CardTemplates.createEnhancedOcrCropCanvas) {
        // 1. 頂部區域 (Y: 1%~45%): 銷貨明細表 / 營業人統編 / 載具號碼下方日期
        const headerCrop = window.CardTemplates.createEnhancedOcrCropCanvas(fullCanvas, tplA.regions.headerZone, 2.0);
        // 2. 中下段重點區 (Y: 50%~88%，退貨用條碼上方): 發票號碼：ZE-93731662
        const invCrop = window.CardTemplates.createEnhancedOcrCropCanvas(fullCanvas, tplA.regions.invoiceNoZone, 2.2);

        // 嚴格單一序列排隊執行（絕不平行互搶 Worker）
        const hRes = await runChiEng(headerCrop);
        headerText = (hRes && hRes.data && hRes.data.text) || '';

        const iChiRes = await runChiEng(invCrop);
        invoiceZoneText = (iChiRes && iChiRes.data && iChiRes.data.text) || '';

        if (engWorker) {
          // 暫時切換為單區塊 PSM=6 以辨識發票號碼區多行或單行英數
          await engWorker.setParameters({ tessedit_pageseg_mode: '6' });
          const iEngRes = await engWorker.recognize(invCrop);
          invoiceZoneEngText = (iEngRes && iEngRes.data && iEngRes.data.text) || '';
          await engWorker.setParameters({ tessedit_pageseg_mode: '7' });
        } else {
          const iEngRes = await window.Tesseract.recognize(invCrop, 'eng');
          invoiceZoneEngText = (iEngRes && iEngRes.data && iEngRes.data.text) || '';
        }
      }

      // 解析日期、統編與發票號碼（含預掃描文字合併與安全存在性防護）
      let fullText = '';
      const parseHdrSafe = (hTxt, fTxt) => {
        if (window.CardTemplates && typeof window.CardTemplates.parseInvoiceHeaderFields === 'function') {
          return window.CardTemplates.parseInvoiceHeaderFields(hTxt, fTxt);
        }
        const scope = (hTxt + '\n' + fTxt).replace(/\r/g, '\n');
        const ad = scope.match(/(202\d|20\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/);
        const tax = scope.match(/(?:營業人統編|賣方統編|統編)[^\dA-Z]{0,8}(\d{8})/i);
        return {
          sellerTaxId: tax ? tax[1] : '',
          dateStr: ad ? `${ad[1]}-${ad[2].padStart(2, '0')}-${ad[3].padStart(2, '0')}` : ''
        };
      };
      const normalizeInvSafe = txt => {
        if (window.CardTemplates && typeof window.CardTemplates.normalizeTaiwanInvoiceNo === 'function') {
          return window.CardTemplates.normalizeTaiwanInvoiceNo(txt);
        }
        const m = (txt || '').toUpperCase().match(/([A-Z]{2})\s*[-—–]?\s*(\d[\d\s]{6,10}\d)/);
        if (m) {
          const d = m[2].replace(/\s+/g, '');
          if (/^\d{8}$/.test(d)) return `${m[1]}${d}`;
        }
        return '';
      };

      const hdrParsed = parseHdrSafe(headerText, preScanText || '');
      let invNo = normalizeInvSafe(
        invoiceZoneEngText + '\n' + invoiceZoneText + '\n' + headerText + '\n' + (preScanText || '')
      );

      if (!hdrParsed.dateStr || !invNo) {
        const fullRes = await runChiEng(fullCanvas);
        fullText = (fullRes && fullRes.data && fullRes.data.text) || '';
        if (!hdrParsed.dateStr || !hdrParsed.sellerTaxId) {
          const fallbackHdr = parseHdrSafe(headerText, fullText + '\n' + (preScanText || ''));
          if (!hdrParsed.dateStr && fallbackHdr.dateStr) hdrParsed.dateStr = fallbackHdr.dateStr;
          if (!hdrParsed.sellerTaxId && fallbackHdr.sellerTaxId) hdrParsed.sellerTaxId = fallbackHdr.sellerTaxId;
        }
        if (!invNo) {
          invNo = normalizeInvSafe(fullText + '\n' + (preScanText || ''));
        }
      }

      // v29 購買日期來源隔離與非空值合併：先移除 店:0417 雜訊，再從發票文字精準擷取日期與無橫槓發票號碼
      const receiptOnlyText = [headerText, invoiceZoneText, fullText, preScanText || '']
        .filter(Boolean)
        .join('\n')
        .replace(/店\s*[:：]?\s*\d{3,6}/g, ' ');
      const receiptOnlyParsed = parseReceiptAndWarrantyText(receiptOnlyText, '');

      let detectedDate = hdrParsed.dateStr || '';
      if (!detectedDate) {
        const hasRealDateInReceipt = /(202\d)\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}/.test(receiptOnlyText);
        if (hasRealDateInReceipt && receiptOnlyParsed.date) {
          detectedDate = receiptOnlyParsed.date;
        }
      }

      let detectedInvNo = invNo ? invNo.replace(/[\s-—–]+/g, '') : '';
      if (!detectedInvNo && receiptOnlyParsed.invoiceNo && !receiptOnlyParsed.invoiceNo.includes('請確認')) {
        detectedInvNo = receiptOnlyParsed.invoiceNo.replace(/[\s-—–]+/g, '');
      }

      mergeOcrSummaryFields('receipt', {
        date: detectedDate,
        invoiceNo: detectedInvNo,
        sellerTaxId: hdrParsed.sellerTaxId
      });

      setCardSmartStatus(
        `✅ 發票高解析 OCR 完成（Type A）\n日期：${cachedReceiptOcrInfo.date || '未讀出'} ｜ 發票號碼：${cachedReceiptOcrInfo.invoiceNo || '未讀出'} ｜ 統編：${cachedReceiptOcrInfo.sellerTaxId}`,
        false
      );
      setCanvasOcrPill(
        `✅ 發票辨識完成：${cachedReceiptOcrInfo.date || '-'} / ${cachedReceiptOcrInfo.invoiceNo || '-'}`,
        'success'
      );

      // v29: 強制即時寫入畫布左下角 5 行核對文字並重排三物件位置
      if (typeof syncSummaryTextLayer === 'function') {
        syncSummaryTextLayer(true);
      }
      if (typeof autoArrangeWorkbenchLayout === 'function') {
        autoArrangeWorkbenchLayout(false);
      }
    } catch (err) {
      console.warn('發票原圖高解析 OCR 失敗:', err);
      const errMsg = getOcrErrorDisplayMessage(err);
      setCardSmartStatus(errMsg, false);
      setCanvasOcrPill(errMsg, 'warning');
      showToast(errMsg);
    }
  });
}

/**
 * 串接發票與保卡 OCR 結果產生標準 5 行核對資訊
 */
function buildAutoFiveLineNoteText() {
  const cardLayer = getTargetWarrantyImageLayer();
  const isLgCard = !!(cardLayer && (cardLayer.cardTemplateId === 'lg_tw' || cardLayer.templateId === 'lg_tw'));
  const isMitsubishiCard = !!(cardLayer && (cardLayer.cardTemplateId === 'mitsubishi_tw' || cardLayer.templateId === 'mitsubishi_tw'));

  const cardModel = (isLgCard || isMitsubishiCard)
    ? (
        (cardLayer.ocrData && cardLayer.ocrData.model) ||
        (isLgCard ? cardLayer._lgVerifiedModel : cardLayer._mitsubishiVerifiedModel) ||
        (inputCardModel && inputCardModel.value.trim()) ||
        cachedReceiptOcrInfo.model ||
        'XXXXXXXX'
      )
    : ((inputCardModel && inputCardModel.value.trim()) || cachedReceiptOcrInfo.model || 'XXXXXXXX');

  const cardSerial = (isLgCard || isMitsubishiCard)
    ? (
        (cardLayer.ocrData && cardLayer.ocrData.serial) ||
        (isLgCard ? cardLayer._lgVerifiedSerial : cardLayer._mitsubishiVerifiedSerial) ||
        (inputCardSerial && inputCardSerial.value.trim()) ||
        cachedReceiptOcrInfo.serialNo ||
        'XXXXXXXXXXX'
      )
    : ((inputCardSerial && inputCardSerial.value.trim()) || cachedReceiptOcrInfo.serialNo || 'XXXXXXXXXXX');

  let brandName = cachedReceiptOcrInfo.brand || '國際';
  if (isLgCard) {
    brandName = 'LG';
  } else if (isMitsubishiCard) {
    brandName = '三菱';
  } else if (cardLayer && cardLayer.cardTemplateId && cardLayer.cardTemplateId.startsWith('panasonic')) {
    brandName = '國際';
  }

  let dateStr = cachedReceiptOcrInfo.date || 'YYYY-MM-DD';
  const invoiceNo = cachedReceiptOcrInfo.invoiceNo || 'XXXXXXXXXX';
  const sellerTaxId = cachedReceiptOcrInfo.sellerTaxId || '24721268';

  return [
    `發票購買日期 ${dateStr}`,
    `發票號碼 ${invoiceNo}`,
    `${brandName} ${cardModel}`,
    `機號 ${cardSerial}`,
    `賣方統編 ${sellerTaxId}`
  ].join('\n');
}

function resolveLayoutRoleLayers() {
  const rev = [...layers].reverse();
  const orderLayer = rev.find(l => l.docRole === 'order_sheet' || l.type === 'pdf_order') || null;
  const cardLayer =
    rev.find(l => l.type === 'image' && l.docRole === 'warranty_card') ||
    rev.find(l => l.type === 'image' && !l.docRole && (l.isRectifiedCard || l.cardTemplateId || (!l.isReceipt && l.width >= l.height))) ||
    null;
  const receiptLayer =
    rev.find(l => l.type === 'image' && l.docRole === 'receipt') ||
    rev.find(l => l.type === 'image' && !l.docRole && l !== cardLayer && (l.isReceipt || l.height > l.width)) ||
    null;
  return { orderLayer, cardLayer, receiptLayer };
}

/**
 * v28: 即時同步 OCR 辨識結果與手動修正欄位至畫布左下角 5 行核對文字圖層（嚴格以 docRole 配對）
 */
function syncSummaryTextLayer(forceUpdate = true) {
  const { orderLayer, cardLayer, receiptLayer } = resolveLayoutRoleLayers();

  let noteLayer = layers.find(l => l.isAutoFiveLineNote);
  if (!noteLayer && !cardLayer && !receiptLayer && !orderLayer) return null;

  const autoText = buildAutoFiveLineNoteText();

  if (!noteLayer) {
    noteLayer = createLayerObject({
      type: 'text',
      name: '5行核對資訊',
      text: autoText,
      color: '#0F172A',
      bold: true,
      fontSize: 60,
      isAutoFiveLineNote: true,
      userEdited: false
    });
    layers.push(noteLayer);
  } else if (!noteLayer.userEdited) {
    noteLayer.text = autoText;
  }

  if (inputNewNote && !noteLayer.userEdited) {
    inputNewNote.value = noteLayer.text;
  }

  const margin = 10;
  const usableW = canvasWidth - margin * 2;
  // v44: 鎖定下方保卡 70% + 間距 3% + 發票 27% 及左下 5 行大字為畫布原始固定寬度基準，絕不因訂購單尺寸變化縮小
  const baseFullW = usableW;
  const baseLeftX = margin;
  const leftColW = Math.round(baseFullW * 0.70);

  const cardLeftX = cardLayer ? (cardLayer.x - cardLayer.width / 2) : baseLeftX;
  const cardBottomY = cardLayer ? (cardLayer.y + cardLayer.height / 2) : (orderLayer ? (orderLayer.y + orderLayer.height / 2 + 24) : 20);
  const noteTopY = cardLayer ? (cardBottomY + 28) : cardBottomY;

  // v31: 放大左下角 5 行核對文字為 1.65 倍（於 3508px 畫布約 96px ~ 104px），嚴格限制最大寬度絕不越界壓到右側發票
  const maxNoteW = Math.round((cardLayer ? cardLayer.width : leftColW) * 0.96);
  const canvasScaleRatio = Math.max(0.75, canvasWidth / 3508);
  const targetStartFs = Math.round(104 * canvasScaleRatio);
  const minSafeFs = Math.round(44 * canvasScaleRatio);

  let bestFontSize = Math.round(98 * canvasScaleRatio);
  for (let fs = targetStartFs; fs >= minSafeFs; fs -= 2) {
    const box = measureFiveLineBox(noteLayer.text, fs, noteLayer.bold);
    if (box.width <= maxNoteW) {
      bestFontSize = fs;
      break;
    }
    bestFontSize = fs;
  }

  const finalBox = measureFiveLineBox(noteLayer.text, bestFontSize, noteLayer.bold);
  noteLayer.fontSize = bestFontSize;
  noteLayer.width = finalBox.width;
  noteLayer.height = finalBox.height;
  noteLayer.rotation = 0;
  noteLayer.x = Math.round(cardLeftX + finalBox.width / 2);
  noteLayer.y = Math.round(noteTopY + finalBox.height / 2);

  updateLayersListUI();
  render();
  return noteLayer;
}

/**
 * 衡量指定字體大小之多行文字區塊實際高度與寬度
 */
function measureFiveLineBox(text, fontSize, bold = true) {
  const measureCtx = canvas.getContext('2d');
  const weight = bold ? 'bold' : 'normal';
  measureCtx.font = `${weight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", "新細明體", sans-serif`;
  const lines = (text || '').split('\n');
  const lineHeight = fontSize * 1.35;
  let maxW = 0;
  lines.forEach(line => {
    const w = measureCtx.measureText(line).width;
    if (w > maxW) maxW = w;
  });
  return {
    width: Math.max(50, Math.round(maxW + 30)),
    height: Math.max(25, Math.round(lines.length * lineHeight + 15))
  };
}

/**
 * 頂部滿版訂購單＋自適應延伸不重疊排版引擎＋左下空白零拉長自動 5 行文字 (v23)
 */
function autoArrangeWorkbenchLayout(recordUndo = true) {
  if (layers.length === 0) {
    if (recordUndo) showToast('畫布尚無物件可排版');
    return;
  }

  if (recordUndo) {
    pushUndoState('自動智慧排版');
  }

  const margin = 10;
  const gapY = 24;
  const usableW = canvasWidth - margin * 2;

  const { orderLayer, cardLayer, receiptLayer } = resolveLayoutRoleLayers();

  let currentTopY = margin;

  // 1. 上方區塊：訂購單頂部橫向滿版擺放（左右各保留 10px 白邊，作為 100% 基準總寬度）
  if (orderLayer && orderLayer.image) {
    const oImg = orderLayer.image;
    const oAspect = oImg.width / Math.max(1, oImg.height);
    orderLayer.width = usableW;
    orderLayer.height = Math.round(usableW / oAspect);
    orderLayer.rotation = 0;
    orderLayer.x = Math.round(canvasWidth / 2);
    orderLayer.y = Math.round(currentTopY + orderLayer.height / 2);
    currentTopY = orderLayer.y + orderLayer.height / 2 + gapY;
  }

  // 2. 嚴格鎖定畫布基準寬度執行黃金比例排版：保卡 70% : 中間白縫 3% : 發票 27%（不隨訂購單縮減而縮小）(v32/v44)
  const baseFullW = usableW;
  const baseLeftX = margin;
  const baseRightX = baseLeftX + baseFullW;

  const leftColW = Math.round(baseFullW * 0.70);
  const gapX = Math.round(baseFullW * 0.03);
  const rightColW = baseFullW - leftColW - gapX; // 精準 27%

  let cardBottomY = currentTopY;
  let cardLeftX = baseLeftX;

  if (cardLayer && cardLayer.image) {
    const cImg = cardLayer.image;
    const cAspect = cImg.width / Math.max(1, cImg.height);
    cardLayer.width = leftColW;
    cardLayer.height = Math.round(leftColW / cAspect);
    cardLayer.rotation = 0;
    cardLayer.x = Math.round(baseLeftX + cardLayer.width / 2);
    cardLayer.y = Math.round(currentTopY + cardLayer.height / 2);
    cardLeftX = cardLayer.x - cardLayer.width / 2;
    cardBottomY = cardLayer.y + cardLayer.height / 2;

    // 同步重新定位並縮放附著於此保卡上的專櫃印章（v56: 若使用者已手動拖曳或縮放，保留其微調位置）
    layers.forEach(s => {
      if (s.type === 'stamp' && s.attachedCardId === cardLayer.id && s.image) {
        if (s.userMovedStamp) return;
        const spec = s.stampSpec || { centerX: 0.845, centerY: 0.395, widthRatio: 0.210, tiltRad: 0 };
        const sAspect = s.image.width / Math.max(1, s.image.height);
        s.width = Math.round(cardLayer.width * spec.widthRatio);
        s.height = Math.round(s.width / sAspect);
        const localDx = (spec.centerX - 0.5) * cardLayer.width;
        const localDy = (spec.centerY - 0.5) * cardLayer.height;
        s.x = Math.round(cardLayer.x + localDx);
        s.y = Math.round(cardLayer.y + localDy);
        s.rotation = spec.tiltRad || 0;
      }
    });
  }

  // 3. 下方右欄（27% 寬度）：發票，右緣切齊訂購單右緣、上緣對齊保卡上緣、完整呈現不裁切
  let receiptBottomY = currentTopY;
  if (receiptLayer && receiptLayer.image) {
    const rImg = receiptLayer.image;
    const rAspect = rImg.width / Math.max(1, rImg.height);
    receiptLayer.width = rightColW;
    receiptLayer.height = Math.round(rightColW / rAspect);
    receiptLayer.rotation = 0;
    receiptLayer.x = Math.round(baseRightX - receiptLayer.width / 2);
    receiptLayer.y = Math.round(currentTopY + receiptLayer.height / 2);
    receiptBottomY = receiptLayer.y + receiptLayer.height / 2;
  }

  // 4. 左側空白處「零拉長」自動填入 5 行核心核對文字（保卡正下方、對齊保卡左緣）
  let noteBottomY = cardBottomY;
  if (cardLayer || receiptLayer) {
    const syncedNote = syncSummaryTextLayer(false);
    if (syncedNote) {
      noteBottomY = syncedNote.y + syncedNote.height / 2;
    }
  }

  // 5. 白底畫布自適應延伸高度（三物件與文字絕不截斷、互不重疊）
  const contentBottom = Math.max(currentTopY, cardBottomY, receiptBottomY, noteBottomY);
  const requiredH = Math.max(2480, Math.ceil(contentBottom + 36));

  if (requiredH !== canvasHeight) {
    canvasHeight = requiredH;
    updateCanvasSizeUI();
    updateExportDimensionDisplay();
    fitCanvasToViewport();
  } else if (document.body.classList.contains('is-mobile-mode') && (!mobileEditingLayerId)) {
    fitCanvasToViewport();
  }

  updateLayersListUI();
  render();
  if (recordUndo) {
    showToast(`已完成頂部滿版＋不重疊自適應排版 (${canvasWidth} × ${canvasHeight})`);
  }
}

/**
 * 雙擊畫布文字圖層，於原位置開啟透明／微框 textarea 直接編輯 (v23)
 */
let activeInlineTextarea = null;

function openInlineTextEditor(layer) {
  if (!layer || (layer.type !== 'text' && layer.type !== 'overrideText')) return;
  if (activeInlineTextarea) {
    activeInlineTextarea.blur();
  }

  const origText = layer.text || '';
  const padX = layer.type === 'overrideText' ? 14 : 30;
  const padY = layer.type === 'overrideText' ? 8 : 15;
  const fontWeight = layer.fontWeight || (layer.bold ? 'bold' : 'normal');
  const fontFamily = layer.fontFamily
    ? `"${layer.fontFamily}", -apple-system, BlinkMacSystemFont, "Microsoft JhengHei", "新細明體", sans-serif`
    : '-apple-system, BlinkMacSystemFont, "Microsoft JhengHei", "新細明體", sans-serif';

  const textarea = document.createElement('textarea');
  textarea.className = 'inline-text-editor';
  textarea.value = origText;

  const boxW = Math.max(220, layer.width + 40);
  const boxH = Math.max(80, layer.height + 24);
  textarea.style.left = `${Math.round(layer.x - layer.width / 2)}px`;
  textarea.style.top = `${Math.round(layer.y - layer.height / 2)}px`;
  textarea.style.width = `${boxW}px`;
  textarea.style.height = `${boxH}px`;
  textarea.style.padding = `${padY / 2}px ${padX / 2}px`;
  textarea.style.fontSize = `${layer.fontSize}px`;
  textarea.style.lineHeight = '1.35';
  textarea.style.fontWeight = fontWeight;
  textarea.style.fontFamily = fontFamily;
  textarea.style.color = layer.color || '#000000';
  if (layer.rotation) {
    textarea.style.transformOrigin = `${Math.round(layer.width / 2)}px ${Math.round(layer.height / 2)}px`;
    textarea.style.transform = `rotate(${layer.rotation}rad)`;
  }

  layer._isInlineEditing = true;
  activeInlineTextarea = textarea;
  canvasWrapper.appendChild(textarea);
  render();

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, 0);

  let finished = false;
  function cleanup(commit) {
    if (finished) return;
    finished = true;
    layer._isInlineEditing = false;

    if (commit) {
      const nextText = textarea.value;
      if (nextText !== origText) {
        pushUndoState('原地編輯畫布文字');
        layer.text = nextText;
        layer.userEdited = true;
        const prefix = layer.type === 'overrideText' ? '覆寫' : '備註';
        layer.name = `${prefix}: ${nextText.slice(0, 8)}...`;
        if (editTextContent && activeLayer === layer) {
          editTextContent.value = nextText;
        }
        if (layer.isAutoFiveLineNote && inputNewNote) {
          inputNewNote.value = nextText;
        }
        updateLayersListUI();
        showToast('已更新畫布文字內容');
      }
    }

    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
    if (activeInlineTextarea === textarea) {
      activeInlineTextarea = null;
    }
    render();
  }

  function autoGrow() {
    textarea.style.height = 'auto';
    textarea.style.width = 'auto';
    const nextW = Math.max(boxW, textarea.scrollWidth + 24);
    const nextH = Math.max(boxH, textarea.scrollHeight + 12);
    textarea.style.width = `${nextW}px`;
    textarea.style.height = `${nextH}px`;
  }

  textarea.addEventListener('input', autoGrow);

  textarea.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanup(false);
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      cleanup(true);
    }
  });

  textarea.addEventListener('blur', () => {
    cleanup(true);
  });
}

// =============================================================================
// 10. 手機端自動偵測與極簡工作流控制 (v38)
// =============================================================================
const MOBILE_UI_MODE_STORAGE_KEY = 'order_collage_ui_mode';

function isAutoMobileTouchViewport() {
  const narrow = window.innerWidth <= 768;
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const touchPts = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  return narrow && (coarse || touchPts);
}

function detectMobileWorkbenchMode() {
  let override = '';
  try {
    override = sessionStorage.getItem(MOBILE_UI_MODE_STORAGE_KEY) || '';
  } catch (e) {}

  const autoMobile = isAutoMobileTouchViewport();
  const shouldUseMobile = override === 'mobile' ? true : (override === 'desktop' ? false : autoMobile);
  const prevMobile = document.body.classList.contains('is-mobile-mode');

  document.body.classList.toggle('is-mobile-mode', shouldUseMobile);

  if (btnHeaderSwitchMobile) {
    const showReturnMobileBtn = !shouldUseMobile && (autoMobile || override === 'desktop');
    btnHeaderSwitchMobile.classList.toggle('hidden', !showReturnMobileBtn);
  }

  if (prevMobile !== shouldUseMobile) {
    if (!shouldUseMobile && typeof exitMobileEditMode === 'function') {
      exitMobileEditMode(true);
    }
    requestAnimationFrame(() => {
      if (typeof fitCanvasToViewport === 'function') {
        fitCanvasToViewport();
      }
    });
  }
}

function getMobileEditingStampLayer() {
  if (!mobileEditingLayerId) return null;
  return layers.find(l => l.id === mobileEditingLayerId && l.type === 'stamp') || null;
}

function enterMobileStampEditMode(stampLayer) {
  if (!stampLayer || stampLayer.type !== 'stamp') return;
  mobileEditingLayerId = stampLayer.id;
  setActiveLayer(stampLayer);
  if (typeof syncBlueToneDisplayValues === 'function') {
    syncBlueToneDisplayValues(getCurrentStampBlueTone());
  }
  if (mobileStampEditBar) {
    mobileStampEditBar.classList.remove('hidden');
  }
  render();
  requestAnimationFrame(() => {
    if (document.body.classList.contains('is-mobile-mode') && mobileEditingLayerId === stampLayer.id) {
      // 微調可見區避免編輯列遮擋底端；若為一般位置則保持檢視穩定
      showToast('進入印章編輯中：單指拖曳位置、雙指縮放大小');
    }
  });
}

function exitMobileEditMode(silent = false) {
  const wasEditing = !!mobileEditingLayerId;
  mobileEditingLayerId = null;
  if (mobileStampEditBar) {
    mobileStampEditBar.classList.add('hidden');
  }
  if (wasEditing) {
    render();
    if (!silent) {
      showToast('已結束印章編輯，恢復安全預覽模式');
    }
  }
}

function isPointNearBakedStampOnCard(cardLayer, coords) {
  if (!cardLayer || !cardLayer.hasBakedStamp || !cardLayer.rectifiedCleanCanvas) return false;
  const spec = (cardLayer.bakedStampMeta && cardLayer.bakedStampMeta.stampSpec) || {
    centerX: 0.845,
    centerY: 0.395,
    widthRatio: 0.210
  };
  const stampW = cardLayer.width * (spec.widthRatio || 0.210);
  const stampH = stampW * 0.72;
  const cx = cardLayer.x + (spec.centerX - 0.5) * cardLayer.width;
  const cy = cardLayer.y + (spec.centerY - 0.5) * cardLayer.height;
  const tolX = Math.max(stampW * 0.85, 75 / currentZoom);
  const tolY = Math.max(stampH * 0.95, 75 / currentZoom);
  return Math.abs(coords.x - cx) <= tolX && Math.abs(coords.y - cy) <= tolY;
}

async function extractBakedStampToStandaloneLayer(cardLayer) {
  if (!cardLayer || !cardLayer.rectifiedCleanCanvas) return null;
  const meta = cardLayer.bakedStampMeta || {};
  const spec = meta.stampSpec || {
    centerX: 0.845,
    centerY: 0.395,
    widthRatio: 0.210,
    tiltRangeDeg: 1.5
  };
  const dateStr = meta.dateStr || confirmedSessionStampDate || (inputStampDate && inputStampDate.value.trim()) || '115.11.21';
  const fontSize = meta.fontSize || (sliderStampFontSize && parseInt(sliderStampFontSize.value, 10)) || DEFAULT_STAMP_FONT_SIZE;
  const offsetY = meta.offsetY !== undefined ? meta.offsetY : ((sliderStampOffsetY && parseInt(sliderStampOffsetY.value, 10)) || 0);

  try {
    const stampImg = await ensureStampImageLoaded();
    pushUndoState('解除固定並編輯保卡印章');
    cardLayer.image = cardLayer.rectifiedCleanCanvas;
    cardLayer.warpedImage = cardLayer.rectifiedCleanCanvas;
    cardLayer.hasBakedStamp = false;

    const stampRatio = stampImg.height / Math.max(1, stampImg.width);
    const displayW = Math.round(cardLayer.width * (spec.widthRatio || 0.210));
    const displayH = Math.round(displayW * stampRatio);
    const posX = Math.round(cardLayer.x + (spec.centerX - 0.5) * cardLayer.width);
    const posY = Math.round(cardLayer.y + (spec.centerY - 0.5) * cardLayer.height);

    const extractedStamp = createLayerObject({
      type: 'stamp',
      name: `專櫃印章 (${dateStr})`,
      image: stampImg,
      rawImage: stampImg,
      blendMode: 'multiply',
      width: displayW,
      height: displayH,
      x: posX,
      y: posY,
      rotation: 0
    });
    extractedStamp.stampDate = dateStr;
    extractedStamp.stampFontSize = fontSize;
    extractedStamp.stampOffsetY = offsetY;

    const cardIdx = layers.indexOf(cardLayer);
    if (cardIdx >= 0) {
      layers.splice(cardIdx + 1, 0, extractedStamp);
    } else {
      layers.push(extractedStamp);
    }
    if (typeof refreshSingleStandaloneStampLayer === 'function') {
      await refreshSingleStandaloneStampLayer(extractedStamp, true);
    }
    updateMobileWorkflowBadges();
    render();
    return extractedStamp;
  } catch (err) {
    console.error('轉換保卡印章為可編輯圖層失敗:', err);
    return null;
  }
}

let activeMobileEditingTextLayer = null;

function openMobileTextEditModal(textLayer) {
  if (!textLayer || !mobileTextEditModalBackdrop || !mobileTextEditTextarea) return;
  if (typeof exitMobileEditMode === 'function') {
    exitMobileEditMode(true);
  }
  activeMobileEditingTextLayer = textLayer;
  mobileTextEditTextarea.value = textLayer.text || '';
  mobileTextEditModalBackdrop.classList.remove('hidden');
  setTimeout(() => {
    mobileTextEditTextarea.focus();
    mobileTextEditTextarea.setSelectionRange(mobileTextEditTextarea.value.length, mobileTextEditTextarea.value.length);
  }, 30);
}

async function handleMobileCanvasDoubleTap(coords) {
  if (!coords) return;
  const tapTol = 44 / currentZoom;

  // 1. 優先偵測獨立專櫃印章圖層
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (l.type === 'stamp') {
      const localP = getLayerLocalCoords(l, coords.x, coords.y);
      if (Math.abs(localP.x) <= l.width / 2 + tapTol && Math.abs(localP.y) <= l.height / 2 + tapTol) {
        enterMobileStampEditMode(l);
        return;
      }
    }
  }

  // 2. 次偵測已合成於保卡上的專櫃印章區域（自動轉為獨立可編輯 Multiply 圖層）
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (l.type === 'image' && l.hasBakedStamp && isPointNearBakedStampOnCard(l, coords)) {
      const extracted = await extractBakedStampToStandaloneLayer(l);
      if (extracted) {
        enterMobileStampEditMode(extracted);
      }
      return;
    }
  }

  // 3. 偵測左下角 5 行核對文字或其他文字圖層
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (l.type === 'text' || l.type === 'overrideText') {
      const localP = getLayerLocalCoords(l, coords.x, coords.y);
      if (Math.abs(localP.x) <= l.width / 2 + tapTol && Math.abs(localP.y) <= l.height / 2 + tapTol) {
        openMobileTextEditModal(l);
        return;
      }
    }
  }

  // 4. 若目前在印章編輯中且雙擊空白區，退出編輯；平時看圖模式雙擊空白區則恢復滿版置中檢視 (v42)
  if (getMobileEditingStampLayer()) {
    exitMobileEditMode(false);
  } else if (document.body.classList.contains('is-mobile-mode')) {
    fitMobileCanvasToViewport();
    showToast('已恢復整張畫布滿版置中檢視');
  }
}

let hasShownMobileThreePieceComplete = false;
let mobileCompleteFadeTimer = null;
let mobileCompleteHideTimer = null;

function resetMobileCompletionOverlayState() {
  hasShownMobileThreePieceComplete = false;
  if (mobileCompleteFadeTimer) {
    clearTimeout(mobileCompleteFadeTimer);
    mobileCompleteFadeTimer = null;
  }
  if (mobileCompleteHideTimer) {
    clearTimeout(mobileCompleteHideTimer);
    mobileCompleteHideTimer = null;
  }
  if (mobileCompleteOverlay) {
    mobileCompleteOverlay.classList.add('hidden');
    mobileCompleteOverlay.classList.remove('show', 'fade-out');
  }
}

function showMobileThreePieceCompleteOverlay() {
  if (!mobileCompleteOverlay) return;
  if (mobileCompleteFadeTimer) clearTimeout(mobileCompleteFadeTimer);
  if (mobileCompleteHideTimer) clearTimeout(mobileCompleteHideTimer);

  mobileCompleteOverlay.classList.remove('hidden', 'fade-out', 'show');
  void mobileCompleteOverlay.offsetWidth;
  mobileCompleteOverlay.classList.add('show');

  // 淡入 0.25s + 停留 1.5s = 1.75s 後開始 0.4s 平滑淡出
  mobileCompleteFadeTimer = setTimeout(() => {
    mobileCompleteOverlay.classList.remove('show');
    mobileCompleteOverlay.classList.add('fade-out');
    mobileCompleteHideTimer = setTimeout(() => {
      mobileCompleteOverlay.classList.add('hidden');
      mobileCompleteOverlay.classList.remove('fade-out');
    }, 420);
  }, 1750);
}

function checkAndShowMobileCompletionOverlay() {
  if (!document.body.classList.contains('is-mobile-mode') || hasShownMobileThreePieceComplete) return;
  const hasOrder = layers.some(l => l.type === 'pdf_order' || l.docRole === 'order_sheet');
  const hasCard = layers.some(l => l.type === 'image' && (l.docRole === 'warranty_card' || l.isRectifiedCard));
  const hasReceipt = layers.some(l => l.type === 'image' && (l.docRole === 'receipt' || l.isReceipt));
  const isCardStamped = layers.some(l => l.hasBakedStamp) || layers.some(l => l.type === 'stamp');
  if (hasOrder && hasCard && hasReceipt && isCardStamped) {
    hasShownMobileThreePieceComplete = true;
    requestAnimationFrame(() => {
      showMobileThreePieceCompleteOverlay();
    });
  }
}

function updateMobileWorkflowBadges() {
  const hasOrder = layers.some(l => l.type === 'pdf_order' || l.docRole === 'order_sheet');
  const cardLayers = layers.filter(l => l.type === 'image' && (l.docRole === 'warranty_card' || l.isRectifiedCard));
  const hasCard = cardLayers.length > 0;
  const hasReceipt = layers.some(l => l.type === 'image' && (l.docRole === 'receipt' || l.isReceipt));

  if (!hasOrder || !hasCard || !hasReceipt) {
    hasShownMobileThreePieceComplete = false;
  }

  if (mBadgeOrder) mBadgeOrder.classList.toggle('done', hasOrder);
  if (mBadgeCard) mBadgeCard.classList.toggle('done', hasCard);
  if (mBadgeReceipt) mBadgeReceipt.classList.toggle('done', hasReceipt);

  if (btnMobileStampShortcut) {
    const hasUnstampedCard = cardLayers.some(c => !c.hasBakedStamp);
    const hasStandaloneStamp = layers.some(l => l.type === 'stamp');
    btnMobileStampShortcut.classList.toggle('hidden', !(hasUnstampedCard && !hasStandaloneStamp));
  }
}

async function placeMobileStandaloneStampOnCard() {
  let dateStr = confirmedSessionStampDate || '';
  if (!dateStr && typeof openStampDatePromptIfNeeded === 'function') {
    dateStr = await openStampDatePromptIfNeeded();
  }
  if (!dateStr) {
    dateStr = (inputStampDate && inputStampDate.value.trim()) || '115.11.21';
  }

  const fontSize = (sliderStampFontSize && parseInt(sliderStampFontSize.value, 10)) || DEFAULT_STAMP_FONT_SIZE;
  const offsetY = (sliderStampOffsetY && parseInt(sliderStampOffsetY.value, 10)) || 0;
  const targetCard = typeof getTargetWarrantyImageLayer === 'function' ? getTargetWarrantyImageLayer() : null;

  try {
    const stampImg = await ensureStampImageLoaded();
    const stampRatio = stampImg.height / Math.max(1, stampImg.width);
    const displayW = targetCard ? Math.max(360, Math.round(targetCard.width * 0.23)) : 560;
    const displayH = Math.round(displayW * stampRatio);
    const posX = targetCard ? Math.round(targetCard.x + targetCard.width * 0.28) : Math.round(canvasWidth * 0.44);
    const posY = targetCard ? Math.round(targetCard.y + targetCard.height * 0.05) : Math.round(canvasHeight * 0.65);

    const newStamp = createLayerObject({
      type: 'stamp',
      name: `專櫃印章 (${dateStr})`,
      image: stampImg,
      rawImage: stampImg,
      blendMode: 'multiply',
      width: displayW,
      height: displayH,
      x: posX,
      y: posY
    });
    newStamp.stampDate = dateStr;
    newStamp.stampFontSize = fontSize;
    newStamp.stampOffsetY = offsetY;

    pushUndoState('手機蓋上專櫃印章');
    layers.push(newStamp);
    if (typeof refreshSingleStandaloneStampLayer === 'function') {
      await refreshSingleStandaloneStampLayer(newStamp, true);
    }
    setActiveLayer(newStamp);
    updateMobileWorkflowBadges();
    if (document.body.classList.contains('is-mobile-mode')) {
      enterMobileStampEditMode(newStamp);
      if (typeof checkAndShowMobileCompletionOverlay === 'function') {
        checkAndShowMobileCompletionOverlay();
      }
    } else {
      render();
      showToast('已蓋上專櫃印章！可單指拖曳調整位置，放開自動融合紙張光影');
    }
  } catch (err) {
    console.error('手機快捷蓋章失敗:', err);
    showToast('印章載入失敗，請檢查 stamp_data.js');
  }
}

function initMobileWorkbenchControls() {
  if (btnMobileSelectPdf && mobilePdfInput) {
    btnMobileSelectPdf.addEventListener('click', () => mobilePdfInput.click());
    mobilePdfInput.addEventListener('change', e => {
      const pickedFiles = Array.from(e.target.files || []);
      mobilePdfInput.value = '';
      if (pickedFiles.length > 0) {
        handleFiles(pickedFiles);
      }
    });
  }

  if (btnMobileSelectPhotos && mobilePhotoInput) {
    btnMobileSelectPhotos.addEventListener('click', () => mobilePhotoInput.click());
    mobilePhotoInput.addEventListener('change', e => {
      const pickedFiles = Array.from(e.target.files || []);
      mobilePhotoInput.value = '';
      if (pickedFiles.length > 0) {
        handleFiles(pickedFiles);
      }
    });
  }

  if (btnMobileClear) {
    btnMobileClear.addEventListener('click', () => clearWorkbenchSession(true));
  }

  if (btnMobileStampShortcut) {
    btnMobileStampShortcut.addEventListener('click', () => {
      placeMobileStandaloneStampOnCard();
    });
  }

  if (btnMobileDownload) {
    btnMobileDownload.addEventListener('click', async () => {
      const res = await buildExportPngBlob();
      if (!res) return;
      triggerPngBlobDownload(res.blob, res.filename, res.finalW, res.finalH);
    });
  }

  if (btnMobileShare) {
    btnMobileShare.addEventListener('click', async () => {
      const res = await buildExportPngBlob();
      if (!res) return;

      const fileObj = new File([res.blob], res.filename, { type: 'image/png' });
      const canNativeShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        (!navigator.canShare || navigator.canShare({ files: [fileObj] }));

      if (canNativeShare) {
        try {
          await navigator.share({
            files: [fileObj],
            title: res.filename
          });
          showToast('已完成系統分享 / 傳送');
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }

      triggerPngBlobDownload(res.blob, res.filename, res.finalW, res.finalH);
    });
  }

  if (btnMobileSwitchDesktop) {
    btnMobileSwitchDesktop.addEventListener('click', () => {
      try {
        sessionStorage.setItem(MOBILE_UI_MODE_STORAGE_KEY, 'desktop');
      } catch (e) {}
      detectMobileWorkbenchMode();
      showToast('已切換為完整電腦版工具列');
    });
  }

  if (btnHeaderSwitchMobile) {
    btnHeaderSwitchMobile.addEventListener('click', () => {
      try {
        sessionStorage.setItem(MOBILE_UI_MODE_STORAGE_KEY, 'mobile');
      } catch (e) {}
      detectMobileWorkbenchMode();
      showToast('已切回手機極簡自動模式');
    });
  }

  if (mobileBlueToneSlider) {
    mobileBlueToneSlider.addEventListener('input', () => {
      if (typeof applyBlueToneSliderValue === 'function') {
        applyBlueToneSliderValue(mobileBlueToneSlider.value);
      }
    });
  }

  if (btnMobileChangeStampDate) {
    btnMobileChangeStampDate.addEventListener('click', () => {
      const editStamp = getMobileEditingStampLayer();
      if (!editStamp) return;
      const curDate = editStamp.stampDate || confirmedSessionStampDate || (inputStampDate && inputStampDate.value.trim()) || '';
      openStampDateEditDialog(curDate, async newDateStr => {
        if (!layers.includes(editStamp)) return;
        pushUndoState('修改保卡印章日期');
        editStamp.stampDate = newDateStr;
        if (inputStampDate) inputStampDate.value = newDateStr;
        await refreshSingleStandaloneStampLayer(editStamp, false);
        setActiveLayer(editStamp);
        render();
        showToast(`已更新印章日期為 ${newDateStr}`);
      });
    });
  }

  if (btnMobileResetBlueTone) {
    btnMobileResetBlueTone.addEventListener('click', () => {
      if (typeof resetBlueToneToDefault === 'function') {
        resetBlueToneToDefault(true);
      }
    });
  }

  if (btnMobileDoneEdit) {
    btnMobileDoneEdit.addEventListener('click', () => {
      exitMobileEditMode(false);
    });
  }

  if (btnCancelMobileTextEdit && mobileTextEditModalBackdrop) {
    btnCancelMobileTextEdit.addEventListener('click', () => {
      activeMobileEditingTextLayer = null;
      mobileTextEditModalBackdrop.classList.add('hidden');
    });
  }

  if (btnConfirmMobileTextEdit && mobileTextEditModalBackdrop && mobileTextEditTextarea) {
    btnConfirmMobileTextEdit.addEventListener('click', () => {
      const targetLayer = activeMobileEditingTextLayer;
      const nextText = mobileTextEditTextarea.value;
      activeMobileEditingTextLayer = null;
      mobileTextEditModalBackdrop.classList.add('hidden');

      if (!targetLayer || !layers.includes(targetLayer)) return;
      if (nextText !== targetLayer.text) {
        pushUndoState('手機編輯核對文字');
        targetLayer.text = nextText;
        targetLayer.userEdited = true;
        const prefix = targetLayer.type === 'overrideText' ? '覆寫' : '備註';
        targetLayer.name = `${prefix}: ${nextText.slice(0, 8)}...`;

        if (targetLayer.isAutoFiveLineNote) {
          if (inputNewNote) inputNewNote.value = nextText;
          if (typeof syncSummaryTextLayer === 'function') {
            syncSummaryTextLayer(false);
          }
          if (typeof autoArrangeWorkbenchLayout === 'function') {
            autoArrangeWorkbenchLayout(false);
          }
        } else {
          updateLayersListUI();
          render();
        }
        showToast('已更新文字內容並重繪排版');
      }
    });
  }

  const handleMobileViewportRefit = () => {
    detectMobileWorkbenchMode();
    if (document.body.classList.contains('is-mobile-mode') && !getMobileEditingStampLayer()) {
      fitCanvasToViewport();
    }
  };

  window.addEventListener('resize', handleMobileViewportRefit);
  window.addEventListener('orientationchange', () => {
    setTimeout(handleMobileViewportRefit, 120);
  });
}

// =============================================================================
// 11. 純前端極簡淺灰全螢幕隱形時間鎖（電腦「...」/盲打 ＋ 手機三連擊/數字鍵盤）(v36/v38)
// =============================================================================
(function initStealthTimeLock() {
  const SESSION_KEY = 'order_collage_unlocked';
  const overlay = document.getElementById('stealthTimeLockOverlay');
  if (!overlay) return;

  let isAlreadyUnlocked = false;
  try {
    isAlreadyUnlocked = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch (e) {
    isAlreadyUnlocked = false;
  }

  if (isAlreadyUnlocked) {
    overlay.classList.add('hidden');
    return;
  }

  let isLocked = true;
  let digitBuffer = '';
  let dotStreak = 0;
  let touchTapStreak = 0;
  let lastTouchTapTs = 0;
  const dots = overlay.querySelectorAll('.stealth-dot');
  const mobileNumericInput = document.getElementById('stealthMobileNumericInput');

  const updateDotsUI = () => {
    const filledCount = Math.min(4, digitBuffer.length);
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('filled', i < filledCount);
    }
  };

  const focusStealthOverlay = () => {
    if (!isLocked) return;
    const isCoarseTouch =
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && window.innerWidth <= 768);
    if (mobileNumericInput && isCoarseTouch) {
      try {
        mobileNumericInput.focus({ preventScroll: true });
      } catch (e) {
        mobileNumericInput.focus();
      }
      return;
    }
    if (document.activeElement && document.activeElement !== overlay && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    try {
      overlay.focus({ preventScroll: true });
    } catch (e) {
      overlay.focus();
    }
    if (typeof window.focus === 'function') {
      window.focus();
    }
  };

  const isMatchingSystemTimeCode = code4 => {
    if (!/^\d{4}$/.test(code4)) return false;
    const nowMs = Date.now();
    for (let offsetMin = -2; offsetMin <= 2; offsetMin++) {
      const d = new Date(nowMs + offsetMin * 60000);
      const h24 = d.getHours();
      const mm = String(d.getMinutes()).padStart(2, '0');
      const code24 = String(h24).padStart(2, '0') + mm;
      const h12raw = h24 % 12;
      const h12 = h12raw === 0 ? 12 : h12raw;
      const code12 = String(h12).padStart(2, '0') + mm;
      if (code4 === code24 || code4 === code12) {
        return true;
      }
    }
    return false;
  };

  const unlockStealthLock = () => {
    if (!isLocked) return;
    isLocked = false;
    digitBuffer = '';
    dotStreak = 0;
    touchTapStreak = 0;
    if (mobileNumericInput) {
      mobileNumericInput.value = '';
      mobileNumericInput.blur();
    }
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {}
    overlay.classList.add('hidden');
    window.removeEventListener('keydown', onStealthKeyDown, true);
    overlay.removeEventListener('mousedown', onStealthPointerFocus);
    overlay.removeEventListener('click', onStealthPointerFocus);
    overlay.removeEventListener('touchend', onStealthTouchEnd);
    overlay.removeEventListener('dragover', onStealthBlockDragDrop);
    overlay.removeEventListener('drop', onStealthBlockDragDrop);
    if (document.body.classList.contains('is-mobile-mode') && typeof fitCanvasToViewport === 'function') {
      requestAnimationFrame(fitCanvasToViewport);
      setTimeout(() => {
        if (document.body.classList.contains('is-mobile-mode') && typeof fitCanvasToViewport === 'function') {
          fitCanvasToViewport();
        }
      }, 160);
    }
  };

  const onStealthPointerFocus = e => {
    if (!isLocked) return;
    if (e.target !== mobileNumericInput) {
      e.preventDefault();
    }
    e.stopPropagation();
    focusStealthOverlay();
  };

  const onStealthTouchEnd = e => {
    if (!isLocked) return;
    const now = Date.now();
    if (now - lastTouchTapTs < 450) {
      touchTapStreak += 1;
    } else {
      touchTapStreak = 1;
    }
    lastTouchTapTs = now;

    if (touchTapStreak >= 3) {
      e.preventDefault();
      e.stopPropagation();
      unlockStealthLock();
      return;
    }

    if (mobileNumericInput) {
      try {
        mobileNumericInput.focus({ preventScroll: true });
      } catch (err) {
        mobileNumericInput.focus();
      }
    }
  };

  const onStealthBlockDragDrop = e => {
    if (!isLocked) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const extractDigitFromKeyEvent = e => {
    if (/^[0-9]$/.test(e.key)) return e.key;
    if (e.code && /^Digit([0-9])$/.test(e.code)) return e.code.slice(5);
    if (e.code && /^Numpad([0-9])$/.test(e.code)) return e.code.slice(6);
    return '';
  };

  const onStealthKeyDown = e => {
    if (!isLocked) return;

    // 保留 F5 / F12 / Ctrl+R 重整開發能力，其餘按鍵一律於最高優先級攔截防誤觸快捷鍵
    const isRefreshShortcut =
      e.key === 'F5' ||
      e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'));
    if (!isRefreshShortcut) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 軌道 B（最高優先級無條件通行）：連續按 3 次點號 '.' / Period / NumpadDecimal 立即解鎖
    const isDotKey = e.key === '.' || e.code === 'Period' || e.code === 'NumpadDecimal';
    if (isDotKey) {
      dotStreak += 1;
      if (dotStreak >= 3) {
        unlockStealthLock();
      }
      return;
    }

    // 非點號即重設連續點號計數，但保留軌道 A 數字滑動緩衝
    dotStreak = 0;

    // 軌道 A（4 碼時間盲打＋自動滑動覆蓋＋前後 2 分鐘 12h/24h 容錯）
    const digit = extractDigitFromKeyEvent(e);
    if (digit) {
      digitBuffer = (digitBuffer + digit).slice(-4);
      if (mobileNumericInput && document.activeElement === mobileNumericInput) {
        mobileNumericInput.value = digitBuffer;
      }
      updateDotsUI();
      if (digitBuffer.length === 4 && isMatchingSystemTimeCode(digitBuffer)) {
        unlockStealthLock();
      }
    }
  };

  if (mobileNumericInput) {
    mobileNumericInput.addEventListener('input', () => {
      if (!isLocked) return;
      const cleaned = (mobileNumericInput.value || '').replace(/\D/g, '');
      if (cleaned) {
        dotStreak = 0;
        digitBuffer = cleaned.slice(-4);
        mobileNumericInput.value = digitBuffer;
      } else {
        digitBuffer = '';
      }
      updateDotsUI();
      if (digitBuffer.length === 4 && isMatchingSystemTimeCode(digitBuffer)) {
        unlockStealthLock();
      }
    });
  }

  window.addEventListener('keydown', onStealthKeyDown, { capture: true });
  overlay.addEventListener('mousedown', onStealthPointerFocus);
  overlay.addEventListener('click', onStealthPointerFocus);
  overlay.addEventListener('touchend', onStealthTouchEnd, { passive: false });
  overlay.addEventListener('dragover', onStealthBlockDragDrop);
  overlay.addEventListener('drop', onStealthBlockDragDrop);

  updateDotsUI();
  setTimeout(focusStealthOverlay, 0);
})();
