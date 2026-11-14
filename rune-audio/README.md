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

- **When it turns on:** what the game is about, the 3 places from left to right on the board, and the keys.
- **Riddle:** read out loud. Putting a rune on a place the riddle is not about: "Nothing happens there."
- **Moving a rune (how far):** beeps that get faster and higher as the rune gets closer to the place the riddle means,
  coming from the left or right speaker (the side the place is on). Now and then: "Move it up and to the left, close."
  On the place: "That's Jelling. Let go of the rune."
- **Wrong rune:** a low buzz and "That rune does not belong here. Take it off and try another rune."
- **Right rune:** a rising chord, the question, and the 4 answers with their knob positions
  (dot up = A, right = B, down = C, left = D; each quarter turn clockwise goes to the next answer).
- **Turning the rune:** a tick and the answer it points at now, e.g. "B: Knut".
- **Space:** wrong answer = the clue; right answer = a fanfare, the fact, and where Jörmungandr goes.
  Then the next riddle, and at the end "The journey is complete".
- Everything said is also shown as a big caption at the bottom of the screen.

## When the hand hides the rune

The camera can't tell a hand over the rune from a rune taken off. So the guide waits before believing it:

- Rune disappears during the question: "I can't see the rune on Yorba Linda. If your hand is on it, let go so the camera can see it."
  When it is seen again (within 8 s): "I can see it again. The question continues." with the current answer, not the whole question again.
  Only after 8 s does it say the rune was taken off and read the riddle again.
- Knob dot not visible for 3 s during the question: "Let go of it for a moment so the camera can read it."
  Space without a visible dot: "Let go of the rune so the camera can see it, then press Space again."
- While moving a rune: it remembers the last rune that moved. If it can't be seen for a moment:
  "I can't see the Red rune. Put it down on the map so I can see where it is."

Note: the game itself (the globe) still goes back to the riddle while the rune is hidden, and back to the question
when it is seen again. That is the base game; the guide only makes sure the visitor isn't confused by it.

## If directions are wrong

"Up / down / left / right" are directions in the camera picture. If the camera is turned so the picture does not
match the visitor's view of the board, add `?flipx=1` (left-right) and/or `?flipy=1` (up-down) to the address.

## Files

- `index.html`: the page: Rune Vision in a frame, the Sound guide button and the caption
- `audio.js`: the guide (speech, sounds, distance, lost-rune handling). It imports `quest.js`, `story.js` and `settings.js`
  from `rune-vision/globe/`, so changes to the story or rules there are picked up automatically.
- `start.bat`, `start.command`: start a local server for the whole project and open the page
