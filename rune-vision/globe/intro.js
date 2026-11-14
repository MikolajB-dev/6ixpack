/*
  The Bindrune intro: a short film that plays on top of the page before the game starts.

    Jörmungandr spirals in around a small parchment globe and bites its own tail.
    A gold shockwave rolls out, the 3 places light up with their runes, gold arcs join them,
    and the title fades in. Then everything fades away and the game underneath is shown.

  Use it from any page:
      import { playIntro } from './intro.js';
      playIntro();                         // or playIntro({ title: 'BINDRUNE', speed: 1.5 })

  Options:
      title        the word under the globe            (default TITLE in settings below)
      transparent  no dark background                  (default false)
      hold         stay on the last frame, no fade-out (default false)
      loop         play again and again                (default false)
      speed        1 = normal, 2 = twice as fast       (default 1)
      parent       element to put the intro in         (default document.body)

  playIntro() gives back a promise that finishes when the intro is over. It also has
  .skip() (jump to the bite), .close() (stop now) and .replay().
  Click, Space or Esc skips to the bite. When it is over the window gets an 'intro:done' event,
  and a parent page (if this page is inside an iframe) gets the message { type: 'intro:done' }.

  It reuses the globe's own files (settings.js, parchment.js, img/countries.geojson, lib/three),
  so it looks like the globe and works without internet.
*/
import * as THREE from './lib/three/three.module.js';
import { COLORS, PLACES } from './settings.js';
import { drawParchmentMap } from './parchment.js';

export const TITLE = 'BINDRUNE';     // the name of the game

// When things happen, in seconds from the start.
const T = {
  fadeIn: 0.9,        // the scene has faded in
  bite: 6.2,          // the jaws close on the tail
  places: 6.6,        // first place lights up (the others follow, 0.35 s apart)
  arcs: 7.6,          // gold arcs start growing
  title: 8.3,         // title starts fading in
  fadeOut: 11.3,      // everything starts fading out
  end: 12.5,
};

const RING = 1.55;            // how far from the globe's centre the serpent lies (globe radius = 1)
export const BODY = 0.11;            // body thickness
const CIRCLING = 0.35;        // how fast the serpent keeps circling after the bite (radians per second)
const BODY_POINTS = 220;      // points along the body
const SIDES = 14;             // corners around the body
const UP = new THREE.Vector3(0, 1, 0);

export function playIntro(options = {}) {
  const opt = { title: TITLE, transparent: false, hold: false, loop: false, speed: 1, parent: document.body, ...options };
  if (!(opt.speed > 0)) opt.speed = 1;

  /* ---------- the page layer ---------- */

  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;z-index:1000;overflow:hidden;cursor:pointer;' +
    (opt.transparent ? '' : `background:radial-gradient(ellipse at 50% 42%, #2a1a0d 0%, ${COLORS.background} 55%, #0b0704 100%);`);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0';

  const title = document.createElement('div');
  title.style.cssText = 'position:absolute;left:0;right:0;bottom:9vh;text-align:center;opacity:0;pointer-events:none;' +
    'font-family:Georgia,"Times New Roman",serif;color:#e3b955';
  const word = document.createElement('div');
  word.textContent = opt.title;
  word.style.cssText = 'font-size:clamp(34px,7.2vw,112px);letter-spacing:.3em;padding-left:.3em;line-height:1;' +
    'text-shadow:0 0 18px rgba(227,185,85,.55),0 0 46px rgba(214,165,72,.35)';
  // A thin gold line with a small diamond in the middle, under the title.
  const rule = document.createElement('div');
  rule.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:18px;margin-top:3.2vh';
  const line = side => `<span style="width:min(22vw,260px);height:1px;background:linear-gradient(${side},transparent,#b8963a)"></span>`;
  rule.innerHTML = line('90deg') + '<span style="width:9px;height:9px;border:1px solid #e3b955;transform:rotate(45deg)"></span>' + line('270deg');
  title.append(word, rule);

  layer.append(canvas, title);
  opt.parent.append(layer);

  /* ---------- the 3D scene ---------- */

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight('#ffe2b0', 0.75));
  const sun = new THREE.DirectionalLight('#fff1d0', 2.2);
  sun.position.set(-3, 4, 5);
  const rim = new THREE.PointLight('#ffb84a', 30, 20);
  rim.position.set(4, -1, -3);
  scene.add(sun, rim);

  // Dust in the air.
  const dust = makeDust();
  scene.add(dust);

  // Warm glow behind the globe.
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: COLORS.glow, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(3.6);
  halo.renderOrder = -1;
  scene.add(halo);

  // The globe. It leans towards us so the 3 places (all in the north) stay in view while it turns.
  const tilt = new THREE.Group();
  tilt.rotation.x = THREE.MathUtils.degToRad(62);
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshStandardMaterial({ color: COLORS.paper, roughness: 0.85, metalness: 0.05 }));
  tilt.add(globe);
  scene.add(tilt);

  const markers = Object.values(PLACES).map(place => makeMarker(place));
  markers.forEach(m => globe.add(m.group));
  const arcs = makeArcs(Object.values(PLACES));
  arcs.forEach(a => globe.add(a));

  // The serpent lies in a tilted ring, like the ring of a planet.
  const ringPlane = new THREE.Group();
  ringPlane.rotation.set(0.36, 0, -0.26);
  const serpent = makeSerpent();
  ringPlane.add(serpent.group);
  scene.add(ringPlane);

  // The shockwave: a thin gold ring that grows from the globe, facing us.
  const wave = new THREE.Mesh(
    new THREE.RingGeometry(0.982, 1, 128),
    new THREE.MeshBasicMaterial({ color: '#ffd77a', transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  scene.add(wave);

  function resize() {
    const w = layer.clientWidth || window.innerWidth, h = layer.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Far enough back that the whole serpent fits, also on a tall, narrow screen.
    const distance = 7.8 * Math.max(1, 1.25 / camera.aspect);
    camera.position.set(0, 0.5, distance);
    camera.lookAt(0, -0.42, 0);            // look a little below the globe, so it sits above the title
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- the clock ---------- */

  let t = 0;                 // seconds into the intro
  let last = null;           // time of the previous frame
  let ready = false;         // the map has been drawn
  let finished = false;      // reached the end (and maybe holding the last frame)
  let closed = false;
  let frame = 0;
  let resolve;
  const promise = new Promise(r => { resolve = r; });

  // Draw the parchment map, then start. If the map can't be loaded the globe stays plain paper.
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

    if (t >= T.end && !opt.hold) {
      if (opt.loop) t = 0;
      else return close();
    }
    if (opt.hold && t >= T.fadeOut) {          // stay on the last frame
      if (opt.loop && t >= T.end + 2) t = 0;
      else if (!finished) { finished = true; announce(); }
    }
    draw(now / 1000);
  }

  // Everything on screen is worked out from the time t, so skipping and replaying just change t.
  function draw(clock) {
    const show = t < T.fadeOut || opt.hold ? smooth(t / T.fadeIn) : 1 - smooth((t - T.fadeOut) / (T.end - T.fadeOut));
    canvas.style.opacity = show;
    title.style.opacity = smooth((t - T.title) / 1.2) * show;
    title.style.transform = `translateY(${(1 - smooth((t - T.title) / 1.6)) * 14}px)`;

    globe.rotation.y = 1.9 + clock * 0.1;
    dust.rotation.y = clock * 0.012;

    serpent.update(t, clock);

    // The bite: a flash in the glow, and the shockwave.
    const since = t - T.bite;
    const flash = since > 0 ? Math.exp(-since * 2.2) : 0;
    halo.material.opacity = 0.5 + 0.06 * Math.sin(clock * 1.3) + flash * 0.5;
    halo.scale.setScalar(3.6 + flash * 1.2);
    const grow = clamp(since / 1.5);
    wave.visible = since > 0 && grow < 1;
    wave.scale.setScalar(1 + grow * 4.5);
    wave.material.opacity = (1 - grow) * 0.9;
    wave.quaternion.copy(camera.quaternion);

    markers.forEach((m, i) => m.update(clamp((t - T.places - i * 0.35) / 0.6), clock));
    arcs.forEach((a, i) => a.grow(smooth((t - T.arcs - i * 0.25) / 1.1)));

    renderer.render(scene, camera);
  }

  /* ---------- skip, close, replay ---------- */

  function skip() { if (t < T.bite - 0.25) t = T.bite - 0.25; }

  function announce() {
    window.dispatchEvent(new CustomEvent('intro:done'));
    if (window.parent !== window) window.parent.postMessage({ type: 'intro:done' }, '*');
  }

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
    if (t >= T.bite - 0.25) return;        // nothing left to skip: let the game have the key
    e.preventDefault();
    e.stopPropagation();
    skip();
  }
  layer.addEventListener('click', skip);
  window.addEventListener('keydown', onKey, true);

  frame = requestAnimationFrame(tick);

  promise.skip = skip;
  promise.close = close;
  promise.replay = () => closed ? playIntro(options) : (t = 0, finished = false, promise);
  return promise;
}

/* ====================== the serpent ====================== */

function makeSerpent() {
  const group = new THREE.Group();
  const path = makePath();
  const length = 2 * Math.PI * RING - 0.2;       // a full circle, minus the bit the head covers: the tail tip ends in its mouth

  const skin = new THREE.MeshStandardMaterial({ map: scaleTexture(), roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide });
  const bone = new THREE.MeshStandardMaterial({ color: '#dcc592', roughness: 0.45, metalness: 0.3 });

  // The body: one tube that is rebuilt every frame along the part of the path the serpent is on.
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

  // Spikes: one row along the back and one along the outer side.
  const SPIKES = 84;
  const spikeShape = new THREE.ConeGeometry(0.03, 0.24, 5);
  spikeShape.translate(0, 0.12, 0);                 // so a spike stands on its base
  const spikes = new THREE.InstancedMesh(spikeShape, bone, SPIKES * 2);
  spikes.frustumCulled = false;

  const head = makeHead(skin, bone);
  group.add(body, spikes, head.group);

  // Scratch objects, reused every frame.
  const pts = Array.from({ length: BODY_POINTS }, () => new THREE.Vector3());
  const tangent = new THREE.Vector3(), side = new THREE.Vector3(), top = new THREE.Vector3(), out = new THREE.Vector3();
  const normal = new THREE.Vector3(), v = new THREE.Vector3(), dir = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), scale = new THREE.Vector3();

  // How thick the body is at u (0 = tail tip, 1 = neck).
  const thickness = u => BODY * Math.min(1, 0.1 + u * 3.2) * (u > 0.96 ? 1 - (u - 0.96) * 4 : 1);

  function update(t, clock) {
    // Where the head is along the path. It glides in, pauses for a moment, then lunges at its tail.
    const k = clamp((t - 0.2) / (T.bite - 0.2));
    const progress = k < 0.88 ? 0.93 * smooth(k / 0.88) : 0.93 + 0.07 * ((k - 0.88) / 0.12) ** 2;
    const headAt = progress * path.length;

    // It sways a lot while it swims in, and less once it has bitten.
    const calm = smooth((t - T.bite + 0.6) / 1.2);
    const sway = 0.1 * (1 - calm) + 0.035;

    // After the bite it does not lie still: the whole ring keeps turning, the head chasing its own tail.
    const after = Math.max(0, t - T.bite);
    group.rotation.y = -CIRCLING * (after - (1 - Math.exp(-after * 1.5)) / 1.5);    // starts gently, then steady

    for (let i = 0; i < BODY_POINTS; i++) {
      const u = i / (BODY_POINTS - 1);
      const s = headAt - length * (1 - u);
      path.at(s, pts[i]);
      // less sway near the head, and (after the bite) near the tail tip, so it stays in the mouth
      const loose = Math.min(1, (1 - u) * 6 + 0.25) * (1 - calm * (1 - Math.min(1, u * 5)));
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

      // A pair of spikes every few points, leaning back towards the tail.
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

    // The head sits on the front of the body, looking where it is going.
    const neck = pts[BODY_POINTS - 1];
    tangent.subVectors(neck, pts[BODY_POINTS - 3]).normalize();
    side.crossVectors(UP, tangent).normalize();
    top.crossVectors(tangent, side).normalize();
    head.group.position.copy(neck);
    head.group.quaternion.setFromRotationMatrix(m.makeBasis(side, top, tangent));

    // Jaws: open wide before the lunge, snap shut on the tail.
    const open = smooth((k - 0.7) / 0.18) * (1 - smooth((k - 0.965) / 0.035));
    head.setJaw(0.12 + open * 0.75);
    head.setGlow(1 + (t > T.bite ? Math.exp(-(t - T.bite) * 2) * 2 : 0));
  }

  return { group, update };
}

// The route of the head: a long spiral in from far behind the globe, then once around the ring.
// Returned as a table of points at equal distances, so "the point s units along" is a quick lookup.
function makePath() {
  const END = 0.62;                                  // where on the ring the head ends up (front right)
  const SPIRAL = END + Math.PI / 2 + Math.PI * 2;    // length of the spiral part, in radians: starts straight behind the globe
  const TOTAL = SPIRAL + Math.PI * 2.05;
  const raw = [];
  for (let i = 0; i <= 3000; i++) {
    const a = (i / 3000) * TOTAL;
    const far = Math.max(0, 1 - a / SPIRAL) ** 2;    // 1 at the start, 0 once it is on the ring
    const radius = RING + far * 6.5, angle = END - TOTAL + a;
    raw.push(new THREE.Vector3(Math.cos(angle) * radius, far * 2.6, Math.sin(angle) * radius));
  }
  // Re-sample at equal steps.
  const lengths = [0];
  for (let i = 1; i < raw.length; i++) lengths.push(lengths[i - 1] + raw[i].distanceTo(raw[i - 1]));
  const length = lengths[lengths.length - 1], STEPS = 2400, table = [];
  for (let i = 0, j = 0; i <= STEPS; i++) {
    const s = (i / STEPS) * length;
    while (j < raw.length - 2 && lengths[j + 1] < s) j++;
    table.push(raw[j].clone().lerp(raw[j + 1], (s - lengths[j]) / (lengths[j + 1] - lengths[j] || 1)));
  }
  const startDir = table[1].clone().sub(table[0]).normalize();
  return {
    length,
    // Point s units along the path, written into `target`. Before the start it carries on in a straight line.
    at(s, target) {
      if (s <= 0) return target.copy(table[0]).addScaledVector(startDir, s);
      const f = Math.min(STEPS - 0.0001, (s / length) * STEPS), i = Math.floor(f);
      return target.copy(table[i]).lerp(table[i + 1], f - i);
    },
  };
}

// The head. It is built looking along +z, with +y up. Sizes are in body thicknesses (r).
export function makeHead(skin, bone) {
  const group = new THREE.Group();
  const r = BODY * 1.15;
  const ball = (material, sx, sy, sz, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
    mesh.scale.set(sx * r, sy * r, sz * r);
    mesh.position.set(x * r, y * r, z * r);
    parent.add(mesh);
    return mesh;
  };
  const cone = (radius, height, x, y, z, rx, rz, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius * r, height * r, 6), bone);
    mesh.position.set(x * r, y * r, z * r);
    mesh.rotation.set(rx, 0, rz);
    parent.add(mesh);
    return mesh;
  };

  ball(skin, 1.45, 1.1, 1.9, 0, 0.1, 0.9);              // skull
  ball(skin, 1.6, 0.55, 0.9, 0, 0.75, 0.9);             // brow ridge
  ball(skin, 1.1, 0.55, 2.0, 0, 0.3, 2.9);              // snout (upper jaw)
  for (const sideways of [-1, 1]) ball(bone, 0.16, 0.12, 0.2, sideways * 0.45, 0.62, 4.5);   // nostrils

  // Lower jaw: hangs from a hinge at the back of the skull.
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.25 * r, 0.6 * r);
  group.add(jaw);
  ball(skin, 0.95, 0.38, 2.0, 0, -0.2, 2.1, jaw);

  // Teeth: a row on each side, upper ones pointing down, lower ones pointing up. Two long fangs in front.
  for (const sideways of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const z = 1.9 + i * 0.5, x = sideways * (0.95 - i * 0.09);
      cone(0.1, 0.5, x, -0.12, z, Math.PI, 0);
      cone(0.09, 0.42, x * 0.92, 0.22, z - 1.45, 0, 0, jaw);
    }
    cone(0.14, 0.95, sideways * 0.4, -0.3, 4.55, Math.PI, 0);
  }

  // Eyes: bright gold, with a soft glow around them.
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: COLORS.eyes });
  const glow = new THREE.SpriteMaterial({ map: glowTexture(), color: COLORS.eyes, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const sideways of [-1, 1]) {
    const eye = ball(eyeMaterial, 0.26, 0.2, 0.34, sideways * 1.15, 0.72, 1.75);
    const shine = new THREE.Sprite(glow);
    shine.scale.setScalar(3.2);
    eye.add(shine);
  }

  // Horns: two long ones sweeping back, with shorter ones behind and on the cheeks.
  for (const sideways of [-1, 1]) {
    const horn = (from, bend, to, thick) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(sideways * from[0], from[1], from[2]).multiplyScalar(r),
        new THREE.Vector3(sideways * bend[0], bend[1], bend[2]).multiplyScalar(r),
        new THREE.Vector3(sideways * to[0], to[1], to[2]).multiplyScalar(r));
      group.add(new THREE.Mesh(taperedTube(curve, thick * r), bone));
    };
    horn([0.8, 0.9, 0.7], [1.9, 2.6, 0.2], [1.7, 3.3, -3.4], 0.34);     // main horn
    horn([1.1, 0.5, 0.2], [2.4, 1.2, -0.4], [2.5, 1.4, -2.6], 0.24);    // second horn
    horn([1.3, -0.1, 0.9], [2.3, -0.3, 0.6], [2.6, -0.2, -1.2], 0.18);  // cheek spike
    horn([1.2, -0.4, 1.6], [1.9, -0.9, 1.5], [2.1, -1.0, 0.2], 0.14);   // lower cheek spike
  }
  for (let i = 0; i < 4; i++) cone(0.17, 1.3 - i * 0.15, 0, 1.45 - i * 0.12, 0.5 - i * 0.75, -0.75, 0);   // crest

  return {
    group,
    setJaw(angle) { jaw.rotation.x = angle; },
    setGlow(amount) { glow.opacity = Math.min(1, 0.55 * amount); },
  };
}

// A tube along a curve that gets thinner towards the end (for horns).
function taperedTube(curve, thick, steps = 14, sides = 7) {
  const positions = [], index = [];
  const ref = new THREE.Vector3(1, 0, 0), a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, p = curve.getPoint(u), tangent = curve.getTangent(u);
    a.crossVectors(tangent, ref).normalize();
    b.crossVectors(tangent, a).normalize();
    const radius = thick * (1 - u) + 0.0005;
    for (let s = 0; s < sides; s++) {
      const angle = (s / sides) * Math.PI * 2;
      positions.push(
        p.x + (a.x * Math.cos(angle) + b.x * Math.sin(angle)) * radius,
        p.y + (a.y * Math.cos(angle) + b.y * Math.sin(angle)) * radius,
        p.z + (a.z * Math.cos(angle) + b.z * Math.sin(angle)) * radius);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let s = 0; s < sides; s++) {
      const p = i * sides + s, n = i * sides + (s + 1) % sides;
      index.push(p, p + sides, n, n, p + sides, n + sides);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/* ====================== places, runes and arcs ====================== */

// A point on the unit globe. Matches how three.js wraps a flat map around a sphere.
export function onGlobe(lat, lng, radius = 1) {
  const la = lat * Math.PI / 180, lo = lng * Math.PI / 180;
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(radius);
}

// One place: a gold spark on the ground and its rune floating above it.
export function makeMarker(place) {
  const group = new THREE.Group();
  const sprite = (map, color) => new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const spark = sprite(glowTexture(), COLORS.runeGlow);
  spark.position.copy(onGlobe(place.lat, place.lng, 1.01));
  const rune = sprite(runeTexture(place.rune), '#ffffff');
  rune.position.copy(onGlobe(place.lat, place.lng, 1.3));
  // A thin beam of light from the ground up to the rune.
  const beam = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([onGlobe(place.lat, place.lng, 1), onGlobe(place.lat, place.lng, 1.2)]),
    new THREE.LineBasicMaterial({ color: COLORS.runeGlow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
  group.add(spark, rune, beam);
  return {
    group,
    // lit: 0 = dark, 1 = fully lit. It flares up brightly, then settles.
    update(lit, clock) {
      const flare = Math.sin(Math.min(1, lit) * Math.PI) * 0.6;
      spark.material.opacity = lit;
      spark.scale.setScalar(0.2 + flare * 0.5 + 0.02 * Math.sin(clock * 4 + place.lat));
      rune.material.opacity = lit;
      rune.scale.setScalar(0.3 * (0.6 + 0.4 * lit) + flare * 0.1);
      beam.material.opacity = lit * 0.7;
    },
  };
}

// Gold arcs between every pair of places, arching over the globe.
export function makeArcs(places) {
  const arcs = [];
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      const a = onGlobe(places[i].lat, places[i].lng), b = onGlobe(places[j].lat, places[j].lng);
      const angle = a.angleTo(b), points = [], STEPS = 48;
      for (let k = 0; k <= STEPS; k++) {
        const u = k / STEPS;
        // straight line between the two, pushed out to the surface and then lifted in the middle
        points.push(a.clone().lerp(b, u).normalize().multiplyScalar(1.015 + 0.3 * (angle / Math.PI) * Math.sin(Math.PI * u)));
      }
      const SEGMENTS = 96, SIDES_ARC = 6;
      const arc = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), SEGMENTS, 0.008, SIDES_ARC),
        new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
      arc.geometry.setDrawRange(0, 0);
      arc.grow = amount => arc.geometry.setDrawRange(0, Math.floor(amount * SEGMENTS) * SIDES_ARC * 6);   // amount: 0..1
      arcs.push(arc);
    }
  }
  return arcs;
}

/* ====================== looks ====================== */

// Runes are straight lines, so we draw them ourselves (no special font needed). Same shapes as runestone.js.
// Each line is [x1, y1, x2, y2] in a 0..1 box, y going down.
export const RUNE_LINES = {
  'ᚼ': [[0.5, 0, 0.5, 1], [0.2, 0.25, 0.8, 0.75], [0.8, 0.25, 0.2, 0.75]],   // hagall
  'ᚢ': [[0.3, 1, 0.3, 0], [0.3, 0, 0.75, 0.35], [0.75, 0.35, 0.75, 1]],      // ur
  'ᛏ': [[0.5, 0, 0.5, 1], [0.5, 0, 0.2, 0.35], [0.5, 0, 0.8, 0.35]],         // tyr
};

export function runeTexture(glyph) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const lines = RUNE_LINES[glyph] || RUNE_LINES['ᚼ'];
  const stroke = (color, width, blur) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.shadowColor = COLORS.runeGlow; ctx.shadowBlur = blur;
    for (const [x1, y1, x2, y2] of lines) {
      ctx.beginPath(); ctx.moveTo(68 + x1 * 120, 58 + y1 * 140); ctx.lineTo(68 + x2 * 120, 58 + y2 * 140); ctx.stroke();
    }
  };
  stroke(COLORS.runeGlow, 20, 30);   // glow
  stroke('#fff6d8', 8, 0);           // bright core
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A soft round glow, white in the middle. Coloured by the material that uses it.
export function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Overlapping scales: dark green with bronze edges, repeated along the body.
export function scaleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.scales; ctx.fillRect(0, 0, 128, 128);
  const size = 32;
  for (let row = -1; row < 7; row++) {
    for (let col = -1; col < 5; col++) {
      const x = col * size + (row % 2 ? size / 2 : 0), y = row * size * 0.5;
      const g = ctx.createRadialGradient(x + size / 2, y, 2, x + size / 2, y, size * 0.7);
      g.addColorStop(0, '#5d8a42'); g.addColorStop(1, COLORS.scales);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x + size / 2, y, size / 2, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = COLORS.scaleEdge; ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A few hundred faint gold specks floating around the scene.
export function makeDust() {
  const positions = [];
  let seed = 11;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 420; i++) {
    const radius = 4 + random() * 14, a = random() * Math.PI * 2, y = (random() - 0.5) * 16;
    positions.push(Math.cos(a) * radius, y, Math.sin(a) * radius - 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ map: glowTexture(), color: '#d6b070', size: 0.09, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
}

/* ---------- small maths helpers ---------- */

const clamp = x => Math.min(1, Math.max(0, x));
const smooth = x => { const c = clamp(x); return c * c * (3 - 2 * c); };   // 0..1, easing in and out
