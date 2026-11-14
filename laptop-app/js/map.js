/* World map: an old chart of Miðgarðr — parchment land, inked sea, sea
   monsters in the margins — plus rune nodes and gold mesh beams. */
window.MapMarkup = (function () {
  function monster(key, title, x, y, scale, body) {
    return (
      '<g class="monster" data-creature="' + key + '" transform="translate(' + x + " " + y + ') scale(' + scale + ')">' +
      "<title>" + title + "</title>" +
      body +
      "</g>"
    );
  }

  /* a stroked limb: a dark inked edge under a coloured body */
  function ink(d, width, cls) {
    return (
      '<path class="m-ink" d="' + d + '" stroke-width="' + (width + 4) + '"/>' +
      '<path class="' + cls + '" d="' + d + '" stroke-width="' + width + '"/>'
    );
  }

  function kraken() {
    const marks = window.WORLD_MAP.monsters || {};
    if (!marks.kraken) return "";
    const tentacles =
      "M-14 6C-36 24 -58 30 -70 52C-78 66 -66 80 -54 74" +
      "M-2 10C-12 32 -16 54 -6 70C2 82 16 76 14 64" +
      "M10 10C30 26 52 32 64 52C72 66 60 78 48 72" +
      "M22 4C48 10 66 24 76 44" +
      "M-24 2C-52 6 -72 18 -80 38";
    return monster(
      "kraken",
      "Kraken — the horror of the Greenland Sea",
      marks.kraken[0], marks.kraken[1], 0.8,
      '<ellipse class="m-ripple" cx="0" cy="78" rx="118" ry="20"/>' +
      '<ellipse class="m-ripple" cx="0" cy="74" rx="86" ry="13"/>' +
      ink(tentacles, 9, "m-tent") +
      '<circle class="m-suck" cx="-58" cy="53" r="2.1"/><circle class="m-suck" cx="-47" cy="61" r="1.7"/>' +
      '<circle class="m-suck" cx="-34" cy="44" r="1.9"/><circle class="m-suck" cx="52" cy="50" r="2"/>' +
      '<circle class="m-suck" cx="41" cy="58" r="1.6"/><circle class="m-suck" cx="63" cy="44" r="1.5"/>' +
      '<path class="m-skin-2" d="M-40 -12C-48 -50 -22 -76 4 -74C32 -72 52 -50 46 -20C42 2 24 14 4 14C-18 14 -36 4 -40 -12Z"/>' +
      '<path class="m-hatch" d="M-30 -34C-22 -44 -8 -50 6 -48M-32 -18C-24 -30 -6 -36 12 -32M-24 0C-12 -8 8 -10 22 -2"/>' +
      '<circle class="m-eye" cx="-14" cy="-42" r="6.5"/><circle class="m-pupil" cx="-13" cy="-41" r="3"/>' +
      '<circle class="m-eye" cx="26" cy="-42" r="6.5"/><circle class="m-pupil" cx="27" cy="-41" r="3"/>' +
      '<path class="m-ink" d="M-8 -16C0 -10 8 -10 16 -16" stroke-width="2"/>' +
      '<text class="monster-name" y="-88">KRAKEN</text>'
    );
  }

  function nessie() {
    const marks = window.WORLD_MAP.monsters || {};
    if (!marks.nessie) return "";
    return monster(
      "nessie",
      "Nessie — the worm of the northern lochs",
      marks.nessie[0], marks.nessie[1], 1.05,
      '<ellipse class="m-ripple" cx="-4" cy="32" rx="72" ry="10"/>' +
      '<path class="m-skin" d="M-56 30C-50 4 -28 2 -20 30Z"/>' +
      '<path class="m-skin" d="M-18 30C-12 2 8 0 16 30Z"/>' +
      ink("M10 30C18 10 20 -12 16 -28", 11, "m-tent") +
      '<path class="m-skin" d="M6 -34C14 -50 34 -52 42 -42C48 -34 42 -24 30 -22C18 -20 8 -26 6 -34Z"/>' +
      '<path class="m-ink" d="M40 -26C32 -22 22 -21 12 -25" stroke-width="2"/>' +
      '<path class="m-fin" d="M16 -42C18 -52 24 -56 30 -54C25 -48 22 -44 22 -38Z"/>' +
      '<circle class="m-eye" cx="30" cy="-38" r="4"/><circle class="m-pupil" cx="31" cy="-38" r="1.8"/>' +
      '<path class="m-hatch" d="M-48 24C-44 12 -32 10 -26 22M-10 24C-6 12 6 11 12 22"/>' +
      '<text class="monster-name" y="56">LOCH NESS</text>'
    );
  }

  function greatFish() {
    const marks = window.WORLD_MAP.monsters || {};
    if (!marks.greatfish) return "";
    return monster(
      "greatfish",
      "A great fish of the Northern Ocean",
      marks.greatfish[0], marks.greatfish[1], 1.1,
      '<ellipse class="m-ripple" cx="0" cy="36" rx="84" ry="11"/>' +
      '<path class="m-fin" d="M-64 4L-104 -20L-94 4L-104 28Z"/>' +
      '<path class="m-skin-2" d="M-66 4C-54 -30 -12 -40 26 -28C50 -20 64 -8 74 2C62 16 40 28 8 30C-26 32 -56 20 -66 4Z"/>' +
      '<path class="m-fin" d="M-6 -30C6 -52 28 -50 36 -34Z"/>' +
      '<path class="m-fin" d="M4 22C-2 42 16 48 26 34Z"/>' +
      '<path class="m-hatch" d="M-24 -14C-18 -2 -18 12 -24 22M-8 -18C-2 -4 -2 14 -8 26M8 -18C14 -4 14 12 8 24M24 -14C30 -2 30 10 24 20"/>' +
      '<path class="m-ink" d="M72 2C58 8 44 10 30 9" stroke-width="2.4"/>' +
      '<circle class="m-eye" cx="46" cy="-10" r="6"/><circle class="m-pupil" cx="47" cy="-10" r="2.6"/>' +
      '<text class="monster-name" y="62">THE GREAT FISH</text>'
    );
  }

  function maelstrom() {
    const marks = window.WORLD_MAP.monsters || {};
    if (!marks.maelstrom) return "";
    return monster(
      "maelstrom",
      "Hec sunt horrenda caribdis",
      marks.maelstrom[0], marks.maelstrom[1], 1.2,
      '<ellipse class="m-ripple" cx="0" cy="4" rx="94" ry="56"/>' +
      '<ellipse class="m-ripple" cx="0" cy="4" rx="70" ry="40"/>' +
      '<path class="m-ink" d="M0 0C14 2 22 12 18 24C13 38 -6 44 -20 36C-38 26 -40 4 -26 -8C-10 -21 16 -18 28 -2C40 14 34 38 18 48" stroke-width="3"/>' +
      '<path class="m-ink" d="M-4 8C2 4 10 6 12 12C14 19 6 24 0 21C-7 18 -7 10 0 8" stroke-width="2.6"/>' +
      '<path class="m-ripple" d="M-44 44C-18 56 16 56 44 42"/>' +
      '<text class="monster-name" y="-70">HEC SVNT HORRENDA</text>' +
      '<text class="monster-name" y="-56">CARIBDIS</text>'
    );
  }

  function seaSerpent() {
    const marks = window.WORLD_MAP.monsters || {};
    if (!marks.serpent) return "";
    const body = "M-116 40C-96 62 -62 62 -48 42C-34 22 -48 4 -68 10C-90 16 -94 40 -76 52C-54 66 -20 60 2 40C22 22 48 18 66 4";
    return monster(
      "serpent",
      "The sea serpent of the South Atlantic",
      marks.serpent[0], marks.serpent[1], 1.0,
      '<ellipse class="m-ripple" cx="-24" cy="64" rx="126" ry="15"/>' +
      ink(body, 17, "m-serpent") +
      '<path class="m-band" d="' + body + '" stroke-width="15" stroke-dasharray="3 12"/>' +
      '<path class="m-fin" d="M-116 40C-132 32 -140 18 -134 6C-126 18 -116 28 -106 34Z"/>' +
      '<path class="m-fin" d="M60 -20C58 -34 64 -42 72 -42C68 -34 68 -26 70 -18Z"/>' +
      '<path class="m-skin" d="M54 -6C64 -24 86 -28 100 -18C110 -10 108 2 98 6C86 11 66 8 56 2Z"/>' +
      '<path class="m-ink" d="M98 6C106 8 112 13 115 19" stroke-width="3"/>' +
      '<path class="m-ink" d="M56 -2C70 2 88 5 100 2" stroke-width="2"/>' +
      '<path class="m-ink" d="M84 3L86 8M90 0L92 6M96 -2L98 4" stroke-width="1.6"/>' +
      '<circle class="m-eye" cx="72" cy="-10" r="5"/><circle class="m-pupil" cx="73" cy="-10" r="2.2"/>' +
      '<text class="monster-name" y="88">SEA SERPENT</text>'
    );
  }

  function creatureLayer() {
    return (
      '<g class="monsters">' +
      kraken() + nessie() + greatFish() + maelstrom() + seaSerpent() +
      "</g>"
    );
  }

  function defs(uid) {
    return (
      "<defs>" +
      '<radialGradient id="' + uid + '-ocean" cx="50%" cy="42%" r="74%">' +
      '<stop offset="0%" stop-color="#2c1c11"/>' +
      '<stop offset="52%" stop-color="#1d120b"/>' +
      '<stop offset="100%" stop-color="#0e0805"/>' +
      "</radialGradient>" +
      '<linearGradient id="' + uid + '-land" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#dcc79c"/>' +
      '<stop offset="50%" stop-color="#cbb184"/>' +
      '<stop offset="100%" stop-color="#b79b6e"/>' +
      "</linearGradient>" +
      '<pattern id="' + uid + '-waves" width="132" height="66" patternUnits="userSpaceOnUse">' +
      '<path d="M0 22q16-9 33 0t33 0t33 0t33 0" fill="none" stroke="rgba(226,196,150,.12)" stroke-width="1"/>' +
      '<path d="M0 46q16-9 33 0t33 0t33 0t33 0" fill="none" stroke="rgba(226,196,150,.075)" stroke-width="1"/>' +
      '<path d="M16 62q16-9 33 0" fill="none" stroke="rgba(226,196,150,.055)" stroke-width="1"/>' +
      "</pattern>" +
      "</defs>"
    );
  }

  function ocean(uid) {
    const map = window.WORLD_MAP;
    const graticule = map.graticule
      .map(function (entry) {
        return '<path class="graticule-line ' + entry[0] + '" d="' + entry[1] + '"/>';
      })
      .join("");
    return (
      '<rect class="ocean" x="0" y="0" width="' + map.width + '" height="' + map.height +
      '" fill="url(#' + uid + '-ocean)"/>' +
      '<rect class="sea-waves" x="0" y="0" width="' + map.width + '" height="' + map.height +
      '" fill="url(#' + uid + '-waves)"/>' +
      '<g class="graticule">' + graticule + "</g>"
    );
  }

  function land(uid) {
    const map = window.WORLD_MAP;
    return (
      '<g class="landmass">' +
      '<path class="land" d="' + map.land + '" fill="url(#' + uid + '-land)" fill-rule="evenodd"/>' +
      '<path class="borders" d="' + map.borders + '"/>' +
      "</g>"
    );
  }

  function compass() {
    const ticks = [];
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * 360;
      const inner = i % 4 === 0 ? 44 : 51;
      ticks.push('<line x1="0" y1="-' + inner + '" x2="0" y2="-58" transform="rotate(' + angle + ')"/>');
    }
    return '<g class="compass" transform="translate(148 706)" aria-hidden="true">' +
      '<circle class="compass-ring" r="64"/>' +
      '<circle class="compass-ring dashed" r="58"/>' +
      '<g class="compass-ticks">' + ticks.join("") + "</g>" +
      '<path class="compass-star" d="M0 -50L8 -10L50 0L8 10L0 50L-8 10L-50 0L-8 -10Z"/>' +
      '<path class="compass-star-in" d="M0 -30L5 -6L30 0L5 6L0 30L-5 6L-30 0L-5 -6Z"/>' +
      '<circle class="compass-dot" r="2.4"/>' +
      '<text class="compass-label" y="-72">N</text>' +
      '<text class="compass-caption" y="86">NORTH</text>' +
      "</g>";
  }

  function base(uid) {
    const map = window.WORLD_MAP;
    return (
      defs(uid) +
      ocean(uid) +
      creatureLayer() +
      land(uid) +
      compass() +
      '<g class="beams"></g>' +
      '<g class="nodes"></g>'
    );
  }

  return {
    base: base,
    defs: defs,
    ocean: ocean,
    land: land,
    creatureLayer: creatureLayer,
    compass: compass
  };
})();

window.createMap = function (svg, data) {
  const NS = "http://www.w3.org/2000/svg";
  const map = window.WORLD_MAP;
  const sites = map.sites;
  const nodes = new Map();
  const beams = new Map();

  svg.innerHTML = window.MapMarkup.base("m");

  const beamLayer = svg.querySelector(".beams");
  const nodeLayer = svg.querySelector(".nodes");

  function arc(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy) || 1;
    let nx = -dy / length;
    let ny = dx / length;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    if (Math.abs(ny) < 0.25) {
      nx = 0;
      ny = -1;
    }
    const bend = Math.max(26, Math.min(120, length * 0.24));
    const cx = (ax + bx) / 2 + nx * bend;
    const cy = (ay + by) / 2 + ny * bend;
    return {
      d: "M" + ax + " " + ay + "Q" + cx.toFixed(1) + " " + cy.toFixed(1) + " " + bx + " " + by,
      midX: (ax + 2 * cx + bx) / 4,
      midY: (ay + 2 * cy + by) / 4
    };
  }

  function nodeMarkup(rune) {
    return (
      '<circle class="node-aura" r="72"/>' +
      '<circle class="node-ping" r="30">' +
      '<animate attributeName="r" values="30;82" dur="3.2s" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values="0.5;0" dur="3.2s" repeatCount="indefinite"/>' +
      "</circle>" +
      '<circle class="node-halo" r="44"/>' +
      '<circle class="node-ring" r="36"/>' +
      '<circle class="node-ring slow" r="46"/>' +
      '<circle class="node-disc" r="26"/>' +
      '<g class="node-glyph" transform="translate(-12.4 -19.8) scale(.62)">' +
      window.RuneGlyphs.inline(rune.glyph) +
      "</g>" +
      '<line class="node-leader" x1="0" y1="0" x2="' + rune.label.dx + '" y2="' + rune.label.dy + '"/>' +
      '<circle class="node-anchor" cx="' + rune.label.dx + '" cy="' + rune.label.dy + '" r="2.5"/>' +
      '<g class="node-label" transform="translate(' + rune.label.dx + " " + rune.label.dy +
      ')" text-anchor="' + rune.label.anchor + '">' +
      '<text class="node-name" y="-8">' + rune.site.toUpperCase() + "</text>" +
      '<text class="node-place" y="10">' + rune.land + " · " + rune.coords + "</text>" +
      '<text class="node-state" y="27">NFC VERIFIED</text>' +
      "</g>"
    );
  }

  function addRune(id) {
    if (nodes.has(id)) return;
    const rune = data.runes[id];
    const point = sites[id];
    if (!rune || !point) return;

    const group = document.createElementNS(NS, "g");
    group.setAttribute("class", "rune-node");
    group.setAttribute("data-rune", id);
    group.setAttribute("data-status", "broadcast");
    group.setAttribute("transform", "translate(" + point[0] + " " + point[1] + ")");
    group.innerHTML = nodeMarkup(rune);
    nodeLayer.appendChild(group);
    nodes.set(id, group);
  }

  function updateNode(id, runeState) {
    const group = nodes.get(id);
    if (!group) return;
    const rune = data.runes[id];
    group.setAttribute("data-status", runeState.status);
    const stateText = group.querySelector(".node-state");
    if (!stateText) return;
    if (runeState.status === "linked") {
      stateText.textContent = "MESH LINKED · " + runeState.peers.length + " PEERS";
    } else if (runeState.status === "broadcast") {
      stateText.textContent = "BEACON LIVE · " + rune.channel;
    } else {
      stateText.textContent = "NFC VERIFIED";
    }
  }

  function addLink(a, b, rssi) {
    const key = [a, b].sort().join("-");
    if (beams.has(key)) return;
    const from = sites[a];
    const to = sites[b];
    if (!from || !to) return;

    const curve = arc(from[0], from[1], to[0], to[1]);
    const railId = "beam-" + key;

    const group = document.createElementNS(NS, "g");
    group.setAttribute("class", "beam");
    group.setAttribute("data-link", key);
    group.innerHTML =
      '<path class="beam-glow" d="' + curve.d + '"/>' +
      '<path class="beam-rail" id="' + railId + '" d="' + curve.d + '"/>' +
      '<path class="beam-core" d="' + curve.d + '"/>' +
      '<circle class="beam-spark" r="3.4">' +
      '<animateMotion dur="3.9s" repeatCount="indefinite"><mpath href="#' + railId + '"/></animateMotion>' +
      "</circle>" +
      '<circle class="beam-spark dim" r="2.1">' +
      '<animateMotion dur="5.8s" begin="1.3s" repeatCount="indefinite"><mpath href="#' + railId + '"/></animateMotion>' +
      "</circle>" +
      '<g class="beam-rssi" transform="translate(' + curve.midX.toFixed(1) + " " +
      (curve.midY - 8).toFixed(1) + ')"><text>' + rssi + " dBm</text></g>";

    beamLayer.appendChild(group);
    beams.set(key, group);
  }

  function reset() {
    nodeLayer.innerHTML = "";
    beamLayer.innerHTML = "";
    nodes.clear();
    beams.clear();
  }

  function sync(state) {
    data.order.forEach(function (id) {
      const runeState = state.runes[id];
      if (!runeState) return;
      if (runeState.status === "broadcast" || runeState.status === "linked") {
        addRune(id);
      }
      updateNode(id, runeState);
    });

    state.links.forEach(function (link) {
      addLink(link.a, link.b, link.rssi);
    });
  }

  return { sync: sync, reset: reset };
};
