# WiseCode

A coding-practice platform: solve DSA problems in the browser, run and submit code against real test cases, and get help from an AI tutor by text or real-time voice.

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

More detail: [backend/README.md](backend/README.md) (configuration, structure, API) and [frontend/README.md](frontend/README.md) (features, structure, routes).
