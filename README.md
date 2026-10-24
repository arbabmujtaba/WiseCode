# WiseCode

A coding-practice platform: solve DSA problems in the browser, run and submit code against real test cases, and get help from an AI tutor by text or real time voice.

```text
backend/    Express API, MongoDB, Redis, Judge0, Gemini (text + Live voice), Cloudinary
frontend/   React + Vite single-page app
```

## Run locally

Requirements: Node.js 20+, a MongoDB database, a Redis database, and API keys for Judge0 (RapidAPI), Gemini (Google AI Studio) and Cloudinary. See [`backend/.env.example`](backend/.env.example).

```bash
# terminal 1 – API on :3000
cd backend
cp .env.example .env   # fill in
npm install
npm run seed:users     # test@wisecode.dev / Test@12345, admin@wisecode.dev / Admin@12345
npm run dev

# terminal 2 – app on :5173
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Deploy (free)

Use free tiers for the services: MongoDB Atlas M0 (allow `0.0.0.0/0` under Network Access), Redis Cloud or Upstash, Judge0 on RapidAPI, Gemini on AI Studio, Cloudinary.

### Option A: Render only (recommended)

One Render web service serves the API, the voice WebSocket and the React app from the same origin, so the login cookie is first-party.

1. Push the repo to GitHub.
2. On Render, choose New → Blueprint and pick the repo. It reads [`render.yaml`](render.yaml).
3. Fill in the secret env vars when prompted. `JWT_KEY` is generated for you, and you can leave `FRONTEND_URLS` empty.
4. Open `https://<service>.onrender.com`, then run `npm run seed:users` locally against the same `DB_CONNECT_STRING` if you want the test accounts.

On the free plan the service sleeps after about 15 minutes idle, so the first request after that takes 30–60 seconds.

### Option B: Vercel frontend + Render API

1. Deploy the API with the Render Blueprint above, and set:
   - `FRONTEND_URLS=https://<app>.vercel.app`
   - `COOKIE_SAMESITE=none`
2. On Vercel, import the repo with Root Directory `frontend`. [`frontend/vercel.json`](frontend/vercel.json) handles the build and SPA routing.
3. On Vercel, set `VITE_API_URL=https://<service>.onrender.com/api`, then redeploy.

The cookie is cross-site here, so browsers that block third-party cookies (Safari, Chrome with that setting on) won't keep users signed in. Use a custom domain with `app.` and `api.` subdomains to avoid this.

More detail: [backend/README.md](backend/README.md) (configuration, structure, API) and [frontend/README.md](frontend/README.md) (features, structure, routes).
