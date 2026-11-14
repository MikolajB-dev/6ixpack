#!/bin/bash
# Double-click me (Mac): serves this folder on http://localhost:8000 and opens the camera page and the globe in Chrome.
cd "$(dirname "$0")"
( sleep 1
  open -a "Google Chrome" "http://localhost:8000/camera.html" || open "http://localhost:8000/camera.html"
  open -a "Google Chrome" "http://localhost:8000/globe.html"  || open "http://localhost:8000/globe.html" ) &
echo "Rune Globe running at http://localhost:8000  (close this window to stop)"
python3 -m http.server 8000
