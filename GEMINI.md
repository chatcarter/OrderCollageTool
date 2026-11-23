# GEMINI 專案開發與維護手冊 (GEMINI.md)

本文件為「訂單、保卡與發票拼貼工作台（OrderCollageTool）」之專屬開發、維護與作業準則規範。

---

## 區塊一：專案基本資訊
- **專案名稱**：OrderCollageTool (訂單、保卡與發票拼貼工作台)
- **架構模式**：100% 純前端免安裝綠色版（HTML5 Canvas + Vanilla JavaScript + PDF.js CDN + Tesseract.js OCR CDN，完全免 Python、免系統管理員權限）
- **畫布預設規格**：3508 × 2480 px (標準 300DPI 橫向 A4 印刷級，背景純白 `#FFFFFF`，PDF 6.0x 超高取樣文字銳利化渲染)
- **專櫃專屬色碼**：`#003FBC` (印章印泥與合成文字統一色)

---

## 區塊二：啟動與開發指引
1. **本機啟動**：
   - 雙擊執行根目錄之 `啟動拼貼工具.bat`（或直接雙擊開啟根目錄之 `index.html`）。
   - 批次檔直接以系統預設瀏覽器（Edge / Chrome）開啟工作台，完全免安裝環境、秒開即用。
2. **免伺服器與防 CORS 規範**：
   - 專櫃印章使用 `static/stamp_data.js` 內嵌 Base64 Data URL（`STAMP_CLEAN_BASE64`），杜絕本地 `file:///` 協議下的 `Tainted Canvas` 安全限制，保證 Canvas 圖片繪製與無損匯出順暢。
   - 根目錄 `index.html` 與 `static/index.html` 為雙份同步頁面，任何 HTML 介面與 ID 修改皆須同步更新兩份檔案。

---

## 區塊三：檔案清單與職責
- `index.html`：根目錄主頁面（直接支援雙擊開啟，引用 `static/` 路徑資源）。
- `static/index.html`：工作台同層結構頁面（引用同層 `style.css`、`stamp_data.js`、`app.js`）。
- `static/style.css`：工作台樣式表（72% 畫布區、28% 控制面板、OCR 狀態框、三段解析度切換與現代化卡片佈局）。
- `static/stamp_data.js`：已去背專櫃印章之 Base64 Data URL 常數，供本地直接調用防 CORS。
- `static/app.js`：純前端互動式畫布引擎（圖層管理、四角等比例縮放、旋轉控制、PDF.js 4.5x 解析裁切、100% 原比例進場、雙擊照片快速矩形裁切、Photoshop 即時跟隨拉扯自由梯形變形 + 九宮格輔助線、Tesseract.js + PDF 單據 OCR 辨識與一鍵複製、純 JS 文件除陰影增白、印章 localStorage 記憶、圖紙輸出範圍框、大/中/小三段 PNG 無損匯出）。
- `assets/stamp_clean.png`：去背與 `#003FBC` 藍色標準化之專櫃印章圖檔。
- `assets/stamp_raw.png`：原始印章圖檔。
- `啟動拼貼工具.bat`：一鍵秒開批次檔（無任何 Python 依賴）。
- `PROJECT_ARCHITECTURE.md`：系統架構與規格說明文件。

---

## 區塊四：核心模組維護注意事項
1. **保護原則**：不得未經授權修改計算核心或隨意刪除既有功能。
2. **換行格式**：全專案原始碼皆必須維持 Windows `CRLF` 換行格式。
3. **備份流程**：任何檔案修改前，必須讀取當下系統時間，在 `_backup/YYYYMMDD_HHMMSS/` 建立完整備份。
4. **印章去背規範**：印章去背必須保留乾淨透明底（無雜訊、無反白灰邊），印泥色碼必須精準維持 `#003FBC`。
5. **PDF 裁切高度**：精準定位「實收訂金金額 / 尚餘尾款 / 總金額(含稅)」所在行，並切除其下之施工條款與確認項目（下緣安全留邊設定為 `+12px`）。
6. **OCR 輸出格式規範**：單據辨識固定輸出 5 行格式（西元購買日期 `YYYY-MM-DD`、去除 `-` 符號之發票號碼、中文品牌與型號、製造機號、固定賣方統編 `24721268`）。
7. **雲端版本庫同步規範**：任何功能新增或檔案修改完成並通過檢核後，必須自動執行 `git add .`、`git commit -m "..."` 與 `git push origin main`，確保遠端 GitHub 倉庫（https://github.com/chatcarter/OrderCollageTool.git）永久維持最新同步狀態。

---

## 區塊五：語法與品質檢核標準
- 前端 JavaScript 必須符合 ES6+ 規範，無任何語法錯誤（`syntaxErrors = 0`）。

---

## 區塊六：工程修改工作日誌

### [2026-11-24 02:47:03] (第 45 版 / v45)
- **執行項目**：**電腦版三件組即時進度狀態列 ＋ 合併製作完成大字提示（v45）** — 在不影響電腦版與手機端既有核心效能的前提下，以純 CSS 類別切換（零 `setInterval`、零動畫迴圈、零 `backdrop-filter`）實作電腦版三件組即時進度面板，並於訂單、發票、保卡全數處理並排版蓋章完成時呈現穿透式 `🎉 合併製作完成` 大字提示。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v45`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge`、`#panelVersionBanner` 及 `.mobile-ver-badge` 為 `v45 (2026.11.24)`，並將資源參數更新為 `style.css?v=45`、`card_templates.js?v=45` 與 `app.js?v=45`。
  2. **電腦版三件組純 CSS 即時進度面板（`#desktopBatchStatusPanel`）**：
     - 於雙份 HTML `#canvasViewport` 內新增 `#desktopBatchStatusPanel`（僅電腦版顯示、`.is-mobile-mode` 自動完全隱藏），包含 `訂單 處理中...`、`發票 處理中...`、`保卡 處理中...` 三條放大清晰（`16px` 粗體）狀態列。
     - 一次拖入三件組時透過 `beginDesktopBatchProgress()` 瞬間同步點亮三條狀態列，各別完成時透過 `markDesktopBatchRoleStatus()` 即時轉為綠色 `✓ ... 處理完成`，全程僅靠純 CSS 類別（`.is-done` / `.hidden`）切換，辨識結束立即 `display: none` 釋放零佔用。
  3. **三樣全數完成穿透式「🎉 合併製作完成」大字提示**：
     - 透過 `checkDesktopBatchCompletion()` 偵測當電腦版「訂單 ＋ 發票 ＋ 已蓋章保卡」皆轉為完成並重繪後，切換為中央醒目大字（`28px`）之 `#desktopBatchCompleteCard`（`🎉 合併製作完成`），設定 `pointer-events: none; user-select: none;` 不阻斷滑鼠任何操作，停留 `1.5s` 後平滑淡出（`0.35s`）並自動隱藏。
  4. 建立 `_backup/20261124_024457/` 備份，通過 `HTML_SYNC_OK=True`、JS 語法平衡 `syntaxErrors=0` 與 `CRLF` 檢核 `LF-only=0`。

### [2026-11-24 02:35:45] (第 44 版 / v44)
- **執行項目**：**訂購單紫線安全裁切 ＋ 紅框純白挖空 ＋ 鎖定圖紙與保卡發票原始比例（v44）** — 完整保留 v43 去敏遮白（隱藏 `頁次`、`製表日期`、`訂單單號` 及 `專櫃名稱:宏匯`）與黑名單贈品過濾收合，改以「注意：...。」與「總金額(含稅):...」安全右緣作為垂直裁切線（紫線），純白挖空右側三欄明細區（紅框），並鎖定下方保卡 70%＋發票 27% 及 5 行文字原始比例絕不縮小。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v44`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge`、`#panelVersionBanner` 及 `.mobile-ver-badge` 為 `v44 (2026.11.24)`，並將資源參數更新為 `style.css?v=44`、`card_templates.js?v=44` 與 `app.js?v=44`。
  2. **紫線安全垂直右邊界裁切（`cropRightX`）**：
     - 修正 `static/app.js` 之 `buildPurifiedOrderSheetCanvas()`：取消直接在 `數量` 右緣一刀切斷整張寬度，改掃描頁面上「`注意:...` 最右緣」與「`總金額(含稅):...` 最右緣」取兩者最大值並往右保留 `20px` 安全白邊作為整張訂購單右界，完整保留上方注意事項句號與下方總金額數字一字不缺。
  3. **紅框純白挖空右側三欄明細區域（`#FFFFFF`）**：
     - 在 `qtyColRightEdgeX`（`數量` 欄右緣）至 `cropRightX` 之間、垂直從表頭 `預計交貨日 / 贈品否 / 贈品活動訖日` 上緣（安全低於上方 `注意:` 行）至最後一筆主商品下緣（高於下方收款與總金額區），以純白 `#FFFFFF` 精準覆蓋抹除右三欄表頭文字與所有明細日期／勾選內容。
  4. **鎖定畫布基準寬度與下方物件原始比例**：
     - 更新 `autoArrangeWorkbenchLayout()` 與 `syncSummaryTextLayer()` 固定以畫布原始可用寬度（`usableW = canvasWidth - 20`）為 `baseFullW`，確保下方「左側保卡 `70%` ＋ 中間間距 `3%` ＋ 右側發票 `27%`」與左下 `1.65x` 5 行大字 100% 維持原尺寸不因訂購單尺寸微調而縮小，僅依訂購單高度動態銜接起始 `Y` 座標。
  5. 建立 `_backup/20261124_023406/` 備份，通過 `HTML_SYNC_OK=True`、JS 語法平衡 `syntaxErrors=0` 與 `CRLF` 檢核 `LF-only=0`。

### [2026-11-24 02:24:34] (第 43 版 / v43)
- **執行項目**：**專櫃訂購單 PDF 精準去敏遮白 ＋ 贈品自動過濾收合排版（v43）** — 在 100% 完整保留 `rawPdfText`（訂單單號供左下 5 行核對文字）與 `cachedOrderItemModels`（完整主商品型號答案庫供保卡交叉比對）之前提下，於訂購單圖片渲染層導入基於原生 PDF 文字座標之精準白底遮蓋與高解析度橫條切片重組（Slice & Stitch）引擎。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v43`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge`、`#panelVersionBanner` 及 `.mobile-ver-badge` 為 `v43 (2026.11.24)`，並將資源參數更新為 `style.css?v=43`、`card_templates.js?v=43` 與 `app.js?v=43`。
  2. **原生座標精準去敏遮白與「專櫃名稱:XXXX」像素無失真重組**：
     - 於 `static/app.js` 新增 `extractPdfMappedItems()`、`groupPdfItemsIntoRows()`、`maskFieldClusterOnRow()` 與 `purifyDepartmentSalespersonRow()`：先完整萃取所有文字進記憶體答案庫後，再以純白底色精準遮蓋左側 `頁次:...`、`製表日期:...` 與右側 `訂單單號:...`。
     - 針對 `專櫃名稱/業務姓名:宏匯/許庭愷` 等任意櫃位與業務欄位，利用字元寬度權重與 `findBestWhiteSplitX()` 像素空白偵測精準切割冒號與櫃位名稱切片（`:宏匯`），塗白 `/業務姓名` 與 `/許庭愷` 後無縫左移貼緊呈現 **`專櫃名稱:宏匯`**（零字體失真）。
  3. **左側前 6 欄裁切 ＋ 贈品黑名單過濾 ＋ 付款金額區無縫往上貼齊（`buildPurifiedOrderSheetCanvas()`）**：
     - 自動鎖定表格 `數量` 欄右緣垂直隔線（`findPdfVerticalGridLineX()`），一刀裁除右側三欄（`預計交貨日`、`贈品否`、`贈品活動訖日`）放大可讀性。
     - 依序號分組掃描商品明細與折行規格，命中黑名單（`贈品`、`獨家贈`、`贈`、`GIFT`、`SP-`，不分大小寫）即整列跳過不裁入；最後將包含細分隔線之 `收款日期/方式` 與 `實收訂金 / 尚餘尾款 / 總金額(含稅)` 整塊無縫往上緊貼於最後保留主商品下方（並於 `總金額` 底線止切，徹底移除施工確認條款）。
  4. 建立 `_backup/20261124_022138/` 備份，通過 `HTML_SYNC_OK=True`、JS 語法平衡 `syntaxErrors=0` 與 `CRLF` 檢核 `LF-only=0`。

### [2026-11-24 01:56:25] (第 42 版 / v42)
- **執行項目**：**手機工作區一開始即全開滿版置中 ＋ 無裁切兩指縮放（v42）** — 徹底重構手機端畫布外層全開展開與內層容器尺寸計算機制，改以真實 CSS 縮放尺寸取代會造成 Safari/Chrome 捲動裁切之 `transform: scale()` 殘留盒模型，實作初始空白頁即滿版置中（`fitMobileCanvasToViewport()`）與無跳動兩指縮放／單指平移瀏覽及雙擊空白恢復滿版。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v42`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge`、`#panelVersionBanner` 及 `.mobile-ver-badge` 為 `v42 (2026.11.24)`，並將資源參數更新為 `style.css?v=42`、`card_templates.js?v=42` 與 `app.js?v=42`。
  2. **解除內層畫布包裝盒裁切，外層工作區 100% 全開展開**：
     - 調整 `static/style.css` `.is-mobile-mode` 下 `.workbench-container`、`.canvas-section`、`.canvas-viewport`、`#canvasStage`、`.canvas-wrapper` 與 `#mainCanvas`：外層區域 100% 撐滿上下工具列之間所有可用空間，移除對齊左上角之 `position: absolute` 與隱形尺寸殘留；於 `setZoom()` 嚴格同步設定 `#canvasStage`、`#canvasWrapper` 與 `#mainCanvas` 之 CSS 寬高為「畫布邏輯寬高 × `mobileViewScale`」（並設定 `transform: none`），同時保留 `#mainCanvas` 300DPI 原生邏輯像素解析度不降質。
  3. **初始與合成完成自動滿版置中縮放（`fitMobileCanvasToViewport()`）**：
     - 調整 `DOMContentLoaded` 執行順序，先偵測手機模式再計算初始滿版縮放，並於 `rAF` 與 `100ms` 後再校準；`fitMobileCanvasToViewport()` 依據 `#canvasViewport` 扣掉四邊 `12px` 呼吸邊距自動計算 `mobileFitScale` 置中顯示整張空白白紙，並於三樣物件組合與蓋章完成後立即重新計算滿版，四邊絕不裁切。
  4. **優化手機端「兩指縮放（`fitScale` ～ `3.0x`）＋ 單指自由瀏覽 ＋ 雙擊空白復原」**：
     - 修正 `mobilePinchState` 以 `#canvasStage` 實際邊界推算焦點座標，解決從置中狀態放大時之視窗跳動；放大後可用單指於全開工作區自由上下左右瀏覽所有細節，雙擊畫布空白處一鍵復原 `fitMobileCanvasToViewport()`；雙擊專櫃印章則仍專屬進入藍色框編輯（支援「改日期」、藍色深淺滑桿、歸零、單指移動與雙指獨立縮放印章）。
  5. 建立 `_backup/20261124_015427/` 備份，通過 `HTML_SYNC_OK=True`、JS 語法平衡 `syntaxErrors=0` 與 `CRLF` 檢核 `LF-only=0`。

### [2026-11-24 01:48:24] (第 41 版 / v41)
- **執行項目**：**手機工作區全開展開 ＋ 製作完成大字提示 ＋ 雙擊印章「改日期」按鈕（v41）** — 徹底修復手機端畫布在匯入後出現左上角小視窗裁切的問題，並於三樣組合蓋章完成後於螢幕正中央顯示四行大字穿透式提示，同時於雙擊印章浮動編輯列「歸零」鈕左側新增「改日期」快捷鈕。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v41`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge`、`#panelVersionBanner` 及 `.mobile-ver-badge` 為 `v41 (2026.11.24)`，並將資源參數更新為 `style.css?v=41`、`card_templates.js?v=41` 與 `app.js?v=41`。
  2. **修復手機端中央工作區域全開展開與三樣完成滿版不分切**：
     - 於雙份 HTML `#canvasViewport` 內新增 `#canvasStage` 尺寸橋接層（配合 `static/style.css` `.is-mobile-mode` 之 `flex: 1 1 0%` 全開容器設定），取代易受 `inline-block` 負邊距影響之佈局，改以精準 `visualW × visualH` 佔位並搭配 `margin: auto` 自動垂直水平置中；匯入、自動排版、補蓋章完成及手機隱形鎖解鎖（`unlockStealthLock`）後皆自動重算 `fitCanvasToViewport()` 滿版呈現，徹底消除右半發票與底部 5 行文字裁邊問題。
  3. **三樣組合完成正中央四行大字穿透式淡入淡出提示（`#mobileCompleteOverlay`）**：
     - 於手機端偵測訂購單、保卡、發票三樣皆備齊且保卡已蓋章渲染完成時，呼叫 `checkAndShowMobileCompletionOverlay()` ➔ `showMobileThreePieceCompleteOverlay()`，於畫面正中央以 `0.25s` 淡入、停留 `1.5s`、`0.4s` 淡出顯示「保卡 / 發票 / 訂單 / 製作完成」深色圓角卡片；全程設定 `pointer-events: none; user-select: none;`，完全穿透不阻斷底部「清空 / 下載 / 分享」操作。
  4. **雙擊印章浮動編輯列新增「改日期」按鈕（`#btnMobileChangeStampDate`）**：
     - 於 `#mobileStampEditBar`「歸零」按鈕緊鄰左側配置明顯之「改日期」鈕，點擊即透過 `openStampDateEditDialog()` 喚起既有民國日期輸入小視窗（預帶目前印章日期並開啟數字鍵盤），確認送出後即時更新該印章日期重繪，完整保留既有印章位置、雙指縮放尺寸、落點光影採樣與藍色深淺設定。
  5. 建立 `_backup/20261124_014536/` 備份，通過 `HTML_SYNC_OK=True`、JS 語法平衡 `syntaxErrors=0` 與 `CRLF` 檢核 `LF-only=0`。

### [2026-11-24 01:27:32] (第 40 版 / v40)
- **執行項目**：**手機預覽圖紙自動滿版 ＋ 雙擊印章雙指縮放調色 ＋ 雙擊文字編輯（v40）** — 完整保留電腦版所有工具列與既有封版辨識排版核心，全面升級手機端中央畫布滿版適配、預設隱藏選取框防誤觸、雙擊專櫃印章進入藍色框編輯（支援單指拖曳、雙指縮放、浮動藍色深淺滑桿），以及雙擊左下 5 行核對文字直接彈窗編輯。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v40`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge`、`#panelVersionBanner` 及 `.mobile-ver-badge` 為 `v40 (2026.11.24)`，並將資源參數更新為 `style.css?v=40`、`card_templates.js?v=40` 與 `app.js?v=40`。
  2. **手機端中央畫布自動滿版適配（Fit to Screen）＋ 預設防誤觸**：
     - 升級 `setZoom()` 與 `fitCanvasToViewport()`：手機模式下自動計算 `#canvasViewport` 可用寬高取 `Math.min(scaleW, scaleH)`（最低放寬至 `0.03`），並以動態邊距抵消 CSS `transform: scale()` 的虛擬佈局外溢並垂直水平置中，於匯入 PDF／照片、自動排版後與視窗旋轉（`orientationchange`）自動置中滿版呈現。
     - `render()` 於 `.is-mobile-mode` 預設隱藏物件藍色選取框與畫布伸縮把手，且預覽狀態下單指滑動絕不拖動訂購單、保卡或發票。
  3. **手機端雙擊專櫃印章編輯狀態機 ＋ 雙指捏合縮放 ＋ 浮動藍調微調列**：
     - 實作 `< 350ms` 雙擊（Double-Tap）命中偵測：命中獨立印章圖層，或命中自動合成保卡印章區（透過 `extractBakedStampToStandaloneLayer()` 自動將底卡還原為無印章乾淨版並拆出可編輯 `Multiply` 印章圖層）時，立即進入 `enterMobileStampEditMode()` 顯示藍色虛線框並於下方浮出 `#mobileStampEditBar`（含 `#mobileBlueToneSlider` `-40` ～ `+40` 與 `#inputStampBlueTone` 雙向即時連動、`歸零` 鈕與 `✓ 完成` 鈕）。
     - 編輯狀態下支援「單指拖曳移動印章（放開即時觸發 v37 紙張光影採樣與 `Multiply`）」與「雙指外擴／內捏等比例縮放印章尺寸（放開保留光影融入）」，單擊畫布空白處或點擊「完成」即安全退出編輯並收起浮動列。
  4. **手機端雙擊左下 5 行核對文字彈窗編輯**：
     - 雙擊命中 `text` / `overrideText` 圖層時開啟 `#mobileTextEditModalBackdrop`（預帶目前 5 行內容），確認後標記 `userEdited = true` 並自動觸發 `syncSummaryTextLayer()` 與 `autoArrangeWorkbenchLayout()` 維持 `1.65x` 放大比例與右側發票防壓迫邊界計算。
  5. 建立 `_backup/20261124_012356/` 備份，通過 `HTML_SYNC_OK=True`、JS 語法平衡 `syntaxErrors=0` 與 `CRLF` 檢核 `LF-only=0`。

### [2026-11-24 01:18:43] (第 39 版 / v39)
- **執行項目**：**手機多選防漏單修復 ＋「下載 / 分享」雙鍵拆分（v39）** — 徹底修復手機相簿複選保卡與發票時因即時清除 `<input>.value` 導致活體 `FileList` 參考提前清空而漏掉第二張照片之 Bug，並將手機底部動作列拆分為等寬並排之獨立「清空」、「下載」與「分享」按鈕。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v39`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner` 為 `v39 (2026.11.24)`、手機頂部 `.mobile-ver-badge` 為 `v39`，並將資源參數更新為 `style.css?v=39`、`card_templates.js?v=39` 與 `app.js?v=39`。
  2. **修復手機端相簿多選少一張 Bug（`Array.from` 瞬間靜態快照）**：
     - 於 `#mobilePhotoInput`、`#mobilePdfInput` 及桌面端 `#fileInput` 的 `change` 監聽器第一行即刻執行 `const pickedFiles = Array.from(e.target.files || []);`，在清空 `e.target.value = ''` 之前鎖定完整靜態檔案陣列；並同步於 `handleFiles(fileList)` 入口進行 `Array.from(fileList || [])` 二次快照與 `importImagePureFrontend` 異常安全 `resolve()` 防呆，確保 iOS Safari / Android Chrome 在日期彈窗或非同步解碼期間複選「保卡 ＋ 發票」絕不遺漏任何一張，並同步點亮 `[保卡]` 與 `[發票]` 進度綠燈。
  3. **手機底部動作列拆分為「清空」、「下載」、「分享」獨立按鈕**：
     - 調整 `index.html`、`static/index.html`、`static/style.css` 與 `static/app.js`：`#btnMobileClear`（「🗑️ 清空」）、`#btnMobileDownload`（「⬇️ 下載」，強制走 `buildExportPngBlob()` ➔ `triggerPngBlobDownload()` 直接下載 300DPI 無損 PNG 至手機本機不彈分享選單）、`#btnMobileShare`（「📤 分享」，優先呼叫 `navigator.share({ files: [...] })` 喚起原生分享傳送 LINE，不支援時自動降級下載），採 `flex: 1 1 0` 等寬俐落排列（並保留未建檔品牌保卡動態 `#btnMobileStampShortcut` 快捷鈕）。
  4. 建立 `_backup/20261124_011121/` 備份，通過 `HTML_SYNC_OK=True`、`STALE_EXPORT_REFS=0`、JS 語法檢查 `syntaxErrors=0` 與 `CRLF` 檢核 `LF-only=0`。

### [2026-11-24 00:34:44] (第 38 版 / v38)
- **執行項目**：**手機端極簡自動模式 ＋ PDF／相簿雙軌分流上傳（v38）** — 在 100% 保留電腦版既有功能、比例與微調工具列前提下，新增自動手機裝置偵測切換極簡 4 區塊佈局、雙軌獨立選檔（PDF 檔案 App / 相簿多選）、完整三件組／單獨蓋保卡雙模式、觸控雙指縮放＋單指拖曳印章即時光影配色，以及手機隱形鎖三連擊／虛擬數字鍵盤解鎖。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v38`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner` 為 `v38 (2026.11.24)`，並將資源參數更新為 `style.css?v=38`、`card_templates.js?v=38` 與 `app.js?v=38`。
  2. **智慧手機偵測與極簡 4 區塊介面（`.is-mobile-mode`）**：
     - 於 `static/app.js` 實作 `detectMobileWorkbenchMode()`，依 `window.innerWidth <= 768` 與 `pointer: coarse` / `navigator.maxTouchPoints > 0` 自動加上 `body.is-mobile-mode`，並於頂部右上角提供 `#btnMobileSwitchDesktop`（「💻 電腦版」）及 `#btnHeaderSwitchMobile`（「📱 切回手機版」）透過 `sessionStorage('order_collage_ui_mode')` 記憶切換。
     - **手機 4 區塊**：(1) `#mobileTopBar` 含 `[訂購單]`、`[保卡]`、`[發票]` 三顆即時綠燈進度徽章（`updateMobileWorkflowBadges()`）；(2) `#mobileUploadBar` 左鍵 `#btnMobileSelectPdf`（獨立 `accept="application/pdf"` 喚起檔案 App）、右鍵 `#btnMobileSelectPhotos`（獨立 `accept="image/*" multiple`、無 `capture` 直開相簿多選）；(3) 中央預覽畫布自動依手機螢幕寬度縮放，支援雙指捏合縮放檢視及單指拖曳物件／印章（放開同步觸發 v37 紙張光影採樣與 `Multiply`）；(4) `#mobileBottomBar` 提供「清空重來」、模式 B 動態「蓋上專櫃印章」快捷鈕，以及優先呼叫原生 `navigator.share`（不支援時自動降級下載 PNG）的「儲存 / 傳送圖片」。
  3. **完整三件組（模式 A）與略過 PDF 單獨蓋保卡（模式 B）雙模式**：
     - 絕不強制先傳 PDF：直接選取保卡照片時，國際牌保卡自動執行 v33 上緣 LOGO 外擴透視拉正與最後非阻斷民國日期蓋章；其他未建檔品牌保卡則自動切除桌面背景並於手機底部動態亮出 `#btnMobileStampShortcut`（「蓋上專櫃印章」），點按即放置可單指拖曳調整與自動光影配色的獨立 `Multiply` 印章圖層。
  4. **手機端「方案 A」隱形時間鎖三連擊 ＋ 虛擬數字鍵盤備援**：
     - 擴充 `#stealthTimeLockOverlay` 內建透明覆蓋之 `<input id="stealthMobileNumericInput" type="tel" inputmode="numeric">`（`@media (pointer: coarse)` 啟用單點喚起手機數字鍵盤盲打 12/24 小時制前後 2 分鐘時間碼），同時於 `touchend` 偵測螢幕任意處連續快速輕點 3 下（間隔 `< 450ms`）即 0.01 秒無條件解鎖並隱藏鍵盤。
  5. 建立 `_backup/20261124_002919/` 備份，通過 `HTML_SYNC_OK=True`、JS 語法檢查 `syntaxErrors=0` 與 `CRLF` 檢核 `LF-only=0`。

### [2026-11-24 00:14:57] (第 37 版 / v37)
- **執行項目**：**手動蓋章自動光影配色 ＋ 專櫃藍色深淺滑桿（v37）** — 完整保留既有辨識、地標裁切、`70% : 3% : 27%` 三欄排版、非阻斷最後蓋章、畫布延伸把手與極簡淺灰隱形鎖，針對單獨上傳保卡手動加入與拖曳／縮放／旋轉印章實作落點即時紙張光影採樣與 `Multiply` 混合模式，並新增專櫃藍色深淺同色系滑桿即時同步重繪。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v37`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner` 為 `v37 (2026.11.24)`，並將資源參數更新為 `style.css?v=37`、`card_templates.js?v=37` 與 `app.js?v=37`。
  2. **手動蓋章落點光影採樣與 `Multiply` 紙張融合**：
     - 擴充 `static/card_templates.js` 之 `sampleStampRegionLighting()` 回傳左右半區亮度（`leftAvgL`、`rightAvgL`）以支援陰影漸層調變，並在 `adaptStampCanvasToLighting()` 加入 `blueTone` 與左右亮度梯度融合演算。
     - 於 `static/app.js` 實作 `sampleBackdropLightingForStampLayer()`、`refreshSingleStandaloneStampLayer()` 與 `refreshAllStampsAppearance()`：當透過 `#btnAddStamp` 加入獨立印章或於畫布上拖曳／縮放／旋轉放開（`mouseup`）時，自動採樣落點下方紙張原圖亮度、色溫與左右陰影漸層，重繪印章並鎖定 `blendMode: 'multiply'`（同步於即時預覽與高解析 PNG 匯出）。
  3. **專櫃藍色深淺（同色系）微調滑桿（`#inputStampBlueTone`）與即時重繪連動**：
     - 於雙份 HTML「日期印章與自動蓋章」區塊新增 `專櫃藍色深淺` 滑桿（`-40` 淡藍 ～ `+40` 深海軍藍，預設 `0`，支援 `歸零` 按鈕 `#btnResetStampBlueTone` 與滑桿雙擊歸零）及 `.stamp-tone-scale-hints` 樣式，並儲存於 `localStorage`（`order_collage_stamp_blue_tone`）。
     - 調整滑桿時透過 `scheduleLiveStampRefresh()` 即時重繪畫布上所有獨立印章圖層、已合併印章之保卡圖層（`hasBakedStamp`）與右側印章即時預覽圖（`#stampPreviewImg`），切換自動／手動蓋章均一致套用。
  4. 建立 `_backup/20261124_001103/` 備份，通過 HTML 同步（`HTML_SYNC_OK=True`）、JS 括號與引號語法平衡（`syntaxErrors=0`）與 `CRLF` 檢核（`LF-only=0`）。

### [2026-11-23 23:54:35] (第 36 版 / v36)
- **執行項目**：**極簡淺灰全螢幕隱形鎖 ＋「...」三連點無條件通行（v36）** — 完整保留既有辨識、地標裁切、`70% : 3% : 27%` 三欄排版、非阻斷最後蓋章與右側／下方延伸把手，新增純前端隱形時間鎖與最高優先級點號快捷開鎖。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v36`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner` 為 `v36 (2026.11.23)`，並將資源參數更新為 `style.css?v=36`、`card_templates.js?v=36` 與 `app.js?v=36`。
  2. **`sessionStorage` 隱形全螢幕遮罩與 4 顆極低調小圓點（`#stealthTimeLockOverlay`）**：
     - 於雙份 HTML `<body>` 頂部建立純淺灰全螢幕遮罩（`#e5e7eb`，`z-index: 999999`，無任何 `<input>`、對話框或文字，僅中央 4 顆 `8px × 8px` 進度小圓點 `#cbd5e1` ➔ `#64748b`），並以內聯腳本優先檢查 `sessionStorage.getItem('order_collage_unlocked') === '1'` 達成點開鎖定、同分頁 F5/Ctrl+R 重整免重鎖且零畫面閃爍；點擊或拖放均被遮罩阻斷並自動奪回 `tabindex="0"` 與 `window.focus()`。
  3. **雙軌開鎖引擎（`capture: true` 最高優先級攔截）**：
     - **軌道 A（時間盲打＋自動滑動覆蓋）**：監聽主鍵盤 `0`–`9` 與九宮格 `Numpad0`–`Numpad9`，滑動保留最後 4 碼，隨時核對當下系統時間前後 2 分鐘（`-2 ~ +2` 分）之 12 小時制 `hhmm` 或 24 小時制 `HHmm`，命中立即寫入 `sessionStorage` 並解除鎖定。
     - **軌道 B（最高優先級 `...` 三連點無條件通行）**：獨立維護連續點號計數器 `dotStreak`（支援 `.`、`Period` 與 `NumpadDecimal`），無論數字緩衝區為何，只要連續按下 3 次點號即 0.01 秒無條件直接解鎖進入工作台。
  4. 建立 `_backup/20261123_231113/` 完整備份，通過雙份 HTML 同步、語法平衡（`syntaxErrors = 0`）與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 23:17:45] (第 35 版 / v35)
- **執行項目**：**畫布自由延伸控制點位置優化（v35）** — 移除白紙畫布「左邊緣中間」與「左下角」干擾把手，改配置於「右邊緣中間」、「下邊緣中間」與「右下角」（固定左上原點 `(0,0)`，右下角支援按住 `Shift` 等比例延伸），並保持匯出純淨隔離。
- **具體進度**：
  1. **版本徽章更新與靜態資源防快取（`v35`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner` 為 `v35 (2026.11.23)`，更新 `style.css?v=35`、`card_templates.js?v=35` 與 `app.js?v=35`，並更新 `#canvasSizeLabel` 操作提示文字。
  2. **移除左側／左下角把手，配置右側／下方／右下角三個延伸控制點**：
     - 修改 `static/app.js` 之 `drawCanvasResizeHandles()`、`hitTestCanvasResize()`、`mousemove` 拖曳邏輯與游標提示：
       - **右邊緣中間把手（`right`，`ew-resize`）**：向右拖拉自由增減畫布寬度，左側既對齊物件原地不動。
       - **下邊緣中間把手（`bottom`，`ns-resize`）**：向下拖拉自由增減畫布高度，方便下方追加第二張單據或備忘空間。
       - **右下角把手（`br`，`nwse-resize`）**：同時向右／向下延伸畫布，按住 `Shift` 鍵維持原畫布長寬比例；控制把手僅在 `!isExporting` 編輯畫面繪製，匯出 PNG 絕不繪入。
  3. 建立 `_backup/20261123_231116/` 完整備份，通過雙份 HTML 同步、語法平衡（`syntaxErrors = 0`）與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 23:06:00] (第 34 版 / v34)
- **執行項目**：**非阻斷保卡印章日期對話框 ＋ 背景同步辨識排版 ＋ 最後蓋章流程重構（v34）** — 讓使用者在匯入圖片時可自訂任意民國日期（如直接輸入 7 碼 `1150417` ➔ `115.04.17`），同時系統在背景毫不間斷地執行 OCR、裁切、拉正與 `70% : 3% : 27%` 排版，最後才將專櫃印章蓋上已就位的保卡。
- **具體進度**：
  1. **版本徽章更新與 CSS/JS 防快取（`v34`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner` 為 `v34 (2026.11.23)`，並將引入參數更新為 `style.css?v=34`、`card_templates.js?v=34` 與 `app.js?v=34`。
  2. **純手動民國年日期輸入對話框（`#stampDateModalBackdrop`）**：
     - 於雙份 HTML 與 `static/style.css` 新增輕量置中輸入框，移除多餘帶入發票日或跳過按鈕；開啟自動聚焦空白輸入欄，支援直接輸入 7 碼數字（如 `1150417`）或分隔寫法（`115.04.17` / `115/04/17`），經 `normalizeMinguoStampDateInput()` 即時預覽並正規化為 `115.04.17`，按 `Enter` 直接送出並同步寫入右側 `#inputStampDate`。
  3. **非阻斷觸發與「最後才蓋章」匯流管線（`handleFiles` ＋ `finalizeWarrantyCardStampAfterLayout`）**：
     - 在 `handleFiles()` 偵測到匯入清單含圖片檔時，**立即非阻斷彈出日期對話框**（單獨拖入 PDF 訂購單則不跳出），同時背景繼續執行 PDF 解析、發票地標裁切、保卡 1.48:1 透視拉正、左側雙語 OCR、訂購單交叉校正與 `70% : 3% : 27%` 自動排版。
     - 將蓋章從保卡排版前移出至最後一步（`finalizeWarrantyCardStampAfterLayout()` ＋ `_isStamping` 防重複鎖定）：
       - **先填好日期**：系統記住 `confirmedSessionStampDate` 並關閉視窗，待保卡拉正、OCR 與排版完成後自動接續蓋章。
       - **排版後才填好日期**：畫面先以乾淨未蓋章保卡完成全部三物件與 5 行文字排版等待，按下 `Enter` 送出日期當下立刻補蓋專櫃印章（`applyConfirmedStampToCardLayer`）。
  4. **清空／重置 100% 歸零**：
     - 於 `btnClearCanvas` 呼叫 `resetStampDateSession()`，確保清空畫布或重新整理後狀態 100% 歸零重啟。
  5. 建立 `_backup/20261123_231128/` 完整備份，通過雙份 HTML 同步、語法平衡（`syntaxErrors = 0`）與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:51:10] (第 33 版 / v33)
- **執行項目**：**保卡頂部 `Panasonic` LOGO 完整保留微調（v33）** — 維持 v32 之 `70% : 3% : 27%` 分欄比例與 v31 辨識邏輯，僅將國際牌保卡四點透視上緣（`TL`、`TR`）沿左右邊線方向向上外擴 `6.5%` 卡片高度（約 `1 公分`）以完整露出頂部藍色 `Panasonic` LOGO，並同步微調專櫃印章 Y 軸相對座標至 `39.5%`（`0.395`）。
- **具體進度**：
  1. **版本徽章更新與 JS 防快取（`v33`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner` 為 `v33 (2026.11.23)`，並將腳本查詢參數更新為 `card_templates.js?v=33` 與 `app.js?v=33`。
  2. **保卡四點透視頂部沿邊線向上外擴 `6.5%`**：
     - 於 `static/card_templates.js` 的 `detectPanasonicCardQuad()` 中，將偵測出的 `TL` 與 `TR` 角點分別沿 `BL -> TL` 與 `BR -> TR` 向量向上外擴 `0.065 * cardHeight`（並夾限於原圖 `[0, sw]` / `[0, sh]` 有效範圍內），確保透視拉正後紅褐色外框正上方之藍色 `Panasonic` LOGO 完整保留、不被切頭。
  3. **專櫃印章 Y 軸相對座標同步調校（`0.365` ➔ `0.395`）**：
     - 同步調整 `PANASONIC_STAMP_SPEC`、`sampleStampRegionLighting`、`compositeStampOnOffscreenCard` 及 `static/app.js` 中 `stampSpec.centerY` 由 `0.365` 更新為 **`0.395`**（`X: 84.5%`、`W: 21.0%` 維持不變），確保印章在畫布頂部上延 `6.5%` 後依然精準落在「經銷商確認」方框正中央。
  4. 建立 `_backup/20261123_221155/` 完整備份，通過雙份 HTML 同步、語法平衡（`syntaxErrors = 0`）與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:45:35] (第 32 版 / v32)
- **執行項目**：**下方分欄比例定版微調（v32）** — 完整保留 v31 辨識、裁切與交叉校正功能，僅將下方左右分欄占比微調為「左側保卡 `70%` ＋ 中間間距 `3%` ＋ 右側發票 `27%`」，並同步調整左下 5 行核對文字邊界基準。
- **具體進度**：
  1. **版本徽章更新與 JS 防快取（`v32`）**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner` 為 `v32 (2026.11.23)`，並將腳本查詢參數更新為 `card_templates.js?v=32` 與 `app.js?v=32`。
  2. **下方分欄黃金比例定版微調（`70% : 3% : 27%`）**：
     - 將 `static/app.js` 中 `importImagePureFrontend()`、`syncSummaryTextLayer()` 與 `autoArrangeWorkbenchLayout()` 之左側保卡欄寬由 `0.60` (`60%`) 調升為 **`0.70` (`70%`)**、維持中間安全間距 `0.03` (`3%`)，並將右側發票欄寬調降為 **`0.27` (`27%`)**，同步擴大左下 5 行核對文字的 `leftColW` 最大寬度邊界基準，確保保卡更大更清晰且左右完美切齊訂購單兩端。
  3. 建立 `_backup/20261123_221136/` 完整備份，通過雙份 HTML 同步、語法平衡（`syntaxErrors = 0`）與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:36:25] (第 31 版 / v31)
- **執行項目**：**國際牌完美封版（v31）** — 實作「高解析度原圖先辨識＋整塊左側基本資料區雙語錨點讀取＋左側中文字誤認前綴剝除」、新增「訂購單原生純文字型號交叉比對校正（雙向順序無關）」、調高發票頂部外擴參數多留約 `1.5 公分` 完整露出「宏匯廣場」大字，以及將左下角 5 行核對文字放大至 `1.65 倍`（`~96–104px`）並嚴格限制寬度絕不壓迫保卡與發票。
- **具體進度**：
  1. **版本徽章同步更新為 `v31 (2026.11.23)` 與防快取參數**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner`，並將腳本參數更新為 `card_templates.js?v=31` 與 `app.js?v=31`。
  2. **高解析度優先＋整塊左側雙語標籤區讀取與機號前綴淨化**：
     - 提高保卡離屏拉正辨識底圖寬度上限至 `3200px`（`Math.max(1800, Math.min(3200, sw))`），確保未縮小壓縮前優先辨識。
     - 於 `PANASONIC_WARRANTY_CONFIG` 與 `CARD_TEMPLATES` 新增 `leftInfoBlock` 整塊左側基本資料區（同時包入 `機種` 與 `機號` 兩列），在 `runCardTargetedOcr()` 優先以 `eng+chi_tra` + `PSM = 6` 整塊掃描並由 `parsePanasonicLeftInfoBlock()` 依雙語錨點提取機種與機號；`filterWarrantySerialResult()` 新增 `stripSerialMisreadPrefix()` 自動剝除 `IS`/`NO`/`SN` 等左側中文字誤認前綴，精準還原純淨 `02926020033`。
  3. **訂購單原生純文字型號交叉比對校正（`cachedOrderItemModels` ＋ `crossVerifyModelWithOrderSheet`）**：
     - `importPdfPureFrontend()` 與圖片訂購單分支解析後即同步抽取品牌／型號至 `cachedOrderItemModels`；無論匯入順序（先訂單後保卡、多檔全選或先保卡後訂單），只要與訂購單同品牌標準型號計算編輯距離／視覺混淆相似度 `>= 65%` 且前綴相符（如 `NR-DJ305XV-VW`），立即自動校正為 100% 零誤字 `NR-D505XV-W` 並同步更新 5 行核對文字。
  4. **發票頂部多留約 `1.5 公分` 完整露出「宏匯廣場」**：
     - 更新 `RECEIPT_LANDMARK_CROP_CONFIG`（`topExpandHeaderH: 2.2`、`topExpandBodyWRatio: 0.24`），鎖定 `HONHUI PLAZA`／`銷貨明細表` 時往上強制外擴 `max(2.2 * headerHeight, 0.24 * bodyW)`，完整保留上方「宏匯廣場」大字與自然紙邊。
  5. **左下 5 行核對文字放大 `1.65 倍` 與不越界防護**：
     - 調整 `syncSummaryTextLayer()` 字級搜尋範圍至 `~96–104px`（於 `3508px` 畫布），與保卡下緣固定保留 `28px` 安全間距，嚴格限定 `box.width <= cardLayer.width * 0.96` 防止跨過 `3%` 間距壓到右側發票。
  6. 建立 `_backup/20261123_223316/` 完整備份，通過雙份 HTML 同步、語法平衡（`syntaxErrors = 0`）與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:17:50] (第 30 版 / v30)
- **執行項目**：**國際牌封版收尾（v30）** — 實作「純文字地標強制比例外擴一刀裁切演算法」、將發票寬高比例參數獨立集中至 `RECEIPT_LANDMARK_CROP_CONFIG`、精準上移收緊國際牌保卡第二聯「機種／機號」座標隔離，並透過 `PANASONIC_WARRANTY_CONFIG` 封裝國際牌專屬核心參數為後續品牌擴充預留乾淨介面。
- **具體進度**：
  1. **版本徽章同步更新為 `v30 (2026.11.23)` 並升級防快取參數**：
     - 同步更新 `index.html` 與 `static/index.html` 之 `#headerVersionBadge` 與 `#panelVersionBanner`，並將 `card_templates.js?v=30` 與 `app.js?v=30` 查詢參數更新至 `v=30`。
  2. **純文字地標強制比例外擴一刀裁切（`RECEIPT_LANDMARK_CROP_CONFIG` ＋ `computeTextAnchoredReceiptCrop`）**：
     - 徹底放棄偵測發票紙張外框與背景色，完全以 OCR 文字地標（含 `lines`/`words`/`blocks` 展開）為比例尺強制一刀裁切：
       - **X 軸左右**：優先取主體文字群寬度 `bodyW` 外擴 `±0.15 * bodyW`（約 2 公分紙邊）；若僅抓到頂部標題 `宏匯廣場`/`HONHUI PLAZA`，則以 `headerCenterX ± 1.10 * headerW` 界定左右。
       - **Y 軸上緣**：鎖定頂部標題上擴 `0.45 * headerHeight` 一刀切除上方折角。
       - **Y 軸下緣**：優先地標①（`機:`/`序:`/`帳:`/`櫃:`/`商品退換貨請持本聯`/`請妥善保管`）下擴 `1.5 * lineHeight`；備援地標②（`發票號碼`/`退貨用條碼`）下擴 `0.75 * bodyW`。
     - 移除 `1.35 ~ 3.3` 拒切比例限制，只要 `cropW > 50 && cropH > 50` 即強制執行裁切，維持直向原比例縮放為訂購單 `37%` 擺入右下欄（絕不壓扁與蓋章）。
  3. **精準修正國際牌第二聯「機種／機號」座標徹底分離與雜訊過濾**：
     - 將 `panasonic_slip2`（`panasonic_warranty`）之 `model` 掃描框上移鎖定為 `x: 0.055, y: 0.305, w: 0.280, h: 0.068`，`serial` 鎖定下方為 `x: 0.055, y: 0.382, w: 0.280, h: 0.068`，並於 `runCardTargetedOcr()` 取消垂直外擴避免 `model` 向下溢位掃到機號列；於 `filterWarrantyModelResult()` 明確排除純數字＋垂直邊線雜訊（如 `02926020033I`），穩定輸出 `NR-D505XV-W` 與 `02926020033`。
  4. **國際牌模板獨立隔離封版**：
     - 建立凍結常數 `PANASONIC_STAMP_SPEC` 與 `PANASONIC_WARRANTY_CONFIG`，完整封裝 `1.48:1` 比例、避讓蓋章參數（`X: 84.5%, Y: 36.5%, W: 21.0%`）與兩聯 OCR 座標，並提供 `CARD_TEMPLATES.panasonic_warranty` 別名介面供後續新增 LG / Samsung 等獨立模板條目時互不干擾。
  5. 建立 `_backup/20261123_221549/` 完整備份，通過雙份 HTML 同步、語法平衡（`syntaxErrors = 0`）與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:01:30] (第 29 版 / v29)
- **執行項目**：升級 `1280px` 高對比灰階預掃描＋發票文字指紋與結構編號 `100%` 單據鎖定、徹底移除 `detectRes.detected` 搶判保卡條款、新增圖片訂購單（`order_sheet`）三角色防重疊、升級過濾雜訊字框之內部有效文字群外推熱感應紙邊界裁切，以及放寬保卡局部裁切並以 `PSM = 6` 完整讀取機種／機號。
- **具體進度**：
  1. **版本徽章更新與 JS 防快取（`v29`）**：
     - 同步更新 `index.html` 與 `static/index.html` 的 `#headerVersionBadge` 與 `#panelVersionBanner` 為 `v29 (2026.11.23)`，並為 `card_templates.js?v=29` 與 `app.js?v=29` 加上查詢參數破除瀏覽器舊版快取。
  2. **高對比預掃描 ＋ 三角色 100% 文字指紋分類**：
     - 強化 `quickPreScanImageText()` 為長邊至少 `1280px` 並套用 `createEnhancedOcrCropCanvas` 動態對比拉伸（含純 `eng` 備援預掃描）。
     - 升級 `classifyDocumentByTextAndColor()`：徹底移除 `detectRes.detected` 無條件判為保卡之條款，優先比對 `/[A-Z]{2}\s*[-—–]?\s*\d[\d\s]{6,9}\d/`、發票指紋（`銷貨明細`、`明細表`、`載具號碼`、`營業人統編`、`發票號碼`、`退貨用條碼`、`宏匯廣場`）或無保卡文字之直立比例（`H/W > 1.30`）鎖定為 `receipt`（嚴禁壓扁與蓋章）；命中訂購單關鍵字（`集雅社`、`專櫃訂購單`、`訂單單號`、`實收訂金`、`預定交貨日`）之圖片鎖定為 `order_sheet` 頂部 `100%` 滿版；保卡指紋或暖色橫向紅褐外框鎖定為 `warranty_card`。
  3. **過濾雜訊字框之發票真實邊界外推裁切（`computeTextAnchoredReceiptCrop`）**：
     - 過濾 `confidence < 32`、極小雜訊點與離群偏離座標後（至少 3 行有效印刷文字），左右外擴 `±12% * textW`、上方標題上擴 `0.8x` 行高（切除上方折角）、下方結尾下擴 `1.2x` 行高，驗證 `1.4 <= H/W <= 3.2` 後維持直向原比例裁切並縮放為 `37%` 擺入右下欄。
  4. **精準日期／無橫槓發票號碼／保卡 `PSM=6` 辨識與無條件自動排版**：
     - 強化 `parseInvoiceHeaderFields()` 明確排除底部 `店:0417` 等門市代碼，鎖定上方 `202x-MM-DD` 購買日期；`normalizeTaiwanInvoiceNo()` 自動去除 `-` 與空白輸出 `ZE93731662`。
     - `runCardTargetedOcr()` 移除 `tightenRegion` 過度裁剪，改採上下各外擴 `1.5%` 留白並切換 `PSM = 6` 完整讀取 `NR-D505XV-W` 與 `02926020033`；每次單據匯入完成後無條件觸發 `autoArrangeWorkbenchLayout(false)` ＋ `syncSummaryTextLayer(true)`。
  5. 建立 `_backup/20261123_215821/` 完整備份，通過雙份 HTML 同步、語法平衡（`syntaxErrors = 0`）與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 21:38:30] (第 28 版 / v28)
- **執行項目**：重構匯入前快速關鍵字預掃描＋色彩雙重精準分流、導入基於 3～4 組 OCR 關鍵字錨點之銷貨明細裁切邊界框計算、實施嚴格 `docRole` 圖層角色隔離，以及建立非空值 OCR 狀態合併保護機制。
- **具體進度**：
  1. **版本徽章同步更新為 `v28 (2026.11.23)`**：
     - 同步更新 `index.html`、`static/index.html` 頂部 `#headerVersionBadge` 與右側 `#panelVersionBanner`。
  2. **快速關鍵字預掃描 ＋ 色彩雙重精準分流（`quickPreScanImageText` ＋ `classifyDocumentByTextAndColor`）**：
     - 於 `static/card_templates.js` 新增 `RECEIPT_KEYWORDS`、`WARRANTY_KEYWORDS` 與 `classifyDocumentByTextAndColor()`，優先比對關鍵字命中數與面積最大比例之紅褐色保卡外框，徹底杜絕「電子發票被誤判為保卡、被壓扁為 `1.48:1` 且誤蓋專櫃印章」之問題。
  3. **基於 OCR 文字錨點之發票白紙明細框精密裁切（`computeTextAnchoredReceiptCrop`）**：
     - 依據預掃描取得的 `lines / words` Bounding Box 反推原始尺寸文字外包矩形，左右延伸 `±12% * textW`、上方緊貼標題列上方 `0.8x` 行高以徹底切除折角與上方桌面背景、下方延伸 `1.2x` 條碼／結尾行高，並校驗合理高寬比（`1.35 <= H/W <= 3.3`），異常時自動回退 `autoTrimReceiptImage()`；依訂購單基準 `37%` 欄寬等比例縮放至右欄。
  4. **嚴格圖層角色隔離與非空值 OCR 合併保護（`docRole` ＋ `mergeOcrSummaryFields`）**：
     - 為 `createLayerObject()` 與 PDF／影像匯入建立獨立 `docRole`（`'order_sheet'` / `'warranty_card'` / `'receipt'`），並於 `resolveLayoutRoleLayers()`、`getTargetWarrantyImageLayer()`、`syncSummaryTextLayer()` 與 `autoArrangeWorkbenchLayout()` 一致套用角色配對。
     - 新增 `mergeOcrSummaryFields(sourceRole, fields)`：發票 OCR 僅更新非空之 `date`、`invoiceNo`、`sellerTaxId`（並支援合併預掃描文字 `preScanText`）；保卡 OCR 僅更新非空之 `brand`、`model`、`serialNo`，空字串或佔位符絕不覆蓋既有有效欄位。
  5. 建立 `_backup/20261123_213413/` 完整備份，全專案通過雙份 HTML 同步檢核、括號平衡驗證（`syntaxErrors = 0`）與 `CRLF` 換行檢核，並推送至 GitHub。

### [2026-11-23 21:28:09] (第 27 版 / v27)
- **執行項目**：徹底根除 `Cannot read properties of undefined (reading 'parseInvoiceHeaderFields')` 錯誤（清除 `card_templates.js` 重複宣告語法錯誤並加上安全存在性防護），並強化保卡匯入分流條件確保 100% 觸發離屏透視拉正與自動蓋章。
- **具體進度**：
  1. **版本徽章同步更新為 `v27 (2026.11.23)`**：
     - 同步更新 `index.html`、`static/index.html` 頂部 `#headerVersionBadge` 與右側 `#panelVersionBanner`。
  2. **根除 `Cannot read properties of undefined (reading 'parseI...')` 錯誤**：
     - 定位並移除 `static/card_templates.js` 中 `autoTrimReceiptImage()` 內殘留重複宣告的 `invScale / rx / ry / rw / rh` 區塊（造成 `SyntaxError` 使 `window.CardTemplates` 無法導出之根本原因），並通過全檔作用域重複宣告掃描驗證。
     - 於 `static/app.js` 的 `runReceiptHighResOcr()` 為 `parseInvoiceHeaderFields()` 與 `normalizeTaiwanInvoiceNo()` 加入完整存在性防護與內聯回退解析器（`parseHdrSafe` / `normalizeInvSafe`），確保發票購買日期與發票號碼順利解析並寫入左下角 5 行核對文字。
  3. **強化保卡匯入分流判斷（`importImagePureFrontend`）**：
     - 將直立熱感應發票判定條件收斂為「非手動指定保卡、非偵測到紅褐色外框、非橫向圖／橫向紙張且高寬比 `> 1.35`」（`isTallReceiptStrip`），其餘所有保卡影像一律明確進入保卡分支，第一時間離屏透視拉正（切除木紋／深綠桌面）＋ 合成專櫃印章（`X: 84.5%`、`Y: 36.5%`、`W: 21.0%`、純 `STAMP_CLEAN_BASE64` ＋ 光影自適應 ＋ `multiply`）＋ 局部 OCR 同步寫入左下角 5 行文字。
  4. 建立 `_backup/20261123_212524/` 完整備份，全專案通過雙份 HTML 同步檢核、括號平衡驗證（`syntaxErrors = 0`）、重複變數宣告檢查與 `CRLF` 換行檢核，並推送至 GitHub。

### [2026-11-23 21:22:01] (第 26 版 / v26)
- **執行項目**：實作保卡「保底必蓋專櫃章機制」與純 Base64 消除 `Tainted Canvas` 錯誤、雙重驗證排除木紋桌面干擾、導入單一序列排隊 OCR 與熱感應紙動態對比拉伸（取代全域 Otsu），並強制同步左下角 5 行核對文字與畫布即時進度提示。
- **具體進度**：
  1. **版本徽章同步更新為 `v26 (2026.11.23)`**：
     - 同步更新 `index.html`、`static/index.html` 頂部 `#headerVersionBadge` 與右側 `#panelVersionBanner`，並新增畫布右上角即時狀態浮動條 `#canvasOcrStatusPill`（`.canvas-ocr-pill`）。
  2. **保卡保底必蓋機制 ＋ 純 Base64 零污染 ＋ 排除木紋桌面干擾**：
     - 移除 `ensureStampImageLoaded()`、`updateStampPreview()` 與 `btnAddStamp` 中會導致 `file:///` 下 `getImageData()` 報錯之 `assets/stamp_clean.png` 備援路徑，強制 100% 僅使用內嵌 `STAMP_CLEAN_BASE64`。
     - 將蓋章與 OCR 徹底解耦：在 `importImagePureFrontend()` 中同時支援橫向照與直拍照片內含的橫向保卡，先完成離屏拉正或紙張輪廓裁切（`detectRes.paperBox`），並**先於避讓座標（`X: 84.5%`、`Y: 36.5%`、`W: 21.0%`）完成光影自適應專櫃章合成**，絕不因 OCR 失敗而漏蓋。
     - 升級 `detectPanasonicCardQuad()` 加入「鄰近淺米白／淺灰卡片紙張（`lum >= 138, chroma <= 44`）」雙重驗證，徹底過濾整片暖棕色木紋桌面像素誤判。
  3. **單一序列排隊 OCR 與動態對比拉伸（Stretch Min-Max Luminance）**：
     - 建立 `enqueueOcrTask()` 單一序列排隊器與共用 Worker（`workerBlobURL: false`），取代多 Worker 平行互搶崩潰；辨識進度與本機模式受限提示（`⚠️ 本機模式 OCR 受限，建議使用線上版或雙擊文字手動編輯`）即時顯示於 `#canvasOcrStatusPill` 與 `#cardSmartStatus`。
     - 在 `createEnhancedOcrCropCanvas()` 棄用單一全域 Otsu 二值化，改為 `2%~88%` 分位動態對比拉伸（`Math.pow(norm, 1.35)`），完整保留熱感應紙淡灰筆畫（`2026-04-17`、`ZE-93731662`）。
     - 放寬 `normalizeTaiwanInvoiceNo()` 支援數字內含空格（`/([A-Z]{2})\s*[-—–]?\s*(\d[\d\s]{6,10}\d)/`，涵蓋 `Y: 50%~88%`），並於 `parseInvoiceHeaderFields()` 放寬日期與 `detectPanasonicSlipType()` 第二聯下方雙欄密度判定。
  4. **強制刷新左下角 5 行核對文字**：
     - 移除 `runCardTargetedOcr()`、`runReceiptHighResOcr()` 與 `syncSummaryTextLayer()` 中 `layers.length > 0` 限制，確保每張單據完成 OCR 後立即同步更新左下角 5 行大字（保留雙擊編輯後的 `userEdited` 保護）。
  5. 建立 `_backup/20261123_211737/` 完整備份，全專案通過雙份 HTML 同步檢核、括號平衡驗證（`syntaxErrors = 0`）與 `CRLF` 換行檢核，並推送至 GitHub。

### [2026-11-23 21:07:14] (第 25 版 / v25)
- **執行項目**：重構保卡為「離屏高解析度透視拉正 ➔ 局部白名單 OCR ➔ 立刻合成專櫃章 ➔ 縮放 60% 擺放」管線、升級發票多區段局部放大 OCR 與購買日期來源優先權鎖定，並建立 `syncSummaryTextLayer()` 即時寫入左下角 5 行核對文字。
- **具體進度**：
  1. **版本徽章同步更新為 `v25 (2026.11.23)`**：
     - 同步更新 `index.html`、`static/index.html` 頂部標題旁（`#headerVersionBadge`）與右側面板頂部（`#panelVersionBanner`）。
  2. **保卡離屏高解析度合成管線（`compositeStampOnOffscreenCard` & `importImagePureFrontend`）**：
     - 放寬 `detectPanasonicCardQuad()` 暗部紅褐色外框容忍度，且對橫向保卡影像先於離屏高解析度畫布（至少 `1480 × 1000 px`，`1.48 : 1`）完成四角透視拉正（保留未蓋章乾淨底圖 `rectifiedCleanCanvas` 供重蓋用）。
     - 在已拉正的高清保卡上以白名單單行 Worker 執行「機種」與「機號」OCR 后，立即呼叫 `compositeStampOnOffscreenCard()` 於避讓座標（`X: 84.5%`、`Y: 36.5%`、`W: 21.0%`、`-1.5° ~ +1.5°`、光影自適應平衡＋`multiply`）直接將印章合成至保卡，最後整張縮放至訂購單寬度的 `60%` 擺入左下角，徹底杜絕漏蓋。
  3. **發票多區段局部放大 OCR 與購買日期來源隔離**：
     - 將 `INVOICE_TEMPLATES.invoice_detail_slip` 發票號碼裁切區擴展覆蓋至中下段 `Y: 55% ~ 85%`（退貨用條碼上方），獨立放大 `2.2x` 二值化執行 OCR 並經 `normalizeTaiwanInvoiceNo()` 修正混淆字元與去除 `-`。
     - 嚴格隔離 `發票購買日期` 來源，強制僅從發票單據之 `載具號碼` 鄰近區域讀取（`YYYY-MM-DD HH:mm:ss` 擷取前段 `YYYY-MM-DD`），完全排除 PDF 訂購單製表日期。
  4. **建立 `syncSummaryTextLayer()` 即時資料寫入機制**：
     - 每次任一單據完成 OCR 或手動修正右側機種／機號欄位時，立即將真實辨識結果同步寫入並重新渲染畫布左下角（保卡正下方、零拉長高度）的 5 行核對文字圖層與右側備註欄，同時保留雙擊原地 `<textarea>` 編輯功能與 `60% : 3% : 37%` 排版比例。
  5. 建立 `_backup/20261123_210353/` 完整備份，全專案通過雙份 HTML 同步檢核、括號平衡驗證（`syntaxErrors = 0`）與 `CRLF` 換行檢核，並推送至 GitHub。

### [2026-11-23 20:57:05] (第 24 版 / v24)
- **執行項目**：重構「原圖無損高解析度先行 OCR ➔ 去邊裁切與比例排版」管線、建置「發票辨識雙型態架構（首波 Type A 銷貨明細表）」、強化保卡條碼雜訊過濾、確立「訂購單 100% 基準之 `60% : 3% : 37%` 黃金比例排版」，並即時同步寫入左下角 5 行核對文字。
- **具體進度**：
  1. **版本徽章同步更新為 `v24 (2026.11.23)`**：
     - 同步更新 `index.html`、`static/index.html` 頂部標題旁（`#headerVersionBadge`）與右側面板頂部（`#panelVersionBanner`）。
  2. **原圖無損高解析度先行 OCR 管線（`runReceiptHighResOcr` & `importImagePureFrontend`）**：
     - 匯入直立發票影像時，先以未壓縮、未縮小之 1:1 原始像素解析度優先執行分區高對比二值化 OCR 辨識，再進行顯示縮放與排版，徹底消除縮圖導致文字糊掉錯字的問題。
  3. **建立發票辨識雙型態架構（`INVOICE_TEMPLATES` — 首波完整建檔 Type A `invoice_detail_slip`）**：
     - 預留 Type B 雙 QR Code 電子發票正本擴充結構，完整實作 Type A（高寬比 > `1.3`、含 `銷貨明細表` / `載具號碼` 特徵）：
       - 精準讀取上方 `營業人統編：`（`\d{8}`）與 `載具號碼` 下方購買日期（`YYYY-MM-DD`）。
       - 鎖定中下段（高度 `65%~82%`，覆蓋 `68%~78%`「退貨用條碼」正上方）之 `發票號碼：` 區域，套用 `normalizeTaiwanInvoiceNo()` 台灣電子發票格式校驗（`[A-Z]{2}\d{8}`，自動去除 `-` 並修正 `O/0`、`I/1` 混淆字元）。
       - 強化白色熱感應紙邊緣去背裁切（`autoTrimReceiptImage`），保留上下安全留邊並完整呈現整張發票不截斷。
  4. **強化保卡「機種」與「機號」局部 OCR 校驗（杜絕條碼亂碼）**：
     - 導入單行字元白名單 Tesseract Worker（`getWarrantyLineOcrWorker`，僅允許 `A-Z`、`0-9`、`-`，`PSM = 7`）與 `filterWarrantyModelResult()` / `filterWarrantySerialResult()` 防呆過濾，徹底剔除下方條碼雜訊（如 `VLILOULUVOIDI`），確保高精準讀出型號與機號。
  5. **訂購單 100% 基準之 `60% : 3% : 37%` 黃金比例自動排版與 5 行文字即時連動**：
     - 以頂部滿版訂購單寬度為 `100%` 基準：左側保卡固定佔 **`60%`**、中間白縫佔 **`3%`**、右側發票佔 **`37%`**（左／右緣與訂購單切齊，發票完整呈現不裁切），辨識結果即時同步寫入保卡正下方 5 行核對文字圖層並支援雙擊原地編輯。
  6. 建立 `_backup/20261123_205425/` 完整備份，全專案通過雙份 HTML 同步檢核、括號平衡驗證（`syntaxErrors = 0`）與 `CRLF` 換行檢核，並推送至 GitHub。

### [2026-11-23 20:41:44] (第 23 版 / v23)
- **執行項目**：優化專櫃印章 1.2x 放大與紙張光影自適應去螢光融合、電子發票加強去背裁切、導入「頂部滿版訂購單＋自適應延伸不重疊排版引擎」、左下空白處「零拉長」自動填入 5 行核對文字，以及「畫布文字雙擊原地直接編輯」。
- **具體進度**：
  1. **版本徽章同步更新為 `v23 (2026.11.23)`**：
     - 同步更新 `index.html`、`static/index.html` 頂部 `#headerVersionBadge` 與右側 `#panelVersionBanner` 標籤。
  2. **專櫃印章放大 1.2 倍（`21.0%`）與區域紙張光影自適應去螢光感**：
     - 於 `static/card_templates.js` 將 `stampSpec.widthRatio` 調整為 **`0.210`**（中心點維持 `X: 84.5%`、`Y: 36.5%`）。
     - 新增 `sampleStampRegionLighting()` 與 `adaptStampCanvasToLighting()`，取樣蓋章目標區域周邊紙張亮度 `L` 與色溫；當拍攝光線偏暗（`L < 190`）時自動壓低印章油墨明度並收斂飽和度 10%～22% 混入紙張環境色溫，搭配 `multiply` 正片疊底消除螢光貼紙感。
  3. **發票原圖加強邊緣自動去背裁切（`autoTrimReceiptImage`）**：
     - 匯入直立電子發票時自動偵測白色紙張輪廓並內縮 `1.5%` 安全邊距，乾淨切除周圍桌面與陰影邊緣，並同步於背景執行快速 OCR 擷取購買日期與發票號碼。
  4. **訂購單頂部橫向滿版（留 `10px` 邊距）＋ 自適應延伸不重疊排版引擎（`autoArrangeWorkbenchLayout`）**：
     - PDF 訂購單以 6.0x 解析度置頂橫向滿版擺放（左右各留 `10px`）；下方左欄（59% 寬度）擺放拉正並蓋章之保卡（附著印章同步鎖定座標縮放），下方右欄（37% 寬度）擺放去邊發票（上緣對齊保卡），白底畫布自動向下延伸不截斷任何物件。
  5. **左側空白處「零拉長」自動填入 5 行核心核對文字**：
     - 利用保卡正下方與發票底線之間空白處，自動帶入標準 5 行核對資訊（發票購買日期、發票號碼、品牌名稱 機種型號、機號、賣方統編 `24721268`），並自動調整字級貼合發票底線而不額外拉長畫布。
  6. **畫布文字雙擊原地直接編輯（`openInlineTextEditor`）**：
     - 雙擊畫布上的文字圖層即在原地浮現精確對齊之 `<textarea>`（`.inline-text-editor`），支援 `Ctrl + Enter` 或失焦套用（記錄至 `Ctrl + Z` 復原堆疊）與 `Esc` 取消。
  7. 建立 `_backup/20261123_203805/` 完整備份，全專案通過雙份 HTML 同步檢核、括號平衡驗證（`syntaxErrors = 0`）與 `CRLF` 換行檢核，並推送至 GitHub。

### [2026-11-23 20:14:31] (第 22 版 / v22)
- **執行項目**：新增介面「目前版本徽章 (`v22 (2026.11.23)`)」，並修正「保卡上傳即自動偵測、透視拉正、欄位 OCR 與日期框避讓自動蓋印專櫃章」完整事件流。
- **具體進度**：
  1. **加入醒目版本識別徽章（`#headerVersionBadge` 與 `#panelVersionBanner`）**：
     - 於主標題旁與右側控制面板頂部加入深色高對比版本標籤 **`v22 (2026.11.23)`**，同步更新 `index.html`、`static/index.html` 與 `static/style.css`，確保一眼辨識目前載入之最新正式版。
  2. **修正與強化保卡上傳自動一條龍流程（`importImagePureFrontend` ➔ `applyCardRectifyAndOcr` ➔ `autoStampWarrantyCard`）**：
     - 於「🏷️ 品牌保卡智慧辨識與自動蓋章」卡片頂部新增「上傳保卡自動偵測、拉正與蓋章」開關（`#switchAutoSmartCard`，預設開啟）。
     - 拖曳或選取保卡圖片匯入畫布後，若偵測到國際牌紅褐色花邊外框（或手動指定聯別），系統立即自動執行四角透視拉正（`1.48 : 1`）、判別第一聯／第二聯、辨識機種與機號，並自動於 `X: 84.5%, Y: 36.5%`、寬度 `17.5%` 蓋上 `#003FBC` 專櫃印章（`multiply` 融合）。
     - 新增 `ensureStampImageLoaded()` 預載機制，於 `DOMContentLoaded` 預先載入 `STAMP_CLEAN_BASE64`，徹底避免首次自動蓋章因非同步載入尚未就緒導致空白之問題。
  3. 建立 `_backup/20261123_201245/` 完整備份，全專案通過括號平衡驗證（`syntaxErrors = 0`）與 `CRLF` 換行檢核，並執行 `git add .`、`git commit` 與 `git push origin main`。

### [2026-11-23 19:54:39] (第 21 版 / v21)
- **執行項目**：建置「四大品牌保卡智慧模板庫（首發：國際牌 Panasonic 雙聯單）」、「四角梯形透視自動拉正引擎」、「指定欄位精準 OCR 讀取（機種／機號）」與「日期框空白避讓自動蓋專櫃章」。
- **具體進度**：
  1. **建立品牌保卡模板設定架構（`static/card_templates.js`）**：
     - 建置四大品牌擴充登錄結構（`CARD_BRAND_REGISTRY`：Panasonic、LG、Samsung、Hitachi/Sony），完整實作 **國際牌（Panasonic）** 雙聯單模板：
       - **型號 A（`panasonic_slip1` — 第一聯：公司聯 / 經銷商聯 `S203J01`）**：機種 OCR 座標 `X: 11.5%~36.0%, Y: 13.0%~20.0%`、機號 OCR 座標 `X: 41.0%~65.0%, Y: 13.0%~20.0%`。
       - **型號 B（`panasonic_slip2` — 第二聯：顧客聯 `S203B01`）**：機種 OCR 座標 `X: 10.5%~35.5%, Y: 33.5%~40.5%`、機號 OCR 座標 `X: 10.5%~35.5%, Y: 40.5%~47.5%`。
     - 支援自動偵測（表單編號 OCR + 版面墨跡密度雙重判定）與右側面板手動切換模式（`#selectCardTemplateMode`）。
  2. **實作四角梯形透視自動拉正引擎（`rectifyPerspectivePureJS`）**：
     - 自動偵測國際牌紅褐色花邊外框四頂點（`detectPanasonicCardQuad`），於畫布繪製 `evenodd` 遮罩、九宮格輔助線與 4 個可拖曳青色角點控制柄（`drawCardRectifyOverlay`）。
     - 透過純前端 Homography 雙線性插值將斜拍梯形精準拉平還原為標準 `1.48 : 1` 矩形比例並寫入 `Ctrl + Z` 歷史復原。
  3. **實作指定區域高精準度 OCR 讀取（機種／機號）**：
     - 針對拉正後保卡僅裁切 `model` 與 `serial` 區域，進行 2.5x 放大與 Otsu 自適應灰階二值化對比強化（`createEnhancedOcrCropCanvas`）後交由 `Tesseract.js` 辨識，即時填入 `#inputCardModel` 與 `#inputCardSerial`（支援一鍵複製與帶入單據備註）。
  4. **實作日期框空白避讓：專櫃印章自動精準蓋印（`autoStampWarrantyCard`）**：
     - 依兩聯通用座標（中心點 `X: 84.5%`、`Y: 36.5%`，寬度 `17.5%`，自然微幅傾角 `-1.5° ~ +1.5°`，`multiply` 正片疊底油墨融合）將 `#003FBC` 專櫃印章精準蓋印於「經銷商確認」右側空白區，完全避開左側黑字，並支援畫布二次拖曳微調與高解析 PNG 匯出。
  5. 建立 `_backup/20261123_195033/` 完整備份，同步更新 `index.html`、`static/index.html`、`static/card_templates.js`、`static/app.js`、`GEMINI.md` 與 `PROJECT_ARCHITECTURE.md`，全專案通過括號平衡驗證（`syntaxErrors = 0`）與 `CRLF` 換行檢核，並執行雲端 GitHub 自動同步推送。

### [2026-11-22 01:56:00] (第 20 版 / v20)
- **執行項目**：全面升級「✍️ 保卡手寫客戶資料生成器」為 **20 種高差異化職業／年齡／性別人物字跡庫**、**速乾油性原子筆零牽絲物理引擎** 與 **1～10 級左右字距拉霸**。
- **具體進度**：
  1. **建置 20 種鮮明人物字跡庫（四大分類）與五大幾何結構差異**：
     - 實作 `HW_CHAR_PERSONAS`，涵蓋 **女性／清秀細膩類（`#01`～`#05`）**、**男性／職場商務類（`#06`～`#10`）**、**長輩／傳統硬筆類（`#11`～`#15`）** 與 **特殊風格／極端對比類（`#16`～`#20`）**，透過高寬比、左右傾角（`-9°`～`+14°`）、橫畫上揚／下傾角（`-4.5°`～`+9°`）、方圓轉折度（`0.02`～`0.95`）、高低錯落／手震波紋（`tremorAmp` / `waveAmp`）與頓點力度（`dotWeight`）徹底拉開視覺差異。
     - 右側卡片提供四大分類分頁標籤（`#hwCategoryTabs`）、快速點選按鈕（`#hwPersonaButtons`）、20 種人物下拉選單（`#hwPersonaSelect`）、大預覽框（`#hwMainPreviewCanvas`）與「🔄 換個筆順微調」抽樣按鈕（`#btnHwResample`）。
  2. **統一為「速乾油性原子筆（Ballpoint Pen）」物理筆觸（徹底零牽絲）**：
     - 徹底關閉跨筆劃／跨字連接細線，於 `drawBallpointStroke()` 加入原子筆起筆微頓墨點、均勻俐落中段與乾脆收筆；保留墨水 3 色（`#1A1A1A`、`#1E6FD9`、`#0B2859`）、筆尖粗細 3 段（`0.4mm` / `0.7mm` / `1.1mm`）與正片疊底（`multiply`）紙張融合。
  3. **新增「↔️ 左右字距（1～10 級）」與「🎛️ 微調工整度（1～10 級）」滑桿**：
     - 實作 `getSpacingMultiplier(sLevel)`（`1.48x` 寬鬆分格 ➔ `1.00x` 標準 ➔ `0.66x` 緊靠不重疊）與 `getEffectivePersonaParams()` 人物工整度微調，支援即時預覽、選取圖層二次微調、`Ctrl + Z` 歷史復原與 `localStorage`（`orderCollage_hwSettings_v20_personas`）記憶。
  4. 建立 `_backup/20261122_015309/` 完整備份，同步更新 `index.html`、`static/index.html`、`static/style.css`、`static/app.js`、`GEMINI.md` 與 `PROJECT_ARCHITECTURE.md`，全專案通過括號平衡驗證與 `CRLF` 換行格式檢核，並執行雲端 GitHub 自動同步推送。

### [2026-11-22 01:46:00] (第 20 版 / v20)
- **執行項目**：重構「✍️ 保卡手寫客戶資料生成器」為速乾油性原子筆物理引擎、20 級筆跡工整度滑桿與 10 級左右字距拉霸。
- **具體進度**：
  1. **移除 10 格人格縮圖與牽絲滑桿，升級為「筆跡美醜 20 級滑桿（Lv.1 漂亮 ➔ Lv.20 普通）」**：
     - 移除 `#handwritingPresetGrid` 與牽絲連筆滑桿，保留大尺寸即時預覽框（`#hwMainPreviewCanvas`），並新增「🔄 換個筆順微調」按鈕（`#btnHwResample`）重抽隨機種子。
     - 實作 `getQualityProfile(qLevel)` 20 段連續物理曲線（Lv.1～4 漂亮工整級、Lv.5～10 自然日常級、Lv.11～15 隨性快寫級、Lv.16～20 普通隨手級），拉大傾斜角度、字高胖瘦誤差（±2%～±24%）、基線波動與橫畫微上揚落差。
  2. **統一為「速乾油性原子筆（Ballpoint Pen）」物理筆觸（徹底零牽絲）**：
     - 徹底移除跨筆劃與跨字牽絲連線，改寫為 `drawBallpointStroke`，每筆劃獨立落筆並於起筆處加上原子筆微頓墨點、中段均勻俐落、收筆乾脆。
     - 完整保留墨水 3 色（`#1A1A1A`、`#1E6FD9`、`#0B2859`）、筆尖粗細 3 段（`0.4mm` / `0.7mm` / `1.1mm`）與正片疊底（`multiply`）融合效果。
  3. **新增「↔️ 左右字距（1 最寬 ➔ 10 最緊靠）」10 級拉霸**：
     - 實作 `getSpacingMultiplier(sLevel)`（1 級 `1.48x` 寬鬆分格 ➔ 5 級 `1.00x` 標準 ➔ 10 級 `0.66x` 緊靠不重疊），支援即時預覽、右側選取物件二次微調、`Ctrl + Z` 歷史復原與 `localStorage`（`orderCollage_hwSettings_v20`）記憶。
  4. 建立 `_backup/20261122_014348/` 完整備份，同步更新 `index.html`、`static/index.html`、`static/app.js`、`GEMINI.md` 與 `PROJECT_ARCHITECTURE.md`，全專案通過括號平衡驗證與 `CRLF` 換行格式檢核，並執行雲端 GitHub 自動同步推送。

### [2026-11-22 01:28:00] (第 19 版 / v19)
- **執行項目**：新增「✍️ 保卡手寫客戶資料生成器（10 種固定筆跡人格 ＋ 細微參數微調）」與優化右側控制面板淺灰底分區視覺。
- **具體進度**：
  1. **純前端向量筆順模擬引擎與 10 種固定筆跡人格**：
     - 整合 `hanzi-writer-data` CDN 繁體中文向量筆順資料（含本地記憶體快取與缺字／離線有機筆順骨架備援）及內建英數字與常用符號向量手寫路徑庫（`HW_ASCII_GLYPHS`）。
     - 實作壓感速度筆劃渲染（`drawOrganicStroke`）、同字重複出現獨立隨機誤差（±6% 字高胖瘦、基線起伏、微傾角）、`0%`～`40%` 牽絲過渡細線微調、墨水 3 色（`#1A1A1A` 黑色、`#1E6FD9` 淺藍、`#0B2859` 墨藍）、筆尖粗細 3 段（0.4 / 0.7 / 1.1 mm）與筆觸段位 6 段（正體 Lv.1 ➔ 潦草 Lv.6），並於 `localStorage` 永久記憶設定。
     - 建立 10 種固定筆跡人格即時預覽網格（`#handwritingPresetGrid`）與大圖預覽；點擊「✍️ 蓋上保卡（加入畫布）」建立透明底 `type: 'handwriting'` 獨立圖層，預設以 `globalCompositeOperation = 'multiply'`（正片疊底）繪製於畫布與高解析匯出，完美透出保卡紙張紋理，並支援選取後於右側「選取物件專屬控制」二次微調。
  2. **右側控制面板視覺分區優化**：
     - 維持每張 `.panel-card` 外框與 `.card-title` 為純白底色（`#FFFFFF`）與清晰邊框（`1px solid #CBD5E1`），並將各卡片內部功能操作區統一包覆柔和淺灰底色（`.panel-body-box`，`#F4F6F9`、內邊框 `1px solid #E2E8F0`、圓角 `8px`），大幅提升區塊辨識度與長時間操作舒適度。
  3. 建立 `_backup/20261122_012333/` 完整備份，同步更新 `index.html`、`static/index.html`、`static/style.css`、`static/app.js`、`GEMINI.md` 與 `PROJECT_ARCHITECTURE.md`，全專案通過括號平衡驗證與 `CRLF` 換行格式檢核，並執行雲端 GitHub 自動同步推送。

### [2026-11-21 21:15:00] (第 18 版 / v18)
- **執行項目**：雲端倉庫綁定與自動同步建置（GitHub Remote & .gitignore）。
- **具體進度**：
  1. **建立 `.gitignore` 排除非運行必要與本機敏感素材**：
     - 新增 `.gitignore`，納入 `_backup/`、`*.bak`、`*.ps1`、`本櫃印章.docx`、`assets/stamp_raw.png`、`啟動拼貼工具.bat`、`.DS_Store`、`Thumbs.db`。
     - 透過 `git rm --cached` 將上述檔案安全自 Git 追蹤索引中移除，並 100% 完整保留本機磁碟實體原檔。
  2. **遠端 GitHub 倉庫綁定與分支統一**：
     - 將本地分支統一重命名為 `main`（`git branch -M main`）。
     - 綁定遠端倉庫 `origin` 至 `https://github.com/chatcarter/OrderCollageTool.git`。
     - 於開發手冊與架構文件中正式確立「每次修改後自動執行 `git add .` / `git commit` / `git push origin main`」之永久自動同步規範。
  3. **首次雲端推送與全專案 CRLF 檢驗**：
     - 建立 `_backup/20261121_211129/` 備份，全專案檔案通過 CRLF 換行檢查與語法驗證，執行 `git push -u origin main` 完成首次雲端代碼上傳。

### [2026-11-21 20:50:00] (第 17 版 / v17)
- **執行項目**：升級「局部圈選刪除（塗白）」為 Windows 小畫家（MS Paint）風格矩形選取框體驗，並放大按鈕視覺規格。
- **具體進度**：
  1. **放大「🧹 局部圈選刪除（塗白）」按鈕為大尺寸高辨識度操作鈕**：
     - 在右側選取物件專屬控制中，將 `#btnToggleEraseBox` 升級為寬度齊寬、高度約 68px 的方形大按鈕（`.btn-erase-large`），配置大型 26px 圖示、主標題與副標題輔助說明，大幅提升辨識度並防止誤觸。
  2. **升級為 Windows 小畫家（MS Paint）風格矩形選取框三階段互動**：
     - 階段一（拉出選取框）：按住滑鼠拖曳在單據或照片上拉出高對比黑白相間虛線框（`#000000` 底線 + `#FFFFFF` 虛線）與淡藍色半透明遮罩，搭配 8 處邊緣與角落方形控制點。
     - 階段二（拖曳移動與鍵盤 1px 微調）：滑鼠移入選取框內部自動切換為移動十字游標（`cursor: move`），按住拖曳僅平移該選取框（不移動底層圖片）；點擊框外則自動放棄舊框並重新拉框；按下鍵盤方向鍵可 `1px`（按住 Shift 為 `10px`）精準平移選取框對齊表格線條。
     - 階段三（Delete 塗白清除與防呆鎖定）：選取框就緒後按鍵盤 `Delete` 鍵（或點擊確認按鈕）立即將框內像素填入純白（`#FFFFFF`）並記錄於 `Ctrl + Z` 歷史堆疊；清除後維持圈選模式以便連續修單；圈選模式期間按 `Delete` 鎖定僅執行框內塗白，嚴防誤刪整個圖層。
  3. 建立 `_backup/20261121_204405/` 完整備份，同步更新 `index.html`、`static/index.html`、`static/style.css`、`static/app.js`、`GEMINI.md` 與 `PROJECT_ARCHITECTURE.md`，全專案通過括號平衡驗證，嚴格維持 Windows `CRLF` 換行格式。

### [2026-11-21 20:25:00] (第 16 版 / v16)
- **執行項目**：整合「PDF 原生字型嵌入與自訂文字覆寫圖層」系統。
- **具體進度**：
  1. **新增「🔤 內文修改：原生字型嵌入與自訂覆寫文字」面板與動態 `@font-face` 載入**：
     - 於右側面板新增「🔤 內文修改：原生字型嵌入與覆寫」卡片（`#inputCustomFont`、`#customFontStatus`、`#inputOverrideText`、`#inputOverrideFontSize`、`#numOverrideFontSize`、`#valOverrideFontSize`、`#btnOverrideBold`、`#overrideColorPresets`、`#btnAddOverrideText`）。
     - 支援本機 `.ttf` / `.otf` / `.woff` / `.woff2` 字型選擇，透過 `FileReader` 讀取為 Base64 Data URL 後，以唯一識別碼動態注入 `<head>` 中的 `<style id="dynamic-font-style">`，並使用 `await document.fonts.load()` 確保字型 100% 解析就緒，杜絕 Canvas 繪製時字型退回預設。
  2. **獨立可編輯文字圖層（`type: 'overrideText'`）與現有畫布生態無縫整合**：
     - 點擊「➕ 插入覆寫文字到畫布」於畫布中央建立獨立可拖曳文字圖層，記錄文字內容、嵌入字型家族、字體大小、粗細與顏色。
     - 搭配第 15 版「🧹 局部圈選刪除（塗白）」功能，先將 PDF 訂單或保卡欲修改的舊文字塗白遮除，再將覆寫文字圖層精準拖曳對齊覆蓋，達成視覺一致之無痕改單效果。
     - 選取文字物件時可即時修改文字、粗細、顏色與字體大小滑桿／數值同步；鍵盤方向鍵支援 `1px`（按住 Shift 為 `10px`）微調定位，並支援 `Delete` 刪除鍵、`Ctrl + Z` 歷史復原與最終高解析 PNG 匯出。
  3. 建立 `_backup/20261121_202042/` 完整備份，同步更新 `index.html`、`static/index.html`、`static/style.css`、`static/app.js`、`GEMINI.md` 與 `PROJECT_ARCHITECTURE.md`，全專案通過括號平衡驗證，嚴格維持 Windows `CRLF` 換行格式。

### [2026-11-21 18:38:00]
- **執行項目**：新增發票號碼局部框選 OCR 與購買日期來源隔離、300DPI 印刷級 A4 畫布與 PDF 6.0x 銳利化升級、新增局部圈選刪除（矩形塗白橡皮擦）、實作全域 Ctrl+Z 歷史復原。
- **具體進度**：
  1. **新增「🧾 發票號碼辨識（局部框選 OCR）」工具 ＋ 修正「發票購買日期」強制只讀發票照片**：
     - 於右側「單據文字辨識與備註」標題列新增「🧾 發票號碼辨識」按鈕（`#btnInvoiceOcr`），點擊進入框選模式，拉框擷取局部高解析度影像以 `Tesseract.js`（`eng`）辨識，自動過濾非英數字並移除 `-` 符號（如 `HQ37721024`），自動填入或更新 `#inputNewNote` 的 `發票號碼` 欄位。
     - 徹底隔離發票日期來源，將 PDF 訂購單純文字與照片 OCR 文字分開傳入 `parseReceiptAndWarrantyText`，`發票購買日期` 強制僅能由照片 OCR 文字中擷取（支援西元 YYYY-MM-DD 與民國 11X 年月日換算），嚴禁讀取訂單 PDF 日期。
  2. **升級 300DPI 印刷級 A4 畫布（`3508 × 2480` px）、PDF 6.0x 超高取樣與預設 1.0x 匯出**：
     - 基準畫布升級為 `3508 × 2480` px，三欄式版面座標與專櫃印章尺寸等比例調整（印章預設寬度 580px）。
     - PDF 訂單渲染倍率提升至 `6.0x`，並加入輕量化文字對比銳利化處理（`sharpenPdfText`），消除灰階字體雜邊。
     - 預設匯出解析度改為「大 (1.0x)」。
  3. **新增「🧹 局部圈選刪除（矩形塗白橡皮擦）」工具**：
     - 於選取物件控制面板新增「🧹 局部圈選刪除（塗白）」按鈕（`#btnToggleEraseBox`）與「確認清除圈選範圍」按鈕（`#btnApplyEraseBox`）。
     - 支援在選取的照片或訂購單上拖曳拉出紅色虛線矩形框，按下鍵盤 `Delete` 鍵或點擊按鈕，即將選取範圍填入白色（`#FFFFFF`），不影響圖層其餘內容，且不影響未開啟圈選時的圖層刪除功能。
  4. **實作全域 `Ctrl + Z`（與 `Cmd + Z`）復原機制**：
     - 建立支援最多 20 步歷史快照的復原引擎（深拷貝離屏 Canvas 與各圖層狀態），物件平移、縮放、旋轉、矩形裁切、梯形扭曲、塗白清除、圖層增刪排序、清空畫布與圖紙尺寸調整皆自動記錄快照。
     - 頂部工具列新增「↩ 復原 (Ctrl+Z)」按鈕（`#btnUndo`），並依據歷史堆疊狀態即時啟用/停用。
  5. 建立 `_backup/20261121_182741/` 備份，同步更新 `index.html`、`static/index.html`、`static/style.css`、`static/app.js`、`GEMINI.md` 與 `PROJECT_ARCHITECTURE.md`，全專案通過括號平衡驗證，嚴格維持 Windows `CRLF` 換行。

### [2026-11-21 18:14:00]
- **執行項目**：新增「🎯 機號辨識（局部框選 OCR）」工具、畫布下/左邊界直接拖曳縮放圖紙尺寸、修正「設定圖紙輸出範圍」為單邊獨立拉動不連動。
- **具體進度**：
  1. **新增「🎯 機號辨識（局部框選 OCR）」工具**：於右側「單據文字辨識與備註」標題列左側新增「🎯 機號辨識」按鈕，點擊進入十字準星框選模式；於畫布拖曳框選保卡機號區域後，高解析度擷取該區塊呼叫 `Tesseract.js`（`eng`）辨識並過濾僅保留大寫英數字，自動更新或附加至 `#inputNewNote` 的 `機號` 欄位並退出框選模式。
  2. **白色畫布「下邊界」與「左邊界」直接拖曳調整圖紙尺寸**：將寫死的 `CANVAS_WIDTH`/`CANVAS_HEIGHT` 改為動態變數 `canvasWidth`/`canvasHeight`（最小限制 `800 × 600` px）；於畫布下邊緣、左邊緣與左下角加入調整把手與游標偵測，往下拉延伸下方空白、往左拉時所有圖層與輸出範圍框的 `x` 座標同步加上 `deltaW` 以固定右側相對位置；上方工具列新增即時尺寸標籤與「重設 A4 尺寸」按鈕。
  3. **修正「設定圖紙輸出範圍」為嚴格單邊獨立拉動**：將 `#canvasViewport` 與 `#canvasWrapper` 改為穩定的 `top left` 錨點定位，消除縮放或調整時的跳動；重寫 `isDraggingExportCrop` 座標計算，嚴格鎖定對向邊界（`rightEdge`、`bottomEdge`、`orig.x`、`orig.y`），確保拉動任一邊線或角落絕不連動對邊。
  4. 建立 `_backup/20261121_181151/` 備份，同步更新 `index.html`、`static/index.html`、`static/style.css`、`static/app.js`、`GEMINI.md` 與 `PROJECT_ARCHITECTURE.md`，全專案維持 Windows `CRLF` 換行。

### [2026-11-21 16:45:00]
- **執行項目**：整合 Photoshop 風格即時跟隨拉扯自由梯形變形、單據內文智慧 OCR 辨識與一鍵複製、雙擊照片快速開啟矩形裁切。
- **具體進度**：
  1. **Photoshop 風格「即時跟隨拉扯」自由梯形變形 + 九宮格輔助線**：重寫 `forwardWarpQuadPureJS` 正向四邊形透視映射與 `drawLiveDistortLayer` 即時預覽渲染，拖曳四個紅色角點時背後圖片即時跟著拉扯變形，並疊加藍色九宮格等分線與綠色外圍水平／垂直基準框；點擊「套用變形」以 100% 原始高解析度定型。
  2. **單據內文智慧辨識（PDF 純文字 + Tesseract.js OCR）與一鍵複製**：引入 `Tesseract.js` CDN，新增「🔍 一鍵辨識單據」與「📋 複製文字」功能，自動交叉解析訂購單 PDF 純文字與發票／保卡照片，輸出標準 5 行申請資料格式（西元購買日期、去橫線發票號碼、中文品牌與型號、製造機號、固定統編 `24721268`）。
  3. **雙擊照片快速開啟／套用矩形裁切**：於畫布 `dblclick` 事件新增照片快捷判斷，對著保卡或發票點兩下直接開啟 8 控制點矩形裁切框，裁好後再點兩下即完成套用。
  4. 同步更新 `index.html`、`static/index.html`、`static/style.css`、`static/app.js` 與專案架構／維護文件。

### [2026-11-21 14:55:00]
- **執行項目**：取消自動變形恢復原比例、新增 Photoshop 自由梯形變形與矩形裁切、新增圖紙輸出範圍工具、新增大中小三段解析度選擇器。
- **具體進度**：
  1. **取消進場自動變形與原比例進場**：徹底移除 `.jpg` / `.png` 匯入時自動偵測白紙與透視變形之邏輯，避免照片反光導致誤判變形；所有圖片嚴格維持 100% 原始長寬比進場，適配畫布三欄黃金比例排版。
  2. **Photoshop 風格自由梯形變形（透視扭曲）與矩形裁切**：
     - **自由梯形變形**：提供 4 個獨立可拉動之角點（`左上`、`右上`、`右下`、`左下`），以即時紅白色虛線四邊形引導，手動拉直斜拍文件角度後點擊「套用變形」即時渲染，附「還原原始圖片」重設。
     - **直覺矩形裁切**：提供 8 個控制把手與局部暗色半透明遮罩，可先俐落裁除保卡/發票四周木頭桌面，再搭配梯形變形微調。
  3. **自訂「圖紙輸出範圍工具」**：工作列與匯出卡片新增連動開關；開啟後畫布顯示 8 控制把手之虛線輸出框，框外覆蓋半透明暗色遮罩，即時預覽最終版面；匯出時僅精確輸出選定之框內區域。
  4. **三段輸出解析度選擇器（大 / 中 / 小）**：新增「大（100% 高清）」、「中（75% 標準推薦，預設）」、「小（50% 輕量快速）」三段切換按鈕，下方即時計算動態預計輸出圖片像素大小（如：1800 × 1275 px 或輸出框縮放後之精準尺寸）。
  5. 建立 `_backup/20261121_144909/` 備份，全專案檔案維持 Windows `CRLF` 換行且括號平衡驗證通過（`ALL_BALANCED_SUCCESS`）。

### [2026-11-21 14:34:00]
- **執行項目**：四大核心優化（自動白紙偵測去背景、印章字體 1.4x 放大與微調記憶、4.5x 超高解析 PDF 與 +12px 切線修正、三欄式黃金版面自動定位）。
- **具體進度**：
  1. **保卡與發票自動去背景與手動微調**：實作純前端像素亮度與色彩飽和度演算法，進場時自動辨識白紙紙張輪廓並進行單應性透視變換裁切桌面背景；選取物件後支援「調整四角裁切」微調與「還原原始未裁切全圖」。
  2. **印章字體放大與 localStorage 永久記憶**：印章字體預設放大約 1.4 倍（175px），新增「日期字體大小」與「日期垂直位置（Y 軸）」微調滑桿與重設按鈕；即時更新右側預覽圖，並自動儲存至 `localStorage` 實現跨工作階段永久記憶；預設蓋章尺寸適配保卡經銷商章欄位（400px）。
  3. **畫布升級 2400×1700 與 PDF 4.5x 渲染**：基礎畫布輸出解析度升級為橫向 A4 `2400 × 1700` px，PDF.js 渲染倍率提高至 `4.5x`（搭配 `imageSmoothingQuality = 'high'`）；自動裁切留邊由 +35px 縮減至 `+12px`，精準切齊總金額橫線下方，杜絕施工項目文字。
  4. **三欄式黃金版面自動定位**：訂購單進場自動置於左上角（佔 63% 寬度）、橫向保卡置於左下角（佔 58% 寬度對齊訂單）、直向發票置於右側直立區（佔 88% 高度）。
  5. 建立 `_backup/20261121_142754/` 備份，全檔案確認 Windows `CRLF` 換行與 `syntaxErrors = 0`。

### [2026-11-21 13:54:00]
- **執行項目**：重構為 100% 純前端免安裝版本，徹底移除對 Python 後端的依賴。
- **具體進度**：
  1. 將 `assets/stamp_clean.png` 完整轉碼為 Base64 Data URL 寫入 `static/stamp_data.js`，徹底根絕以 `file:///` 本地開啟時之瀏覽器跨域限制與 Canvas 污染（Tainted Canvas）問題。
  2. 整合 Mozilla `pdf.js` CDN，於瀏覽器端完成 PDF 第一頁高解析度（2.5x）渲染與文字 Y 軸座標分析，自動偵測「實收訂金金額 / 尚餘尾款 / 總金額(含稅)」所在列進行精準裁切，並支援右側面板滑桿動態重裁。
  3. 實作純 JavaScript 3×3 Homography 單應性矩陣逆向雙線性插值演算法，在瀏覽器端實現斜拍文件「四點透視變形校正（拉直與去背景）」與「還原原圖」。
  4. 實作純 JavaScript 局部背景光度估計除陰影與對比調節演算法，支援手動開關「文件掃描美化」即時增白去陰影。
  5. 改寫 `啟動拼貼工具.bat` 與根目錄 `index.html`，雙擊直接秒開預設瀏覽器，不需 Python 與系統管理員權限即可運作。
  6. 建立 `_backup/20261121_134739/` 備份，全專案檔案維持 Windows `CRLF` 格式，驗證括號平衡 `syntaxErrors = 0`。

### [2026-11-21 13:37:30]
- **執行項目**：從零建置本機「訂單、保卡與發票拼貼工作台」桌面工具。
- **具體進度**：
  1. 成功自 `本櫃印章.docx` 提取原始印章圖檔，透過色彩通道遮罩執行完美去背，生成無雜訊且純化為 `#003FBC` 藍色印泥之 `assets/stamp_clean.png`；編寫 `extract_stamp.py`。
  2. 建立 Python Flask 後端影像引擎 `server.py`，實作 PDF 訂單高解析度渲染、智慧文字座標自動裁切、四點透視拉正 API、文件掃描美化去陰影 API，以及印章動態日期精確合成 API。
  3. 建立單頁式 HTML5 Canvas 操作工作台（`static/index.html`、`static/style.css`、`static/app.js`），實現 72% 純白高解析度畫布（1600 × 1130）、28% 側邊面板、多物件拖曳進場、獨立圖層增刪排序、四角等比例縮放控制柄、頂部旋轉控制柄、文字等比例縮放、無失真 PNG 匯出。
  4. 建立一鍵啟動批次檔 `啟動拼貼工具.bat`，支援 Python 環境檢測、依賴套件自動安裝、印章初始化與瀏覽器自動開啟。
  5. 於專案根目錄建立架構文件 `PROJECT_ARCHITECTURE.md` 與維護指南 `GEMINI.md`，確認全模組語法正確無誤。
