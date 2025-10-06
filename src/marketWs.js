const WebSocket = require("ws");
const cache = require("./cache");

const BASE_WSS = process.env.BINANCE_WSS_BASE || "wss://stream.binance.com:9443";

let ws = null;
let connected = false;
let connecting = false;
let wantStreams = new Set(); // e.g., btcusdt@bookTicker

function buildCombinedUrl() {
  const streams = Array.from(wantStreams).join("/");
  return `${BASE_WSS}/stream?streams=${streams}`;
}

function connect() {
  if (connecting || connected) return;
  connecting = true;
  const url = wantStreams.size > 0 ? buildCombinedUrl() : `${BASE_WSS}/ws/heartbeat`;
  ws = new WebSocket(url);

  ws.on("open", () => {
    connected = true;
    connecting = false;
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data);
      const payload = msg?.data || msg; // combined vs single
      const stream = msg?.stream;
      handleMessage(payload, stream);
    } catch (_e) {}
  });

  ws.on("close", () => {
    connected = false;
    connecting = false;
    setTimeout(() => connect(), 1000);
  });

  ws.on("error", () => {
    try {
      ws.close();
    } catch (_e) {}
  });
}

function handleMessage(payload, stream) {
  // Expect bookTicker: { s: "BTCUSDT", b: bid, a: ask }
  const p = payload;
  const symbol = p?.s || p?.symbol;
  if (symbol && (p?.a || p?.b || p?.c || p?.p)) {
    const price = Number(p?.a || p?.b || p?.c || p?.p);
    if (Number.isFinite(price)) cache.setCachedPrice(symbol, price);
  }
}

function normalizeSymbol(sym) {
  return String(sym || "").trim().toUpperCase();
}

function streamNameForSymbol(symbol) {
  return `${normalizeSymbol(symbol).toLowerCase()}@bookTicker`;
}

module.exports = {
  ensureConnected() {
    connect();
  },
  subscribeSymbols(symbols) {
    const list = Array.isArray(symbols) ? symbols : [symbols];
    for (const sym of list) {
      const s = streamNameForSymbol(sym);
      wantStreams.add(s);
    }
    if (connected) {
      try {
        const params = list.map((s) => streamNameForSymbol(s));
        ws.send(JSON.stringify({ method: "SUBSCRIBE", params, id: Date.now() }));
      } catch (_e) {}
    } else {
      connect();
    }
  },
  unsubscribeSymbols(symbols) {
    const list = Array.isArray(symbols) ? symbols : [symbols];
    for (const sym of list) {
      wantStreams.delete(streamNameForSymbol(sym));
    }
    if (connected) {
      try {
        const params = list.map((s) => streamNameForSymbol(s));
        ws.send(JSON.stringify({ method: "UNSUBSCRIBE", params, id: Date.now() }));
      } catch (_e) {}
    }
  },
  getPrice(symbol) {
    const sym = normalizeSymbol(symbol);
    return cache.getCachedPrice(sym);
  },
};


