import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

// Click-to-toggle menu. Closes on outside click, Escape, or navigation.
export default function Dropdown({ trigger, label, align = 'end', className = 'w-60', children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn btn-ghost btn-sm gap-2 px-1.5"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <ul
          role="menu"
          className={`menu absolute top-full z-50 mt-2 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl ${
            align === 'end' ? 'right-0' : 'left-0'
          } ${className}`}
          onClick={(e) => e.target.closest('a,button') && setOpen(false)}
        >
          {children}
        </ul>
      )}
    </div>
  );
}
