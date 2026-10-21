@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在启动本地预览服务...
echo.

REM 优先用 Windows Python 启动器，退而求其次用 python
py -3 serve.py
if errorlevel 1 (
    python serve.py
)
if errorlevel 1 (
    echo.
    echo [错误] 未找到 Python。请先安装 Python 并勾选 "Add to PATH"。
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

pause
