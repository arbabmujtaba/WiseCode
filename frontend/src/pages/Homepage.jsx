import { useMemo } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { useSelector } from 'react-redux';
import {
  ArrowDownUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FilterX,
  Search,
  Shuffle,
  Video,
} from 'lucide-react';
import { useProblems } from '../hooks/useProblems';
import { DIFFICULTIES, TAGS, difficultyMeta } from '../lib/constants';
import { DifficultyBadge, EmptyState, ErrorState, PageSpinner, TagBadge } from '../components/ui';

const PAGE_SIZE = 25;
const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

function ProgressRing({ value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className="radial-progress text-primary"
      style={{ '--value': pct, '--size': '6.5rem', '--thickness': '0.55rem' }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Problems solved"
    >
      <div className="text-center">
        <div className="text-xl font-bold text-base-content">{value}</div>
        <div className="text-[0.65rem] text-base-content/60">/ {total} solved</div>
      </div>
    </div>
  );
}

function Homepage() {
  const { user } = useSelector((s) => s.auth);
  const { problems, solved, loading, error, reload } = useProblems();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const q = params.get('q') || '';
  const difficulty = params.get('difficulty') || 'all';
  const tag = params.get('tag') || 'all';
  const status = params.get('status') || 'all';
  const sort = params.get('sort') || 'default';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);

  // Update one or more filters; any filter change resets to page 1.
  const setFilter = (updates) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (!v || v === 'all' || v === 'default' || (k === 'page' && v === 1)) next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in updates)) next.delete('page');
    setParams(next, { replace: true });
  };

  const stats = useMemo(() => {
    const by = { easy: [0, 0], medium: [0, 0], hard: [0, 0] };
    for (const p of problems) {
      const d = by[p.difficulty];
      if (!d) continue;
      d[1]++;
      if (solved.has(p._id)) d[0]++;
    }
    return by;
  }, [problems, solved]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = problems.filter(
      (p) =>
        (!term || p.title.toLowerCase().includes(term)) &&
        (difficulty === 'all' || p.difficulty === difficulty) &&
        (tag === 'all' || p.tags === tag) &&
        (status === 'all' || (status === 'solved' ? solved.has(p._id) : !solved.has(p._id)))
    );
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'difficulty') list.sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    if (sort === 'difficulty-desc') list.sort((a, b) => DIFF_ORDER[b.difficulty] - DIFF_ORDER[a.difficulty]);
    return list;
  }, [problems, solved, q, difficulty, tag, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const indexOf = useMemo(() => new Map(problems.map((p, i) => [p._id, i + 1])), [problems]);
  const hasFilters = q || difficulty !== 'all' || tag !== 'all' || status !== 'all' || sort !== 'default';

  const pickRandom = () => {
    const pool = filtered.filter((p) => !solved.has(p._id));
    const from = pool.length ? pool : filtered;
    if (from.length) navigate(`/problem/${from[Math.floor(Math.random() * from.length)]._id}`);
  };

  if (loading) return <PageSpinner label="Loading problems…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      {/* Header + progress */}
      <section className="card overflow-hidden border border-base-300 bg-base-100">
        <div className="card-body flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-sm text-base-content/60">Welcome back, {user?.firstName} 👋</p>
            <h1 className="mt-1 text-3xl font-bold">Problem set</h1>
            <p className="mt-1 text-base-content/60">
              {problems.length} problems across {TAGS.length} topics. Pick one and start coding.
            </p>
            <button className="btn btn-primary btn-sm mt-4" onClick={pickRandom} disabled={!filtered.length}>
              <Shuffle size={16} /> Pick a random unsolved problem
            </button>
          </div>
          <div className="flex items-center gap-6">
            <ProgressRing value={solved.size} total={problems.length} />
            <div className="w-44 space-y-2.5">
              {DIFFICULTIES.map((d) => {
                const [s, t] = stats[d];
                const m = difficultyMeta(d);
                return (
                  <div key={d}>
                    <div className="flex justify-between text-xs">
                      <span className={`font-medium ${m.text}`}>{m.label}</span>
                      <span className="text-base-content/60">
                        {s}/{t}
                      </span>
                    </div>
                    <progress className={`progress h-1.5 ${m.progress}`} value={s} max={t || 1} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center" aria-label="Filters">
        <label className="input w-full lg:max-w-xs">
          <Search size={16} className="opacity-50" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search problems…"
            value={q}
            onChange={(e) => setFilter({ q: e.target.value })}
            aria-label="Search problems by title"
          />
        </label>

        <div className="join" role="group" aria-label="Difficulty">
          {['all', ...DIFFICULTIES].map((d) => (
            <button
              key={d}
              className={`btn join-item btn-sm ${difficulty === d ? 'btn-primary' : 'btn-ghost border-base-300'}`}
              aria-pressed={difficulty === d}
              onClick={() => setFilter({ difficulty: d })}
            >
              {d === 'all' ? 'All' : difficultyMeta(d).label}
            </button>
          ))}
        </div>

        <select className="select select-sm w-full lg:w-44" value={tag} onChange={(e) => setFilter({ tag: e.target.value })} aria-label="Topic">
          <option value="all">All topics</option>
          {TAGS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select className="select select-sm w-full lg:w-36" value={status} onChange={(e) => setFilter({ status: e.target.value })} aria-label="Status">
          <option value="all">Any status</option>
          <option value="solved">Solved</option>
          <option value="unsolved">Unsolved</option>
        </select>

        <label className="select select-sm w-full lg:w-48">
          <ArrowDownUp size={14} className="opacity-50" aria-hidden="true" />
          <select value={sort} onChange={(e) => setFilter({ sort: e.target.value })} aria-label="Sort by">
            <option value="default">Default order</option>
            <option value="title">Title A–Z</option>
            <option value="difficulty">Easiest first</option>
            <option value="difficulty-desc">Hardest first</option>
          </select>
        </label>

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={() => setParams({}, { replace: true })}>
            <FilterX size={16} /> Clear
          </button>
        )}
      </section>

      {/* List */}
      <section className="card overflow-hidden border border-base-300 bg-base-100">
        {visible.length === 0 ? (
          <EmptyState icon={Search} title="No problems match these filters">
            Try a different search or clear the filters.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">
                    <span className="sr-only">Status</span>
                  </th>
                  <th className="w-14">#</th>
                  <th>Title</th>
                  <th className="hidden sm:table-cell">Topic</th>
                  <th>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const isSolved = solved.has(p._id);
                  return (
                    <tr key={p._id} className="hover:bg-base-200/60">
                      <td>
                        {isSolved ? (
                          <CheckCircle2 size={18} className="text-success" aria-label="Solved" />
                        ) : (
                          <Circle size={18} className="text-base-content/20" aria-label="Not solved" />
                        )}
                      </td>
                      <td className="text-base-content/50 tabular-nums">{indexOf.get(p._id)}</td>
                      <td>
                        <NavLink to={`/problem/${p._id}`} className="font-medium hover:text-primary">
                          {p.title}
                        </NavLink>
                        {p.hasVideo && (
                          <Video size={14} className="ml-2 inline text-secondary" aria-label="Has video editorial" />
                        )}
                      </td>
                      <td className="hidden sm:table-cell">
                        <TagBadge tag={p.tags} />
                      </td>
                      <td>
                        <DifficultyBadge difficulty={p.difficulty} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-base-300 px-4 py-3 text-sm">
          <span className="text-base-content/60">
            {filtered.length ? `${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)}` : 0} of{' '}
            {filtered.length}
          </span>
          <div className="join">
            <button
              className="btn join-item btn-sm"
              disabled={current <= 1}
              onClick={() => setFilter({ page: current - 1 })}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="btn join-item btn-sm pointer-events-none tabular-nums">
              {current} / {pages}
            </span>
            <button
              className="btn join-item btn-sm"
              disabled={current >= pages}
              onClick={() => setFilter({ page: current + 1 })}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Homepage;
