#!/bin/bash
# Mac: double-click me. Linux / Git Bash: bash start.command
# Serves the whole project on http://localhost:8000 and opens Bindrune with the sound guide.
# (The whole project, not only this folder, because this page loads rune-vision/ next to it.)
cd "$(dirname "$0")/.."
URL="http://localhost:8000/rune-audio/"
PY=$(command -v python3 || command -v python || command -v py)
if [ -z "$PY" ]; then echo "Python 3 was not found. Install it from https://www.python.org/downloads/"; exit 1; fi
( sleep 1; open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL" 2>/dev/null || start "$URL" 2>/dev/null ) &
echo "Bindrune with sound guide at $URL  (close this window to stop)"
"$PY" -m http.server 8000
