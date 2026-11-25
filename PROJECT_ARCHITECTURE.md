# 專案架構文件 (PROJECT_ARCHITECTURE.md)

## 區塊一：專案概述
本專案「訂單、保卡與發票拼貼工作台」（`OrderCollageTool`）為專供實體專櫃業務與審核作業打造的本機桌面影像拼貼輔助工具。現已全面建置為**100% 純前端綠色免安裝版本**，具備 **`3508 × 2480` px 300DPI 印刷級超高解析度畫布**（橫向 A4 比例）與 **6.0x PDF 超高取樣文字銳利化渲染**。整合「全域 Ctrl+Z 歷史復原（最多20步）」、「局部圈選刪除（塗白橡皮擦）」、「發票號碼與機號局部框選 OCR 辨識」、「發票購買日期來源強制隔離」、「訂購單 PDF 自動偵測總金額切線」、「照片 100% 原比例進場與雙擊快速矩形裁切」、「Photoshop 風格即時跟隨拉扯自由梯形變形 + 九宮格參考線」、「櫃位印章動態日期與 localStorage 永久記憶」、「自訂圖紙輸出範圍框」與「預設 1.0x 高清 PNG 無損匯出」等完整工作流。

---

## 區塊二：系統技術架構（100% 純前端綠色免安裝）
1. **純前端影像與文件運算引擎（HTML5 Canvas + Vanilla JS）**：
   - **4.5x PDF 超高解析度轉檔與 +12px 精準裁切**：透過 Mozilla `pdf.js` CDN，於瀏覽器端以 4.5x 渲染比例產生極致清晰的訂單點陣圖，同時萃取 PDF 內文純文字（`rawPdfText`）供 OCR 交叉比對。透過文字 Y 軸座標分析，精準切齊「總金額(含稅)」橫線正下方（安全邊界 `+12px`），徹底避免切到施工確認文字。
   - **圖片 100% 原比例進場與雙擊快速矩形裁切**：所有匯入之 `.jpg` / `.png` 圖片不套用自動變形，嚴格按原始長寬比例進場；對畫布上的照片**雙擊（Double-Click）**即可快速開啟／完成 8 控制點矩形裁切框，搭配局部暗色遮罩去除木頭桌面背景。
   - **Photoshop 風格「即時跟隨拉扯」自由梯形變形（Live Distort Warp + 九宮格輔助線）**：純 JavaScript 實作 3×3 正向／逆向單應性映射矩陣（Homography + Bilinear Interpolation）。拖曳四個角點（`左上`、`右上`、`右下`、`左下`，允許向外拉伸至 -60%~+160%）時，背後圖片於拖曳當下即時跟著扭曲拉伸，並於上方疊加九宮格水平／垂直參考網格線與外圍水平垂直基準框；放開或點擊「套用變形」即以 100% 原始高解析度定型。
   - **單據內文智慧辨識（PDF 純文字 + Tesseract.js OCR）**：整合 `Tesseract.js` CDN 與 PDF 純文字解析，一鍵掃描畫布上的訂購單、發票與保卡，自動進行品牌英翻中對照（`HITACHI`→日立、`LG`→樂金等）、移除發票號碼連字號、擷取西元購買日期（`YYYY-MM-DD`）、型號與製造機號，並帶入固定賣方統編 `24721268`，輸出標準 5 行格式，支援一鍵複製貼給客戶或加入畫布。
   - **文件掃描美化（純 JS 背景光度除陰影演算法）**：純 JavaScript 像素遍歷與局部背景估算，預設關閉（保持原圖），手動開啟即可即時去除桌面陰影並增白底紙，支援去陰影強度、亮度、對比度滑桿微調。
   - **印章 Base64 內嵌與 localStorage 永久記憶**：專櫃印章使用 `static/stamp_data.js` 之 Base64 Data URL 內嵌，徹底杜絕本地 `file:///` 跨域安全限制；日期字體放大 1.4 倍（預設 `175px`），支援字體大小與垂直 Y 軸微調，自動記憶於瀏覽器 `localStorage`；預設蓋章尺寸為 `400px`，適配保卡經銷商章欄位。

2. **前端操作工作台（單頁式 HTML5 / Canvas）**：
   - **畫布規格**：`2400 × 1700` px（橫向 A4 規格），Canvas 設定 `imageSmoothingQuality = 'high'`，確保細小文字無損銳利。
   - **預設三欄式黃金版面**：
     - **訂購單（PDF）**：進場置於左上角，寬度佔畫布約 63%。
     - **保卡 / 橫向單據（寬 >= 高）**：進場置於左下角，寬度佔畫布約 58% 對齊訂購單。
     - **發票 / 直式明細（高 > 寬）**：進場置於右側直立區，高度佔滿畫布約 88%。
     - **印章**：預設尺寸 400px，置於保卡蓋章欄位。
   - **圖層管理與輸出控制**：所有元件均為獨立圖層，支援拖曳移動、4 角落等比例拉伸、頂部 360° 自由旋轉與層級調整；支援開啟「圖紙輸出範圍框」自訂圈選裁切區，並提供「大 (1.0x) / 中 (0.75x) / 小 (0.5x)」三段解析度匯出。

3. **啟動腳本**：
   - `啟動拼貼工具.bat`：免檢查 Python、免安裝任何套件，雙擊後直接呼叫系統預設瀏覽器開啟根目錄之 `index.html`。

---

## 區塊三：目錄與檔案結構
```text
OrderCollageTool/
├── index.html                     # 根目錄主頁面（直接支援雙擊開啟，2400x1700 規格，引用 static/ 下資源）
├── static/
│   ├── index.html                 # 工作台同層結構頁面（引用同層 style.css / stamp_data.js / app.js）
│   ├── style.css                  # 工作台現代化樣式表（含 OCR 狀態框、工具提示、三段解析度按鈕樣式）
│   ├── stamp_data.js              # 專櫃印章 Base64 Data URL（防 CORS / Tainted Canvas）
│   └── app.js                     # 純前端 Canvas 核心引擎（即時梯形扭曲、雙擊裁切、OCR 辨識、4.5x PDF）
├── assets/
│   ├── stamp_raw.png              # 從 docx 提取出的原始印章圖檔
│   └── stamp_clean.png            # 完美去背且色彩純化為 #003FBC 的專櫃印章圖檔
├── _backup/                       # 修改前備份目錄
│   ├── 20261121_133118/           # 初始環境備份
│   ├── 20261121_134739/           # 純前端化前備份
│   ├── 20261121_142754/           # 四大核心優化前備份
│   └── 20261121_144909/           # 自由梯形與輸出範圍工具前備份
├── 本櫃印章.docx                  # 原始內嵌專櫃印章之 Word 檔案
├── 啟動拼貼工具.bat               # 一鍵秒開批次檔（無 Python 依賴）
├── GEMINI.md                      # 開發與維護指南
└── PROJECT_ARCHITECTURE.md        # 本專案架構與工作日誌文件
```

---

## 區塊四：核心功能詳細規格
1. **圖片原比例進場與雙擊快速矩形裁切**：
   - 照片進場保持 100% 原始長寬比，不執行自動透視扭曲。
   - 雙擊畫布上的照片物件直接切換開啟／套用 8 控制點矩形裁切框，框外顯示半透明暗色遮罩，快速去除桌面背景。
2. **Photoshop 風格即時梯形變形 + 九宮格參考線**：
   - 開啟「自由梯形變形」後，拖曳四個角點（允許向外超出原邊界拉伸至 -60%~+160%）時，呼叫 `forwardWarpQuadPureJS`（最大邊 650px 預覽）即時渲染扭曲畫面，並疊加九宮格水平／垂直等分網格與外圍水平垂直基準框；點擊「套用變形」以 100% 原始高解析度定型並同步更新圖層尺寸與中心偏移。
3. **單據內文智慧辨識（OCR）與一鍵複製**：
   - 整合 PDF 純文字與 `Tesseract.js`（`eng+chi_tra`）辨識畫布單據，自動解析並格式化為標準 5 行資訊（發票購買日期、發票號碼移除橫線、中文品牌 型號、機號、賣方統編 `24721268`），支援一鍵複製剪貼簿或直接加入畫布。
4. **4.5x 訂購單超高解析度與 +12px 切線修正**：
   - Mozilla `pdf.js` 解析度拉升至 4.5x，文字 Y 軸下緣安全邊界為 `+12px`，精準切齊「總金額(含稅)」橫線正下方。
5. **櫃位印章自訂與 localStorage 永久記憶**：
   - 日期文字預設 `175px`（色碼 `#003FBC`），提供字體大小與 Y 軸垂直偏移微調滑桿並自動寫入 `localStorage`。
6. **自訂圖紙輸出範圍與三段解析度無損匯出**：
   - 支援開啟 8 控制點虛線輸出範圍框裁切匯出，並提供「大 (1.0x) / 中 (0.75x) / 小 (0.5x)」三段輸出倍率切換與即時像素尺寸顯示。

---

## 區塊五：防護範圍與規範守則
- 嚴格維持 Windows `CRLF` 換行格式。
- 修改前強制依系統時間建立 `_backup/YYYYMMDD_HHMMSS/` 備份。
- 根目錄 `index.html` 與 `static/index.html` 修改時必須保持功能與 DOM ID 同步（僅保留 `static/` 相對路徑差異）。
- 不得未經授權修改核心運算邏輯與既有功能。
- 每次修改後自動執行 `git add .` / `git commit` / `git push origin main` 確保 GitHub 遠端倉庫（https://github.com/chatcarter/OrderCollageTool.git）即時同步。

---

## 區塊六：工程修改工作日誌

### [2026-11-26 01:05] (第 65 版 / v65)
- **執行項目**：**精修台灣日立家電製品保證書 `hitachi_tw` — 機號去誤殺＋自動剝黑線貼字帶單點修復（v65）** — 嚴格鎖死已完美定案之 `hitachi_tw` 印章與型號（`BD-SX150JJ`）以及已封版之 Panasonic 國際牌、`lg_tw`（LG 台灣樂金）與 `mitsubishi_tw`（台灣三菱電機）邏輯完全不動。
- **具體進度**：
  1. **備份與版本徽章（`v65`）**：
     - 建立 `_backup/20261126_010238/` 完整備份，同步更新 `index.html` 與 `static/index.html` 至 `v65 (2026.11.26)` 與 `?v=65`。
  2. **寬容取框 ＋ 行列投影自動剝黑線貼字帶 ＋ 統一 `28px` 純白靜區（`static/card_templates.js`、`static/app.js`）**：
     - 放寬 `HITACHI_TW_WARRANTY_CONFIG.ocrRegions.serial` 與候選區至 `x: 16.5% ~ 35.5%`, `y: 55.2% ~ 64.6%`（`serialLabelBox` 僅作保守 Y 界參考，不再將 `rx` 右推至 `0.215` 截斷首碼 `T`）。
     - 新增 `extractHitachiSerialTightRegion()` 自動偵測並向內縮 `4px` 剝除四邊表格黑框線，再貼緊格內偏下半部實際文字墨水帶；並新增 `createHitachiPaddedGrayOcrCrop()` 與 `createAdaptiveBinarizedOcrCropCanvas()` 之可選 `pad: 28` 靜區參數，確保所有機號圖皆帶 `28px` 純白靜區。
  3. **關閉機號 `stripDottedUnderline` / `despeckle` 誤殺並補齊雙語 4.0x 備援（`static/app.js`）**：
     - 於 `runHitachiCardTargetedOcr()` 機號輪次強制設定 `stripDottedUnderline: false`、`stripBottomDotBand: false`、`despeckle: false`，徹底防止下半部較矮首碼 `T` 被誤當虛點底線或孤點抹白。
     - 對去框線＋補 `28px` 白邊的 `4.0x` 機號圖（含 `tight` 與 `cell` 備援）同步執行 `engWorker`（`psm = '7'` / `'8'`，二值化 `19`/`9` 與灰階對比）及 `chiEngWorker`（`psm = '6'` / `'7'`），並於 `console.debug` 紀錄各輪 `rawS` 供核對。
  4. **擴充首碼誤讀與訂購單還原容錯（`static/card_templates.js`、`static/app.js`）**：
     - `filterHitachiSerialResult()` 的 `stickyBorderMatch` 擴充為 `[1I7]`，訂購單 PDF 比對 `tailDigits` 擴充剝除開頭 `'1'` 或 `'7'`（`1633868` / `7633868` → `T633868`）。
  5. **驗證與歸檔**：通過 `HTML_SYNC_OK=True`、雙 JS 檔案括號平衡與 `CRLF` 換行檢核，並推送至 `origin/main`。

### [2026-11-26 00:57] (第 64 版 / v64)
- **執行項目**：**精修台灣日立家電製品保證書 `hitachi_tw` — 鎖定印章定案規格 ＋ 純白底無框線機號／型號雙軌 OCR 修復（v64）** — 嚴格遵守品牌隔離原則，絕不修改已封版之 Panasonic 國際牌、`lg_tw`（LG 台灣樂金）與 `mitsubishi_tw`（台灣三菱電機）任何核心邏輯。
- **具體進度**：
  1. **備份與版本徽章（`v64`）**：
     - 建立 `_backup/20261126_005422/` 完整備份，同步更新 `index.html` 與 `static/index.html` 至 `v64 (2026.11.26)` 與 `?v=64`。
  2. **嚴格鎖死已定案之 `hitachi_tw` 印章規格（`static/card_templates.js`）**：
     - 完整保留 `HITACHI_TW_STAMP_SPEC` 與 `detectHitachiDealerStampSpec()` 的印章中心座標（`centerX: 0.858`, `centerY: 0.455`）、寬度比例（`widthRatio: 0.237`）與垂直高度係數（`heightScale: 1.18`）一字不改。
  3. **純白底無框線安全區機號辨識修復（`static/card_templates.js`、`static/app.js`）**：
     - 收斂 `HITACHI_TW_WARRANTY_CONFIG.ocrRegions.serial` 與 `runHitachiCardTargetedOcr()` 至純白底安全區（`x: 18.5% ~ 34.5%, y: 56.8% ~ 63.4%`，依 `serialLabelBox` 中心內縮 `boxH: 0.066` 切除三面黑框線）。
     - 改回純英數 `worker`（`eng`，白名單 `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`）`4.0x` 放大，雙軌執行 `psm = '7'`（單行）與 `psm = '8'`（單字）三組對比（`thresholdOffset: 19`、`9` 與灰階對比）。
     - 強化 `filterHitachiSerialResult()` 支援首碼框線黏連萃取（如 `1T633868`／`IT633868` -> `T633868`）與內嵌 `[A-Z]\d{6}` 提取。
  4. **純白底無框線型號安全區與誤插 `44`/`11` 濾除（`static/card_templates.js`、`static/app.js`）**：
     - 收斂 `HITACHI_TW_WARRANTY_CONFIG.ocrRegions.model` 與 `runHitachiCardTargetedOcr()` 主視窗至 `x: 34.0% ~ 58.5%, y: 47.2% ~ 54.0%`（`boxH: 0.066`，避開右垂直線與上下框線），保留 `w: 0.295` 作為空值備援。
     - 於 `filterHitachiModelResult()` 與 `scoreHitachiModel()` 加入數字後尾碼字母間誤插垂直線 `44`/`11` 淨化與扣分（如 `BD-SX150J44J` -> `BD-SX150JJ`）。
  5. **驗證與歸檔**：通過 `HTML_SYNC_OK=True`、雙 JS 檔案括號平衡與 `CRLF` 換行檢核，並推送至 `origin/main`。

### [2026-11-26 00:47] (第 63 版 / v63)
- **執行項目**：**精修台灣日立家電製品保證書 `hitachi_tw` — 印章圓鼓高度微調係數 `heightScale = 1.18` ＋ 連字整格橫切穩抓機號修復（v63）** — 嚴格遵守品牌隔離原則，絕不修改已封版之 Panasonic 國際牌、`lg_tw`（LG 台灣樂金）與 `mitsubishi_tw`（台灣三菱電機）任何核心邏輯。
- **具體進度**：
  1. **備份與版本徽章（`v63`）**：
     - 建立 `_backup/20261126_004417/` 完整備份，同步更新 `index.html` 與 `static/index.html` 至 `v63 (2026.11.26)` 與 `?v=63`。
  2. **`hitachi_tw` 印章垂直高度微調係數 `heightScale = 1.18`（`static/card_templates.js`、`static/app.js`）**：
     - 保持 `HITACHI_TW_STAMP_SPEC` 與 `detectHitachiDealerStampSpec()` 的印章中心座標（`centerX: 0.858, centerY: 0.455`）及寬度比例（`widthRatio: 0.237`）完全不變，新增專屬屬性 **`heightScale: 1.18`**。
     - 於 `attachInteractiveStampToCardLayer()`、`autoArrangeWorkbenchLayout()` 與 `compositeStampOnOffscreenCard()` 套用 `(spec.heightScale || 1)` 計算顯示高度，使其餘品牌維持 `1` 完全不受影響，日立印章上下弧線圓鼓飽滿。
  3. **連同左側「機號」二字整格橫切 ＋ 剝除前綴穩抓機號（`static/card_templates.js`、`static/app.js`）**：
     - **整格橫切穩定基線**：調整 `HITACHI_TW_WARRANTY_CONFIG.ocrRegions.serial` 與 `runHitachiCardTargetedOcr()` 為 `x: 8.5% ~ 36.0%, y: 55.0% ~ 64.5%`（結合「機號」`Y` 軸動態定位，止於右側「購買日期」分隔線前並內縮避開上下水平線），放大 **`4.0x`** 以 `chiEngWorker` 雙語單行（`psm = 7`，不限英數白名單）執行標準（`19`）／深墨水低閾值（`9`）／灰階對比辨識。
     - **剝除「機號」前綴與訂購單還原**：升級 `filterHitachiSerialResult()` 先剝除 `機號`／冒號／空白雜訊，支援標準 `1~2` 碼英文＋`5~7` 碼數字（如 `T633868`）、`1`/`I` 誤讀如 `1633868` 及純 `6~7` 碼數字保底，並於訂購單比對時自動還原前導英文字母且寫回左下 5 行大字。
  4. **驗證與歸檔**：通過 `HTML_SYNC_OK=True`、雙 JS 檔案括號平衡與 `CRLF` 換行檢核，並推送至 `origin/main`。

### [2026-11-26 00:38] (第 62 版 / v62)
- **執行項目**：**精修台灣日立家電製品保證書 `hitachi_tw` — 印章原始比例鎖定防拉扁 ＋ 型號／機號必經路由與全圖雙重備援（v62）** — 嚴格遵守品牌隔離原則，絕不修改已封版之 Panasonic 國際牌、`lg_tw`（LG 台灣樂金）與 `mitsubishi_tw`（台灣三菱電機）任何核心邏輯。
- **具體進度**：
  1. **備份與版本徽章（`v62`）**：
     - 建立 `_backup/20261126_001136/` 完整備份，同步更新 `index.html` 與 `static/index.html` 至 `v62 (2026.11.26)` 與 `?v=62`。
  2. **強制鎖定 `hitachi_tw` 印章原始寬高等比例縮放（`static/card_templates.js`、`static/app.js`）**：
     - 保持 `centerX: 0.858`、`centerY: 0.455` 與 `widthRatio: 0.237`（原地放大 `1.1` 倍寬度），嚴禁獨立寫死 `heightRatio` / `targetH`。
     - 於 `attachInteractiveStampToCardLayer()` 與 `autoArrangeWorkbenchLayout()` 明確以 `stampImg.naturalHeight / stampImg.naturalWidth` 連動計算 `targetH = Math.round(targetW * stampAspectRatio)`，徹底杜絕橫向拉扁變形。
  3. **打通 `hitachi_tw` 必經路由、橫切擴邊與全圖 OCR 雙重備援（`static/card_templates.js`、`static/app.js`）**：
     - **必經路由與最高寫回優先權**：於 `btnRunOcr` 補齊 `hitachi_tw` 自動觸發 `runHitachiCardTargetedOcr()` 與 `parsed.brand = '日立'` 保護，嚴禁通用文字解析覆蓋 `hitachi_tw` 結果。
     - **「商品」橫切放寬至 `x: 32.0% ~ 70.0%` ＋ 「機號」精準切框 `x: 16.0% ~ 36.0%`**：於 `HITACHI_TW_WARRANTY_CONFIG` 與 `runHitachiCardTargetedOcr()` 動態對齊「商品」與「機號」文字框 Y 軸中心，型號跑 `3.5x` 二值化＋灰階對比、機號跑 `4.0x` 標準（`19`）／深墨水低閾值（`9`）／灰階三軌辨識，並在 `filterHitachiModelResult()` 修復連字號後末碼單字元拆字空白（如 `BD-SX150J J`）。
     - **拉正全圖掃描 ＋ Fallback Regex 雙重備援**：表單錨點缺漏或結果不足時自動掃描 `rectifiedCleanCanvas` 全圖並以 Fallback Regex 從「商品」／「機號」附近撈取完整型號（如 `BD-SX150JJ`）與機號（如 `T633868`），依分數擇優寫回並重繪左下 5 行核對大字。
  4. **驗證與歸檔**：通過 `HTML_SYNC_OK=True`、雙 JS 檔案括號平衡與 `CRLF` 換行檢核，並推送至 `origin/main`。

### [2026-11-26 00:28] (第 61 版 / v61)
- **執行項目**：**精修台灣日立家電製品保證書 `hitachi_tw` — 印章原地放大 1.1 倍 ＋ 機號／型號尾碼精準辨識修復（v61）** — 嚴格遵守品牌隔離原則，絕不修改已封版之 Panasonic 國際牌、`lg_tw`（LG 台灣樂金）與 `mitsubishi_tw`（台灣三菱電機）任何核心邏輯。
- **具體進度**：
  1. **備份與版本徽章（`v61`）**：
     - 建立 `_backup/20261126_002452/` 完整備份，同步更新 `index.html` 與 `static/index.html` 至 `v61 (2026.11.26)` 與 `?v=61`。
  2. **`hitachi_tw` 印章原地放大 `1.1` 倍（`static/card_templates.js`）**：
     - 保持 `HITACHI_TW_STAMP_SPEC` 與 `detectHitachiDealerStampSpec()` 的印章中心座標（`centerX: 0.858`, `centerY: 0.455`）完全不變，僅將寬度比例 `widthRatio` 由 `0.215` 原地放大 `1.1` 倍調整為 **`0.237`**（動態校準夾限同步調升至 `[0.225, 0.250]`）。
  3. **修復 `hitachi_tw` 機號（`T633868`）雙閾值辨識與放寬型號（`BD-SX150JJ`）右邊界（`static/card_templates.js`、`static/app.js`）**：
     - **機號 Y 軸動態定位 ＋ `4.0x` 雙閾值增強**：於 `createAdaptiveBinarizedOcrCropCanvas()` 加入選用 `options.thresholdOffset`（預設維持 `19` 不影響他牌），於 `runHitachiCardTargetedOcr()` 結合左側「機號」`anchorY` 動態對齊避開框線之純白底機號區（保底 `x: 19.0%~35.5%, y: 55.8%~64.2%`），以 `4.0x` 執行標準（`19`）與深墨水低閾值（`9`）雙次 `psm = 7` 純英數辨識，救回細筆畫開頭英文字母（如 `T`、`H`、`K`、`A`）；`filterHitachiSerialResult()` 同時支援合併拆字空白及保留純 `6～7` 碼數字備援並可依訂購單補全前導字母。
     - **型號右邊界放寬至 `61.5%`**：調整 `HITACHI_TW_WARRANTY_CONFIG.ocrRegions.model` 與 `runHitachiCardTargetedOcr()` 為 `x: 34.0% ~ 61.5%, y: 46.5% ~ 55.5%`，完整包覆末碼字母（如 `BD-SX150JJ`）並優先與訂購單比對寫回左下 5 行大字（第 3 行維持 `日立 <型號>`、第 4 行 `機號 <機號>`）。
  4. **驗證與歸檔**：通過 `HTML_SYNC_OK=True`、雙 JS 檔案括號平衡與語法檢查、`CRLF` 換行檢核並推送至 `origin/main`。

### [2026-11-26 00:15] (第 60 版 / v60)
- **執行項目**：**新增「台灣日立阿奇立克家電製品保證書 `hitachi_tw`」獨立命名空間模板（v60）** — 嚴格遵守品牌隔離原則，絕不修改已封版之 Panasonic 國際牌、`lg_tw`（LG 台灣樂金）與 `mitsubishi_tw`（台灣三菱電機）任何核心邏輯。
- **具體進度**：
  1. **備份與版本徽章（`v60`）**：
     - 建立 `_backup/20261126_000715/` 完整備份，同步更新 `index.html` 與 `static/index.html` 至 `v60 (2026.11.26)` 與 `?v=60`，並於 `#selectCardTemplateMode` 新增啟用 `手動指定：台灣日立家電製品保證書 (hitachi_tw)`。
  2. **註冊 `hitachi_tw` 獨立規則與最前端優先分類（`static/card_templates.js`）**：
     - 於 `CARD_BRAND_REGISTRY` 啟用 `hitachi`，建立 `HITACHI_TW_STAMP_SPEC`（`centerX: 0.858, centerY: 0.455, widthRatio: 0.215`）、`HITACHI_TW_WARRANTY_CONFIG` 與 `CARD_TEMPLATES.hitachi_tw`（`aspectRatio: 1.52`）。
     - 新增 `detectHitachiWarrantyByText()`：命中專屬唯一地標（`阿奇立克日立台灣家電股份有限公司` / `阿奇立克日立`、`hitachi-homeappliances.com.tw`、`台北市南京東路3段65號2樓`）任 1 項或組合地標（`HITACHI`、`家電製品保證書`、`經銷商確認章`、`SKU NO.`）任 2 項，即於 `classifyDocumentByTextAndColor()` 最優先級無條件判定為保卡 `hitachi_tw`，徹底防範右下 QR Code 誤判為發票。
  3. **實作雙黑線四點透視校正 ＋ 經銷商確認章右側十字蓋章（`detectHitachiCardQuad` / `detectHitachiDealerStampSpec`）**：
     - `detectHitachiCardQuad()` 偵測白底雙黑線外框四邊外緣並保留均勻 `3mm～5mm` 呼吸白邊進行原比例拉正，完整保留左上「家電製品保證書」、右上「HITACHI」與右下聯絡／QR 區。
     - `detectHitachiDealerStampSpec()` 透過直線投影與 `HITACHI`／`經銷商確認章`／`購買日期` 文字錨點校準：左弧緊貼「經銷商確認章」右側、右弧貼齊右側表格內框線、上在 `HITACHI` 正下方、中央日期方框對應左側「商品」列、底弧貼齊「購買日期」列下方水平線，並掛載為 v56 可拖曳互動式 `Multiply` 印章圖層。
  4. **實作 `hitachi_tw` 高解析型號／機號辨識、訂購單比對與左下 5 行大字帶入 `日立`（`static/card_templates.js`、`static/app.js`）**：
     - 新增 `filterHitachiModelResult()`、`filterHitachiSerialResult()`、`parseHitachiFormBlock()` 與 `runHitachiCardTargetedOcr()`（全程 `try / catch` 保護）：跳過中文品名裁切「商品」列右側型號（`x: 34.5%~57.5%, y: 46.5%~55.5%`，如 `BD-SX150JJ`）與「機號」列右側機號（`x: 17.5%~34.5%, y: 55.5%~64.5%`，如 `T633868`），放大 `3.5x` 單行 OCR，支援訂購單交叉校正，並強制於 `buildAutoFiveLineNoteText()` 第 3 行輸出 **`日立 <型號>`**。
  5. **驗證與歸檔**：通過 `HTML_SYNC_OK=True`、雙 JS 檔案括號平衡與語法檢查、`CRLF` 換行檢核並推送至 `origin/main`。

### [2026-11-24 23:37] (第 59 版 / v59)
- **執行項目**：**回滾還原 v57 穩定核心 ＋ 安全輕量修復三菱機型辨識（v59）** — 根除 v58 三菱保卡卡死於「保卡 處理中...」與圖片比例拉扁問題，恢復正常透視、印章落點、互動拖曳與「三菱」5 行輸出。
- **具體進度**：
  1. **備份與還原**：建立 `_backup/20261124_233518/` 備份後，將 `static/card_templates.js` 與 `static/app.js` 完整還原至 `_backup/20261124_232452/`（v57 穩定版），雙份 HTML 升級為 `v59 (2026.11.24)` 與 `?v=59`。
  2. **純英數輕量微調與 `try/catch` 保護**：收緊 `mitsubishi_tw` 機型預設裁切窗格至 `x: 11.5%~24.0%, y: 15.8%~21.5%` 並改用 `3.5x` 單行辨識（不重寫任何表格線像素迴圈）；`filterMitsubishiModelResult()` 改採安全純字串規則校準 `MR-/MJ-/MSZ-/MUZ-` 與容量數字誤字，全段納入 `try/catch` 回退保護。
  3. **驗證與推送**：通過 HTML 雙份一致、真實 V8 引擎 JS 載入與單元測試、`CRLF` 檢查並推送至 `origin/main`。

### [2026-11-24 23:27] (第 58 版 / v58)
- **執行項目**：**升級三菱電機保證書 `mitsubishi_tw` 四綠框十字定位機型精準辨識（v58）** — 嚴格凍結 v57 三菱印章座標（`centerX: 0.218`, `centerY: 0.788`, `widthRatio: 0.285`）、v56 互動式印章與「🔄 重新讀取」快照池、以及 Panasonic 與 LG 已封版核心。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_232452/` 備份，雙份 HTML 升級為 `v58 (2026.11.24)` 與 `?v=58`。
  2. **四綠框十字避讓與 `4.0x` 點陣補點（`static/card_templates.js`、`static/app.js`）**：收緊 `ocrRegions.model` 至 `x: 0.112, y: 0.158, w: 0.130, h: 0.058`，新增 `detectMitsubishiModelTableBounds()` 與 `createMitsubishiDotMatrixOcrCropCanvas()`，實現表格框線 `3px` 內縮切除、`4.0x` 放大、對比拉伸與 `3x3` 暗像素筆畫連通補點。
  3. **型號防呆與交叉校正（`static/card_templates.js`、`static/app.js`）**：升級 `filterMitsubishiModelResult()` 校準 `MR-`/`MJ-`/`MSZ-`/`MUZ-` 前綴、容量數字區與 `-W-C` 尾碼，並於 `runMitsubishiCardTargetedOcr()` 加入訂購單模糊前綴補強比對與強制寫回。
  4. **驗證與推送**：通過 HTML 雙份雜湊一致、`CRLF`、雙 JS 語法檢查（`errors=0`）並推送至 `origin/main`。

### [2026-11-24 23:17] (第 57 版 / v57)
- **執行項目**：**單點鎖定三菱保證書 `mitsubishi_tw` 印章垂直座標（`centerY: 0.788`、底緣弧線切齊底部黑外框線）** — 嚴格凍結 `static/app.js`（v56 互動印章與 `🔄 重新讀取`）、`05-calculator.js`、`08-ui-desktop.js` 以及 Panasonic、LG 與三菱 OCR 核心，僅調整三菱印章 Y 軸對位。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_231710/` 備份，雙份 HTML 升級為 `v57 (2026.11.24)` 與 `?v=57`。
  2. **垂直底線對位（`static/card_templates.js`）**：保持 `centerX: 0.218`、`widthRatio: 0.285` 不變，將 `MITSUBISHI_TW_STAMP_SPEC.centerY` 更新至 **`0.788`**，並讓 `detectMitsubishiDealerStampSpec()` 直接以 `bottomLineNorm - estStampHNorm * 0.5`（夾限 `[0.775, 0.802]`）使印章底緣弧線最低點切齊底部黑色水平外框線。
  3. **驗證與推送**：通過 HTML 雙份雜湊一致、`CRLF`、`JS_BALANCE`（`errors=0`）檢查並推送至 `origin/main`。

### [2026-11-24 23:06] (第 56 版 / v56)
- **執行項目**：**互動式印章圖層升級、頂部極簡工具列＋`🔄 重新讀取` ＋ 三菱印章右移 2mm（v56）** — 嚴格凍結 Panasonic 與 LG `lg_tw` 已封版核心，將保卡自動蓋章全面升級為不破壞底圖的互動式 `Multiply` 獨立印章圖層，新增原始檔案快照池與頂部一鍵重新讀取功能。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_230006/` 備份，雙份 HTML 升級為 `v56 (2026.11.24)` 與 `?v=56`。
  2. **三菱座標微調（`static/card_templates.js`）**：維持 `centerY: 0.765` 與 `widthRatio: 0.285` 不變，僅將 `MITSUBISHI_TW_STAMP_SPEC.centerX` 調至 `0.218`（`detectMitsubishiDealerStampSpec()` 同步 `+0.010`）。
  3. **互動式印章管線（`static/app.js`、`static/style.css`）**：新增 `attachInteractiveStampToCardLayer()` 與 `hasWarrantyCardStampAttached()`，保留乾淨 `rectifiedCleanCanvas` 並疊加可單壓亮框、零延遲拖曳／捏合縮放與雙擊喚醒 `#mobileStampEditBar`（支援桌面與手機浮動顯示）之獨立 `stamp` 圖層。
  4. **極簡工具列與快照重讀**：以 `.toolbar-v56-hidden` 隱藏 5 個冗餘項目並於原「適合視窗」位置加入 `#btnReloadRawBatch`（`🔄 重新讀取`），透過 `_lastImportedRawFiles` 保留原始 `File` 物件一鍵原地重新辨識、裁切與蓋章。
  5. **驗證與推送**：通過 HTML 雙份雜湊一致、全檔 `CRLF`、`JS_BALANCE`（`errors=0`）檢查並推送至 `origin/main`。

### [2026-11-24 22:12:59] (第 54 版 / v54)
- **執行項目**：**三菱電機保證書 `mitsubishi_tw` 印章放大 `1.4` 倍並鎖定四邊框線（v54）** — 嚴格凍結 Panasonic、LG 與三菱 OCR 邏輯，僅將三菱印章放大至 `widthRatio: 0.285` 並鎖定左下四邊框線對齊。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_221159/` 備份，更新雙份 HTML 至 `v54 (2026.11.24)` 與 `?v=54`。
  2. **1.4 倍放大與四邊對齊（`static/card_templates.js`）**：更新 `MITSUBISHI_TW_STAMP_SPEC` 至 `centerX: 0.208, centerY: 0.765, widthRatio: 0.285`，並同步調寬 `detectMitsubishiDealerStampSpec()` 動態對位夾限 `[0.268, 0.302]`（確保左貼「機」字、上貼「購買日期：年」橫線、右微壓中柱線 `1~2px`、下貼最底外框線）。
  3. **驗證與推送**：通過 HTML 同步、規格檢查、語法平衡與 `CRLF` 檢查並推送至 `origin/main`。

### [2026-11-24 22:05:54] (第 53 版 / v53)
- **執行項目**：**新增台灣三菱電機商品保證書獨立模板 `mitsubishi_tw`（v53）** — 嚴格隔離不修改 Panasonic 與 LG 已封版核心，新增三菱電機 8 組地標分類、對角雙紅標四點校正、左下 6 紅框十字蓋章、`3.0x` 機型／製造號碼辨識與中文 `三菱` 5 行核對大字。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_220106/` 備份，更新雙份 HTML 至 `v53 (2026.11.24)`、`?v=53` 與 `#selectCardTemplateMode` `mitsubishi_tw` 選項。
  2. **`mitsubishi_tw` 獨立規則（`static/card_templates.js`）**：註冊 `mitsubishi`、定義 `MITSUBISHI_TW_STAMP_SPEC`（`centerX: 0.232, centerY: 0.745, widthRatio: 0.205`）、新增 `detectMitsubishiWarrantyByText()` 最前端優先分類、對角雙紅標 `detectMitsubishiCardQuad()` 與 6 紅框對位 `detectMitsubishiDealerStampSpec()`（左貼「機」、上貼「購買日期：年」橫線、右微壓中柱線、中線對齊「電話：」）。
  3. **專項 OCR 與 5 行大字路由（`static/app.js`）**：新增 `runMitsubishiCardTargetedOcr()`（`MR-JX61N-W-C` 與純數字製造號碼 `600067` ＋ 訂購單多連字號型號擷取比對）、強制寫回 `layer.ocrData`，並於 `buildAutoFiveLineNoteText()` 第 3 行自動帶入中文 `三菱`；順手清理先前誤入 `runCardTargetedOcr()` 頂端之 LG 快取清除片段以確保 Panasonic 零干擾。
  4. **驗證與推送**：通過 HTML 同步、品牌規格隔離驗證、語法平衡與 `CRLF` 檢查並推送至 `origin/main`。

### [2026-11-24 21:26:33] (第 52 版 / v52)
- **執行項目**：**LG 印章水平座標單點左移約 `0.3cm`（`centerX - 0.015`）（v52）** — 嚴格凍結 v51 已過關之 LG 機號／型號辨識、`Y` 軸高度（`0.585`）、`112%` 寬度比例（`0.172`）及 Panasonic 國際牌已封版核心，僅微調水平座標對稱落點。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_212548/` 備份，更新雙份 HTML 至 `v52 (2026.11.24)` 與 `?v=52`。
  2. **單點水平偏移（`static/card_templates.js`）**：將 `LG_TW_STAMP_SPEC.centerX` 調整為 **`0.730`**，並於 `detectLgDealerBoxStampSpec()` 統一套用 `-0.015` 向左微調。
  3. **驗證與推送**：通過 HTML 同步、語法平衡與 `CRLF` 檢查並推送至 `origin/main`。

### [2026-11-24 21:20:46] (第 51 版 / v51)
- **執行項目**：**LG 印章四紅圈幾何鎖定 ＋ 三段式徹底修復 LG 機號辨識（v51）** — 嚴格保留 Panasonic 已封版核心與 v50 `WD-S1818PB` 型號規則，依四紅圈特寫圖鎖定 `112%` 方框寬度與底弧緊貼 `經銷商店章` 上緣 `2~4px`，並修復 Code 128 Stop `106` 解析與 `4.0x` 去虛點單行機號辨識。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_211102/` 及 `_backup/20261124_211937/`，更新雙份 HTML 至 `v51 (2026.11.24)` 與 `?v=51`。
  2. **四紅圈特寫印章鎖定（`static/card_templates.js`）**：更新 `LG_TW_STAMP_SPEC` 至 `centerX: 0.745, centerY: 0.585, widthRatio: 0.172`，並於 `detectLgDealerBoxStampSpec()` 以方框寬度 `1.12` 倍與真實印章寬高比 `1.2806` 對齊底弧於 `經銷商店章` 上方 `2px～4px`、左右對稱微跨框線。
  3. **第一段多尺度條碼直讀修復**：修復 `decodeCode128FromCanvas()` 之 Stop 符號 `106 ('2331112')` 7 條空判定漏洞，並於 `tryDecodeLgUpperBarcodeSerial()` 加入 `2x/3x` 黑白二值化銳化裁切重試 `BarcodeDetector` 與純 JS 解碼。
  4. **第二段 `4.0x` 超清機號 OCR 與強制覆寫**：升級 `createAdaptiveBinarizedOcrCropCanvas(..., 4.0)` 新增 3x3 形態學去噪與由下而上切除虛點底線列，搭配雙組純英數白名單 ROI 與強制寫回 `layer.ocrData`／`cachedReceiptOcrInfo`／5 行大字。
  5. **驗證與推送**：通過 HTML 同步、四紅圈規格鎖定、語法平衡與 `CRLF` 檢查並推送至 `origin/main`。

### [2026-11-24 20:40:05] (第 50 版 / v50)
- **執行項目**：**LG 印章再左移 0.3cm 對稱置中 ＋ 機號寫回優先權鎖定 ＋ 型號尾碼校正（v50）** — 完整保留 Panasonic 已封版核心，完成 LG `lg_tw` 最後微調。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_203550/` 備份，更新雙份 HTML 至 `v50 (2026.11.24)` 與 `?v=50`。
  2. **印章水平再左移 `0.3cm`**：維持垂直 `Y` 不動，將 `LG_TW_STAMP_SPEC.centerX` 調整至 **`0.745`**，並於 `detectLgDealerBoxStampSpec()` 套用 `-0.015` 偏移對稱置中。
  3. **型號尾碼校正與條碼強化**：`filterLgModelResult()` 修復 `WD-S1818P8 ➔ WD-S1818PB`；`decodeCode128FromCanvas()` 實作 ISO/IEC 15417 T1–T4 抗油墨擴張解碼與局部均值二值化，並縮緊 `findBarcodeBottomGuardNorm()` 避免截斷機號字頂。
  4. **鎖死 `lg_tw` 寫回優先權（`static/app.js`）**：同步寫入 `layer.templateId = 'lg_tw'` 與 `layer.ocrData` 並於 `buildAutoFiveLineNoteText()`／`btnRunOcr`／訂購單比對中禁止舊全域 OCR 覆蓋 `serial` 與 `model`。
  5. **驗證與推送**：通過 HTML 同步、語法檢查與 `CRLF` 檢核並推送至 `origin/main`。

### [2026-11-24 20:26:22] (第 49 版 / v49)
- **執行項目**：**LG 條碼直接解碼機號 ＋ 去虛點 3.5x OCR ＋ 印章下移 1cm／左移 0.5cm 精準進框（v49）** — 嚴格隔離並完整保留 Panasonic 已封版核心，修復實測機號／型號殘留誤讀及印章偏高／偏右切框與木桌留白問題。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_202229/` 備份，更新雙份 HTML 為 `v49 (2026.11.24)` 與 `?v=49`。
  2. **條碼直讀機號與強制覆寫（`static/card_templates.js` / `static/app.js`）**：於 `runLgCardTargetedOcr()` 第一優先整合原生 `BarcodeDetector` 與純 JS `decodeCode128FromCanvas()`（Mod-103 校驗）讀取 `機號` 上方條碼；第二優先採 `3.5x` 去虛點底線自適應二值化與 `filterLgModelResult()` 修復 `WDSIB18PB ➔ WD-S1818PB`；搭配 `mergeOcrSummaryFields(..., { forceOverwrite: true })` 無條件覆寫全域 OCR 舊值。
  3. **印章偏移進框與收緊白紙裁切**：調整 `LG_TW_STAMP_SPEC` 至 `centerX: 0.760, centerY: 0.620, widthRatio: 0.162`（盒寬 `94%~96%`），修正 `detectLgDealerBoxStampSpec()` 盒內投影避免左側文字誤觸，並強化 `detectLgCardQuad()` 右／下暗部裁切與 `0.6%`（約 `3mm`）極窄紙邊。
  4. **驗證與推送**：通過 HTML 同步、語法檢核與 `CRLF` 檢查並推送至 `origin/main`。

### [2026-11-24 20:17:19] (第 48 版 / v48)
- **執行項目**：**升級 LG `lg_tw` 白紙去背透視 ＋ 「經銷商店章＋右側QR碼」垂直雙地標蓋章 ＋ 2.5x 自適應二值化專項 OCR（v48）** — 在嚴格隔離不改動 Panasonic 已封版核心與 v47 分類路由下，修復木桌背景裁切、印章右偏壓字與機型／機號識別錯誤。
- **具體進度**：
  1. **備份與版本**：建立 `_backup/20261124_201201/`，同步更新雙份 HTML 為 `v48 (2026.11.24)` 與 `?v=48`。
  2. **白紙四邊 RANSAC 去背拉正**：重寫 `detectLgCardQuad()` 以四向階躍邊界與 RANSAC 直線擬合精準找出白色貼紙四頂點（僅留 `~1.2%` 呼吸紙邊），依實測 `estimatedAspect` 透視校正去除木桌背景。
  3. **垂直雙地標同軸蓋章**：升級 `detectLgDealerBoxStampSpec()` 偵測右下第二 QR Code 與 `經銷商店章` 文字錨點、縮放印章至圓角框淨寬 `98%` 並避開下方四字；更新 `LG_TW_STAMP_SPEC` 保底值為 `centerX: 0.785, centerY: 0.565, widthRatio: 0.168`。
  4. **局部 `2.5x` 二值化與規則校準**：新增 `createAdaptiveBinarizedOcrCropCanvas()`、條碼下緣隔離 `findBarcodeBottomGuardNorm()`、`filterLgModelResult()` 數字區 `B->8` 校正與 12 碼 `[3數]+[6英]+[3數]` `normalizeLgSerialTokenByPosition()`。
  5. **驗證與推送**：通過 HTML 同步、語法檢核與 `CRLF` 檢查並推送至 `origin/main`。

### [2026-11-24 20:08:23] (第 47 版 / v47)
- **執行項目**：**以 6 組專屬關鍵字鎖死 LG 保證書最前端角色分類路由（v47）** — 徹底修復 LG 台灣樂金保證書因雙 QR Code 與 `MBM65176322` 編號導致在匯入分類器被誤判為發票（`receipt`）之問題，保留全部 v46 `lg_tw` 與 Panasonic 封版核心。
- **具體進度**：
  1. **版本徽章與靜態快取參數**：建立 `_backup/20261124_200442/` 備份後，更新雙份 HTML 為 `v47 (2026.11.24)` 與 `?v=47`。
  2. **最高優先級 LG 保卡強制命中規則（`static/card_templates.js`）**：於 `detectLgWarrantyByText()` 同步檢核原始字串與去空白／破折號正規化字串之 4 項專屬唯一地標與 4 項組合地標，並於 `classifyDocumentByTextAndColor()` 最優先級執行（優先權高於發票編碼、發票關鍵字與比例偵測），命中即鎖定 `role: 'warranty_card'` 與 `forcedTemplateId: 'lg_tw'`。
  3. **匯入路由保護（`static/app.js`）**：更新 `importImagePureFrontend()` 依 `forcedTemplateId === 'lg_tw'` 與 `lgMatch.isLg`（且排除 Panasonic 品牌文字）強制導向 `lg_tw` 獨立管線，確保三件組批次與手機複選上傳時 LG 保卡與發票各自精準分流。
  4. **驗證與推送**：通過 HTML 雙向同步、語法檢查與 `CRLF` 驗證並推送至 GitHub。

### [2026-11-24 19:58:39] (第 46 版 / v46)
- **執行項目**：**新增 LG 台灣樂金保證書獨立模板 `lg_tw`（v46）** — 先行 `git pull origin main` 對齊雲端第 45 版後，在完全不改動 Panasonic 國際牌邏輯前提下，透過品牌註冊制新增 `lg_tw` 獨立規則（地標偵測、白底貼紙 `0.5cm` 外擴拉正、`經銷商店章` 上半部光影蓋章、型號/機號防呆 OCR ＋ 訂購單交叉校正與左下 5 行 `LG` 品牌填入）。
- **具體進度**：
  1. **同步與版本防快取**：完成 `git pull` 與 `_backup/20261124_191126/` 備份，更新雙份 HTML 至 `v46 (2026.11.24)`、開啟 `lg_tw` 手動選項並加上 `?v=46`。
  2. **`lg_tw` 獨立偵測與透視外擴（`static/card_templates.js`）**：新增 `LG_TW_WARRANTY_CONFIG`、`CARD_TEMPLATES.lg_tw`、`detectLgWarrantyByText()` 與 `detectLgCardQuad()`（四邊保留 `0.5cm` 白邊以完整顯示 `LG` LOGO、`MBM...` 編號與雙 QR Code）。
  3. **`經銷商店章` 框線校準與上半部蓋章**：新增 `detectLgDealerBoxStampSpec()` 偵測矩形邊界，以 `104%` 框寬（約整卡 `17.5%`）對位於上半部避開底部 `經銷商店章` 四字，套用光影與 `Multiply` 合成。
  4. **LG 型號／機號 OCR 與 5 行大字品牌路由（`static/app.js`）**：新增獨立 `runLgCardTargetedOcr()` 搭配 `parseLgTopFormRow()`、`filterLgSerialResult()`（依位置防呆修正 `0/O`、`1/I`、`8/B`）與訂購單 `LG` 答案庫比對，並於 `buildAutoFiveLineNoteText()` 自動帶入 `LG`。
  5. 通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-24 02:47:03] (第 45 版 / v45)
- **執行項目**：**電腦版三件組即時進度狀態列 ＋ 合併製作完成大字提示（v45）** — 新增極低資源佔用（純 CSS class 切換、零 `setInterval`／`backdrop-filter`）之電腦版 `#desktopBatchStatusPanel` 三條即時進度狀態列，並於三件組全數處理與蓋章排版完成後顯示穿透式 `🎉 合併製作完成` 提示。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v45 (2026.11.24)`，加上 `style.css?v=45`、`card_templates.js?v=45`、`app.js?v=45`。
  2. **電腦版即時三條進度列**：新增 `#desktopBatchStatusPanel`（`.is-mobile-mode` 自動隱藏），透過 `beginDesktopBatchProgress()` 與 `markDesktopBatchRoleStatus()` 依匯入檔案切換 `⏳ 訂單/發票/保卡 處理中...` 與綠色 `✓ ... 處理完成`，結束即 `display: none` 零佔用。
  3. **穿透式完成大字提示**：當訂單、發票、保卡三者皆完成排版與蓋章後，`checkDesktopBatchCompletion()` 切換顯示 `🎉 合併製作完成`（`pointer-events: none`），停留 `1.5s` 後以 `0.35s` 淡出隱藏。
  4. 建立 `_backup/20261124_024457/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-24 02:35:45] (第 44 版 / v44)
- **執行項目**：**訂購單紫線安全裁切 ＋ 紅框純白挖空 ＋ 鎖定圖紙與保卡發票原始比例（v44）** — 重算訂購單安全右緣裁切線保護上方 `注意:...。` 與下方 `總金額(含稅):...`、以純白挖空商品右三欄（`預計交貨日`／`贈品否`／`贈品活動訖日`），並鎖定畫布總寬度及下方保卡 70%／發票 27%／5 行大字比例絕不縮小。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v44 (2026.11.24)`，加上 `style.css?v=44`、`card_templates.js?v=44`、`app.js?v=44`。
  2. **紫線安全裁切線**：`buildPurifiedOrderSheetCanvas()` 改取 `注意:...` 與 `總金額(含稅):...` 最右緣最大值加 `20px` 安全白邊為 `cropRightX`，確保上下關鍵文字 100% 完整不被截斷。
  3. **紅框純白挖空右三欄**：於 `數量` 欄右緣至 `cropRightX`、垂直涵蓋右三欄表頭至最後保留商品下緣區間以 `#FFFFFF` 精準遮白，保持版面純淨且絕不覆蓋上下方文字。
  4. **鎖定下方 70% / 3% / 27% 原比例**：`autoArrangeWorkbenchLayout()` 與 `syncSummaryTextLayer()` 鎖定以畫布固定 `usableW` 為基準計算保卡、發票與 5 行文字尺寸，不受訂購單寬度變化影響。
  5. 建立 `_backup/20261124_023406/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-24 02:24:34] (第 43 版 / v43)
- **執行項目**：**專櫃訂購單 PDF 精準去敏遮白 ＋ 贈品自動過濾收合排版（v43）** — 在保留記憶體訂單單號與型號答案庫之前提下，新增 `buildPurifiedOrderSheetCanvas()` 實現 PDF 原生座標白底遮白、`專櫃名稱:XXXX` 無失真切片左移、僅留前 6 欄垂直裁切，以及贈品黑名單列跳過與付款／金額區無縫上移貼齊。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v43 (2026.11.24)`，加上 `style.css?v=43`、`card_templates.js?v=43`、`app.js?v=43`。
  2. **原生座標去敏與櫃位重組**：先行萃取 `rawPdfText` 與 `cachedOrderItemModels`，再遮白 `頁次`、`製表日期`、`訂單單號`，並透過 `purifyDepartmentSalespersonRow()` 將 `專櫃名稱/業務姓名:櫃位/業務` 精準淨化為 `專櫃名稱:櫃位`。
  3. **前 6 欄裁切與 Slice & Stitch**：從 `數量` 右緣垂直裁除預計交貨日與贈品否等右三欄；依黑名單（`贈品`、`獨家贈`、`贈`、`GIFT`、`SP-`，不分大小寫）過濾整列贈品與折行規格，並將細分隔線、收款方式及總金額區塊無縫緊貼於主商品下方。
  4. 建立 `_backup/20261124_022138/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-24 01:56:25] (第 42 版 / v42)
- **執行項目**：**手機工作區一開始即全開滿版置中 ＋ 無裁切兩指縮放（v42）** — 徹底解除手機端內層畫布包裝容器之 `transform` 殘留盒模型裁切，改以精準 `邏輯寬高 × mobileViewScale` 同步 `#canvasStage`/`#canvasWrapper`/`#mainCanvas` 尺寸，實作 `fitMobileCanvasToViewport()` 初始與合成完滿版置中，並優化兩指焦點縮放與雙擊空白復原。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v42 (2026.11.24)`，加上 `style.css?v=42`、`card_templates.js?v=42`、`app.js?v=42`。
  2. **無裁切內外層容器重構**：`.is-mobile-mode` 外層 Flex 100% 撐滿全螢幕可用工作區；`setZoom()` 於手機端關閉 `transform: scale()` 改以精準 `visualW × visualH` 設定容器尺寸（同時保留 300DPI 內部像素緩衝）。
  3. **`fitMobileCanvasToViewport()` 自動滿版置中**：依可用空間扣四邊 `12px` 邊距計算 `mobileFitScale`，確保空白白紙初始開啟及三樣組合定版後皆完整居中、四邊無裁切。
  4. **無跳動兩指縮放與雙擊空白復原**：修正以 `#canvasStage` 為基準之雙指焦點計算（支援 `fitScale` ～ `3.0x`），放大後可單指自由平移瀏覽，雙擊空白處一鍵恢復滿版置中；雙擊印章與 5 行文字編輯功能完整保留。
  5. 建立 `_backup/20261124_015427/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-24 01:48:24] (第 41 版 / v41)
- **執行項目**：**手機工作區全開展開 ＋ 製作完成大字提示 ＋ 雙擊印章「改日期」按鈕（v41）** — 導入 `#canvasStage` 精準佔位與全開 Flex 容器修復手機畫布裁邊，新增三樣完成中央穿透式四行大字完成提示，並於雙擊印章編輯列「歸零」左側新增「改日期」按鈕直接重喚民國日期視窗更新印章日期。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v41 (2026.11.24)`，加上 `style.css?v=41`、`card_templates.js?v=41`、`app.js?v=41`。
  2. **手機工作區全開展開**：以 `#canvasStage`（`visualW × visualH` + `margin: auto`）搭配 `.is-mobile-mode` `flex: 1 1 0%` 全展開設定，確保初始、三樣組合與解鎖後均完整滿版置中不裁切。
  3. **中央穿透式完成提示**：新增 `#mobileCompleteOverlay`（`pointer-events: none` 四行大字「保卡 / 發票 / 訂單 / 製作完成」），於三件組完成蓋章瞬間淡入 `0.25s`、停留 `1.5s`、淡出 `0.4s`，絕不擋手。
  4. **雙擊印章「改日期」鈕**：於 `#mobileStampEditBar` 歸零左側加入 `#btnMobileChangeStampDate`，點擊喚起預帶日期的民國日期視窗並無損保留座標、縮放與光影配色更新印章。
  5. 建立 `_backup/20261124_014536/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-24 01:27:32] (第 40 版 / v40)
- **執行項目**：**手機預覽圖紙自動滿版 ＋ 雙擊印章雙指縮放調色 ＋ 雙擊文字編輯（v40）** — 實作 `.is-mobile-mode` 畫布自動完整縮放置中、預設隱藏選取框與單指防誤觸鎖定、雙擊專櫃印章（含自動拆分保卡合成章）進入藍色框編輯搭配雙指捏合縮放與浮動藍調微調列，以及雙擊 5 行核對文字手機彈窗編輯。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v40 (2026.11.24)`，加上 `style.css?v=40`、`card_templates.js?v=40`、`app.js?v=40`。
  2. **手機端滿版縮放適配與防誤觸**：強化 `setZoom()` 與 `fitCanvasToViewport()` 置中並抵消縮放殘餘捲動空間，排版與螢幕旋轉後自動滿版呈現；預設隱藏選取外框與關閉單指物件拖曳。
  3. **雙擊印章編輯與浮動微調列**：支援 `< 350ms` 雙擊喚醒印章藍色編輯框與 `#mobileStampEditBar`（雙向連動 `-40` ～ `+40` 藍調滑桿與完成鈕），兼顧單指移動＋放開即時光影融入，以及雙指捏合／張開縮放印章大小。
  4. **雙擊左下 5 行核對文字彈窗編輯**：新增 `#mobileTextEditModalBackdrop`，雙擊文字即彈出大字編輯窗並維持 `1.65x` 安全邊界自動重算。
  5. 建立 `_backup/20261124_012356/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-24 01:18:43] (第 39 版 / v39)
- **執行項目**：**手機多選防漏單修復 ＋「下載 / 分享」雙鍵拆分（v39）** — 修復 `<input type="file">` 活體 `FileList` 於清空 `.value` 後遺失第二張照片參考的問題，並將手機底部按鈕拆為等寬之「清空」、「下載（300DPI 原圖下載）」與「分享（系統分享選單）」。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v39 (2026.11.24)`，加上 `style.css?v=39`、`card_templates.js?v=39`、`app.js?v=39`。
  2. **多選靜態陣列快照防漏單**：於 `#mobilePhotoInput`、`#mobilePdfInput`、`#fileInput` 的 `change` 第一行及 `handleFiles()` 入口強制以 `Array.from(...)` 鎖定靜態陣列後再清空 input 值，並補齊圖片解碼容錯，確保複選多張保卡與發票 100% 完整匯入排版。
  3. **底部三按鈕等寬拆分**：拆分 `#btnMobileClear`（「清空」）、`#btnMobileDownload`（「下載」，直走 Blob 下載 300DPI 原圖）與 `#btnMobileShare`（「分享」，喚起 `navigator.share` 或降級下載），採 `flex: 1 1 0` 對稱排版。
  4. 建立 `_backup/20261124_011121/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-24 00:34:44] (第 38 版 / v38)
- **執行項目**：**手機端極簡自動模式 ＋ PDF／相簿雙軌分流上傳（v38）** — 完整保留電腦版所有微調工具列與排版比例，新增手機裝置自動偵測（`.is-mobile-mode`）極簡 4 區塊介面、PDF／相簿雙軌獨立選檔、完整三件組／單獨蓋保卡雙模式、觸控手勢與手機隱形鎖三連擊／數字鍵盤適配。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v38 (2026.11.24)`，加上 `style.css?v=38`、`card_templates.js?v=38`、`app.js?v=38`。
  2. **手機端極簡 4 區塊佈局與切換**：依 `innerWidth <= 768` 與觸控特性切換 `.is-mobile-mode`（`sessionStorage` 支援手動切回電腦版），含三項即時進度徽章、PDF／相簿雙軌分流上傳、螢幕寬度自適應畫布（雙指縮放＋單指拖曳印章放開自動光影融合），以及「清空重來／動態蓋章／原生 `navigator.share` 分享下載」底部動作列。
  3. **雙模式判斷與未建檔品牌支援**：不強制上傳 PDF，國際牌保卡直接執行 LOGO 外擴拉正與民國日期自動蓋章；其他未建檔品牌保卡則自動裁切背景並動態顯示底部「蓋上專櫃印章」快捷鈕單手蓋章拖曳。
  4. **手機隱形鎖適配**：支援任意處 `< 450ms` 三連擊 0.01 秒解鎖，並於粗指標觸控裝置啟用透明 `#stealthMobileNumericInput` 單點喚起手機數字鍵盤盲打 4 碼時間解鎖。
  5. 建立 `_backup/20261124_002919/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-24 00:14:57] (第 37 版 / v37)
- **執行項目**：**手動蓋章自動光影配色 ＋ 專櫃藍色深淺滑桿（v37）** — 針對手動加入與拖曳放開之獨立印章實作落點即時紙張亮度／色溫／左右陰影漸層採樣與 `Multiply` 融合，並新增專櫃藍色深淺（`-40` ～ `+40`）滑桿即時重繪畫布與保卡合併印章。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v37 (2026.11.24)`，加上 `style.css?v=37`、`card_templates.js?v=37`、`app.js?v=37`。
  2. **手動蓋章落點光影採樣與 `Multiply`**：強化 `sampleStampRegionLighting()` 與 `adaptStampCanvasToLighting()`（支援左右陰影梯度與 `blueTone`），於 `#btnAddStamp` 建立及 `mouseup` 放開獨立印章時自動採樣下方背景光影並鎖定 `blendMode: 'multiply'`。
  3. **專櫃藍色深淺滑桿**：新增 `#inputStampBlueTone`（`-40` 淡藍 ～ `+40` 深藍）、`#btnResetStampBlueTone` 歸零按鈕與雙擊歸零，搭配 `scheduleLiveStampRefresh()` 即時重繪獨立印章、`hasBakedStamp` 保卡與右側預覽。
  4. 建立 `_backup/20261124_001103/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 23:54:35] (第 36 版 / v36)
- **執行項目**：**極簡淺灰全螢幕隱形鎖 ＋「...」三連點無條件通行（v36）** — 新增純前端極簡淺灰全螢幕遮罩、4 顆低調進度圓點、12/24 小時制 ±2 分鐘盲打滑動開鎖，以及連續三下小數點（`...`）最高優先級快捷解鎖。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v36 (2026.11.23)`，加上 `style.css?v=36`、`card_templates.js?v=36`、`app.js?v=36`。
  2. **`sessionStorage` 全螢幕遮罩與 4 顆小圓點**：新增 `#stealthTimeLockOverlay`（`#e5e7eb`，`z-index: 999999`，無輸入框與文字，僅 4 顆 `8px` 圓點），首次點開或開新分頁鎖定、解鎖寫入 `sessionStorage('order_collage_unlocked')` 後重整保持解鎖並自動搶回鍵盤焦點。
  3. **雙軌最高優先級開鎖（`capture: true`）**：支援主鍵盤／九宮格數字滑動保留最後 4 碼核對系統時間前後 2 分鐘之 `hhmm`/`HHmm`，以及獨立連續 3 次 `.`/`Period`/`NumpadDecimal` 無條件立即通行。
  4. 建立 `_backup/20261123_231113/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 23:17:45] (第 35 版 / v35)
- **執行項目**：**畫布自由延伸控制點位置優化（v35）** — 移除左側／左下角畫布延伸把手以免遮擋左側對齊單據與 5 行大字，改配置於「右邊緣中間」、「下邊緣中間」與「右下角」（支援 `Shift` 等比例延伸），並確保匯出時完全隔離。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v35 (2026.11.23)`，加上 `style.css?v=35`、`card_templates.js?v=35`、`app.js?v=35`。
  2. **三向延伸把手重構**：重構 `drawCanvasResizeHandles()`、`hitTestCanvasResize()` 與 `mousemove`（固定左上 `(0,0)` 原點，`right` `ew-resize`、`bottom` `ns-resize`、`br` `nwse-resize` 含 `Shift` 等比鎖定），控制把手僅於編輯態渲染、匯出不繪製。
  3. 建立 `_backup/20261123_231116/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 23:06:00] (第 34 版 / v34)
- **執行項目**：**非阻斷保卡印章日期對話框 ＋ 背景同步辨識排版 ＋ 最後蓋章流程重構（v34）** — 實作匯入圖片時立即彈出民國日期輸入框（支援直打 7 碼如 `1150417` 自動格式化為 `115.04.17`），背景 OCR 與 `70%:3%:27%` 排版照常不中斷，最後依使用者確認日期完成專櫃蓋章。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v34 (2026.11.23)`，加上 `style.css?v=34`、`card_templates.js?v=34`、`app.js?v=34`。
  2. **極簡民國年日期彈窗**：新增 `#stampDateModalBackdrop` 與 `normalizeMinguoStampDateInput()`，自動聚焦輸入框、支援 `1150417` 快打正規化與 `Enter` 送出並同步寫入 `#inputStampDate`。
  3. **非阻斷並行＋最後蓋章**：`handleFiles()` 偵測圖片即非阻斷開窗；保卡改為先以乾淨未蓋章底圖執行 OCR 與 `70%:3%:27%` 排版，最後由 `finalizeWarrantyCardStampAfterLayout()` / `applyConfirmedStampToCardLayer()` 依序匯流完成蓋章（附 `_isStamping` 防重入鎖定）。
  4. **清空 100% 歸零**：`btnClearCanvas` 透過 `resetStampDateSession()` 徹底清除本次印章日期狀態。
  5. 建立 `_backup/20261123_231128/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:51:10] (第 33 版 / v33)
- **執行項目**：**保卡頂部 `Panasonic` LOGO 完整保留微調（v33）** — 維持 `70% : 3% : 27%` 分欄比例與既有辨識／裁切邏輯，將國際牌保卡四點透視頂部角點沿邊線向上外擴 `6.5%` 卡片高度（約 `1 公分`）完整保留 `Panasonic` LOGO，並微調印章 Y 座標至 `0.395`（`39.5%`）。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v33 (2026.11.23)` 並更新 `?v=33` 查詢參數。
  2. **透視頂部外擴**：修改 `detectPanasonicCardQuad()`，將 `TL`、`TR` 沿 `BL->TL`、`BR->TR` 邊線向量向上外擴 `0.065` 倍卡片高度並夾限於圖片邊界內，完整保留紅褐色框上方藍色 `Panasonic` LOGO。
  3. **印章 Y 軸對位修正**：同步更新 `PANASONIC_STAMP_SPEC`、`sampleStampRegionLighting`、`compositeStampOnOffscreenCard` 與 `static/app.js` `stampSpec.centerY` 為 `0.395`，確保印章維持對齊「經銷商確認」格線正中央。
  4. 建立 `_backup/20261123_221155/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:45:35] (第 32 版 / v32)
- **執行項目**：**下方分欄比例定版微調（v32）** — 完整保留 v31 功能，僅調整下方左右分欄比例常數為「左側保卡 `70%` ＋ 中間間距 `3%` ＋ 右側發票 `27%`」並同步更新左下 5 行核對文字欄寬上限。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v32 (2026.11.23)` 並更新 `?v=32` 查詢參數。
  2. **分欄比例微調**：修改 `static/app.js`（`importImagePureFrontend`、`syncSummaryTextLayer`、`autoArrangeWorkbenchLayout`）為左側保卡 `0.70` (`70%`)、中間間距 `0.03` (`3%`)、右側發票 `0.27` (`27%`)，維持與訂購單左右邊界精準切齊。
  3. 建立 `_backup/20261123_221136/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:36:25] (第 31 版 / v31)
- **執行項目**：**國際牌完美封版（v31）** — 實作未縮小高解析度整塊左側雙語標籤區辨識＋機號前綴淨化、訂購單原生純文字型號交叉校正演算法、發票頂部外擴約 `1.5 公分` 保留「宏匯廣場」大字，以及左下角 5 行核對文字 `1.65 倍` 放大不越界排版。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 至 `v31 (2026.11.23)` 並更新 `?v=31` 查詢參數。
  2. **整塊左側雙語辨識與機號淨化**：提升離屏辨識底圖至最高 `3200px`，於 `PANASONIC_WARRANTY_CONFIG` 新增 `leftInfoBlock` 並以 `eng+chi_tra` `PSM=6` 整塊辨識，搭配 `parsePanasonicLeftInfoBlock()` 與 `stripSerialMisreadPrefix()` 剝除 `IS`/`NO`/`SN` 前綴穩定擷取 `02926020033`。
  3. **訂購單型號交叉校正**：新增 `cachedOrderItemModels`、`extractOrderSheetModels()` 與 `crossVerifyModelWithOrderSheet()`（相似度 `>= 65%` 且前綴相符即自動校正為訂購單標準型號 `NR-D505XV-W`，支援任意匯入順序）。
  4. **發票頂部保留宏匯廣場與 `1.65x` 大字防重疊**：`RECEIPT_LANDMARK_CROP_CONFIG` 調高 `topExpandHeaderH: 2.2` / `topExpandBodyWRatio: 0.24` 保留約 `1.5 公分` 頂邊；`syncSummaryTextLayer()` 放大 5 行文字至 `~96–104px` 並鎖定 `box.width <= cardLayer.width * 0.96` 與上方 `28px` 間距。
  5. 建立 `_backup/20261123_223316/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:17:50] (第 30 版 / v30)
- **執行項目**：**國際牌封版收尾（v30）** — 實作「純文字地標強制比例外擴一刀裁切演算法」、集中化 `RECEIPT_LANDMARK_CROP_CONFIG` 外擴常數、精準分離國際牌保卡第二聯「機種（`NR-D505XV-W`）」與「機號（`02926020033`）」掃描框座標，並以 `PANASONIC_WARRANTY_CONFIG` 封裝國際牌專屬模板參數。
- **具體進度**：
  1. **版本與防快取**：同步更新雙份 HTML 版本徽章為 `v30 (2026.11.23)` 與 `?v=30` 腳本參數。
  2. **純文字地標強制一刀裁切**：於 `static/card_templates.js` 建立 `RECEIPT_LANDMARK_CROP_CONFIG`，以 `bodyW ± 0.15`（或標題 `headerCenterX ± 1.10 * headerW`）、上擴 `0.45 * headerHeight`、下擴優先 `1.5 * lineHeight` / 備援 `0.75 * bodyW` 強制裁切（移除高寬比拒切限制，僅需 `> 50px`），保持原比例放至 `37%` 右欄。
  3. **機種／機號掃描框分離**：上移 `panasonic_slip2.ocrRegions.model` 至 `{ x: 0.055, y: 0.305, w: 0.280, h: 0.068 }`、設定 `serial` 為 `{ x: 0.055, y: 0.382, w: 0.280, h: 0.068 }`，並移除 `runCardTargetedOcr()` 垂直擴框與過濾誤讀邊線 `02926020033I`，確保 5 行核對文字準確帶出 `NR-D505XV-W` 與 `02926020033`。
  4. **國際牌模板獨立隔離封版**：透過 `Object.freeze` 封裝 `PANASONIC_STAMP_SPEC` 與 `PANASONIC_WARRANTY_CONFIG`，為後續擴充其他品牌預留獨立條目介面。
  5. 建立 `_backup/20261123_221549/` 備份，通過 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 22:01:30] (第 29 版 / v29)
- **執行項目**：升級 `1280px` 高對比灰階預掃描＋發票文字指紋與結構編號 `100%` 單據鎖定、徹底移除 `detectRes.detected` 搶判保卡條款、新增圖片訂購單（`order_sheet`）三角色防重疊、升級過濾雜訊字框之內部有效文字群外推熱感應紙邊界裁切，以及放寬保卡局部裁切並以 `PSM = 6` 完整讀取機種／機號。
- **具體進度**：
  1. **版本與快取控制**：更新雙份 HTML 至 `v29 (2026.11.23)` 並為 `card_templates.js?v=29` 與 `app.js?v=29` 加上防快取版本參數。
  2. **100% 文字指紋三角色鎖定**：預掃描提升至長邊 `1280px`＋動態對比拉伸；`classifyDocumentByTextAndColor()` 移除 `detectRes.detected` 霸王條款，先依 `2英+8數` 與明細關鍵字鎖定 `receipt`（禁止壓扁蓋章），支援 JPG/PNG 訂購單 `order_sheet` 置頂 `100%` 排版，並精準分流 `warranty_card`。
  3. **雜訊過濾文字錨點外推裁切**：`computeTextAnchoredReceiptCrop()` 剔除低信心度與空間離群雜訊點後，以主體印刷文字群外推左右 `±12% * textW`、頂部 `-0.8x` 行高（切除折角）、底部 `+1.2x` 行高並驗證 `1.4 <= H/W <= 3.2`。
  4. **無橫槓發票號碼／購買日期／保卡 `PSM=6` 與無條件自動排版**：排除 `店:0417` 誤判日期並去除發票號碼 `-`；保卡 OCR 改上下外擴 `1.5%`＋`PSM = 6`；單據匯入結束一律無條件執行 `autoArrangeWorkbenchLayout(false)` 與 `syncSummaryTextLayer(true)`。
  5. 建立 `_backup/20261123_215821/` 備份，通過 HTML 同步、語法與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 21:38:30] (第 28 版 / v28)
- **執行項目**：重構匯入前快速關鍵字預掃描＋色彩雙重精準分流、導入基於 3～4 組 OCR 關鍵字錨點之銷貨明細裁切邊界框計算、實施嚴格 `docRole` 圖層角色隔離，以及建立非空值 OCR 狀態合併保護機制。
- **具體進度**：
  1. **版本徽章更新**：同步更新 `index.html` 與 `static/index.html` 為 `v28 (2026.11.23)`。
  2. **關鍵字預掃描與色彩雙重分流**：於 `static/app.js` 實作 `quickPreScanImageText()` 並與 `static/card_templates.js` 之 `classifyDocumentByTextAndColor()` 串接，精準區分電子發票明細與國際牌保卡，發票絕不進入 `1.48:1` 拉正或專櫃蓋章流程。
  3. **OCR 文字錨點發票裁切框**：實作 `computeTextAnchoredReceiptCrop()`，依「電子發票證明聯／營業人統編／商品明細／發票號碼」Bounding Box 反推裁切框並自動切除上方折角與桌面背景，以右欄 `37%` 等比例擺放；若錨點不足自動回退 `autoTrimReceiptImage()`。
  4. **角色隔離與非空值狀態合併**：全圖層引入 `docRole` 標記（`order_sheet` / `warranty_card` / `receipt`）並建立 `mergeOcrSummaryFields()`，確保發票與保卡 OCR 欄位嚴格隔離且後匯入單據之空值絕不覆蓋前一張已辨識之有效結果。
  5. 建立 `_backup/20261123_213413/` 完整備份，通過雙份 HTML 同步、語法平衡與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 21:28:09] (第 27 版 / v27)
- **執行項目**：徹底根除 `Cannot read properties of undefined (reading 'parseInvoiceHeaderFields')` 錯誤（清除 `card_templates.js` 重複宣告語法錯誤並加上安全存在性防護），並強化保卡匯入分流條件確保 100% 觸發離屏透視拉正與自動蓋章。
- **具體進度**：
  1. **版本徽章更新**：同步更新 `index.html` 與 `static/index.html` 為 `v27 (2026.11.23)`。
  2. **修復 `window.CardTemplates` 未定義與 `parseInvoiceHeaderFields` 錯誤**：移除 `static/card_templates.js` `autoTrimReceiptImage()` 內重複 `const invScale / let rx` 語法錯誤使模組 100% 正常掛載，並於 `static/app.js` 補齊 `parseHdrSafe` / `normalizeInvSafe` 防護與內聯回退。
  3. **強化保卡匯入分流與保底合成**：僅高寬比 `> 1.35` 且無保卡特徵之長條形直立圖進入發票分支，其餘一律進入保卡離屏拉正、自動蓋印專櫃章與局部 OCR 寫入 5 行核對文字。
  4. 建立 `_backup/20261123_212524/` 完整備份，通過語法、同步與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 21:22:01] (第 26 版 / v26)
- **執行項目**：實作保卡「保底必蓋專櫃章機制」與純 Base64 消除 `Tainted Canvas` 錯誤、雙重驗證排除木紋桌面干擾、導入單一序列排隊 OCR 與熱感應紙動態對比拉伸（取代全域 Otsu），並強制同步左下角 5 行核對文字與畫布即時進度提示。
- **具體進度**：
  1. **版本徽章與狀態提示**：同步更新 `index.html` 與 `static/index.html` 為 `v26 (2026.11.23)`，新增 `#canvasOcrStatusPill` 顯示即時 OCR 狀態與本機受限提示。
  2. **保卡保底必蓋與排除木紋干擾**：強制 100% 使用 `STAMP_CLEAN_BASE64`（徹底消除 `Tainted Canvas`）、將蓋章解耦於 OCR 之前執行，並以「鄰近淺色底紙」雙重驗證升級 `detectPanasonicCardQuad()` 排除木桌誤判。
  3. **單一序列排隊 OCR 與動態對比拉伸**：導入 `enqueueOcrTask()` 序列排隊與共用 Worker（`workerBlobURL: false`），並以動態對比拉伸取代全域 Otsu 保留熱感應紙淡色字跡，放寬發票號碼（含空格容錯）與日期 Regex 匹配。
  4. **強制同步 5 行核對文字**：移除 `layers.length > 0` 限制，任何單據完成辨識皆即時更新左下角 5 行文字圖層（保留 `userEdited` 保護）。
  5. 建立 `_backup/20261123_211737/` 完整備份，通過語法、同步與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 21:07:14] (第 25 版 / v25)
- **執行項目**：重構保卡為「離屏高解析度透視拉正 ➔ 局部白名單 OCR ➔ 立刻合成專櫃章 ➔ 縮放 60% 擺放」管線、升級發票多區段局部放大 OCR 與購買日期來源優先權鎖定，並建立 `syncSummaryTextLayer()` 即時寫入左下角 5 行核對文字。
- **具體進度**：
  1. **版本徽章更新**：同步更新 `index.html` 與 `static/index.html` 為 `v25 (2026.11.23)`。
  2. **保卡離屏高解析度合成管線**：新增 `compositeStampOnOffscreenCard()`，保卡匯入後先離屏透視拉正 ➔ 執行白名單單行 OCR ➔ 立刻於避讓座標（`X: 84.5%`、`Y: 36.5%`、`W: 21.0%`）合成光影自適應專櫃章 ➔ 整體縮放至訂購單 60% 寬度擺入左下角。
  3. **發票多區段放大 OCR 與日期來源隔離**：將 `invoiceNoZone` 擴展為 `Y: 55% ~ 85%` 放大 `2.2x` 二值化辨識並以 Regex 修復混淆字元；嚴格限定 `發票購買日期` 僅由發票單據擷取，排除訂購單製表日期。
  4. **`syncSummaryTextLayer()` 即時寫入機制**：任一單據 OCR 完成或手動修正欄位後，立即更新畫布左下角 5 行核對文字圖層與右側備註欄，維持 `60% : 3% : 37%` 排版與雙擊原地編輯功能。
  5. 建立 `_backup/20261123_210353/` 完整備份，通過語法、同步與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 20:57:05] (第 24 版 / v24)
- **執行項目**：重構「原圖無損高解析度先行 OCR ➔ 去邊裁切與比例排版」管線、建置「發票辨識雙型態架構（首波 Type A 銷貨明細表）」、強化保卡條碼雜訊過濾、確立「訂購單 100% 基準之 `60% : 3% : 37%` 黃金比例排版」，並即時同步寫入左下角 5 行核對文字。
- **具體進度**：
  1. **版本徽章更新**：同步更新 `index.html` 與 `static/index.html` 為 `v24 (2026.11.23)`。
  2. **原圖無損高解析度先行 OCR 與發票雙型態架構（`INVOICE_TEMPLATES`）**：先以 1:1 原始像素執行分區高對比二值化 OCR，完整實作 Type A（`invoice_detail_slip` 銷貨明細表／載具明細型），精準鎖定 `68%~78%` 發票號碼區並透過 `normalizeTaiwanInvoiceNo()` 去除 `-` 與修復 `O/0`、`I/1` 混淆；預留 Type B 雙 QR Code 正本擴充接口。
  3. **保卡單行白名單 OCR 與條碼雜訊過濾**：透過 `getWarrantyLineOcrWorker()`（`PSM=7` + `A-Z0-9-` 白名單）與 `filterWarrantyModelResult()` / `filterWarrantySerialResult()` 杜絕條碼誤判亂碼。
  4. **`60% : 3% : 37%` 黃金比例自動排版與 5 行文字即時連動**：以訂購單寬度為 100% 基準配置左保卡 60%、中縫 3%、右發票 37%，並將 OCR 結果即時寫入保卡正下方 5 行核對文字圖層。
  5. 建立 `_backup/20261123_205425/` 完整備份，通過語法、同步與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 20:41:44] (第 23 版 / v23)
- **執行項目**：優化專櫃印章 1.2x 放大與紙張光影自適應去螢光融合、電子發票加強去背裁切、導入「頂部滿版訂購單＋自適應延伸不重疊排版引擎」、左下空白處「零拉長」自動填入 5 行核對文字，以及「畫布文字雙擊原地直接編輯」。
- **具體進度**：
  1. **版本徽章更新**：同步更新 `index.html` 與 `static/index.html` 為 `v23 (2026.11.23)`。
  2. **專櫃印章放大 1.2x（`21.0%`）與光影自適應去螢光演算法**：新增 `sampleStampRegionLighting()` 與 `adaptStampCanvasToLighting()`，依目標區域底紙亮度與色溫調整印章明度及飽和度，結合 `multiply` 呈現真實沉穩油墨質感。
  3. **發票邊緣加強自動裁切（`autoTrimReceiptImage`）**：自動偵測直立電子發票白紙輪廓並內縮 1.5% 安全邊距，切除桌面與陰影邊緣並於背景擷取發票日期與號碼。
  4. **頂部滿版訂購單＋自適應不重疊排版與左下 5 行核對文字**：訂購單橫向滿版置頂（左右留 `10px`），保卡（左 59%）與發票（右 37%）上緣對齊並自動延伸畫布高度；保卡正下方空白處「零拉長」自動填入 5 行核對文字。
  5. **畫布文字雙擊原地編輯（`openInlineTextEditor`）**：雙擊畫布文字直接於原地出現 `<textarea>` 編輯，支援 `Ctrl + Enter` 套用、`Esc` 取消與 `Ctrl + Z` 復原。
  6. 建立 `_backup/20261123_203805/` 完整備份，通過語法、同步與 `CRLF` 檢核並推送至 GitHub。

### [2026-11-23 20:14:31] (第 22 版 / v22)
- **執行項目**：新增介面「目前版本徽章 (`v22 (2026.11.23)`)」，並修正「保卡上傳即自動偵測、透視拉正、欄位 OCR 與日期框避讓自動蓋印專櫃章」完整事件流。
- **具體進度**：
  1. **介面版本識別徽章**：於主標題旁與右側面板頂部新增 `v22 (2026.11.23)` 徽章，同步更新 `index.html`、`static/index.html` 與 `static/style.css`。
  2. **上傳即自動偵測、拉正、OCR 與蓋章**：於 `importImagePureFrontend` 串接 `#switchAutoSmartCard`（預設開啟），匯入保卡後自動偵測外框、透視拉正、OCR 讀取機種／機號並自動於避讓座標蓋印專櫃章；新增 `ensureStampImageLoaded()` 預載專櫃印章圖檔，杜絕首次自動蓋章空白問題。
  3. 建立 `_backup/20261123_201245/` 完整備份，通過語法與 `CRLF` 檢核並同步推送至 GitHub。

### [2026-11-23 19:54:39] (第 21 版 / v21)
- **執行項目**：建置「四大品牌保卡智慧模板庫（首發：國際牌 Panasonic 雙聯單）」、「四角梯形透視自動拉正引擎」、「指定欄位精準 OCR 讀取（機種／機號）」與「日期框空白避讓自動蓋專櫃章」。
- **具體進度**：
  1. **建立品牌保卡模板設定架構（`static/card_templates.js`）**：
     - 建置四大品牌擴充登錄結構（`CARD_BRAND_REGISTRY`：Panasonic、LG、Samsung、Hitachi/Sony），完整實作 **國際牌（Panasonic）** 雙聯單模板（`panasonic_slip1` 第一聯 `S203J01` / `panasonic_slip2` 第二聯 `S203B01`），支援自動偵測與手動指定切換。
  2. **實作四角梯形透視自動拉正引擎（`rectifyPerspectivePureJS`）**：
     - 實作 `detectPanasonicCardQuad` 紅褐色外框自動偵測與畫布可拖曳 4 角點控制柄，透過純前端 Homography 透視變換還原標準 `1.48 : 1` 矩形比例。
  3. **實作指定區域高精準度 OCR 讀取（機種／機號）**：
     - 僅針對模板指定之機種與機號區塊進行 2.5x 放大與 Otsu 自適應二值化強化後呼叫 `Tesseract.js` 辨識，大幅提升英數字準確率並支援一鍵複製與帶入備註。
  4. **實作日期框空白避讓：專櫃印章自動精準蓋印（`autoStampWarrantyCard`）**：
     - 依兩聯通用座標（`X: 84.5%`、`Y: 36.5%`、寬度 `17.5%`、`-1.5° ~ +1.5°` 微傾角與 `multiply` 正片疊底融合）自動蓋印 `#003FBC` 專櫃印章，完美避讓左側黑字並寫入 `Ctrl + Z` 復原紀錄。
  5. 建立 `_backup/20261123_195033/` 完整備份，同步更新 `index.html`、`static/index.html`、`static/card_templates.js`、`static/app.js`、`GEMINI.md` 與 `PROJECT_ARCHITECTURE.md`，通過語法與 `CRLF` 檢核並同步推送至 GitHub。

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
  1. **取消進場自動變形與原比例進場**：移除圖片自動偵測與透視變形，所有 `.jpg` / `.png` 圖片嚴格按原始長寬比進場，適配畫布三欄黃金比例排版。
  2. **Photoshop 風格自由梯形變形（透視扭曲）與矩形裁切**：
     - **自由梯形變形**：4 個獨立角點手動拖曳，即時紅白色虛線四邊形引導，套用透視拉直並支援一鍵還原。
     - **直覺矩形裁切**：8 個控制點裁切框搭配半透明暗色遮罩，乾淨去除周圍木紋桌面。
  3. **自訂「圖紙輸出範圍工具」**：畫布上可互動調整之 8 控制點虛線範圍框與框外暗色遮罩；開啟時僅裁切匯出框內畫面。
  4. **三段輸出解析度選擇器（大 100% / 中 75% / 小 50%）**：右側面板即時計算並顯示輸出像素尺寸（如 `1800 × 1275 px`），支援按鈕切換並在匯出時進行平滑雙線性/雙三次縮放輸出。
  5. 建立 `_backup/20261121_144909/` 備份，全檔案確認 Windows `CRLF` 換行，括號平衡驗證通過（`ALL_BALANCED_SUCCESS`）。

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
