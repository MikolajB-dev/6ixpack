/*
  Soft sounds, made in the browser with the Web Audio API (no sound files needed).

    play('found')   the right rune is placed: a low stone "hum" and a bright note
    play('wrong')   the wrong rune: a dull low knock
    play('clue')    a wrong answer was locked in: two falling notes
    play('right')   the right answer: three rising notes
    play('finish')  the journey is complete: a slow chord

  Browsers only allow sound after the visitor clicked or pressed a key in this window,
  so the first sounds may be silent. M toggles mute.
*/
import { SOUND } from './settings.js';

let ctx = null;
let muted = !SOUND.enabled;

function audio() {
  if (!ctx) { try { ctx = new AudioContext(); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
// Wake the audio up on the first click or key (browser rule).
for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => audio(), { once: true });

export function toggleMute() { muted = !muted; return muted; }

// One note: frequency (Hz), start delay and length (s), wave shape, loudness (0..1).
function note(freq, delay, length, type = 'sine', loud = 1) {
  const a = audio();
  if (!a || a.state !== 'running') return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator(), gain = a.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(SOUND.volume * loud, t + 0.02);       // quick attack
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);             // slow fade, like a bell
  osc.connect(gain).connect(a.destination);
  osc.start(t); osc.stop(t + length + 0.05);
}

export function play(name) {
  if (muted) return;
  switch (name) {
    case 'found':  note(110, 0, 1.4, 'triangle', 0.7); note(659, 0.08, 1.2); break;
    case 'wrong':  note(98, 0, 0.35, 'square', 0.25); note(92, 0.12, 0.4, 'square', 0.2); break;
    case 'clue':   note(440, 0, 0.5, 'triangle', 0.6); note(370, 0.2, 0.7, 'triangle', 0.6); break;
    case 'right':  [523, 659, 784].forEach((f, i) => note(f, i * 0.13, 1.1)); break;
    case 'finish': [262, 330, 392, 523, 659].forEach((f, i) => note(f, i * 0.18, 2.6, 'sine', 0.8)); break;
  }
}
