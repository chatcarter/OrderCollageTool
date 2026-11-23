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
