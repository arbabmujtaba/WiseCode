import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { VOICE_STATUS } from '../../hooks/useVoiceSession';
import Waveform from './Waveform';
import { StatusDot } from './VoicePanel';

// Compact voice control for the workspace top bar. Visible from every tab.
export default function VoiceDock({ voice, onOpen }) {
  const { active, status, micMuted, start, stop, toggleMic, supported } = voice;

  if (!active) {
    return (
      <button
        type="button"
        className="btn btn-sm gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
        onClick={() => {
          onOpen();
          if (supported) start();
        }}
        title="Talk to the AI tutor"
      >
        <Mic size={15} /> <span className="hidden md:inline">Voice tutor</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-base-300 bg-base-200 py-0.5 pr-0.5 pl-3">
      <button type="button" className="flex items-center gap-2" onClick={onOpen} title="Open voice panel">
        <StatusDot status={status} />
        <span className="hidden text-xs font-medium lg:inline" role="status" aria-live="polite">
          {micMuted ? 'Mic muted' : VOICE_STATUS[status]}
        </span>
        <span className="hidden w-16 sm:block">
          <Waveform getAnalysers={voice.analysers} status={micMuted ? 'idle' : status} height={20} bars={12} />
        </span>
      </button>
      <button
        type="button"
        className={`btn btn-circle btn-xs ${micMuted ? 'btn-warning' : 'btn-ghost'}`}
        onClick={toggleMic}
        aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
        aria-pressed={micMuted}
      >
        {micMuted ? <MicOff size={13} /> : <Mic size={13} />}
      </button>
      <button type="button" className="btn btn-circle btn-xs btn-error" onClick={stop} aria-label="End voice conversation">
        <PhoneOff size={13} />
      </button>
    </div>
  );
}
