import { Bot, CheckCircle2, Code2, PlayCircle, Trophy } from 'lucide-react';
import { Logo } from '../ui';
import { ThemeToggle } from './Navbar';

const FEATURES = [
  { icon: Code2, title: '369+ curated problems', text: 'Arrays to DP, filtered by topic and difficulty.' },
  { icon: PlayCircle, title: 'Real code execution', text: 'Run JavaScript, Java and C++ against test cases.' },
  { icon: Bot, title: 'AI tutor', text: 'Problem-aware hints, reviews and complexity analysis.' },
  { icon: Trophy, title: 'Track progress', text: 'Solved stats, activity heatmap and full history.' },
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-base-300 bg-base-100 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-secondary/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <Logo size="lg" />
        </div>
        <div className="relative max-w-lg">
          <h2 className="text-4xl leading-tight font-extrabold">
            Sharpen your <span className="text-gradient">problem-solving</span>, one submission at a time.
          </h2>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-base-content/60">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-box border border-base-300 bg-base-200/80 p-4 font-mono text-xs backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-success">
            <CheckCircle2 size={14} /> Accepted · 3/3 test cases · 68 ms
          </div>
          <pre className="text-base-content/70">{`function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
}`}</pre>
        </div>
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <span className="lg:hidden">
            <Logo />
          </span>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-1 mb-8 text-base-content/60">{subtitle}</p>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
