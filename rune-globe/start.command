#!/bin/bash
# Starts a local web server for this folder on http://localhost:8000 and opens the camera page and the globe.
#   Mac:     double-click this file.
#   Windows: double-click start.bat, or run  bash start.command  in Git Bash.
#   Linux:   run  bash start.command
cd "$(dirname "$0")"
PORT=8000

# Find Python. Mac/Linux call it python3; on Windows it is usually python or the py launcher.
# (On Windows, "python3" can be a fake Microsoft Store shortcut, so check that it really runs.)
PY=""
for p in python3 python py; do
  if command -v "$p" >/dev/null 2>&1 && "$p" -c "import http.server" >/dev/null 2>&1; then PY="$p"; break; fi
done
if [ -z "$PY" ]; then
  echo "Python 3 was not found. Install it from https://www.python.org/downloads/ and try again."
  read -r -p "Press Enter to close."
  exit 1
fi

# Open a page in the browser, the right way for each system.
open_page() {
  case "$(uname -s)" in
    Darwin)               open -a "Google Chrome" "$1" 2>/dev/null || open "$1" ;;  # Mac: Chrome if installed
    MINGW*|MSYS*|CYGWIN*) start "" "$1" ;;                                           # Windows (Git Bash)
    *)                    xdg-open "$1" >/dev/null 2>&1 ;;                           # Linux
  esac
}

# Open both pages a moment after the server has started.
( sleep 1
  open_page "http://localhost:$PORT/camera.html"
  open_page "http://localhost:$PORT/globe.html" ) &

echo "Rune Globe running at http://localhost:$PORT  (close this window to stop)"
"$PY" -m http.server "$PORT"
