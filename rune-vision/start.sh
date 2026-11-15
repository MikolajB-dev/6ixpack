#!/usr/bin/env bash
# Serves this folder on http://localhost:8000 and opens Rune Vision in a browser.
# Works on Linux (Fedora etc.), macOS, and Git Bash on Windows.
# Run with:  ./start.sh   (first time: chmod +x start.sh)

# Go to the folder this script is in, so index.html is found
cd "$(dirname "$0")" || exit 1

PORT=8000
URL="http://localhost:$PORT/index.html"

# Find Python: Linux/macOS use python3, Windows often only has "python"
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "Python not found. Install Python 3 first." >&2
  exit 1
fi

# Open the page in a browser; prefer Chrome/Chromium, otherwise the default browser
open_browser() {
  case "$(uname -s)" in
    Darwin)
      open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL"
      ;;
    Linux)
      for b in google-chrome google-chrome-stable chromium chromium-browser; do
        if command -v "$b" >/dev/null 2>&1; then
          "$b" "$URL" >/dev/null 2>&1 &
          return
        fi
      done
      xdg-open "$URL" >/dev/null 2>&1   # default browser (also works with Flatpak Chrome)
      ;;
    MINGW*|MSYS*|CYGWIN*)
      cmd.exe /c start "" "$URL"         # Git Bash on Windows
      ;;
    *)
      echo "Open $URL in your browser."
      ;;
  esac
}

# Wait a second for the server to start, then open the browser in the background
( sleep 1; open_browser ) &

echo "Rune Vision running at $URL  (press Ctrl+C to stop)"

# --bind 127.0.0.1: only this laptop can reach the server,
# not everyone else on the hostel/venue Wi-Fi
"$PY" -m http.server "$PORT" --bind 127.0.0.1
