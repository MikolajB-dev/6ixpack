/*
  The Bindrune outro: the closing film, the twin of the intro (intro.js). It plays when the journey is complete.

  The intro ends with Jörmungandr biting its tail around the small parchment globe and the 3 places lighting up.
  The outro starts from that same picture and finishes the story:

    1. The game globe dissolves into the small globe of the intro. The serpent holds its tail, circling.
    2. The 3 runes lift off their places, one after another, and fly in front of the globe.
    3. A gold ring closes in on them and they fuse into one bind rune (ᚼ ᚢ ᛏ in one sign): a flash,
       a shockwave, a light runs all the way around the serpent and its scales catch fire in gold.
    4. The title comes back with "All stones are bound".
    5. The world goes quiet and dark. Only the bind rune and the serpent's eyes keep glowing, then fade,
       and the game globe is shown again.

  Use it from any page:
      import { playOutro } from './outro.js';
      playOutro();                         // or playOutro({ speed: 1.5 })

  Options (same idea as the intro):
      title        the big word                         (default TITLE from intro.js)
      line         the small line under it              (default LINE below)
      transparent  no dark background                   (default false)
      hold         stay on the last bright frame        (default false)
      loop         play again and again                 (default false)
      speed        1 = normal, 2 = twice as fast        (default 1)
      sound        play the soft sounds of sound.js     (default true)
      start        begin this many seconds in           (default 0, handy for trying out one moment)
      parent       element to put the outro in          (default document.body)

  playOutro() gives back a promise that finishes when the outro is over. It also has .skip() and .close().
  Click, Space or Esc skips to the ending. When it is over the window gets an 'outro:done' event.

  It reuses the intro's own pieces (serpent head, scales, places, arcs, runes, dust), so it is the same world.
*/
import * as THREE from './lib/three/three.module.js';
import { COLORS, PLACES } from './settings.js';
import { drawParchmentMap } from './parchment.js';
import { play } from './sound.js';
import {
  TITLE, RUNE_LINES, makeHead, makeMarker, makeArcs, onGlobe, glowTexture, scaleTexture, makeDust,
} from './intro.js';

export const LINE = 'All stones are bound';     // the small line under the title

// When things happen, in seconds from the start.
const T = {
  fadeIn: 1.8,        // the game globe has dissolved into the film
  lift: 2.4,          // first rune lifts off its place (the others follow, 0.4 s apart)
  fly: 2.3,           // how long one rune takes to fly to the middle
  gather: 4.0,        // the gold ring starts closing in
  bind: 5.9,          // the runes fuse into the bind rune: flash, shockwave
  title: 6.9,         // title fades in
  line: 7.7,          // the small line under it
  dim: 11.0,          // the world goes dark, only the bind rune and the eyes keep glowing
  fadeOut: 13.2,      // everything fades back to the game
  end: 14.8,
};

// The same sizes as the intro, so the serpent and globe look identical.
const RING = 1.55;            // how far from the globe's centre the serpent lies (globe radius = 1)
const BODY = 0.11;            // body thickness
const CIRCLING = 0.35;        // how fast the ring turns (radians per second)
const BODY_POINTS = 220;
const SIDES = 14;
const HEAD_AT = 0.62;         // where on the ring the head is (front right), as in the intro
const UP = new THREE.Vector3(0, 1, 0);

export function playOutro(options = {}) {
  const opt = { title: TITLE, line: LINE, transparent: false, hold: false, loop: false, speed: 1, sound: true, parent: document.body, ...options };
  if (!(opt.speed > 0)) opt.speed = 1;

  /* ---------- the page layer ---------- */

  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;z-index:1000;overflow:hidden;cursor:pointer;';

  // The background fades in on its own, so the game globe dissolves into the film instead of being cut away.
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:absolute;inset:0;opacity:0;' +
    (opt.transparent ? '' : `background:radial-gradient(ellipse at 50% 42%, #2a1a0d 0%, ${COLORS.background} 55%, #0b0704 100%);`);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0';

  // Title: the same look as the intro, plus a small line under the diamond.
  const title = document.createElement('div');
  title.style.cssText = 'position:absolute;left:0;right:0;bottom:7vh;text-align:center;opacity:0;pointer-events:none;' +
    'font-family:Georgia,"Times New Roman",serif;color:#e3b955';
  const word = document.createElement('div');
  word.textContent = opt.title;
  word.style.cssText = 'font-size:clamp(34px,7.2vw,112px);letter-spacing:.3em;padding-left:.3em;line-height:1;' +
    'text-shadow:0 0 18px rgba(227,185,85,.55),0 0 46px rgba(214,165,72,.35)';
  const rule = document.createElement('div');
  rule.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:18px;margin-top:3.2vh';
  const ruleLine = side => `<span style="width:min(22vw,260px);height:1px;background:linear-gradient(${side},transparent,#b8963a)"></span>`;
  rule.innerHTML = ruleLine('90deg') + '<span style="width:9px;height:9px;border:1px solid #e3b955;transform:rotate(45deg)"></span>' + ruleLine('270deg');
  const small = document.createElement('div');
  small.textContent = opt.line;
  small.style.cssText = 'margin-top:2.4vh;font-size:clamp(13px,1.35vw,20px);letter-spacing:.42em;padding-left:.42em;' +
    'text-transform:uppercase;color:#d8c39a;opacity:0;text-shadow:0 0 12px rgba(227,185,85,.35)';
  title.append(word, rule, small);

  layer.append(backdrop, canvas, title);
  opt.parent.append(layer);

  /* ---------- the 3D scene (built like the intro's) ---------- */

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  const ambient = new THREE.AmbientLight('#ffe2b0', 0.75);
  const sun = new THREE.DirectionalLight('#fff1d0', 2.2);
  sun.position.set(-3, 4, 5);
  const rim = new THREE.PointLight('#ffb84a', 30, 20);
  rim.position.set(4, -1, -3);
  scene.add(ambient, sun, rim);

  const dust = makeDust();
  scene.add(dust);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: COLORS.glow, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(3.6);
  halo.renderOrder = -1;
  scene.add(halo);

  const tilt = new THREE.Group();
  tilt.rotation.x = THREE.MathUtils.degToRad(62);
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshStandardMaterial({ color: COLORS.paper, roughness: 0.85, metalness: 0.05, emissive: '#ffb84a', emissiveIntensity: 0 }));
  tilt.add(globe);
  scene.add(tilt);

  const places = Object.values(PLACES);
  const markers = places.map(place => makeMarker(place));
  markers.forEach(m => globe.add(m.group));
  const arcs = makeArcs(places);
  arcs.forEach(a => { a.grow(1); globe.add(a); });

  const ringPlane = new THREE.Group();
  ringPlane.rotation.set(0.36, 0, -0.26);
  const serpent = makeRingSerpent();
  ringPlane.add(serpent.group);
  scene.add(ringPlane);

  // The runes that fly off the globe, and the bind rune they become.
  const flyers = places.map(place => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: runeOnlyTexture(place.rune), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    s.renderOrder = 10;
    scene.add(s);
    return { sprite: s, place, from: new THREE.Vector3(), bend: new THREE.Vector3() };
  });
  const seal = new THREE.Sprite(new THREE.SpriteMaterial({ map: bindRuneTexture(places.map(p => p.rune)), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  seal.renderOrder = 12;
  const sealGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: COLORS.runeGlow, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  sealGlow.renderOrder = 11;
  // A soft shadow behind the bind rune, so the gold reads over the bright parchment.
  const sealShade = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#000000', transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
  sealShade.renderOrder = 10;
  scene.add(sealShade, sealGlow, seal);

  // Two shockwaves, like the intro's: one closes in before the bind, one rolls out after it.
  const ringMaterial = () => new THREE.MeshBasicMaterial({ color: '#ffd77a', transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const gatherWave = new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 128), ringMaterial());
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.982, 1, 128), ringMaterial());
  const wave2 = new THREE.Mesh(new THREE.RingGeometry(0.99, 1, 128), ringMaterial());
  for (const w of [gatherWave, wave, wave2]) { w.renderOrder = 9; scene.add(w); }

  // Gold sparks thrown out by the bind.
  const sparks = makeSparks();
  scene.add(sparks.points);

  // Where the bind rune hangs: on the line from the camera to the globe's centre, so it sits over the globe.
  const center = new THREE.Vector3();
  let baseDistance = 7.8;

  function resize() {
    const w = layer.clientWidth || window.innerWidth, h = layer.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    baseDistance = 7.8 * Math.max(1, 1.25 / camera.aspect);   // same framing as the intro
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- the clock ---------- */

  let t = Math.max(0, +opt.start || 0), last = null, ready = false, finished = false, closed = false, frame = 0;
  const cues = new Set();     // sounds already played this run
  let resolve;
  const promise = new Promise(r => { resolve = r; });

  fetch(new URL('img/countries.geojson', import.meta.url))
    .then(r => r.json())
    .then(geo => {
      const tex = new THREE.CanvasTexture(drawParchmentMap(geo));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      globe.material.map = tex;
      globe.material.color.set('#ffffff');
      globe.material.needsUpdate = true;
    })
    .catch(() => {})
    .finally(() => { ready = true; });

  function tick(now) {
    if (closed) return;
    frame = requestAnimationFrame(tick);
    if (!ready) return;
    const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    t += dt * opt.speed;

    if (opt.hold && !opt.loop && t >= T.dim) {    // stay on the bright, bound world
      t = T.dim;
      if (!finished) { finished = true; announce(); }
    }
    if (t >= T.end) {
      if (opt.loop) { t = 0; cues.clear(); }
      else return close();
    }
    draw(now / 1000);
  }

  function cue(name, at, sound) {
    if (t >= at && !cues.has(name)) { cues.add(name); if (opt.sound) play(sound); }
  }

  // Everything on screen is worked out from the time t, so skipping just changes t.
  function draw(clock) {
    // In and out.
    const fadeOut = smooth((t - T.fadeOut) / (T.end - T.fadeOut));
    const show = smooth(t / T.fadeIn) * (1 - fadeOut);
    backdrop.style.opacity = show;
    canvas.style.opacity = smooth((t - 0.3) / (T.fadeIn - 0.3)) * (1 - fadeOut);
    const titleIn = smooth((t - T.title) / 1.2);
    title.style.opacity = titleIn * (1 - smooth((t - T.dim - 0.6) / 1.6)) * (1 - fadeOut);
    title.style.transform = `translateY(${(1 - smooth((t - T.title) / 1.6)) * 14}px)`;
    small.style.opacity = smooth((t - T.line) / 1.4);
    small.style.letterSpacing = `${0.62 - 0.2 * smooth((t - T.line) / 2.2)}em`;   // the letters draw together

    const since = t - T.bind;                                 // seconds since the bind (negative before)
    const flash = since > 0 ? Math.exp(-since * 2.2) : 0;     // 1 at the bind, then dies away
    const charge = smooth((t - T.gather) / (T.bind - T.gather));    // builds up towards the bind
    const dim = smooth((t - T.dim) / 1.8);                    // the world going dark at the end

    // Camera: a slow push in while the runes gather, a small kick at the bind, then it drifts back and up.
    const distance = baseDistance * (1.06 - 0.12 * smooth(t / T.bind) + 0.18 * smooth((t - T.dim) / 3.5)) - flash * 0.35;
    camera.position.set(0, 0.5 + 0.35 * smooth((t - T.dim) / 3.5), distance);
    camera.lookAt(0, -0.42, 0);
    center.copy(camera.position).multiplyScalar(0.3);         // 30% of the way from the globe to the camera

    // Light: a gold glow from inside the globe at the bind, everything sinking into the dark at the end.
    const settle = smooth((since - 0.3) / 1.6);                // after the flash the world settles a little darker
    const light = (1 - 0.35 * settle) * (1 - dim * 0.88);
    ambient.intensity = 0.75 * light;
    sun.intensity = 2.2 * light;
    rim.intensity = 30 * (light + flash * 0.8);
    globe.material.emissiveIntensity = (flash * 0.3 + charge * 0.06) * (1 - dim);

    globe.rotation.y = 1.9 + t * 0.1;
    globe.updateMatrixWorld(true);                            // the flying runes read their start from it
    dust.rotation.y = clock * 0.012 + charge * 1.2 + (since > 0 ? since * 0.06 : 0);   // a swirl as it gathers
    dust.material.opacity = 0.5 * (1 - dim * 0.7);

    halo.material.opacity = (0.5 + 0.06 * Math.sin(clock * 1.3) + charge * 0.12 + flash * 0.35) * (1 - dim * 0.9);
    halo.scale.setScalar(3.6 + charge * 0.3 + flash * 1.2);

    serpent.update(t, clock, since, charge, dim);

    // The places: lit as the intro left them, flaring as the bind goes off, then fading in the dark.
    markers.forEach((m, i) => {
      m.update(1, clock);
      const rune = m.group.children[1];                       // [spark, rune, beam]: the rune leaves with its flyer
      rune.material.opacity = 1 - smooth((t - T.lift - i * 0.4) / 0.5);
      m.group.children[0].material.opacity = (1 + flash) * (1 - dim);
      m.group.children[2].material.opacity = 0.7 * (1 - dim);
    });
    arcs.forEach(a => { a.material.opacity = (0.95 - charge * 0.25 + flash * 0.05) * (1 - dim); });

    // The runes fly to the middle, along a curve that rises off the globe.
    flyers.forEach((f, i) => {
      const k = clamp((t - T.lift - i * 0.4) / T.fly);
      f.from.copy(onGlobe(f.place.lat, f.place.lng, 1.3));
      globe.localToWorld(f.from);
      f.bend.copy(f.from).multiplyScalar(1.4).lerp(center, 0.3);
      f.bend.y += 0.25;
      const e = ease(k);
      // quadratic curve: from -> bend -> centre
      f.sprite.position.copy(f.from).multiplyScalar((1 - e) ** 2)
        .addScaledVector(f.bend, 2 * (1 - e) * e)
        .addScaledVector(center, e * e);
      // A slow turn around the middle while they wait for the others, then they fuse.
      if (k >= 1) {
        const a = clock * 1.6 + i * Math.PI * 2 / 3, r = 0.12 * (1 - smooth((t - (T.bind - 0.8)) / 0.8));
        f.sprite.position.x += Math.cos(a) * r;
        f.sprite.position.y += Math.sin(a) * r;
      }
      f.sprite.material.opacity = smooth((t - T.lift - i * 0.4) / 0.4) * (1 - smooth(since / 0.15));
      f.sprite.scale.setScalar(0.32 + 0.22 * e);
    });
    cue('lift', T.lift, 'found');

    // The bind rune: punches in big at the bind, settles, breathes, and is the last thing to fade.
    const sealIn = clamp(since / 0.25);
    const breathe = 1 + 0.025 * Math.sin(clock * 2.1);
    seal.position.copy(center);
    sealGlow.position.copy(center);
    seal.material.opacity = sealIn * (1 - fadeOut);
    seal.scale.setScalar((0.95 + 0.6 * Math.exp(-Math.max(0, since) * 4)) * breathe);
    sealGlow.material.opacity = (charge * 0.4 * (1 - sealIn) + flash * 0.6 + sealIn * 0.12 * breathe) * (1 - fadeOut);
    sealGlow.scale.setScalar(1 + charge * 0.4 + flash * 1.6);
    sealShade.position.copy(center);
    sealShade.material.opacity = sealIn * 0.55 * (1 - flash) * (1 - fadeOut);
    sealShade.scale.setScalar(1.6);
    cue('bind', T.bind, 'finish');

    // Gathering ring: closes in on the runes; and two shockwaves rolling out from the bind.
    const g = clamp((t - T.gather) / (T.bind - T.gather));
    gatherWave.visible = g > 0 && g < 1;
    gatherWave.position.copy(center);
    gatherWave.scale.setScalar(0.05 + (1 - ease(g)) * 2.6);
    gatherWave.material.opacity = smooth(g * 3) * 0.8;
    for (const [w, delay, grow, reach] of [[wave, 0, 1.5, 4.5], [wave2, 0.22, 2.1, 6]]) {
      const k = clamp((since - delay) / grow);
      w.visible = since > delay && k < 1;
      w.position.copy(center);
      w.scale.setScalar(0.3 + ease(k) * reach);
      w.material.opacity = (1 - k) * 0.9;
    }
    gatherWave.quaternion.copy(camera.quaternion);
    wave.quaternion.copy(camera.quaternion);
    wave2.quaternion.copy(camera.quaternion);

    sparks.update(since, center, dim);

    renderer.render(scene, camera);
  }

  /* ---------- skip, close ---------- */

  function skip() { t = Math.max(t, t < T.bind ? T.dim : T.fadeOut); }

  function announce() { window.dispatchEvent(new CustomEvent('outro:done')); }

  function close() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey, true);
    layer.remove();
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
    renderer.dispose();
    if (!finished) announce();
    finished = true;
    resolve();
  }

  function onKey(e) {
    if (e.code !== 'Space' && e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    skip();
  }
  layer.addEventListener('click', skip);
  window.addEventListener('keydown', onKey, true);

  frame = requestAnimationFrame(tick);

  promise.skip = skip;
  promise.close = close;
  return promise;
}

/* ====================== the serpent, holding its tail ====================== */

// The intro's serpent as it is after the bite: a closed ring, the tail tip in its jaws, slowly turning.
// At the bind a light runs all the way around it and its scales catch the gold.
function makeRingSerpent() {
  const group = new THREE.Group();
  const length = 2 * Math.PI * RING - 0.2;       // a full circle, minus the bit the head covers (as in the intro)

  const skin = new THREE.MeshStandardMaterial({ map: scaleTexture(), roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide, emissive: '#ffc94d', emissiveIntensity: 0 });
  skin.emissiveMap = skin.map;                    // the bronze scale edges are what lights up
  const bone = new THREE.MeshStandardMaterial({ color: '#dcc592', roughness: 0.45, metalness: 0.3, emissive: '#ffc94d', emissiveIntensity: 0 });

  const count = BODY_POINTS * (SIDES + 1);
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), uvs = new Float32Array(count * 2);
  const index = [];
  for (let r = 0; r < BODY_POINTS - 1; r++) {
    for (let s = 0; s < SIDES; s++) {
      const a = r * (SIDES + 1) + s, b = a + SIDES + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  const body = new THREE.Mesh(geometry, skin);
  body.frustumCulled = false;

  const SPIKES = 84;
  const spikeShape = new THREE.ConeGeometry(0.03, 0.24, 5);
  spikeShape.translate(0, 0.12, 0);
  const spikes = new THREE.InstancedMesh(spikeShape, bone, SPIKES * 2);
  spikes.frustumCulled = false;

  const head = makeHead(skin, bone);

  // The light that runs around the body at the bind: a few glows chasing each other from tail to head.
  const runners = [0, 0.06, 0.12].map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: COLORS.runeGlow, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(s);
    return s;
  });
  group.add(body, spikes, head.group);

  const pts = Array.from({ length: BODY_POINTS }, () => new THREE.Vector3());
  const tangent = new THREE.Vector3(), side = new THREE.Vector3(), top = new THREE.Vector3(), out = new THREE.Vector3();
  const normal = new THREE.Vector3(), v = new THREE.Vector3(), dir = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), scale = new THREE.Vector3();
  const thickness = u => BODY * Math.min(1, 0.1 + u * 3.2) * (u > 0.96 ? 1 - (u - 0.96) * 4 : 1);

  function update(t, clock, since, charge, dim) {
    group.rotation.y = -CIRCLING * t;
    const flash = since > 0 ? Math.exp(-since * 2.2) : 0;

    // The ring draws in a little as the runes gather, and springs back at the bind.
    const ring = RING * (1 - 0.05 * charge * (1 - smooth(flash > 0 ? 1 - flash : 0)) + 0.03 * flash);
    const sway = 0.035 + 0.02 * flash;

    for (let i = 0; i < BODY_POINTS; i++) {
      const u = i / (BODY_POINTS - 1);
      const s = -length * (1 - u);                     // distance back from the head along the ring
      const angle = HEAD_AT + s / RING;
      pts[i].set(Math.cos(angle) * ring, 0, Math.sin(angle) * ring);
      // calm, like the intro after the bite: still near the head and at the tail tip in its mouth
      const loose = Math.min(1, (1 - u) * 6 + 0.25) * Math.min(1, u * 5);
      const wobble = Math.sin(s * 3.1 - clock * 3.4) * sway * loose;
      out.set(pts[i].x, 0, pts[i].z).normalize();
      pts[i].addScaledVector(out, wobble);
      pts[i].y += Math.cos(s * 2.3 - clock * 2.6) * sway * 0.45 * loose;
    }

    let along = 0, spike = 0;
    for (let i = 0; i < BODY_POINTS; i++) {
      const u = i / (BODY_POINTS - 1), radius = thickness(u);
      if (i > 0) along += pts[i].distanceTo(pts[i - 1]);
      tangent.subVectors(pts[Math.min(BODY_POINTS - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      side.crossVectors(tangent, UP).normalize();
      top.crossVectors(side, tangent).normalize();

      for (let s = 0; s <= SIDES; s++) {
        const a = (s / SIDES) * Math.PI * 2, n = i * (SIDES + 1) + s;
        normal.copy(side).multiplyScalar(Math.cos(a)).addScaledVector(top, Math.sin(a));
        v.copy(pts[i]).addScaledVector(normal, radius);
        positions[n * 3] = v.x; positions[n * 3 + 1] = v.y; positions[n * 3 + 2] = v.z;
        normals[n * 3] = normal.x; normals[n * 3 + 1] = normal.y; normals[n * 3 + 2] = normal.z;
        uvs[n * 2] = along * 5; uvs[n * 2 + 1] = s / SIDES * 2;
      }

      if (i % 2 === 0 && i >= 20 && spike < SPIKES * 2 - 1 && i < BODY_POINTS - 4) {
        out.set(pts[i].x, 0, pts[i].z).normalize();
        const size = radius / BODY * (0.7 + 0.3 * Math.sin(i * 1.7));
        for (const [base, big] of [[top, 1], [out, 0.75]]) {
          dir.copy(base).addScaledVector(tangent, -0.55).normalize();
          q.setFromUnitVectors(UP, dir);
          v.copy(pts[i]).addScaledVector(base, radius * 0.85);
          m.compose(v, q, scale.setScalar(size * big));
          spikes.setMatrixAt(spike++, m);
        }
      }
    }
    spikes.count = spike;
    spikes.instanceMatrix.needsUpdate = true;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    geometry.attributes.uv.needsUpdate = true;

    const neck = pts[BODY_POINTS - 1];
    tangent.subVectors(neck, pts[BODY_POINTS - 3]).normalize();
    side.crossVectors(UP, tangent).normalize();
    top.crossVectors(tangent, side).normalize();
    head.group.position.copy(neck);
    head.group.quaternion.setFromRotationMatrix(m.makeBasis(side, top, tangent));

    // Jaws stay shut on the tail; they clench a little harder at the bind.
    head.setJaw(0.12 - flash * 0.08);
    // The eyes are the last light in the dark.
    head.setGlow((1 + charge * 0.6 + flash * 2) * (1 - smooth((dim - 0.85) / 0.15) * 0.4));

    // Scales catch fire in gold at the bind, then keep a faint ember.
    skin.emissiveIntensity = (flash * 1.4 + (since >= 0 ? 0.12 : 0) + charge * 0.1) * (1 - dim);
    bone.emissiveIntensity = (flash * 0.9 + charge * 0.15) * (1 - dim);

    // A light runs once around the body, tail to head, in the second after the bind.
    runners.forEach((r, k) => {
      const run = since >= 0 ? clamp((since - k * 0.06) / 1.3) : 0;
      const i = Math.min(BODY_POINTS - 1, Math.floor(ease(run) * (BODY_POINTS - 1)));
      r.position.copy(pts[i]);
      r.material.opacity = run > 0 && run < 1 ? Math.sin(run * Math.PI) * (0.9 - k * 0.25) : 0;
      r.scale.setScalar(0.55 - k * 0.12);
    });
  }

  return { group, update };
}

/* ====================== sparks, runes ====================== */

// Gold sparks bursting out of the bind rune, slowing down as they drift and fade.
function makeSparks() {
  const N = 260, positions = new Float32Array(N * 3), dirs = [];
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < N; i++) {
    const d = new THREE.Vector3(random() - 0.5, random() - 0.5, (random() - 0.5) * 0.4).normalize();
    dirs.push(d.multiplyScalar(1.2 + random() * 2.8));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    map: glowTexture(), color: '#ffd77a', size: 0.08, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  }));
  points.renderOrder = 13;
  points.frustumCulled = false;
  return {
    points,
    update(since, center, dim) {
      points.visible = since > 0;
      if (since <= 0) return;
      const travel = (1 - Math.exp(-since * 1.6)) / 1.6;     // fast at first, then drifting
      dirs.forEach((d, i) => {
        positions[i * 3] = center.x + d.x * travel;
        positions[i * 3 + 1] = center.y + d.y * travel - since * since * 0.03;   // a little settling
        positions[i * 3 + 2] = center.z + d.z * travel;
      });
      geometry.attributes.position.needsUpdate = true;
      points.material.opacity = Math.exp(-since * 0.55) * (1 - dim);
    },
  };
}

// One rune, drawn like the intro's but with a soft glow around it (for the flying runes).
function runeOnlyTexture(glyph) {
  return drawRunes([RUNE_LINES[glyph] || RUNE_LINES['ᚼ']], 256, false);
}

// The bind rune: every place's rune drawn on top of each other in one sign, inside a thin ring
// (the serpent around the world). This is what "bindrune" means.
function bindRuneTexture(glyphs) {
  return drawRunes(glyphs.map(g => RUNE_LINES[g] || []), 512, true);
}

function drawRunes(shapes, size, ring) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const k = size / 256;
  const stroke = (color, width, blur) => {
    ctx.strokeStyle = color; ctx.lineWidth = width * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = COLORS.runeGlow; ctx.shadowBlur = blur * k;
    for (const lines of shapes) {
      for (const [x1, y1, x2, y2] of lines) {
        ctx.beginPath(); ctx.moveTo((68 + x1 * 120) * k, (58 + y1 * 140) * k); ctx.lineTo((68 + x2 * 120) * k, (58 + y2 * 140) * k); ctx.stroke();
      }
    }
    if (ring) { ctx.beginPath(); ctx.arc(128 * k, 128 * k, 112 * k, 0, Math.PI * 2); ctx.lineWidth = width * 0.35 * k; ctx.stroke(); }
  };
  stroke(COLORS.runeGlow, 20, 30);   // glow
  stroke('#fff6d8', 8, 0);           // bright core
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- small maths helpers ---------- */

const clamp = x => Math.min(1, Math.max(0, x));
const smooth = x => { const c = clamp(x); return c * c * (3 - 2 * c); };   // 0..1, easing in and out
const ease = x => { const c = clamp(x); return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2; };   // stronger ease in-out
