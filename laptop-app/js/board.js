/* The board rail: three seats, three stones, one chronicle. */
window.createBoard = function (refs, data, puzzle) {
  const seatEls = [];
  const stoneEls = {};
  let selected = null;
  let rendered = 0;

  function refreshSelection() {
    data.order.forEach(function (id) {
      stoneEls[id].classList.toggle("is-selected", selected === id);
    });
  }

  function attemptPlace(seatIndex) {
    if (!selected) return;
    if (puzzle.placeRune(selected, seatIndex)) {
      selected = null;
      refreshSelection();
    }
  }

  data.slots.forEach(function (slot, index) {
    const seat = document.createElement("div");
    seat.className = "seat";
    seat.dataset.phase = "empty";
    seat.dataset.seat = String(index);
    seat.tabIndex = 0;
    seat.setAttribute("role", "button");
    seat.setAttribute("aria-label", "Seat " + slot.id + ": " + slot.hint);
    seat.innerHTML =
      '<div class="seat-medallion">' +
      '<svg class="carving" viewBox="0 0 40 64" aria-hidden="true"><path d="M20 16L32 32L20 48L8 32Z"/></svg>' +
      '<svg class="seated-rune" viewBox="0 0 40 64" aria-hidden="true">' +
      window.RuneGlyphs.inline(data.runes[slot.runeId].glyph) +
      "</svg>" +
      "</div>" +
      '<div class="seat-copy">' +
      '<div class="seat-line"><span class="seat-numeral">' + slot.id +
      '</span><span class="seat-state">Empty</span></div>' +
      '<p class="seat-hint">' + slot.hint + "</p>" +
      '<p class="seat-meta"></p>' +
      "</div>";

    seat.addEventListener("click", function () { attemptPlace(index); });
    seat.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        attemptPlace(index);
      }
    });
    seat.addEventListener("dragover", function (event) {
      if (!selected) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      seat.classList.add("is-target");
    });
    seat.addEventListener("dragleave", function () { seat.classList.remove("is-target"); });
    seat.addEventListener("drop", function (event) {
      event.preventDefault();
      seat.classList.remove("is-target");
      const id = event.dataTransfer.getData("text/plain") || selected;
      if (id && data.runes[id]) {
        selected = id;
        attemptPlace(index);
      }
    });

    seatEls.push(seat);
    refs.seats.appendChild(seat);
  });

  data.order.forEach(function (id) {
    const rune = data.runes[id];
    const stone = document.createElement("button");
    stone.type = "button";
    stone.className = "stone";
    stone.draggable = true;
    stone.dataset.rune = id;
    stone.innerHTML =
      '<span class="stone-disc"><svg viewBox="0 0 40 64" aria-hidden="true">' +
      window.RuneGlyphs.inline(rune.glyph) +
      "</svg></span>" +
      '<span class="stone-name">' + rune.name + "</span>" +
      '<span class="stone-gloss">' + rune.gloss + "</span>";

    stone.addEventListener("click", function () {
      if (stone.disabled) return;
      selected = selected === id ? null : id;
      refreshSelection();
    });
    stone.addEventListener("dragstart", function (event) {
      if (stone.disabled) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData("text/plain", id);
      event.dataTransfer.effectAllowed = "move";
      stone.classList.add("is-dragging");
      selected = id;
      refreshSelection();
    });
    stone.addEventListener("dragend", function () {
      stone.classList.remove("is-dragging");
      seatEls.forEach(function (seat) { seat.classList.remove("is-target"); });
    });

    stoneEls[id] = stone;
    refs.tray.appendChild(stone);
  });

  const labels = {
    empty: "Empty",
    scanning: "Reading tag",
    rejected: "Refused",
    verified: "Tag verified",
    broadcast: "Broadcasting",
    linked: "Linked"
  };

  function sync(state) {
    state.slots.forEach(function (slot, index) {
      const seat = seatEls[index];
      const rune = slot.runeId ? data.runes[slot.runeId] : null;
      seat.dataset.phase = slot.phase;
      seat.classList.toggle("is-filled", Boolean(rune));
      seat.querySelector(".seat-state").textContent = labels[slot.phase] || "Empty";
      seat.querySelector(".seat-meta").textContent = rune
        ? rune.site + " · " + rune.coords
        : "";
    });

    data.order.forEach(function (id) {
      const stone = stoneEls[id];
      const away = state.runes[id].status !== "tray";
      stone.disabled = away;
      stone.classList.toggle("is-away", away);
      if (away && selected === id) selected = null;
    });

    if (state.log.length < rendered) {
      refs.log.innerHTML = "";
      rendered = 0;
    }

    for (; rendered < state.log.length; rendered++) {
      const entry = state.log[rendered];
      const line = document.createElement("li");
      line.className = "log-line";
      line.dataset.kind = entry.kind;
      const time = document.createElement("span");
      time.className = "log-time";
      time.textContent = entry.t;
      const text = document.createElement("span");
      text.className = "log-text";
      text.textContent = entry.text;
      line.appendChild(time);
      line.appendChild(text);
      refs.log.appendChild(line);
    }

    refs.log.scrollTop = refs.log.scrollHeight;
    refreshSelection();
  }

  return { sync: sync };
};
