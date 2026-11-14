/*
  Bindrune sound guide: an add-on so a blind visitor can play the whole game by ear.
  ------------------------------------------------------------------------------
  It changes NOTHING in rune-vision/. It only:
    - listens to the same 'rune-board' events the globe listens to,
    - runs its own copy of the game rules (quest.js, story.js) so it always knows the riddle, question and answers,
    - looks at the camera picture the camera page already has, to tell how far a rune is from its place.

  What the visitor hears (when the guide is on):
    - the riddle, the question and the 4 answers, read out loud
    - how to turn the rune (dot up = A, right = B, down = C, left = D) and which answer it points at now
    - while a rune is moved: beeps that get faster when it gets closer to the right place,
      coming from the left or right speaker (the side the place is on), plus spoken "up and to the left, close"
    - a sound and a sentence for every result: wrong rune, right rune, wrong answer (with the clue), right answer
    - if a hand hides the rune from the camera: "let go so the camera can see it", and the game picks up where it was

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

/* ===================== 1. Speech and sounds ===================== */

let on = false;          // guide switched on
let unlocked = false;    // browsers only allow sound after the first click or key press
let ctx = null;          // Web Audio, for the beeps

function caption(text) { captionEl.textContent = text; }

// Speak a text. Long texts are split into sentences (Chrome stops very long utterances).
// interrupt: stop what is being said now (used for quick updates like the knob answer).
// Rune letters in the story texts, as a voice should say them ("ᚼ (H)" becomes "H", "ᛒ" becomes "B").
const RUNE_SOUNDS = { 'ᚼ': 'H', 'ᛒ': 'B', 'ᛏ': 'T', 'ᚢ': 'U', 'ᚠ': 'F', 'ᚱ': 'R', 'ᚾ': 'N', 'ᛖ': 'E' };
const speakable = text => text
  .replace(/[ᚠ-᛿]\s*\(([A-Z])\)/g, '$1')
  .replace(/[ᚠ-᛿]/g, ch => RUNE_SOUNDS[ch] || '');

function say(text, { interrupt = false } = {}) {
  if (!on) return;
  caption(text);
  if (!unlocked) return;
  try {
    if (interrupt) speechSynthesis.cancel();
    for (const part of speakable(text).split(/(?<=[.!?])\s+/)) {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = 'en-GB';
      u.rate = 0.95;
      speechSynthesis.speak(u);
    }
  } catch (e) { /* no speech in this browser */ }
}
const talking = () => { try { return speechSynthesis.speaking; } catch (e) { return false; } };

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
  tick:   () => tone(1600, 0, 0.03, { type: 'square', gain: 0.05 }),
  lost:   () => tone(660, 0, 0.25, { gain: 0.08, slide: -260 }),
  found:  () => { tone(500, 0, 0.1, { gain: 0.08 }); tone(750, 0.11, 0.14, { gain: 0.08 }); },
  lock:   () => tone(900, 0, 0.05, { type: 'square', gain: 0.05 }),
  beep:   (freq, pan) => tone(freq, 0, 0.06, { type: 'square', gain: 0.045, pan }),
};

// Called on the first click or key press: from then on the browser lets us make sound.
function unlock(playIntro = true) {
  if (unlocked) return;
  unlocked = true;
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); } catch (e) { ctx = null; }
  if (on && playIntro) intro();
}

/* ===================== 2. The camera page (read only) ===================== */

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
  // When the globe view opens it starts its journey from the beginning: so do we, to stay in step with it.
  camWin.document.getElementById('globeView')?.addEventListener('load', restartQuest);
  frame.focus();
}
frame.addEventListener('load', hookCamera);
if (frame.contentDocument?.readyState === 'complete' && frame.contentWindow.location.href !== 'about:blank') hookCamera();

const slotIndex = id => (cam ? cam.SLOTS.findIndex(s => s.id === id) : -1);
const placeName = id => PLACES[id]?.name || id;

/* ===================== 3. The game rules (our own copy, same as the globe) ===================== */

let quest = new Quest();
let nextTimer = null;
function restartQuest() {
  quest = new Quest();
  clearTimeout(nextTimer); nextTimer = null;
  lost.clear();
  lastSaid.fb = '';
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

const snap = () => ({ step: quest.step, phase: quest.phase, fb: quest.feedback, fbText: quest.feedback?.text || '' });
const lastSaid = { fb: '' };

/* ===================== 4. Events from Rune Vision ===================== */

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

// Runes that disappeared from a place. A hand over the rune looks the same to the camera as taking it off,
// so we wait a moment before believing it. slot id -> { rune, t, wasQuestion, step, spoke, timers }
const lost = new Map();
const LOST_SAY_MS = 900;     // say "can't see it" after this
const LOST_GIVE_UP_MS = 8000; // after this it really was taken off
let resume = null;           // { slot, step }: the rune came back, so the question just continues

function onState(slots) {
  const prev = quest.slots || [];
  const before = snap();
  quest.onState(slots);
  // Board empty after stone 1 = everything was taken off (the locked stones too): a real restart.
  // At stone 1 an empty board can also be a hand over the only rune, so then we wait like for any lost rune.
  const restart = slots.every(s => !s.rune) && before.step > 0;
  if (restart) { for (const l of lost.values()) l.timers.forEach(clearTimeout); lost.clear(); }
  else for (const s of slots) {
    const p = prev.find(x => x.slot === s.slot) || {};
    if (p.rune && !s.rune) runeGone(s.slot, p.rune, before);
    if (s.rune && p.rune !== s.rune) runeCame(s.slot, s.rune);
  }
  afterChange(before, 'state');
}

function runeGone(slot, rune, before) {
  const wasQuestion = before.phase === 'question' && STORY[before.step]?.slot === slot;
  const entry = { rune, t: performance.now(), wasQuestion, step: before.step, spoke: false, timers: [] };
  lost.set(slot, entry);
  entry.timers.push(setTimeout(() => {
    if (lost.get(slot) !== entry) return;
    entry.spoke = true;
    cue.lost();
    if (wasQuestion) say(`I can't see the rune on ${placeName(slot)}. If your hand is on it, let go so the camera can see it.`);
    else say(`The ${rune} is off ${placeName(slot)}.`);
  }, LOST_SAY_MS));
  if (wasQuestion) entry.timers.push(setTimeout(() => {
    if (lost.get(slot) !== entry) return;
    lost.delete(slot);
    say(`The ${rune} was taken off ${placeName(slot)}. Back to the riddle.`);
    if (quest.phase === 'riddle') say(riddleText());
  }, LOST_GIVE_UP_MS));
}

function runeCame(slot, rune) {
  const l = lost.get(slot);
  if (l) {
    l.timers.forEach(clearTimeout);
    lost.delete(slot);
    if (l.rune === rune) {
      if (l.wasQuestion) resume = { slot, step: l.step };
      if (l.spoke) { cue.found(); say('I can see it again.'); }
      return;
    }
  }
  // A rune put on a place the riddle is not about: the globe shows nothing, so tell the visitor.
  if ((quest.phase === 'riddle' || quest.phase === 'question') && slot !== quest.current?.slot && !quest.locked.includes(slot)) {
    say(`You put the ${rune} on ${placeName(slot)}. Nothing happens there.`);
  }
}

function onRotate(msg) {
  const s = quest.slot(msg.slot);
  if (!s.slot) return;
  const old = s.choice;
  s.choice = 'ABCD'[msg.step] || null;
  if (quest.phase === 'question' && msg.slot === quest.current.slot && s.choice && s.choice !== old) {
    cue.tick();
    say(`${s.choice}: ${quest.current.answers[LETTERS.indexOf(s.choice)]}`, { interrupt: true });
    knobWarned = false;
  }
}

// Decide what to say after the rules changed something.
function afterChange(before, why) {
  const a = snap();
  scheduleNext();
  if (a.phase !== before.phase || a.step !== before.step) {
    lastSaid.fb = a.fbText;
    if (a.phase === 'question') {
      const isResume = resume && resume.slot === quest.current.slot && resume.step === a.step;
      resume = null;
      if (isResume) say('The question continues. ' + choiceText() + ' Press Space to lock in, or H to hear the question again.');
      else { cue.right(); say(`The ${quest.current.slot === 'jelling' ? 'home ' : ''}stone at ${placeName(quest.current.slot)} rises. ` + questionText()); }
      knobWarned = false; knobMissingSince = 0;
    } else if (a.phase === 'riddle') {
      if (before.phase === 'question' && a.step === before.step) {
        // The rune left the place during the question: the lost-rune timers decide what to say.
        // But if another rune now sits there, it was swapped: say so straight away.
        const s = quest.slot(quest.current.slot);
        if (!lost.has(quest.current.slot) && s.rune && !s.correct) {
          cue.wrong();
          say(`The stone sinks. The ${s.rune} does not belong on ${placeName(s.slot)}. Take it off and try another rune.`);
          lastSaid.fb = 'The stone stays silent. That rune does not belong here.';   // don't say it twice on the next update
        }
      } else if (why === 'state' && a.step === 0 && quest.slots.every(s => !s.rune)) {
        say('All runes are off the map. The journey starts again. ' + riddleText(), { interrupt: true });
      } else say(riddleText());
    } else if (a.phase === 'solved') {
      cue.solved();
      say(a.fbText);
      if (quest.locked.length >= 2) say(`Jörmungandr slithers from Jelling to ${placeName(quest.locked[quest.locked.length - 1])} and coils around the stone.`);
    } else if (a.phase === 'finished') {
      cue.solved();
      say('The journey is complete. All runestones are bound together. Jörmungandr encircles the world! Take all runes off the map to start again.');
    }
    return;
  }
  // Same step: new feedback? (A lock always counts, even with the same text: the visitor pressed Space again.)
  const changed = why === 'lock' ? a.fb !== before.fb : a.fbText !== lastSaid.fb;
  if (changed && a.fb) {
    lastSaid.fb = a.fbText;
    if (a.fb.type === 'wrong') { cue.wrong(); say(a.fbText + ' Take it off and try another rune.'); }
    else if (a.fb.type === 'clue') { cue.clue(); say(a.fbText + ' Turn the rune to another answer and press Space again.'); }
    else if (a.fb.type === 'info' && a.fbText.includes('dot')) say("I can't see the black dot on the rune. Let go of the rune so the camera can see it, then press Space again.");
    else say(a.fbText);
  } else if (!a.fb) lastSaid.fb = '';
}

/* ===================== 5. Texts ===================== */

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
  const on = (quest.slots || []).filter(s => s.rune).map(s => `the ${s.rune} on ${placeName(s.slot)}${quest.locked.includes(s.slot) ? ', done' : ''}`);
  return on.length ? `On the map: ${on.join('; ')}.` : 'No runes on the map yet.';
}
function boardOrder() {
  if (!cam) return '';
  const order = cam.SLOTS.map((s, i) => ({ name: s.name, x: cam.cfg.circles[i].x })).sort((a, b) => FLIP_X ? b.x - a.x : a.x - b.x);
  return `From left to right the places are ${order.map(o => o.name).join(', ')}.`;
}
// Everything about "where am I", for the H key.
function whereText() {
  if (quest.phase === 'finished') return 'The journey is complete. Take all runes off the map to start again.';
  if (quest.phase === 'solved') return 'Right answer. Jörmungandr is on his way. The next riddle comes in a moment.';
  if (quest.phase === 'question') return questionText() + ' ' + boardText();
  return riddleText() + ' ' + boardText();
}
function intro() {
  say('Sound guide on. Bindrune is a journey to three places on the map: Jelling, Yorba Linda and Tokyo. ' + boardOrder() +
      ' Listen to the riddle and put a rune on the place it means. While you move a rune, beeps get faster as you get closer, ' +
      'and they come from the side the place is on. Then answer a question by turning the rune. ' +
      'Press Space to lock in an answer, H to hear where you are, and V to turn the sound guide off. ' + whereText(), { interrupt: true });
}

/* ===================== 6. "How far is it?" from the camera picture ===================== */

// We look at the same camera picture as the camera page (small copy, read only) and find the colour of each loose rune.
const GW = 160;
const gcv = document.createElement('canvas'), gx = gcv.getContext('2d', { willReadFrequently: true });
const track = {};          // rune index -> { x, y, seen, moved } in picture fractions (0..1)
let active = -1;           // the rune the visitor is handling now (the last one that moved)
let lastBeep = 0, lastWords = '', lastWordsT = 0, lostSaid = false, onSpotSaid = false;
let knobWarned = false, knobMissingSince = 0;

function findRunes() {
  const src = cam.source;
  const sw = src?.videoWidth || src?.naturalWidth, sh = src?.videoHeight || src?.naturalHeight;
  if (!sw || !sh) return null;
  const gh = Math.round(GW * sh / sw);
  if (gcv.width !== GW || gcv.height !== gh) { gcv.width = GW; gcv.height = gh; }
  gx.drawImage(src, 0, 0, GW, gh);
  const d = cam.applyGains(gx.getImageData(0, 0, GW, gh).data, cam.gains);
  const runes = cam.cfg.runes, placed = cam.state.committed;
  const sum = runes.map(() => ({ x: 0, y: 0, n: 0 }));
  for (let y = 0; y < gh; y++) for (let x = 0; x < GW; x++) {
    const k = (y * GW + x) * 4, [h, s, v] = cam.rgb2hsv(d[k], d[k + 1], d[k + 2]);
    for (let r = 0; r < runes.length; r++) {
      if (placed.includes(r)) continue;                 // that rune is already sitting on a place
      if (cam.matchesRune(h, s, v, runes[r])) { sum[r].x += x; sum[r].y += y; sum[r].n++; }
    }
  }
  return sum.map(t => t.n >= 25 ? { x: t.x / t.n / GW, y: t.y / t.n / gh } : null);
}

function guide() {
  if (!on || !unlocked || !cam || cam.state.sim || quest.phase === 'finished') return;
  const now = performance.now();

  // Question: is the knob dot visible? If not for a while, the hand is probably over it.
  if (quest.phase === 'question') {
    const i = slotIndex(quest.current.slot), r = i >= 0 ? cam.state.rot[i] : null;
    const missing = !r || r.lost > 12;
    if (!missing) { knobMissingSince = 0; knobWarned = false; }
    else if (!knobMissingSince) knobMissingSince = now;
    else if (!knobWarned && now - knobMissingSince > 3000 && !talking()) {
      knobWarned = true;
      say("I can't see the dot on the rune. Let go of it for a moment so the camera can read it.");
    }
    return;
  }
  if (quest.phase !== 'riddle') return;

  const found = findRunes();
  if (!found) return;
  found.forEach((f, r) => {
    const t = track[r] || (track[r] = { x: 0, y: 0, seen: 0, moved: 0, visible: false });
    if (f) {
      if (!t.visible || Math.hypot(f.x - t.x, f.y - t.y) > 0.01) t.moved = now;
      Object.assign(t, f, { seen: now, visible: true });
    } else t.visible = false;
  });

  // The rune being handled: the one that moved last. Remember it even while a hand hides it.
  let best = -1;
  for (const [r, t] of Object.entries(track)) if (t.visible && now - t.moved < 4000 && (best < 0 || t.moved > track[best].moved)) best = +r;
  if (best >= 0 && best !== active) {
    active = best; lostSaid = false; onSpotSaid = false;
    say(`You have the ${cam.cfg.runes[active].name}.`, { interrupt: true });
  }
  if (active < 0) return;
  const t = track[active];

  if (!t.visible) {
    if (!lostSaid && now - t.seen > 1800 && !cam.state.committed.includes(active)) {
      lostSaid = true;
      cue.lost();
      say(`I can't see the ${cam.cfg.runes[active].name}. Put it down on the map so I can see where it is.`);
    }
    return;
  }
  if (lostSaid) { lostSaid = false; cue.found(); }
  if (now - t.moved > 4000) return;              // lying still: stay quiet

  // Distance to the place of this riddle, in "place sizes".
  const i = slotIndex(quest.current.slot), c = cam.cfg.circles[i];
  if (!c) return;
  const R = c.prof ? Math.max(...c.prof) : c.r;                        // radius as fraction of picture width
  const aspect = gcv.height / gcv.width;
  let dx = (c.x - t.x), dy = (c.y - t.y) * aspect;                     // both in "picture widths"
  if (FLIP_X) dx = -dx;
  if (FLIP_Y) dy = -dy;
  const dist = Math.hypot(dx, dy) / R;

  // Beeps: faster and higher when closer; from the side the place is on.
  const gap = dist < 1 ? 90 : Math.min(900, 110 + dist * 70);
  if (now - lastBeep > gap) {
    lastBeep = now;
    cue.beep(dist < 1 ? 1500 : 500 + Math.max(0, 900 - dist * 70), Math.max(-1, Math.min(1, dx / (R * 4))));
  }

  // Words, now and then.
  if (dist < 1) {
    if (!onSpotSaid) { onSpotSaid = true; say(`That's ${placeName(quest.current.slot)}. Let go of the rune.`, { interrupt: true }); }
    return;
  }
  onSpotSaid = false;
  const ax = Math.abs(dx), ay = Math.abs(dy), big = Math.max(ax, ay), dirs = [];
  if (ay >= 0.4 * big && ay > R * 0.5) dirs.push(dy < 0 ? 'up' : 'down');
  if (ax >= 0.4 * big && ax > R * 0.5) dirs.push(dx < 0 ? 'to the left' : 'to the right');
  const how = dist < 2.5 ? 'very close' : dist < 5 ? 'close' : dist < 9 ? 'a fair way' : 'far';
  const words = `Move it ${dirs.join(' and ') || 'a little'}, ${how}.`;
  if (!talking() && (words !== lastWords ? now - lastWordsT > 1500 : now - lastWordsT > 5000)) {
    lastWords = words; lastWordsT = now;
    say(words);
  }
}
setInterval(guide, 120);

/* ===================== 7. Switching the guide on and off ===================== */

function setOn(v) {
  on = v;
  try { localStorage.setItem('runeAudio.on', v ? '1' : '0'); } catch (e) {}
  btn.textContent = `Sound guide: ${v ? 'on' : 'off'} (V)`;
  btn.setAttribute('aria-pressed', String(v));
  captionEl.classList.toggle('show', v);
  if (v && unlocked) intro();
  else if (v) caption('Sound guide on. Press any key or click to start the sound.');
  else { try { speechSynthesis.cancel(); } catch (e) {} caption(''); }
}

function onKey(e) {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if (k === 'v') { unlock(false); setOn(!on); return; }
  if (unlocked && k === 'h' && on) { say(whereText(), { interrupt: true }); return; }
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
