// Simple in-memory cache for prices, user balances, and ban cooldowns

const priceCache = new Map(); // key: symbol (e.g., BTCUSDT) -> { price, ts }
const userBalanceCache = new Map(); // key: userId -> { assets, ts }

let binanceBanUntilMs = 0; // epoch ms until which we avoid REST calls

module.exports = {
  // Prices
  getCachedPrice(symbol, ttlMs = 30000) {
    const rec = priceCache.get(symbol);
    if (!rec) return undefined;
    if (Date.now() - rec.ts > ttlMs) return undefined;
    return rec.price;
  },
  setCachedPrice(symbol, price) {
    priceCache.set(symbol, { price: Number(price), ts: Date.now() });
  },
  // Balances by user
  getCachedUserBalances(userId, ttlMs = 60000) {
    const rec = userBalanceCache.get(String(userId));
    if (!rec) return undefined;
    if (Date.now() - rec.ts > ttlMs) return undefined;
    return rec.assets; // [{ asset, balance }]
  },
  setCachedUserBalances(userId, assets) {
    userBalanceCache.set(String(userId), { assets, ts: Date.now() });
  },
  // Ban cooldown
  setBinanceBanUntil(epochMs) {
    if (Number.isFinite(epochMs))
      binanceBanUntilMs = Math.max(binanceBanUntilMs, Number(epochMs));
  },
  getBinanceBanUntil() {
    return binanceBanUntilMs;
  },
  isBinanceBannedNow() {
    return Date.now() < binanceBanUntilMs;
  },
};
