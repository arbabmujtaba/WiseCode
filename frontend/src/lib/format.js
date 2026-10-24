export const formatRuntime = (seconds) => {
  const n = Number(seconds);
  if (!Number.isFinite(n)) return '—';
  return n < 1 ? `${Math.round(n * 1000)} ms` : `${n.toFixed(2)} s`;
};

export const formatMemory = (kb) => {
  const n = Number(kb);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return n < 1024 ? `${n} KB` : `${(n / 1024).toFixed(1)} MB`;
};

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export const timeAgo = (date) => {
  const diff = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return 'just now';
};

export const formatDate = (date) =>
  new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Local YYYY-MM-DD key, used for the activity heatmap.
export const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
