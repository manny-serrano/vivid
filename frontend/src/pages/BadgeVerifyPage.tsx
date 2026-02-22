import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { BadgeCheck, AlertTriangle, XCircle } from 'lucide-react';
import type { BadgeVerifyResult } from '../services/badgeService';
import { SCOPE_LABELS } from '../services/badgeService';

export function BadgeVerifyPage() {
  const { consentToken } = useParams<{ consentToken: string }>();
  const [result, setResult] = useState<BadgeVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!consentToken) return;
    const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1';
    fetch(`${apiBase}/verify/${consentToken}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Badge not found');
        return res.json();
      })
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [consentToken]);

  const dataEntries = result
    ? Object.entries(result).filter(
        ([k]) => !['valid', 'status', 'reason', 'label', 'issuedAt', 'expiresAt'].includes(k),
      )
    : [];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
        <Card>
          <div className="text-center mb-6">
            <BadgeCheck className="h-10 w-10 mx-auto text-primary mb-2" />
            <h1 className="text-xl font-bold">Vivid Verified</h1>
            <p className="text-text-secondary text-sm mt-1">Cryptographic consent verification</p>
          </div>

          {loading ? (
            <p className="text-center text-text-secondary">Verifying badge...</p>
          ) : error ? (
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-warning mb-2" />
              <p className="text-warning font-medium">{error}</p>
            </div>
          ) : result && !result.valid ? (
            <div className="text-center">
              <XCircle className="h-8 w-8 mx-auto text-danger mb-2" />
              <p className="text-danger font-medium">{result.reason}</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl text-center bg-primary/10 border border-primary/30">
                <BadgeCheck className="h-8 w-8 mx-auto text-primary mb-1" />
                <p className="font-bold text-primary text-lg">VIVID VERIFIED</p>
                {result.label && <p className="text-text-secondary text-sm">{result.label}</p>}
              </div>

              {dataEntries.length > 0 && (
                <div className="divide-y divide-slate-700/50 text-sm">
                  {dataEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2">
                      <span className="text-text-secondary">{formatKey(key)}</span>
                      <span className="font-medium text-right max-w-[60%]">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-xs text-text-secondary pt-2 border-t border-slate-700">
                <span>Issued {new Date(result.issuedAt!).toLocaleDateString()}</span>
                {result.expiresAt && <span>Expires {new Date(result.expiresAt).toLocaleDateString()}</span>}
              </div>

              <p className="text-xs text-text-secondary text-center">
                This user has consented to sharing the above information via Vivid.
                Only the data scopes explicitly permitted are visible.
              </p>
            </div>
          ) : null}
        </Card>
      </motion.div>
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
