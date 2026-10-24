# Coding Practice Platform - Frontend

This is the React single-page application for a coding-practice platform. Authenticated users can browse algorithm problems, write and run code, submit against hidden test cases, review past submissions, watch editorial videos, and ask a problem-aware AI tutor for help. Administrators can create, delete, and manage problems and editorial videos.

The API server lives in `../backend`.. It must be running before the frontend can be used.

## Stack

- React 19 and Vite
- React Router for client-side routes
- Redux Toolkit for authentication state
- Axios with cookie-based requests
- Tailwind CSS and DaisyUI for styling
- Monaco Editor for the code editor
- React Hook Form and Zod for administrator forms

## Requirements

- Node.js and npm
- A running backend service at `http://localhost:3000`

The API URL is currently defined directly in `src/utils/axiosClient.js`. The backend CORS configuration expects this Vite app to run at `http://localhost:5173`.

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

### Run The Interactive Demo

Demo mode uses the **real React app** (login, signup, workspace, admin) against an in-memory demo API. Start the demo backend first so it can listen on `http://localhost:3000`.

```bash
# terminal 1
cd ../backend
npm run demo

# terminal 2
cd frontend
npm run demo
```

If the API is hosted somewhere other than `http://localhost:3000`, set
`VITE_API_URL` before starting Vite. The demo server accepts comma-separated
frontend origins through `FRONTEND_URLS`.

Open `http://localhost:5173`. Seeded accounts:

| Role | Email | Password |
| --- | --- | --- |
| User | `demo@example.com` | `DemoUser1!` |
| Admin | `admin@example.com` | `DemoAdmin1!` |

The demo API does not use MongoDB, Redis, Judge0, Gemini, or Cloudinary. Registration, cookie sessions, problems, run/submit, AI chat, and editorial video routes all work against in-memory data for the process lifetime.

Other commands:

```bash
npm run build
npm run lint
npm run preview
```

## User Flow

1. A visitor registers or signs in. Successful authentication stores a JWT in an HTTP cookie and the Redux auth slice restores that session on page load.
2. The home page requests the available problems and the signed-in user's solved problems. Problems can be filtered by difficulty, tag, and solved status.
3. Selecting a problem opens a split-screen workspace with the description, examples, reference solutions, editorial video, submission history, and AI chat on the left, plus a Monaco editor on the right.
4. Users select JavaScript, Java, or C++. **Run** evaluates code against visible examples; **Submit** evaluates it against hidden test cases and records the result.
5. An administrator can access `/admin` and the protected administration pages to create or remove problems and upload or delete editorial videos.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Signed-in user | Problem list and filters |
| `/login` | Signed-out user | Sign in |
| `/signup` | Signed-out user | Create an account |
| `/problem/:problemId` | Application route | Solve a selected problem |
| `/admin` | Administrator | Administration hub |
| `/admin/create` | Administrator | Create a problem |
| `/admin/delete` | Administrator | Delete a problem |
| `/admin/video` | Administrator | Manage editorial videos |
| `/admin/upload/:problemId` | Administrator | Upload an editorial for a problem |

## API Integration

`src/utils/axiosClient.js` creates the shared Axios client with `withCredentials: true`, so browser requests include the session cookie. The client calls these backend areas:

- `/user` for registration, login, session checks, and logout
- `/problem` for problem lists, problem details, solved status, and submissions
- `/submission` for running and submitting code
- `/ai/chat` for the DSA tutor
- `/video` for administrator editorial-video management

See `../backend/README.md` for configuration requirements and the full API overview.
