/* Puzzle state machine: seat a stone, the reader verifies its tag, the stone
   starts broadcasting, and broadcasting stones link to each other. */
window.createPuzzle = function (data) {
  const TIMING = {
    scan: 950,      // NFC read + verification
    activate: 800,  // stone wakes its beacon
    link: 750,      // mesh handshake
    reject: 1700,   // how long a refused seat stays red
    summon: 2300    // pause after the last link before the reveal
  };

  const listeners = [];
  const revealListeners = [];
  const timers = new Set();
  const state = {
    runes: {},
    slots: [],
    links: [],
    log: [],
    ready: false,
    revealed: false,
    startedAt: Date.now()
  };

  function resetRune(id) {
    state.runes[id] = { id: id, status: "tray", slot: null, peers: [] };
  }

  function later(fn, ms) {
    const id = setTimeout(function () {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function stamp() {
    const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" +
      String(seconds % 60).padStart(2, "0");
  }

  function log(kind, text) {
    state.log.push({ t: stamp(), kind: kind, text: text });
  }

  function snapshot() {
    return {
      runes: state.runes,
      slots: state.slots,
      links: state.links,
      log: state.log,
      ready: state.ready,
      revealed: state.revealed
    };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach(function (fn) { fn(snap); });
  }

  function note(kind, text) {
    log(kind, text);
    emit();
  }

  function placeRune(runeId, seatIndex) {
    const rune = state.runes[runeId];
    const seat = state.slots[seatIndex];
    const seatInfo = data.slots[seatIndex];
    const runeInfo = data.runes[runeId];

    if (!rune || !seat || !seatInfo || !runeInfo) return false;
    if (state.revealed) return false;
    if (rune.status !== "tray" || seat.runeId) return false;

    seat.runeId = runeId;
    seat.phase = "scanning";
    rune.status = "scanning";
    rune.slot = seatIndex;

    log("scan", "Reader · polling seat " + seatInfo.id + " for a tag");
    emit();

    later(function () {
      log("tag", "Tag " + runeInfo.tag + " read · " + runeInfo.ble + " stone recognised");

      if (seatInfo.runeId !== runeId) {
        seat.runeId = null;
        seat.phase = "rejected";
        rune.status = "tray";
        rune.slot = null;
        log("reject", "Seat " + seatInfo.id + " refused " + runeInfo.name +
          " · the stone stays cold");
        emit();
        later(function () {
          if (seat.phase === "rejected") {
            seat.phase = "empty";
            emit();
          }
        }, TIMING.reject);
        return;
      }

      seat.phase = "verified";
      rune.status = "verified";
      log("ok", "Tag verified · " + runeInfo.name + " belongs to seat " + seatInfo.id);
      emit();

      later(function () {
        rune.status = "broadcast";
        seat.phase = "broadcast";
        log("ble", "BLE broadcast live · " + runeInfo.ble + " @ " + runeInfo.channel);
        emit();
        connect(runeId);
      }, TIMING.activate);
    }, TIMING.scan);

    return true;
  }

  function connect(runeId) {
    const peers = data.order.filter(function (id) {
      if (id === runeId) return false;
      const status = state.runes[id].status;
      return status === "broadcast" || status === "linked";
    });

    peers.forEach(function (peerId, index) {
      later(function () { linkPair(runeId, peerId); }, TIMING.link + index * 420);
    });
  }

  function linkPair(a, b) {
    const exists = state.links.some(function (link) {
      return (link.a === a && link.b === b) || (link.a === b && link.b === a);
    });
    if (exists) return;
    if (state.runes[a].status === "tray" || state.runes[b].status === "tray") return;

    const rssi = -(46 + Math.round(Math.random() * 18));
    state.links.push({ a: a, b: b, rssi: rssi });
    state.runes[a].peers.push(b);
    state.runes[b].peers.push(a);

    [a, b].forEach(function (id) {
      const rune = state.runes[id];
      if (rune.status === "broadcast") rune.status = "linked";
      if (rune.slot !== null && state.slots[rune.slot]) {
        state.slots[rune.slot].phase = "linked";
      }
    });

    const nameA = data.runes[a].glyph ? data.runes[a].name : a;
    const nameB = data.runes[b].glyph ? data.runes[b].name : b;
    log("mesh", "MESH · " + nameA + " ⇄ " + nameB + " linked (" + rssi + " dBm)");
    emit();
    finishIfComplete();
  }

  function finishIfComplete() {
    if (state.revealed) return;
    if (state.links.length < 3) return;
    const complete = data.order.every(function (id) {
      return state.runes[id].peers.length === 2;
    });
    if (!complete) return;

    state.ready = true;
    log("summon", "All three stones are speaking · the serpent waits beneath the sea");
    emit();
  }

  /* The finale is never automatic: the visitor calls the serpent. */
  function awaken() {
    if (!state.ready || state.revealed) return false;
    state.revealed = true;
    log("summon", "The runes are read · Jörmungandr is called up from the Kattegat");
    emit();
    revealListeners.forEach(function (fn) { fn(); });
    return true;
  }

  function reset() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers.clear();
    data.order.forEach(resetRune);
    state.slots.forEach(function (seat) {
      seat.runeId = null;
      seat.phase = "empty";
    });
    state.links = [];
    state.log = [];
    state.ready = false;
    state.revealed = false;
    state.startedAt = Date.now();
    log("sys", "Board reset · the stones return to the tray");
    emit();
  }

  data.order.forEach(resetRune);
  data.slots.forEach(function () {
    state.slots.push({ runeId: null, phase: "empty" });
  });
  log("sys", "Board armed · three stones, three seats");
  log("sys", "NFC reader in simulation · connect a gateway to read real tags");

  return {
    placeRune: placeRune,
    awaken: awaken,
    reset: reset,
    note: note,
    onChange: function (fn) { listeners.push(fn); return function () { listeners.splice(listeners.indexOf(fn), 1); }; },
    onReveal: function (fn) { revealListeners.push(fn); return function () { revealListeners.splice(revealListeners.indexOf(fn), 1); }; }
  };
};
