@echo off
rem Windows: double-click me. Serves the whole project on http://localhost:8000 and opens Bindrune with the sound guide.
rem (The whole project, not only this folder, because this page loads rune-vision/ next to it.)
cd /d "%~dp0.."

rem Find Python: the "py" launcher first, then "python". Check it really runs (not the Microsoft Store shortcut).
set PY=
py -3 -c "import http.server" >nul 2>&1 && set PY=py -3
if not defined PY python -c "import http.server" >nul 2>&1 && set PY=python
if not defined PY (
  echo Python 3 was not found. Install it from https://www.python.org/downloads/ and try again.
  pause
  exit /b 1
)

rem Open the page after a short wait, so the server is already running.
start "" /b cmd /c "timeout /t 1 /nobreak >nul & start "" http://localhost:8000/rune-audio/"

echo Bindrune with sound guide at http://localhost:8000/rune-audio/  (close this window to stop)
%PY% -m http.server 8000
