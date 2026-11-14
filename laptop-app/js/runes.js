/* Elder Futhark glyphs, hand drawn as strokes in a 40 x 64 box.
   Drawn rather than typeset so the installation never depends on a runic font. */
window.RuneGlyphs = (function () {
  const GLYPHS = {
    fehu: "M12 60L12 6M12 27L34 14M12 42L34 29",
    uruz: "M10 6L10 45Q10 60 20 60Q30 60 30 45M30 6L30 60",
    thurisaz: "M14 6L14 60M14 20L32 33L14 46",
    ansuz: "M11 6L11 60M11 19L31 9M11 33L31 23",
    raido: "M11 6L11 60M11 8L33 18L33 34L11 44M11 44L34 60",
    kenaz: "M31 8L13 32L31 56",
    gebo: "M11 8L29 56M29 8L11 56",
    wunjo: "M11 6L11 60M11 8L31 21L11 34",
    naudiz: "M20 6L20 58M20 6L33 20M20 34L33 20",
    isa: "M20 5L20 59",
    jera: "M12 8L28 24L12 40L28 56M28 8L12 24L28 40L12 56",
    eihwaz: "M20 4L20 60M20 4L10 16M20 60L30 48",
    algiz: "M20 6L20 60M20 20L8 6M20 20L32 6",
    sowilo: "M9 9L31 30L9 51",
    tiwaz: "M20 60L20 6M6 20L20 6L34 20",
    berkano: "M12 6L12 60M12 10L28 18L28 30L12 38M12 34L28 44L28 54L12 60",
    ehwaz: "M12 60L12 8L28 24L28 6L28 60",
    mannaz: "M10 60L10 6L20 26L30 6L30 60",
    laguz: "M12 5L12 60M12 5L35 60",
    ingwaz: "M20 16L32 32L20 48L8 32Z",
    dagaz: "M9 10L31 32L9 54L9 32L31 10",
    othala: "M20 4L34 22L20 40L6 22ZM12 30L6 60M28 30L34 60"
  };

  function path(id) {
    return GLYPHS[id] || GLYPHS.isa;
  }

  function inline(id, className) {
    return '<path d="' + path(id) + '"' + (className ? ' class="' + className + '"' : "") + "/>";
  }

  return { path: path, inline: inline, ids: Object.keys(GLYPHS) };
})();
