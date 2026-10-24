import { useMemo, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, ExternalLink, FilePlus2, Pencil, Search, Trash2, Upload, Video, VideoOff } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../../api/client';
import { refreshProblems, useProblems } from '../../hooks/useProblems';
import { DIFFICULTIES, TAGS, difficultyMeta } from '../../lib/constants';
import { DifficultyBadge, EmptyState, ErrorState, PageSpinner, TagBadge } from '../../components/ui';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';

const PAGE_SIZE = 20;

function AdminProblems() {
  const { problems, loading, error, reload } = useProblems();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [tag, setTag] = useState('all');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null); // { kind: 'problem'|'video', problem }
  const [busy, setBusy] = useState(false);
  const videoView = params.get('view') === 'video';

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return problems.filter(
      (p) =>
        (!term || p.title.toLowerCase().includes(term)) &&
        (difficulty === 'all' || p.difficulty === difficulty) &&
        (tag === 'all' || p.tags === tag) &&
        (!videoView || params.get('video') !== 'missing' || !p.hasVideo)
    );
  }, [problems, q, difficulty, tag, videoView, params]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const confirm = async () => {
    const { kind, problem } = pending;
    setBusy(true);
    try {
      if (kind === 'problem') await axiosClient.delete(`/problem/delete/${problem._id}`);
      else await axiosClient.delete(`/video/delete/${problem._id}`);
      await refreshProblems();
      toast.success(kind === 'problem' ? `Deleted “${problem.title}”` : `Removed video for “${problem.title}”`);
      setPending(null);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Delete failed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const resetPage = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <NavLink to="/admin" className="link link-hover text-sm text-base-content/60">
            ← Admin console
          </NavLink>
          <h1 className="text-3xl font-bold">{videoView ? 'Video editorials' : 'Manage problems'}</h1>
        </div>
        <div className="flex gap-2">
          <div role="tablist" className="tabs tabs-box tabs-sm">
            <button role="tab" aria-selected={!videoView} className={`tab ${!videoView ? 'tab-active' : ''}`} onClick={() => setParams({})}>
              Problems
            </button>
            <button
              role="tab"
              aria-selected={videoView}
              className={`tab ${videoView ? 'tab-active' : ''}`}
              onClick={() => setParams({ view: 'video' })}
            >
              Videos
            </button>
          </div>
          <NavLink to="/admin/create" className="btn btn-primary btn-sm">
            <FilePlus2 size={16} /> New problem
          </NavLink>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <label className="input input-sm w-full md:max-w-xs">
          <Search size={14} className="opacity-50" aria-hidden="true" />
          <input type="search" placeholder="Search by title…" value={q} onChange={resetPage(setQ)} aria-label="Search" />
        </label>
        <select className="select select-sm md:w-40" value={difficulty} onChange={resetPage(setDifficulty)} aria-label="Difficulty">
          <option value="all">All difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {difficultyMeta(d).label}
            </option>
          ))}
        </select>
        <select className="select select-sm md:w-48" value={tag} onChange={resetPage(setTag)} aria-label="Topic">
          <option value="all">All topics</option>
          {TAGS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {videoView && (
          <label className="label cursor-pointer gap-2 text-sm">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={params.get('video') === 'missing'}
              onChange={(e) => {
                setParams(e.target.checked ? { view: 'video', video: 'missing' } : { view: 'video' });
                setPage(1);
              }}
            />
            Missing video only
          </label>
        )}
      </div>

      <div className="card overflow-hidden border border-base-300 bg-base-100">
        {!rows.length ? (
          <EmptyState icon={Search} title="No problems found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Title</th>
                  <th className="hidden md:table-cell">Topic</th>
                  <th>Difficulty</th>
                  <th>Video</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p._id} className="hover:bg-base-200/60">
                    <td className="font-medium">{p.title}</td>
                    <td className="hidden md:table-cell">
                      <TagBadge tag={p.tags} />
                    </td>
                    <td>
                      <DifficultyBadge difficulty={p.difficulty} />
                    </td>
                    <td>
                      {p.hasVideo ? (
                        <Video size={16} className="text-secondary" aria-label="Has video" />
                      ) : (
                        <VideoOff size={16} className="text-base-content/30" aria-label="No video" />
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <NavLink to={`/problem/${p._id}`} className="btn btn-ghost btn-xs" title="Open in workspace" aria-label={`Open ${p.title}`}>
                          <ExternalLink size={14} />
                        </NavLink>
                        {videoView ? (
                          <>
                            <NavLink to={`/admin/upload/${p._id}`} className="btn btn-secondary btn-soft btn-xs">
                              <Upload size={14} /> {p.hasVideo ? 'Replace' : 'Upload'}
                            </NavLink>
                            {p.hasVideo && (
                              <button className="btn btn-error btn-soft btn-xs" onClick={() => setPending({ kind: 'video', problem: p })}>
                                <Trash2 size={14} /> Remove
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <NavLink to={`/admin/edit/${p._id}`} className="btn btn-primary btn-soft btn-xs">
                              <Pencil size={14} /> Edit
                            </NavLink>
                            <button className="btn btn-error btn-soft btn-xs" onClick={() => setPending({ kind: 'problem', problem: p })}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-base-300 px-4 py-3 text-sm">
          <span className="text-base-content/60">{filtered.length} problems</span>
          <div className="join">
            <button className="btn join-item btn-sm" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Previous page">
              <ChevronLeft size={16} />
            </button>
            <span className="btn join-item btn-sm pointer-events-none tabular-nums">
              {current} / {pages}
            </span>
            <button className="btn join-item btn-sm" disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label="Next page">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={pending?.kind === 'video' ? 'Remove video editorial?' : 'Delete problem?'}
        confirmLabel={pending?.kind === 'video' ? 'Remove video' : 'Delete problem'}
        busy={busy}
        onConfirm={confirm}
        onCancel={() => !busy && setPending(null)}
      >
        {pending?.kind === 'video'
          ? `The video for “${pending?.problem.title}” will be deleted from Cloudinary.`
          : `“${pending?.problem.title}” and all of its submissions will be permanently deleted.`}
      </ConfirmDialog>
    </div>
  );
}

export default AdminProblems;
