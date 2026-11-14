/*
  Rune Globe: the main file. This is what the visitor sees.
  ----------
  It does NOT look at the camera itself: it only listens to the events Rune Vision (../index.html) sends,
  and lets quest.js decide what happens.

    riddle            -> hints where the next rune goes
    right rune placed -> its runestone rises and a history question appears (4 answers = 4 knob positions)
    SPACE (lock in)   -> wrong answer: a clue. Right answer: the stone is locked, and from the 2nd stone on
                         Jörmungandr slithers from the home stone (Jelling) and coils around it
    then              -> the next riddle. After the last stone the serpent closes the ring and the globe spins.

  The other files:
    story.js      riddles, questions, answers, clues (edit the texts there)
    quest.js      the rules of the journey (what happens when)
    panel.js      the card with the riddle / question
    settings.js   places, colours, sizes and timings
    parchment.js  draws the old map that wraps around the globe
    runestone.js  one runestone
    serpent.js    one serpent
    geo.js        maths for points on a sphere
*/
import { PLACES, VIEW, COLORS, SERPENT } from './settings.js';
import { drawParchmentMap } from './parchment.js';
import { Runestone } from './runestone.js';
import { Serpent } from './serpent.js';
import { Quest } from './quest.js';
import { renderPanel } from './panel.js';

/* ===================== 1. Globe setup ===================== */

const container = document.getElementById('globe');
const globe = Globe()(container)
  .width(container.clientWidth).height(container.clientHeight)
  .backgroundColor(COLORS.background)
  .showAtmosphere(true).atmosphereColor(COLORS.glow).atmosphereAltitude(0.15)
  // place names (plain HTML, so they always face you and are styled in index.html)
  .htmlLat('lat').htmlLng('lng').htmlAltitude(0.17).htmlElement(placeLabel)
  .htmlElementsData(Object.values(PLACES));

globe.pointOfView(VIEW, 0);
window.runeGlobe = globe;     // handy for trying things in the browser console
globe.controls().autoRotateSpeed = 0.5;
window.addEventListener('resize', () => globe.width(container.clientWidth).height(container.clientHeight));

// The old map, drawn once from the country shapes.
fetch('img/countries.geojson')
  .then(r => r.json())
  .then(geo => globe.globeImageUrl(drawParchmentMap(geo).toDataURL('image/jpeg', 0.9)));

function placeLabel(place) {
  const el = document.createElement('div');
  el.className = 'place-label';
  el.textContent = place.name;
  return el;
}

/* ===================== 2. Stones and serpents ===================== */

const stones = {};                       // one runestone per place, always there
for (const [id, place] of Object.entries(PLACES)) stones[id] = new Runestone(globe, place);

const serpents = new Map();              // serpents on the globe now, by name ("jelling-tokyo")

// Make the stones and serpents match what quest.js says. Safe to call any time.
function drawScene() {
  const now = performance.now();
  for (const id of Object.keys(PLACES)) stones[id].setState(quest.stoneState(id), now);

  const wanted = quest.serpents();
  const names = wanted.map(([a, b]) => `${a}-${b}`);
  for (const [name, serpent] of serpents) {
    if (!names.includes(name)) { serpent.remove(); serpents.delete(name); }
  }
  wanted.forEach(([a, b, coil], i) => {
    if (!serpents.has(names[i])) serpents.set(names[i], new Serpent(globe, PLACES[a], PLACES[b], now, coil));
  });

  globe.controls().autoRotate = quest.phase === 'finished';
}

function animate() {
  const now = performance.now();
  for (const stone of Object.values(stones)) stone.update(now, globe.camera());
  for (const serpent of serpents.values()) serpent.update(now);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

/* ===================== 3. The journey ===================== */

const quest = new Quest();
let nextTimer = null;

// Where the knob of the current stone points right now (A-D), shown live on the answer list.
function currentChoice() {
  const s = quest.slot(quest.current?.slot);
  return s.choice || null;
}

function refresh() {
  drawScene();
  renderPanel(quest, currentChoice());

  // After a right answer: give the serpent time to travel, then show the next riddle.
  if (quest.phase === 'solved' && !nextTimer) {
    nextTimer = setTimeout(() => { nextTimer = null; quest.next(); refresh(); }, SERPENT.travelMs + 2500);
  }
  if (quest.phase !== 'solved' && nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
}

/* ===================== 4. Events from Rune Vision ===================== */

const link = document.getElementById('link');

function onEvent(msg) {
  link.textContent = 'connected to Rune Vision';

  if (msg.type === 'state') quest.onState(msg.slots);        // the whole board (rune per place + knob)
  else if (msg.type === 'lock') quest.onLock(msg);           // SPACE: lock in the knob's answer
  else if (msg.type === 'rotate') {                          // knob turned: update the live choice
    const s = quest.slot(msg.slot);
    if (s.slot) s.choice = 'ABCD'[msg.step] || null;
  } else return;

  refresh();
}

new BroadcastChannel('rune-board').onmessage = e => onEvent(e.data);
refresh();
