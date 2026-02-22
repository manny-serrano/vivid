import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { viewApplicant } from '../../services/institutionService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ApplicantSummary } from './ApplicantSummary';
import { LendingReadiness } from './LendingReadiness';
import { VerificationPanel } from './VerificationPanel';
import { ComplianceAudit } from './ComplianceAudit';
import { Spinner } from '../ui/Spinner';
import { Search } from 'lucide-react';

export function InstitutionDashboard() {
  const [tokenInput, setTokenInput] = useState('');
  const [activeToken, setActiveToken] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['applicant', activeToken],
    queryFn: () => viewApplicant(activeToken!),
    enabled: !!activeToken,
  });

  const handleSearch = () => {
    if (tokenInput.trim()) setActiveToken(tokenInput.trim());
  };

  const twinData = (data as Record<string, unknown>) ?? {};
  const scores = (twinData.scores as Record<string, number>) ?? {};
  const readiness = (twinData.lendingReadiness as Record<string, number>) ?? {};
  const proof = twinData.blockchainProof as
    | { blockchainVerified?: boolean; profileHash?: string; hederaTransactionId?: string }
    | undefined;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold mb-4">Look up applicant</h2>
        <div className="flex gap-3">
          <input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste share token UUID"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
          />
          <Button onClick={handleSearch} disabled={!tokenInput.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {isLoading && (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      )}

      {error && (
        <Card>
          <p className="text-danger text-sm">Invalid or expired share token.</p>
        </Card>
      )}

      {data && !isLoading && (
        <div className="space-y-6">
          {twinData.overallScore != null && (
            <Card>
              <p className="text-sm uppercase tracking-wide text-slate-400">Applicant overall score</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                {Math.round(Number(twinData.overallScore))}
              </p>
            </Card>
          )}

          {Object.keys(scores).length > 0 && <ApplicantSummary data={twinData} />}
          {Object.keys(readiness).length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Lending readiness</h3>
              <LendingReadiness readiness={readiness} />
            </Card>
          )}
          {proof && (
            <VerificationPanel
              verified={!!proof.blockchainVerified}
              profileHash={proof.profileHash}
              hederaTransactionId={proof.hederaTransactionId}
            />
          )}
          <ComplianceAudit />
        </div>
      )}
    </div>
  );
}
