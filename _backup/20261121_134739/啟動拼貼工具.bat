@echo off
chcp 65001 >nul
title 訂單、保卡與發票拼貼工作台
cd /d "%~dp0"

echo ========================================================
echo   訂單、保卡與發票拼貼工作台 - 本機服務啟動程序
echo ========================================================
echo.

:: 1. 偵測 Python 執行環境
set PY_CMD=
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PY_CMD=python
    goto :PYTHON_FOUND
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PY_CMD=py
    goto :PYTHON_FOUND
)

:: 檢查常見安裝路徑
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto :PYTHON_FOUND
)
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    goto :PYTHON_FOUND
)
if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    goto :PYTHON_FOUND
)
if exist "C:\Program Files\Python312\python.exe" (
    set "PY_CMD=C:\Program Files\Python312\python.exe"
    goto :PYTHON_FOUND
)
if exist "C:\Program Files\Python311\python.exe" (
    set "PY_CMD=C:\Program Files\Python311\python.exe"
    goto :PYTHON_FOUND
)

:: 若未找到 Python
echo [警告] 系統尚未偵測到 Python 執行環境！
echo 本拼貼工作台影像核心需使用 Python 3.9+ 搭配 PyMuPDF 與 OpenCV。
echo.
echo 請至 Python 官方網站下載安裝：
echo   https://www.python.org/downloads/
echo (安裝時請務必勾選「Add python.exe to PATH」加入環境變數)
echo.
echo 按任意鍵將為您開啟 Python 下載頁面...
pause >nul
start https://www.python.org/downloads/
exit /b 1

:PYTHON_FOUND
echo [✔] 偵測到 Python 環境: %PY_CMD%
echo.

:: 2. 檢查並自動安裝必要套件
echo [2/4] 正在檢查並自動安裝必要相依套件 (Flask, PyMuPDF, OpenCV, Pillow, python-docx)...
"%PY_CMD%" -m pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [!] 嘗試一般 pip install...
    "%PY_CMD%" -m pip install -r requirements.txt
)
echo [✔] 套件相依性檢查完成。
echo.

:: 3. 檢查印章去背初始化檔案
echo [3/4] 檢查專櫃印章去背初始化...
if not exist "assets\stamp_clean.png" (
    echo 正在自「本櫃印章.docx」提取專櫃印章並執行完美去背處理...
    "%PY_CMD%" extract_stamp.py
)
if exist "assets\stamp_clean.png" (
    echo [✔] 專櫃印章已就緒 (assets\stamp_clean.png)。
)
echo.

:: 4. 啟動伺服器並自動開啟預設瀏覽器
echo [4/4] 正在啟動拼貼工作台服務 (http://127.0.0.1:5000)...
echo.
echo ========================================================
echo   工作台畫面將在預設瀏覽器中開啟！
echo   如需停止程式，請關閉此終端機視窗或按 Ctrl+C。
echo ========================================================
echo.

start "" "http://127.0.0.1:5000"
"%PY_CMD%" server.py

pause
