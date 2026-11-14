/* Optional hardware bridge: JSON lines over Web Serial (Chrome/Edge).
   The gateway firmware speaks this protocol; see docs/protocol.md. */
window.createBridge = function (handlers) {
  let port = null;
  let writer = null;
  let reader = null;
  let buffer = "";

  function status(state, label) {
    if (handlers && typeof handlers.onStatus === "function") {
      handlers.onStatus({ state: state, label: label });
    }
  }

  function handleLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      return;
    }
    if (!message || typeof message !== "object") return;

    if (message.t === "scan" && handlers.onScan) {
      handlers.onScan({ slot: message.slot, uid: message.uid });
    } else if ((message.t === "ble" || message.t === "link") && handlers.onTelemetry) {
      handlers.onTelemetry(message);
    } else if (message.t === "hello" && handlers.onStatus) {
      status("connected", "Reader · " + (message.fw || "gateway"));
    }
  }

  async function readLoop() {
    const decoder = new TextDecoder();
    reader = port.readable.getReader();
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        let index;
        while ((index = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 1);
          if (line) handleLine(line);
        }
      }
    } catch (error) {
      status("error", "Reader · disconnected");
    } finally {
      if (reader) {
        reader.releaseLock();
        reader = null;
      }
    }
  }

  async function connect() {
    if (!("serial" in navigator)) {
      throw new Error("Web Serial is unavailable — use Chrome or Edge, served over localhost.");
    }
    const chosen = await navigator.serial.requestPort();
    await chosen.open({ baudRate: 115200 });
    port = chosen;
    writer = port.writable.getWriter();
    buffer = "";
    status("connected", "Reader · gateway");
    readLoop();
    return true;
  }

  async function send(message) {
    if (!writer) return false;
    try {
      await writer.write(new TextEncoder().encode(JSON.stringify(message) + "\n"));
      return true;
    } catch (error) {
      return false;
    }
  }

  return {
    connect: connect,
    send: send,
    isConnected: function () { return Boolean(writer); }
  };
};
