import { useCallback, useEffect, useState } from 'react';
import axiosClient, { getErrorMessage } from '../api/client';

// Small shared cache so the problem list and solved set are fetched once per session
// and reused across pages (list, dashboard, workspace navigation, admin).
const cache = { problems: null, solved: null, promise: null, listeners: new Set() };

const notify = () => cache.listeners.forEach((l) => l());

const load = async () => {
  const [problems, solved] = await Promise.all([
    axiosClient.get('/problem/getAllProblem'),
    axiosClient.get('/problem/problemSolvedByUser'),
  ]);
  cache.problems = Array.isArray(problems.data) ? problems.data : [];
  cache.solved = new Set((Array.isArray(solved.data) ? solved.data : []).map((p) => p._id));
  notify();
};

export const refreshProblems = () => {
  cache.promise = load().finally(() => {
    cache.promise = null;
  });
  return cache.promise;
};

export const markSolved = (problemId) => {
  if (!cache.solved || cache.solved.has(problemId)) return;
  cache.solved = new Set(cache.solved).add(problemId);
  notify();
};

export const clearProblemCache = () => {
  cache.problems = null;
  cache.solved = null;
  notify();
};

export function useProblems() {
  const [, force] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    cache.listeners.add(listener);
    if (!cache.problems && !cache.promise) {
      refreshProblems().catch((e) => setError(getErrorMessage(e, 'Could not load problems')));
    }
    return () => cache.listeners.delete(listener);
  }, []);

  const reload = useCallback(() => {
    setError(null);
    return refreshProblems().catch((e) => setError(getErrorMessage(e, 'Could not load problems')));
  }, []);

  return {
    problems: cache.problems || [],
    solved: cache.solved || new Set(),
    loading: !cache.problems && !error,
    error,
    reload,
  };
}
