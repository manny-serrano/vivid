import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { zkpService } from '../services/zkpService';
import type { ZkpClaim, ClaimListItem } from '../services/zkpService';
import { ShieldCheck, Copy, ExternalLink, XCircle, CheckCircle2, Eye } from 'lucide-react';

const CLAIM_PRESETS = [
  { type: 'monthly_income_above', label: 'Monthly income exceeds', prefix: '$', placeholder: '5000' },
  { type: 'overall_above', label: 'Vivid Score exceeds', prefix: '', placeholder: '70' },
  { type: 'spending_discipline_above', label: 'Spending Discipline exceeds', prefix: '', placeholder: '65' },
  { type: 'resilience_above', label: 'Financial Resilience exceeds', prefix: '', placeholder: '60' },
  { type: 'growth_above', label: 'Growth Momentum exceeds', prefix: '', placeholder: '55' },
  { type: 'debt_below', label: 'Debt Trajectory above', prefix: '', placeholder: '50' },
];

export function ZkpPage() {
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState(CLAIM_PRESETS[0].type);
  const [threshold, setThreshold] = useState('');
  const [recipient, setRecipient] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  const [proofModal, setProofModal] = useState<ZkpClaim | null>(null);
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<Record<string, unknown> | null>(null);

  const { data: claims, isLoading } = useQuery({
    queryKey: ['zkp-claims'],
    queryFn: zkpService.listClaims,
  });

  const createMutation = useMutation({
    mutationFn: zkpService.createClaim,
    onSuccess: (data) => {
      setProofModal(data);
      qc.invalidateQueries({ queryKey: ['zkp-claims'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: zkpService.revokeClaim,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zkp-claims'] }),
  });

  const verifyMutation = useMutation({
    mutationFn: zkpService.verifyClaim,
    onSuccess: (data) => setVerifyResult(data as unknown as Record<string, unknown>),
  });

  const preset = CLAIM_PRESETS.find((p) => p.type === selectedType) ?? CLAIM_PRESETS[0];

  const handleCreate = () => {
    const t = Number(threshold);
    if (!t || t <= 0) return;
    createMutation.mutate({
      claimType: selectedType,
      threshold: t,
      recipientLabel: recipient || undefined,
      expiresInDays: Number(expiryDays) || 30,
    });
  };

  const baseUrl = window.location.origin;

  return (
    <PageWrapper title="Zero-Knowledge Proofs">
      <p className="text-text-secondary mb-8 max-w-2xl">
        Prove financial facts without revealing your exact numbers. Generate a
        cryptographic proof stamped on Hedera that a verifier can check — they only
        learn whether your claim is <strong>true or false</strong>, never the underlying data.
      </p>

      {/* CREATE CLAIM */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Create a new proof
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1">What do you want to prove?</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {CLAIM_PRESETS.map((p) => (
                <option key={p.type} value={p.type}>{p.label} ___</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">Threshold</label>
            <div className="flex items-center gap-1">
              {preset.prefix && <span className="text-text-secondary">{preset.prefix}</span>}
              <input
                type="number"
                placeholder={preset.placeholder}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">Recipient (optional)</label>
            <input
              type="text"
              placeholder="e.g. Acme Landlord"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">Expires in (days)</label>
            <input
              type="number"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <Button onClick={handleCreate} disabled={createMutation.isPending} className="mt-4">
          {createMutation.isPending ? 'Generating proof...' : 'Generate Proof'}
        </Button>
        {createMutation.isError && (
          <p className="text-danger text-sm mt-2">Failed to create proof. Make sure your Financial Twin exists.</p>
        )}
      </Card>

      {/* VERIFY SECTION */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Verify a proof
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste proof hash..."
            value={verifyHash}
            onChange={(e) => setVerifyHash(e.target.value)}
            className="flex-1 bg-bg-elevated border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button
            onClick={() => verifyMutation.mutate(verifyHash)}
            disabled={!verifyHash || verifyMutation.isPending}
          >
            Verify
          </Button>
        </div>
        <AnimatePresence>
          {verifyResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-xl bg-bg-elevated border border-slate-700 text-sm space-y-1 overflow-hidden"
            >
              {verifyResult.valid ? (
                <>
                  <p className="flex items-center gap-2 text-success font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Proof Valid
                  </p>
                  <p><strong>Statement:</strong> {String(verifyResult.statement)}</p>
                  <p><strong>Result:</strong> {verifyResult.verified ? 'TRUE' : 'FALSE'}</p>
                  {verifyResult.hederaTransactionId && (
                    <p><strong>Hedera TX:</strong> <code className="text-xs">{String(verifyResult.hederaTransactionId)}</code></p>
                  )}
                  <p className="text-text-secondary text-xs">
                    Created {new Date(String(verifyResult.createdAt)).toLocaleString()}
                    {verifyResult.expiresAt && ` · Expires ${new Date(String(verifyResult.expiresAt)).toLocaleString()}`}
                  </p>
                </>
              ) : (
                <p className="flex items-center gap-2 text-danger font-medium">
                  <XCircle className="h-4 w-4" /> {String(verifyResult.reason)}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* EXISTING CLAIMS */}
      <h2 className="text-lg font-semibold mb-4">Your Proofs</h2>
      {isLoading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : (claims ?? []).length === 0 ? (
        <p className="text-text-secondary text-sm">No proofs yet. Create one above.</p>
      ) : (
        <div className="space-y-3">
          {(claims as ClaimListItem[]).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium flex items-center gap-2">
                    {c.claimResult ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger shrink-0" />
                    )}
                    {c.claimStatement}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {c.recipientLabel && `For: ${c.recipientLabel} · `}
                    Created {new Date(c.createdAt).toLocaleDateString()}
                    {c.expiresAt && ` · Expires ${new Date(c.expiresAt).toLocaleDateString()}`}
                    {' · '}{c.accessCount} verification{c.accessCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5 font-mono truncate">{c.proofHash}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.revokedAt ? (
                    <Badge variant="danger">Revoked</Badge>
                  ) : (
                    <>
                      <Badge variant="success">Active</Badge>
                      <button
                        title="Copy verification link"
                        onClick={() => navigator.clipboard.writeText(`${baseUrl}/zkp/verify/${c.proofHash}`)}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        title="Revoke"
                        onClick={() => revokeMutation.mutate(c.id)}
                        className="text-text-secondary hover:text-danger transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* PROOF RESULT MODAL */}
      <Modal isOpen={!!proofModal} onClose={() => setProofModal(null)} title="Proof Generated">
        {proofModal && (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              {proofModal.verified ? (
                <><CheckCircle2 className="h-5 w-5 text-success" /> <strong className="text-success">TRUE</strong></>
              ) : (
                <><XCircle className="h-5 w-5 text-danger" /> <strong className="text-danger">FALSE</strong></>
              )}
            </p>
            <p><strong>Claim:</strong> {proofModal.statement}</p>

            <div className="bg-bg-elevated rounded-xl p-3 border border-slate-700">
              <label className="text-xs text-text-secondary block mb-1">Verification Link</label>
              <div className="flex items-center gap-2">
                <code className="text-xs flex-1 truncate">{baseUrl}/zkp/verify/{proofModal.proofHash}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(`${baseUrl}/zkp/verify/${proofModal.proofHash}`)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="bg-bg-elevated rounded-xl p-3 border border-slate-700">
              <label className="text-xs text-text-secondary block mb-1">API Endpoint</label>
              <code className="text-xs break-all">{`GET ${baseUrl}/api/v1/zkp/verify/${proofModal.proofHash}`}</code>
            </div>

            {proofModal.hederaTransactionId && (
              <p className="text-xs text-text-secondary">
                Hedera TX: <code>{proofModal.hederaTransactionId}</code>
              </p>
            )}

            <Button onClick={() => setProofModal(null)} className="w-full mt-2">Done</Button>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
