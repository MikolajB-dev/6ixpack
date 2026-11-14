# Bindrune: sound guide (add-on)

A spoken guide so a blind visitor can play Bindrune from start to finish by ear.
It is an **add-on**: it changes nothing in `rune-vision/`. It loads the normal Rune Vision page in a full-window frame
and only listens to it (the same `rune-board` events the globe uses, plus the camera picture the page already has).

## Run it

1. Double-click `start.bat` (Windows) or `start.command` (Mac). It serves the **whole project** on `http://localhost:8000`
   and opens `http://localhost:8000/rune-audio/`.
   (Same address and port as Rune Vision, so the camera setup you saved there is used here too.
   Close Rune Vision's own server first: only one can use port 8000.)
2. Set up the camera as usual (see `rune-vision/README.md`), press **G** for the globe.
3. Press **V** or the **Sound guide** button (bottom left) to turn the guide on.
   Browsers only allow sound after a click or key press, so the guide starts talking at the first key or click.
   `?audio=1` in the address starts with the guide switched on.

## Keys

| Key | Does |
| --- | --- |
| V | sound guide on / off (it remembers the choice) |
| H | hear where you are again: the riddle, or the question with all 4 answers, what is on the map, and where the rune is |
| N | skip what is being said now (also the **Skip** button next to the guide button) |
| + / - | speak faster / slower (0.7 to 2.0, starts at 1.3, remembered) |
| T | guide view: a small picture of what the guide sees (for testing, bottom right) |
| Space | lock in the answer (the game's own key, unchanged) |

The keys also work while the globe has the keyboard.

## What the visitor hears

One message at a time. Out-of-date messages are dropped (e.g. a riddle that was waiting when the question already started),
and when the visitor does something (Space, a rune on the place) the guide stops reading and answers that instead.

- **When it turns on:** what the game is about, the 3 places from left to right, the order (Jelling, then Yorba Linda,
  then Tokyo), what the beeps mean, and the keys. Then the current riddle or question. If the globe's intro film is
  playing, the guide waits until the film is over.
- **Riddle:** read out loud.
- **Moving the right rune:** "I see the Red rune." Then beeps all the time while the camera sees it: faster and higher
  as it gets closer to its place, from the left or right speaker. When the direction or distance changes:
  "Move it up and to the right, close." On the place: a ding and "That's Jelling. Let go of the rune.", then quick
  high beeps until the camera page counts it. A rune lying still beeps slowly.
- **Camera can't see the rune:** a slow soft tick ("looking"), quicker when a hand moves.
  If a hand moves for a while with no rune colour: "Hold it by its sides with the coloured top facing up."
- **Moving a rune whose turn it isn't:** "That's the Blue rune. It's not its turn yet. Find the Red rune." (at most every 5 s)
- **A rune on a place that isn't open yet:** "That is Tokyo. It is not open yet. Take the Yellow rune off." (if it stays 0.8 s)
- **Wrong rune on the open place:** a low buzz and "The Blue rune does not belong on Jelling. Take it off and try another rune."
- **Right rune:** a rising chord, "The stone at Yorba Linda rises", the question, the 4 answers with their knob positions
  (dot up = A, right = B, down = C, left = D; each quarter turn clockwise goes to the next answer),
  and where the rune points now if the camera already knows.
- **Turning the rune:** a tick at every step; the answer in words once the rune stays on it a moment, e.g. "B: Knut".
- **Space:** wrong answer = the clue; right answer = a fanfare, the fact, and where Jörmungandr goes.
  Pressing Space while the question is still being read cuts it short. Then the next riddle, and at the end
  "The journey is complete".
- Short sounds for every rune put on or taken off a place. Sounds get quieter while the voice talks.
- Everything said is also shown as a big caption at the bottom of the screen.

## The order

The places open one after the other, as in `rune-vision/globe/story.js`: Jelling, Yorba Linda, Tokyo.
A place opens when the one before is locked with the right answer. Which rune belongs where comes from the camera page
(step 3 there: Jelling = Red, Yorba Linda = Blue, Tokyo = Yellow). The guide reads the globe's story card every second and
follows it if the two ever disagree.

## When the hand hides the rune

The camera can't tell a hand over the rune from a rune taken off. So the guide waits before believing it:

- Rune in play hidden during the question: after 1.2 s "I can't see the rune on Yorba Linda. If your hand is on it,
  let go so the camera can see it." This waits until the voice is free; if the rune is back before it is spoken, nothing
  is said. If it was spoken, "I can see it again" follows when the rune is back. Only after 8 s does it say the rune
  was taken off and read the riddle again.
- A rune taken off another place is only mentioned for a stone that is done, or a place the guide talked about before
  (so a short camera flicker is never reported).
- Knob dot not visible for 3 s: "Let go of it for a moment so the camera can read it." (at most every 9 s)
- While moving the rune, it remembers where it last saw it for 2.5 s and keeps beeping (softer).
- **Skin looks like the Red rune** to the camera page. The guide checks each report with its own stricter colour test,
  and treats a hand over a place as a hand (says nothing) instead of a wrong rune. The globe itself still reacts to it,
  because that is the base game.

## How the guide finds the rune (for "how far")

It never changes the camera page's settings: you still place the circles and teach the colours on the spot.
On top of that it learns by itself, about 16 times a second:

- **Still colour is background.** Rune-coloured areas that never move for about 20 s (the brown map, a card lying
  around, a shadow) are ignored. It only learns while the board is calm, and keeps updating, so it follows the light.
- **Movement:** it compares each picture with the one before to find where a hand or rune moves.
- **The moving patch wins.** A new patch of the rune's colour must move and be seen twice in a row before the guide
  follows it, so the map or an arm doesn't take over.
- **Own colour estimate:** whenever the camera page says a rune is on a place and the board is calm, the guide sharpens
  its idea of that rune's colour (a little stricter than the taught colour, never far from it). Teaching the colour
  again on the camera page resets it.

The game itself still uses the camera page's own detection. If the camera page sees a rune where there is none
(e.g. the brown map looking like the red rune), the globe reacts to that, and the guide can only report it.

## Known limits

- If the board looks empty for a moment after stone 1 (e.g. a hand covers the only rune), the base game starts the
  journey again, and the guide says so. This can't be changed without touching `rune-vision/`.
- Tested by replaying a recording of the board and with simulated camera events, not yet with a blind tester.

## If directions are wrong

"Up / down / left / right" are directions in the camera picture. If the camera is turned so the picture does not
match the visitor's view of the board, add `?flipx=1` (left-right) and/or `?flipy=1` (up-down) to the address.

## Files

- `index.html`: the page: Rune Vision in a frame, the Sound guide and Skip buttons, the caption and the guide view
- `audio.js`: the guide (speech, sounds, rune tracking, distance, lost-rune handling). It imports `quest.js`, `story.js`
  and `settings.js` from `rune-vision/globe/`, so changes to the story or rules there are picked up automatically.
- `start.bat`, `start.command`: start a local server for the whole project and open the page
