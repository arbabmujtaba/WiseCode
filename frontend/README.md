# WiseCode — Frontend

React 19 + Vite single-page app for WiseCode. Requires the API in [`../backend`](../backend).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Use `http://localhost:5173` (not `127.0.0.1`) so the session cookie works. Set `VITE_API_URL` (see [`.env.example`](.env.example)) if the API is not at `http://localhost:3000`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |

## Stack

React Router 7, Redux Toolkit (auth), Axios (cookie credentials), Tailwind CSS 4 + DaisyUI 5, Monaco Editor, React Hook Form + Zod, lucide-react icons. Voice uses only browser APIs (getUserMedia, AudioWorklet, Web Audio, WebSocket).

## Features

- **Problems:** search, difficulty/topic/status filters kept in the URL, sorting, pagination, progress, random unsolved pick
- **Workspace:** resizable panes, Monaco editor (JavaScript/Java/C++), auto-saved drafts, Run (`Ctrl+'`) and Submit (`Ctrl+Enter`), per-test-case results, prev/next/random navigation
- **Workspace tabs:** description, video editorial, reference solutions (hidden until solved), submission history, AI tutor chat, voice tutor
- **Voice tutor:** hands-free conversation, live transcripts, waveform, barge-in interruption, mic/speaker mute, Learning vs Direct mode, voice choice, text fallback; shares history with the text chat
- **Dashboard:** solved/acceptance/streak stats, activity heatmap, difficulty and topic progress, recent submissions, account deletion
- **Admin:** stats, searchable problem manager, create/edit form, delete, Cloudinary video upload/replace/remove
- Dark/light theme, toasts, responsive layout, keyboard-accessible dialogs and menus

## Project structure

```text
src/
  main.jsx               Providers (Redux, Router, Toasts) and root render
  App.jsx                Session restore + route table
  index.css              Tailwind/DaisyUI setup and the wisecode themes
  api/client.js          Axios instance + getErrorMessage()
  store/                 Redux store and authSlice
  hooks/                 useProblems (shared cache), useTheme, useSplit, useVoiceSession
  lib/                   constants (tags, languages), format helpers, voiceAudio (mic capture + playback)
  components/
    layout/              AppLayout, AuthLayout, Navbar, RouteGuards
    ui/                  Shared primitives: badges/states (index), ConfirmDialog, Dropdown, FormField, Markdown, Toast
    workspace/           AiChat, ConsolePanels, Editorial, SubmissionHistory
    voice/               VoicePanel, VoiceDock, Waveform
  pages/                 Login, Signup, Problems, Workspace, Dashboard, NotFound
    admin/               AdminDashboard, AdminProblems, ProblemForm, VideoUpload
public/
  favicon.svg
  worklets/pcm-capture.js   AudioWorklet: microphone -> 16 kHz PCM16
```

## Routes

| Route | Access | Page |
| --- | --- | --- |
| `/login`, `/signup` | Signed out | Login, Signup |
| `/` | User | Problems |
| `/problem/:problemId` | User | Workspace |
| `/dashboard` | User | Dashboard |
| `/admin` | Admin | AdminDashboard |
| `/admin/problems` (`?view=video`) | Admin | AdminProblems |
| `/admin/create`, `/admin/edit/:problemId` | Admin | ProblemForm |
| `/admin/upload/:problemId` | Admin | VideoUpload |
