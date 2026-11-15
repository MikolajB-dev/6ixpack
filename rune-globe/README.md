# Rune Globe

The 3D globe (`globe.html`) shows the stones that are on the real board.
The webcam page (`camera.html`) sees which rune is in which circle, and the globe copies it.

- Put a rune in a circle on the board: its stone appears on the globe at that place.
- Rune in its own circle (e.g. the Jelling rune on Jelling): the dial appears. Turn the real stone to the right number and hold it for 1 s: it starts broadcasting.
- Take a rune off the board: its stone goes back to the tray.

## Files

| File | What it is |
| --- | --- |
| `globe.html` | The Midgard globe UI, plus a small "camera link" block (search for `[rune-globe]`). |
| `globe-impaired-vision.html` | Globe version for blind and low-vision visitors: spoken guidance and sound cues (on by default, `?audio=0` turns them off), high-contrast text and tray. Does not have the camera link yet; it takes board input over WebSocket (`?core=1`). |
| `camera.html` | A copy of `rune-vision/index.html` by Marks (his version from PR #4, "globe add"). Small additions, all marked `[rune-globe]`. |
| `start.command` | Starts a local server and opens both pages. Mac: double-click. Windows: `bash start.command` in Git Bash. Linux: `bash start.command`. |
| `start.bat` | Windows: double-click. Same thing. |

Both start files need Python 3 (they find `python3`, `python` or `py` by themselves).

`rune-vision/` itself is not changed. If Marks updates it, copy his new `index.html` here as `camera.html`
and add the `[rune-globe]` blocks again (search for `[rune-globe]` in the current `camera.html` to see them).
Saved camera settings (`rune-settings.json`) go in this folder, next to `camera.html`.

## Run it

1. Double-click `start.command` (Mac) or `start.bat` (Windows).
2. Two tabs open: **camera.html** and **globe.html**. Both must be open in the same browser, from `http://localhost:8000`.
   (Opening the files by double-clicking them does not link them.)
3. Set up the camera page once, as in `rune-vision/README.md` (find circles, teach runes, pick the right answers).
4. Drag the globe tab to the big screen. Bottom left of the globe should say **camera: linked**.

Without a camera you can test with the camera page's backup keys: **A** puts all runes in place, **0** clears them.

## How the link works

`camera.html` already sends every change on `BroadcastChannel('rune-board')`.
The globe listens and turns it into its own format `{ runes: [{ id, seen, slot, angle }] }`,
the same format its WebSocket input (`?core=1`) uses.

- Which rune is which stone: a camera rune counts as the globe stone of the circle it belongs in (the answers from camera step 3).
- Turning: the camera page sends the knob angle every 3°. The globe dial has 12 positions (30° each).
  Jelling locks at 2 (60°), Yorba Linda at 4 (120°), Tokyo at 6 (180°). Use the camera page's **Zero knobs** to set where 0 is.
- If the globe stone turns the opposite way from the real one, open `globe.html?flip=1`.
- If no knob marker is visible, the globe keeps the last angle, and the dial can still be turned with the mouse.
