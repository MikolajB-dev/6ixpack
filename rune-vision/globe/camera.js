/*
  Where the camera looks, depending on the journey:

    riddle    the usual view with all 3 places (VIEW in settings.js), so the riddle doesn't give the answer away
    question  flies a little closer to the stone whose rune was just placed
    solved    pulls back over the serpent's route, so you can watch it slither from Jelling
    finished  back to the usual view, and the globe spins

  Also:
    - If a visitor drags the globe, it glides back after a few seconds of nobody touching it.
    - If nobody plays for a while (board empty, first riddle), the globe turns slowly to attract people.
*/
import { PLACES, VIEW, HUB, CAMERA } from './settings.js';
import { pointBetween } from './geo.js';

export class CameraDirector {
  constructor(globe) {
    this.globe = globe;
    this.key = '';                    // which shot we are on now ("question:1" ...)
    this.lastActivity = performance.now();
    this.dragged = false;
    this.attract = false;

    // The visitor grabbed the globe: remember it, and stop the attract spin.
    const controls = globe.controls();
    controls.addEventListener('start', () => { this.dragged = true; this.poke(); });
    controls.addEventListener('end', () => this.poke());
  }

  // The shot for this moment of the journey.
  view(quest) {
    const story = quest.current;
    if (quest.phase === 'question') return closeTo(PLACES[story.slot], CAMERA.focusAltitude);
    if (quest.phase === 'solved') {
      const to = PLACES[story.slot];
      if (story.slot === HUB) return closeTo(to, CAMERA.focusAltitude + 0.3);
      const mid = pointBetween(PLACES[HUB], to, 0.5);      // halfway along the serpent's route
      return { lat: mid.lat, lng: mid.lng, altitude: VIEW.altitude };
    }
    return VIEW;
  }

  // Something happened on the board (or the visitor touched the globe).
  poke() {
    this.lastActivity = performance.now();
    if (this.attract) { this.attract = false; this.key = ''; }   // fly back on the next follow()
  }

  // Called after every change in the quest: fly when the shot changes.
  follow(quest) {
    const key = `${quest.phase}:${quest.step}`;
    if (key === this.key) return;
    this.key = key;
    this.dragged = false;
    this.globe.pointOfView(this.view(quest), CAMERA.flyMs);
  }

  // Called about once a second. Returns true while the attract spin should run.
  tick(quest) {
    const idle = performance.now() - this.lastActivity;
    // glide back after a visitor dragged the globe and let go
    if (this.dragged && idle > CAMERA.returnMs && quest.phase !== 'finished') {
      this.dragged = false;
      this.globe.pointOfView(this.view(quest), CAMERA.flyMs * 1.5);
    }
    // nobody is playing: slowly turn the globe to catch people's eye
    const waiting = quest.phase === 'riddle' && quest.step === 0 && quest.slots.every(s => !s.rune);
    if (!this.attract && waiting && idle > CAMERA.attractMs) this.attract = true;
    if (this.attract && !waiting) this.poke();
    return this.attract;
  }
}

// Close to a stone, but a bit towards the usual view: looking straight down would only show the top of the stone.
function closeTo(place, altitude) {
  const p = pointBetween(place, VIEW, CAMERA.tilt);
  return { lat: p.lat, lng: p.lng, altitude };
}
