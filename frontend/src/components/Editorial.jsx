import { Clock, VideoOff } from 'lucide-react';
import { formatDuration } from '../lib/format';
import { EmptyState } from './ui';

const Editorial = ({ secureUrl, thumbnailUrl, duration }) => {
  if (!secureUrl) {
    return (
      <EmptyState icon={VideoOff} title="No video editorial yet">
        Check the Solutions tab or ask the AI tutor for a walkthrough.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-box border border-base-300 bg-black shadow-lg">
        <video
          src={secureUrl}
          poster={thumbnailUrl || undefined}
          controls
          preload="metadata"
          className="aspect-video w-full"
        >
          Your browser does not support embedded video.
        </video>
      </div>
      {duration ? (
        <p className="flex items-center gap-1.5 text-sm text-base-content/60">
          <Clock size={14} aria-hidden="true" /> {formatDuration(duration)} video walkthrough
        </p>
      ) : null}
    </div>
  );
};

export default Editorial;
