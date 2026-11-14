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
};
const LETTERS = ['A', 'B', 'C', 'D'];
const DIRECTIONS = ['dot up', 'dot right', 'dot down', 'dot left'];
const ARROWS = ['↑', '→', '↓', '←'];

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

  if (quest.phase === 'finished') {
    el.step.textContent = 'The journey is complete';
    el.text.textContent = 'All runestones are bound together. Jörmungandr encircles the world!';
    clearAnswers();
    el.hint.textContent = 'Take all runes off the map to start again.';
    showFeedback(null);
    finish(isNew, quest);
    return;
  }

  el.step.textContent = `Stone ${quest.step + 1} of ${STORY.length}`;

  if (quest.phase === 'riddle') {
    el.text.textContent = story.riddle;
    clearAnswers();
    el.hint.textContent = 'Place a rune on the map where you think it belongs.';
  } else {
    el.text.textContent = story.question;
    if (quest.phase === 'solved') choice = story.correct;   // after a right answer, keep showing the right one
    buildAnswers(story);
    [...el.answers.children].forEach((li, i) => {
      li.classList.toggle('selected', choice === LETTERS[i]);
      li.classList.toggle('correct', quest.phase === 'solved' && story.correct === LETTERS[i]);
    });
    el.hint.textContent = quest.phase === 'question'
      ? `Turn the rune in ${PLACES[story.slot].name} to choose, then press the lock button.`
      : '';
  }

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

function buildAnswers(story) {
  if (answersFor === story) return;
  answersFor = story;
  el.answers.innerHTML = story.answers.map((answer, i) => `
    <li style="--i:${i}">
      <b>${LETTERS[i]}</b> ${answer} <small><span class="arrow">${ARROWS[i]}</span> ${DIRECTIONS[i]}</small>
    </li>`).join('');
}

function clearAnswers() {
  answersFor = null;
  el.answers.innerHTML = '';
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
