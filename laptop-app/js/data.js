/* The three stones, the three seats, and the tag UIDs that bind them. */
window.AppData = (function () {
  const runes = {
    othala: {
      id: "othala",
      name: "OÞALA",
      glyph: "othala",
      gloss: "the inheritance",
      site: "Gamla Uppsala",
      land: "Svíþjóð · Sweden",
      coords: "59.90° N · 17.64° E",
      tag: "04:A2:C7:1E:09:6B:80",
      ble: "RUNE-OTHALA",
      channel: "2480 MHz",
      kenning:
        "I am the land a father leaves his son. The kings sleep in their mounds beneath me.",
      label: { dx: 62, dy: -126, anchor: "start" }
    },
    laguz: {
      id: "laguz",
      name: "LAGUZ",
      glyph: "laguz",
      gloss: "the water",
      site: "L'Anse aux Meadows",
      land: "Vinland · Newfoundland",
      coords: "51.60° N · 55.53° W",
      tag: "04:B1:9D:44:E2:71:80",
      ble: "RUNE-LAGUZ",
      channel: "2426 MHz",
      kenning:
        "I am the cold water beneath the keel. I kept the ship when the shore was gone.",
      label: { dx: -52, dy: 88, anchor: "end" }
    },
    raido: {
      id: "raido",
      name: "RAIÐO",
      glyph: "raido",
      gloss: "the ride",
      site: "Miklagarðr",
      land: "Constantinople · Byzantium",
      coords: "41.01° N · 28.98° E",
      tag: "04:C6:3A:8B:1F:D5:80",
      ble: "RUNE-RAIDO",
      channel: "2402 MHz",
      kenning:
        "I am the road under the horse. I carried the northmen south to the golden city.",
      label: { dx: 50, dy: 120, anchor: "start" }
    }
  };

  const slots = [
    {
      id: "I",
      runeId: "othala",
      hint: "Where the mounds of kings keep watch above the plain"
    },
    {
      id: "II",
      runeId: "laguz",
      hint: "Where the whale-road ends in vines and wild grapes"
    },
    {
      id: "III",
      runeId: "raido",
      hint: "Where a northman carved his name in the great church of the south"
    }
  ];

  // Tray order is deliberately not the seat order.
  const order = ["laguz", "raido", "othala"];

  const tagIndex = {};
  Object.keys(runes).forEach(function (id) {
    tagIndex[runes[id].tag.toUpperCase()] = id;
  });

  return { runes: runes, slots: slots, order: order, tagIndex: tagIndex };
})();
