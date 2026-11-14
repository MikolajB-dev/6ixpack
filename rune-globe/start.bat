@echo off
rem Windows: double-click me. Serves this folder on http://localhost:8000 and opens the camera page and the globe.
rem (Mac: use start.command instead.)
cd /d "%~dp0"

rem Find Python: the "py" launcher first, then "python". Check it really runs (not the Microsoft Store shortcut).
set PY=
py -3 -c "import http.server" >nul 2>&1 && set PY=py -3
if not defined PY python -c "import http.server" >nul 2>&1 && set PY=python
if not defined PY (
  echo Python 3 was not found. Install it from https://www.python.org/downloads/ and try again.
  pause
  exit /b 1
)

rem Open both pages after a short wait, so the server is already running.
start "" /b cmd /c "timeout /t 1 /nobreak >nul & start "" http://localhost:8000/camera.html & start "" http://localhost:8000/globe.html"

echo Rune Globe running at http://localhost:8000  (close this window to stop)
%PY% -m http.server 8000
