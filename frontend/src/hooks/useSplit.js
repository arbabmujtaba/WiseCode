import { useCallback, useEffect, useRef, useState } from 'react';

const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

// Draggable split between two panes. Returns the first pane's size (%) and gutter handlers.
export function useSplit({ initial = 50, min = 20, max = 80, axis = 'x', storageKey } = {}) {
  const [size, setSize] = useState(() => {
    const saved = storageKey && Number(localStorage.getItem(storageKey));
    return saved && saved >= min && saved <= max ? saved : initial;
  });
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const onPointerMove = useCallback(
    (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = axis === 'x' ? ((e.clientX - rect.left) / rect.width) * 100 : ((e.clientY - rect.top) / rect.height) * 100;
      setSize(Math.min(max, Math.max(min, pct)));
    },
    [axis, min, max]
  );

  const stop = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stop);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stop);
    };
  }, [onPointerMove, stop]);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, String(Math.round(size)));
  }, [size, storageKey]);

  const gutterProps = {
    role: 'separator',
    'aria-orientation': axis === 'x' ? 'vertical' : 'horizontal',
    'aria-valuenow': Math.round(size),
    'aria-valuemin': min,
    'aria-valuemax': max,
    tabIndex: 0,
    onPointerDown: (e) => {
      e.preventDefault();
      dragging.current = true;
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    onKeyDown: (e) => {
      const dec = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
      const inc = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
      if (e.key === dec) setSize((s) => Math.max(min, s - 2));
      if (e.key === inc) setSize((s) => Math.min(max, s + 2));
    },
  };

  return { size, containerRef, gutterProps };
}

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(isDesktop);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const fn = () => setDesktop(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return desktop;
}
