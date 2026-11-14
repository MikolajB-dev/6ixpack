/*
  Draws an old parchment-style world map on a canvas, to wrap around the globe.
  The canvas is a flat "equirectangular" map: x = longitude, y = latitude.
  No images are downloaded: everything is drawn here, from the country shapes in img/countries.geojson.
*/
import { COLORS } from './settings.js';

const W = 4096, H = 2048;

// lat/lng -> pixel on the flat map
const px = lng => (lng + 180) / 360 * W;
const py = lat => (90 - lat) / 180 * H;

// The same "random" numbers every time, so the map looks the same on every load.
let seed = 7;
function random() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

export function drawParchmentMap(geojson) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const rings = landRings(geojson);

  // 1. Sea
  ctx.fillStyle = COLORS.sea;
  ctx.fillRect(0, 0, W, H);
  drawWaves(ctx);

  // 2. Ripple lines around the coasts (old maps did this with ink hatching).
  //    Wide faint strokes first; the land fill below covers their inner half.
  ctx.strokeStyle = COLORS.ink; ctx.lineJoin = 'round';
  for (const [width, alpha] of [[34, 0.05], [22, 0.08], [12, 0.12]]) {
    ctx.lineWidth = width; ctx.globalAlpha = alpha;
    rings.forEach(r => tracePath(ctx, r, true));
  }
  ctx.globalAlpha = 1;

  // 3. Land
  ctx.fillStyle = COLORS.paper;
  rings.forEach(r => { tracePath(ctx, r, false); ctx.fill(); });

  // 4. Ink outlines (coasts and borders)
  ctx.lineWidth = 2.5; ctx.globalAlpha = 0.85;
  rings.forEach(r => tracePath(ctx, r, true));
  ctx.globalAlpha = 1;

  // 5. Latitude / longitude lines, dashed
  drawGraticule(ctx);

  // 6. Compass rose in the North Pacific (visible from our camera)
  drawCompass(ctx, 40, -160, 150);

  // 7. Age: stains and paper grain
  drawStains(ctx);
  drawGrain(ctx);

  return canvas;
}

/* ---------- helpers ---------- */

// All outer and inner rings of all countries, as lists of [lng, lat].
function landRings(geojson) {
  const rings = [];
  for (const f of geojson.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    polys.forEach(poly => poly.forEach(ring => rings.push(ring)));
  }
  return rings;
}

// Draws one ring. If it crosses the date line (lng jumps by > 180), it is "unwrapped"
// and drawn 3 times (shifted left/right) so nothing is cut off at the map edges.
function tracePath(ctx, ring, stroke) {
  const pts = [];
  let shift = 0;
  ring.forEach(([lng, lat], i) => {
    if (i > 0) {
      const prev = ring[i - 1][0];
      if (lng - prev > 180) shift -= 360;
      if (prev - lng > 180) shift += 360;
    }
    pts.push([px(lng + shift), py(lat)]);
  });
  ctx.beginPath();
  for (const dx of [-W, 0, W]) {
    pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x + dx, y) : ctx.lineTo(x + dx, y));
    ctx.closePath();
  }
  if (stroke) ctx.stroke();
}

function drawWaves(ctx) {
  ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.18;
  for (let i = 0; i < 2600; i++) {
    const x = random() * W, y = random() * H, s = 6 + random() * 8;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s / 2, y - s / 2, x, y);
    ctx.quadraticCurveTo(x + s / 2, y + s / 2, x + s, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawGraticule(ctx) {
  ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.25; ctx.setLineDash([10, 10]);
  for (let lng = -180; lng <= 180; lng += 15) { ctx.beginPath(); ctx.moveTo(px(lng), 0); ctx.lineTo(px(lng), H); ctx.stroke(); }
  for (let lat = -75; lat <= 75; lat += 15)   { ctx.beginPath(); ctx.moveTo(0, py(lat)); ctx.lineTo(W, py(lat)); ctx.stroke(); }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}

function drawCompass(ctx, lat, lng, size) {
  ctx.save();
  ctx.translate(px(lng), py(lat));
  ctx.scale(1 / Math.cos(lat * Math.PI / 180), 1);   // undo the map's sideways stretch at this latitude
  ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 2;
  for (const r of [size * 0.55, size * 0.62]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.stroke(); }
  // 8 points: long ones N/E/S/W, short ones in between. Each point is half dark, half light.
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, len = i % 2 ? size * 0.5 : size, w = size * 0.12;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
      ctx.lineTo(Math.sin(a + side * Math.PI / 2) * w, -Math.cos(a + side * Math.PI / 2) * w);
      ctx.closePath();
      ctx.fillStyle = side < 0 ? COLORS.ink : COLORS.paper;
      ctx.fill(); ctx.stroke();
    }
  }
  ctx.fillStyle = COLORS.ink; ctx.font = `bold ${size * 0.28}px Georgia, serif`; ctx.textAlign = 'center';
  ctx.fillText('N', 0, -size * 1.08);
  ctx.restore();
}

function drawStains(ctx) {
  for (let i = 0; i < 40; i++) {
    const x = random() * W, y = H * 0.1 + random() * H * 0.8, r = 60 + random() * 260;
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, 'rgba(110, 70, 30, 0.10)');
    g.addColorStop(0.85, 'rgba(110, 70, 30, 0.04)');
    g.addColorStop(1, 'rgba(110, 70, 30, 0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

function drawGrain(ctx) {
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (random() - 0.5) * 22;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}
