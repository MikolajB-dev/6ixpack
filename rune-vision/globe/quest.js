/*
  The visitor's journey, as a small "state machine". No drawing here: only the rules.

  For each step of the story (story.js):
    'riddle'    waiting for the right rune on the right place
    'question'  right rune is placed: waiting for the visitor to lock in an answer with the knob
    'solved'    right answer: the stone is locked, the serpent travels; globe.js calls next() after a moment
  After the last step: 'finished'.
    'clear'     "Play again" was pressed while runes are still on the map: waiting for an empty board

  Rules:
    - The first stone (Jelling) is "home". Every stone after it gets a serpent from home.
    - Taking the rune off during the question goes back to the riddle.
    - When the board is completely empty, the journey starts again (for the next visitor).
*/
import { STORY } from './story.js';
import { HUB } from './settings.js';

export class Quest {
  constructor() { this.reset(); }

  reset() {
    this.step = 0;          // index in STORY
    this.phase = 'riddle';
    this.locked = [];       // slot ids of stones that are done, in order
    this.feedback = null;   // { text, type: 'wrong' | 'clue' | 'right' | 'info' }
    this.slots = [];
  }

  get current() { return STORY[this.step]; }

  slot(id) { return this.slots.find(s => s.slot === id) || {}; }

  // New board state from Rune Vision.
  onState(slots) {
    this.slots = slots;
    const empty = slots.every(s => !s.rune);
    if (empty && (this.step > 0 || this.phase !== 'riddle')) { this.reset(); this.slots = slots; return; }
    if (this.phase === 'clear') return;     // still waiting for the last runes to come off
    if (this.phase === 'finished' || this.phase === 'solved') return;

    const s = this.slot(this.current.slot);
    if (this.phase === 'riddle') {
      if (s.rune && s.correct) { this.phase = 'question'; this.feedback = null; }
      else if (s.rune) this.feedback = { text: 'The stone stays silent. That rune does not belong here.', type: 'wrong' };
      else this.feedback = null;
    } else if (this.phase === 'question' && !(s.rune && s.correct)) {
      this.phase = 'riddle';
      this.feedback = null;
    }
  }

  // The visitor locked in an answer (SPACE in Rune Vision). msg = { slot, choice, slots, ... }
  onLock(msg) {
    if (this.phase === 'finished') { this.restart(); return; }   // after the end, the lock button means "play again"
    if (this.phase === 'riddle') { this.feedback = { text: 'First place a rune on the right spot.', type: 'info' }; return; }
    if (this.phase !== 'question') return;
    // Read the knob of the stone the question is about (not just the last rune that was moved).
    const target = (msg.slots || []).find(s => s.slot === this.current.slot);
    const choice = target ? target.choice : (msg.slot === this.current.slot ? msg.choice : null);
    if (!choice) { this.feedback = { text: 'The black dot on the rune can\'t be seen. Turn it and try again.', type: 'info' }; return; }

    if (choice === this.current.correct) {
      this.locked.push(this.current.slot);
      this.phase = 'solved';
      this.feedback = { text: `Right! ${this.current.fact}`, type: 'right' };
    } else {
      this.feedback = { text: `Not quite. Clue: ${this.current.clue}`, type: 'clue' };
    }
  }

  // "Play again": start over. If runes are still on the map, first ask to take them off,
  // otherwise the first stone would count as solved straight away.
  restart() {
    const slots = this.slots;
    this.reset();
    this.slots = slots;
    if (slots.some(s => s.rune)) this.phase = 'clear';
  }

  // Go to the next riddle (called by globe.js after the serpent has had time to travel).
  next() {
    if (this.phase !== 'solved') return;
    this.step++;
    this.feedback = null;
    if (this.step >= STORY.length) { this.phase = 'finished'; return; }
    this.phase = 'riddle';
    this.onState(this.slots);   // the next rune might already be in place
  }

  // How each stone should look: 'right' (risen, glowing), 'wrong' (red ring) or 'empty'.
  stoneState(id) {
    if (this.locked.includes(id)) return 'right';
    if (this.phase === 'finished' || this.phase === 'clear' || id !== this.current.slot) return 'empty';
    const s = this.slot(id);
    return !s.rune ? 'empty' : s.correct ? 'right' : 'wrong';
  }

  // Which serpents to show: [from, to, coil]. Every locked stone after home is joined to home.
  serpents() {
    if (!this.locked.includes(HUB)) return [];
    const list = this.locked.filter(id => id !== HUB).map(id => [HUB, id, true]);
    // Whole journey done: the last two stones are joined too, closing Jörmungandr's ring.
    if (this.phase === 'finished' && this.locked.length >= 3) {
      const n = this.locked.length;
      list.push([this.locked[n - 2], this.locked[n - 1], false]);
    }
    return list;
  }
}
