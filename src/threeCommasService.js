const axios = require("axios");
const crypto = require("crypto");

function buildFormBody(params) {
  const entries = Object.entries(params)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );
  return entries.join("&");
}

function signRequest(path, bodyString, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${path}?${bodyString}`)
    .digest("hex");
}

async function createBinanceAccount({ binanceApiKey, binanceApiSecret, name }) {
  const apiKey = process.env.THREE_COMMAS_API_KEY;
  const apiSecret = process.env.THREE_COMMAS_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Missing THREE_COMMAS_API_KEY or THREE_COMMAS_API_SECRET in environment"
    );
  }

  const baseUrl = process.env.THREE_COMMAS_BASE_URL || "https://api.3commas.io";
  const path = "/public/api/ver1/accounts/new";

  const payload = {
    type: "binance",
    name: name || "New account",
    api_key: binanceApiKey,
    secret: binanceApiSecret,
    "types_to_create[]": "binance",
  };

  const bodyString = buildFormBody(payload);
  const signature = signRequest(path, bodyString, apiSecret);

  const headers = {
    APIKEY: apiKey,
    Signature: signature,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const url = `${baseUrl}${path}`;

  const response = await axios.post(url, bodyString, { headers });
  return response.data;
}

module.exports = {
  createBinanceAccount,
};
