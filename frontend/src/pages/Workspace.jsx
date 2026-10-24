import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { NavLink, useNavigate, useParams } from 'react-router';
import {
  AudioLines,
  Bot,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Eye,
  FileText,
  History,
  ListChecks,
  Lock,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  TerminalSquare,
  Video,
} from 'lucide-react';
import axiosClient, { getErrorMessage } from '../api/client';
import { LANGUAGES, languageById, tagLabel } from '../lib/constants';
import { useProblems, markSolved } from '../hooks/useProblems';
import { useTheme } from '../hooks/useTheme';
import { useIsDesktop, useSplit } from '../hooks/useSplit';
import { useToast } from '../components/ui/Toast';
import { DifficultyBadge, ErrorState, Logo, PageSpinner } from '../components/ui';
import { ThemeToggle, UserMenu } from '../components/layout/Navbar';
import SubmissionHistory from '../components/workspace/SubmissionHistory';
import AiChat from '../components/workspace/AiChat';
import Editorial from '../components/workspace/Editorial';
import Markdown from '../components/ui/Markdown';
import { ResultPanel, TestcasePanel } from '../components/workspace/ConsolePanels';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import VoicePanel from '../components/voice/VoicePanel';
import VoiceDock from '../components/voice/VoiceDock';
import { useVoiceSession } from '../hooks/useVoiceSession';

const LEFT_TABS = [
  { id: 'description', label: 'Description', icon: FileText },
  { id: 'editorial', label: 'Editorial', icon: Video },
  { id: 'solutions', label: 'Solutions', icon: BookOpen },
  { id: 'submissions', label: 'Submissions', icon: History },
  { id: 'ai', label: 'AI Tutor', icon: Bot },
  { id: 'voice', label: 'Voice', icon: AudioLines },
];

const draftKey = (pid, lang) => `wisecode:draft:${pid}:${lang}`;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

// Compact run/submit summary for the voice tutor's get_editor_state tool.
const summariseResult = (r, kind) => {
  if (!r) return null;
  if (r.error) return { verdict: 'request failed', error: r.error };
  const verdict =
    kind === 'submit'
      ? r.accepted ? 'Accepted' : r.status === 'wrong' ? 'Wrong Answer' : 'Error'
      : r.success ? 'All examples passed' : r.status === 'wrong' ? 'Wrong Answer' : 'Error';
  const compile = r.testCases?.find((c) => c.compile_output)?.compile_output;
  return {
    verdict,
    passed: r.passedTestCases,
    total: r.totalTestCases,
    error: compile || r.errorMessage || '',
    runtime: r.runtime != null ? `${r.runtime}s` : '',
    memory: r.memory != null ? `${r.memory}KB` : '',
    cases: (r.testCases || []).map((c) => ({
      input: c.stdin,
      expected: c.expected_output,
      output: c.stdout ?? c.stderr ?? '',
      passed: c.status_id === 3,
    })),
  };
};

const starterFor = (problem, lang) =>
  problem?.startCode?.find((s) => s.language === languageById(lang).label)?.initialCode || '';

function Solutions({ problem, solved }) {
  const [revealed, setRevealed] = useState(solved);
  const [lang, setLang] = useState(problem.referenceSolution?.[0]?.language);
  const solution = problem.referenceSolution?.find((s) => s.language === lang);

  if (!problem.referenceSolution?.length) return <p className="text-base-content/60">No reference solutions.</p>;

  if (!revealed) {
    return (
      <div className="rounded-box border border-dashed border-base-300 p-8 text-center">
        <Lock className="mx-auto mb-3 text-base-content/40" size={28} aria-hidden="true" />
        <p className="font-semibold">Solutions are hidden until you solve the problem</p>
        <p className="mb-4 text-sm text-base-content/60">Try a hint from the AI tutor first — you’ve got this.</p>
        <button className="btn btn-outline btn-sm" onClick={() => setRevealed(true)}>
          <Eye size={14} /> Reveal anyway
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div role="tablist" className="tabs tabs-box tabs-sm w-fit">
        {problem.referenceSolution.map((s) => (
          <button
            key={s.language}
            role="tab"
            aria-selected={lang === s.language}
            className={`tab ${lang === s.language ? 'tab-active' : ''}`}
            onClick={() => setLang(s.language)}
          >
            {s.language}
          </button>
        ))}
      </div>
      {solution && <Markdown text={'```' + solution.language.toLowerCase().replace('c++', 'cpp') + '\n' + solution.completeCode + '\n```'} />}
    </div>
  );
}

function Description({ problem, solved }) {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{problem.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={problem.difficulty} />
          <NavLink to={`/?tag=${problem.tags}`} className="badge badge-ghost badge-sm hover:badge-primary">
            {tagLabel(problem.tags)}
          </NavLink>
          {solved && (
            <span className="badge badge-success badge-soft badge-sm gap-1">
              <CheckCircle2 size={12} /> Solved
            </span>
          )}
          {problem.secureUrl && (
            <span className="badge badge-secondary badge-soft badge-sm gap-1">
              <Video size={12} /> Video
            </span>
          )}
        </div>
      </header>

      <div className="text-sm leading-relaxed whitespace-pre-wrap">{problem.description}</div>

      <section className="space-y-3">
        {problem.visibleTestCases?.map((ex, i) => (
          <div key={ex._id || i}>
            <h3 className="mb-1.5 text-sm font-semibold">Example {i + 1}</h3>
            <div className="space-y-1.5 rounded-lg border-l-2 border-primary/60 bg-base-200 p-3 font-mono text-xs">
              <div>
                <span className="font-sans font-semibold text-base-content/70">Input: </span>
                <span className="whitespace-pre-wrap">{ex.input}</span>
              </div>
              <div>
                <span className="font-sans font-semibold text-base-content/70">Output: </span>
                <span className="whitespace-pre-wrap">{ex.output}</span>
              </div>
              {ex.explanation && (
                <div className="font-sans">
                  <span className="font-semibold text-base-content/70">Explanation: </span>
                  {ex.explanation}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {problem.hiddenTestCaseCount > 0 && (
        <p className="text-xs text-base-content/50">
          Submissions are judged against {problem.hiddenTestCaseCount} hidden test case
          {problem.hiddenTestCaseCount === 1 ? '' : 's'}.
        </p>
      )}
    </article>
  );
}

const Workspace = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isDark } = useTheme();
  const desktop = useIsDesktop();
  const { problems, solved } = useProblems();

  const [problem, setProblem] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [language, setLanguage] = useState(() => localStorage.getItem('wisecode:lang') || 'javascript');
  const [code, setCode] = useState('');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('wisecode:font')) || 14);
  const [leftTab, setLeftTab] = useState('description');
  const [consoleTab, setConsoleTab] = useState('testcase');
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [running, setRunning] = useState(null); // 'run' | 'submit' | null
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState('');
  const editorRef = useRef(null);

  // Latest editor/run state, read by the voice tutor on demand.
  const liveState = useRef({});
  liveState.current = { code, language, runResult, submitResult };
  const getVoiceContext = useCallback(() => {
    const { code: c, language: l, runResult: rr, submitResult: sr } = liveState.current;
    return {
      language: languageById(l).label,
      code: c,
      cursorLine: editorRef.current?.getPosition?.()?.lineNumber,
      lastRun: summariseResult(rr, 'run'),
      lastSubmit: summariseResult(sr, 'submit'),
    };
  }, []);
  const voice = useVoiceSession({ problemId, getContext: getVoiceContext });

  const hSplit = useSplit({ initial: 45, min: 25, max: 70, axis: 'x', storageKey: 'wisecode:split-x' });
  const vSplit = useSplit({ initial: 62, min: 25, max: 85, axis: 'y', storageKey: 'wisecode:split-y' });

  const isSolved = solved.has(problemId);

  // Load the problem whenever the route changes.
  useEffect(() => {
    let cancelled = false;
    setProblem(null);
    setLoadError('');
    setRunResult(null);
    setSubmitResult(null);
    setLeftTab('description');
    axiosClient
      .get(`/problem/problemById/${problemId}`)
      .then(({ data }) => !cancelled && setProblem(data))
      .catch((e) => !cancelled && setLoadError(getErrorMessage(e, 'Unable to load this problem.')));
    return () => {
      cancelled = true;
    };
  }, [problemId]);

  // Restore the saved draft (or starter code) when problem or language changes.
  useEffect(() => {
    if (!problem) return;
    setCode(localStorage.getItem(draftKey(problem._id, language)) ?? starterFor(problem, language));
  }, [problem, language]);

  // Persist drafts (debounced).
  useEffect(() => {
    if (!problem) return;
    const t = setTimeout(() => {
      if (code === starterFor(problem, language)) localStorage.removeItem(draftKey(problem._id, language));
      else localStorage.setItem(draftKey(problem._id, language), code);
    }, 400);
    return () => clearTimeout(t);
  }, [code, problem, language]);

  useEffect(() => localStorage.setItem('wisecode:lang', language), [language]);
  useEffect(() => localStorage.setItem('wisecode:font', String(fontSize)), [fontSize]);

  useEffect(() => {
    if (problem) document.title = `${problem.title} · WiseCode`;
    return () => {
      document.title = 'WiseCode';
    };
  }, [problem]);

  const position = useMemo(() => problems.findIndex((p) => p._id === problemId), [problems, problemId]);
  const prev = position > 0 ? problems[position - 1] : null;
  const next = position >= 0 && position < problems.length - 1 ? problems[position + 1] : null;

  const goRandom = () => {
    const pool = problems.filter((p) => !solved.has(p._id) && p._id !== problemId);
    const from = pool.length ? pool : problems;
    if (from.length) navigate(`/problem/${from[Math.floor(Math.random() * from.length)]._id}`);
  };

  const execute = useCallback(
    async (kind) => {
      if (running || !problem) return;
      if (!code.trim()) {
        toast.warning('Write some code first');
        return;
      }
      setRunning(kind);
      setConsoleOpen(true);
      setConsoleTab(kind === 'run' ? 'testcase' : 'result');
      try {
        const { data } = await axiosClient.post(`/submission/${kind}/${problem._id}`, { code, language });
        if (kind === 'run') {
          setRunResult(data);
        } else {
          setSubmitResult(data);
          setHistoryKey((k) => k + 1);
          if (data.accepted) {
            markSolved(problem._id);
            toast.success('Accepted! Problem solved 🎉');
          }
        }
      } catch (e) {
        const error = getErrorMessage(e, kind === 'run' ? 'Unable to run code.' : 'Unable to submit code.');
        if (kind === 'run') setRunResult({ error });
        else setSubmitResult({ error });
      } finally {
        setRunning(null);
      }
    },
    [running, problem, code, language, toast]
  );

  // Keep the latest handler for Monaco/global shortcuts.
  const execRef = useRef(execute);
  useEffect(() => {
    execRef.current = execute;
  }, [execute]);

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        execRef.current('submit');
      } else if (e.key === "'") {
        e.preventDefault();
        execRef.current('run');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => execRef.current('submit'));
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote, () => execRef.current('run'));
  };

  const loadCode = (lang, source) => {
    // Save as the draft so the language effect restores it after switching.
    localStorage.setItem(draftKey(problem._id, lang), source);
    if (lang === language) setCode(source);
    else setLanguage(lang);
    setLeftTab('description');
    toast.info('Submission loaded into the editor');
  };

  const resetCode = () => {
    setCode(starterFor(problem, language));
    localStorage.removeItem(draftKey(problem._id, language));
    setConfirmReset(false);
  };

  if (loadError)
    return (
      <div className="mx-auto max-w-xl p-8">
        <ErrorState message={loadError} />
        <NavLink to="/" className="btn btn-ghost btn-sm mt-4">
          <ChevronLeft size={16} /> Back to problems
        </NavLink>
      </div>
    );
  if (!problem) return <PageSpinner label="Loading problem…" />;

  const leftPane = (
    <section className="flex h-full min-h-0 flex-col rounded-box border border-base-300 bg-base-100" aria-label="Problem">
      <div role="tablist" className="scroll-thin flex shrink-0 gap-1 overflow-x-auto border-b border-base-300 p-1.5">
        {LEFT_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={leftTab === id}
            className={`btn btn-sm gap-1.5 whitespace-nowrap ${leftTab === id ? 'btn-active' : 'btn-ghost text-base-content/70'}`}
            onClick={() => setLeftTab(id)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <div className={`scroll-thin min-h-0 flex-1 p-5 ${leftTab === 'ai' || leftTab === 'voice' ? 'flex flex-col' : 'overflow-y-auto'}`}>
        {leftTab === 'description' && <Description problem={problem} solved={isSolved} />}
        {leftTab === 'editorial' && (
          <Editorial secureUrl={problem.secureUrl} thumbnailUrl={problem.thumbnailUrl} duration={problem.duration} />
        )}
        {leftTab === 'solutions' && <Solutions key={problem._id} problem={problem} solved={isSolved} />}
        {leftTab === 'submissions' && (
          <SubmissionHistory problemId={problem._id} refreshKey={historyKey} onLoadCode={loadCode} />
        )}
        {leftTab === 'ai' && (
          <AiChat
            key={problem._id}
            problem={problem}
            getCode={() => code}
            language={language}
            initialPrompt={pendingPrompt}
            onPromptSent={() => setPendingPrompt('')}
          />
        )}
        {leftTab === 'voice' && (
          <VoicePanel
            voice={voice}
            onUseTextChat={(text) => {
              if (voice.active) voice.stop();
              if (text) setPendingPrompt(text);
              setLeftTab('ai');
            }}
          />
        )}
      </div>
    </section>
  );

  const editorPane = (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-box border border-base-300 bg-base-100" aria-label="Code editor">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-base-300 px-2 py-1.5">
        <select
          className="select select-sm w-36"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <div className="join" aria-label="Font size">
            <button className="btn btn-ghost btn-xs join-item" onClick={() => setFontSize((f) => Math.max(11, f - 1))} aria-label="Decrease font size">
              <Minus size={12} />
            </button>
            <span className="btn btn-ghost btn-xs join-item pointer-events-none tabular-nums">{fontSize}px</span>
            <button className="btn btn-ghost btn-xs join-item" onClick={() => setFontSize((f) => Math.min(22, f + 1))} aria-label="Increase font size">
              <Plus size={12} />
            </button>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={() => setConfirmReset(true)} title="Reset to starter code">
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={languageById(language).monaco}
          value={code}
          onChange={(v) => setCode(v ?? '')}
          onMount={onEditorMount}
          theme={isDark ? 'vs-dark' : 'light'}
          loading={<span className="loading loading-spinner text-primary" />}
          options={{
            fontSize,
            fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            padding: { top: 12 },
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'line',
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </section>
  );

  const consolePane = (
    <section className="flex h-full min-h-0 flex-col rounded-box border border-base-300 bg-base-100" aria-label="Console">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-base-300 px-2 py-1.5">
        <div role="tablist" className="flex gap-1">
          {[
            { id: 'testcase', label: 'Testcases', icon: ListChecks },
            { id: 'result', label: 'Result', icon: TerminalSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={consoleOpen && consoleTab === id}
              className={`btn btn-xs gap-1 ${consoleOpen && consoleTab === id ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => {
                setConsoleTab(id);
                setConsoleOpen(true);
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
          <button className="btn btn-ghost btn-xs" onClick={() => setConsoleOpen((o) => !o)} aria-expanded={consoleOpen}>
            {consoleOpen ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[0.7rem] text-base-content/40 xl:inline">
            <kbd className="kbd kbd-xs">{MOD}</kbd>+<kbd className="kbd kbd-xs">'</kbd> run ·{' '}
            <kbd className="kbd kbd-xs">{MOD}</kbd>+<kbd className="kbd kbd-xs">↵</kbd> submit
          </span>
          <button className="btn btn-sm btn-ghost border-base-300" onClick={() => execute('run')} disabled={!!running}>
            {running === 'run' ? <span className="loading loading-spinner loading-xs" /> : <Play size={14} />}
            Run
          </button>
          <button className="btn btn-sm btn-success" onClick={() => execute('submit')} disabled={!!running}>
            {running === 'submit' ? <span className="loading loading-spinner loading-xs" /> : <CloudUpload size={14} />}
            Submit
          </button>
        </div>
      </div>
      {consoleOpen && (
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite">
          {running ? (
            <div className="flex items-center gap-3 text-sm text-base-content/60">
              <span className="loading loading-bars loading-sm text-primary" />
              {running === 'run' ? 'Running against examples…' : 'Judging against hidden test cases…'}
            </div>
          ) : consoleTab === 'testcase' ? (
            <TestcasePanel key={problem._id} examples={problem.visibleTestCases || []} result={runResult} />
          ) : (
            <ResultPanel result={submitResult} />
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="flex h-dvh flex-col bg-base-200">
      {/* Workspace top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-base-300 bg-base-100 px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <span className="hidden h-5 w-px bg-base-300 sm:block" />
          <NavLink to="/" className="btn btn-ghost btn-sm hidden gap-1.5 sm:inline-flex">
            <ListChecks size={16} /> Problems
          </NavLink>
          <div className="join">
            <button
              className="btn btn-ghost btn-sm join-item btn-square"
              disabled={!prev}
              onClick={() => prev && navigate(`/problem/${prev._id}`)}
              aria-label="Previous problem"
              title={prev ? `Previous: ${prev.title}` : undefined}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="btn btn-ghost btn-sm join-item btn-square"
              disabled={!next}
              onClick={() => next && navigate(`/problem/${next._id}`)}
              aria-label="Next problem"
              title={next ? `Next: ${next.title}` : undefined}
            >
              <ChevronRight size={16} />
            </button>
            <button className="btn btn-ghost btn-sm join-item btn-square" onClick={goRandom} aria-label="Random problem" title="Random problem">
              <Shuffle size={15} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <VoiceDock voice={voice} onOpen={() => setLeftTab('voice')} />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {desktop ? (
        <div ref={hSplit.containerRef} className="flex min-h-0 flex-1 p-2">
          <div style={{ width: `${hSplit.size}%` }} className="min-w-0">
            {leftPane}
          </div>
          <div {...hSplit.gutterProps} aria-label="Resize panels" className="gutter mx-1 w-1 cursor-col-resize rounded-full" />
          <div ref={vSplit.containerRef} className="flex min-w-0 flex-1 flex-col">
            <div style={{ height: consoleOpen ? `${vSplit.size}%` : undefined }} className={`min-h-0 ${consoleOpen ? '' : 'flex-1'}`}>
              {editorPane}
            </div>
            {consoleOpen && (
              <div {...vSplit.gutterProps} aria-label="Resize console" className="gutter my-1 h-1 cursor-row-resize rounded-full" />
            )}
            <div className={consoleOpen ? 'min-h-0 flex-1' : 'mt-2 shrink-0'}>{consolePane}</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto p-2">
          <div className="h-[60vh]">{leftPane}</div>
          <div className="h-[60vh]">{editorPane}</div>
          <div className={consoleOpen ? 'h-[50vh]' : ''}>{consolePane}</div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Reset code?"
        confirmLabel="Reset"
        tone="btn-warning"
        onConfirm={resetCode}
        onCancel={() => setConfirmReset(false)}
      >
        Your current {languageById(language).label} code for this problem will be replaced with the starter template.
      </ConfirmDialog>
    </div>
  );
};

export default Workspace;
