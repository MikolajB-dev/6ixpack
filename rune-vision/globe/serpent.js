/*
  Jörmungandr: one serpent that slithers from one place to another and coils around the stone there.

  How it works:
    1. When it is created we work out its whole route once (`route`): over the globe, then a coil.
    2. Every frame we build a tube along the part of the route it has reached so far,
       thin at the tail, thick in the body, and swaying side to side so it looks alive.
    3. A head (with glowing eyes) sits at the front of the tube, looking where it is going.
*/
import * as THREE from './lib/three/three.module.js';
import { COLORS, SERPENT, STONE } from './settings.js';
import { angleBetween, pointBetween, offset } from './geo.js';

const SIDES = 12;          // how round the body is (corners around the tube)
const TRAVEL_STEPS = 140;  // route points over the globe
const COIL_STEPS = 32;     // route points per turn of the coil

export class Serpent {
  // coil = false: the serpent stops at the stone instead of wrapping around it.
  constructor(globe, from, to, now, coil = true) {
    this.globe = globe;
    this.start = now;
    this.route = buildRoute(globe, from, to, coil);    // [{ pos, up, travel }]
    this.travelCount = TRAVEL_STEPS + 1;

    // One buffer big enough for the whole serpent; each frame we fill in only what is visible.
    const rings = this.route.length + 1;
    this.positions = new Float32Array(rings * (SIDES + 1) * 3);
    this.normals = new Float32Array(rings * (SIDES + 1) * 3);
    this.uvs = new Float32Array(rings * (SIDES + 1) * 2);
    const index = [];
    for (let r = 0; r < rings - 1; r++) {
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

    this.material = new THREE.MeshStandardMaterial({ map: scaleTexture(), roughness: 0.55, metalness: 0.25 });
    this.body = new THREE.Mesh(this.geometry, this.material);
    this.body.frustumCulled = false;                    // its size changes every frame
    this.head = makeHead(this.material);

    globe.scene().add(this.body, this.head);
  }

  // Called every frame.
  update(now) {
    const progress = Math.min(1, (now - this.start) / SERPENT.travelMs);
    const reach = Math.max(2, progress * (this.route.length - 1));  // how far along the route the head is
    const last = Math.floor(reach);

    // The points of the visible part, swaying sideways on the travel part.
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
    const u = i / TRAVEL_STEPS;                                  // 0 at the start, 1 at the stone
    const envelope = Math.sin(Math.PI * u);                      // no sway at the two ends
    const wave = Math.sin(u * 28 - now / 260) * SERPENT.wiggle * envelope;
    return p.pos.clone().addScaledVector(p.side, wave);
  }

  // Fill the tube buffers along the points: thin tail, full body, slightly narrower neck.
  buildTube(pts) {
    const n = pts.length;
    let length = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) length += pts[i].distanceTo(pts[i - 1]);
      const u = i / (n - 1);
      const radius = SERPENT.radius * Math.min(1, 0.15 + u * 3) * (u > 0.97 ? 0.85 : 1);

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

function buildRoute(globe, from, to, coil) {
  const route = [];
  const add = (place, altitude, travel) => {
    const c = globe.getCoords(place.lat, place.lng, altitude);
    route.push({ pos: new THREE.Vector3(c.x, c.y, c.z), travel });
  };
  const ground = (SERPENT.radius + 0.3) / 100;                 // just touching the ground
  const stoneTop = STONE.height / 100;

  // Where it arrives: on the edge of the coil, on the side facing where it came from.
  const back = pointBetween(to, from, 0.02);              // a little way back along the route
  const bearing = Math.atan2((back.lng - to.lng) * Math.cos(to.lat * Math.PI / 180), back.lat - to.lat);
  const arrive = coil ? offset(to, SERPENT.coilRadius, bearing) : offset(to, STONE.width, bearing);

  // 1. Over the globe, along the shortest route, arching higher for longer trips.
  const height = SERPENT.height * angleBetween(from, arrive) / Math.PI;
  for (let i = 0; i <= TRAVEL_STEPS; i++) {
    const t = i / TRAVEL_STEPS;
    add(pointBetween(from, arrive, t), ground + height * Math.sin(Math.PI * t), true);
  }

  // 2. Around the stone, climbing up it.
  if (coil) {
    const steps = Math.round(SERPENT.coilTurns * COIL_STEPS);
    for (let i = 1; i <= steps; i++) {
      const angle = bearing + (i / COIL_STEPS) * Math.PI * 2;
      const climb = ground + (stoneTop * 0.75 - ground) * (i / steps);
      add(offset(to, SERPENT.coilRadius, angle), climb, false);
    }
  }

  // Sideways direction at each travel point (for the swaying).
  route.forEach((p, i) => {
    const next = route[Math.min(route.length - 1, i + 1)].pos, prev = route[Math.max(0, i - 1)].pos;
    const tangent = next.clone().sub(prev).normalize();
    p.side = new THREE.Vector3().crossVectors(tangent, p.pos.clone().normalize()).normalize();
  });
  return route;
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
