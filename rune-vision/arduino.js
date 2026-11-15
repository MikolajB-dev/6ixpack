/* Grove Arduino lock button + OLED (see arduino/README.md).
   - Button on the Arduino  -> lockIn()   (exactly what SPACE does)
   - Letter the knob points at right now -> shown big on the Arduino's OLED
   The page talks to the Arduino's USB port directly (Web Serial), so no extra program is needed.
   Works in Chrome or Edge (Windows or Mac). Other browsers: the button just isn't shown; SPACE still works.

   Messages on the USB cable, one per line:  Arduino -> page "LOCK",  page -> Arduino "SHOW B"
   Letters: A-D, '-' = no rune on the board, '?' = rune there but its knob dot isn't visible. */
(function () {
  if (!('serial' in navigator)) return;

  let writer = null;      // set while an Arduino is connected
  let lastSent = null;    // last letter sent, so we only send changes

  // "Connect Arduino" button next to "Globe (G)". Needed once: the browser asks which USB device to use.
  const button = document.createElement('button');
  button.textContent = 'Connect Arduino';
  button.title = 'Connect the Grove lock button (once; afterwards it reconnects by itself)';
  document.getElementById('globeBtn').after(button);
  button.onclick = async () => {
    try { await connect(await navigator.serial.requestPort()); }
    catch (e) { console.log('[arduino] no port chosen', e); }
  };

  async function connect(port) {
    try {
      await port.open({ baudRate: 9600 });
    } catch (e) {
      hint('Arduino: could not open the USB port. Close the Arduino IDE and try again.');
      return;
    }
    writer = port.writable.getWriter();
    button.style.display = 'none';
    hint('Arduino lock button connected.');
    setTimeout(() => { lastSent = null; }, 2000);   // opening the port restarts the Arduino; resend the letter once it's up
    readLines(port);
  }

  // Reads text from the Arduino and reacts to each full line.
  async function readLines(port) {
    const reader = port.readable.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        let end;
        while ((end = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, end).trim();
          buffer = buffer.slice(end + 1);
          if (line === 'LOCK') lockIn();
        }
      }
    } catch (e) { /* unplugged */ }
    writer = null;
    button.style.display = '';
    hint('Arduino unplugged. Plug it back in (it reconnects by itself) or press SPACE.');
    try { reader.releaseLock(); await port.close(); } catch (e) {}
  }

  async function show(letter) {
    if (!writer) return;
    try { await writer.write(new TextEncoder().encode('SHOW ' + letter + '\n')); }
    catch (e) { lastSent = null; }
  }

  // Every 0.2 s: which letter would be locked in right now? Send it only when it changes.
  setInterval(() => {
    if (!writer) return;
    const target = lockTarget();
    const letter = !target ? '-' : (target.choice || '?');
    if (letter === lastSent) return;
    lastSent = letter;
    show(letter);
  }, 200);

  // Reconnect by itself: on page load, and when an already-allowed Arduino is plugged back in.
  navigator.serial.getPorts().then(ports => { if (ports[0]) connect(ports[0]); });
  navigator.serial.addEventListener('connect', e => { if (!writer) connect(e.target); });
})();
