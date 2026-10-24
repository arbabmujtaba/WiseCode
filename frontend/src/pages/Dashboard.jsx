import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays, CheckCircle2, Flame, History, Send, Target, Trash2 } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../utils/axiosClient';
import { useProblems, clearProblemCache } from '../hooks/useProblems';
import { deleteAccount } from '../authSlice';
import { DIFFICULTIES, difficultyMeta, submissionLanguageLabel, tagLabel } from '../lib/constants';
import { dayKey, formatMemory, formatRuntime, timeAgo } from '../lib/format';
import { DifficultyBadge, EmptyState, ErrorState, PageSpinner, StatCard, StatusBadge } from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const WEEKS = 18;

function Heatmap({ submissions }) {
  const { weeks, counts, max } = useMemo(() => {
    const counts = new Map();
    for (const s of submissions) counts.set(dayKey(s.createdAt), (counts.get(dayKey(s.createdAt)) || 0) + 1);
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (WEEKS * 7 - 1) - today.getDay());
    const weeks = [];
    for (let w = 0; w < WEEKS + 1; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        days.push(date > today ? null : date);
      }
      weeks.push(days);
    }
    return { weeks, counts, max: Math.max(1, ...counts.values()) };
  }, [submissions]);

  const shade = (n) => {
    if (!n) return 'bg-base-300/70';
    const r = n / max;
    return r > 0.75 ? 'bg-primary' : r > 0.5 ? 'bg-primary/75' : r > 0.25 ? 'bg-primary/50' : 'bg-primary/30';
  };

  return (
    <div className="scroll-thin overflow-x-auto">
      <div className="flex gap-1" role="img" aria-label="Submission activity over the last few months">
        {weeks.map((days, i) => (
          <div key={i} className="flex flex-col gap-1">
            {days.map((date, j) => {
              if (!date) return <div key={j} className="h-3.5 w-3.5" />;
              const n = counts.get(dayKey(date)) || 0;
              return (
                <div
                  key={j}
                  className={`h-3.5 w-3.5 rounded-[3px] ${shade(n)}`}
                  title={`${n} submission${n === 1 ? '' : 's'} on ${date.toDateString()}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const computeStreak = (submissions) => {
  const days = new Set(submissions.map((s) => dayKey(s.createdAt)));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // streak can still be "alive" from yesterday
  let streak = 0;
  while (days.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

function Dashboard() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { problems, solved, loading: problemsLoading } = useProblems();
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadHistory = () => {
    setError(null);
    axiosClient
      .get('/submission/history', { params: { limit: 200 } })
      .then(({ data }) => setHistory(Array.isArray(data) ? data : []))
      .catch((e) => setError(getErrorMessage(e, 'Could not load submissions')));
  };
  useEffect(loadHistory, []);

  const stats = useMemo(() => {
    const subs = history || [];
    const accepted = subs.filter((s) => s.status === 'accepted').length;
    const byDiff = Object.fromEntries(DIFFICULTIES.map((d) => [d, [0, 0]]));
    const byTag = new Map();
    for (const p of problems) {
      if (byDiff[p.difficulty]) byDiff[p.difficulty][1]++;
      const t = byTag.get(p.tags) || [0, 0];
      t[1]++;
      if (solved.has(p._id)) {
        t[0]++;
        if (byDiff[p.difficulty]) byDiff[p.difficulty][0]++;
      }
      byTag.set(p.tags, t);
    }
    const topics = [...byTag.entries()].sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1]);
    return {
      total: subs.length,
      accepted,
      rate: subs.length ? Math.round((accepted / subs.length) * 100) : 0,
      streak: computeStreak(subs),
      byDiff,
      topics,
    };
  }, [history, problems, solved]);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await dispatch(deleteAccount());
    setDeleting(false);
    if (deleteAccount.fulfilled.match(res)) {
      clearProblemCache();
      toast.success('Your account was deleted');
      navigate('/signup');
    } else {
      toast.error(res.payload || 'Could not delete account');
    }
  };

  if (problemsLoading || (!history && !error)) return <PageSpinner label="Loading your stats…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-base-content/60">Your progress at a glance.</p>
        </div>
        <NavLink to="/" className="btn btn-primary btn-sm">
          Continue practising
        </NavLink>
      </div>

      {error && <ErrorState message={error} onRetry={loadHistory} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Problems solved" value={solved.size} hint={`of ${problems.length}`} tone="text-success" />
        <StatCard icon={Send} label="Submissions" value={stats.total} hint={`${stats.accepted} accepted`} tone="text-info" />
        <StatCard icon={Target} label="Acceptance rate" value={`${stats.rate}%`} tone="text-primary" />
        <StatCard icon={Flame} label="Current streak" value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`} tone="text-warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card border border-base-300 bg-base-100 lg:col-span-2">
          <div className="card-body">
            <h2 className="card-title text-base">
              <CalendarDays size={18} /> Activity
            </h2>
            <Heatmap submissions={history || []} />
            <div className="flex items-center gap-1 text-xs text-base-content/50">
              Less
              {['bg-base-300/70', 'bg-primary/30', 'bg-primary/50', 'bg-primary/75', 'bg-primary'].map((c) => (
                <span key={c} className={`h-3 w-3 rounded-[3px] ${c}`} />
              ))}
              More
            </div>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-100">
          <div className="card-body">
            <h2 className="card-title text-base">By difficulty</h2>
            <div className="space-y-4">
              {DIFFICULTIES.map((d) => {
                const [s, t] = stats.byDiff[d];
                const m = difficultyMeta(d);
                return (
                  <div key={d}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className={`font-medium ${m.text}`}>{m.label}</span>
                      <span className="tabular-nums text-base-content/60">
                        {s} / {t}
                      </span>
                    </div>
                    <progress className={`progress ${m.progress}`} value={s} max={t || 1} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card border border-base-300 bg-base-100 lg:col-span-2">
          <div className="card-body">
            <h2 className="card-title text-base">
              <History size={18} /> Recent submissions
            </h2>
            {!history?.length ? (
              <EmptyState title="No submissions yet">Solve a problem and your history will show up here.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Problem</th>
                      <th>Status</th>
                      <th className="hidden md:table-cell">Language</th>
                      <th className="hidden md:table-cell">Runtime</th>
                      <th className="hidden md:table-cell">Memory</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 15).map((s) => (
                      <tr key={s._id} className="hover:bg-base-200/60">
                        <td>
                          {s.problemId ? (
                            <NavLink to={`/problem/${s.problemId._id}`} className="font-medium hover:text-primary">
                              {s.problemId.title}
                            </NavLink>
                          ) : (
                            <span className="text-base-content/50 italic">Deleted problem</span>
                          )}
                          {s.problemId && <DifficultyBadge difficulty={s.problemId.difficulty} className="ml-2" />}
                        </td>
                        <td>
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="hidden md:table-cell">{submissionLanguageLabel(s.language)}</td>
                        <td className="hidden tabular-nums md:table-cell">{formatRuntime(s.runtime)}</td>
                        <td className="hidden tabular-nums md:table-cell">{formatMemory(s.memory)}</td>
                        <td className="whitespace-nowrap text-base-content/60">{timeAgo(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="card border border-base-300 bg-base-100">
            <div className="card-body">
              <h2 className="card-title text-base">Topic mastery</h2>
              <ul className="space-y-2.5">
                {stats.topics.slice(0, 8).map(([tag, [s, t]]) => (
                  <li key={tag}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <NavLink to={`/?tag=${tag}`} className="hover:text-primary">
                        {tagLabel(tag)}
                      </NavLink>
                      <span className="tabular-nums text-base-content/60">
                        {s}/{t}
                      </span>
                    </div>
                    <progress className="progress progress-primary h-1.5" value={s} max={t} />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="card border border-base-300 bg-base-100">
            <div className="card-body">
              <h2 className="card-title text-base">Account</h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-base-content/60">Name</dt>
                  <dd className="truncate">{[user?.firstName, user?.lastName].filter(Boolean).join(' ')}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-base-content/60">Email</dt>
                  <dd className="truncate">{user?.emailId}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-base-content/60">Role</dt>
                  <dd className="capitalize">{user?.role}</dd>
                </div>
                {user?.createdAt && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-base-content/60">Joined</dt>
                    <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
              <button className="btn btn-error btn-outline btn-sm mt-3" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} /> Delete account
              </button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your account?"
        confirmLabel="Delete permanently"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        This permanently removes your account and all of your submissions. This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}

export default Dashboard;
