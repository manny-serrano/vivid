import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { VerifyResult } from '../services/zkpService';

export function ZkpVerifyPage() {
  const { proofHash } = useParams<{ proofHash: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proofHash) return;
    const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1';
    fetch(`${apiBase}/zkp/verify/${proofHash}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Proof not found');
        return res.json();
      })
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [proofHash]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
        <Card>
          <div className="text-center mb-6">
            <ShieldCheck className="h-10 w-10 mx-auto text-primary mb-2" />
            <h1 className="text-xl font-bold">Vivid Zero-Knowledge Proof</h1>
            <p className="text-text-secondary text-sm mt-1">
              Permissioned disclosure powered by Hedera
            </p>
          </div>

          {loading ? (
            <p className="text-center text-text-secondary">Verifying proof...</p>
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
              <div className={`p-4 rounded-xl text-center ${result.verified ? 'bg-success/10 border border-success/30' : 'bg-danger/10 border border-danger/30'}`}>
                {result.verified ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-1" />
                    <p className="font-bold text-success text-lg">VERIFIED TRUE</p>
                  </>
                ) : (
                  <>
                    <XCircle className="h-8 w-8 mx-auto text-danger mb-1" />
                    <p className="font-bold text-danger text-lg">VERIFIED FALSE</p>
                  </>
                )}
              </div>

              <div className="text-sm space-y-2">
                <p><strong>Statement:</strong> {result.statement}</p>
                {result.hederaTransactionId && (
                  <div>
                    <p className="text-text-secondary text-xs">Hedera Transaction</p>
                    <code className="text-xs break-all">{result.hederaTransactionId}</code>
                  </div>
                )}
                {result.hederaTopicId && (
                  <div>
                    <p className="text-text-secondary text-xs">Topic ID</p>
                    <code className="text-xs">{result.hederaTopicId}</code>
                  </div>
                )}
                <div className="flex justify-between text-xs text-text-secondary pt-2 border-t border-slate-700">
                  <span>Issued {new Date(result.createdAt!).toLocaleDateString()}</span>
                  {result.expiresAt && <span>Expires {new Date(result.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>

              <p className="text-xs text-text-secondary text-center mt-4">
                This proof was cryptographically generated. The verifier cannot see the user's actual financial data — only whether the claim is true or false.
              </p>
            </div>
          ) : null}
        </Card>
      </motion.div>
    </div>
  );
}
