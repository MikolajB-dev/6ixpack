/*
  One runestone standing on the globe at a place.

    'empty'  -> a low grey stump, so you can see where the place is
    'wrong'  -> low stump + a pulsing red ring on the ground
    'right'  -> the stone rises out of the ground, its rune glows gold, and a gold ring flashes once

  The stone always turns its carved face towards the camera.
*/
import * as THREE from './lib/three/three.module.js';
import { COLORS, STONE } from './settings.js';

const STUMP = 0.25;   // height of the low stone, as a fraction of the full stone

export class Runestone {
  constructor(globe, place) {
    this.globe = globe;
    this.state = 'empty';
    this.height = STUMP;                                   // current height (fraction), animated
    this.rise = { from: STUMP, to: STUMP, start: 0 };
    this.changedAt = 0;

    const c = globe.getCoords(place.lat, place.lng, 0);
    this.position = new THREE.Vector3(c.x, c.y, c.z);
    this.up = this.position.clone().normalize();

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    // The stone: a slab with a rounded top
    this.stone = new THREE.Mesh(stoneGeometry(), new THREE.MeshStandardMaterial({
      color: COLORS.stone, map: graniteTexture(), roughness: 0.95, flatShading: true,
    }));
    this.group.add(this.stone);

    // The carved rune on the front face (inside the stone group, so it rises with it)
    this.runeMaterial = new THREE.MeshBasicMaterial({ map: runeTexture(place.rune), transparent: true, opacity: 0 });
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(STONE.width * 0.8, STONE.width * 0.8), this.runeMaterial);
    rune.position.set(0, STONE.height * 0.5, STONE.depth / 2 + 0.05);
    this.stone.add(rune);

    // A ring lying flat on the ground around the stone
    this.ringMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(STONE.width, STONE.width * 1.25, 48), this.ringMaterial);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.3;
    this.group.add(this.ring);

    // A soft gold glow around a found stone, so you can spot it even when the globe is far away
    this.glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture(), color: COLORS.runeGlow, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.glow = new THREE.Sprite(this.glowMaterial);
    this.glow.scale.setScalar(STONE.height * 2.2);
    this.glow.position.y = STONE.height * 0.6;
    this.group.add(this.glow);

    globe.scene().add(this.group);
  }

  setState(state, now) {
    if (state === this.state) return;
    this.state = state;
    this.changedAt = now;
    this.rise = { from: this.height, to: state === 'right' ? 1 : STUMP, start: now };
  }

  // Called every frame.
  update(now, camera) {
    // Rise or sink smoothly
    const t = Math.min(1, (now - this.rise.start) / STONE.riseMs);
    const eased = 1 - Math.pow(1 - t, 3);
    this.height = this.rise.from + (this.rise.to - this.rise.from) * eased;
    this.stone.scale.y = this.height;

    // Glowing rune and ground ring
    const since = now - this.changedAt;
    const pulse = 0.5 + 0.5 * Math.sin(now / 400);
    if (this.state === 'right') {
      this.runeMaterial.opacity = Math.min(1, since / 800) * (0.75 + 0.25 * pulse);
      this.glowMaterial.opacity = Math.min(1, since / 800) * (0.45 + 0.25 * pulse);
      const flash = Math.min(1, since / 1500);              // gold ring grows and fades once
      this.ringMaterial.color.set(COLORS.runeGlow);
      this.ringMaterial.opacity = 0.9 * (1 - flash);
      this.ring.scale.setScalar(1 + flash * 2);
    } else if (this.state === 'wrong') {
      this.runeMaterial.opacity = 0;
      this.glowMaterial.opacity = 0;
      this.ringMaterial.color.set(COLORS.wrong);
      this.ringMaterial.opacity = 0.35 + 0.5 * pulse;
      this.ring.scale.setScalar(1);
    } else {
      this.runeMaterial.opacity = 0;
      this.glowMaterial.opacity = 0;
      this.ringMaterial.opacity = 0;
    }

    faceCamera(this.group, this.position, this.up, camera.position);
  }
}

/* ---------- helpers ---------- */

// Stand the object upright on the globe (its y axis = straight up from the ground)
// and turn its front (z axis) towards the camera.
function faceCamera(obj, position, up, cameraPosition) {
  const toCamera = cameraPosition.clone().sub(position);
  const forward = toCamera.sub(up.clone().multiplyScalar(toCamera.dot(up)));
  if (forward.lengthSq() < 1e-6) return;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(up, forward);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward));
}

function stoneGeometry() {
  const w = STONE.width / 2, h = STONE.height;
  const shape = new THREE.Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w * 0.95, h - w);
  shape.quadraticCurveTo(w * 0.9, h, 0, h);        // rounded top
  shape.quadraticCurveTo(-w * 0.9, h, -w * 0.95, h - w);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: STONE.depth, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2,
  });
  geo.translate(0, 0, -STONE.depth / 2);
  return geo;
}

function graniteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const g = 150 + Math.random() * 105;
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.3, 0.3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Runes are just straight lines, so we draw them ourselves (no special font needed).
// Each line is [x1, y1, x2, y2] in a 0..1 box, y going down.
const RUNE_LINES = {
  'ᚼ': [[0.5, 0, 0.5, 1], [0.2, 0.25, 0.8, 0.75], [0.8, 0.25, 0.2, 0.75]],   // hagall
  'ᚢ': [[0.3, 1, 0.3, 0], [0.3, 0, 0.75, 0.35], [0.75, 0.35, 0.75, 1]],      // ur
  'ᛏ': [[0.5, 0, 0.5, 1], [0.5, 0, 0.2, 0.35], [0.5, 0, 0.8, 0.35]],         // tyr
};

function runeTexture(glyph) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const lines = RUNE_LINES[glyph] || RUNE_LINES['ᚼ'];
  const draw = (color, width, blur) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.shadowColor = COLORS.runeGlow; ctx.shadowBlur = blur;
    for (const [x1, y1, x2, y2] of lines) {
      ctx.beginPath(); ctx.moveTo(48 + x1 * 160, 40 + y1 * 176); ctx.lineTo(48 + x2 * 160, 40 + y2 * 176); ctx.stroke();
    }
  };
  draw(COLORS.runeGlow, 22, 30);   // glow
  draw('#fff6d8', 9, 0);           // bright core
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
