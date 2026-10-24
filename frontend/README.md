# Coding Practice Platform - Frontend

This is the React single-page application for a coding-practice platform. Authenticated users can browse algorithm problems, write and run code, submit against hidden test cases, review past submissions, watch editorial videos, and ask a problem-aware AI tutor for help. Administrators can create, delete, and manage problems and editorial videos.

The API server lives in `../backend`. It must be running before the frontend can be used.

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

The API URL defaults to `http://localhost:3000` and can be overridden with `VITE_API_URL`. The backend CORS configuration expects this Vite app to run at `http://localhost:5173`.

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

Sign in with the seeded test accounts (create them with `npm run seed:users` in `../backend`):

| Role | Email | Password |
| --- | --- | --- |
| User | `test@wisecode.dev` | `Test@12345` |
| Admin | `admin@wisecode.dev` | `Admin@12345` |

Set `VITE_API_URL` if the API is not at `http://localhost:3000`.

Other commands:

```bash
npm run build
npm run lint
npm run preview
```

## Features

- Problem set: search, difficulty/topic/status filters (kept in the URL), sorting, pagination, solved progress, random unsolved pick
- Workspace: resizable panes, Monaco editor (JS/Java/C++), auto-saved drafts per problem and language, font size, reset, Run (`Ctrl+'`) and Submit (`Ctrl+Enter`), per-test-case results, prev/next/random navigation
- Left panel tabs: description, video editorial, reference solutions (hidden until solved), submission history (load old code into the editor), AI tutor with Markdown and code blocks
- Dashboard: solved/submission/acceptance/streak stats, activity heatmap, difficulty and topic progress, recent submissions, account deletion
- Admin: stats hub, searchable problem manager, create/edit form (verified on Judge0), delete, Cloudinary video upload/replace/remove
- Dark/light theme, toasts, responsive layout, keyboard-accessible dialogs and menus

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/login`, `/signup` | Signed-out user | Authentication |
| `/` | User | Problem list |
| `/dashboard` | User | Stats and history |
| `/problem/:problemId` | User | Coding workspace |
| `/admin` | Admin | Admin console |
| `/admin/problems` | Admin | Manage problems (`?view=video` for editorials) |
| `/admin/create`, `/admin/edit/:problemId` | Admin | Problem form |
| `/admin/upload/:problemId` | Admin | Upload a video editorial |

## API Integration

`src/utils/axiosClient.js` creates the shared Axios client with `withCredentials: true`, so browser requests include the session cookie. The client calls these backend areas:

- `/user` for registration, login, session checks, and logout
- `/problem` for problem lists, problem details, solved status, and submissions
- `/submission` for running and submitting code
- `/ai/chat` for the DSA tutor
- `/video` for administrator editorial-video management

See `../backend/README.md` for configuration requirements and the full API overview.
