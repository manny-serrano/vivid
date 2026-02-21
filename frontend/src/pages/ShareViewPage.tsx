import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { accessShare } from '../services/shareService';
import { ApplicantSummary } from '../components/institution/ApplicantSummary';
import { LendingReadiness } from '../components/institution/LendingReadiness';
import { VerificationPanel } from '../components/institution/VerificationPanel';
import { Spinner } from '../components/ui/Spinner';

/** Public share view: view a twin by token (no auth). */
export function ShareViewPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['share', token],
    queryFn: () => accessShare(token!),
    enabled: !!token,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;
  if (error || !data) return <div className="p-8 text-center text-danger">Invalid or expired link.</div>;

  const d = data as Record<string, unknown>;
  const readiness = (d.lendingReadiness as Record<string, number>) ?? {};
  const proof = d.blockchainProof as { verified?: boolean; profileHash?: string; hederaTransactionId?: string } | undefined;

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Shared Financial Twin</h1>
      {d.overallScore != null && (
        <p className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Overall: {Math.round(Number(d.overallScore))}
        </p>
      )}
      <ApplicantSummary data={d} />
      {Object.keys(readiness).length > 0 && <LendingReadiness readiness={readiness} />}
      {proof && (
        <VerificationPanel
          verified={!!proof.verified}
          profileHash={proof.profileHash}
          hederaTransactionId={proof.hederaTransactionId}
        />
      )}
    </div>
  );
}
