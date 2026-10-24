// API base URL (REST + voice WebSocket).
// - VITE_API_URL set (e.g. Vercel frontend + Render API): https://<api>.onrender.com/api
// - Dev without it: the local backend on :3000
// - Production build without it: same origin (frontend served by the backend)
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');
