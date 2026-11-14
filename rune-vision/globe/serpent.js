/*
  Jörmungandr: the ONE serpent of the journey. There is only ever one of it on the globe.

  It starts at the home stone (Jelling). Every time a stone is solved its head slithers on from the
  stone it reached last to the new one and coils around it; the body it already laid down stays.
  When the journey is complete the head goes back to Jelling and bites its own tail, closing the ring
  (the same picture as the intro).

  How it works:
    1. follow(stops) works out the whole route once: for each leg over the globe, then a coil around the stone.
       The route only ever grows, so the part the serpent already lies on never moves.
    2. Every frame we build a tube along the part of the route the head has reached so far,
       thin at the tail, thick in the body, and swaying side to side so it looks alive.
    3. A head (with glowing eyes) sits at the front of the tube, looking where it is going.
*/
import * as THREE from './lib/three/three.module.js';
import { COLORS, SERPENT, STONE } from './settings.js';
import { angleBetween, pointBetween, offset } from './geo.js';

const SIDES = 12;          // how round the body is (corners around the tube)
const TRAVEL_STEPS = 140;  // route points over the globe, per leg
const COIL_STEPS = 32;     // route points per turn of the coil
const TAIL_POINTS = 70;    // how many route points the tail takes to reach full thickness
const MAX_POINTS = 1200;   // room in the buffers (3 legs use about 640)

export class Serpent {
  constructor(globe) {
    this.globe = globe;
    this.route = [];        // [{ pos, lat, lng, alt, travel, u, side }]
    this.key = '';          // which stops the route was built for ("jelling>yorba|ring")
    this.from = 0;          // the head glides from route point `from`...
    this.to = 0;            // ...to route point `to`...
    this.start = 0;         // ...starting at this time
    this.ms = SERPENT.travelMs;

    // One buffer big enough for the whole serpent; each frame we fill in only what is visible.
    this.positions = new Float32Array(MAX_POINTS * (SIDES + 1) * 3);
    this.normals = new Float32Array(MAX_POINTS * (SIDES + 1) * 3);
    this.uvs = new Float32Array(MAX_POINTS * (SIDES + 1) * 2);
    const index = [];
    for (let r = 0; r < MAX_POINTS - 1; r++) {
      for (let s = 0; s < SIDES; s++) {
        const a = r * (SIDES + 1) + s, b = a + SIDES + 1;
        index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    this.geometry.setIndex(index);
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.MeshStandardMaterial({ map: scaleTexture(), roughness: 0.55, metalness: 0.25 });
    this.body = new THREE.Mesh(this.geometry, this.material);
    this.body.frustumCulled = false;                    // its size changes every frame
    this.head = makeHead(this.material);
    this.body.visible = this.head.visible = false;      // nothing to show until there are 2 stops

    globe.scene().add(this.body, this.head);
  }

  // Where the serpent should be. stops: the places it has reached, in order (first = home).
  // ring: true once the journey is complete, so the head goes back home and bites its tail.
  follow(stops, ring, now) {
    const key = stops.map(p => p.name).join('>') + (ring ? '|ring' : '');
    if (key === this.key) return;
    // Growing = the same stops as before plus one more (or plus the ring). The route is built the same way
    // every time, so the part it already lies on stays exactly where it was.
    const grows = this.key !== '' && !this.key.endsWith('|ring') && key.startsWith(this.key);
    const reach = this.reach(now);

    this.key = key;
    this.route = stops.length >= 2 ? buildRoute(this.globe, stops, ring) : [];
    this.body.visible = this.head.visible = this.route.length > 0;

    // Growing: the head carries on from where it is now. Anything else (a new visitor): start from the beginning.
    this.from = grows ? Math.min(reach, this.route.length - 1) : 0;
    this.to = Math.max(0, this.route.length - 1);
    this.start = now;
    this.ms = SERPENT.travelMs;          // each leg takes this long
  }

  // How far along the route the head is (in route points) at this time.
  reach(now) {
    if (!this.route.length) return 0;
    const t = Math.min(1, (now - this.start) / this.ms);
    return this.from + (this.to - this.from) * t;
  }

  // True once the head has arrived where follow() sent it (for the ring: the jaws are on the tail).
  arrived(now) { return this.route.length > 0 && now - this.start >= this.ms; }

  // Called every frame.
  update(now) {
    if (!this.route.length) return;
    const reach = Math.max(2, this.reach(now));         // at least a tiny bit of body
    const last = Math.floor(reach);

    // The points of the visible part, swaying sideways on the travel parts.
    const pts = [];
    for (let i = 0; i <= last; i++) pts.push(this.swayed(i, now));
    const frac = reach - last;
    if (frac > 0 && last + 1 < this.route.length) {
      pts.push(pts[last].clone().lerp(this.swayed(last + 1, now), frac));
    }

    this.buildTube(pts);

    // Head at the front, looking forward, with its top towards the sky.
    const tip = pts[pts.length - 1], before = pts[pts.length - 2];
    this.head.position.copy(tip);
    this.head.up.copy(tip).normalize();
    this.head.lookAt(tip.clone().add(tip.clone().sub(before)));
  }

  // Route point i, moved sideways by a travelling wave (only while crossing the globe, not in the coil).
  swayed(i, now) {
    const p = this.route[i];
    if (!p.travel) return p.pos.clone();
    const envelope = Math.sin(Math.PI * p.u);                    // no sway at the two ends of a leg
    const wave = Math.sin(p.u * 28 - now / 260) * SERPENT.wiggle * envelope;
    return p.pos.clone().addScaledVector(p.side, wave);
  }

  // Fill the tube buffers along the points: thin tail, full body, slightly narrower neck.
  buildTube(pts) {
    const n = Math.min(pts.length, MAX_POINTS);
    let length = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) length += pts[i].distanceTo(pts[i - 1]);
      const radius = SERPENT.radius * Math.min(1, 0.15 + 0.85 * i / TAIL_POINTS) * (i > n - 7 ? 0.85 : 1);

      const tangent = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
      const up = pts[i].clone().normalize();
      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const top = new THREE.Vector3().crossVectors(side, tangent).normalize();

      for (let s = 0; s <= SIDES; s++) {
        const a = (s / SIDES) * Math.PI * 2;
        const normal = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(top, Math.sin(a));
        const k = (i * (SIDES + 1) + s);
        const v = pts[i].clone().addScaledVector(normal, radius);
        this.positions.set([v.x, v.y, v.z], k * 3);
        this.normals.set([normal.x, normal.y, normal.z], k * 3);
        this.uvs.set([length / 6, s / SIDES], k * 2);
      }
    }
    this.geometry.setDrawRange(0, (n - 1) * SIDES * 6);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
  }

  remove() {
    this.globe.scene().remove(this.body, this.head);
    this.geometry.dispose();
  }
}

/* ---------- the route ---------- */

// stops: places in order. ring: after the last stop, go back to the first one and end at the tail.
function buildRoute(globe, stops, ring) {
  const route = [];
  const ground = (SERPENT.radius + 0.3) / 100;                 // just touching the ground
  const stoneTop = STONE.height / 100;
  const add = (p, alt, travel, u = 0) => {
    const c = globe.getCoords(p.lat, p.lng, alt);
    route.push({ pos: new THREE.Vector3(c.x, c.y, c.z), lat: p.lat, lng: p.lng, alt, travel, u });
  };

  // The tail lies on the ground beside the home stone, on the side facing the first trip.
  const home = stops[0];
  const tail = offset(home, SERPENT.coilRadius, bearing(home, stops[1]));
  add(tail, ground, true, 0);

  for (let k = 1; k < stops.length; k++) leg(route, add, route[route.length - 1], stops[k], true, ground, stoneTop);

  // Closing the ring: back home, stopping just short of the tail so the jaws close on it.
  if (ring) {
    const lastPoint = route[route.length - 1];
    const headLength = SERPENT.radius * 2.6 / 100;              // radians: roughly the length of the head
    const gap = Math.min(0.5, headLength / Math.max(1e-6, angleBetween(lastPoint, tail)));
    leg(route, add, lastPoint, pointBetween(tail, lastPoint, gap), false, ground, stoneTop);
  }

  // Sideways direction at each point (for the swaying).
  route.forEach((p, i) => {
    const next = route[Math.min(route.length - 1, i + 1)].pos, prev = route[Math.max(0, i - 1)].pos;
    const tangent = next.clone().sub(prev).normalize();
    p.side = new THREE.Vector3().crossVectors(tangent, p.pos.clone().normalize()).normalize();
  });
  return route;
}

// One leg: from the last route point over the globe to `to`. coil = true: wrap around the stone there.
function leg(route, add, start, to, coil, ground, stoneTop) {
  // Where it arrives: on the edge of the coil, on the side facing where it came from.
  const dir = coil ? bearing(to, start) : 0;
  const arrive = coil ? offset(to, SERPENT.coilRadius, dir) : to;

  // Over the globe, along the shortest route, arching higher for longer trips.
  // It starts at the height it is at now (the top of the last coil) and comes down to the ground.
  const height = SERPENT.height * angleBetween(start, arrive) / Math.PI;
  for (let i = 1; i <= TRAVEL_STEPS; i++) {
    const t = i / TRAVEL_STEPS;
    const settle = start.alt + (ground - start.alt) * Math.min(1, t * 4);
    add(pointBetween(start, arrive, t), settle + height * Math.sin(Math.PI * t), true, t);
  }

  // Around the stone, climbing up it.
  if (coil) {
    const steps = Math.round(SERPENT.coilTurns * COIL_STEPS);
    for (let i = 1; i <= steps; i++) {
      const angle = dir + (i / COIL_STEPS) * Math.PI * 2;
      const climb = ground + (stoneTop * 0.75 - ground) * (i / steps);
      add(offset(to, SERPENT.coilRadius, angle), climb, false);
    }
  }
}

// Compass direction from place a towards place b (0 = north, PI/2 = east), measured right at a.
function bearing(a, b) {
  const near = pointBetween(a, b, 0.02);
  return Math.atan2((near.lng - a.lng) * Math.cos(a.lat * Math.PI / 180), near.lat - a.lat);
}

/* ---------- looks ---------- */

function makeHead(bodyMaterial) {
  const head = new THREE.Group();
  const r = SERPENT.radius;

  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bodyMaterial);
  skull.scale.set(r * 1.25, r * 0.85, r * 2.1);        // wide, flat and long
  skull.position.z = r * 0.6;
  head.add(skull);

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: COLORS.eyes });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 10, 8), eyeMaterial);
    eye.position.set(side * r * 0.8, r * 0.45, r * 1.3);
    head.add(eye);
  }
  return head;
}

// Overlapping scales: dark green with bronze edges, repeated along the body.
function scaleTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.scales; ctx.fillRect(0, 0, 128, 128);
  const size = 32;
  for (let row = -1; row < 5; row++) {
    for (let col = -1; col < 5; col++) {
      const x = col * size + (row % 2 ? size / 2 : 0), y = row * size * 0.75;
      const g = ctx.createRadialGradient(x + size / 2, y, 2, x + size / 2, y, size * 0.7);
      g.addColorStop(0, '#4f7a3a'); g.addColorStop(1, COLORS.scales);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x + size / 2, y, size / 2, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = COLORS.scaleEdge; ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
