# Bindrune: Rune Globe

A 3D globe that shows the rune board. It does no camera work itself: it only listens to the events
Rune Vision (`../index.html`) already sends, so there is one place that decides where the runes are.

## Run it

1. Double-click `../start.command` (same as for Rune Vision). Rune Vision opens at `localhost:8000`.
2. In a **second window**, open `http://localhost:8000/globe/`. Put it on the big screen.
3. Use the board as usual. No camera? Press the backup keys in the Rune Vision window (1/2/3, A, 0).

Both pages must come from `localhost:8000` (not by double-clicking the html file), or they can't talk to each other.
The corner of the globe says "connected to Rune Vision" once the first event arrives.
Open the globe first, or move a rune once after opening it: it only learns the board state from new events.

## What the visitor does

The camera page is only for setting up. Visitors only see the globe: the story card on the left, the globe on the right.

1. **Riddle:** the card hints where a rune belongs (first one: Jelling, the home stone).
   A coloured stone under "Your rune" shows which physical rune to use. It comes from step 3 ("answers") in Rune Vision.
2. **Place the rune.** Wrong rune: a red ring pulses around the stone. Right rune: the runestone rises and its rune glows gold.
3. **Question:** a history question with 4 answers. Turning the rune picks the answer: dot up = A, right = B, down = C, left = D.
   The answer the dot points at is highlighted live.
4. **Lock in** with SPACE (in the Rune Vision window). Wrong: a clue appears, try again. Right: a short fact, and the stone is locked.
5. From the 2nd stone on, Jörmungandr slithers on from the last stone it reached to the new one and coils around it.
   There is only **one** serpent: it starts at Jelling and grows from stone to stone (Jelling → Yorba Linda → Tokyo).
6. After a few seconds the next riddle appears. After the last stone, the serpent goes back to Jelling and bites its own
   tail, closing the ring. Then the outro plays (see below) and the globe spins.

Taking a rune off during its question goes back to the riddle. Taking **all** runes off the map starts again for the next visitor,
once the map has stayed empty for 5 seconds (`RESTART` in `settings.js`): a hand over the only rune also looks like an empty map.
During a question the answers sit around a drawing of the rune (A above, B right, C below, D left); its dot turns live
with the real rune, and a big line says "Press the LOCK button to choose B". If a hand hides the rune, the question waits
4 seconds (COVER_MS in quest.js) before going back to the riddle.
At the end a **Play again** button appears; the Arduino lock button (or SPACE) does the same. If runes are still on the map,
the card first asks to take them off.

Testing without the camera: keys 1/2/3 and A place runes, but they have no knob, so SPACE says the dot can't be seen.
Use the real board to test the answers.

## Try it without the camera (demo keys)

Open `globe/` on its own and press keys in the globe window. They fake the board, so the whole journey plays as usual:

- **N** next step: places the right rune, then locks in the right answer. At the end, N starts again.
- **P** right rune on the current stone (again: take it off), **W** wrong rune
- **1 2 3 4** turn the knob to A B C D, **Enter** lock in
- **0** take all runes off, **H** show the keys

## Polish (what the screen does on its own)

- **Camera:** when the right rune is placed, the globe flies a little closer to that stone. After a right answer it pulls back
  over the serpent's new leg so you see it slither on from the last stone. For the next riddle it returns to the usual view (so the riddle
  is not given away). If a visitor drags the globe, it glides back after about 12 seconds.
- **Waiting screen:** if nobody plays for a minute (board empty, first riddle), the globe slowly turns. The first rune stops it.
- **Story card:** a trail of 3 diamonds at the top (found stones show their rune, the current one glows). New cards slide in,
  turning the knob moves the highlight, a wrong answer shakes, the right one turns green, and a thin gold bar fills
  until the next riddle appears.
- **Globe:** gold dust drifts around it, a found stone sends up gold sparkles (all stones at the end), and its name turns gold
  with its rune. A wrong rune turns the name reddish.
- **Sound:** soft tones made in the browser (no files). Browsers only play sound after a click or key press in that window.

Keys on the globe page (only in its own window, not inside Rune Vision's G view): **F** full screen, **R** back to the usual
view, **M** sound on/off, **O** play the outro. Numbers for all of this are in `settings.js` under `CAMERA`, `EFFECTS` and `SOUND`.

## Intro

When the globe page opens, a short film plays on top of it (about 12 seconds): Jörmungandr circles a small globe,
bites its own tail, the 3 places light up and the title **BINDRUNE** appears. Then it fades away and the game is there.
Click, Space or Esc (in the globe window) skips to the bite.

- On its own page: `http://localhost:8000/globe/intro.html`. Add `?loop=1` to play forever (good for a waiting screen),
  `?speed=1.5` to go faster, `?title=...` for another word.
- To turn it off, delete the `playIntro()` line at the bottom of `index.html`.
- The name of the game is `TITLE` at the top of `intro.js`. The places and colours come from `settings.js`.

## Outro

The closing twin of the intro (about 15 seconds). It starts by itself 1.6 seconds after the serpent bites its tail
at the end of the journey. The game globe dissolves into the intro's small globe with the serpent holding its tail,
the 3 runes lift off their places and fly together, a gold ring closes in and they fuse into one **bind rune**
(ᚼ ᚢ ᛏ in one sign): a flash, a shockwave, a light runs around the serpent and its scales glow gold.
**BINDRUNE** comes back with "All stones are bound". Then the world goes dark, only the bind rune and the serpent's
eyes keep glowing, and it fades back to the spinning globe. Click, Space or Esc skips to the ending.
Taking all runes off the map stops it (after the same 5 seconds).

- On its own page: `http://localhost:8000/globe/outro.html`. `?loop=1` plays forever, `?hold=1` stays on the bright
  bound world, `?speed=1.5` goes faster, `?start=6` begins 6 seconds in, `?line=...` changes the small line.
- **O** on the globe page plays it at any time.
- The wait before it starts is `OUTRO.delayMs` in `settings.js`. To turn it off, set it very high.
- It reuses the intro's serpent head, scales, places, arcs and rune shapes (exported from `intro.js`), so both films match.

## Change things

- `story.js`: riddles, questions, answers, which letter is right, clues and facts. Change the texts freely.
- `settings.js`: places, the rune on each stone, colours, stone size and rise speed, serpent thickness, speed, coil and sway,
  camera moves, sparkles and sound volume.

## Files

- `index.html`: the page (layout and styles) and the order the scripts load in
- `intro.js`, `intro.html`: the intro film, and a page that shows only the intro
- `outro.js`, `outro.html`: the outro film, and a page that shows only the outro
- `globe.js`: the main file: sets up the globe, listens to Rune Vision, connects the pieces below
- `story.js`: the texts of the journey
- `quest.js`: the rules of the journey (riddle → question → lock in → next)
- `panel.js`: the story card on the left
- `settings.js`: all the numbers and colours
- `parchment.js`: draws the old map that wraps around the globe (no images needed)
- `runestone.js`: one runestone (rise, glowing rune, rings)
- `serpent.js`: the one serpent (route from stone to stone, body, swaying). Its head, spikes and scales are the intro's
- `geo.js`: maths for points on a sphere
- `camera.js`: where the camera looks at each moment of the journey, glide-back and the waiting-screen spin
- `effects.js`: gold dust and sparkle bursts
- `sound.js`: the soft sounds (made in the browser)
- `demo.js`: the demo keys, to play without the camera or board
- `three-global.js`: loads three.js once so Globe.gl and our code share it
- `lib/`: local copies of Globe.gl 2.46.2 and three.js 0.186.1, so it works offline
- `img/countries.geojson`: country shapes (Natural Earth, simplified)

The old `img/earth-blue-marble.jpg` and `img/night-sky.png` are not used any more and can be deleted.
