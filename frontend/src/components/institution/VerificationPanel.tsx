import { Card } from '../ui/Card';
import { ShieldCheck, ShieldX } from 'lucide-react';

interface VerificationPanelProps {
  verified: boolean;
  profileHash?: string;
  hederaTransactionId?: string | null;
}

export function VerificationPanel({ verified, profileHash, hederaTransactionId }: VerificationPanelProps) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        {verified ? (
          <ShieldCheck className="h-6 w-6 text-success" />
        ) : (
          <ShieldX className="h-6 w-6 text-danger" />
        )}
        <h3 className="text-lg font-semibold">Blockchain verification</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Status</span>
          <span className={verified ? 'text-success font-semibold' : 'text-danger font-semibold'}>
            {verified ? 'Verified on Hedera' : 'Not verified'}
          </span>
        </div>
        {profileHash && (
          <div>
            <span className="text-text-secondary block mb-0.5">Profile hash</span>
            <span className="font-mono text-xs text-slate-500 break-all">{profileHash}</span>
          </div>
        )}
        {hederaTransactionId && (
          <div>
            <span className="text-text-secondary block mb-0.5">Transaction ID</span>
            <span className="font-mono text-xs text-slate-500 break-all">{hederaTransactionId}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
