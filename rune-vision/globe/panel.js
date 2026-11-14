/*
  The card on screen that talks to the visitor: riddle, question with 4 answers, clue / right message.
  It only shows what quest.js decided; it never changes the quest itself.
*/
import { STORY } from './story.js';
import { PLACES } from './settings.js';

const el = {
  step:     document.getElementById('panel-step'),
  text:     document.getElementById('panel-text'),
  answers:  document.getElementById('panel-answers'),
  hint:     document.getElementById('panel-hint'),
  feedback: document.getElementById('panel-feedback'),
};
const LETTERS = ['A', 'B', 'C', 'D'];
const DIRECTIONS = ['dot up', 'dot right', 'dot down', 'dot left'];

// quest: the Quest object. choice: the letter the knob of the current stone points at right now (or null).
export function renderPanel(quest, choice) {
  const story = quest.current;

  if (quest.phase === 'finished') {
    el.step.textContent = 'The journey is complete';
    el.text.textContent = 'All runestones are bound together. Jörmungandr encircles the world!';
    el.answers.innerHTML = '';
    el.hint.textContent = 'Take all runes off the map to start again.';
    showFeedback(null);
    return;
  }

  el.step.textContent = `Stone ${quest.step + 1} of ${STORY.length}`;

  if (quest.phase === 'riddle') {
    el.text.textContent = story.riddle;
    el.answers.innerHTML = '';
    el.hint.textContent = 'Place a rune on the map where you think it belongs.';
  } else {
    el.text.textContent = story.question;
    if (quest.phase === 'solved') choice = story.correct;   // after a right answer, keep showing the right one
    el.answers.innerHTML = story.answers.map((answer, i) => `
      <li class="${choice === LETTERS[i] ? 'selected' : ''}">
        <b>${LETTERS[i]}</b> ${answer} <small>${DIRECTIONS[i]}</small>
      </li>`).join('');
    el.hint.textContent = quest.phase === 'question'
      ? `Turn the rune in ${PLACES[story.slot].name} to choose, then press the lock button.`
      : '';
  }
  showFeedback(quest.feedback);
}

function showFeedback(feedback) {
  el.feedback.textContent = feedback ? feedback.text : '';
  el.feedback.className = feedback ? feedback.type : '';
}
