/*
  The card on screen that talks to the visitor: riddle, question with 4 answers, clue / right message.
  It only shows what quest.js decided; it never changes the quest itself.

  Extras that make it feel smoother:
    - a trail of 3 marks at the top: found stones show their rune, the current one glows
    - new riddles and questions slide in gently instead of just appearing
    - the answer list is built once per question; turning the knob only moves the highlight
    - a wrong answer shakes, the right one shines
    - a thin gold bar fills while the serpent travels, so you know the next riddle is coming
*/
import { STORY } from './story.js';
import { PLACES, SERPENT } from './settings.js';

const el = {
  progress: document.getElementById('panel-progress'),
  body:     document.getElementById('panel-body'),
  step:     document.getElementById('panel-step'),
  text:     document.getElementById('panel-text'),
  answers:  document.getElementById('panel-answers'),
  hint:     document.getElementById('panel-hint'),
  feedback: document.getElementById('panel-feedback'),
  timer:    document.getElementById('panel-timer'),
  again:    document.getElementById('panel-again'),
  lock:     document.getElementById('panel-lock'),
  rune:      document.getElementById('panel-rune'),
  runeStone: document.getElementById('panel-rune-stone'),
  runeLabel: document.getElementById('panel-rune-label'),
};
const LETTERS = ['A', 'B', 'C', 'D'];

let shown = '';            // which card is on screen ("riddle:0" ...), to know when to animate
let answersFor = null;     // which question the answer list was built for
let lastFeedback = null;

// quest: the Quest object. choice: the letter the knob of the current stone points at right now (or null).
export function renderPanel(quest, choice) {
  const story = quest.current;
  const key = `${quest.phase}:${quest.step}`;
  const isNew = key !== shown;
  shown = key;

  renderProgress(quest);
  el.again.hidden = quest.phase !== 'finished';
  el.lock.hidden = true;   // only shown during a question, see below

  if (quest.phase === 'finished') {
    el.step.textContent = 'The journey is complete';
    el.text.textContent = 'All runestones are bound together. Jörmungandr encircles the world!';
    clearAnswers();
    el.hint.textContent = '';   // the gold "Press the LOCK button to play again" line says it all
    showRune(null);
    showFeedback(null);
    finish(isNew, quest);
    return;
  }

  if (quest.phase === 'clear') {
    el.step.textContent = 'A new journey';
    el.text.textContent = 'Take all runes off the map to begin.';
    clearAnswers();
    el.hint.textContent = '';
    showRune(null);
    showFeedback(null);
    finish(isNew, quest);
    return;
  }

  el.step.textContent = `Stone ${quest.step + 1} of ${STORY.length}`;

  // Which physical rune this step is about. Rune Vision tells us (its step 3 "answers"), so it is set in one place only.
  const wanted = quest.slot(story.slot);
  const runeName = wanted.wants ? wanted.wants.toLowerCase() : 'rune';
  showRune(wanted.wants ? { name: wanted.wants, color: wanted.wantsColor } : null);

  if (quest.phase === 'riddle') {
    el.text.textContent = story.riddle;
    clearAnswers();
    el.hint.textContent = `Place the ${runeName} on the map where you think it belongs.`;
  } else {
    el.text.textContent = story.question;
    if (quest.phase === 'solved') choice = story.correct;   // after a right answer, keep showing the right one
    buildAnswers(story);
    turnDial(wanted, choice);
    [...el.answers.children].forEach((li, i) => {
      li.classList.toggle('selected', choice === LETTERS[i]);
      li.classList.toggle('correct', quest.phase === 'solved' && story.correct === LETTERS[i]);
    });
    el.hint.textContent = quest.phase === 'question'
      ? `Turn the ${runeName} in ${PLACES[story.slot].name} so its dot points at your answer.`
      : '';
  }

  // The big call to action: once the dot points at an answer, tell them to press the button (the OLED shows the same letter).
  el.lock.hidden = quest.phase !== 'question';
  el.lock.innerHTML = choice
    ? `Press the <span class="key">LOCK</span> button to choose <b>${choice}</b>`
    : `Turn the rune to pick an answer`;
  el.lock.classList.toggle('ready', !!choice);

  // A wrong answer was just locked in: shake the answer the knob points at.
  if (quest.feedback && quest.feedback !== lastFeedback && quest.feedback.type === 'clue') {
    const li = el.answers.children[LETTERS.indexOf(choice)];
    if (li) replay(li, 'shake');
  }
  showFeedback(quest.feedback);
  finish(isNew, quest);
}

// Shared end of every render: slide the card in when it changed, and run the countdown bar.
function finish(isNew, quest) {
  if (isNew) replay(el.body, 'enter');
  el.timer.classList.toggle('run', quest.phase === 'solved');
  if (isNew && quest.phase === 'solved') {
    el.timer.style.setProperty('--ms', `${SERPENT.travelMs + 2500}ms`);   // same wait as in globe.js
    replay(el.timer, 'run');
  }
}

function renderProgress(quest) {
  const html = STORY.map((s, i) => {
    const found = quest.locked.includes(s.slot);
    const current = !found && quest.phase !== 'finished' && i === quest.step;
    const cls = found ? 'found' : current ? 'current' : '';
    // Found stones show their rune; unfound ones only a diamond, so nothing is given away.
    const mark = found ? `<em>${PLACES[s.slot].rune}</em>` : '';
    const title = found ? PLACES[s.slot].name : `Stone ${i + 1}`;
    return (i ? '<i class="trail"></i>' : '') + `<span class="pip ${cls}" title="${title}">${mark}</span>`;
  }).join('');
  if (el.progress.innerHTML !== html) el.progress.innerHTML = html;   // only when it changed, so animations don't restart
}

// The answers sit around a drawing of the rune (A above, B right, C below, D left, see index.html).
// The drawing's black dot turns with the real rune, so visitors see what turning it does.
let lastAngle = 0;
function turnDial(slot, choice) {
  if (typeof slot.angle === 'number') lastAngle = slot.angle;               // live angle from the camera
  else if (choice) lastAngle = LETTERS.indexOf(choice) * 90;                // no angle: point at the chosen answer
  // (hidden by a hand: keep the last angle)
  el.answers.style.setProperty('--angle', `${lastAngle}deg`);
  el.answers.style.setProperty('--rune', slot.wantsColor || '#8d8579');
}

function buildAnswers(story) {
  if (answersFor === story) return;
  answersFor = story;
  el.answers.innerHTML = story.answers.map((answer, i) => `
    <li style="--i:${i}">
      <b>${LETTERS[i]}</b> ${answer}
    </li>`).join('');
}

function clearAnswers() {
  answersFor = null;
  el.answers.innerHTML = '';
}

// The "Your rune" badge: a little stone in the rune's colour. rune = { name, color } or null.
function showRune(rune) {
  el.rune.hidden = !rune;
  if (!rune) return;
  el.runeStone.style.background = rune.color;
  el.runeLabel.innerHTML = `<small>Your rune</small>${rune.name}`;
}

function showFeedback(feedback) {
  if (feedback !== lastFeedback && feedback) replay(el.feedback, 'pop');
  lastFeedback = feedback;
  el.feedback.textContent = feedback ? feedback.text : '';
  el.feedback.className = feedback ? feedback.type + ' pop' : '';
}

// Restart a CSS animation on an element (remove the class, force a reflow, add it again).
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}
