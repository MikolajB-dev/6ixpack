@echo off
rem Double-click me (Windows): serves this folder on http://localhost:8000 and opens the camera page and the globe.
cd /d "%~dp0"
start "" "http://localhost:8000/camera.html"
start "" "http://localhost:8000/globe.html"
echo Rune Globe running at http://localhost:8000  (close this window to stop)
python -m http.server 8000
