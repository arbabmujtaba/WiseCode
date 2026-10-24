import { useState } from 'react';
import { CheckCircle2, Clock, Cpu, PartyPopper, XCircle } from 'lucide-react';
import { formatMemory, formatRuntime } from '../lib/format';

const Block = ({ label, children, tone = '' }) => (
  <div>
    <div className="mb-1 text-xs font-medium text-base-content/60">{label}</div>
    <pre className={`scroll-thin max-h-40 overflow-auto rounded-lg bg-base-200 px-3 py-2 font-mono text-xs whitespace-pre-wrap ${tone}`}>
      {children === '' || children == null ? <span className="text-base-content/40 italic">(empty)</span> : children}
    </pre>
  </div>
);

const Metrics = ({ runtime, memory }) => (
  <div className="flex gap-4 text-xs text-base-content/60">
    <span className="flex items-center gap-1">
      <Clock size={13} /> {formatRuntime(runtime)}
    </span>
    <span className="flex items-center gap-1">
      <Cpu size={13} /> {formatMemory(memory)}
    </span>
  </div>
);

// Before running: show visible test inputs. After running: per-case verdicts.
export function TestcasePanel({ examples, result }) {
  const [active, setActive] = useState(0);
  const cases = result?.testCases?.length ? result.testCases : null;
  const count = cases ? cases.length : examples.length;
  const idx = Math.min(active, Math.max(0, count - 1));

  if (result?.error) {
    return (
      <div role="alert" className="alert alert-error alert-soft text-sm">
        <XCircle size={16} /> {result.error}
      </div>
    );
  }

  const compileError = cases?.find((c) => c.compile_output)?.compile_output;

  return (
    <div className="space-y-3">
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`flex items-center gap-2 text-lg font-semibold ${result.success ? 'text-success' : 'text-error'}`}>
            {result.success ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {result.success ? 'All examples passed' : result.status === 'error' ? 'Runtime / compile error' : 'Wrong answer'}
            <span className="text-sm font-normal text-base-content/60">
              {result.passedTestCases}/{result.totalTestCases} passed
            </span>
          </h3>
          <Metrics runtime={result.runtime} memory={result.memory} />
        </div>
      )}

      {compileError && <Block label="Compiler output" tone="text-error">{compileError}</Block>}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Test cases">
        {Array.from({ length: count }, (_, i) => {
          const passed = cases ? cases[i].status_id === 3 : null;
          return (
            <button
              key={i}
              role="tab"
              aria-selected={idx === i}
              className={`btn btn-xs ${idx === i ? 'btn-active' : 'btn-ghost'} gap-1`}
              onClick={() => setActive(i)}
            >
              {passed === true && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
              {passed === false && <span className="h-1.5 w-1.5 rounded-full bg-error" />}
              Case {i + 1}
            </button>
          );
        })}
      </div>

      {cases ? (
        <div className="space-y-3">
          <Block label="Input">{cases[idx].stdin}</Block>
          <Block label="Your output" tone={cases[idx].status_id === 3 ? '' : 'text-error'}>
            {cases[idx].stdout}
          </Block>
          <Block label="Expected">{cases[idx].expected_output}</Block>
          {cases[idx].stderr && (
            <Block label="stderr" tone="text-error">
              {cases[idx].stderr}
            </Block>
          )}
          {cases[idx].status_id !== 3 && cases[idx].status && (
            <p className="text-xs text-base-content/60">Verdict: {cases[idx].status}</p>
          )}
        </div>
      ) : examples[idx] ? (
        <div className="space-y-3">
          <Block label="Input">{examples[idx].input}</Block>
          <Block label="Expected">{examples[idx].output}</Block>
        </div>
      ) : (
        <p className="text-sm text-base-content/60">No example test cases.</p>
      )}
    </div>
  );
}

export function ResultPanel({ result }) {
  if (!result) {
    return (
      <p className="text-sm text-base-content/60">
        Press <kbd className="kbd kbd-xs">Submit</kbd> to evaluate your solution against the hidden test cases.
      </p>
    );
  }
  if (result.error) {
    return (
      <div role="alert" className="alert alert-error alert-soft text-sm">
        <XCircle size={16} /> {result.error}
      </div>
    );
  }

  const pct = result.totalTestCases ? Math.round((result.passedTestCases / result.totalTestCases) * 100) : 0;
  const title = result.accepted ? 'Accepted' : result.status === 'wrong' ? 'Wrong Answer' : 'Error';

  return (
    <div className="space-y-4">
      <div
        className={`rounded-box border p-4 ${
          result.accepted ? 'border-success/40 bg-success/10' : 'border-error/40 bg-error/10'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`flex items-center gap-2 text-2xl font-bold ${result.accepted ? 'text-success' : 'text-error'}`}>
            {result.accepted ? <PartyPopper size={24} /> : <XCircle size={24} />} {title}
          </h3>
          <Metrics runtime={result.runtime} memory={result.memory} />
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-base-content/70">
            <span>Hidden test cases</span>
            <span className="tabular-nums">
              {result.passedTestCases}/{result.totalTestCases}
            </span>
          </div>
          <progress
            className={`progress ${result.accepted ? 'progress-success' : 'progress-error'}`}
            value={pct}
            max={100}
          />
        </div>
        {result.accepted && <p className="mt-3 text-sm">Great work — this problem is now marked as solved. 🎉</p>}
      </div>
      {result.errorMessage && <Block label="Details" tone="text-error">{result.errorMessage}</Block>}
    </div>
  );
}
