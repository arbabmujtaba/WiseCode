import { useEffect, useRef, useState } from 'react';
import { Bot, Eraser, Send, Sparkles, User } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../utils/axiosClient';
import Markdown from './Markdown';

const SUGGESTIONS = [
  'Give me a hint without spoiling the solution',
  'Review my current code and find bugs',
  'What is the optimal time and space complexity?',
  'Explain a brute-force approach first',
];

const storageKey = (id) => `wisecode:chat:${id}`;

// Problem-aware AI tutor. Sends the conversation, problem id and current editor code.
function ChatAi({ problem, getCode, language }) {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey(problem._id))) || [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(storageKey(problem._id), JSON.stringify(messages.slice(-30)));
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, problem._id]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || sending) return;
    const next = [...messages, { role: 'user', parts: [{ text: question }] }];
    setMessages(next);
    setInput('');
    setError('');
    setSending(true);
    try {
      const { data } = await axiosClient.post('/ai/chat', {
        problemId: problem._id,
        messages: next,
        code: getCode?.(),
        language,
      });
      setMessages((m) => [...m, { role: 'model', parts: [{ text: data.message }] }]);
    } catch (e) {
      setError(getErrorMessage(e, 'The AI tutor could not respond.'));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && (
          <div className="rounded-box border border-dashed border-base-300 p-5 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
              <Sparkles size={22} aria-hidden="true" />
            </div>
            <p className="font-semibold">Ask the AI tutor</p>
            <p className="mb-4 text-sm text-base-content/60">
              It knows this problem and can see the code in your editor.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn btn-xs btn-outline" onClick={() => send(s)} disabled={sending}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const mine = m.role === 'user';
          return (
            <div key={i} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
              <div
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  mine ? 'bg-primary text-primary-content' : 'bg-secondary/20 text-secondary'
                }`}
                aria-hidden="true"
              >
                {mine ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`max-w-[85%] min-w-0 rounded-2xl px-3.5 py-2 ${
                  mine ? 'bg-primary text-primary-content' : 'border border-base-300 bg-base-200'
                }`}
              >
                <span className="sr-only">{mine ? 'You:' : 'Tutor:'}</span>
                {mine ? <p className="text-sm whitespace-pre-wrap">{m.parts[0].text}</p> : <Markdown text={m.parts[0].text} />}
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex items-center gap-2 text-sm text-base-content/60">
            <Bot size={14} /> <span className="loading loading-dots loading-sm" /> Thinking…
          </div>
        )}
        {error && (
          <div role="alert" className="alert alert-error alert-soft text-sm">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex items-end gap-2 border-t border-base-300 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        {messages.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => {
              setMessages([]);
              setError('');
            }}
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            <Eraser size={16} />
          </button>
        )}
        <textarea
          ref={inputRef}
          className="textarea textarea-sm min-h-10 flex-1 resize-none"
          rows={1}
          placeholder="Ask about this problem…  (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message the AI tutor"
          maxLength={4000}
        />
        <button type="submit" className="btn btn-primary btn-sm btn-square" disabled={!input.trim() || sending} aria-label="Send">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export default ChatAi;
