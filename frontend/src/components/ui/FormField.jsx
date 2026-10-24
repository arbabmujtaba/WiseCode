import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Labelled input with inline error, optional password visibility toggle.
export default function FormField({ label, error, type = 'text', id, registration, hint, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputId = id || registration?.name;

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && show ? 'text' : type}
          className={`input w-full ${isPassword ? 'pr-11' : ''} ${error ? 'input-error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...registration}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle absolute top-1/2 right-2 z-10 -translate-y-1/2"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-base-content/50">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
