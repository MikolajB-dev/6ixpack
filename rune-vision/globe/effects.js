/*
  Small visual extras on the globe, on top of the stones and serpents:

    Dust    slow gold motes drifting around the globe, so the dark space feels alive
    Bursts  a fountain of gold sparkles from a stone when it is found (and from all stones at the end)

  Nothing here changes the game; globe.js just calls burst() at the right moments.
*/
import * as THREE from './lib/three/three.module.js';
import { COLORS, EFFECTS } from './settings.js';

export class Effects {
  constructor(globe) {
    this.globe = globe;
    this.bursts = [];
    this.sprite = dotTexture();
    if (EFFECTS.dust > 0) this.dust = makeDust(this.sprite);
    if (this.dust) globe.scene().add(this.dust);
  }

  // Gold sparkles shooting up from a place, falling back as they fade.
  burst(place, color = COLORS.runeGlow, count = EFFECTS.burst) {
    const c = this.globe.getCoords(place.lat, place.lng, 0.02);
    const origin = new THREE.Vector3(c.x, c.y, c.z);
    const up = origin.clone().normalize();

    const positions = new Float32Array(count * 3);
    const velocity = [];
    for (let i = 0; i < count; i++) {
      // a random direction, mostly upwards (away from the globe)
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      dir.addScaledVector(up, 1.4).normalize();
      velocity.push(dir.multiplyScalar(10 + Math.random() * 22));   // units per second
      positions.set([origin.x, origin.y, origin.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: this.sprite, color, size: 2.6, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.globe.scene().add(points);
    this.bursts.push({ points, origin, up, velocity, start: performance.now() });
  }

  // Called every frame.
  update(now) {
    if (this.dust) this.dust.rotation.y = now / 90000;        // one turn every ~9 minutes

    this.bursts = this.bursts.filter(b => {
      const t = (now - b.start) / EFFECTS.burstMs;            // 0..1 over the burst's life
      if (t >= 1) {
        this.globe.scene().remove(b.points);
        b.points.geometry.dispose(); b.points.material.dispose();
        return false;
      }
      const secs = (now - b.start) / 1000;
      const pos = b.points.geometry.attributes.position;
      b.velocity.forEach((v, i) => {
        // straight line plus a little "gravity" back towards the ground
        const p = b.origin.clone().addScaledVector(v, secs).addScaledVector(b.up, -14 * secs * secs);
        pos.setXYZ(i, p.x, p.y, p.z);
      });
      pos.needsUpdate = true;
      b.points.material.opacity = 1 - t * t;
      return true;
    });
  }
}

/* ---------- helpers ---------- */

function makeDust(sprite) {
  const n = EFFECTS.dust, positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // random point in a thick shell around the globe (radius 100)
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    dir.multiplyScalar(140 + Math.random() * 260);
    positions.set([dir.x, dir.y, dir.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    map: sprite, color: COLORS.glow, size: 1.6, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

// A soft round dot, so the points are not square.
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
