// System instruction and context helpers for the voice tutor.

const clamp = (v, n) => (typeof v === 'string' ? v.slice(0, n) : v == null ? '' : String(v).slice(0, n));

// Normalises the editor/run snapshot the browser sends, so a tool response never
// contains unbounded or unexpected data.
const sanitizeContext = (ctx = {}) => {
  const result = (r) =>
    r && typeof r === 'object'
      ? {
          verdict: clamp(r.verdict, 40),
          passed: Number(r.passed) || 0,
          total: Number(r.total) || 0,
          error: clamp(r.error, 1500),
          runtime: clamp(r.runtime, 20),
          memory: clamp(r.memory, 20),
          cases: (Array.isArray(r.cases) ? r.cases : []).slice(0, 5).map((c) => ({
            input: clamp(c?.input, 400),
            expected: clamp(c?.expected, 400),
            output: clamp(c?.output, 400),
            passed: !!c?.passed,
          })),
        }
      : null;

  return {
    language: clamp(ctx.language, 20) || 'javascript',
    code: clamp(ctx.code, 20000),
    cursorLine: Number(ctx.cursorLine) || null,
    lastRun: result(ctx.lastRun),
    lastSubmit: result(ctx.lastSubmit),
  };
};

const sanitizeHistory = (history) =>
  (Array.isArray(history) ? history : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'model') && typeof m.text === 'string' && m.text.trim())
    .slice(-12)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text.slice(0, 600)}`)
    .join('\n');

const buildVoicePrompt = ({ problem, mode, history }) => {
  const examples = (problem.visibleTestCases || [])
    .slice(0, 3)
    .map((t, i) => `Example ${i + 1}: input ${JSON.stringify(t.input)} -> output ${JSON.stringify(t.output)}${t.explanation ? ` (${t.explanation})` : ''}`)
    .join('\n');

  const teaching =
    mode === 'direct'
      ? `## MODE: DIRECT
Answer questions directly and completely. You may give full solutions when asked.`
      : `## MODE: LEARNING (default)
Guide the student to the solution instead of giving it away:
- Ask one guiding question at a time, give the smallest useful hint, and build up.
- Point at the line or idea that is wrong rather than rewriting their code.
- Only give a complete solution if the student explicitly asks for the full answer; even then, explain the idea first.`;

  return `You are WiseCode Voice, a friendly, encouraging coding partner who talks with a student out loud while they solve a programming problem.

## PROBLEM
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Topic: ${problem.tags}
Statement:
${clamp(problem.description, 6000)}
${examples}

## TOOLS
- Call get_editor_state whenever the student mentions their code, a bug, an error, their output, test results, or asks "what's wrong". It returns their current code, language and latest Run/Submit results. Never guess the code.

## HOW TO SPEAK
- This is a voice conversation: keep replies short (usually 1-3 sentences) and conversational. Stop and let the student respond.
- Never read code aloud character by character. Describe it in words and refer to line numbers or variable names ("on line 7, your loop starts at one").
- Say complexities naturally ("O of n log n").
- If the student interrupts, drop what you were saying and address the new input.
- Reply in the language the student speaks.

## CAPABILITIES
Debugging, explaining code, algorithm hints, edge cases, time and space complexity, comparing approaches.

${teaching}

## LIMITS
Only discuss this problem and related programming concepts. Politely redirect anything unrelated.
${history ? `\n## EARLIER CONVERSATION (from the text chat)\n${history}\n` : ''}`;
};

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_editor_state',
        description:
          "Returns the student's current code, programming language, cursor line, and their most recent Run and Submit results (verdict, passed/total, errors, failing cases).",
      },
    ],
  },
];

module.exports = { buildVoicePrompt, sanitizeContext, sanitizeHistory, TOOLS };
