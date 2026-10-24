import { NavLink } from 'react-router';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Compass size={48} className="text-primary" aria-hidden="true" />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-base-content/60">This page doesn’t exist.</p>
      <NavLink to="/" className="btn btn-primary btn-sm mt-2">
        Back to problems
      </NavLink>
    </div>
  );
}
