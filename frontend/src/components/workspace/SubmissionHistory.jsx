import { useEffect, useState } from 'react';
import { Code2, FileInput, History } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../utils/axiosClient';
import { submissionLanguageLabel } from '../lib/constants';
import { formatDate, formatMemory, formatRuntime, timeAgo } from '../lib/format';
import { EmptyState, ErrorState, PageSpinner, StatusBadge } from './ui';

// `refreshKey` changes after each submit so the list reloads.
const SubmissionHistory = ({ problemId, refreshKey, onLoadCode }) => {
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    axiosClient
      .get(`/problem/submittedProblem/${problemId}`)
      .then(({ data }) => !cancelled && setSubmissions(Array.isArray(data) ? data : []))
      .catch((e) => !cancelled && setError(getErrorMessage(e, 'Failed to fetch submission history')));
    return () => {
      cancelled = true;
    };
  }, [problemId, refreshKey]);

  if (error) return <ErrorState message={error} />;
  if (!submissions) return <PageSpinner label="Loading submissions…" />;
  if (!submissions.length)
    return (
      <EmptyState icon={History} title="No submissions yet">
        Hit <kbd className="kbd kbd-xs">Submit</kbd> to evaluate your code against hidden tests.
      </EmptyState>
    );

  return (
    <>
      <ul className="divide-y divide-base-300 rounded-box border border-base-300">
        {submissions.map((s) => (
          <li key={s._id}>
            <button
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-base-200/70"
              onClick={() => setSelected(s)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  <span className="text-xs text-base-content/60">{submissionLanguageLabel(s.language)}</span>
                </div>
                <div className="mt-0.5 text-xs text-base-content/50" title={formatDate(s.createdAt)}>
                  {timeAgo(s.createdAt)}
                </div>
              </div>
              <div className="text-right text-xs tabular-nums text-base-content/60">
                <div>
                  {s.testCasesPassed}/{s.testCasesTotal} tests
                </div>
                <div>
                  {formatRuntime(s.runtime)} · {formatMemory(s.memory)}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="sub-title">
          <div className="modal-box w-11/12 max-w-4xl">
            <h3 id="sub-title" className="flex items-center gap-2 text-lg font-bold">
              <Code2 size={18} /> Submission · {submissionLanguageLabel(selected.language)}
            </h3>
            <div className="my-3 flex flex-wrap gap-2">
              <StatusBadge status={selected.status} />
              <span className="badge badge-outline badge-sm">
                {selected.testCasesPassed}/{selected.testCasesTotal} tests
              </span>
              <span className="badge badge-outline badge-sm">{formatRuntime(selected.runtime)}</span>
              <span className="badge badge-outline badge-sm">{formatMemory(selected.memory)}</span>
              <span className="badge badge-ghost badge-sm">{formatDate(selected.createdAt)}</span>
            </div>
            {selected.errorMessage && (
              <pre className="scroll-thin mb-3 max-h-40 overflow-auto rounded-lg bg-error/10 p-3 font-mono text-xs text-error">
                {selected.errorMessage}
              </pre>
            )}
            <pre className="scroll-thin max-h-[50vh] overflow-auto rounded-lg bg-base-300 p-4 font-mono text-xs leading-relaxed">
              <code>{selected.code}</code>
            </pre>
            <div className="modal-action">
              {onLoadCode && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onLoadCode(selected.language === 'c++' ? 'cpp' : selected.language, selected.code);
                    setSelected(null);
                  }}
                >
                  <FileInput size={14} /> Load into editor
                </button>
              )}
              <button className="btn btn-sm" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
          <button className="modal-backdrop" onClick={() => setSelected(null)} aria-label="Close" />
        </div>
      )}
    </>
  );
};

export default SubmissionHistory;
