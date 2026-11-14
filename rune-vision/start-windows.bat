@echo off
REM Double-click me on Windows: serves this folder on http://localhost:8000 and opens Rune Vision.
cd /d "%~dp0"
echo Rune Vision running at http://localhost:8000  (close this window to stop)
start "" "http://localhost:8000/index.html"
py --version >nul 2>&1 && (py -m http.server 8000 & goto :eof)
python --version >nul 2>&1 && (python -m http.server 8000 & goto :eof)
REM No Python installed: use the built-in PowerShell server instead
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
