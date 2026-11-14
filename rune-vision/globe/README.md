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
2. **Place the rune.** Wrong rune: a red ring pulses around the stone. Right rune: the runestone rises and its rune glows gold.
3. **Question:** a history question with 4 answers. Turning the rune picks the answer: dot up = A, right = B, down = C, left = D.
   The answer the dot points at is highlighted live.
4. **Lock in** with SPACE (in the Rune Vision window). Wrong: a clue appears, try again. Right: a short fact, and the stone is locked.
5. From the 2nd stone on, Jörmungandr slithers from Jelling to the new stone and coils around it.
6. After a few seconds the next riddle appears. After the last stone, the serpent closes the ring and the globe spins.

Taking a rune off during its question goes back to the riddle. Taking **all** runes off the map starts again for the next visitor.

Testing without the camera: keys 1/2/3 and A place runes, but they have no knob, so SPACE says the dot can't be seen.
Use the real board to test the answers.

## Intro

When the globe page opens, a short film plays on top of it (about 12 seconds): Jörmungandr circles a small globe,
bites its own tail, the 3 places light up and the title **BINDRUNE** appears. Then it fades away and the game is there.
Click, Space or Esc (in the globe window) skips to the bite.

- On its own page: `http://localhost:8000/globe/intro.html`. Add `?loop=1` to play forever (good for a waiting screen),
  `?speed=1.5` to go faster, `?title=...` for another word.
- To turn it off, delete the `playIntro()` line at the bottom of `index.html`.
- The name of the game is `TITLE` at the top of `intro.js`. The places and colours come from `settings.js`.

## Change things

- `story.js`: riddles, questions, answers, which letter is right, clues and facts. Change the texts freely.
- `settings.js`: places, the rune on each stone, colours, stone size and rise speed, serpent thickness, speed, coil and sway.

## Files

- `index.html`: the page (layout and styles) and the order the scripts load in
- `intro.js`, `intro.html`: the intro film, and a page that shows only the intro
- `globe.js`: the main file: sets up the globe, listens to Rune Vision, connects the pieces below
- `story.js`: the texts of the journey
- `quest.js`: the rules of the journey (riddle → question → lock in → next)
- `panel.js`: the story card on the left
- `settings.js`: all the numbers and colours
- `parchment.js`: draws the old map that wraps around the globe (no images needed)
- `runestone.js`: one runestone (rise, glowing rune, rings)
- `serpent.js`: one serpent (route, scaled body, head, swaying)
- `geo.js`: maths for points on a sphere
- `three-global.js`: loads three.js once so Globe.gl and our code share it
- `lib/`: local copies of Globe.gl 2.46.2 and three.js 0.186.1, so it works offline
- `img/countries.geojson`: country shapes (Natural Earth, simplified)

The old `img/earth-blue-marble.jpg` and `img/night-sky.png` are not used any more and can be deleted.
