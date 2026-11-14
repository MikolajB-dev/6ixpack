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
  again:    document.getElementById('panel-again'),
  rune:      document.getElementById('panel-rune'),
  runeStone: document.getElementById('panel-rune-stone'),
  runeLabel: document.getElementById('panel-rune-label'),
};
const LETTERS = ['A', 'B', 'C', 'D'];
const DIRECTIONS = ['dot up', 'dot right', 'dot down', 'dot left'];

// quest: the Quest object. choice: the letter the knob of the current stone points at right now (or null).
export function renderPanel(quest, choice) {
  const story = quest.current;

  el.again.hidden = quest.phase !== 'finished';

  if (quest.phase === 'finished') {
    el.step.textContent = 'The journey is complete';
    el.text.textContent = 'All runestones are bound together. Jörmungandr encircles the world!';
    el.answers.innerHTML = '';
    el.hint.textContent = 'Press the lock button (or the button above) to play again.';
    showRune(null);
    showFeedback(null);
    return;
  }

  if (quest.phase === 'clear') {
    el.step.textContent = 'A new journey';
    el.text.textContent = 'Take all runes off the map to begin.';
    el.answers.innerHTML = '';
    el.hint.textContent = '';
    showRune(null);
    showFeedback(null);
    return;
  }

  el.step.textContent = `Stone ${quest.step + 1} of ${STORY.length}`;

  // Which physical rune this step is about. Rune Vision tells us (its step 3 "answers"), so it is set in one place only.
  const wanted = quest.slot(story.slot);
  showRune(wanted.wants ? { name: wanted.wants, color: wanted.wantsColor } : null);

  if (quest.phase === 'riddle') {
    el.text.textContent = story.riddle;
    el.answers.innerHTML = '';
    el.hint.textContent = wanted.wants
      ? `Place the ${wanted.wants.toLowerCase()} on the map where you think it belongs.`
      : 'Place a rune on the map where you think it belongs.';
  } else {
    el.text.textContent = story.question;
    if (quest.phase === 'solved') choice = story.correct;   // after a right answer, keep showing the right one
    el.answers.innerHTML = story.answers.map((answer, i) => `
      <li class="${choice === LETTERS[i] ? 'selected' : ''}">
        <b>${LETTERS[i]}</b> ${answer} <small>${DIRECTIONS[i]}</small>
      </li>`).join('');
    el.hint.textContent = quest.phase === 'question'
      ? `Turn the ${(wanted.wants || 'rune').toLowerCase()} in ${PLACES[story.slot].name} to choose, then press the lock button.`
      : '';
  }
  showFeedback(quest.feedback);
}

// The "Your rune" badge: a little stone in the rune's colour. rune = { name, color } or null.
function showRune(rune) {
  el.rune.hidden = !rune;
  if (!rune) return;
  el.runeStone.style.background = rune.color;
  el.runeLabel.innerHTML = `<small>Your rune</small>${rune.name}`;
}

function showFeedback(feedback) {
  el.feedback.textContent = feedback ? feedback.text : '';
  el.feedback.className = feedback ? feedback.type : '';
}
