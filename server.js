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
