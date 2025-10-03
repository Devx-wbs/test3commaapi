const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "userAccounts.json");

function ensureStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE))
      fs.writeFileSync(DATA_FILE, JSON.stringify({}), "utf-8");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to ensure user store:", e.message);
  }
}

function readAll() {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw || "{}");
  } catch (_e) {
    return {};
  }
}

function writeAll(data) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
  saveMapping(userId, accountId) {
    if (!userId || !accountId) return;
    const all = readAll();
    const id = String(userId);
    const prev = all[id] || {};
    all[id] = { ...prev, threeCommasAccountId: String(accountId) };
    writeAll(all);
  },
  getAccountId(userId) {
    if (!userId) return undefined;
    const all = readAll();
    const entry = all[String(userId)];
    return entry && entry.threeCommasAccountId;
  },
  setBinanceCreds(userId, apiKey, apiSecret) {
    if (!userId || !apiKey || !apiSecret) return;
    const all = readAll();
    const id = String(userId);
    const prev = all[id] || {};
    all[id] = { ...prev, binance: { apiKey, apiSecret } };
    writeAll(all);
  },
  getBinanceCreds(userId) {
    if (!userId) return undefined;
    const all = readAll();
    return all[String(userId)]?.binance;
  },
  getAllMappings() {
    return readAll();
  },
};
