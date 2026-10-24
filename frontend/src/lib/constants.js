// Keep TAGS in sync with backend/src/models/problem.js (PROBLEM_TAGS).
export const TAGS = [
  { value: 'array', label: 'Array' },
  { value: 'string', label: 'String' },
  { value: 'linkedList', label: 'Linked List' },
  { value: 'stack', label: 'Stack' },
  { value: 'tree', label: 'Tree' },
  { value: 'graph', label: 'Graph' },
  { value: 'dp', label: 'Dynamic Programming' },
  { value: 'greedy', label: 'Greedy' },
  { value: 'heap', label: 'Heap' },
  { value: 'math', label: 'Math' },
  { value: 'sorting', label: 'Sorting' },
  { value: 'binarySearch', label: 'Binary Search' },
  { value: 'twoPointers', label: 'Two Pointers' },
  { value: 'slidingWindow', label: 'Sliding Window' },
  { value: 'backtracking', label: 'Backtracking' },
  { value: 'bitManipulation', label: 'Bit Manipulation' },
];

const TAG_LABELS = Object.fromEntries(TAGS.map((t) => [t.value, t.label]));
export const tagLabel = (tag) => TAG_LABELS[tag] || tag;

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const DIFFICULTY_META = {
  easy: { label: 'Easy', text: 'text-success', badge: 'badge-success', progress: 'progress-success' },
  medium: { label: 'Medium', text: 'text-warning', badge: 'badge-warning', progress: 'progress-warning' },
  hard: { label: 'Hard', text: 'text-error', badge: 'badge-error', progress: 'progress-error' },
};

export const difficultyMeta = (d) =>
  DIFFICULTY_META[String(d || '').toLowerCase()] || { label: d, text: '', badge: 'badge-ghost', progress: '' };

// `id` is what the API expects; `label` matches problem.startCode[].language.
export const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'cpp', label: 'C++', monaco: 'cpp' },
];

export const languageById = (id) => LANGUAGES.find((l) => l.id === id) || LANGUAGES[0];

// Submission documents store "c++" rather than "cpp".
export const submissionLanguageLabel = (lang) =>
  ({ javascript: 'JavaScript', java: 'Java', 'c++': 'C++', cpp: 'C++' })[lang] || lang;

export const STATUS_META = {
  accepted: { label: 'Accepted', badge: 'badge-success', text: 'text-success' },
  wrong: { label: 'Wrong Answer', badge: 'badge-error', text: 'text-error' },
  error: { label: 'Error', badge: 'badge-warning', text: 'text-warning' },
  pending: { label: 'Pending', badge: 'badge-info', text: 'text-info' },
};

export const statusMeta = (s) => STATUS_META[s] || { label: s, badge: 'badge-ghost', text: '' };
