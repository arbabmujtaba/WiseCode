import { NavLink } from 'react-router';
import { AlertCircle, Inbox, RotateCw } from 'lucide-react';
import { difficultyMeta, statusMeta, tagLabel } from '../lib/constants';

export function Logo({ to = '/', size = 'md' }) {
  const big = size === 'lg';
  return (
    <NavLink to={to} className="flex items-center gap-2 font-bold tracking-tight" aria-label="WiseCode home">
      <span
        className={`grid place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-content shadow ${
          big ? 'h-10 w-10 text-lg' : 'h-8 w-8 text-sm'
        }`}
        aria-hidden="true"
      >
        {'</>'}
      </span>
      <span className={big ? 'text-2xl' : 'text-lg'}>
        Wise<span className="text-gradient">Code</span>
      </span>
    </NavLink>
  );
}

export const DifficultyBadge = ({ difficulty, className = '' }) => {
  const m = difficultyMeta(difficulty);
  return <span className={`badge badge-soft ${m.badge} badge-sm font-medium ${className}`}>{m.label}</span>;
};

export const TagBadge = ({ tag }) => <span className="badge badge-ghost badge-sm">{tagLabel(tag)}</span>;

export const StatusBadge = ({ status }) => {
  const m = statusMeta(status);
  return <span className={`badge badge-soft ${m.badge} badge-sm font-medium`}>{m.label}</span>;
};

export const PageSpinner = ({ label = 'Loading…' }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-base-content/60" role="status">
    <span className="loading loading-spinner loading-lg text-primary" />
    <span className="text-sm">{label}</span>
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, children }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-base-content/60">
    <Icon size={36} aria-hidden="true" className="opacity-60" />
    <p className="font-medium text-base-content/80">{title}</p>
    {children && <div className="text-sm">{children}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div role="alert" className="alert alert-error alert-soft">
    <AlertCircle size={18} aria-hidden="true" />
    <span>{message}</span>
    {onRetry && (
      <button className="btn btn-sm" onClick={onRetry}>
        <RotateCw size={14} /> Retry
      </button>
    )}
  </div>
);

export const StatCard = ({ icon: Icon, label, value, hint, tone = 'text-primary' }) => (
  <div className="card border border-base-300 bg-base-100">
    <div className="card-body flex-row items-center gap-4 p-5">
      {Icon && (
        <div className={`grid h-11 w-11 place-items-center rounded-xl bg-base-200 ${tone}`}>
          <Icon size={22} aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm text-base-content/60">{label}</div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
        {hint && <div className="truncate text-xs text-base-content/50">{hint}</div>}
      </div>
    </div>
  </div>
);
