import { useMemo } from 'react';
import { NavLink } from 'react-router';
import { FilePlus2, Library, ListChecks, Video, Settings2 } from 'lucide-react';
import { useProblems } from '../hooks/useProblems';
import { DIFFICULTIES, difficultyMeta } from '../lib/constants';
import { ErrorState, PageSpinner, StatCard } from '../components/ui';

const ACTIONS = [
  {
    to: '/admin/create',
    title: 'Create problem',
    text: 'Add a new problem. Reference solutions are verified on Judge0 before saving.',
    icon: FilePlus2,
    tone: 'text-success bg-success/10',
  },
  {
    to: '/admin/problems',
    title: 'Manage problems',
    text: 'Search, edit, or delete existing problems and their test cases.',
    icon: Settings2,
    tone: 'text-primary bg-primary/10',
  },
  {
    to: '/admin/problems?view=video',
    title: 'Video editorials',
    text: 'Upload or remove Cloudinary-hosted video walkthroughs.',
    icon: Video,
    tone: 'text-secondary bg-secondary/10',
  },
];

function Admin() {
  const { problems, loading, error, reload } = useProblems();

  const counts = useMemo(() => {
    const c = { easy: 0, medium: 0, hard: 0, video: 0 };
    for (const p of problems) {
      c[p.difficulty] = (c[p.difficulty] || 0) + 1;
      if (p.hasVideo) c.video++;
    }
    return c;
  }, [problems]);

  if (loading) return <PageSpinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin console</h1>
        <p className="text-base-content/60">Manage the problem set and editorial content.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Library} label="Total problems" value={problems.length} />
        {DIFFICULTIES.map((d) => (
          <StatCard
            key={d}
            icon={ListChecks}
            label={difficultyMeta(d).label}
            value={counts[d]}
            tone={difficultyMeta(d).text}
            hint={d === 'hard' ? `${counts.video} with video editorials` : undefined}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {ACTIONS.map(({ to, title, text, icon: Icon, tone }) => (
          <NavLink
            key={to}
            to={to}
            className="card border border-base-300 bg-base-100 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
          >
            <div className="card-body">
              <div className={`mb-2 grid h-12 w-12 place-items-center rounded-xl ${tone}`}>
                <Icon size={24} aria-hidden="true" />
              </div>
              <h2 className="card-title">{title}</h2>
              <p className="text-sm text-base-content/60">{text}</p>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default Admin;
