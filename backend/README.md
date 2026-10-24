# Coding Practice Platform - Backend

This Express API powers the coding-practice frontend in `../frontend`. It manages accounts and cookie sessions, stores problems and submissions, evaluates code with Judge0, provides problem-scoped Gemini tutoring, and manages Cloudinary-hosted editorial videos.

## How It Works

1. Users register or log in through `/user`. The server hashes passwords with bcrypt and returns a one-hour JWT cookie.
2. Protected routes validate that cookie. Logout places the token on a Redis block list until it expires.
3. Administrators create problems with visible and hidden test cases, starter code, and reference solutions for C++, Java, and JavaScript. The server verifies reference solutions against visible cases before saving a problem.
4. A code run sends the user's source to Judge0 using visible cases. A submission runs against hidden cases, persists the result in MongoDB, and adds the problem to the user's solved list when the submission is accepted.
5. The AI endpoint supplies the active problem context to Gemini for DSA-focused assistance. Administrators receive signed Cloudinary upload parameters, then save the verified video metadata as an editorial.

## Stack

- Express 5
- MongoDB and Mongoose
- Redis for JWT block-list entries
- JWT, bcrypt, and cookie-parser for authentication
- Judge0 CE through RapidAPI for code execution
- Google Gemini for the DSA tutor
- Cloudinary for editorial videos

## Requirements

- Node.js and npm
- A MongoDB database
- A Redis Cloud database compatible with the host configured in `src/config/redis.js`
- A RapidAPI Judge0 CE key
- A Google Gemini API key
- A Cloudinary account for editorial-video features

## Configuration

Create `backend/.env` with the following values:

```env
PORT=3000
DB_CONNECT_STRING=mongodb+srv://<user>:<password>@<cluster>/<database>
REDIS_PASS=<redis-password>
JWT_KEY=<long-random-secret>
JUDGE0_KEY=<rapidapi-judge0-key>
GEMINI_KEY=<google-gemini-api-key>
CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>
```

`REDIS_PASS` is used with the Redis host and port currently hard-coded in `src/config/redis.js`. Update that configuration as well when using a different Redis deployment.

## Run Locally

```bash
cd backend
npm install
node src/index.js
```

The server connects to MongoDB and Redis before it starts listening on `PORT`. Use `3000` for local development: the frontend is configured to call `http://localhost:3000`, and this server permits the frontend origin `http://localhost:5173`.

For auto-restart during development use `npm run dev`.

### Test Accounts

Create (or reset) the test accounts in the configured MongoDB:

```bash
npm run seed:users
```

| Role | Email | Password |
| --- | --- | --- |
| User | `test@wisecode.dev` | `Test@12345` |
| Admin | `admin@wisecode.dev` | `Admin@12345` |

Override them with `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`.

### Optional Environment Variables

- `FRONTEND_URLS` - comma-separated CORS allow-list (default `http://localhost:5173,http://127.0.0.1:5173`)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME` - override the default Redis Cloud host
- `GEMINI_MODEL` - Gemini model for the tutor (default `gemini-3.5-flash`)
- `GEMINI_LIVE_MODEL` - voice tutor model (default `gemini-3.1-flash-live-preview`)
- `GEMINI_LIVE_FALLBACK_MODEL` - used if the primary voice model fails to connect (default `gemini-2.5-flash-native-audio-latest`)
- `VOICE_MAX_MINUTES` - max length of one voice session (default 15)
- `NODE_ENV=production` - marks the session cookie `Secure`

### Voice Tutor (WebSocket)

`ws://<host>/ai/live?problemId=<id>` proxies the browser to the Gemini Live API (the API key stays on the server). It requires the session cookie and an allowed `Origin`, limits each user to 2 concurrent sessions, and lets the model call `get_editor_state` to read the student's live code and Run/Submit results. Protocol details are documented at the top of `src/live/liveProxy.js`.

### Node 25+ Compatibility

`jsonwebtoken` depends on `buffer-equal-constant-time`, which crashes on Node 25+. `package.json` overrides it with the local drop-in shim in `shims/buffer-equal-constant-time`.

## Authentication And Roles

Successful registration and login set an HTTP-only `token` cookie containing a 24-hour JWT. Protected user routes require a valid, non-blocklisted token. Administrator routes also check that the user's role in the database is `admin`.

New public registrations always receive the `user` role. Creating another administrator with `POST /user/admin/register` requires an authenticated administrator, so an initial administrator must be seeded or created outside this public registration flow.

## API Overview

All routes below are prefixed by their mounted path. Routes marked **User** require a valid session; routes marked **Admin** require an administrator session.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/user/register` | Public | Register a standard user |
| POST | `/user/login` | Public | Sign in and set the session cookie |
| POST | `/user/logout` | User | Revoke the current token and clear the cookie |
| GET | `/user/check` | User | Return current user details |
| DELETE | `/user/deleteProfile` | User | Delete the current user profile |
| POST | `/user/admin/register` | Admin | Create another administrator |
| GET | `/problem/getAllProblem` | User | List problem summaries (with `hasVideo`) |
| GET | `/problem/problemById/:id` | User | Get a problem, examples, starter code, solutions, and editorial metadata |
| GET | `/problem/problemSolvedByUser` | User | List the current user's solved problems |
| GET | `/problem/submittedProblem/:pid` | User | Get the current user's submissions for a problem |
| POST | `/problem/create` | Admin | Validate and create a problem |
| PUT | `/problem/update/:id` | Admin | Validate and update a problem |
| DELETE | `/problem/delete/:id` | Admin | Delete a problem |
| POST | `/submission/run/:id` | User | Run source code against visible test cases |
| POST | `/submission/submit/:id` | User | Evaluate source code against hidden cases and persist the submission |
| GET | `/submission/history` | User | Recent submissions across all problems |
| GET | `/health` | Public | MongoDB/Redis status |
| POST | `/ai/chat` | User | Get DSA help grounded in the current problem |
| GET | `/video/create/:problemId` | Admin | Get signed Cloudinary upload parameters |
| POST | `/video/save` | Admin | Verify and save editorial-video metadata |
| DELETE | `/video/delete/:problemId` | Admin | Delete an editorial video from Cloudinary and MongoDB |

## Project Structure

```text
src/
  config/       MongoDB and Redis connections
  controllers/  Authentication, problems, submissions, AI, and video logic
  middleware/   User and administrator JWT guards
  models/       Mongoose schemas for users, problems, submissions, and videos
  routes/       HTTP route definitions
  utils/        Validation and Judge0 integration
  index.js      Express setup and service startup
```

## Notes

- Code execution supports JavaScript, Java, and C++ through Judge0 language IDs.
- Judge0, Gemini, and Cloudinary requests use third-party credentials. Keep `.env` private and do not commit it.
- Errors are returned as JSON: `{ "message": "..." }`.
- The repository does not include an automated backend test suite.