#!/bin/bash
# Double-click me: serves this folder on http://localhost:8000 and opens Rune Vision in Chrome.
cd "$(dirname "$0")"
( sleep 1; open -a "Google Chrome" "http://localhost:8000/index.html" || open "http://localhost:8000/index.html" ) &
echo "Rune Vision running at http://localhost:8000  (close this window to stop)"
python3 -m http.server 8000
