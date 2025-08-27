# 3Commas Create Account Test Server

Minimal Express backend to test signing and forwarding a request to 3Commas API to create a Binance account.

## Setup (Local)

1. Copy environment file:
   - Create a `.env` file in the project root with:

```
PORT=3001
THREE_COMMAS_BASE_URL=https://api.3commas.io
THREE_COMMAS_API_KEY=your_3commas_api_key
THREE_COMMAS_API_SECRET=your_3commas_api_secret
CORS_ORIGIN=*
```

2. Install dependencies:

```
npm install
```

3. Start server:

```
node server.js
```

## Endpoint

POST `/create-account`

Body (JSON):

```
{
  "binanceApiKey": "...",
  "binanceApiSecret": "...",
  "name": "New account"
}
```

Response: Pass-through of 3Commas API response, or error with details from upstream.

## Deploy to Railway

1. Create a new Railway project and select "Deploy from GitHub" or upload this repo.
2. In Railway, add Environment Variables in the service settings:
   - `PORT` = `3000` (Railway will inject a port; you can omit this if using `process.env.PORT` only)
   - `THREE_COMMAS_BASE_URL` = `https://api.3commas.io`
   - `THREE_COMMAS_API_KEY` = your key
   - `THREE_COMMAS_API_SECRET` = your secret
   - `CORS_ORIGIN` = your frontend origin (e.g. `https://yourapp.vercel.app`) or `*`
3. Ensure the Start Command is `node server.js` (or use the default npm start).
4. After deploy succeeds, test:
   - `GET /` → `{ ok: true, service: "3commas-direct-api-test" }`
   - `POST /create-account` with the same JSON body as local.
