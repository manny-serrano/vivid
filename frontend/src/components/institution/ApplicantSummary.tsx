import { Card } from '../ui/Card';
import { ScoreMeter } from '../ui/ScoreMeter';

interface ApplicantSummaryProps {
  data: Record<string, unknown>;
}

const DIMENSION_KEYS = [
  { key: 'incomeStability', label: 'Income Stability' },
  { key: 'spendingDiscipline', label: 'Spending Discipline' },
  { key: 'debtTrajectory', label: 'Debt Trajectory' },
  { key: 'financialResilience', label: 'Financial Resilience' },
  { key: 'growthMomentum', label: 'Growth Momentum' },
];

export function ApplicantSummary({ data }: ApplicantSummaryProps) {
  const scores = (data.scores as Record<string, number>) ?? {};
  const narrative = (data.institutionNarrative as string) ?? (data.consumerNarrative as string);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-semibold mb-4">Dimension scores</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {DIMENSION_KEYS.map(({ key, label }) => {
            const val = scores[key];
            if (val == null) return null;
            return (
              <div key={key}>
                <p className="text-2xl font-bold">{Math.round(val)}</p>
                <ScoreMeter score={val} label={label} />
              </div>
            );
          })}
        </div>
      </Card>

      {narrative && (
        <Card>
          <h3 className="text-lg font-semibold mb-3">Assessment narrative</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
            {narrative}
          </p>
        </Card>
      )}
    </div>
  );
}
