import { ShieldCheck, Clock } from 'lucide-react';

interface TwinVerificationBadgeProps {
  verified: boolean;
  hederaTransactionId?: string | null;
}

export function TwinVerificationBadge({ verified, hederaTransactionId }: TwinVerificationBadgeProps) {
  if (!verified) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-1.5 text-sm text-warning">
        <Clock className="h-4 w-4" />
        Verification pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 px-3 py-1.5 text-sm text-success">
      <ShieldCheck className="h-4 w-4" />
      Hedera verified
      {hederaTransactionId && (
        <span className="text-slate-400 font-mono text-xs truncate max-w-[140px]">
          {hederaTransactionId}
        </span>
      )}
    </span>
  );
}
