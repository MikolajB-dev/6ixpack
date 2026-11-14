/*
  Bindrune sound guide: an add-on so a blind visitor can play the whole game by ear.
  ------------------------------------------------------------------------------
  It changes NOTHING in rune-vision/. It only:
    - listens to the same 'rune-board' events the globe listens to,
    - runs its own copy of the game rules (quest.js, story.js) so it always knows the riddle, question and answers,
    - reads the globe's story card now and then, to stay in step with what the globe shows,
    - looks at the camera picture the camera page already has, to tell how far the rune is from its place.
  It never changes the camera page's settings (colours, circles, sliders).

  The order of the journey: Jelling first, then Yorba Linda, then Tokyo (story.js). Each place opens only when the one
  before is locked with the right answer. Which rune belongs where comes from the camera page (step 3 there).

  What the visitor hears (when the guide is on):
    - after the globe's intro film: what the game is about, the places from left to right, the keys
    - the riddle, the question and the 4 answers, read out loud, one message at a time
    - how to turn the rune (dot up = A, right = B, down = C, left = D) and which answer it points at
    - while the right rune is moved: beeps that get faster as it gets closer to its place, from the side the place is on,
      and now and then "move it up and to the left, close"
    - a sound and a sentence for every result: wrong rune, right rune, wrong answer (with the clue), right answer
    - if a hand hides the rune from the camera: "let go so the camera can see it"

  Keys (in the game window): V = guide on/off, H = hear where you are again, Space = lock in (the game's own key).
  Address options: ?audio=1 starts with the guide on.  ?flipx=1 / ?flipy=1 mirror left-right / up-down
  (use them if the camera is turned, so "left" in the picture is not the visitor's left).
*/
import { Quest } from '../rune-vision/globe/quest.js';
import { STORY } from '../rune-vision/globe/story.js';
import { PLACES, SERPENT } from '../rune-vision/globe/settings.js';

const params = new URLSearchParams(location.search);
const FLIP_X = params.get('flipx') === '1';
const FLIP_Y = params.get('flipy') === '1';
const LETTERS = ['A', 'B', 'C', 'D'];
const DOT = ['dot up', 'dot right', 'dot down', 'dot left'];

const frame = document.getElementById('game');
const btn = document.getElementById('guideBtn');
const captionEl = document.getElementById('caption');

/* ===================== 1. Speech: one message at a time ===================== */

let on = false;          // guide switched on
let unlocked = false;    // browsers only allow sound after the first click or key press
let ctx = null;          // Web Audio, for the beeps

function caption(text) { captionEl.textContent = text; }

// Rune letters in the story texts, as a voice should say them ("ᚼ (H)" becomes "H", "ᛒ" becomes "B").
const RUNE_SOUNDS = { 'ᚼ': 'H', 'ᛒ': 'B', 'ᛏ': 'T', 'ᚢ': 'U', 'ᚠ': 'F', 'ᚱ': 'R', 'ᚾ': 'N', 'ᛖ': 'E' };
const speakable = text => text
  .replace(/[ᚠ-᛿]\s*\(([A-Z])\)/g, '$1')
  .replace(/[ᚠ-᛿]/g, ch => RUNE_SOUNDS[ch] || '');

// The queue. Each message has a kind:
//   intro, riddle, question, resume, where   (what the game is about / where you are; only the newest one matters)
//   result   (right/wrong), knob (the answer the rune points at), lost (can't see the rune), guide (directions), info
const queue = [];
let current = null;       // the message being spoken now
let gapUntil = 0;         // a short pause between messages
let filmUntil = 0;        // the globe's intro film is playing: wait with talking until then
const STATE_KINDS = ['riddle', 'question', 'resume', 'where'];

function say(text, { kind = 'info', interrupt = false, tag = null } = {}) {
  if (!on) return;
  if (kind === 'guide' && (current || queue.length)) return;              // directions only when it's quiet
  if (STATE_KINDS.includes(kind)) dropQueued(m => STATE_KINDS.includes(m.kind)); // an older riddle/question is out of date
  if (kind === 'knob') { dropQueued(m => m.kind === 'knob'); if (current?.kind === 'knob') stopCurrent(); }
  if (interrupt) { queue.length = 0; stopCurrent(); }
  queue.push({ text, kind, tag });
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

// Start the next message when the voice is free (called from say() and every 100 ms).
function pump() {
  if (!queue.length || current) return;
  if (!unlocked) { caption(queue[queue.length - 1].text); return; }
  const now = performance.now();
  if (now < filmUntil || now < gapUntil) return;
  const item = queue.shift();
  current = item;
  caption(item.text);
  const done = () => {
    if (current !== item) return;
    clearTimeout(item.watchdog);
    current = null;
    gapUntil = performance.now() + 400;
  };
  // Chrome sometimes forgets to say "finished": move on anyway after a generous time.
  item.watchdog = setTimeout(done, item.text.length * 95 + 4000);
  try {
    // Long texts are split into sentences (Chrome stops very long utterances).
    const parts = speakable(item.text).split(/(?<=[.!?])\s+/).filter(Boolean);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = 'en-GB';
      u.rate = 0.95;
      if (i === parts.length - 1) { u.onend = done; u.onerror = done; }
      speechSynthesis.speak(u);
    });
  } catch (e) { done(); }
}
setInterval(pump, 100);

/* ===================== 2. Sounds ===================== */

// One short tone. at = seconds from now, pan -1 (left) .. 1 (right), slide = change of pitch over the tone.
function tone(freq, at, dur, { type = 'sine', gain = 0.15, pan = 0, slide = 0 } = {}) {
  if (!on || !ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
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
  tick:   () => tone(1600, 0, 0.03, { type: 'square', gain: 0.04 }),
  lost:   () => tone(660, 0, 0.25, { gain: 0.07, slide: -260 }),
  found:  () => { tone(500, 0, 0.1, { gain: 0.07 }); tone(750, 0.11, 0.14, { gain: 0.07 }); },
  lock:   () => tone(900, 0, 0.05, { type: 'square', gain: 0.05 }),
  beep:   (freq, pan) => tone(freq, 0, 0.07, { type: 'sine', gain: 0.07, pan }),
  ding:   pan => { tone(1320, 0, 0.5, { type: 'triangle', gain: 0.1, pan }); tone(1980, 0.05, 0.45, { type: 'sine', gain: 0.05, pan }); },
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
      get cfg(){ return cfg; }, get state(){ return state; }, get source(){ return source; }, get gains(){ return lastGains; },
      SLOTS, rgb2hsv, matchesRune, applyGains
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
    try { gv.contentWindow.addEventListener('intro:done', () => { filmUntil = 0; }); } catch (e) { filmUntil = 0; }
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
const targetRune = () => (quest.current ? runeFor(quest.current.slot) : -1);

// What the globe's story card shows now: { step, phase } or null if the globe isn't open.
function readGlobe() {
  try {
    const doc = camWin?.document.getElementById('globeView')?.contentDocument;
    const stepText = doc?.getElementById('panel-step')?.textContent || '';
    if (/journey is complete/i.test(stepText)) return { step: STORY.length, phase: 'finished' };
    const m = stepText.match(/Stone (\d+) of/);
    if (!m) return null;
    const answers = doc.getElementById('panel-answers').children.length;
    const right = doc.getElementById('panel-feedback').className === 'right';
    return { step: +m[1] - 1, phase: answers ? (right ? 'solved' : 'question') : 'riddle' };
  } catch (e) { return null; }
}

/* ===================== 4. The game rules (our own copy, same as the globe) ===================== */

let quest = new Quest();
let nextTimer = null;
function restartQuest() {
  quest = new Quest();
  clearTimeout(nextTimer); nextTimer = null;
  for (const l of lost.values()) l.timers.forEach(clearTimeout);
  lost.clear();
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

// Runes that disappeared from the place in play. A hand over the rune looks the same to the camera as taking it off,
// so we wait before believing it. slot id -> { rune, wasQuestion, step, spoke, timers }
const lost = new Map();
const LOST_SAY_MS = 2500;      // say "can't see it" only after this (short flickers stay silent)
const LOST_GIVE_UP_MS = 9000;  // after this it really was taken off
let lastLostSaid = 0;          // "can't see it" at most once every 6 s
let resume = null;             // { slot, step, spoke }: the rune came back, so the question just continues
const pendingOther = new Map();// slot -> timer: a rune on a place that is not in play (said only if it stays 1.5 s)

function onState(slots) {
  const prev = quest.slots || [];
  const before = snap();
  quest.onState(slots);
  // Board empty after stone 1 = everything was taken off (the locked stones too): a real restart.
  // At stone 1 an empty board can also be a hand over the only rune, so then we wait like for any lost rune.
  const restart = slots.every(s => !s.rune) && before.step > 0;
  if (restart) { for (const l of lost.values()) l.timers.forEach(clearTimeout); lost.clear(); newStep(); }
  else for (const s of slots) {
    const p = prev.find(x => x.slot === s.slot) || {};
    if (p.rune && !s.rune) runeGone(s.slot, p.rune, before);
    if (s.rune && p.rune !== s.rune) runeCame(s.slot, s.rune);
  }
  afterChange(before, 'state');
}

function runeGone(slot, rune, before) {
  if (quest.locked.includes(slot)) return;                       // locked stones stay locked: never talk about them
  const inPlay = STORY[before.step]?.slot === slot;
  if (!inPlay) return;                                           // other places: nothing to say
  const wasQuestion = before.phase === 'question';
  const entry = { rune, wasQuestion, step: before.step, spoke: false, timers: [] };
  lost.set(slot, entry);
  entry.timers.push(setTimeout(() => {
    if (lost.get(slot) !== entry || !wasQuestion) return;
    if (performance.now() - lastLostSaid < 6000) return;
    lastLostSaid = performance.now();
    entry.spoke = true;
    cue.lost();
    say(`I can't see the rune on ${placeName(slot)}. If your hand is on it, let go so the camera can see it.`, { kind: 'lost', tag: slot });
  }, LOST_SAY_MS));
  entry.timers.push(setTimeout(() => {
    if (lost.get(slot) !== entry) return;
    lost.delete(slot);
    if (quest.phase !== 'riddle' || quest.step !== entry.step) return;
    say(`The ${rune} was taken off ${placeName(slot)}. ` + riddleText(), { kind: 'riddle' });
  }, LOST_GIVE_UP_MS));
}

function runeCame(slot, rune) {
  const l = lost.get(slot);
  if (l) {
    l.timers.forEach(clearTimeout);
    lost.delete(slot);
    dropQueued(m => m.kind === 'lost' && m.tag === slot);
    if (l.rune === rune) {
      if (l.wasQuestion) resume = { slot, step: l.step, spoke: l.spoke };
      if (l.spoke) { cue.found(); say('I can see it again.', { kind: 'info' }); }
      return;
    }
  }
  // A rune on a place that is not in play. Wait 1.5 s: the camera sometimes sees a rune for a moment that isn't there.
  if (slot === quest.current?.slot || quest.locked.includes(slot) || quest.phase === 'finished') return;
  clearTimeout(pendingOther.get(slot));
  pendingOther.set(slot, setTimeout(() => {
    pendingOther.delete(slot);
    if (quest.slot(slot).rune !== rune || slot === quest.current?.slot || quest.locked.includes(slot)) return;
    cue.wrong();
    say(`${placeName(slot)} is not open yet. Take the ${rune} off and listen to the riddle again with H.`, { kind: 'result' });
  }, 1500));
}

// Knob: a tick at once, the answer in words only when the rune has stayed on that letter for a moment.
let knobTimer = null, lastKnobSaid = null;
function onRotate(msg) {
  const s = quest.slot(msg.slot);
  if (!s.slot) return;
  const old = s.choice;
  s.choice = 'ABCD'[msg.step] || null;
  if (quest.phase !== 'question' || msg.slot !== quest.current.slot || !s.choice || s.choice === old) return;
  cue.tick();
  knobWarned = false;
  clearTimeout(knobTimer);
  knobTimer = setTimeout(() => {
    const c = quest.slot(quest.current.slot).choice;
    if (quest.phase !== 'question' || !c || c === lastKnobSaid) return;
    lastKnobSaid = c;
    say(`${c}: ${quest.current.answers[LETTERS.indexOf(c)]}`, { kind: 'knob' });
  }, 550);
}

// Decide what to say after the rules changed something.
function afterChange(before, why) {
  const a = snap();
  scheduleNext();
  if (a.phase !== before.phase || a.step !== before.step) {
    lastSaid.fb = a.fbText;
    if (a.step !== before.step) newStep();
    if (a.phase === 'question') {
      const r = resume; resume = null;
      lastKnobSaid = quest.slot(quest.current.slot).choice || null;
      if (r && r.slot === quest.current.slot && r.step === a.step) {
        // The rune was only hidden for a moment. Say something only if we told the visitor we lost it.
        if (r.spoke) say('The question continues. ' + choiceText() + ' Press Space to lock in, or H to hear the question again.', { kind: 'resume' });
      } else if (why !== 'sync') {
        cue.right();
        say(`The ${quest.current.slot === 'jelling' ? 'home ' : ''}stone at ${placeName(quest.current.slot)} rises. ` + questionText(), { kind: 'question' });
      }
      knobWarned = false; knobMissingSince = 0;
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
        say('All runes are off the map. The journey starts again. ' + riddleText(), { kind: 'riddle', interrupt: true });
      } else say(riddleText(), { kind: 'riddle' });
    } else if (a.phase === 'solved') {
      cue.solved();
      say(a.fbText + (quest.locked.length >= 2
        ? ` Jörmungandr slithers from Jelling to ${placeName(quest.locked[quest.locked.length - 1])} and coils around the stone.` : ''), { kind: 'result' });
    } else if (a.phase === 'finished') {
      cue.solved();
      say('The journey is complete. All runestones are bound together. Jörmungandr encircles the world! Take all runes off the map to start again.', { kind: 'result' });
    }
    return;
  }
  // Same step: new feedback? (A lock always counts, even with the same text: the visitor pressed Space again.)
  const changed = why === 'lock' ? a.fb !== before.fb : a.fbText !== lastSaid.fb;
  if (changed && a.fb) {
    lastSaid.fb = a.fbText;
    if (a.fb.type === 'wrong') { cue.wrong(); say(`That rune does not belong on ${placeName(quest.current.slot)}. Take it off and try another rune.`, { kind: 'result' }); }
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
  return c ? `The rune points at ${c}: ${quest.current.answers[LETTERS.indexOf(c)]}.` : "I can't see which way the rune points yet.";
}
function questionText() {
  const s = quest.current;
  const answers = s.answers.map((t, i) => `${LETTERS[i]}, ${DOT[i]}: ${t}.`).join(' ');
  return `Question: ${s.question} ${answers} Turn the rune to choose. Each quarter turn clockwise goes to the next answer. ` +
         `${choiceText()} Press Space to lock in.`;
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
  if (quest.phase === 'finished') return { text: 'The journey is complete. Take all runes off the map to start again.', kind: 'where' };
  if (quest.phase === 'solved') return { text: 'Right answer. Jörmungandr is on his way. The next riddle comes in a moment.', kind: 'where' };
  if (quest.phase === 'question') return { text: questionText(), kind: 'question' };
  return { text: riddleText(), kind: 'riddle' };
}
function whereText() { return situation().text + ' ' + boardText(); }
function intro() {
  say('Sound guide on. Bindrune is a journey to three places on the map: Jelling, Yorba Linda and Tokyo. ' + boardOrder() +
      ' The places open one after the other: first Jelling, then Yorba Linda, then Tokyo. ' +
      'Listen to the riddle and put a rune on the place it means. While you move the right rune, beeps get faster as you get closer, ' +
      'and they come from the side the place is on. Then answer a question by turning the rune. ' +
      'Press Space to lock in an answer, H to hear where you are, and V to turn the sound guide off.', { kind: 'intro', interrupt: true });
  const s = situation();
  say(s.text, { kind: s.kind });
}

/* ===================== 7. "How far is it?" from the camera picture ===================== */
/*
  We look at the same camera picture as the camera page (a small copy, read only).
  To find a rune that is being moved, and not the map:
    - only the colour of the rune whose turn it is drives the beeps
    - colour that never moves (map ink, a card lying around, a shadow) is learned as "background" and ignored.
      This is relearned all the time, so it follows changes in the light. A rune that lies still long enough
      becomes background too, and comes back as soon as it is moved.
    - a rune is one patch of its colour, about the size of a rune (the black dot may make a hole in it)
    - it must be seen in 3 of the last 5 pictures, and its position is smoothed, so jitter is not "moving"
*/
const GW = 160;                     // width of our small copy of the picture
const BG_ON = 55;                   // pictures in a row (~7 s) before still colour counts as background
const gcv = document.createElement('canvas'), gx = gcv.getContext('2d', { willReadFrequently: true });
let GH = 0, bg = [];                // bg[rune] = Uint8Array: how long each pixel has looked like that rune
const track = {};                   // rune index -> { x, y, hist, visible, seen, moved, ax, ay, box }
let knobWarned = false, knobMissingSince = 0, lastKnobWarn = 0;
const stepFlags = { had: false, notTurn: new Set(), lostSaid: 0, onSpot: false, band: -1, dirs: '', wordsT: 0, lastBeep: 0 };
function newStep() {
  stepFlags.had = false; stepFlags.notTurn.clear(); stepFlags.onSpot = false;
  stepFlags.band = -1; stepFlags.dirs = ''; stepFlags.wordsT = 0;
}

// Stricter than the camera page: a rune colour must also be clearly coloured (skin and old paper are dull).
function strictMatch(h, s, v, r) {
  return cam.matchesRune(h, s, v, r) && s >= Math.max(0.42, r.s * 0.72) && v >= Math.max(0.18, r.v * 0.5);
}

function grab() {
  const src = cam.source;
  const sw = src?.videoWidth || src?.naturalWidth, sh = src?.videoHeight || src?.naturalHeight;
  if (!sw || !sh) return null;
  const gh = Math.round(GW * sh / sw);
  if (gcv.width !== GW || gcv.height !== gh) { gcv.width = GW; gcv.height = gh; }
  if (GH !== gh) { GH = gh; bg = []; }
  gx.drawImage(src, 0, 0, GW, gh);
  return cam.applyGains(gx.getImageData(0, 0, GW, gh).data, cam.gains);
}

// Find each loose rune in the picture. Returns rune index -> list of rune-shaped patches { x, y (0..1), dot, box, score }.
function findRunes(d) {
  const runes = cam.cfg.runes, n = GW * GH, placed = cam.state.committed;
  const c0 = cam.cfg.circles[0], R = (c0.prof ? Math.max(...c0.prof) : c0.r) * GW;   // place radius in our pixels
  const zoneArea = Math.PI * R * R;
  const minA = Math.max(6, zoneArea * 0.08), maxA = zoneArea * 2.2;
  const hsv = new Float32Array(n * 3);
  for (let p = 0; p < n; p++) { const k = p * 4, c = cam.rgb2hsv(d[k], d[k + 1], d[k + 2]); hsv[p * 3] = c[0]; hsv[p * 3 + 1] = c[1]; hsv[p * 3 + 2] = c[2]; }

  const out = [];
  for (let r = 0; r < runes.length; r++) {
    if (!bg[r]) bg[r] = new Uint8Array(n);
    const B = bg[r], t = track[r], keep = t && t.visible && t.box;   // don't learn the rune itself as background
    const mask = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      const m = strictMatch(hsv[p * 3], hsv[p * 3 + 1], hsv[p * 3 + 2], runes[r]);
      const x = p % GW, y = (p / GW) | 0;
      const inRune = keep && x >= keep[0] && x <= keep[2] && y >= keep[1] && y <= keep[3];
      if (m) { if (!inRune && B[p] < 255) B[p]++; }
      else B[p] = B[p] > 6 ? B[p] - 6 : 0;
      if (m && B[p] < BG_ON) mask[p] = 1;
    }
    if (placed.includes(r)) { out[r] = []; continue; }             // already on a place: the camera page handles it
    out[r] = blobs(mask, hsv, runes[r], minA, maxA);
  }
  return out;
}

// All rune-shaped patches in a mask (connected pixels). A patch with a dark dot inside scores higher.
function blobs(mask, hsv, rune, minA, maxA) {
  const seen = new Uint8Array(mask.length), stack = [], list = [];
  for (let p0 = 0; p0 < mask.length; p0++) {
    if (!mask[p0] || seen[p0]) continue;
    let a = 0, sx = 0, sy = 0, x0 = GW, y0 = GH, x1 = 0, y1 = 0;
    stack.push(p0); seen[p0] = 1;
    while (stack.length) {
      const p = stack.pop(), x = p % GW, y = (p / GW) | 0;
      a++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [p - 1, p + 1, p - GW, p + GW]) {
        if (q < 0 || q >= mask.length || seen[q] || !mask[q]) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === GW - 1)) continue;
        seen[q] = 1; stack.push(q);
      }
    }
    if (a < minA || a > maxA) continue;
    const boxA = (x1 - x0 + 1) * (y1 - y0 + 1);
    if (a / boxA < 0.3) continue;                                  // too stringy to be a rune
    // the dot: dark pixels inside the patch's box that are not the rune colour
    let dark = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = y * GW + x;
      if (!mask[p] && hsv[p * 3 + 2] < Math.min(0.42, rune.v * 0.6)) dark++;
    }
    list.push({ x: sx / a / GW, y: sy / a / GH, dot: dark >= 1, box: [x0 - 2, y0 - 2, x1 + 2, y1 + 2], score: a * (dark >= 1 ? 1.6 : 1) });
  }
  return list;
}

// Which patch is the rune? 1) one that moved since the last picture (a still patch is map or clutter),
// 2) else the one closest to where we were following the rune, 3) else the best-scoring one.
const lastBlobs = {};
function pickBlob(r, list, t) {
  const prev = lastBlobs[r] || [];
  lastBlobs[r] = list;
  if (!list.length) return null;
  const motion = b => prev.length ? Math.min(...prev.map(p => Math.hypot(b.x - p.x, b.y - p.y))) : 0;
  let best = null, bm = 0.015;
  for (const b of list) { const m = motion(b); if (m > bm && m < 0.3) { bm = m; best = b; } }
  if (best) return best;
  if (t && t.known && Date.now() - (t.lastPick || 0) < 3000) {
    return list.reduce((a, b) => Math.hypot(b.x - t.x, b.y - t.y) < Math.hypot(a.x - t.x, a.y - t.y) ? b : a);
  }
  return list.reduce((a, b) => (b.score > a.score ? b : a));
}

// Update what we know about each rune from this picture.
function updateTracks(found, now) {
  found.forEach((list, r) => {
    const t = track[r] || (track[r] = { x: 0, y: 0, hist: [], visible: false, seen: 0, moved: 0, ax: 0, ay: 0, box: null });
    const f = pickBlob(r, list, t);
    if (f) t.lastPick = Date.now();
    t.hist.push(!!f); if (t.hist.length > 5) t.hist.shift();
    const steady = t.hist.filter(Boolean).length >= 3;
    if (f) {
      const jump = Math.hypot(f.x - t.x, f.y - t.y) > 0.08;              // switched to another patch: no smoothing
      if (!t.visible || jump) { t.x = f.x; t.y = f.y; if (!t.visible) { t.ax = f.x; t.ay = f.y; } }
      else { t.x += (f.x - t.x) * 0.6; t.y += (f.y - t.y) * 0.6; }      // smooth the position
      t.box = f.box; t.seen = now;
    }
    const was = t.visible;
    t.visible = steady && now - t.seen < 400;
    // "Moving" only when it really travels (not when a patch just appears and lies still, like the map at the start).
    // If it was seen before and comes back somewhere else (carried under a hand), that counts as moving.
    const far = Math.hypot(t.x - t.ax, (t.y - t.ay) * GH / GW) > 0.025;
    if (t.visible && (was || t.known) && far) t.moved = now;
    if (t.visible && (!was || far)) { t.ax = t.x; t.ay = t.y; t.known = true; }
  });
}

function guide() {
  if (!on || !unlocked || !cam || cam.state.sim || !quest.current || quest.phase === 'finished') return;
  const now = performance.now();

  // Question: is the knob dot visible? If not for a while, the hand is probably over it.
  if (quest.phase === 'question') {
    const i = slotIndex(quest.current.slot), r = i >= 0 ? cam.state.rot[i] : null;
    const missing = !r || r.lost > 12;
    if (!missing) { knobMissingSince = 0; knobWarned = false; }
    else if (!knobMissingSince) knobMissingSince = now;
    else if (!knobWarned && now - knobMissingSince > 3500 && now - lastKnobWarn > 10000 && !talking()) {
      knobWarned = true; lastKnobWarn = now;
      say("I can't see the dot on the rune. Let go of it for a moment so the camera can read it.", { kind: 'info' });
    }
    return;
  }

  const d = grab();
  if (!d) return;
  const found = findRunes(d);
  updateTracks(found, now);
  if (quest.phase !== 'riddle') return;

  // Other runes that are moved: say once per step that it's not their turn.
  const want = targetRune();
  for (const [k, t] of Object.entries(track)) {
    const r = +k;
    if (r === want || !t.visible || now - t.moved > 800 || stepFlags.notTurn.has(r) || cam.state.committed.includes(r)) continue;
    if (STORY.slice(0, quest.step).some(s => runeFor(s.slot) === r)) continue;     // a locked rune being moved: leave it
    stepFlags.notTurn.add(r);
    say(`That's the ${runeName(r)}. It's not its turn yet.`, { kind: 'info' });
  }

  if (want < 0 || cam.state.committed.includes(want)) return;
  const t = track[want];
  if (!t) return;

  if (!t.visible) {
    // Hidden (hand, or picked up). Remember where it was. Ask to put it down only if it was moving just before.
    if (t.seen && now - t.seen > 3000 && now - t.moved < 6000 && now - stepFlags.lostSaid > 10000 && !talking()) {
      stepFlags.lostSaid = now;
      cue.lost();
      say(`I can't see the ${runeName(want)}. Put it down on the map so I can see where it is.`, { kind: 'info' });
    }
    return;
  }
  if (now - t.moved > 1500) return;              // lying still: stay quiet
  if (!stepFlags.had) { stepFlags.had = true; say(`You have the ${runeName(want)}.`, { kind: 'info' }); }

  // Distance to its place, in "place sizes".
  const i = slotIndex(quest.current.slot), c = cam.cfg.circles[i];
  if (!c) return;
  const R = c.prof ? Math.max(...c.prof) : c.r;                        // radius as fraction of picture width
  const aspect = GH / GW;
  let dx = (c.x - t.x), dy = (c.y - t.y) * aspect;                     // both in "picture widths"
  if (FLIP_X) dx = -dx;
  if (FLIP_Y) dy = -dy;
  const dist = Math.hypot(dx, dy) / R;
  const pan = Math.max(-1, Math.min(1, dx / (R * 4)));

  // On the place: one clear ding, then quiet.
  if (dist < 1) {
    if (!stepFlags.onSpot) {
      stepFlags.onSpot = true;
      cue.ding(pan);
      say(`That's ${placeName(quest.current.slot)}. Let go of the rune.`, { kind: 'info' });
    }
    return;
  }
  if (dist > 1.4) stepFlags.onSpot = false;

  // Beeps: at most 4 a second, faster and higher when closer. Never while the voice is talking.
  const gap = Math.min(1000, 250 + dist * 60);
  if (!current && now - stepFlags.lastBeep > gap) {
    stepFlags.lastBeep = now;
    cue.beep(450 + Math.max(0, 700 - dist * 60), pan);
  }

  // Words: only when the distance band or the direction really changes, and at most every 3 s.
  const edges = [2.5, 5, 9];
  let band = edges.findIndex(e => dist < e); if (band < 0) band = edges.length;
  if (stepFlags.band >= 0 && band !== stepFlags.band) {
    const e = edges[Math.min(band, stepFlags.band)];
    if (Math.abs(dist - e) < e * 0.15) band = stepFlags.band;       // too close to the edge: keep the old band
  }
  const ax = Math.abs(dx), ay = Math.abs(dy), big = Math.max(ax, ay), dirs = [];
  if (ay >= 0.45 * big && ay > R * 0.6) dirs.push(dy < 0 ? 'up' : 'down');
  if (ax >= 0.45 * big && ax > R * 0.6) dirs.push(dx < 0 ? 'to the left' : 'to the right');
  const dirText = dirs.join(' and ') || 'a little';
  const changed = band !== stepFlags.band || dirText !== stepFlags.dirs;
  if ((changed && now - stepFlags.wordsT > 3000) || now - stepFlags.wordsT > 9000) {
    stepFlags.band = band; stepFlags.dirs = dirText; stepFlags.wordsT = now;
    say(`Move it ${dirText}, ${['very close', 'close', 'a fair way', 'far'][band]}.`, { kind: 'guide' });
  }
}
setInterval(guide, 120);
// For trying things in the browser console: runeGuide.track, runeGuide.quest, ...
window.runeGuide = { track, stepFlags, get quest() { return quest; }, get queue() { return queue; }, findRunes: () => { const d = cam && grab(); return d && findRunes(d); } };

/* ===================== 8. Switching the guide on and off ===================== */

function setOn(v) {
  on = v;
  try { localStorage.setItem('runeAudio.on', v ? '1' : '0'); } catch (e) {}
  btn.textContent = `Sound guide: ${v ? 'on' : 'off'} (V)`;
  btn.setAttribute('aria-pressed', String(v));
  captionEl.classList.toggle('show', v);
  if (v && unlocked) intro();
  else if (v) caption('Sound guide on. Press any key or click to start the sound.');
  else { queue.length = 0; stopCurrent(); caption(''); }
}

function onKey(e) {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if (k === 'v') { unlock(false); setOn(!on); return; }
  if (unlocked && k === 'h' && on) { say(whereText(), { kind: 'where', interrupt: true }); return; }
  unlock();          // first key press: the intro plays (if the guide is on)
}

btn.addEventListener('mousedown', e => e.preventDefault());      // keep the keyboard in the game
btn.addEventListener('click', () => { unlock(false); setOn(!on); frame.contentWindow?.focus(); });
window.addEventListener('keydown', e => {
  onKey(e);
  // Keys pressed while this outer page has focus go on to the game, so Space still locks in.
  if (e.key.toLowerCase() !== 'v' && e.key.toLowerCase() !== 'h' && camWin) {
    camWin.dispatchEvent(new camWin.KeyboardEvent('keydown', { key: e.key, code: e.code, bubbles: true }));
    if (e.code === 'Space') e.preventDefault();
  }
  frame.contentWindow?.focus();
});
window.addEventListener('pointerdown', () => unlock(), true);

// Start on if asked in the address (?audio=1) or if it was on last time. Sound starts at the first click or key.
setOn(params.get('audio') === '1' || (params.get('audio') !== '0' && localStorage.getItem('runeAudio.on') === '1'));
