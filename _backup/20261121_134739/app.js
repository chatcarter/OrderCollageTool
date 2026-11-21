/**
 * 訂單、保卡與發票拼貼工作台 - HTML5 Canvas 互動核心
 * 解析度: 1600 x 1130 px (橫向 A4)
 * 印章色碼: #003FBC
 */

// --- 全域變數與畫布初始化 ---
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1130;

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const canvasWrapper = document.getElementById('canvasWrapper');
const canvasViewport = document.getElementById('canvasViewport');
const dropOverlay = document.getElementById('dropOverlay');

// 圖層陣列 (由下而上繪製，index 0 為最底層)
let layers = [];
let activeLayer = null;

// 互動狀態
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

// 動態控制面板
const noSelectionHint = document.getElementById('noSelectionHint');
const selectionControls = document.getElementById('selectionControls');
const activeTypeName = document.getElementById('activeTypeName');
const pdfControls = document.getElementById('pdfControls');
const sliderPdfCrop = document.getElementById('sliderPdfCrop');
const pdfCropVal = document.getElementById('pdfCropVal');
const btnResetPdfCrop = document.getElementById('btnResetPdfCrop');

const imagePerspectiveControls = document.getElementById('imagePerspectiveControls');
const btnToggleCornerMode = document.getElementById('btnToggleCornerMode');
const btnApplyWarp = document.getElementById('btnApplyWarp');
const btnRevertWarp = document.getElementById('btnRevertWarp');
const cornerCalibrationNotice = document.getElementById('cornerCalibrationNotice');

const imageEnhanceControls = document.getElementById('imageEnhanceControls');
const switchScanEnhance = document.getElementById('switchScanEnhance');
const enhanceSliders = document.getElementById('enhanceSliders');
const sliderShadow = document.getElementById('sliderShadow');
const valShadow = document.getElementById('valShadow');
const sliderBrightness = document.getElementById('sliderBrightness');
const valBrightness = document.getElementById('valBrightness');
const sliderContrast = document.getElementById('sliderContrast');
const valContrast = document.getElementById('valContrast');

const textControls = document.getElementById('textControls');
const editTextContent = document.getElementById('editTextContent');
const btnTextBold = document.getElementById('btnTextBold');

// 快速變形控制
const btnRotateCCW = document.getElementById('btnRotateCCW');
const btnRotateCW = document.getElementById('btnRotateCW');
const btnFlipH = document.getElementById('btnFlipH');
const btnCenterObj = document.getElementById('btnCenterObj');
const btnDeleteActive = document.getElementById('btnDeleteActive');

// 印章區塊
const inputStampDate = document.getElementById('inputStampDate');
const btnAddStamp = document.getElementById('btnAddStamp');

// 備註文字區塊
const inputNewNote = document.getElementById('inputNewNote');
const btnNewNoteBold = document.getElementById('btnNewNoteBold');
const btnAddNote = document.getElementById('btnAddNote');
let newNoteColor = '#000000';
let newNoteIsBold = false;

// 匯出區塊
const inputExportName = document.getElementById('inputExportName');
const btnExportPng = document.getElementById('btnExportPng');

// --- 初始化執行 ---
window.addEventListener('DOMContentLoaded', () => {
  initMinguoDate();
  fitCanvasToViewport();
  render();
  setupEventListeners();
  checkBackendHealth();
});

// 初始化民國年日期
function initMinguoDate() {
  const now = new Date();
  const minguoYear = now.getFullYear() - 1911;
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const defaultDate = `${minguoYear}.${m}.${d}`;
  inputStampDate.value = defaultDate;
}

// 檢查後端健康狀態
async function checkBackendHealth() {
  try {
    const res = await fetch('/api/stamp');
    if (res.ok) {
      console.log('後端服務連線正常');
    }
  } catch (err) {
    console.warn('目前以離線單機模式執行');
  }
}

// --- 縮放與視窗適應 ---
function setZoom(zoom) {
  currentZoom = Math.max(0.2, Math.min(2.5, zoom));
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

window.addEventListener('resize', () => {
  fitCanvasToViewport();
});

// --- 座標轉換 (螢幕座標 -> 1600x1130 畫布真實座標) ---
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX;
  const clientY = e.clientY;
  const x = (clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const y = (clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
  return { x, y };
}

// --- 圖層物件定義 ---
function createLayerObject(options) {
  return {
    id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    type: options.type || 'image', // 'pdf_order' | 'image' | 'stamp' | 'text'
    name: options.name || '未命名物件',
    x: options.x !== undefined ? options.x : CANVAS_WIDTH / 2,
    y: options.y !== undefined ? options.y : CANVAS_HEIGHT / 2,
    width: options.width || 400,
    height: options.height || 300,
    rotation: options.rotation || 0, // radians
    flipH: false,
    image: options.image || null,
    rawImage: options.rawImage || options.image || null,
    // PDF 專用
    pdfId: options.pdfId || null,
    cropRatio: options.cropRatio || 0.6,
    origPdfCropRatio: options.cropRatio || 0.6,
    // 透視校正專用
    cornerMode: false,
    corners: null, // [ {x, y}, ... ] 相對於原始未旋轉圖片的頂點
    // 掃描美化專用 (預設關閉)
    scanEnhance: false,
    shadowStrength: 70,
    brightness: 0,
    contrast: 120,
    // 文字物件專用
    text: options.text || '',
    color: options.color || '#000000',
    bold: options.bold || false,
    fontSize: options.fontSize || 36
  };
}

// --- 畫布繪製核心 (Render Pipeline) ---
function render(isExporting = false) {
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. 純白工作畫布底色
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. 依圖層順序 (0 為底層) 逐一繪製
  layers.forEach(layer => {
    ctx.save();
    ctx.translate(layer.x, layer.y);
    ctx.rotate(layer.rotation);
    if (layer.flipH) {
      ctx.scale(-1, 1);
    }

    if (layer.type === 'text') {
      drawTextLayer(layer);
    } else if (layer.image && layer.image.complete) {
      ctx.drawImage(
        layer.image,
        -layer.width / 2,
        -layer.height / 2,
        layer.width,
        layer.height
      );

      // 若處於四點角點校正模式，繪製角點標籤與引導多邊形
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
  
  // 計算總寬高以居中對齊
  let maxWidth = 0;
  lines.forEach(line => {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  });
  const totalHeight = lines.length * lineHeight;

  layer.width = Math.max(80, maxWidth + 20);
  layer.height = Math.max(40, totalHeight + 10);

  const startX = -layer.width / 2 + 10;
  const startY = -layer.height / 2 + 5;

  lines.forEach((line, idx) => {
    ctx.fillText(line, startX, startY + idx * lineHeight);
  });
}

// 繪製選取框與 4 角落等比例控制柄 + 頂部旋轉柄
function drawSelectionBox(layer) {
  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate(layer.rotation);

  const hw = layer.width / 2;
  const hh = layer.height / 2;
  const handleSize = 10 / currentZoom;
  const rotStemLength = 26 / currentZoom;

  // 外框虛線
  ctx.strokeStyle = '#003FBC';
  ctx.lineWidth = 1.8 / currentZoom;
  ctx.setLineDash([6 / currentZoom, 4 / currentZoom]);
  ctx.strokeRect(-hw, -hh, layer.width, layer.height);
  ctx.setLineDash([]);

  // 四角落等比例縮放控制柄
  const corners = [
    { x: -hw, y: -hh, cursor: 'nwse-resize' },
    { x: hw, y: -hh, cursor: 'nesw-resize' },
    { x: hw, y: hh, cursor: 'nwse-resize' },
    { x: -hw, y: hh, cursor: 'nesw-resize' }
  ];

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#003FBC';
  ctx.lineWidth = 2 / currentZoom;

  corners.forEach(c => {
    ctx.beginPath();
    ctx.rect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  });

  // 頂部旋轉控制柄與連線
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
  ctx.lineWidth = 1.5 / currentZoom;
  ctx.stroke();

  ctx.restore();
}

// 繪製四點角點引導線與圓形標籤
function drawCornerCalibrationGuides(layer) {
  const hw = layer.width / 2;
  const hh = layer.height / 2;

  // 轉換 corners 座標至目前物件顯示空間 (-hw ~ hw, -hh ~ hh)
  const pts = layer.corners.map(pt => ({
    x: (pt.x / layer.rawImage.width) * layer.width - hw,
    y: (pt.y / layer.rawImage.height) * layer.height - hh
  }));

  // 繪製多邊形連線
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.strokeStyle = '#D32F2F';
  ctx.lineWidth = 2.5 / currentZoom;
  ctx.setLineDash([8 / currentZoom, 4 / currentZoom]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 繪製 4 個可拖曳標籤
  const labels = ['左上', '右上', '右下', '左下'];
  const handleRadius = 14 / currentZoom;

  pts.forEach((pt, idx) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#D32F2F';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2 / currentZoom;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(11 / currentZoom)}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[idx], pt.x, pt.y);
  });
}

// --- 滑鼠點擊與命中測試 (Hit-Testing) ---
function hitTest(x, y) {
  // 從最上層向最下層測試
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const dx = x - layer.x;
    const dy = y - layer.y;
    // 旋轉反變換
    const localX = dx * Math.cos(-layer.rotation) - dy * Math.sin(-layer.rotation);
    const localY = dx * Math.sin(-layer.rotation) + dy * Math.cos(-layer.rotation);

    const hw = layer.width / 2;
    const hh = layer.height / 2;

    // 若為當前選中物件，檢查控制柄
    if (layer === activeLayer) {
      if (layer.cornerMode && layer.corners) {
        // 檢查 4 個校正角點
        const pts = layer.corners.map(pt => ({
          x: (pt.x / layer.rawImage.width) * layer.width - hw,
          y: (pt.y / layer.rawImage.height) * layer.height - hh
        }));
        const hitRadius = 20 / currentZoom;
        for (let cIdx = 0; cIdx < 4; cIdx++) {
          const dist = Math.hypot(localX - pts[cIdx].x, localY - pts[cIdx].y);
          if (dist <= hitRadius) {
            return { layer, part: 'corner_calib', cornerIdx: cIdx };
          }
        }
      } else {
        const handleHitRadius = 16 / currentZoom;
        const rotStemLength = 26 / currentZoom;

        // 旋轉柄
        if (Math.hypot(localX - 0, localY - (-hh - rotStemLength)) <= handleHitRadius) {
          return { layer, part: 'rot' };
        }

        // 四角落縮放柄
        if (Math.hypot(localX - (-hw), localY - (-hh)) <= handleHitRadius) return { layer, part: 'tl' };
        if (Math.hypot(localX - hw, localY - (-hh)) <= handleHitRadius) return { layer, part: 'tr' };
        if (Math.hypot(localX - hw, localY - hh) <= handleHitRadius) return { layer, part: 'br' };
        if (Math.hypot(localX - (-hw), localY - hh) <= handleHitRadius) return { layer, part: 'bl' };
      }
    }

    // 檢查物件主體
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
    // 點擊空白處，取消選取
    setActiveLayer(null);
  }
  render();
});

window.addEventListener('mousemove', e => {
  if (!activeLayer) return;
  const coords = getCanvasCoords(e);
  const dx = coords.x - dragStartX;
  const dy = coords.y - dragStartY;

  if (isDraggingCorner >= 0 && activeLayer.cornerMode) {
    // 拖曳透視校正角點
    const hw = activeLayer.width / 2;
    const hh = activeLayer.height / 2;
    const localX = (coords.x - activeLayer.x) * Math.cos(-activeLayer.rotation) - (coords.y - activeLayer.y) * Math.sin(-activeLayer.rotation);
    const localY = (coords.x - activeLayer.x) * Math.sin(-activeLayer.rotation) + (coords.y - activeLayer.y) * Math.cos(-activeLayer.rotation);

    // 轉為 rawImage 原生像素座標
    const rawX = Math.max(0, Math.min(activeLayer.rawImage.width, ((localX + hw) / activeLayer.width) * activeLayer.rawImage.width));
    const rawY = Math.max(0, Math.min(activeLayer.rawImage.height, ((localY + hh) / activeLayer.height) * activeLayer.rawImage.height));

    activeLayer.corners[isDraggingCorner] = { x: rawX, y: rawY };
    render();
    return;
  }

  if (isDragging) {
    activeLayer.x = objInitialState.x + dx;
    activeLayer.y = objInitialState.y + dy;
    render();
    return;
  }

  if (isRotating) {
    const angle = Math.atan2(coords.y - activeLayer.y, coords.x - activeLayer.x) + Math.PI / 2;
    // 接近 0, 90, 180, 270 度時自動吸附
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

  if (isResizing) {
    // 等比例縮放
    const origW = objInitialState.width;
    const origH = objInitialState.height;
    const aspect = origW / origH;

    // 將滑鼠位移投射到物體局部旋轉角度
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

    const newScale = Math.max(0.1, 1 + scaleDelta * 2);
    activeLayer.width = Math.round(origW * newScale);
    activeLayer.height = Math.round(origH * newScale);

    if (activeLayer.type === 'text') {
      activeLayer.fontSize = Math.max(12, Math.round(objInitialState.fontSize * newScale));
    }

    render();
    return;
  }

  // 游標樣式更新
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

// 鍵盤快捷鍵 (Delete 刪除, 方向鍵微調)
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if ((e.key === 'Delete' || e.key === 'Backspace') && activeLayer) {
    e.preventDefault();
    deleteActiveLayer();
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

// 畫布雙擊事件 (編輯文字)
canvas.addEventListener('dblclick', e => {
  const coords = getCanvasCoords(e);
  const hit = hitTest(coords.x, coords.y);
  if (hit && hit.layer.type === 'text') {
    editTextContent.focus();
    showToast('請在右側面板修改備註文字');
  }
});

// --- 選取狀態切換與右側面板動態切換 ---
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

  // 隱藏所有專屬控制區塊
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

    // 同步透視狀態
    updateCornerModeUI(layer.cornerMode);

    // 同步掃描美化狀態
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

// --- 圖層清單管理 UI ---
function updateLayersListUI() {
  layersList.innerHTML = '';
  layerCountBadge.textContent = `${layers.length} 個物件`;

  if (layers.length === 0) {
    emptyLayersHint.classList.remove('hidden');
    layersList.appendChild(emptyLayersHint);
    return;
  }
  emptyLayersHint.classList.add('hidden');

  // 倒序顯示 (最上層在最上面)
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
    } else if (layer.image && layer.image.src) {
      thumbHtml = `<img src="${layer.image.src}" class="layer-thumb" alt="縮圖">`;
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

    // 點擊項目選取
    item.addEventListener('click', e => {
      if (e.target.closest('.layer-actions')) return;
      setActiveLayer(layer);
    });

    // 上移按鈕
    item.querySelector('.btn-layer-up').addEventListener('click', e => {
      e.stopPropagation();
      moveLayer(layer, 1);
    });

    // 下移按鈕
    item.querySelector('.btn-layer-down').addEventListener('click', e => {
      e.stopPropagation();
      moveLayer(layer, -1);
    });

    // 刪除按鈕
    item.querySelector('.btn-layer-del').addEventListener('click', e => {
      e.stopPropagation();
      deleteLayer(layer);
    });

    layersList.appendChild(item);
  }
}

// 圖層順序移動 (1: 向上, -1: 向下)
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

// 刪除圖層
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

// --- 檔案匯入處理 (PDF 自動裁切、JPG/PNG 原圖進場) ---
async function handleFiles(fileList) {
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      await importPdfFile(file);
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      await importImageFile(file);
    } else {
      showToast(`不支援的檔案格式: ${file.name}`);
    }
  }
}

// 匯入 PDF 訂單
async function importPdfFile(file) {
  showToast(`正在處理 PDF 訂單: ${file.name}...`);
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload_pdf', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();

    if (result.status === 'ok') {
      const img = new Image();
      img.onload = () => {
        // 設定適當比例置於畫布偏左上方
        const maxDisplayW = 750;
        const scale = Math.min(1.0, maxDisplayW / img.width);
        const displayW = Math.round(img.width * scale);
        const displayH = Math.round(img.height * scale);

        const newLayer = createLayerObject({
          type: 'pdf_order',
          name: file.name,
          image: img,
          rawImage: img,
          width: displayW,
          height: displayH,
          x: 420,
          y: Math.min(CANVAS_HEIGHT - displayH / 2, displayH / 2 + 50),
          pdfId: result.pdf_id,
          cropRatio: result.crop_ratio
        });

        layers.push(newLayer);
        setActiveLayer(newLayer);
        showToast(`PDF 訂購單已自動辨識裁切進場`);
      };
      img.src = result.cropped_data_uri;
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    showToast(`PDF 匯入失敗: ${err.message}`);
    console.error(err);
  }
}

// 匯入保卡 / 發票圖片 (完全維持 100% 原圖狀態)
function importImageFile(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        // 等比例縮小適應畫布右半部
        const maxDisplayW = 650;
        const maxDisplayH = 750;
        const scale = Math.min(1.0, maxDisplayW / img.width, maxDisplayH / img.height);
        const displayW = Math.round(img.width * scale);
        const displayH = Math.round(img.height * scale);

        // 預設角點座標 (相對於 rawImage 原圖)
        const initCorners = [
          { x: 0, y: 0 },
          { x: img.width, y: 0 },
          { x: img.width, y: img.height },
          { x: 0, y: img.height }
        ];

        const newLayer = createLayerObject({
          type: 'image',
          name: file.name,
          image: img,
          rawImage: img,
          width: displayW,
          height: displayH,
          x: 1150,
          y: 565,
          corners: initCorners
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

// --- PDF 訂購單裁切微調滑桿 ---
sliderPdfCrop.addEventListener('input', () => {
  pdfCropVal.textContent = `${sliderPdfCrop.value}%`;
});

sliderPdfCrop.addEventListener('change', async () => {
  if (!activeLayer || activeLayer.type !== 'pdf_order' || !activeLayer.pdfId) return;
  const ratio = parseInt(sliderPdfCrop.value, 10) / 100.0;

  try {
    const res = await fetch('/api/crop_pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_id: activeLayer.pdfId, crop_ratio: ratio })
    });
    const result = await res.json();
    if (result.status === 'ok') {
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        activeLayer.height = Math.round(activeLayer.width / aspect);
        activeLayer.image = img;
        activeLayer.cropRatio = ratio;
        render();
      };
      img.src = result.cropped_data_uri;
    }
  } catch (err) {
    showToast('調整裁切高度失敗');
  }
});

btnResetPdfCrop.addEventListener('click', () => {
  if (activeLayer && activeLayer.origPdfCropRatio) {
    sliderPdfCrop.value = Math.round(activeLayer.origPdfCropRatio * 100);
    pdfCropVal.textContent = `${sliderPdfCrop.value}%`;
    sliderPdfCrop.dispatchEvent(new Event('change'));
  }
});

// --- 四點透視變形校正功能 ---
function updateCornerModeUI(inMode) {
  if (inMode) {
    btnToggleCornerMode.textContent = '退出角點校正';
    btnToggleCornerMode.classList.remove('btn-outline');
    btnToggleCornerMode.classList.add('btn-danger');
    btnApplyWarp.classList.remove('hidden');
    btnRevertWarp.classList.remove('hidden');
    cornerCalibrationNotice.classList.remove('hidden');
  } else {
    btnToggleCornerMode.textContent = '開啟四點角點校正';
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
    activeLayer.corners = [
      { x: 0, y: 0 },
      { x: activeLayer.rawImage.width, y: 0 },
      { x: activeLayer.rawImage.width, y: activeLayer.rawImage.height },
      { x: 0, y: activeLayer.rawImage.height }
    ];
  }
  updateCornerModeUI(activeLayer.cornerMode);
  render();
});

// 套用拉正 (呼叫後端 OpenCV 或前端 Homography)
btnApplyWarp.addEventListener('click', async () => {
  if (!activeLayer || !activeLayer.corners) return;
  showToast('正在執行透視校正拉直...');

  const pts = activeLayer.corners.map(c => [Math.round(c.x), Math.round(c.y)]);
  
  // 建立 base64
  const canvasTemp = document.createElement('canvas');
  canvasTemp.width = activeLayer.rawImage.width;
  canvasTemp.height = activeLayer.rawImage.height;
  const ctxTemp = canvasTemp.getContext('2d');
  ctxTemp.drawImage(activeLayer.rawImage, 0, 0);
  const dataUri = canvasTemp.toDataURL('image/png');

  try {
    const res = await fetch('/api/perspective_transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_data: dataUri, points: pts })
    });
    const result = await res.json();
    if (result.status === 'ok') {
      const warpedImg = new Image();
      warpedImg.onload = () => {
        activeLayer.image = warpedImg;
        // 重新設定外觀尺寸
        const aspect = warpedImg.width / warpedImg.height;
        activeLayer.height = Math.round(activeLayer.width / aspect);
        activeLayer.cornerMode = false;
        updateCornerModeUI(false);
        render();
        showToast('透視校正拉正完成');
      };
      warpedImg.src = result.data_uri;
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    showToast(`校正失敗: ${err.message}`);
  }
});

// 還原原圖
btnRevertWarp.addEventListener('click', () => {
  if (!activeLayer || !activeLayer.rawImage) return;
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
  render();
  showToast('已還原原始圖片');
});

// --- 文件掃描美化 (去陰影/增白) ---
switchScanEnhance.addEventListener('change', () => {
  if (!activeLayer || activeLayer.type !== 'image') return;
  activeLayer.scanEnhance = switchScanEnhance.checked;

  if (activeLayer.scanEnhance) {
    enhanceSliders.classList.remove('hidden');
    triggerDocumentEnhance();
  } else {
    enhanceSliders.classList.add('hidden');
    // 關閉時立即還原原圖
    activeLayer.image = activeLayer.rawImage;
    render();
    showToast('已關閉美化，恢復原始照片');
  }
});

let enhanceDebounceTimer = null;
function triggerDocumentEnhance() {
  clearTimeout(enhanceDebounceTimer);
  enhanceDebounceTimer = setTimeout(async () => {
    if (!activeLayer || !activeLayer.scanEnhance) return;

    activeLayer.shadowStrength = parseInt(sliderShadow.value, 10);
    activeLayer.brightness = parseInt(sliderBrightness.value, 10);
    activeLayer.contrast = parseInt(sliderContrast.value, 10);

    // 擷取目前未美化的基礎圖
    const canvasTemp = document.createElement('canvas');
    canvasTemp.width = activeLayer.rawImage.width;
    canvasTemp.height = activeLayer.rawImage.height;
    const ctxTemp = canvasTemp.getContext('2d');
    ctxTemp.drawImage(activeLayer.rawImage, 0, 0);
    const dataUri = canvasTemp.toDataURL('image/png');

    try {
      const res = await fetch('/api/document_scan_enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: dataUri,
          shadow_strength: activeLayer.shadowStrength,
          brightness: activeLayer.brightness,
          contrast: activeLayer.contrast / 100.0
        })
      });
      const result = await res.json();
      if (result.status === 'ok') {
        const enhancedImg = new Image();
        enhancedImg.onload = () => {
          activeLayer.image = enhancedImg;
          render();
        };
        enhancedImg.src = result.data_uri;
      }
    } catch (err) {
      console.warn('後端美化 API 連線異常，啟用本地 Canvas 增白濾鏡');
      applyClientSideEnhance(activeLayer);
    }
  }, 120);
}

// 本地 Canvas 快速濾鏡 fallback
function applyClientSideEnhance(layer) {
  const canvasTemp = document.createElement('canvas');
  canvasTemp.width = layer.rawImage.width;
  canvasTemp.height = layer.rawImage.height;
  const ctxTemp = canvasTemp.getContext('2d');
  ctxTemp.drawImage(layer.rawImage, 0, 0);

  const imgData = ctxTemp.getImageData(0, 0, canvasTemp.width, canvasTemp.height);
  const data = imgData.data;
  const contrast = layer.contrast / 100.0;
  const brightness = layer.brightness;

  for (let i = 0; i < data.length; i += 4) {
    // 灰階與亮度估算
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 增白去陰影簡單模型
    let avg = (r + g + b) / 3;
    if (avg > 140) {
      let boost = (avg - 140) * (layer.shadowStrength / 100.0);
      r = Math.min(255, r + boost);
      g = Math.min(255, g + boost);
      b = Math.min(255, b + boost);
    }

    data[i] = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightness));
    data[i + 1] = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightness));
    data[i + 2] = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightness));
  }

  ctxTemp.putImageData(imgData, 0, 0);
  const newImg = new Image();
  newImg.onload = () => {
    layer.image = newImg;
    render();
  };
  newImg.src = canvasTemp.toDataURL();
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

// --- 專櫃印章與同色系動態日期 ---
btnAddStamp.addEventListener('click', async () => {
  const dateStr = (inputStampDate.value || '').trim() || '115.11.21';
  showToast(`正在蓋上專櫃印章 (${dateStr})...`);

  try {
    const res = await fetch('/api/generate_stamp_with_date', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_text: dateStr })
    });
    const result = await res.json();
    if (result.status === 'ok') {
      const stampImg = new Image();
      stampImg.onload = () => {
        // 印章預設顯示大小 (寬 380px，等比例)
        const displayW = 380;
        const displayH = Math.round((displayW * stampImg.height) / stampImg.width);

        const newStamp = createLayerObject({
          type: 'stamp',
          name: `專櫃印章 (${dateStr})`,
          image: stampImg,
          rawImage: stampImg,
          width: displayW,
          height: displayH,
          x: 1250,
          y: 720
        });

        // 加入最上層
        layers.push(newStamp);
        setActiveLayer(newStamp);
        showToast('專櫃印章已蓋上畫布');
      };
      stampImg.src = result.data_uri;
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    // 前端合成 fallback
    generateStampClientSide(dateStr);
  }
});

// 前端 Canvas 合成專櫃印章 fallback
function generateStampClientSide(dateStr) {
  const baseImg = new Image();
  baseImg.onload = () => {
    const cvs = document.createElement('canvas');
    cvs.width = baseImg.width;
    cvs.height = baseImg.height;
    const ctxS = cvs.getContext('2d');
    ctxS.drawImage(baseImg, 0, 0);

    // 在中心方框繪製日期
    // 印章尺寸 1844 x 1440，中心 (942, 719)
    ctxS.fillStyle = '#003FBC';
    ctxS.font = 'bold 130px "DFKai-SB", "BiauKai", "MingLiU", serif';
    ctxS.textAlign = 'center';
    ctxS.textBaseline = 'middle';
    ctxS.fillText(dateStr, 942, 719);

    const outImg = new Image();
    outImg.onload = () => {
      const displayW = 380;
      const displayH = Math.round((displayW * outImg.height) / outImg.width);
      const newStamp = createLayerObject({
        type: 'stamp',
        name: `專櫃印章 (${dateStr})`,
        image: outImg,
        rawImage: outImg,
        width: displayW,
        height: displayH,
        x: 1250,
        y: 720
      });
      layers.push(newStamp);
      setActiveLayer(newStamp);
      showToast('專櫃印章已蓋上畫布');
    };
    outImg.src = cvs.toDataURL('image/png');
  };
  baseImg.src = '/assets/stamp_clean.png';
}

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
    fontSize: 34,
    x: 800,
    y: 950
  });

  layers.push(newTextLayer);
  setActiveLayer(newTextLayer);
  inputNewNote.value = '';
  showToast('備註文字已加入畫布');
});

// 備註字體粗體切換
btnNewNoteBold.addEventListener('click', () => {
  newNoteIsBold = !newNoteIsBold;
  btnNewNoteBold.style.backgroundColor = newNoteIsBold ? '#e2e8f0' : 'transparent';
});

// 備註顏色選擇
document.getElementById('newNoteColorPresets').querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    updateColorButtonSelection(document.getElementById('newNoteColorPresets'), btn.dataset.color);
    newNoteColor = btn.dataset.color;
  });
});

// 編輯選取中文字
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

// --- 通用變形操作 ---
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

// --- 高解析度無損 PNG 匯出 ---
btnExportPng.addEventListener('click', () => {
  if (layers.length === 0) {
    showToast('畫布目前沒有任何物件');
    return;
  }

  showToast('正在產生高解析度 PNG 圖片...');

  // 匯出時呼叫 render(true) 隱藏選取框與控制柄
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = CANVAS_WIDTH;
  exportCanvas.height = CANVAS_HEIGHT;
  const expCtx = exportCanvas.getContext('2d');

  // 純白底
  expCtx.fillStyle = '#FFFFFF';
  expCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 依序繪製圖層
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
      const startX = -layer.width / 2 + 10;
      const startY = -layer.height / 2 + 5;

      lines.forEach((line, idx) => {
        expCtx.fillText(line, startX, startY + idx * lineHeight);
      });
    } else if (layer.image && layer.image.complete) {
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

  // 轉換為 Blob 下載
  exportCanvas.toBlob(blob => {
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

// --- 縮放與工具列事件監聽 ---
btnZoomIn.addEventListener('click', () => setZoom(currentZoom + 0.1));
btnZoomOut.addEventListener('click', () => setZoom(currentZoom - 0.1));
btnZoomFit.addEventListener('click', fitCanvasToViewport);
btnZoom100.addEventListener('click', () => setZoom(1.0));

// Alt + 滾輪縮放
canvasViewport.addEventListener('wheel', e => {
  if (e.altKey || e.ctrlKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(currentZoom + delta);
  }
}, { passive: false });

// 檔案選擇按鈕
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

// 提示訊息 (Toast)
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
