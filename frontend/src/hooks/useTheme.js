import { useCallback, useEffect, useState } from 'react';

const KEY = 'wisecode-theme';
const DARK = 'wisecode';
const LIGHT = 'wisecode-light';

const initialTheme = () => {
  const saved = localStorage.getItem(KEY);
  if (saved === DARK || saved === LIGHT) return saved;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? LIGHT : DARK;
};

// Applies the saved theme as early as possible to avoid a flash.
document.documentElement.setAttribute('data-theme', initialTheme());

const listeners = new Set();

export function useTheme() {
  const [theme, setThemeState] = useState(() => document.documentElement.getAttribute('data-theme') || DARK);

  useEffect(() => {
    listeners.add(setThemeState);
    return () => listeners.delete(setThemeState);
  }, []);

  const setTheme = useCallback((next) => {
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    listeners.forEach((l) => l(next));
  }, []);

  const toggle = useCallback(() => setTheme(theme === DARK ? LIGHT : DARK), [theme, setTheme]);

  return { theme, isDark: theme === DARK, setTheme, toggle };
}
