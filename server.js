const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const threeCommasService = require("./src/threeCommasService");

dotenv.config();

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "3commas-direct-api-test" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/debug", (_req, res) => {
  if (process.env.DEBUG_3C !== "true") return res.status(404).end();
  const keys = {
    hasKey: Boolean(process.env.THREE_COMMAS_API_KEY),
    hasSecret: Boolean(process.env.THREE_COMMAS_API_SECRET),
    keyLen: process.env.THREE_COMMAS_API_KEY
      ? String(process.env.THREE_COMMAS_API_KEY).length
      : 0,
    secretLen: process.env.THREE_COMMAS_API_SECRET
      ? String(process.env.THREE_COMMAS_API_SECRET).length
      : 0,
    baseUrl: process.env.THREE_COMMAS_BASE_URL,
  };
  res.json({ ok: true, env: keys });
});

app.post("/create-account", async (req, res) => {
  try {
    const { binanceApiKey, binanceApiSecret, name } = req.body || {};
    if (!binanceApiKey || !binanceApiSecret) {
      return res
        .status(400)
        .json({ error: "binanceApiKey and binanceApiSecret are required" });
    }

    const accountName = name || "New account";

    const result = await threeCommasService.createBinanceAccount({
      binanceApiKey,
      binanceApiSecret,
      name: accountName,
    });

    res.status(200).json(result);
  } catch (error) {
    const status = error?.response?.status || 500;
    const data = error?.response?.data || { message: error.message };
    res.status(status).json({ error: "Upstream error", details: data });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Debug route to inspect signing (no call to 3Commas). Only when DEBUG_3C=true
app.post("/debug-sign", (req, res) => {
  if (process.env.DEBUG_3C !== "true") return res.status(404).end();
  try {
    const { binanceApiKey, binanceApiSecret, name } = req.body || {};
    const data = require("./src/threeCommasService")._debugBuild({
      binanceApiKey,
      binanceApiSecret,
      name,
    });
    // Do not expose raw API key; only lengths
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
