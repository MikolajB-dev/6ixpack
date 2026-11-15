/*
  Demo keys: play the whole journey from the keyboard on the globe page, with no camera, board or Rune Vision.
  They send the same messages Rune Vision would send, so the globe behaves exactly as in the real game.

    N        do the next right thing (place the right rune, then lock in the right answer, then start again at the end)
    P        put the right rune on the current stone (press again to take it off)
    W        put a wrong rune on the current stone
    1 2 3 4  turn the knob to answer A B C D
    Enter    lock in (like SPACE in Rune Vision)
    0        take all runes off (starts again)
    H        show these keys
*/
import { PLACES } from './settings.js';

export function startDemo(quest, send, say) {
  // Our own pretend board: one entry per place, like Rune Vision's snapshot.
  const board = Object.keys(PLACES).map(slot => ({ slot, rune: null, correct: false, choice: null }));
  const spot = () => board.find(s => s.slot === quest.current?.slot);
  const copy = () => board.map(s => ({ ...s }));               // like a message: the globe gets its own copy
  const state = () => send({ type: 'state', slots: copy() });
  const lock = () => {
    const s = spot();
    send({ type: 'lock', slot: s?.slot ?? null, choice: s?.choice ?? null, slots: copy() });
  };
  const place = (right) => {
    const s = spot();
    if (!s) return;
    s.rune = right ? 'right rune' : 'wrong rune';
    s.correct = right;
    s.choice = null;
    state();
  };
  const turn = (i) => {
    const s = spot();
    if (!s || !s.rune) { say('Place a rune first (P)'); return; }
    s.choice = 'ABCD'[i];
    send({ type: 'rotate', slot: s.slot, step: i });
  };

  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'n') {
      if (quest.phase === 'riddle') place(true);
      else if (quest.phase === 'question') { turn('ABCD'.indexOf(quest.current.correct)); lock(); }
      else if (quest.phase === 'solved') say('Wait: the next riddle comes when the gold bar is full');
      else { board.forEach(s => Object.assign(s, { rune: null, correct: false, choice: null })); state(); }
    } else if (k === 'p') {
      const s = spot();
      if (s?.rune && s.correct) { Object.assign(s, { rune: null, correct: false, choice: null }); state(); }
      else place(true);
    } else if (k === 'w') place(false);
    else if (['1', '2', '3', '4'].includes(k)) turn(+k - 1);
    else if (k === 'enter') lock();
    else if (k === '0') { board.forEach(s => Object.assign(s, { rune: null, correct: false, choice: null })); state(); }
    else if (k === 'h') say('Demo: N next · P right rune · W wrong rune · 1-4 answer · Enter lock · 0 clear');
  });
}
