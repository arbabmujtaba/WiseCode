import { useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Bot,
    BookOpen,
    CircleCheck,
    Code2,
    FileCode2,
    History,
    LayoutDashboard,
    Play,
    Plus,
    Send,
    ShieldCheck,
    Terminal,
    Video,
} from 'lucide-react';

const initialProblems = [
    {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
        tag: 'array',
        description:
            'Given an array of integers nums and an integer target, return the indices of two numbers whose sum is target.',
        example: 'Input: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]',
    },
    {
        id: 'course-schedule',
        title: 'Course Schedule',
        difficulty: 'medium',
        tag: 'graph',
        description:
            'Return whether every course can be completed when prerequisites are represented as directed dependencies.',
        example: 'Input: numCourses = 2, prerequisites = [[1, 0]]\nOutput: true',
    },
    {
        id: 'longest-subsequence',
        title: 'Longest Increasing Subsequence',
        difficulty: 'hard',
        tag: 'dp',
        description:
            'Find the length of the longest strictly increasing subsequence in an integer array.',
        example: 'Input: nums = [10, 9, 2, 5, 3, 7, 101, 18]\nOutput: 4',
    },
];

const starterCode = {
    javascript: `function solve(nums, target) {
  // Write your solution here
  return [0, 1];
}`,
    java: `class Solution {
  public int[] solve(int[] nums, int target) {
    return new int[] {0, 1};
  }
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> solve(vector<int>& nums, int target) {
  return {0, 1};
}`,
};

const languageLabels = {
    javascript: 'JavaScript',
    java: 'Java',
    cpp: 'C++',
};

function difficultyClass(difficulty) {
    if (difficulty === 'easy') return 'badge-success';
    if (difficulty === 'medium') return 'badge-warning';
    return 'badge-error';
}

function DemoApp() {
    const [problems, setProblems] = useState(initialProblems);
    const [solvedIds, setSolvedIds] = useState(['two-sum']);
    const [view, setView] = useState('home');
    const [activeProblemId, setActiveProblemId] = useState('two-sum');
    const [difficulty, setDifficulty] = useState('all');
    const [tag, setTag] = useState('all');
    const [status, setStatus] = useState('all');
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState(starterCode.javascript);
    const [runResult, setRunResult] = useState(null);
    const [submissionResult, setSubmissionResult] = useState(null);
    const [activeTab, setActiveTab] = useState('description');
    const [submissions, setSubmissions] = useState([
        { id: 1, status: 'Accepted', language: 'JavaScript', passed: '3 / 3', runtime: '0.04 s' },
        { id: 2, status: 'Wrong answer', language: 'JavaScript', passed: '2 / 3', runtime: '0.05 s' },
    ]);
    const [messages, setMessages] = useState([
        { id: 1, author: 'assistant', text: 'Start by describing the data structure you would use to find a matching pair efficiently.' },
    ]);
    const [chatInput, setChatInput] = useState('');
    const [newProblemTitle, setNewProblemTitle] = useState('');
    const [newProblemDifficulty, setNewProblemDifficulty] = useState('easy');
    const [editorialAttached, setEditorialAttached] = useState(true);

    const activeProblem = problems.find((problem) => problem.id === activeProblemId) ?? problems[0];
    const filteredProblems = problems.filter((problem) => {
        const matchesDifficulty = difficulty === 'all' || problem.difficulty === difficulty;
        const matchesTag = tag === 'all' || problem.tag === tag;
        const matchesStatus = status === 'all' || solvedIds.includes(problem.id);
        return matchesDifficulty && matchesTag && matchesStatus;
    });

    const openProblem = (problemId) => {
        setActiveProblemId(problemId);
        setRunResult(null);
        setSubmissionResult(null);
        setActiveTab('description');
        setView('workspace');
    };

    const changeLanguage = (nextLanguage) => {
        setLanguage(nextLanguage);
        setCode(starterCode[nextLanguage]);
        setRunResult(null);
        setSubmissionResult(null);
    };

    const codeIsReady = code.includes('return') && code.trim().length > 25;

    const runCode = () => {
        setRunResult({ passed: codeIsReady, passedCount: codeIsReady ? 2 : 1, total: 2 });
    };

    const submitCode = () => {
        const accepted = codeIsReady;
        setSubmissionResult({ accepted, passedCount: accepted ? 3 : 2, total: 3 });
        setSubmissions((current) => [
            {
                id: Date.now(),
                status: accepted ? 'Accepted' : 'Wrong answer',
                language: languageLabels[language],
                passed: accepted ? '3 / 3' : '2 / 3',
                runtime: accepted ? '0.04 s' : '0.06 s',
            },
            ...current,
        ]);
        if (accepted) {
            setSolvedIds((current) => (current.includes(activeProblem.id) ? current : [...current, activeProblem.id]));
        }
    };

    const sendMessage = (event) => {
        event.preventDefault();
        const question = chatInput.trim();
        if (!question) return;

        setMessages((current) => [
            ...current,
            { id: Date.now(), author: 'user', text: question },
            {
                id: Date.now() + 1,
                author: 'assistant',
                text: 'A useful next step is to map each value to its index as you scan the array, then look up the complement needed for the target.',
            },
        ]);
        setChatInput('');
    };

    const createProblem = (event) => {
        event.preventDefault();
        const title = newProblemTitle.trim();
        if (!title) return;

        const problemId = `demo-${Date.now()}`;
        setProblems((current) => [
            ...current,
            {
                id: problemId,
                title,
                difficulty: newProblemDifficulty,
                tag: 'array',
                description: 'A locally created demonstration problem. Its state remains in this browser session only.',
                example: 'Input: [1, 2, 3]\nOutput: 6',
            },
        ]);
        setNewProblemTitle('');
        setView('home');
    };

    if (view === 'admin') {
        return (
            <div className="min-h-screen bg-base-200 text-base-content">
                <DemoNavigation onHome={() => setView('home')} onAdmin={() => setView('admin')} />
                <main className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[minmax(0,1fr)_20rem] md:p-8">
                    <section>
                        <div className="mb-6 flex items-center gap-3">
                            <span className="rounded-md bg-primary p-2 text-primary-content"><ShieldCheck size={22} /></span>
                            <div>
                                <p className="text-sm font-medium text-primary">Administrator</p>
                                <h1 className="text-2xl font-bold">Content control room</h1>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-base-300 bg-base-100">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Problem</th>
                                        <th>Difficulty</th>
                                        <th>Topic</th>
                                        <th>Editorial</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {problems.map((problem) => (
                                        <tr key={problem.id}>
                                            <td className="font-medium">{problem.title}</td>
                                            <td><span className={`badge ${difficultyClass(problem.difficulty)}`}>{problem.difficulty}</span></td>
                                            <td>{problem.tag}</td>
                                            <td>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => setEditorialAttached((current) => !current)}
                                                    title="Toggle sample editorial"
                                                >
                                                    <Video size={16} />
                                                    {editorialAttached ? 'Attached' : 'Attach'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <form className="border border-base-300 bg-base-100 p-5" onSubmit={createProblem}>
                        <div className="mb-5 flex items-center gap-2">
                            <Plus size={18} className="text-primary" />
                            <h2 className="font-semibold">Create sample problem</h2>
                        </div>
                        <label className="form-control mb-4">
                            <span className="label-text mb-2">Title</span>
                            <input
                                className="input input-bordered"
                                value={newProblemTitle}
                                onChange={(event) => setNewProblemTitle(event.target.value)}
                                placeholder="e.g. Merge Intervals"
                            />
                        </label>
                        <label className="form-control mb-5">
                            <span className="label-text mb-2">Difficulty</span>
                            <select
                                className="select select-bordered"
                                value={newProblemDifficulty}
                                onChange={(event) => setNewProblemDifficulty(event.target.value)}
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </label>
                        <button className="btn btn-primary w-full" type="submit">
                            <Plus size={17} />
                            Add to demo list
                        </button>
                    </form>
                </main>
            </div>
        );
    }

    if (view === 'workspace') {
        return (
            <div className="min-h-screen bg-base-200 text-base-content">
                <header className="border-b border-base-300 bg-base-100">
                    <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3">
                        <button className="btn btn-ghost btn-square btn-sm" onClick={() => setView('home')} title="Back to problems">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-lg font-bold">{activeProblem.title}</h1>
                                <span className={`badge badge-sm ${difficultyClass(activeProblem.difficulty)}`}>{activeProblem.difficulty}</span>
                                <span className="badge badge-outline badge-sm">{activeProblem.tag}</span>
                            </div>
                        </div>
                        <span className="badge badge-outline gap-1"><Terminal size={14} /> Demo</span>
                    </div>
                </header>

                <main className="mx-auto grid max-w-[1600px] gap-px bg-base-300 lg:min-h-[calc(100vh-65px)] lg:grid-cols-2">
                    <section className="bg-base-100">
                        <div className="tabs tabs-bordered overflow-x-auto px-3">
                            <button className={`tab ${activeTab === 'description' ? 'tab-active' : ''}`} onClick={() => setActiveTab('description')}>
                                Description
                            </button>
                            <button className={`tab ${activeTab === 'solutions' ? 'tab-active' : ''}`} onClick={() => setActiveTab('solutions')}>
                                Solutions
                            </button>
                            <button className={`tab ${activeTab === 'editorial' ? 'tab-active' : ''}`} onClick={() => setActiveTab('editorial')}>
                                Editorial
                            </button>
                            <button className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`} onClick={() => setActiveTab('history')}>
                                History
                            </button>
                            <button className={`tab ${activeTab === 'ai' ? 'tab-active' : ''}`} onClick={() => setActiveTab('ai')}>
                                AI tutor
                            </button>
                        </div>

                        <div className="p-5 md:p-7">
                            {activeTab === 'description' && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="mb-3 text-xl font-semibold">Problem</h2>
                                        <p className="leading-7">{activeProblem.description}</p>
                                    </div>
                                    <div>
                                        <h2 className="mb-3 text-xl font-semibold">Example</h2>
                                        <pre className="overflow-x-auto bg-base-200 p-4 text-sm leading-6">{activeProblem.example}</pre>
                                    </div>
                                    <div className="border-l-4 border-info bg-info/10 p-4 text-sm leading-6">
                                        Try the starter code, then use Run to see example-case feedback before submitting against the full local suite.
                                    </div>
                                </div>
                            )}

                            {activeTab === 'solutions' && (
                                <div>
                                    <div className="mb-5 flex items-center gap-2">
                                        <FileCode2 size={20} className="text-primary" />
                                        <h2 className="text-xl font-semibold">Reference approach</h2>
                                    </div>
                                    <p className="mb-4 leading-7">Store each number and its index in a hash map. For every value, look for the complement that reaches the target.</p>
                                    <pre className="overflow-x-auto bg-base-200 p-4 text-sm leading-6">{starterCode.javascript}</pre>
                                    <p className="mt-4 text-sm text-base-content/70">Time complexity: O(n). Space complexity: O(n).</p>
                                </div>
                            )}

                            {activeTab === 'editorial' && (
                                <div className="space-y-5">
                                    <div className="flex aspect-video items-center justify-center bg-neutral text-neutral-content">
                                        <div className="text-center">
                                            <Video size={36} className="mx-auto mb-3" />
                                            <p className="font-semibold">Editorial walkthrough</p>
                                            <p className="mt-1 text-sm opacity-70">8 min</p>
                                        </div>
                                    </div>
                                    <button className="btn btn-primary" onClick={() => setActiveTab('solutions')}>
                                        <Play size={17} />
                                        View outlined solution
                                    </button>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div>
                                    <div className="mb-5 flex items-center gap-2">
                                        <History size={20} className="text-primary" />
                                        <h2 className="text-xl font-semibold">Submission history</h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="table table-zebra">
                                            <thead><tr><th>Status</th><th>Language</th><th>Tests</th><th>Runtime</th></tr></thead>
                                            <tbody>
                                                {submissions.map((submission) => (
                                                    <tr key={submission.id}>
                                                        <td className={submission.status === 'Accepted' ? 'text-success' : 'text-error'}>{submission.status}</td>
                                                        <td>{submission.language}</td>
                                                        <td>{submission.passed}</td>
                                                        <td>{submission.runtime}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ai' && (
                                <div className="flex min-h-96 flex-col">
                                    <div className="mb-5 flex items-center gap-2">
                                        <Bot size={20} className="text-primary" />
                                        <h2 className="text-xl font-semibold">DSA tutor</h2>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`max-w-[90%] p-3 text-sm leading-6 ${message.author === 'user' ? 'ml-auto bg-primary text-primary-content' : 'bg-base-200'}`}
                                            >
                                                {message.text}
                                            </div>
                                        ))}
                                    </div>
                                    <form className="mt-5 flex gap-2" onSubmit={sendMessage}>
                                        <input
                                            className="input input-bordered min-w-0 flex-1"
                                            value={chatInput}
                                            onChange={(event) => setChatInput(event.target.value)}
                                            placeholder="Ask for a hint"
                                        />
                                        <button className="btn btn-primary btn-square" type="submit" title="Send message">
                                            <Send size={18} />
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="flex min-h-[600px] flex-col bg-base-100">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 p-3">
                            <div className="join">
                                {Object.entries(languageLabels).map(([key, label]) => (
                                    <button
                                        className={`join-item btn btn-sm ${language === key ? 'btn-primary' : 'btn-ghost'}`}
                                        key={key}
                                        onClick={() => changeLanguage(key)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-sm text-base-content/60">Local editor</span>
                        </div>
                        <textarea
                            aria-label="Code editor"
                            className="min-h-80 flex-1 resize-none bg-neutral p-5 font-mono text-sm leading-6 text-neutral-content outline-none"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            spellCheck="false"
                        />
                        <div className="border-t border-base-300 p-4">
                            {runResult && (
                                <div className={`mb-4 border p-3 text-sm ${runResult.passed ? 'border-success bg-success/10' : 'border-error bg-error/10'}`}>
                                    <div className="flex items-center gap-2 font-medium">
                                        <CircleCheck size={17} className={runResult.passed ? 'text-success' : 'text-error'} />
                                        {runResult.passed ? 'Visible tests passed' : 'Visible tests need attention'}
                                    </div>
                                    <p className="mt-1 text-base-content/70">{runResult.passedCount} of {runResult.total} example tests passed.</p>
                                </div>
                            )}
                            {submissionResult && (
                                <div className={`mb-4 border p-3 text-sm ${submissionResult.accepted ? 'border-success bg-success/10' : 'border-error bg-error/10'}`}>
                                    <div className="font-medium">{submissionResult.accepted ? 'Accepted' : 'Wrong answer'}</div>
                                    <p className="mt-1 text-base-content/70">{submissionResult.passedCount} of {submissionResult.total} full-suite tests passed.</p>
                                </div>
                            )}
                            <div className="flex justify-end gap-2">
                                <button className="btn btn-outline" onClick={runCode}>
                                    <Play size={17} />
                                    Run
                                </button>
                                <button className="btn btn-primary" onClick={submitCode}>
                                    <CircleCheck size={17} />
                                    Submit
                                </button>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base-200 text-base-content">
            <DemoNavigation onHome={() => setView('home')} onAdmin={() => setView('admin')} />
            <main className="mx-auto max-w-6xl p-4 md:p-8">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><BookOpen size={16} /> Practice space</p>
                        <h1 className="text-3xl font-bold">Choose your next problem</h1>
                        <p className="mt-2 text-base-content/70">{solvedIds.length} of {problems.length} problems solved in this session.</p>
                    </div>
                    <button className="btn btn-outline" onClick={() => setView('admin')}>
                        <LayoutDashboard size={17} />
                        Admin preview
                    </button>
                </div>

                <section className="mb-6 grid gap-3 border-y border-base-300 py-4 sm:grid-cols-3">
                    <label className="form-control">
                        <span className="label-text mb-2 text-xs font-semibold uppercase">Status</span>
                        <select className="select select-bordered select-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                            <option value="all">All problems</option>
                            <option value="solved">Solved</option>
                        </select>
                    </label>
                    <label className="form-control">
                        <span className="label-text mb-2 text-xs font-semibold uppercase">Difficulty</span>
                        <select className="select select-bordered select-sm" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                            <option value="all">All difficulties</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </label>
                    <label className="form-control">
                        <span className="label-text mb-2 text-xs font-semibold uppercase">Topic</span>
                        <select className="select select-bordered select-sm" value={tag} onChange={(event) => setTag(event.target.value)}>
                            <option value="all">All topics</option>
                            <option value="array">Array</option>
                            <option value="graph">Graph</option>
                            <option value="dp">Dynamic programming</option>
                        </select>
                    </label>
                </section>

                <section className="overflow-hidden border border-base-300 bg-base-100">
                    <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem_7rem_3rem] gap-4 border-b border-base-300 px-5 py-3 text-xs font-semibold uppercase text-base-content/60 md:grid">
                        <span>Problem</span><span>Difficulty</span><span>Topic</span><span>Status</span><span aria-label="Open" />
                    </div>
                    {filteredProblems.map((problem) => (
                        <button
                            className="grid w-full gap-3 border-b border-base-300 px-5 py-4 text-left transition-colors hover:bg-base-200 md:grid-cols-[minmax(0,1fr)_7rem_8rem_7rem_3rem] md:items-center md:gap-4"
                            key={problem.id}
                            onClick={() => openProblem(problem.id)}
                        >
                            <span className="flex items-center gap-3 font-semibold"><Code2 size={18} className="text-primary" />{problem.title}</span>
                            <span><span className={`badge badge-sm ${difficultyClass(problem.difficulty)}`}>{problem.difficulty}</span></span>
                            <span className="text-sm text-base-content/70">{problem.tag}</span>
                            <span className="text-sm">{solvedIds.includes(problem.id) ? <span className="inline-flex items-center gap-1 text-success"><CircleCheck size={15} /> Solved</span> : 'Not started'}</span>
                            <span className="hidden justify-self-end md:block"><ArrowRight size={18} /></span>
                        </button>
                    ))}
                    {filteredProblems.length === 0 && <p className="p-8 text-center text-base-content/60">No problems match these filters.</p>}
                </section>
            </main>
        </div>
    );
}

function DemoNavigation({ onHome, onAdmin }) {
    return (
        <nav className="border-b border-base-300 bg-base-100">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
                <button className="btn btn-ghost gap-2 px-1 text-lg" onClick={onHome}>
                    <Code2 size={21} className="text-primary" />
                    AlgoPractice
                </button>
                <div className="flex items-center gap-2">
                    <span className="badge badge-outline hidden sm:inline-flex">Interactive demo</span>
                    <button className="btn btn-ghost btn-sm" onClick={onAdmin} title="Open administrator preview">
                        <ShieldCheck size={17} />
                        Admin
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default DemoApp;