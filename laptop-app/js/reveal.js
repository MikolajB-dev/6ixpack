/* The finale: Jörmungandr rises out of the Kattegat and swims a full circle of
   the world, diving under continents and breaking the surface with a splash.
   The body is generated from the route: tapered, scaled, finned and inked.
   A mask, driven per frame, reveals the body behind the head as it travels. */
window.createReveal = function (root, options) {
  const data = options.data;
  const onReset = options.onReset;
  const map = window.WORLD_MAP;
  const route = map.serpent;

  const LEAD = 1100;        // settle before the serpent breaches
  const TRAVEL = 15000;     // ms to swim the world
  const BODY_MAX = 17;      // half-width at the thickest point

  let open = false;
  let raf = 0;
  let startTime = 0;
  let complete = false;
  let head = null;
  let headGlow = null;
  let maskEls = [];
  let splashes = [];
  const fired = new Set();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* half-width of the body at fraction t of the whole route */
  function widthAt(t) {
    const tip = Math.min(1, t / 0.018);
    const grow = 0.30 + 0.70 * smoothstep(0.012, 0.075, t);
    const neck = 1 - 0.10 * smoothstep(0.94, 1, t);
    return BODY_MAX * tip * grow * neck;
  }

  function fmt(point) {
    return point[0].toFixed(1) + " " + point[1].toFixed(1);
  }

  function centerline(run) {
    const pts = run.points;
    let d = "M" + fmt(pts[0]);
    for (let i = 1; i < pts.length; i++) d += "L" + fmt(pts[i]);
    return d;
  }

  function frameAt(points, index) {
    const p = points[index];
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    let tx = next[0] - prev[0];
    let ty = next[1] - prev[1];
    const length = Math.hypot(tx, ty) || 1;
    tx /= length;
    ty /= length;
    return { p: p, tx: tx, ty: ty, nx: -ty, ny: tx, t: p[2] };
  }

  function outlineOf(run, widthScale) {
    const pts = run.points;
    const left = [];
    const right = [];
    for (let i = 0; i < pts.length; i++) {
      const f = frameAt(pts, i);
      const w = widthAt(f.t) * widthScale;
      left.push([f.p[0] + f.nx * w, f.p[1] + f.ny * w]);
      right.push([f.p[0] - f.nx * w, f.p[1] - f.ny * w]);
    }
    right.reverse();
    let d = "M" + fmt(left[0]);
    for (let i = 1; i < left.length; i++) d += "L" + fmt(left[i]);
    for (let i = 0; i < right.length; i++) d += "L" + fmt(right[i]);
    return d + "Z";
  }

  function detailOf(run) {
    const pts = run.points;
    const bands = [];
    const fins = [];
    const dots = [];
    const step = Math.max(2, Math.floor(pts.length / 120));

    for (let i = 0; i < pts.length; i += step) {
      const f = frameAt(pts, i);
      const w = widthAt(f.t);
      if (w < 2.4) continue;

      const ax = f.p[0] + f.nx * w * 0.86;
      const ay = f.p[1] + f.ny * w * 0.86;
      const bx = f.p[0] - f.nx * w * 0.86;
      const by = f.p[1] - f.ny * w * 0.86;
      const mx = f.p[0] + f.tx * w * 0.22;
      const my = f.p[1] + f.ty * w * 0.22;
      bands.push("M" + ax.toFixed(1) + " " + ay.toFixed(1) +
        "Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " + bx.toFixed(1) + " " + by.toFixed(1));

      if (i % (step * 3) === 0) {
        const fx = f.p[0] + f.nx * (w + 1);
        const fy = f.p[1] + f.ny * (w + 1);
        const size = 3.2 + w * 0.32;
        fins.push(
          "M" + (fx - f.tx * size).toFixed(1) + " " + (fy - f.ty * size).toFixed(1) +
          "L" + (fx + f.nx * size * 1.1).toFixed(1) + " " + (fy + f.ny * size * 1.1).toFixed(1) +
          "L" + (fx + f.tx * size).toFixed(1) + " " + (fy + f.ty * size).toFixed(1) + "Z"
        );
      }

      if (i % (step * 2) === 0) {
        const lane = (i % (step * 4) === 0) ? 0.42 : -0.42;
        dots.push(
          '<circle class="wyrm-scale-dot" cx="' + (f.p[0] + f.nx * w * lane).toFixed(1) +
          '" cy="' + (f.p[1] + f.ny * w * lane).toFixed(1) +
          '" r="' + (0.8 + w * 0.035).toFixed(2) + '"/>'
        );
      }
    }

    return (
      '<path class="wyrm-bands" d="' + bands.join("") + '"/>' +
      dots.join("") +
      '<path class="wyrm-fins" d="' + fins.join("") + '"/>'
    );
  }

  function headMarkup() {
    return (
      '<g class="wyrm-head">' +
      '<circle class="wyrm-glow" r="190" fill="url(#headGlow)"/>' +
      '<g class="wyrm-face">' +
      '<path class="head-fin" d="M-34 -26C-48 -46 -68 -56 -86 -48C-64 -36 -48 -24 -38 -10Z"/>' +
      '<path class="head-fin" d="M-34 26C-48 46 -68 56 -86 48C-64 36 -48 24 -38 10Z"/>' +
      '<path class="head-fin small" d="M-12 -30C-20 -48 -34 -58 -48 -58C-32 -46 -24 -32 -20 -18Z"/>' +
      '<path class="head-fin small" d="M-12 30C-20 48 -34 58 -48 58C-32 46 -24 32 -20 18Z"/>' +
      '<path class="head-skull" d="M-46 -24C-18 -36 20 -32 46 -16L74 -2L46 6C18 14 -18 16 -46 10Z"/>' +
      '<path class="head-mouth" d="M-8 2C14 7 38 8 58 3"/>' +
      '<path class="head-teeth" d="M12 5l3 9 3-9M24 6l3 9 3-9M36 6l3 8 3-8M48 4l3 7 3-7"/>' +
      '<path class="head-teeth" d="M16 1l3-8 3 8M30 2l3-8 3 8M44 2l3-7 3 7"/>' +
      '<path class="head-tongue" d="M58 2C70 2 80 -1 90 -5M90 -5L102 -11M90 -5L100 3"/>' +
      '<path class="head-brow" d="M-14 -20C-2 -31 16 -29 25 -18"/>' +
      '<circle class="head-eye" cx="-2" cy="-12" r="7"/>' +
      '<circle class="head-pupil" cx="0" cy="-12" r="2.6"/>' +
      '<circle class="head-glint" cx="-4.4" cy="-15" r="1.7"/>' +
      '<circle class="head-nostril" cx="52" cy="-8" r="1.6"/>' +
      '<path class="head-barbel" d="M46 -12C56 -26 66 -32 80 -33M46 10C56 22 68 27 82 25"/>' +
      '<path class="head-gill" d="M-44 -18C-58 -26 -66 -26 -73 -22M-44 6C-58 12 -66 12 -73 8"/>' +
      '<path class="head-scale" d="M-28 -12c4 4 10 4 14 0M-18 -4c4 4 10 4 14 0M-32 1c4 4 10 4 14 0"/>' +
      "</g>" +
      "</g>"
    );
  }

  function splashMarkup(crossing) {
    return (
      '<g class="splash" data-kind="' + crossing.kind + '" transform="translate(' +
      crossing.x + " " + crossing.y + ')">' +
      '<g class="splash-rings"><ellipse rx="26" ry="8"/><ellipse rx="16" ry="5"/></g>' +
      '<g class="splash-foam">' +
      '<path d="M-38 3C-24 -16 -8 -16 0 -2C9 -18 26 -16 38 3"/>' +
      '<path d="M-26 7C-12 -2 13 -2 26 7"/>' +
      "</g>" +
      '<g class="splash-drops">' +
      '<circle cx="-22" cy="-12" r="2.4"/><circle cx="-9" cy="-24" r="2"/>' +
      '<circle cx="6" cy="-30" r="2.8"/><circle cx="21" cy="-14" r="2.1"/>' +
      '<circle cx="-1" cy="-40" r="1.7"/>' +
      "</g></g>"
    );
  }

  function dotMarkup() {
    return data.order.map(function (id) {
      const point = map.sites[id];
      if (!point) return "";
      return '<g class="reveal-node" transform="translate(' + point[0] + " " + point[1] + ')">' +
        '<circle r="12"/>' +
        '<g transform="translate(-5 -8) scale(.26)">' +
        window.RuneGlyphs.inline(data.runes[id].glyph) +
        "</g></g>";
    }).join("");
  }

  function build() {
    const bodyArt = route.runs.map(function (run) {
      const outline = outlineOf(run, 1);
      const belly = outlineOf(run, 0.44);
      return (
        '<g class="wyrm-run">' +
        '<path class="wyrm-glowpath" d="' + outline + '"/>' +
        '<path class="wyrm-outline" d="' + outline + '"/>' +
        '<path class="wyrm-belly" d="' + belly + '"/>' +
        detailOf(run) +
        "</g>"
      );
    }).join("");

    const ghostArt = route.runs.map(function (run) {
      return '<path class="wyrm-ghost" d="' + outlineOf(run, 1) + '"/>';
    }).join("");

    const masks = route.runs.map(function (run, index) {
      return '<path class="reveal-mask" data-run="' + index + '" d="' + centerline(run) +
        '" fill="none" stroke="#ffffff" stroke-width="60" stroke-linecap="butt" ' +
        'stroke-dasharray="0 99999"/>';
    }).join("");

    const splashesMarkup = route.crossings.map(splashMarkup).join("");
    const birthSplash = splashMarkup({ x: route.start[0], y: route.start[1], kind: "birth" });

    root.innerHTML =
      '<div class="reveal-scene">' +
      '<svg class="reveal-stage" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      window.MapMarkup.defs("rv") +
      "<defs>" +
      '<radialGradient id="headGlow">' +
      '<stop offset="0%" stop-color="rgba(255,196,110,.42)"/>' +
      '<stop offset="55%" stop-color="rgba(255,170,70,.12)"/>' +
      '<stop offset="100%" stop-color="rgba(255,160,60,0)"/>' +
      "</radialGradient>" +
      '<linearGradient id="wyrmSkin" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#d6b077"/>' +
      '<stop offset="45%" stop-color="#b3834a"/>' +
      '<stop offset="100%" stop-color="#7c5024"/>' +
      "</linearGradient>" +
      '<linearGradient id="wyrmBelly" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#f0dbae"/>' +
      '<stop offset="100%" stop-color="#cfae78"/>' +
      "</linearGradient>" +
      '<mask id="serpentReveal" maskUnits="userSpaceOnUse" x="-300" y="-300" width="2200" height="1500">' +
      '<rect x="-300" y="-300" width="2200" height="1500" fill="#000"/>' +
      masks +
      "</mask>" +
      '<clipPath id="landClip" clipPathUnits="userSpaceOnUse">' +
      '<path d="' + map.land + '" clip-rule="evenodd"/>' +
      "</clipPath>" +
      "</defs>" +
      window.MapMarkup.ocean("rv") +
      window.MapMarkup.creatureLayer() +
      '<g class="serpent-layer" mask="url(#serpentReveal)">' + bodyArt + "</g>" +
      headMarkup() +
      window.MapMarkup.land("rv") +
      '<g class="serpent-ghost" clip-path="url(#landClip)" mask="url(#serpentReveal)">' +
      ghostArt +
      "</g>" +
      '<g class="splash-layer">' + birthSplash + splashesMarkup + "</g>" +
      '<g class="reveal-nodes">' + dotMarkup() + "</g>" +
      window.MapMarkup.compass() +
      "</svg>" +
      '<div class="reveal-vignette"></div>' +
      '<div class="reveal-captions">' +
      '<p class="reveal-caption" data-caption="1">THE KATTEGAT · THE SEA OPENS</p>' +
      '<p class="reveal-caption" data-caption="2">AND IT CIRCLES ALL OF MIÐGARÐR</p>' +
      "</div>" +
      '<div class="reveal-frame" aria-hidden="true"></div>' +
      '<div class="reveal-center">' +
      '<p class="reveal-kicker">The encircler of Miðgarðr</p>' +
      '<h1 class="reveal-title">Jörmungandr</h1>' +
      '<div class="reveal-runes">' + runeWord("jormungandr") + "</div>" +
      '<p class="reveal-line">Three stones spoke. The world answered.</p>' +
      '<p class="reveal-copy">The serpent that gnaws its own tail has swum the whale-road ' +
      "and closed its jaws on the world. Miðgarðr is bound once more.</p>" +
      '<button class="reveal-btn" type="button">Begin again</button>' +
      "</div>" +
      '<div class="embers"></div>' +
      "</div>";

    head = root.querySelector(".wyrm-head");
    head.style.opacity = "0";
    maskEls = Array.prototype.slice.call(root.querySelectorAll(".reveal-mask"));
    splashes = Array.prototype.slice.call(root.querySelectorAll(".splash"));
    fired.clear();

    root.querySelector(".reveal-btn").addEventListener("click", function () {
      if (typeof onReset === "function") onReset();
    });

    const embers = root.querySelector(".embers");
    for (let i = 0; i < 34; i++) {
      const ember = document.createElement("span");
      ember.className = "ember";
      ember.style.left = (Math.random() * 100).toFixed(2) + "%";
      ember.style.animationDuration = (9 + Math.random() * 12).toFixed(1) + "s";
      ember.style.animationDelay = (-Math.random() * 14).toFixed(1) + "s";
      embers.appendChild(ember);
    }
  }

  const RUNE_WORD = { j: "jera", o: "othala", r: "raido", m: "mannaz", u: "uruz", n: "naudiz", g: "gebo", a: "ansuz", d: "dagaz" };

  function runeWord(word) {
    return word.split("").map(function (letter) {
      return '<svg viewBox="0 0 40 64" aria-hidden="true">' +
        window.RuneGlyphs.inline(RUNE_WORD[letter] || "isa") + "</svg>";
    }).join("");
  }

  function positionAt(arc) {
    const runs = route.runs;
    let run = runs[runs.length - 1];
    for (let i = 0; i < runs.length; i++) {
      if (arc <= runs[i].startArc + runs[i].length) {
        run = runs[i];
        break;
      }
    }
    const pts = run.points;
    const local = clamp((arc - run.startArc) / (run.length || 1), 0, 1);
    const index = clamp(Math.round(local * (pts.length - 1)), 0, pts.length - 1);
    const f = frameAt(pts, index);
    const angle = (Math.atan2(f.ty, f.tx) * 180) / Math.PI;
    return { x: f.p[0], y: f.p[1], angle: angle, nx: f.nx, ny: f.ny };
  }

  function tick(now) {
    if (!open) return;
    const elapsed = now - startTime;
    const progress = clamp((elapsed - LEAD) / TRAVEL, 0, 1);
    const headArc = progress * route.total;

    for (let i = 0; i < maskEls.length; i++) {
      const run = route.runs[i];
      const visible = clamp(headArc - run.startArc, 0, run.length);
      maskEls[i].style.strokeDasharray = visible.toFixed(1) + " 99999";
    }

    if (progress > 0) {
      const spot = positionAt(headArc);
      const bob = Math.sin(elapsed / 220) * 2.4;
      head.style.opacity = "1";
      head.setAttribute(
        "transform",
        "translate(" + (spot.x + spot.nx * bob).toFixed(1) + " " + (spot.y + spot.ny * bob).toFixed(1) +
        ") rotate(" + spot.angle.toFixed(1) + ") scale(0.92)"
      );
    }

    route.crossings.forEach(function (crossing, index) {
      if (headArc >= crossing.arc && !fired.has(index)) {
        fired.add(index);
        const el = splashes[index + 1];
        if (el) el.classList.add("go");
      }
    });

    if (progress > 0 && !fired.has("birth")) {
      fired.add("birth");
      if (splashes[0]) splashes[0].classList.add("go");
    }

    if (progress >= 1 && !complete) {
      complete = true;
      root.classList.add("is-complete");
    }

    raf = requestAnimationFrame(tick);
  }

  function show() {
    if (open) return;
    build();
    open = true;
    complete = false;
    root.hidden = false;
    void root.offsetWidth;
    root.classList.add("is-live");
    document.body.classList.add("is-revealed");

    const reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      route.runs.forEach(function (run, index) {
        if (maskEls[index]) maskEls[index].style.strokeDasharray = run.length.toFixed(1) + " 99999";
      });
      const end = positionAt(route.total);
      head.style.opacity = "1";
      head.setAttribute("transform", "translate(" + end.x.toFixed(1) + " " + end.y.toFixed(1) +
        ") rotate(" + end.angle.toFixed(1) + ") scale(0.92)");
      complete = true;
      root.classList.add("is-complete");
      return;
    }

    startTime = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function hide() {
    if (!open) return;
    open = false;
    cancelAnimationFrame(raf);
    root.classList.remove("is-live");
    root.classList.remove("is-complete");
    document.body.classList.remove("is-revealed");
    window.setTimeout(function () {
      if (!open) {
        root.hidden = true;
        root.innerHTML = "";
      }
    }, 900);
  }

  return { show: show, hide: hide, isOpen: function () { return open; } };
};
