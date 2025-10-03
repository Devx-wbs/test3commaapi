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

// Returns server's current public IP (for allowlisting). DEBUG_3C must be true.
app.get("/my-ip", async (_req, res) => {
  if (process.env.DEBUG_3C !== "true") return res.status(404).end();
  try {
    const axios = require("axios");
    const [ipify, ifconfig] = await Promise.all([
      axios
        .get("https://api.ipify.org?format=json", { timeout: 5000 })
        .catch(() => ({ data: null })),
      axios
        .get("https://ifconfig.me/ip", { timeout: 5000 })
        .catch(() => ({ data: null })),
    ]);
    res.json({ ok: true, ipify: ipify.data, ifconfig: ifconfig.data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
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

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
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

// Debug route to show exact URL being called
app.get("/debug-url", (req, res) => {
  if (process.env.DEBUG_3C !== "true") return res.status(404).end();
  const baseUrl = process.env.THREE_COMMAS_BASE_URL || "https://api.3commas.io";
  const path = "/public/api/ver1/accounts/new";
  res.json({
    ok: true,
    fullUrl: `${baseUrl}${path}`,
    baseUrl,
    path,
    expectedBy3Commas: "https://api.3commas.io/public/api/ver1/accounts/new",
  });
});

// Add probe endpoint to list accounts via 3Commas
app.get("/probe-accounts", async (_req, res) => {
  try {
    const data = await threeCommasService.listAccounts();
    res.status(200).json({ ok: true, data });
  } catch (error) {
    const status = error?.response?.status || 500;
    const details = error?.response?.data || { message: error.message };
    res.status(status).json({ ok: false, error: "Upstream error", details });
  }
});

// Generate signature for direct 3Commas testing (bypasses IP restrictions)
app.post("/generate-signature", (req, res) => {
  if (process.env.DEBUG_3C !== "true") return res.status(404).end();

  try {
    const { binanceApiKey, binanceApiSecret, name } = req.body || {};

    if (!binanceApiKey || !binanceApiSecret) {
      return res
        .status(400)
        .json({ error: "binanceApiKey and binanceApiSecret required" });
    }

    const crypto = require("crypto");
    const apiKey = process.env.THREE_COMMAS_API_KEY;
    const apiSecret = process.env.THREE_COMMAS_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res
        .status(500)
        .json({ error: "3Commas API credentials not configured" });
    }

    const path = "/public/api/ver1/accounts/new";
    const accountName = name || "New account";

    // Build payload (same as your Postman script)
    const params = {
      type: "binance",
      name: accountName,
      api_key: binanceApiKey,
      secret: binanceApiSecret,
      "types_to_create[]": "binance",
    };

    // Sort and encode
    const entries = Object.entries(params).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const bodyString = entries
      .map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
      )
      .join("&");

    // Compute signature
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(`${path}?${bodyString}`)
      .digest("hex");

    res.json({
      ok: true,
      postmanSetup: {
        method: "POST",
        url: "https://api.3commas.io/public/api/ver1/accounts/new",
        headers: {
          APIKEY: apiKey,
          Signature: signature,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: {
          mode: "urlencoded",
          urlencoded: entries.map(([k, v]) => ({ key: k, value: String(v) })),
        },
      },
      debug: {
        path,
        bodyString,
        signature,
        signedString: `${path}?${bodyString}`,
        apiKeyLength: apiKey.length,
        signatureLength: signature.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
