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
    - Taking the rune off during the question goes back to the riddle, but only after COVER_MS:
      a hand turning the rune hides it from the camera for a moment, and that should not count as "taken off".
    - When the board is completely empty, the journey starts again (for the next visitor).
*/
import { STORY } from './story.js';
import { HUB } from './settings.js';

const COVER_MS = 4000;   // how long the rune may be hidden (e.g. by a hand) during a question before we go back to the riddle

export class Quest {
  constructor() { this.reset(); }

  reset() {
    this.step = 0;          // index in STORY
    this.phase = 'riddle';
    this.locked = [];       // slot ids of stones that are done, in order
    this.feedback = null;   // { text, type: 'wrong' | 'clue' | 'right' | 'info' }
    this.slots = [];
    this.hiddenSince = null; // when the question's rune disappeared (probably a hand over it), or null
  }

  get current() { return STORY[this.step]; }

  slot(id) { return this.slots.find(s => s.slot === id) || {}; }

  // New board state from Rune Vision.
  onState(slots) {
    this.slots = slots;
    const empty = slots.every(s => !s.rune);
    // A completely empty board means a new visitor: start again. But during a question the only rune may just be
    // hidden by a hand, so that case is handled below (the grace period) instead.
    if (empty && this.phase !== 'question' && (this.step > 0 || this.phase !== 'riddle')) { this.reset(); this.slots = slots; return; }
    if (this.phase === 'clear') return;     // still waiting for the last runes to come off
    if (this.phase === 'finished' || this.phase === 'solved') return;

    const s = this.slot(this.current.slot);
    if (this.phase === 'riddle') {
      if (s.rune && s.correct) { this.phase = 'question'; this.feedback = null; }
      else if (s.rune) this.feedback = { text: 'The stone stays silent. That rune does not belong here.', type: 'wrong' };
      else this.feedback = null;
    } else if (this.phase === 'question') {
      if (s.rune && s.correct) {                       // the rune is (back) in view
        if (this.hiddenSince) { this.hiddenSince = null; this.feedback = null; }
      } else if (!s.rune) {                            // gone: probably a hand over it, give it a moment
        if (!this.hiddenSince) this.hiddenSince = Date.now();
        this.feedback = { text: 'Let go of the rune for a moment, so the stone can see it.', type: 'info' };
      } else {                                         // another rune is there now: back to the riddle
        this.backToRiddle();
      }
    }
  }

  // Called every second by globe.js: if the rune stayed hidden too long, it was really taken off.
  tick() {
    if (!(this.phase === 'question' && this.hiddenSince && Date.now() - this.hiddenSince > COVER_MS)) return false;
    if (this.slots.every(s => !s.rune)) { const slots = this.slots; this.reset(); this.slots = slots; }   // board empty: new visitor
    else this.backToRiddle();
    return true;   // something changed
  }

  backToRiddle() {
    this.phase = 'riddle';
    this.feedback = null;
    this.hiddenSince = null;
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
    if (this.phase === 'question' && this.hiddenSince) return 'right';   // hidden by a hand: keep the stone up
    return !s.rune ? 'empty' : s.correct ? 'right' : 'wrong';
  }

  // Where the ONE serpent (Jörmungandr) goes: from home through every locked stone, in the order they were solved.
  // ring: the whole journey is done, so it goes back home and bites its own tail.
  serpent() {
    if (!this.locked.includes(HUB)) return { stops: [], ring: false };
    const stops = [HUB, ...this.locked.filter(id => id !== HUB)];
    return { stops, ring: this.phase === 'finished' && stops.length >= 3 };
  }
}
