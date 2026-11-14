/*
  Settings: everything you are likely to tweak lives here.
  Distances on the globe: the globe radius is 100 units, so 1 unit ≈ 64 km.
*/

// Slot ids must match SLOTS in ../index.html. `rune` is the glyph carved on that place's runestone.
export const PLACES = {
  jelling: { name: 'Jelling',     lat: 55.756, lng:    9.420, rune: 'ᚼ' },
  yorba:   { name: 'Yorba Linda', lat: 33.889, lng: -117.813, rune: 'ᚢ' },
  tokyo:   { name: 'Tokyo',       lat: 35.676, lng:  139.650, rune: 'ᛏ' },
};
export const HUB = 'jelling';    // every serpent starts here (Harald's stone)

// Camera: looking at the middle of the 3 places (over the Arctic), so all 3 are visible at once.
export const VIEW = { lat: 77, lng: -165, altitude: 2.4 };

export const COLORS = {
  background: '#140d07',
  glow:       '#d6a548',          // atmosphere around the globe
  // the parchment map
  paper:      '#efdcae',
  sea:        '#c09a5e',
  ink:        '#4a2c14',
  // runestones
  stone:      '#8d8579',
  runeGlow:   '#ffc94d',          // the carved rune when the right rune is placed
  wrong:      '#c2412b',          // ring on the ground when the wrong rune is placed
  // the serpent
  scales:     '#2c4a24',
  scaleEdge:  '#b8963a',
  eyes:       '#ffd23f',
};

export const STONE = {
  width: 5, height: 12, depth: 1.8,    // a raised runestone (units)
  riseMs: 1200,                        // how long it takes to rise out of the ground
};

export const SERPENT = {
  travelMs: 4000,     // time to reach the stone and finish coiling
  radius: 1.5,        // body thickness (units)
  height: 0.22,       // how high it arcs above the globe (relative, longer trips go higher)
  coilRadius: 5,      // coil around the stone (units)
  coilTurns: 2.5,     // how many times it wraps around the stone
  wiggle: 0.9,        // how far it sways side to side while moving (units)
};
