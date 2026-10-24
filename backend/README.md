# WiseCode — Backend

Express 5 API for WiseCode: cookie-based auth, problems and submissions in MongoDB, code execution on Judge0, a Gemini AI tutor (text chat and real-time voice), and Cloudinary video editorials.

## Quick start

```bash
cp .env.example .env      # fill in values
npm install
npm run seed:users        # optional: test accounts
npm run dev               # http://localhost:3000, auto-restarts on change
```

`npm start` runs without file watching. Startup fails fast if `DB_CONNECT_STRING`, `JWT_KEY` or `REDIS_PASS` is missing. `GET /health` reports MongoDB and Redis status.

## Configuration

All variables are listed in [`.env.example`](.env.example) and read in one place, `src/config/env.js`.

| Variable | Needed for |
| --- | --- |
| `DB_CONNECT_STRING`, `JWT_KEY`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASS` | Starting the server |
| `JUDGE0_KEY` | Run, Submit, creating/editing problems |
| `GEMINI_KEY` (+ optional `GEMINI_*` model overrides) | AI tutor chat and voice |
| `CLOUDINARY_*` | Video editorials |
| `FRONTEND_URLS` | CORS + WebSocket origin allow-list (default `http://localhost:5173,http://127.0.0.1:5173`) |
| `NODE_ENV=production` | Marks the session cookie `Secure` |

## Test accounts

`npm run seed:users` creates or resets:

| Role | Email | Password |
| --- | --- | --- |
| User | `test@wisecode.dev` | `Test@12345` |
| Admin | `admin@wisecode.dev` | `Admin@12345` |

Override with `TEST_USER_*` / `TEST_ADMIN_*`. Change or remove these accounts on any shared database.

## Project structure

```text
src/
  server.js              Entry point: connect DB/Redis, listen, attach voice WebSocket, graceful shutdown
  app.js                 Express app: CORS, JSON, cookies, /health, routes, error handling
  config/                env.js (all settings), db.js, redis.js, cloudinary.js
  middleware/            auth.js (requireUser, requireAdmin, authenticateToken), errorHandler.js
  routes/                index.js mounts *.routes.js under /user /problem /submission /ai /video
  controllers/           auth, problem, submission, ai, video request handlers
  models/                User, Problem, Submission, SolutionVideo (Mongoose)
  services/
    judge0.js            Judge0 batch submit + polling
    ai/gemini.js         Text generation with model fallback
    ai/chatPrompt.js     Text tutor system prompt
    ai/voiceProxy.js     /ai/live WebSocket <-> Gemini Live proxy (protocol documented in the file)
    ai/voicePrompt.js    Voice tutor prompt, editor-state tool, input sanitising
  utils/                 httpError.js, validateRegistration.js
scripts/seedUsers.js     Test account seeding
shims/                   Node 25+ fix for buffer-equal-constant-time (wired via "overrides")
```

## API

Errors are JSON: `{ "message": "..." }`. **User** routes need a valid session cookie; **Admin** routes also need the `admin` role (checked in the database).

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/user/register` | Public | Register (always `user` role) |
| POST | `/user/login` | Public | Sign in, sets a 24 h HTTP-only `token` cookie |
| POST | `/user/logout` | User | Revoke the token (Redis block list) |
| GET | `/user/check` | User | Current user |
| DELETE | `/user/deleteProfile` | User | Delete account and submissions |
| POST | `/user/admin/register` | Admin | Create a user or admin |
| GET | `/problem/getAllProblem` | User | Problem summaries (with `hasVideo`) |
| GET | `/problem/problemById/:id` | User | Problem details (admins also get hidden cases) |
| GET | `/problem/problemSolvedByUser` | User | Solved problems |
| GET | `/problem/submittedProblem/:pid` | User | Your submissions for a problem |
| POST | `/problem/create` | Admin | Create (reference solutions verified on Judge0) |
| PUT | `/problem/update/:id` | Admin | Update (re-verified if code/visible cases change) |
| DELETE | `/problem/delete/:id` | Admin | Delete with its submissions and video |
| POST | `/submission/run/:id` | User | Run against visible cases |
| POST | `/submission/submit/:id` | User | Judge against hidden cases and save |
| GET | `/submission/history` | User | Recent submissions across problems |
| POST | `/ai/chat` | User | Text tutor for a problem |
| WS | `/ai/live?problemId=` | User | Real-time voice tutor |
| GET | `/video/create/:problemId` | Admin | Signed Cloudinary upload params |
| POST | `/video/save` | Admin | Save verified video metadata |
| DELETE | `/video/delete/:problemId` | Admin | Delete a video |
| GET | `/health` | Public | MongoDB/Redis status |

### Voice tutor

The browser streams 16 kHz PCM microphone audio over `/ai/live`; the server forwards it to Gemini Live and streams 24 kHz PCM speech back, with live transcripts. The API key never reaches the browser. Connections need the session cookie and an allowed `Origin`; each user may have 2 sessions of up to `VOICE_MAX_MINUTES`. The model reads the student's current code and Run/Submit results through a `get_editor_state` tool.
