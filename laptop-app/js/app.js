/* Boot the installation and wire the pieces together. */
(function () {
  const data = window.AppData;
  const byId = function (id) { return document.getElementById(id); };

  const puzzle = window.createPuzzle(data);
  const mapView = window.createMap(byId("map"), data);
  const board = window.createBoard(
    { seats: byId("seats"), tray: byId("tray"), log: byId("log") },
    data,
    puzzle
  );
  const reveal = window.createReveal(byId("reveal"), {
    data: data,
    onReset: resetAll
  });

  let activated = new Set();

  function render(state) {
    mapView.sync(state);
    board.sync(state);

    const live = data.order.filter(function (id) {
      const status = state.runes[id].status;
      return status === "broadcast" || status === "linked";
    });

    const awaken = byId("awaken");
    if (awaken) {
      awaken.hidden = !(state.ready && !state.revealed);
    }

    const status = byId("map-status");
    if (state.revealed) {
      status.textContent = "All stones linked — Jörmungandr wakes";
    } else if (state.ready) {
      status.textContent = "All three stones linked · the serpent waits for you";
    } else if (live.length === 0) {
      status.textContent = "No stones placed — the map sleeps";
    } else {
      status.textContent = live.length + " of 3 stones broadcasting · " +
        state.links.length + (state.links.length === 1 ? " link" : " links");
    }
    status.classList.toggle("is-live", live.length > 0);

    live.forEach(function (id) {
      if (!activated.has(id)) {
        activated.add(id);
        bridge.send({ t: "activate", rune: id });
      }
    });
  }

  function resetAll() {
    activated = new Set();
    puzzle.reset();
    mapView.reset();
    reveal.hide();
    bridge.send({ t: "reset" });
  }

  puzzle.onChange(render);
  puzzle.onReveal(function () { reveal.show(); });

  function setMode(mode, label) {
    const pill = byId("reader-pill");
    pill.dataset.mode = mode;
    byId("reader-label").textContent = label;
  }

  const bridge = window.createBridge({
    onStatus: function (payload) {
      if (payload.state === "connected") {
        setMode("live", payload.label || "Reader · gateway");
        puzzle.note("sys", "Gateway connected · physical tags will seat the stones");
      } else {
        setMode("sim", "Reader · simulation");
        puzzle.note("reject", "Gateway lost · falling back to simulation");
      }
    },
    onScan: function (event) {
      const uid = String(event.uid || "").toUpperCase();
      const runeId = data.tagIndex[uid];
      const seat = normalizeSeat(event.slot);
      if (!runeId) {
        puzzle.note("reject", "Unknown tag " + uid + " · register it in js/data.js");
        return;
      }
      if (seat === null) {
        puzzle.note("reject", "Gateway reported an unknown seat (" + event.slot + ")");
        return;
      }
      puzzle.note("tag", "Gateway · tag " + uid + " presented at seat " +
        data.slots[seat].id);
      if (!puzzle.placeRune(runeId, seat)) {
        puzzle.note("reject", "Seat " + data.slots[seat].id + " is busy or the stone is already placed");
      }
    },
    onTelemetry: function (message) {
      const rune = data.runes[message.rune];
      const name = rune ? rune.name : String(message.rune || "?").toUpperCase();
      if (message.t === "link") {
        puzzle.note("mesh", "Gateway · " + name + " heard " +
          String(message.peer || "?").toUpperCase() + " (" + (message.rssi || "?") + " dBm)");
      } else {
        puzzle.note("ble", "Gateway · " + name + " " + (message.state || "advertising") +
          (message.rssi ? " (" + message.rssi + " dBm)" : ""));
      }
    }
  });

  function normalizeSeat(value) {
    if (typeof value === "number") {
      if (value >= 1 && value <= 3) return value - 1;
      if (value === 0) return 0;
      return null;
    }
    const text = String(value || "").toUpperCase();
    const seats = { I: 0, II: 1, III: 2, "1": 0, "2": 1, "3": 2 };
    return Object.prototype.hasOwnProperty.call(seats, text) ? seats[text] : null;
  }

  byId("btn-reset").addEventListener("click", resetAll);

  const awakenBtn = byId("awaken-btn");
  if (awakenBtn) {
    awakenBtn.addEventListener("click", function () { puzzle.awaken(); });
  }

  byId("btn-serial").addEventListener("click", async function () {
    try {
      await bridge.connect();
    } catch (error) {
      puzzle.note("sys", error && error.message ? error.message : "Reader connection cancelled");
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "r") {
      resetAll();
    } else if (key === "f") {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } else if (event.key === "Escape" && reveal.isOpen()) {
      resetAll();
    }
  });

  const initial = {
    runes: {},
    slots: [],
    links: [],
    log: [],
    ready: false,
    revealed: false
  };
  data.order.forEach(function (id) {
    initial.runes[id] = { id: id, status: "tray", slot: null, peers: [] };
  });
  data.slots.forEach(function () { initial.slots.push({ runeId: null, phase: "empty" }); });
  board.sync(initial);
  mapView.sync(initial);

  puzzle.note("sys", "Tip: drag a stone onto the seat its kenning points to");
})();
