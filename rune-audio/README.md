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
| H | hear where you are again: the riddle, or the question with all 4 answers, and what is on the map |
| Space | lock in the answer (the game's own key, unchanged) |

## What the visitor hears

One message at a time, with a short pause in between. Messages that are out of date are skipped
(e.g. a riddle that was waiting when the question already started).

- **When it turns on:** what the game is about, the 3 places from left to right, the order (Jelling, then Yorba Linda,
  then Tokyo) and the keys. Then the current riddle or question. If the globe's intro film is playing,
  the guide waits until the film is over.
- **Riddle:** read out loud.
- **Moving the right rune (how far):** "You have the Red rune." Beeps (at most 4 a second) that get faster and higher
  as the rune gets closer to its place, from the left or right speaker. Now and then: "Move it down and to the right, close."
  On the place: one ding and "That's Jelling. Let go of the rune." No beeps while the voice talks or when the rune lies still.
- **Moving a rune whose turn it isn't:** "That's the Blue rune. It's not its turn yet." (once per stone)
- **A rune on a place that isn't open yet:** "Tokyo is not open yet." (only if it stays there 1.5 s)
- **Wrong rune on the open place:** a low buzz and "That rune does not belong on Jelling. Take it off and try another rune."
- **Right rune:** a rising chord, the question, and the 4 answers with their knob positions
  (dot up = A, right = B, down = C, left = D; each quarter turn clockwise goes to the next answer).
- **Turning the rune:** a tick at every step; the answer in words once the rune stays on it for half a second, e.g. "B: Knut".
- **Space:** wrong answer = the clue; right answer = a fanfare, the fact, and where Jörmungandr goes.
  Then the next riddle, and at the end "The journey is complete".
- Everything said is also shown as a big caption at the bottom of the screen.

## The order

The places open one after the other, as in `rune-vision/globe/story.js`: Jelling, Yorba Linda, Tokyo.
A place opens when the one before is locked with the right answer. Which rune belongs where comes from the camera page
(step 3 there: Jelling = Red, Yorba Linda = Blue, Tokyo = Yellow). The guide reads the globe's story card every second and
follows it if the two ever disagree.

## When the hand hides the rune

The camera can't tell a hand over the rune from a rune taken off. So the guide waits before believing it:

- Short flickers (under 2.5 s) are ignored completely. Locked stones are never talked about.
- Rune in play hidden for 2.5 s during the question: "I can't see the rune on Yorba Linda. If your hand is on it, let go so the camera can see it."
  (at most once every 6 s). When it is seen again: "I can see it again. The question continues."
  Only after 9 s does it say the rune was taken off and read the riddle again.
- Knob dot not visible for 3.5 s: "Let go of it for a moment so the camera can read it." (at most every 10 s)
- While moving the rune: it remembers where it last saw it. Only if it stays hidden for 3 s right after moving:
  "I can't see the Red rune. Put it down on the map so I can see where it is."

## How the guide finds the rune (for "how far")

It never changes the camera page's settings: you still place the circles and teach the colours on the spot.
On top of that it learns by itself:

- **Still colour is background.** Anything that looks like a rune colour but doesn't move for about 7 s (the brown map,
  a card lying around, a shadow) is ignored. This keeps updating, so it follows changes in the light.
- **A rune is one patch** of its colour, about rune-sized; the black dot may make a hole in it, and a patch with a dot counts more.
- **The moving patch wins.** If several patches have the rune's colour, it follows the one that moves.
- **Steady:** a rune must be seen in 3 of the last 5 pictures, and its position is smoothed, so jitter isn't "moving".
- It uses a slightly stricter colour test than the camera page (clearly coloured only), so skin and old paper count less.

The game itself still uses the camera page's own detection. If the camera page sees a rune where there is none
(e.g. the brown map looking like the red rune), the globe reacts to that, and the guide can only report it.

## If directions are wrong

"Up / down / left / right" are directions in the camera picture. If the camera is turned so the picture does not
match the visitor's view of the board, add `?flipx=1` (left-right) and/or `?flipy=1` (up-down) to the address.

## Files

- `index.html`: the page: Rune Vision in a frame, the Sound guide button and the caption
- `audio.js`: the guide (speech, sounds, distance, lost-rune handling). It imports `quest.js`, `story.js` and `settings.js`
  from `rune-vision/globe/`, so changes to the story or rules there are picked up automatically.
- `start.bat`, `start.command`: start a local server for the whole project and open the page
