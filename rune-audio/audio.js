/*
  Bindrune sound guide: an add-on so a blind visitor can play the whole game by ear.
  ------------------------------------------------------------------------------
  It changes NOTHING in rune-vision/. It only:
    - listens to the same 'rune-board' events the globe listens to,
    - runs its own copy of the game rules (quest.js, story.js) so it always knows the riddle, question and answers,
    - reads the globe's story card now and then, to stay in step with what the globe shows,
    - looks at the camera picture the camera page already has, to tell where the rune is.
  It never changes the camera page's settings (circles, colours, sliders): you calibrate there as usual.

  The order of the journey: Jelling first, then Yorba Linda, then Tokyo (story.js). Each place opens only when the one
  before is locked with the right answer. Which rune belongs where comes from the camera page (step 3 there).

  What the visitor hears (when the guide is on):
    - what the game is about, the riddle, the question and the 4 answers
    - beeps all the time while the camera sees the rune in play: faster and higher = closer to its place,
      left / right speaker = the side the place is on. A slow soft tick = "I am looking for the rune".
    - a short sound for every change on the board (rune on, rune off, knob step), then words
    - turning the rune or pressing Space stops the reading of the answers and goes straight to the result

  Keys (in the game window):
    V  guide on / off          H  hear where you are again      N  skip what is being said
    +  speak faster            -  speak slower                  T  guide view (what the guide sees, for testing)
    Space  lock in the answer (the game's own key)
  Address options: ?audio=1 starts with the guide on.  ?flipx=1 / ?flipy=1 mirror left-right / near-far
  (use them if the camera is turned, so the bottom of the picture is not the visitor's side of the board).
*/
import { Quest } from '../rune-vision/globe/quest.js';
import { STORY } from '../rune-vision/globe/story.js';
import { PLACES, SERPENT, RESTART } from '../rune-vision/globe/settings.js';

const params = new URLSearchParams(location.search);
const FLIP_X = params.get('flipx') === '1';
const FLIP_Y = params.get('flipy') === '1';
const LETTERS = ['A', 'B', 'C', 'D'];
const DOT = ['dot up', 'dot right', 'dot down', 'dot left'];

const frame = document.getElementById('game');
const btn = document.getElementById('guideBtn');
const skipBtn = document.getElementById('skipBtn');
const captionEl = document.getElementById('caption');
const viewCv = document.getElementById('guideView');

const store = {
  get(k, d) { try { const v = localStorage.getItem('runeAudio.' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('runeAudio.' + k, v); } catch (e) {} },
};

/* ===================== 1. Speech: one message at a time ===================== */

let on = false;          // guide switched on
let unlocked = false;    // browsers only allow sound after the first click or key press
let ctx = null;          // Web Audio, for the beeps
let rate = Math.min(2, Math.max(0.7, parseFloat(store.get('rate', '1.3')) || 1.3));   // speaking speed (+ / - keys)

function caption(text) { captionEl.textContent = text; }

// Rune letters in the story texts, as a voice should say them ("ᚼ (H)" becomes "H", "ᛒ" becomes "B").
const RUNE_SOUNDS = { 'ᚼ': 'H', 'ᛒ': 'B', 'ᛏ': 'T', 'ᚢ': 'U', 'ᚠ': 'F', 'ᚱ': 'R', 'ᚾ': 'N', 'ᛖ': 'E' };
const speakable = text => text
  .replace(/[ᚠ-᛿]\s*\(([A-Z])\)/g, '$1')
  .replace(/[ᚠ-᛿]/g, ch => RUNE_SOUNDS[ch] || '');

// Kinds of message:
//   intro                              what the game is about
//   riddle, question, resume, where    where you are now (only the newest one matters)
//   result                             right / wrong / clue: stops the reading of the intro, a riddle or a question
//   knob                               the answer the rune points at (said after the question, never over it)
//   spot                               "that's the place, let go"
//   guide                              directions (only when nothing else is being said)
//   info                               everything else
const STATE_KINDS = ['riddle', 'question', 'resume', 'where'];
const isState = k => STATE_KINDS.includes(k);
const queue = [];
let current = null;       // the message being spoken now
let gapUntil = 0;         // a short pause between messages
let filmUntil = 0;        // the globe's intro film is playing: wait with talking until then

// onStart (optional) runs when the message really starts being spoken, not when it is queued.
function say(text, { kind = 'info', interrupt = false, tag = null, onStart = null } = {}) {
  if (!on) return;
  const cur = current ? current.kind : '';
  if (kind === 'guide' && (current || queue.length)) return;
  if (isState(kind)) {                                    // an older riddle / question is out of date
    dropQueued(m => isState(m.kind) || m.kind === 'guide');
    if (isState(cur) || cur === 'guide') stopCurrent();
  } else if (kind === 'result' || kind === 'spot') {      // the visitor did something: don't keep reading
    dropQueued(m => isState(m.kind) || ['knob', 'guide', 'spot', 'intro'].includes(m.kind));
    if (isState(cur) || ['knob', 'guide', 'spot', 'intro'].includes(cur)) stopCurrent();
  } else if (kind === 'knob') {
    dropQueued(m => m.kind === 'knob' || m.kind === 'guide');
    if (cur === 'knob' || cur === 'guide') stopCurrent();
  }
  if (interrupt) { queue.length = 0; stopCurrent(); }
  queue.push({ text, kind, tag, onStart });
  pump();
}
function dropQueued(test) { for (let i = queue.length - 1; i >= 0; i--) if (test(queue[i])) queue.splice(i, 1); }
function stopCurrent() {
  if (!current) return;
  clearTimeout(current.watchdog);
  current = null;
  try { speechSynthesis.cancel(); } catch (e) {}
}
const talking = () => !!current || queue.length > 0;

// Start the next message when the voice is free (called from say() and every 80 ms).
function pump() {
  if (!queue.length || current) return;
  if (!unlocked) { caption(queue[queue.length - 1].text); return; }
  const now = performance.now();
  if (now < filmUntil || now < gapUntil) return;
  const item = queue.shift();
  current = item;
  caption(item.text);
  if (item.onStart) item.onStart();
  const done = () => {
    if (current !== item) return;
    clearTimeout(item.watchdog);
    current = null;
    gapUntil = performance.now() + 250;
  };
  // Chrome sometimes forgets to say "finished": move on anyway after a generous time.
  item.watchdog = setTimeout(done, item.text.length * 95 / rate + 4000);
  try {
    // Long texts are split into sentences (Chrome stops very long utterances).
    const parts = speakable(item.text).split(/(?<=[.!?])\s+/).filter(Boolean);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = 'en-GB';
      u.rate = rate;
      if (i === parts.length - 1) { u.onend = done; u.onerror = done; }
      speechSynthesis.speak(u);
    });
  } catch (e) { done(); }
}
setInterval(pump, 80);

function skip() { stopCurrent(); gapUntil = 0; pump(); }
function setRate(r) {
  rate = Math.round(Math.min(2, Math.max(0.7, r)) * 10) / 10;
  store.set('rate', String(rate));
  dropQueued(m => m.tag === 'rate');
  if (current?.tag === 'rate') stopCurrent();
  say(`Speed ${rate.toFixed(1)}.`, { kind: 'info', tag: 'rate' });
}

/* ===================== 2. Sounds ===================== */

// One short tone. at = seconds from now, pan -1 (left) .. 1 (right), slide = change of pitch over the tone.
// Tones are quieter while the voice is talking, so the words stay clear.
function tone(freq, at, dur, { type = 'sine', gain = 0.15, pan = 0, slide = 0 } = {}) {
  if (!on) return;
  if (window.runeGuide.onTone) window.runeGuide.onTone(freq, gain, pan);   // for tests
  if (!ctx) return;
  if (current) gain *= 0.45;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  p.pan.value = Math.max(-1, Math.min(1, pan));
  osc.connect(g).connect(p).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.05);
}
const cue = {
  right:  () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.1, 0.3, { type: 'triangle' })),          // rising chord
  wrong:  () => { tone(160, 0, 0.35, { type: 'sawtooth', gain: 0.08 }); tone(120, 0.18, 0.4, { type: 'sawtooth', gain: 0.08 }); },
  solved: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.8, { type: 'triangle', gain: 0.11 })); tone(98, 0, 1.5, { gain: 0.12 }); },
  clue:   () => { tone(440, 0, 0.18, { type: 'triangle' }); tone(330, 0.2, 0.3, { type: 'triangle' }); },
  tick:   () => tone(1600, 0, 0.03, { type: 'square', gain: 0.05 }),                                    // knob step
  on:     () => tone(520, 0, 0.09, { gain: 0.1, slide: 260 }),                                          // a rune landed on a place
  off:    () => tone(620, 0, 0.12, { gain: 0.1, slide: -300 }),                                         // a rune left a place
  found:  () => { tone(500, 0, 0.1, { gain: 0.07 }); tone(750, 0.11, 0.14, { gain: 0.07 }); },
  lock:   () => tone(900, 0, 0.05, { type: 'square', gain: 0.05 }),
  other:  () => tone(300, 0, 0.12, { type: 'triangle', gain: 0.08 }),                                   // a rune whose turn it isn't
  beep:   (freq, pan, gain = 0.09) => tone(freq, 0, 0.07, { type: 'sine', gain, pan }),                 // "this close"
  seek:   pan => tone(220, 0, 0.04, { type: 'triangle', gain: 0.05, pan }),                             // "looking for the rune"
  ding:   pan => { tone(1320, 0, 0.5, { type: 'triangle', gain: 0.11, pan }); tone(1980, 0.05, 0.45, { type: 'sine', gain: 0.05, pan }); },
};

// Called on the first click or key press: from then on the browser lets us make sound.
function unlock(playIntro = true) {
  if (unlocked) return;
  unlocked = true;
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); } catch (e) { ctx = null; }
  if (on && playIntro) intro();
}

/* ===================== 3. The camera page and the globe (read only) ===================== */

// The camera page keeps its settings and picture in plain variables. We only read them.
let cam = null;
let camWin = null;
function hookCamera() {
  camWin = frame.contentWindow;
  try {
    cam = camWin.eval(`({
      get cfg(){ return cfg; }, get state(){ return state; }, get source(){ return source; }, get gains(){ return lastGains; }, SLOTS
    })`);
  } catch (e) { cam = null; console.warn('[sound guide] cannot read the camera page', e); }

  camWin.addEventListener('keydown', onKey);
  camWin.addEventListener('pointerdown', () => unlock(), true);
  const gv = camWin.document.getElementById('globeView');
  if (gv) gv.addEventListener('load', () => {
    // The globe starts its journey from the beginning: so do we, to stay in step with it.
    restartQuest();
    // It also plays its intro film (about 12 s). Wait with talking until it says it is done.
    filmUntil = performance.now() + 16000;
    try {
      gv.contentWindow.addEventListener('intro:done', () => { filmUntil = 0; });
      gv.contentWindow.addEventListener('keydown', onGlobeKey);  // keys also work when the globe has the keyboard
    } catch (e) { filmUntil = 0; }
  });
  frame.focus();
}
frame.addEventListener('load', hookCamera);
if (frame.contentDocument?.readyState === 'complete' && frame.contentWindow.location.href !== 'about:blank') hookCamera();

const slotIndex = id => (cam ? cam.SLOTS.findIndex(s => s.id === id) : -1);
const placeName = id => PLACES[id]?.name || id;
const runeName = r => cam?.cfg.runes[r]?.name || 'rune';
// The rune that belongs on a place (camera page, step 3), and the rune whose turn it is now.
const runeFor = slot => { const i = slotIndex(slot); return i >= 0 ? cam.cfg.answer[i] : -1; };
const targetRune = () => (cam && quest.current && quest.phase !== 'finished' ? runeFor(quest.current.slot) : -1);

// What the globe's story card shows now: { step, phase } or null if the globe isn't open.
function readGlobe() {
  try {
    const doc = camWin?.document.getElementById('globeView')?.contentDocument;
    const stepText = doc?.getElementById('panel-step')?.textContent || '';
    if (/journey is complete/i.test(stepText)) return { step: STORY.length, phase: 'finished' };
    if (/new journey/i.test(stepText)) return { step: 0, phase: 'clear' };              // "Play again", runes still on the map
    const m = stepText.match(/Stone (\d+) of/);
    if (!m) return null;
    const answers = doc.getElementById('panel-answers').children.length;
    const right = doc.getElementById('panel-feedback').classList.contains('right');
    return { step: +m[1] - 1, phase: answers ? (right ? 'solved' : 'question') : 'riddle' };
  } catch (e) { return null; }
}

/* ===================== 4. The game rules (our own copy, same as the globe) ===================== */

let quest = new Quest();
let nextTimer = null;
function restartQuest() {
  quest = new Quest();
  clearTimeout(nextTimer); nextTimer = null;
  clearLost();
  lastSaid.fb = '';
  newStep();
}

// Like globe.js refresh(): after a right answer, the next riddle comes when the serpent has arrived.
function scheduleNext() {
  if (quest.phase === 'solved' && !nextTimer) {
    nextTimer = setTimeout(() => {
      nextTimer = null;
      const before = snap();
      quest.next();
      afterChange(before, 'next');
    }, SERPENT.travelMs + 2500);
  }
  if (quest.phase !== 'solved' && nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
}

// Every second: does the globe show the same stone and phase as our copy? If not (for 2 s in a row), take the globe's.
let mismatch = 0;
setInterval(() => {
  const g = readGlobe();
  if (!g || quest.phase === 'solved' || g.phase === 'solved') { mismatch = 0; return; }
  if (g.step === quest.step && g.phase === quest.phase) { mismatch = 0; return; }
  if (++mismatch < 2) return;
  mismatch = 0;
  console.log('[sound guide] back in step with the globe:', g);
  const before = snap();
  quest.step = Math.min(g.step, STORY.length - 1);
  quest.locked = STORY.slice(0, g.step).map(s => s.slot);
  quest.phase = g.phase;
  quest.feedback = null;
  afterChange(before, 'sync');
}, 1000);

// The board stays empty: no new event comes, so check here whether quest.js starts again (same as globe.js does).
setInterval(() => {
  const before = snap();
  if (!quest.checkRestart()) return;
  clearLost(); newStep(); emptyNote.spoke = false;
  cue.off();
  afterChange(before, 'state');
}, 500);

const snap = () => ({ step: quest.step, phase: quest.phase, fb: quest.feedback, fbText: quest.feedback?.text || '' });
const lastSaid = { fb: '' };

/* ===================== 5. Events from Rune Vision ===================== */

new BroadcastChannel('rune-board').onmessage = e => onEvent(e.data);

function onEvent(msg) {
  if (msg.type === 'state') onState(msg.slots);
  else if (msg.type === 'lock') {
    cue.lock();
    const before = snap();
    quest.onLock(msg);
    afterChange(before, 'lock');
  } else if (msg.type === 'rotate') onRotate(msg);
  scheduleNext();
}

// A hand over a rune looks the same to the camera as taking the rune off, so for the rune in play we wait a moment
// before believing it. slot id -> { rune, step, spoke, timers }
const lost = new Map();
const LOST_SAY_MS = 1200;      // say "can't see it" after this
const LOST_GIVE_UP_MS = 8000;  // after this it really was taken off
let resume = null;             // { slot, step, spoke }: the rune came back, so the question just continues
const emptyNote = { spoke: false };   // we said "I can't see any rune on the map"
const slotTimers = new Map();  // slot -> timer for "is it still like that in a moment?"
const told = new Set();        // slots we said something about ("not open yet", "is off"), so we also say when it ends
function clearLost() {
  for (const l of lost.values()) l.timers.forEach(clearTimeout);
  lost.clear();
  for (const t of slotTimers.values()) clearTimeout(t);
  slotTimers.clear(); told.clear(); realOn.clear();
}
function later(slot, ms, fn) { clearTimeout(slotTimers.get(slot)); slotTimers.set(slot, setTimeout(() => { slotTimers.delete(slot); fn(); }, ms)); }

// Is that rune really on that place? The camera page's colour test also fires on a hand (skin looks like the red rune),
// so we check with the guide's own stricter colour test. If we can't tell, we believe the camera page.
function reallyThere(r, i) {
  if (!eyes.ok || !HH || r < 0 || i < 0 || performance.now() - eyes.lastLook > 500) return true;
  const c = cam.cfg.circles[i], t = cam.cfg.runes[r], m = model(r), tol = cam.cfg.hueTol;
  const R = (c.prof ? Math.max(...c.prof) : c.r) * GW * 0.9, cx = c.x * GW, cy = c.y * GH;
  const sMin = Math.max(0.3, t.s * 0.6, m.s * 0.72), vMin = Math.max(0.15, t.v * 0.45), hTol = Math.min(tol, 12);
  let n = 0;
  for (let y = Math.max(0, cy - R | 0); y <= Math.min(GH - 1, cy + R | 0); y++) for (let x = Math.max(0, cx - R | 0); x <= Math.min(GW - 1, cx + R | 0); x++) {
    if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
    const p = y * GW + x;
    if (SS[p] >= sMin && VV[p] >= vMin && hueDist(HH[p], t.h) <= tol && hueDist(HH[p], m.h) <= hTol) n++;
  }
  return n >= Math.max(6, Math.PI * R * R * 0.035);
}
const realOn = new Map();      // slot -> was the rune the camera page reported there really a rune? (false = a hand)

function onState(slots) {
  const prev = quest.slots || [];
  const before = snap();
  quest.onState(slots);
  // An empty board can be a hand over the only rune, or everyone took their runes off. quest.js only starts again
  // after the board has stayed empty for a few seconds (RESTART in settings.js), so say both in one line.
  const empty = slots.every(s => !s.rune), progress = before.step > 0 || !['riddle', 'clear'].includes(before.phase);
  if (empty && progress && prev.some(s => s.rune)) {
    emptyNote.spoke = false;
    later('empty', 900, () => {
      if (!quest.slots.every(s => !s.rune) || quest.step !== before.step) return;
      say(`I can't see any rune on the map. If your hand is over a rune, let go. If you took them all off, the journey starts again in ${Math.round(RESTART.emptyMs / 1000)} seconds.`,
          { kind: 'info', tag: 'empty', onStart: () => { emptyNote.spoke = true; } });
    });
  }
  if (!empty && prev.length && prev.every(s => !s.rune)) {             // runes are back before the restart
    clearTimeout(slotTimers.get('empty')); slotTimers.delete('empty');
    dropQueued(m => m.tag === 'empty');
    if (emptyNote.spoke && !lost.size) { emptyNote.spoke = false; cue.found(); say('I can see the runes again.', { kind: 'info' }); }
  }
  for (const s of slots) {
    const p = prev.find(x => x.slot === s.slot) || {};
    if ((p.rune || null) === (s.rune || null)) continue;
    const inPlay = STORY[before.step]?.slot === s.slot && before.phase !== 'finished';
    const wasReal = realOn.get(s.slot) !== false;
    const real = s.rune ? reallyThere(s.runeIndex ?? -1, slotIndex(s.slot)) : false;
    if (s.rune) realOn.set(s.slot, real); else realOn.delete(s.slot);
    if (p.rune) { if (wasReal) cue.off(); runeGone(s.slot, p.rune, before, inPlay, wasReal); }
    if (s.rune) { if (!inPlay && real) cue.on(); runeCame(s.slot, s.rune, inPlay, real); }
  }
  afterChange(before, 'state');
}

function runeGone(slot, rune, before, inPlay, wasReal) {
  if (lost.has(slot)) return;               // already waiting for the rune in play to come back (a hand is over it)
  if (!wasReal) return;                     // it was a hand, not a rune: nothing left the place
  if (inPlay && before.phase === 'question') {
    const entry = { rune, step: before.step, spoke: false, timers: [] };
    lost.set(slot, entry);
    entry.timers.push(setTimeout(() => {
      if (lost.get(slot) !== entry || quest.slots.every(s => !s.rune)) return;   // empty map: the empty-board line covers it
      // It waits for the voice to be free. Only once it is really spoken do we also say "I can see it again" later.
      say(`I can't see the rune on ${placeName(slot)}. If your hand is on it, let go so the camera can see it.`,
          { kind: 'info', tag: 'lost' + slot, onStart: () => { entry.spoke = true; } });
    }, LOST_SAY_MS));
    entry.timers.push(setTimeout(() => {
      if (lost.get(slot) !== entry) return;
      lost.delete(slot);
      if (quest.phase !== 'riddle' || quest.step !== entry.step) return;
      say(`The ${rune} was taken off ${placeName(slot)}. ` + riddleText(), { kind: 'riddle' });
    }, LOST_GIVE_UP_MS));
    return;
  }
  if (quest.slots.every(s => !s.rune)) return;   // the whole map is empty: one line about that is said instead
  // Any other place: only worth saying for a place we talked about before, or a stone that is already done.
  // (Otherwise a short flicker of the camera would make us say "off" for a rune we never announced.)
  if (!told.has(slot) && !quest.locked.includes(slot)) return;
  // Say it if it stays empty for a moment (sooner if we talked about that place before).
  later(slot, told.has(slot) ? 300 : 1000, () => {
    if (quest.slot(slot).rune || quest.slots.every(s => !s.rune)) return;
    const done = quest.locked.includes(slot);
    if (done) told.add(slot); else told.delete(slot);
    say(`The ${rune} is off ${placeName(slot)}.` + (done ? ' That stone is already done, so that is fine.' : ''), { kind: 'info' });
  });
}

function runeCame(slot, rune, inPlay, real) {
  const l = lost.get(slot);
  if (l && l.rune !== rune && !real) return;  // a hand over the rune in play (the camera page calls it another rune): keep waiting
  if (l) {
    l.timers.forEach(clearTimeout);
    lost.delete(slot);
    dropQueued(m => m.tag === 'lost' + slot);
    if (l.rune === rune) {
      resume = { slot, step: l.step, spoke: l.spoke };
      if (emptyNote.spoke) { l.spoke = true; resume.spoke = true; emptyNote.spoke = false; }
      if (l.spoke) { cue.found(); say('I can see it again.', { kind: 'info' }); }
      return;
    }
  }
  if (inPlay) { clearTimeout(slotTimers.get(slot)); slotTimers.delete(slot); return; }   // the rules decide what to say
  if (quest.locked.includes(slot)) {        // back on a stone that is already done
    clearTimeout(slotTimers.get(slot)); slotTimers.delete(slot);
    if (told.delete(slot)) say(`The ${rune} is back on ${placeName(slot)}.`, { kind: 'info' });
    return;
  }
  // A place that is not open yet. Wait a moment: the camera sometimes sees a rune for an instant that isn't there.
  if (!real) return;                        // a hand resting there: say nothing
  later(slot, 800, () => {
    if (quest.slot(slot).rune !== rune || !reallyThere(quest.slot(slot).runeIndex ?? -1, slotIndex(slot)) || slot === quest.current?.slot || quest.locked.includes(slot) || quest.phase === 'finished') return;
    told.add(slot);
    cue.wrong();
    say(`That is ${placeName(slot)}. It is not open yet. Take the ${rune} off. Press H to hear the riddle again.`, { kind: 'result' });
  });
}

// Knob: a tick at once, the answer in words as soon as the rune has stayed on that letter for a moment.
let knobTimer = null, lastKnobSaid = null;
function onRotate(msg) {
  const s = quest.slot(msg.slot);
  if (!s.slot) return;
  const old = s.choice;
  s.choice = 'ABCD'[msg.step] || null;
  if (quest.phase !== 'question' || msg.slot !== quest.current.slot || !s.choice || s.choice === old) return;
  cue.tick();
  knobWarned = false;
  const turned = !!old;                 // the first reading after placing the rune is not a turn
  if (!turned && questionPending) return;   // the question is about to say where the rune points
  clearTimeout(knobTimer);
  knobTimer = setTimeout(() => {
    const c = quest.slot(quest.current.slot).choice;
    if (quest.phase !== 'question' || !c || c === lastKnobSaid) return;
    lastKnobSaid = c;
    say(`${c}: ${quest.current.answers[LETTERS.indexOf(c)]}`, { kind: 'knob' });
  }, turned ? 350 : 100);
}

// Decide what to say after the rules changed something.
let questionTimer = null, questionPending = false;
function afterChange(before, why) {
  const a = snap();
  scheduleNext();
  if (a.phase !== before.phase || a.step !== before.step) {
    lastSaid.fb = a.fbText;
    clearTimeout(questionTimer); questionPending = false;
    if (a.step !== before.step) newStep();
    if (a.phase === 'question') {
      const r = resume; resume = null;
      knobWarned = false; knobMissingSince = 0;
      if (r && r.slot === quest.current.slot && r.step === a.step) {
        // The rune was only hidden for a moment: the question just goes on. If we told the visitor we lost it,
        // the knob reading that follows says again where the rune points.
        if (r.spoke) lastKnobSaid = null;
      } else if (why !== 'sync') {
        // The camera page says the right rune is on its place. If the guide's own eyes don't see it there yet
        // (it may be a hand), wait a little before saying so. After 1.5 s we believe the camera page anyway.
        const step = a.step, slot = quest.current.slot, t0 = performance.now();
        lastKnobSaid = null; questionPending = true;
        const announce = () => {
          if (quest.phase !== 'question' || quest.step !== step) { questionPending = false; return; }
          if (!reallyThere(runeFor(slot), slotIndex(slot)) && performance.now() - t0 < 1500) { questionTimer = setTimeout(announce, 150); return; }
          cue.right();
          say(`The ${slot === 'jelling' ? 'home ' : ''}stone at ${placeName(slot)} rises.`, { kind: 'result' });
          // Give the camera a moment to read the knob, so the question can say where the rune points.
          questionTimer = setTimeout(() => {
            questionPending = false;
            if (quest.phase !== 'question' || quest.step !== step) return;
            lastKnobSaid = quest.slot(slot).choice || null;
            say(questionText(), { kind: 'question' });
          }, 400);
        };
        announce();
      }
    } else if (a.phase === 'riddle') {
      if (before.phase === 'question' && a.step === before.step) {
        // The rune left the place during the question: the lost-rune timers decide what to say.
        // But if another rune now sits there, it was swapped: say so straight away.
        const s = quest.slot(quest.current.slot);
        if (!lost.has(quest.current.slot) && s.rune && !s.correct) {
          cue.wrong();
          say(`The stone sinks. The ${s.rune} does not belong on ${placeName(s.slot)}. Take it off and try another rune.`, { kind: 'result' });
          lastSaid.fb = 'The stone stays silent. That rune does not belong here.';   // don't say it twice on the next update
        }
      } else if (why === 'state' && a.step === 0 && quest.slots.every(s => !s.rune)) {
        say('All runes are off the map. The journey starts again.', { kind: 'result', interrupt: true });
        say(riddleText(), { kind: 'riddle' });
      } else say(riddleText(), { kind: 'riddle' });
    } else if (a.phase === 'solved') {
      cue.solved();
      say(a.fbText + (quest.locked.length >= 2
        ? ` Jörmungandr slithers from Jelling to ${placeName(quest.locked[quest.locked.length - 1])} and coils around the stone.` : ''), { kind: 'result' });
    } else if (a.phase === 'clear') {
      say('A new journey. First take all the runes off the map.', { kind: 'result' });
    } else if (a.phase === 'finished') {
      cue.solved();
      say('The journey is complete. All runestones are bound together. Jörmungandr encircles the world! Press Space to play again.', { kind: 'result' });
    }
    return;
  }
  // Same step: new feedback? (A lock always counts, even with the same text: the visitor pressed Space again.)
  const changed = why === 'lock' ? a.fb !== before.fb : a.fbText !== lastSaid.fb;
  if (changed && a.fb) {
    lastSaid.fb = a.fbText;
    if (a.fb.type === 'wrong') {
      const s = quest.slot(quest.current.slot);
      if (realOn.get(s.slot) === false) return;            // a hand over the open place, not a wrong rune
      cue.wrong();
      say(`The ${s.rune || 'rune'} does not belong on ${placeName(quest.current.slot)}. Take it off and try another rune.`, { kind: 'result' });
    }
    else if (a.fb.type === 'clue') { cue.clue(); say(a.fbText + ' Turn the rune to another answer and press Space again.', { kind: 'result' }); }
    else if (a.fb.type === 'info' && a.fbText.includes('dot')) say("I can't see the black dot on the rune. Let go of the rune so the camera can see it, then press Space again.", { kind: 'result' });
    else say(a.fbText, { kind: 'result' });
  } else if (!a.fb) lastSaid.fb = '';
}

/* ===================== 6. Texts ===================== */

function riddleText() {
  const s = quest.current;
  return `Stone ${quest.step + 1} of ${STORY.length}. Riddle: ${s.riddle} Put a rune on the place you think it means.`;
}
function choiceText() {
  const c = quest.slot(quest.current.slot).choice;
  // Direction not known yet: say nothing; the knob reading says it as soon as the camera has it.
  return c ? `The rune points at ${c}: ${quest.current.answers[LETTERS.indexOf(c)]}. ` : '';
}
function questionText() {
  const s = quest.current;
  const answers = s.answers.map((t, i) => `${LETTERS[i]}, ${DOT[i]}: ${t}.`).join(' ');
  return `Question: ${s.question} ${answers} Turn the rune to choose. Each quarter turn clockwise goes to the next answer. ` +
         `${choiceText()}Press Space to lock in.`;
}
function boardText() {
  const list = (quest.slots || []).filter(s => s.rune).map(s => `the ${s.rune} on ${placeName(s.slot)}${quest.locked.includes(s.slot) ? ', done' : ''}`);
  return list.length ? `On the map: ${list.join('; ')}.` : 'No runes on the map yet.';
}
function boardOrder() {
  if (!cam) return '';
  const order = cam.SLOTS.map((s, i) => ({ name: s.name, x: cam.cfg.circles[i].x })).sort((a, b) => FLIP_X ? b.x - a.x : a.x - b.x);
  return `From left to right the places are ${order.map(o => o.name).join(', ')}.`;
}
// Where are we now: the riddle, the question, or the end.
function situation() {
  if (quest.phase === 'finished') return { text: 'The journey is complete. Press Space to play again.', kind: 'where' };
  if (quest.phase === 'clear') return { text: 'A new journey. First take all the runes off the map.', kind: 'where' };
  if (quest.phase === 'solved') return { text: 'Right answer. Jörmungandr is on his way. The next riddle comes in a moment.', kind: 'where' };
  if (quest.phase === 'question') return { text: questionText(), kind: 'question' };
  return { text: riddleText(), kind: 'riddle' };
}
function whereText() {
  let t = situation().text + ' ' + boardText();
  const want = targetRune(), tr = track[want];
  if (quest.phase === 'riddle' && tr && tr.vis) {
    const w = wayTo(tr);
    if (w) t += ` I can see the ${runeName(want)}. ${w.dist < 1 ? 'It is on the open place.' : `The open place is ${w.dirs || 'right there'}, ${w.how}.`}`;
  }
  return t;
}
function intro() {
  say('Sound guide on. Bindrune is a journey to three places on the map: Jelling, Yorba Linda and Tokyo. ' + boardOrder() +
      ' The places open one after the other: first Jelling, then Yorba Linda, then Tokyo. ' +
      'Listen to the riddle and put a rune on the place it means. Hold the rune by its sides, with the coloured top facing up. ' +
      'While the camera sees the rune, you hear beeps: faster and higher means closer, and they come from the side the place is on. ' +
      'A slow soft tick means the camera is looking for the rune. Then answer a question by turning the rune. ' +
      'Press Space to lock in an answer, H to hear where you are, N to skip, and V to turn the sound guide off.', { kind: 'intro', interrupt: true });
  const s = situation();
  say(s.text, { kind: s.kind });
}

/* ===================== 7. Eyes: finding the rune in the camera picture ===================== */
/*
  We look at the same camera picture as the camera page (a small copy, read only), about 16 times a second.
  Tuned on a real recording of the board (hand, arm, brown map, yellow card):

    - Colour: the camera page's own test for the taught colour, plus "about as strong a colour as the rune itself".
      Skin and the brown map pass the camera page's red test, but they are much duller than the rune, so this drops them.
    - A rune is ONE small patch of that colour (the coloured top of the block), not bigger than a place on the map.
    - Fresh colour = something that just moved there. The guide starts following a patch only when it is fresh and
      something really moved at that spot, and then keeps following it, also when it lies still.
      Colour that never moves (map, a card, a shadow) is learned as background after about 20 s and ignored.
      This is relearned all the time, so it follows the light.
    - Movement in the picture (hand or rune) is noticed from the difference between two pictures.
*/
const GW = 240;                       // width of our small copy of the picture
const BG_ON = 300;                    // looks (about 20 s) before colour that never moves counts as background
const FRESH = 12;                     // a patch whose colour arrived less than this many looks ago is "fresh"
const HOLD_MS = 2500;                 // a rune hidden by the hand is remembered this long
const gcv = document.createElement('canvas'), gx = gcv.getContext('2d', { willReadFrequently: true });
let GH = 0, NP = 0;
let HH, SS, VV, GR, PG, MOT;          // hue, saturation, brightness, grey, previous grey, movement (per pixel)
let bgc = [];                         // bgc[rune][pixel]: how many looks in a row this pixel has had that rune's colour
let act = [];                         // act[rune][pixel]: 1 = rune colour and not background (this look)
const eyes = { ok: false, lastLook: 0, motion: 0, lastMotion: 0, motionStart: 0, mx: 0.5, my: 0.5, flash: false, looks: 0, quietUntil: 25, ms: 0 };
const track = {};                     // rune index -> { x, y, vis, seen, acquired, moved, ax, ay, box, pend, area }
const models = [];                    // the guide's own idea of each rune's colour (starts as the taught colour)

function model(r) {
  const t = cam.cfg.runes[r], key = `${t.h}|${t.s}|${t.v}`;
  if (!models[r] || models[r].key !== key) {              // (re-)taught: start again from the taught colour
    models[r] = { h: t.h, s: t.s, key, quietUntil: eyes.looks + 20 };
    if (bgc[r]) bgc[r].fill(0);
  }
  return models[r];
}
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function alloc(gh) {
  GH = gh; NP = GW * GH;
  HH = new Float32Array(NP); SS = new Float32Array(NP); VV = new Float32Array(NP);
  GR = new Float32Array(NP); PG = null; MOT = new Uint8Array(NP);
  bgc = []; act = [];
  eyes.quietUntil = eyes.looks + 25;
}

// One look at the picture. Fills HH/SS/VV, movement, and for each rune the list of patches.
function look(now) {
  const src = cam.source;
  const sw = src?.videoWidth || src?.naturalWidth, sh = src?.videoHeight || src?.naturalHeight;
  if (!sw || !sh) { eyes.ok = false; return null; }
  const gh = Math.round(GW * sh / sw);
  if (gcv.width !== GW || gcv.height !== gh) { gcv.width = GW; gcv.height = gh; }
  if (GH !== gh) alloc(gh);
  let d;
  try { gx.drawImage(src, 0, 0, GW, GH); d = gx.getImageData(0, 0, GW, GH).data; } catch (e) { eyes.ok = false; return null; }
  eyes.ok = true; eyes.looks++; eyes.lastLook = now;

  // colours (same white balance and the same maths as the camera page)
  const [gr, gg, gb] = cam.gains || [1, 1, 1];
  for (let p = 0, k = 0; p < NP; p++, k += 4) {
    let r = d[k] * gr, g = d[k + 1] * gg, b = d[k + 2] * gb;
    if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
    const mx = r > g ? (r > b ? r : b) : (g > b ? g : b), mn = r < g ? (r < b ? r : b) : (g < b ? g : b), dl = mx - mn;
    let h = 0;
    if (dl > 0) {
      if (mx === r) h = ((g - b) / dl) % 6; else if (mx === g) h = (b - r) / dl + 2; else h = (r - g) / dl + 4;
      h *= 60; if (h < 0) h += 360;
    }
    HH[p] = h; SS[p] = mx ? dl / mx : 0; VV[p] = mx / 255; GR[p] = (r + g + b) / 3;
  }

  // movement: pixels that changed since the last look
  let mc = 0, sx = 0, sy = 0;
  if (PG) {
    for (let p = 0; p < NP; p++) {
      const m = Math.abs(GR[p] - PG[p]) > 22 ? 1 : 0;
      MOT[p] = m;
      if (m) { mc++; sx += p % GW; sy += (p / GW) | 0; }
    }
  } else PG = new Float32Array(NP);
  PG.set(GR);
  eyes.motion = mc / NP;
  eyes.flash = eyes.motion > 0.3;                       // the whole picture changed (light, camera bumped): not a hand
  if (eyes.flash) eyes.quietUntil = eyes.looks + 15;
  else if (mc > NP * 0.0025) {
    if (now - eyes.lastMotion > 600) eyes.motionStart = now;
    eyes.lastMotion = now; eyes.mx = sx / mc / GW; eyes.my = sy / mc / GH;
  }

  // rune colours
  const runes = cam.cfg.runes, tol = cam.cfg.hueTol, found = [];
  const c0 = cam.cfg.circles[0], R = (c0.prof ? Math.max(...c0.prof) : c0.r) * GW;      // size of a place, in our pixels
  const zoneArea = Math.PI * R * R;
  for (let r = 0; r < runes.length; r++) {
    const t = runes[r], m = model(r);
    if (!bgc[r]) { bgc[r] = new Uint16Array(NP); act[r] = new Uint8Array(NP); }
    const B = bgc[r], A = act[r], tr = track[r];
    const box = tr && tr.acquired && now - tr.seen < 1000 ? tr.box : null;      // don't learn the rune itself as background
    const sLoose = Math.max(0.3, t.s * 0.6), vMin = Math.max(0.15, t.v * 0.45);
    const sMin = Math.max(sLoose, m.s * 0.72), hTol = Math.min(tol, 12);
    for (let p = 0; p < NP; p++) {
      let hit = false;
      if (SS[p] >= sMin && VV[p] >= vMin) { const h = HH[p]; hit = hueDist(h, t.h) <= tol && hueDist(h, m.h) <= hTol; }
      if (hit) {
        if (B[p] < 65000) {
          if (!box) B[p]++;
          else { const x = p % GW, y = (p / GW) | 0; if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) B[p]++; }
        }
      } else B[p] = B[p] > 8 ? B[p] - 8 : 0;
      A[p] = hit && B[p] < BG_ON ? 1 : 0;
    }
    found[r] = eyes.flash ? [] : patches(A, B, zoneArea * 0.9);
  }
  return { found, zoneArea };
}

// All patches (connected pixels) in a mask: { x, y (0..1), area, fresh, moving, box }.
let seenPx = null;
function patches(A, B, maxA) {
  if (!seenPx || seenPx.length !== NP) seenPx = new Uint8Array(NP);
  const seen = seenPx; seen.fill(0);
  const stack = [], list = [];
  for (let p0 = 0; p0 < NP; p0++) {
    if (!A[p0] || seen[p0]) continue;
    let a = 0, sx = 0, sy = 0, sb = 0, x0 = GW, y0 = GH, x1 = 0, y1 = 0;
    stack.push(p0); seen[p0] = 1;
    while (stack.length) {
      const p = stack.pop(), x = p % GW, y = (p / GW) | 0;
      a++; sx += x; sy += y; sb += B[p];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const q = ny * GW + nx;
        if (A[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    if (a < 5 || a > maxA) continue;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (a / (w * h) < 0.35 || Math.max(w, h) / Math.min(w, h) > 3) continue;      // too stringy to be a rune top
    // did something really move here? (changed pixels in and just around the patch)
    let mv = 0;
    for (let y = Math.max(0, y0 - 3); y <= Math.min(GH - 1, y1 + 3); y++) for (let x = Math.max(0, x0 - 3); x <= Math.min(GW - 1, x1 + 3); x++) mv += MOT[y * GW + x];
    list.push({ x: sx / a / GW, y: sy / a / GH, area: a, fresh: sb / a, moving: mv >= 3, box: [x0 - 3, y0 - 3, x1 + 3, y1 + 3] });
  }
  return list;
}

const far = (ax, ay, bx, by) => Math.hypot(ax - bx, (ay - by) * GH / GW);     // distance in "picture widths"

// Follow each rune from look to look.
function follow(res, now) {
  const minNew = Math.max(12, res.zoneArea * 0.05);       // a new rune must be at least this big (a rune top is ~15-20 % of a place)
  res.found.forEach((list, r) => {
    const t = track[r] || (track[r] = { x: 0, y: 0, vis: false, seen: 0, acquired: false, moved: 0, ax: 0, ay: 0, box: null, pend: null, area: 0 });
    const quiet = eyes.looks < eyes.quietUntil || eyes.looks < (models[r]?.quietUntil || 0);   // just started / light changed: don't trust "fresh"
    let pick = null;
    // 1) keep following: the patch nearest to where the rune was (it may be small: half hidden by a finger)
    if (t.acquired && now - t.seen < HOLD_MS) {
      const gate = 0.07 + 0.1 * Math.min(1, (now - t.seen) / 800);
      let best = 0;
      for (const b of list) {
        const d = far(b.x, b.y, t.x, t.y);
        if (d > gate) continue;
        const sc = b.area / (1 + (d / 0.03) ** 2);
        if (sc > best) { best = sc; pick = b; }
      }
    }
    // 2) a fresh patch somewhere else that really moves, seen twice in a row: start following it.
    //    It also wins over a patch we follow that has not moved for a while (the moving one is the rune in the hand).
    let cand = null;
    if (!quiet) for (const b of list) {
      if (b === pick || b.area < minNew || b.fresh >= FRESH || !b.moving) continue;
      if (pick && far(b.x, b.y, pick.x, pick.y) < 0.06) continue;
      if (!cand || b.area > cand.area) cand = b;
    }
    if (cand) {
      const twice = t.pend && now - t.pend.t < 500 && far(cand.x, cand.y, t.pend.x, t.pend.y) < 0.12;
      t.pend = { x: cand.x, y: cand.y, t: now };
      if (twice && (!pick || now - t.moved > 1500)) { pick = cand; t.vis = false; }
    }
    if (pick) {
      const jump = !t.acquired || !t.vis || far(pick.x, pick.y, t.x, t.y) > 0.05;
      if (jump) { t.x = pick.x; t.y = pick.y; } else { t.x += (pick.x - t.x) * 0.65; t.y += (pick.y - t.y) * 0.65; }
      if (!t.acquired) { t.ax = t.x; t.ay = t.y; t.moved = now; }
      t.acquired = true; t.vis = true; t.seen = now; t.box = pick.box; t.area = pick.area;
      if (far(t.x, t.y, t.ax, t.ay) > 0.012) { t.moved = now; t.ax = t.x; t.ay = t.y; }
    } else {
      if (t.vis && now - t.seen > 200) t.vis = false;
      if (t.acquired && now - t.seen > HOLD_MS) t.acquired = false;
    }
  });
}

// Now and then: look at each rune where the camera page says it is sitting on a place, and sharpen the guide's own
// idea of its colour (how strong the colour really is, and its exact hue). It only ever gets a little stricter than
// the taught colour, never looser, and never far from it. The camera page's settings are not touched.
function learnColours(now) {
  if (now - eyes.lastMotion < 600) return;                // only when the board is calm (no hand in the way)
  cam.state.committed.forEach((r, i) => {
    if (r < 0) return;
    const c = cam.cfg.circles[i], t = cam.cfg.runes[r], m = model(r);
    const R = (c.prof ? Math.max(...c.prof) : c.r) * GW * 0.7, cx = c.x * GW, cy = c.y * GH;
    const sL = Math.max(0.3, t.s * 0.6, m.s * 0.72), vL = Math.max(0.15, t.v * 0.45), ss = [];
    let hx = 0, hy = 0;
    for (let y = Math.max(0, cy - R | 0); y <= Math.min(GH - 1, cy + R | 0); y++) for (let x = Math.max(0, cx - R | 0); x <= Math.min(GW - 1, cx + R | 0); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
      const p = y * GW + x;
      if (SS[p] < sL || VV[p] < vL || hueDist(HH[p], t.h) > cam.cfg.hueTol) continue;
      ss.push(SS[p]); hx += Math.cos(HH[p] * Math.PI / 180); hy += Math.sin(HH[p] * Math.PI / 180);
    }
    if (ss.length < 14) return;
    ss.sort((a, b) => a - b);
    const medS = ss[ss.length >> 1], h = (Math.atan2(hy, hx) * 180 / Math.PI + 360) % 360;
    m.s = Math.max(t.s * 0.92, Math.min(1.15, m.s + (medS - m.s) * 0.15));
    let dh = ((h - m.h + 540) % 360) - 180;
    m.h = (m.h + dh * 0.15 + 360) % 360;
    dh = ((m.h - t.h + 540) % 360) - 180;
    if (Math.abs(dh) > 6) m.h = (t.h + Math.sign(dh) * 6 + 360) % 360;
  });
}

// Which way and how far from a tracked rune to the open place: { dist (in place sizes), pan, dirs, how, band }.
const BAND_EDGES = [2.5, 5, 9], BAND_WORDS = ['very close', 'close', 'a bit further', 'far'];
function wayTo(t) {
  const i = slotIndex(quest.current.slot), c = cam.cfg.circles[i];
  if (!c) return null;
  const R = c.prof ? Math.max(...c.prof) : c.r;                        // radius as fraction of picture width
  let dx = c.x - t.x, dy = (c.y - t.y) * GH / GW;                      // both in "picture widths"
  if (FLIP_X) dx = -dx;
  if (FLIP_Y) dy = -dy;
  const dist = Math.hypot(dx, dy) / R;
  const ax = Math.abs(dx), ay = Math.abs(dy), big = Math.max(ax, ay), dirs = [];
  // The visitor stands at the bottom of the camera picture: up in the picture = away from them.
  if (ax >= 0.45 * big && ax > R * 0.6) dirs.push(dx < 0 ? 'to the left' : 'to the right');
  if (ay >= 0.45 * big && ay > R * 0.6) dirs.push(dy < 0 ? 'away from you' : 'towards you');
  let band = BAND_EDGES.findIndex(e => dist < e); if (band < 0) band = BAND_EDGES.length;
  return { dist, pan: Math.max(-1, Math.min(1, dx / (R * 4))), dirs: dirs.join(' and '), band, how: BAND_WORDS[band] };
}

/* ===================== 8. Turning what the eyes see into sound ===================== */

let knobWarned = false, knobMissingSince = 0, lastKnobWarn = 0;
const stepFlags = { had: false, notTurn: {}, hintT: 0, onSpot: false, band: -1, dirs: '', wordsT: 0, lastBeep: 0, lastSeek: 0 };
function newStep() {
  stepFlags.had = false; stepFlags.notTurn = {}; stepFlags.onSpot = false;
  stepFlags.band = -1; stepFlags.dirs = ''; stepFlags.wordsT = 0;
}

function guide(now) {
  if (!quest.current || ['finished', 'solved', 'clear'].includes(quest.phase)) return;   // nothing to guide towards

  // Question: is the knob dot visible? If not for a while, the hand is probably over it.
  if (quest.phase === 'question') {
    const i = slotIndex(quest.current.slot), r = i >= 0 ? cam.state.rot[i] : null;
    const missing = !r || r.lost > 12;
    if (!missing) { knobMissingSince = 0; knobWarned = false; }
    else if (!knobMissingSince) knobMissingSince = now;
    else if (!knobWarned && now - knobMissingSince > 3000 && now - lastKnobWarn > 9000 && !talking()) {
      knobWarned = true; lastKnobWarn = now;
      say("I can't see the dot on the rune. Let go of it for a moment so the camera can read it.", { kind: 'info' });
    }
    return;
  }
  if (!unlocked) return;

  // Other runes that are moved: it's not their turn (said again each time, at most every 5 s).
  const want = targetRune();
  for (const [k, t] of Object.entries(track)) {
    const r = +k;
    if (r === want || !t.vis || now - t.moved > 500) continue;
    if (STORY.slice(0, quest.step).some(s => runeFor(s.slot) === r)) continue;     // a rune that is already done
    if (now - (stepFlags.notTurn[r] || 0) < 5000) continue;
    stepFlags.notTurn[r] = now;
    cue.other();
    say(`That's the ${runeName(r)}. It's not its turn yet.${want >= 0 ? ` Find the ${runeName(want)}.` : ''}`, { kind: 'info' });
  }
  if (want < 0) return;
  const i = slotIndex(quest.current.slot);
  if (cam.state.committed[i] === want) return;            // it is on its place: the question is coming
  const t = track[want];

  // --- the camera sees the rune (or lost it under the hand a moment ago): beeps all the time ---
  if (t && (t.vis || (t.acquired && now - t.seen < HOLD_MS && now - eyes.lastMotion < 700))) {
    const hidden = !t.vis;                                // under the hand for a moment: keep the beeps going, softer
    const w = wayTo(t);
    if (!w) return;
    if (!stepFlags.had) { stepFlags.had = true; cue.found(); say(`I see the ${runeName(want)}.`, { kind: 'guide' }); }

    if (w.dist < 1) {
      // on the place: one ding, then quick high beeps until the camera page has counted it
      if (!stepFlags.onSpot) {
        stepFlags.onSpot = true;
        cue.ding(w.pan);
        say(`That's ${placeName(quest.current.slot)}. Let go of the rune.`, { kind: 'spot' });
      } else if (now - stepFlags.lastBeep > 170) { stepFlags.lastBeep = now; cue.beep(1250, w.pan, hidden ? 0.04 : 0.07); }
      return;
    }
    if (w.dist > 1.5) stepFlags.onSpot = false;

    const still = now - t.moved > 4000;                   // lying still: slow "here it is" beeps
    const gap = still ? 1300 : Math.min(800, 110 + w.dist * 42);
    if (now - stepFlags.lastBeep > gap) {
      stepFlags.lastBeep = now;
      cue.beep(420 + Math.max(0, 760 - w.dist * 62), w.pan, hidden ? 0.045 : still ? 0.06 : 0.09);
    }

    // words: when the direction or the distance really changes (at most every 2 s), or every 7 s while moving
    let band = w.band;
    if (stepFlags.band >= 0 && band !== stepFlags.band) {
      const e = BAND_EDGES[Math.min(band, stepFlags.band)];
      if (Math.abs(w.dist - e) < e * 0.12) band = stepFlags.band;       // right on the edge between two words: keep the old one
    }
    const changed = band !== stepFlags.band || w.dirs !== stepFlags.dirs;
    if (!hidden && !still && ((changed && now - stepFlags.wordsT > 2000) || now - stepFlags.wordsT > 7000)) {
      stepFlags.band = band; stepFlags.dirs = w.dirs; stepFlags.wordsT = now;
      say(`${w.dirs ? 'Move it ' + w.dirs : 'Almost there'}, ${BAND_WORDS[band]}.`, { kind: 'guide' });
    }
    return;
  }

  // --- the camera does not see the rune: a slow soft tick ("looking"), quicker when something moves on the board ---
  stepFlags.onSpot = false;
  if (current) return;                                    // not over the voice: this tick carries little news
  const moving = now - eyes.lastMotion < 500;
  if (now - stepFlags.lastSeek > (moving ? 550 : 1500)) {
    stepFlags.lastSeek = now;
    cue.seek(moving ? (eyes.mx - 0.5) * (FLIP_X ? -1.6 : 1.6) : 0);
  }
  // A hand has been moving for a while but there is no rune colour: tell how to hold it (at most every 9 s).
  if (moving && now - eyes.motionStart > 2500 && now - stepFlags.hintT > 9000 && !talking()) {
    stepFlags.hintT = now;
    say(stepFlags.had
      ? `I can't see the ${runeName(want)}. Hold it by its sides with the coloured top facing up, or put it down on the map.`
      : `I see movement, but not the ${runeName(want)}. Hold it by its sides with the coloured top facing up.`, { kind: 'guide' });
  }
}

// The main loop: look, follow, make sound. About 16 times a second.
function loop() {
  if (!on || !cam) return;
  const now = performance.now();
  const res = look(now);
  if (!res) return;
  follow(res, now);
  if (eyes.looks % 12 === 0) learnColours(now);
  guide(now);
  if (viewOn) drawView();
  eyes.ms = performance.now() - now;
}
setInterval(loop, 60);

/* ===================== 9. Guide view (T): what the guide sees, for testing ===================== */

let viewOn = false;
const RUNE_PAINT = [[255, 60, 60], [60, 160, 255], [255, 220, 40]];
function drawView() {
  if (viewCv.width !== GW || viewCv.height !== GH) { viewCv.width = GW; viewCv.height = GH; }
  const vx = viewCv.getContext('2d'), img = vx.createImageData(GW, GH), o = img.data;
  for (let p = 0, k = 0; p < NP; p++, k += 4) {
    let r = GR[p] * 0.45, g = r, b = r;                           // the picture, dimmed
    if (MOT[p]) { r += 70; g += 70; b += 70; }                    // movement: lighter
    for (let n = 0; n < act.length; n++) {
      if (!act[n]) continue;
      if (act[n][p]) { [r, g, b] = RUNE_PAINT[n % 3]; }           // rune colour: bright
      else if (bgc[n][p] >= BG_ON) { r = r * 0.5 + 60; g = g * 0.5; b = b * 0.5 + 60; }   // learned background: purple
    }
    o[k] = r; o[k + 1] = g; o[k + 2] = b; o[k + 3] = 255;
  }
  vx.putImageData(img, 0, 0);
  // the places (the open one in green), and a ring around each rune the guide is following
  cam.cfg.circles.forEach((c, i) => {
    const R = (c.prof ? Math.max(...c.prof) : c.r) * GW;
    vx.strokeStyle = quest.current && quest.phase !== 'finished' && slotIndex(quest.current.slot) === i ? '#7dff7d' : '#999';
    vx.lineWidth = 1; vx.beginPath(); vx.arc(c.x * GW, c.y * GH, R, 0, 7); vx.stroke();
  });
  const want = targetRune();
  for (const [k, t] of Object.entries(track)) {
    if (!t.acquired) continue;
    const [r, g, b] = RUNE_PAINT[k % 3];
    vx.strokeStyle = `rgba(${r},${g},${b},${t.vis ? 1 : 0.45})`; vx.lineWidth = 2;
    vx.beginPath(); vx.arc(t.x * GW, t.y * GH, 9, 0, 7); vx.stroke();
    if (+k === want) { vx.strokeStyle = '#fff'; vx.lineWidth = 1; vx.beginPath(); vx.arc(t.x * GW, t.y * GH, 12.5, 0, 7); vx.stroke(); }
  }
  vx.fillStyle = 'rgba(0,0,0,.6)'; vx.fillRect(0, GH - 12, GW, 12);
  vx.fillStyle = '#fff'; vx.font = '9px sans-serif';
  vx.fillText(`stone ${quest.step + 1} ${quest.phase} · moving ${(eyes.motion * 100).toFixed(1)}% · ${eyes.ms.toFixed(0)} ms`, 3, GH - 3);
}
function setView(v) { viewOn = v; viewCv.classList.toggle('show', v); }

// For trying things in the browser console: runeGuide.track, runeGuide.quest, ...
window.runeGuide = { track, eyes, stepFlags, models, get quest() { return quest; }, get queue() { return queue; }, get current() { return current; } };

/* ===================== 10. Switching the guide on and off, keys ===================== */

function setOn(v) {
  on = v;
  store.set('on', v ? '1' : '0');
  btn.textContent = `Sound guide: ${v ? 'on' : 'off'} (V)`;
  btn.setAttribute('aria-pressed', String(v));
  captionEl.classList.toggle('show', v);
  skipBtn.classList.toggle('show', v);
  if (v) eyes.quietUntil = eyes.looks + 25;
  if (v && unlocked) intro();
  else if (v) caption('Sound guide on. Press any key or click to start the sound.');
  else { queue.length = 0; stopCurrent(); caption(''); setView(false); }
}

const OUR_KEYS = ['v', 'h', 'n', '+', '=', '-', '_', 't'];
function onKey(e) {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'v') { unlock(false); setOn(!on); return; }
  if (on && unlocked) {
    if (k === 'h') { say(whereText(), { kind: 'where', interrupt: true }); return; }
    if (k === 'n') { skip(); return; }
    if (k === '+' || k === '=') { setRate(rate + 0.1); return; }
    if (k === '-' || k === '_') { setRate(rate - 0.1); return; }
    if (k === 't') { setView(!viewOn); return; }
  }
  unlock();          // first key press: the intro plays (if the guide is on)
}
// Keys pressed while the globe (inside the game) has the keyboard: ours work, and Space still reaches the camera page.
function onGlobeKey(e) {
  onKey(e);
  if (e.code === 'Space' && camWin) { e.preventDefault(); camWin.dispatchEvent(new camWin.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); }
}

for (const b of [btn, skipBtn]) b.addEventListener('mousedown', e => e.preventDefault());      // keep the keyboard in the game
btn.addEventListener('click', () => { unlock(false); setOn(!on); frame.contentWindow?.focus(); });
skipBtn.addEventListener('click', () => { unlock(false); skip(); frame.contentWindow?.focus(); });
window.addEventListener('keydown', e => {
  onKey(e);
  // Keys pressed while this outer page has focus go on to the game, so Space still locks in.
  if (!OUR_KEYS.includes(e.key.toLowerCase()) && camWin) {
    camWin.dispatchEvent(new camWin.KeyboardEvent('keydown', { key: e.key, code: e.code, bubbles: true }));
    if (e.code === 'Space') e.preventDefault();
  }
  frame.contentWindow?.focus();
});
window.addEventListener('pointerdown', () => unlock(), true);

// Start on if asked in the address (?audio=1) or if it was on last time. Sound starts at the first click or key.
setOn(params.get('audio') === '1' || (params.get('audio') !== '0' && store.get('on', '0') === '1'));
