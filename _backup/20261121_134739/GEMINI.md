# GEMINI 專案開發與維護手冊 (GEMINI.md)

本文件為「訂單、保卡與發票拼貼工作台（OrderCollageTool）」之專屬開發、維護與作業準則規範。

---

## 區塊一：專案基本資訊
- **專案名稱**：OrderCollageTool (訂單、保卡與發票拼貼工作台)
- **主要語言**：Python 3.9+ (Flask, PyMuPDF, OpenCV, Pillow, python-docx) + HTML5 / CSS3 / Vanilla JavaScript (HTML5 Canvas)
- **畫布預設規格**：1600 × 1130 px (橫向 A4 比例，背景純白 `#FFFFFF`)
- **專櫃專屬色碼**：`#003FBC` (印章印泥與合成文字統一色)

---

## 區塊二：啟動與開發指引
1. **本機啟動**：
   - 雙擊執行根目錄之 `啟動拼貼工具.bat`。
   - 批次檔將自動檢測 Python 環境與 `requirements.txt` 所需套件。
   - 伺服器啟動後將自動開啟預設瀏覽器並載入 `http://127.0.0.1:5000`。
2. **手動啟動**：
   ```bash
   pip install -r requirements.txt
   python extract_stamp.py
   python server.py
   ```

---

## 區塊三：檔案清單與職責
- `assets/stamp_clean.png`：已完成完美透明去背與 `#003FBC` 藍色標準化之專櫃印章圖檔。
- `extract_stamp.py`：印章提取與去背演算法腳本。
- `server.py`：本機 Flask 影像處理後端。
- `static/index.html`：工作台介面結構。
- `static/style.css`：工作台樣式表（72% 畫布區、28% 控制面板、現代化卡片佈局）。
- `static/app.js`：互動式畫布引擎（圖層管理、滑鼠拖曳、4 角落等比例縮放、旋轉控制、四點透視、文件增強、PNG 匯出）。
- `啟動拼貼工具.bat`：一鍵啟動腳本。
- `requirements.txt`：依賴套件清單。
- `PROJECT_ARCHITECTURE.md`：系統架構與規格說明文件。

---

## 區塊四：核心模組維護注意事項
1. **保護原則**：不得未經授權修改計算核心或隨意刪除既有功能。
2. **換行格式**：全專案原始碼皆必須維持 Windows `CRLF` 換行格式。
3. **備份流程**：任何檔案修改前，必須讀取當下系統時間，在 `_backup/YYYYMMDD_HHMMSS/` 建立完整備份。
4. **印章去背規範**：印章去背必須保留乾淨透明底（無雜訊、無反白灰邊），印泥色碼必須精準維持 `#003FBC`。
5. **PDF 裁切高度**：精準定位「實收訂金金額 / 尚餘尾款 / 總金額(含稅)」所在行，並切除其下之施工條款與確認項目。

---

## 區塊五：語法與品質檢核標準
- 前端 JavaScript 必須符合 ES6+ 規範，無任何語法錯誤（`syntaxErrors = 0`）。
- 後端 Python 程式碼遵守 PEP 8 標準。

---

## 區塊六：工程修改工作日誌

### [2026-11-21 13:37:30]
- **執行項目**：從零建置本機「訂單、保卡與發票拼貼工作台」桌面工具。
- **具體進度**：
  1. 成功自 `本櫃印章.docx` 提取原始印章圖檔，透過色彩通道遮罩執行完美去背，生成無雜訊且純化為 `#003FBC` 藍色印泥之 `assets/stamp_clean.png`；編寫 `extract_stamp.py`。
  2. 建立 Python Flask 後端影像引擎 `server.py`，實作 PDF 訂單高解析度渲染、智慧文字座標自動裁切、四點透視拉正 API、文件掃描美化去陰影 API，以及印章動態日期精確合成 API。
  3. 建立單頁式 HTML5 Canvas 操作工作台（`static/index.html`、`static/style.css`、`static/app.js`），實現 72% 純白高解析度畫布（1600 × 1130）、28% 側邊面板、多物件拖曳進場、獨立圖層增刪排序、四角等比例縮放控制柄、頂部旋轉控制柄、文字等比例縮放、無失真 PNG 匯出。
  4. 建立一鍵啟動批次檔 `啟動拼貼工具.bat`，支援 Python 環境檢測、依賴套件自動安裝、印章初始化與瀏覽器自動開啟。
  5. 於專案根目錄建立架構文件 `PROJECT_ARCHITECTURE.md` 與維護指南 `GEMINI.md`，確認全模組語法正確無誤。
