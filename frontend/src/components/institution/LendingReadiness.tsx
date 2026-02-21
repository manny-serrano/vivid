import { ProgressBar } from '../ui/ProgressBar';

interface LendingReadinessProps {
  readiness?: Record<string, number>;
}

const ITEMS = [
  { key: 'personalLoanReadiness', label: 'Personal loan', emoji: '💳' },
  { key: 'autoLoanReadiness', label: 'Auto loan', emoji: '🚗' },
  { key: 'mortgageReadiness', label: 'Mortgage', emoji: '🏠' },
  { key: 'smallBizReadiness', label: 'Small business', emoji: '📈' },
];

export function LendingReadiness({ readiness = {} }: LendingReadinessProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {ITEMS.map(({ key, label, emoji }) => {
        const score = readiness[key] ?? 0;
        return (
          <div key={key} className="flex items-center gap-4">
            <span className="text-2xl">{emoji}</span>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-text-secondary">{label}</span>
                <span className="text-sm font-semibold">{Math.round(score)}</span>
              </div>
              <ProgressBar value={score} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
