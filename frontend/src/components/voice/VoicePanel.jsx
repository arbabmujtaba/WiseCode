import { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Bot,
  Eraser,
  GraduationCap,
  Hand,
  Keyboard,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { VOICE_STATUS } from '../../hooks/useVoiceSession';
import Waveform from './Waveform';

const VOICES = [
  { id: 'Puck', label: 'Puck · upbeat' },
  { id: 'Kore', label: 'Kore · firm' },
  { id: 'Charon', label: 'Charon · calm' },
  { id: 'Aoede', label: 'Aoede · bright' },
  { id: 'Fenrir', label: 'Fenrir · energetic' },
  { id: 'Leda', label: 'Leda · soft' },
  { id: 'Orus', label: 'Orus · steady' },
  { id: 'Zephyr', label: 'Zephyr · airy' },
];

const STARTERS = ['Can you give me a hint?', "What's wrong with my code?", 'What is the time complexity of my approach?'];

const ringTone = {
  listening: 'bg-primary/25',
  userSpeaking: 'bg-success/30',
  thinking: 'bg-warning/25',
  speaking: 'bg-secondary/30',
  connecting: 'bg-base-content/10',
  reconnecting: 'bg-warning/20',
};

const dotTone = {
  listening: 'bg-primary',
  userSpeaking: 'bg-success',
  thinking: 'bg-warning',
  speaking: 'bg-secondary',
  connecting: 'bg-base-content/40',
  reconnecting: 'bg-warning',
  error: 'bg-error',
  idle: 'bg-base-content/30',
};

export function StatusDot({ status }) {
  const pulsing = ['listening', 'userSpeaking', 'speaking', 'thinking', 'connecting', 'reconnecting'].includes(status);
  return (
    <span className="relative inline-flex h-2.5 w-2.5" aria-hidden="true">
      {pulsing && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotTone[status]}`} />}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotTone[status] || dotTone.idle}`} />
    </span>
  );
}

// Big round mic control with an animated halo that reflects the session state.
function MicOrb({ voice }) {
  const { status, active, start, stop, micMuted, toggleMic } = voice;
  const busy = status === 'connecting';
  const label = !active ? 'Start voice conversation' : micMuted ? 'Unmute microphone' : 'Mute microphone';
  const onClick = () => (!active ? start() : toggleMic());

  return (
    <div className="relative grid h-28 w-28 place-items-center">
      {active && !micMuted && (
        <>
          <span className={`absolute inset-0 animate-ping rounded-full ${ringTone[status] || ''}`} style={{ animationDuration: '2s' }} />
          <span className={`absolute inset-2 rounded-full ${ringTone[status] || ''}`} />
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label={label}
        aria-pressed={active ? !micMuted : undefined}
        title={label}
        className={`relative grid h-20 w-20 place-items-center rounded-full shadow-lg transition focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-none ${
          !active
            ? 'bg-gradient-to-br from-primary to-secondary text-primary-content hover:scale-105'
            : micMuted
              ? 'bg-base-300 text-base-content/70'
              : status === 'speaking'
                ? 'bg-secondary text-secondary-content'
                : status === 'userSpeaking'
                  ? 'bg-success text-success-content'
                  : 'bg-primary text-primary-content'
        }`}
      >
        {busy ? (
          <span className="loading loading-spinner loading-md" />
        ) : active && micMuted ? (
          <MicOff size={30} />
        ) : active && status === 'speaking' ? (
          <AudioLines size={30} />
        ) : (
          <Mic size={30} />
        )}
      </button>
      {active && (
        <button
          type="button"
          onClick={stop}
          className="btn btn-error btn-circle btn-sm absolute -right-1 -bottom-1 shadow"
          aria-label="End voice conversation"
          title="End conversation"
        >
          <PhoneOff size={14} />
        </button>
      )}
    </div>
  );
}

function Transcript({ turns }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  return (
    <ol className="space-y-3" aria-label="Conversation transcript">
      {turns.map((t) => {
        const mine = t.role === 'user';
        return (
          <li key={t.id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                mine ? 'bg-primary text-primary-content' : 'bg-secondary/20 text-secondary'
              }`}
              aria-hidden="true"
            >
              {mine ? t.typed ? <Keyboard size={13} /> : <User size={14} /> : <Bot size={14} />}
            </span>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                mine ? 'bg-primary text-primary-content' : 'border border-base-300 bg-base-200'
              } ${t.final ? '' : 'opacity-80'}`}
            >
              <span className="sr-only">{mine ? 'You said:' : 'Tutor said:'}</span>
              {t.text || '…'}
              {!t.final && <span className="ml-1 inline-block h-3 w-1.5 animate-pulse rounded-sm bg-current align-middle opacity-60" />}
              {t.interrupted && <span className="ml-1 text-xs italic opacity-60">(interrupted)</span>}
            </div>
          </li>
        );
      })}
      <li ref={endRef} aria-hidden="true" />
    </ol>
  );
}

/**
 * Full voice tutor panel (lives in the workspace's left "Voice" tab).
 * The session itself is owned by ProblemPage so it survives tab switches.
 */
export default function VoicePanel({ voice, onUseTextChat }) {
  const [text, setText] = useState('');
  const {
    supported,
    status,
    active,
    error,
    turns,
    mode,
    setMode,
    voice: voiceName,
    setVoice,
    speakerMuted,
    toggleSpeaker,
    interrupt,
    sendText,
    start,
    clearTurns,
    dismissError,
    micMuted,
  } = voice;

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    if (active && status !== 'connecting' && sendText(t)) setText('');
    else {
      onUseTextChat(t);
      setText('');
    }
  };

  const statusLabel = micMuted && active ? 'Mic muted' : VOICE_STATUS[status];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Hero / controls */}
      <section className="shrink-0 rounded-box border border-base-300 bg-base-200/60 p-4">
        <div className="flex items-center gap-5">
          <MicOrb voice={voice} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2" role="status" aria-live="polite">
              <StatusDot status={status} />
              <span className="font-semibold">{statusLabel}</span>
            </div>
            <p className="mt-0.5 text-xs text-base-content/60">
              {!active
                ? 'Talk to your coding partner hands-free. It sees your code and test results.'
                : status === 'speaking'
                  ? 'Just start talking to interrupt.'
                  : 'Speak naturally — no need to press anything between sentences.'}
            </p>
            <Waveform getAnalysers={voice.analysers} status={micMuted && active ? 'idle' : status} height={44} className="mt-2" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {active ? (
            <>
              <button
                type="button"
                className={`btn btn-sm ${speakerMuted ? 'btn-warning btn-soft' : 'btn-ghost border-base-300'}`}
                onClick={toggleSpeaker}
                aria-pressed={speakerMuted}
              >
                {speakerMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                {speakerMuted ? 'Unmute tutor' : 'Mute tutor'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost border-base-300"
                onClick={interrupt}
                disabled={status !== 'speaking'}
              >
                <Hand size={14} /> Stop talking
              </button>
              <span className="ml-auto badge badge-ghost badge-sm gap-1">
                {mode === 'learning' ? <GraduationCap size={12} /> : <Zap size={12} />}
                {mode === 'learning' ? 'Learning mode' : 'Direct mode'}
              </span>
            </>
          ) : (
            <>
              <div role="radiogroup" aria-label="Teaching style" className="join">
                {[
                  { id: 'learning', label: 'Learning', icon: GraduationCap, title: 'Guides you with hints and questions' },
                  { id: 'direct', label: 'Direct', icon: Zap, title: 'Gives straight answers when asked' },
                ].map(({ id, label, icon: Icon, title }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={mode === id}
                    title={title}
                    className={`btn btn-sm join-item ${mode === id ? 'btn-primary' : 'btn-ghost border-base-300'}`}
                    onClick={() => setMode(id)}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
              <select
                className="select select-sm w-40"
                value={voiceName}
                onChange={(e) => setVoice(e.target.value)}
                aria-label="Tutor voice"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              {supported && (
                <button type="button" className="btn btn-primary btn-sm ml-auto" onClick={start}>
                  <Mic size={14} /> Start talking
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {error && (
        <div role="alert" className="alert alert-error alert-soft mt-3 shrink-0 text-sm">
          <span className="flex-1">{error}</span>
          {supported && (
            <button className="btn btn-xs" onClick={() => { dismissError(); start(); }}>
              Retry
            </button>
          )}
          <button className="btn btn-xs btn-ghost" onClick={() => { dismissError(); onUseTextChat(); }}>
            Use text chat
          </button>
        </div>
      )}

      {/* Transcript */}
      <div className="scroll-thin mt-3 min-h-0 flex-1 overflow-y-auto pr-1" aria-live="polite">
        {turns.length === 0 ? (
          <div className="rounded-box border border-dashed border-base-300 p-5 text-center">
            <Sparkles size={22} className="mx-auto mb-2 text-primary" aria-hidden="true" />
            <p className="text-sm font-medium">Try saying…</p>
            <ul className="mt-2 space-y-1 text-sm text-base-content/60">
              {STARTERS.map((s) => (
                <li key={s}>“{s}”</li>
              ))}
            </ul>
          </div>
        ) : (
          <Transcript turns={turns} />
        )}
      </div>

      {/* Text fallback */}
      <form onSubmit={submit} className="mt-3 flex shrink-0 items-center gap-2 border-t border-base-300 pt-3">
        {turns.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={clearTurns} aria-label="Clear transcript" title="Clear transcript">
            <Eraser size={16} />
          </button>
        )}
        <input
          className="input input-sm flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={active ? 'Type instead of speaking…' : 'Type a question (opens text chat)…'}
          aria-label="Type a message to the tutor"
          maxLength={4000}
        />
        <button type="submit" className="btn btn-primary btn-sm btn-square" disabled={!text.trim()} aria-label="Send">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
