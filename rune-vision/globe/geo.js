/*
  Small maths helpers for points on a sphere (standard formulas, you should not need to edit these).
*/

export const toRad = d => d * Math.PI / 180;
export const toDeg = r => r * 180 / Math.PI;

function toXYZ(p) {
  const la = toRad(p.lat), lo = toRad(p.lng);
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

// Angle between two places, in radians (0..PI).
export function angleBetween(a, b) {
  const [x1, y1, z1] = toXYZ(a), [x2, y2, z2] = toXYZ(b);
  return Math.acos(Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2)));
}

// The place a fraction t (0..1) of the way from a to b, along the shortest route over the globe.
export function pointBetween(a, b, t) {
  const d = angleBetween(a, b);
  if (d === 0) return { lat: a.lat, lng: a.lng };
  const A = toXYZ(a), B = toXYZ(b);
  const k1 = Math.sin((1 - t) * d) / Math.sin(d), k2 = Math.sin(t * d) / Math.sin(d);
  const [x, y, z] = [0, 1, 2].map(i => k1 * A[i] + k2 * B[i]);
  return { lat: toDeg(Math.asin(z)), lng: toDeg(Math.atan2(y, x)) };
}

// Move `distance` units away from a place in a compass direction (angle 0 = north, PI/2 = east).
export function offset(place, distance, angle, globeRadius = 100) {
  const deg = toDeg(distance / globeRadius);
  return {
    lat: place.lat + deg * Math.cos(angle),
    lng: place.lng + deg * Math.sin(angle) / Math.cos(toRad(place.lat)),
  };
}
