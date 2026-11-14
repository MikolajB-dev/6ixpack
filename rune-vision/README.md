# Rune Vision

A webcam watches the white board. It finds the 3 red circles and checks which coloured rune is in each one.
When all 3 runes are in the right circles, it shows the **Jörmungandr** win screen.

Circles, left to right: **Jelling (Denmark), Yorba Linda (California), Tokyo (Japan)**.

## Do I need a camera?

No. The MacBook webcam works, and an iPhone works too through Continuity Camera (same Apple ID, Wi-Fi and Bluetooth on).
Pick it from the camera dropdown at the top. The iPhone is better because you can mount it above the board, looking straight down.

## Run it

1. Open **Google Chrome**.
2. Drag `index.html` into the Chrome window (or right-click → Open With → Google Chrome).
3. Click **Allow** when Chrome asks for the camera.

If the camera does not start, double-click `start.command` instead. It runs a tiny local web server and opens the page.
(The first time, macOS may say it's from an unidentified developer: right-click it → Open → Open.)

## Where to put the camera

- Best: an **iPhone above the board, looking straight down**, about 40–60 cm up (tape it to a shelf, lamp or a box with a hole).
  The board should fill most of the picture, with all 3 circles fully visible.
- The MacBook webcam can't see a board lying flat in front of it. If you use it, stand the board up against something facing the screen.
- Keep the camera and board still after setup. If either moves, press Auto-detect again.
- Light it evenly. A dark shadow over a circle (like the one in the middle of the test photo) makes colours harder to read; a desk lamp from above helps.
- Hand-drawn, wobbly circles are fine. Just make sure each red line is closed (no big gaps) and the circles don't touch each other.

## Windows

Everything works the same on Windows: it's just a web page. Use **Chrome or Edge**.
Double-click **start-windows.bat**: it starts a small local server and opens the page at `http://localhost:8000`
(uses Python if installed, otherwise Windows' built-in PowerShell). Leave the black window open while you use it.
Camera: any USB webcam or the laptop camera works. (iPhone Continuity Camera is Mac-only; on Windows use a webcam
or a phone-webcam app that installs a virtual camera, e.g. Camo or DroidCam.)

## Set it up (one time, about 1 minute)

1. Point the camera at the board so all 3 red circles are visible. Even light, no strong shadows.
2. **Step 1:** press **Auto-detect** with the board empty. Coloured rings appear on the 3 circles.
   If they're wrong, press **Click them myself** and follow the yellow hints (centre, then edge, for each circle).
3. **Step 2:** put each rune on the board, press **Teach** next to it, and click on that rune in the picture.
4. **Step 3:** choose which rune belongs in which circle.

Settings are saved in the browser, so you only do this once per laptop.

## The game

1. Put the **Jelling** and **Tokyo** runes in their right circles (Yorba Linda isn't needed for now, change that with the "needed" boxes in step 3).
2. The channel screen opens: 10 glowing Bluetooth pathways from Jelling to Tokyo.
3. The visitor picks a channel by clicking it (or pressing 1–9, 0 = 10). The right one is **6** by default; change it in step 3.
4. Wrong channel: it flashes orange, "only static". Right channel: Jörmungandr travels down it and coils around the Tokyo stone.
5. Take a rune off the board to start over. **R** replays, **Esc** closes, **C** reopens the channel screen.

## What you see

- Grey ring: empty. Green ✓: right rune. Orange ✗: wrong rune.
- The % under each circle shows how much of the circle is filled with a rune colour.
- A change only counts after it holds for 0.8 s (the "Hold time" slider), so a hand passing over does not trigger anything.

## If detection is flaky

- Press **D** (or "Debug mask"): white = pixels that look like a rune, red = the red outlines. You want each rune to be a white blob.
- Rune not detected: raise **Colour tolerance** or lower **Min. coverage**, or Teach it again.
- Wrong rune detected / hands trigger it: lower **Colour tolerance**, raise **Min. coverage** or **Hold time**.
- Use strong, different colours for the runes (blue, green, yellow work well). Avoid red (same as the circles), white, grey and skin-like orange.

## Backup keys (if the camera fails during the demo)

| Key | Does |
| --- | --- |
| 1 / 2 / 3 | cycle the rune in Jelling / Yorba Linda / Tokyo |
| A | put all runes in the right place (win) |
| 0 | clear all |
| K | back to camera mode |
| D | debug mask |
| Esc | close the channel screen |
| C | reopen the channel screen |

## Knob rotation (experimental)

Yes, rotation can be detected, but a plain one-colour rune is round-symmetric, so the camera can't tell how it's turned. Each rune needs one **orientation marker**:

- One **black dot** (marker pen or round sticker) on the top face, about halfway between the centre and the edge.
- About **1/5 of the rune's width** across (e.g. 1 cm dot on a 5 cm rune). Matte, not shiny.
- The rest of the top face stays fully in the tracking colour (blue / green / yellow).
- Camera **straight above** the board. From an angle, circles become ovals and the angles get skewed.
- Hands hide the dot while turning. The page keeps the last good angle and updates as soon as the dot is visible again.

How it works: it finds the centre of the coloured blob, finds the dark dot inside it, and the direction from centre to dot is the angle
(0° = up in the camera picture, clockwise). The circle is split into 10 positions of 36° (one per pathway), with a dead zone between positions so it doesn't flicker.
Press **Zero knobs** to make the current position of every knob count as 0.

Tested on generated images of your board: 24 angles, worst error 1.6°. Real camera noise will be larger, but 36° per position leaves a lot of room.

## Events (what other parts of the project can use)

| Event | When | Data |
| --- | --- | --- |
| `placed` | a rune appears in a circle | rune, to, correct |
| `removed` | a rune leaves a circle | rune, from |
| `moved` | a rune left one circle and appeared in another within 5 s | rune, from, to, correct |
| `rotate` | a knob turns to a new position | rune, slot, angle, step (0–9) |
| `slot` / `state` | any change | full board state: for each circle the rune, correct, coverage %, angle, step |
| `stones-ready` / `stones-removed` | the "needed" stones are all right / no longer right | full state |

The demo channel screen can be switched off in step 3 ("Show the demo channel screen") if another part of the team builds the real visitor screen.

## Hooking up the world map later

Every change is broadcast. Another page on the same server can listen like this:

```js
new BroadcastChannel('rune-board').onmessage = e => console.log(e.data);
// e.data.type is one of the events in the table above
// e.data.slots = [{ slot:'jelling', rune:'Blue rune', correct:true }, ...]
```

The page also fires `window` events (`rune:slot`, `rune:state`, `rune:complete`) and, if loaded in an iframe,
sends the same messages to the parent with `postMessage`. A BLE bridge to an nRF54L15 DK can listen to the same events later.
