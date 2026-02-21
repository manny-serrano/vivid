import { ProgressBar } from './ProgressBar';
import { scoreLabel } from '../../utils/scoreHelpers';

interface ScoreMeterProps {
  score: number;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function ScoreMeter({ score, label, showLabel = true, className = '' }: ScoreMeterProps) {
  return (
    <div className={className}>
      {label && <p className="text-sm font-medium uppercase tracking-wide text-slate-400 mb-1">{label}</p>}
      <ProgressBar value={score} />
      {showLabel && (
        <p className="text-sm text-text-secondary mt-1">{scoreLabel(score)}</p>
      )}
    </div>
  );
}
