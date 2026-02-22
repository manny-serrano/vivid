import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateShare, useShareTokens, useRevokeShare } from '../hooks/useShare';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TwinShareModal } from '../components/twin/TwinShareModal';
import { Link2, ExternalLink, Copy, Check, XCircle } from 'lucide-react';

const PERMISSION_FLAGS = [
  { key: 'showOverallScore', label: 'Overall Score' },
  { key: 'showDimensionScores', label: 'Dimension Scores' },
  { key: 'showNarrative', label: 'AI Narrative' },
  { key: 'showLendingReadiness', label: 'Lending Readiness' },
  { key: 'showBlockchainProof', label: 'Blockchain Proof' },
  { key: 'showTimeline', label: 'Timeline' },
  { key: 'showTransactions', label: 'Transactions' },
] as const;

type PermKey = (typeof PERMISSION_FLAGS)[number]['key'];

export function SharePage() {
  const { data: tokens, isLoading } = useShareTokens();
  const createShare = useCreateShare();
  const revokeShare = useRevokeShare();
  const queryClient = useQueryClient();
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [permissions, setPermissions] = useState<Record<PermKey, boolean>>({
    showOverallScore: true,
    showDimensionScores: true,
    showNarrative: true,
    showLendingReadiness: true,
    showBlockchainProof: true,
    showTimeline: false,
    showTransactions: false,
  });

  const togglePerm = (key: PermKey) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreate = () => {
    const hasAtLeastOne = Object.values(permissions).some(Boolean);
    if (!hasAtLeastOne) {
      setError('Select at least one permission.');
      return;
    }
    setError(null);
    createShare.mutate(permissions, {
      onSuccess: (data) => {
        setModalUrl(data.shareUrl);
        queryClient.invalidateQueries({ queryKey: ['shareTokens'] });
      },
      onError: () => {
        setError('Failed to create share link. Make sure your Financial Twin has been generated first.');
      },
    });
  };

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRevoke = (tokenId: string) => {
    revokeShare.mutate(tokenId, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shareTokens'] }),
    });
  };

  const list = (tokens ?? []) as Array<{
    id: string;
    token: string;
    recipientInstitution?: string;
    recipientName?: string;
    accessCount: number;
    revokedAt?: string | null;
    expiresAt?: string | null;
    createdAt: string;
  }>;

  return (
    <PageWrapper title="Share your Twin">
      <p className="text-text-secondary mb-8 max-w-2xl">
        Generate permissioned links to share your Financial Twin with lenders.
        You control exactly which dimensions they can see.
      </p>

      {/* CREATE SECTION */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Create a share link
        </h2>

        <div className="mb-4">
          <label className="text-sm text-text-secondary block mb-2">
            What can the recipient see? (select permissions)
          </label>
          <div className="flex flex-wrap gap-2">
            {PERMISSION_FLAGS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => togglePerm(key)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  permissions[key]
                    ? 'bg-primary/20 border-primary/40 text-text-primary'
                    : 'bg-bg-elevated border-slate-700 text-text-secondary hover:border-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleCreate} disabled={createShare.isPending} className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          {createShare.isPending ? 'Creating...' : 'Create share link'}
        </Button>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      {/* EXISTING LINKS */}
      <h2 className="text-lg font-semibold mb-4">Your Share Links</h2>
      {isLoading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-text-secondary text-sm">No share links yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((t, i) => (
            <motion.div
              key={t.token}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {t.recipientInstitution ?? t.recipientName ?? 'Open link'}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Created {new Date(t.createdAt).toLocaleDateString()}
                      {t.expiresAt && ` · Expires ${new Date(t.expiresAt).toLocaleDateString()}`}
                      {' · '}{t.accessCount} view{t.accessCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs font-mono text-slate-500 mt-1 truncate">
                      {t.token}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.revokedAt ? (
                      <Badge variant="danger">Revoked</Badge>
                    ) : (
                      <>
                        <Badge variant="success">Active</Badge>
                        <button
                          title="Copy share URL"
                          onClick={() => handleCopy(t.token)}
                          className="text-text-secondary hover:text-text-primary transition-colors"
                        >
                          {copiedToken === t.token ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={`/share/${t.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-text-secondary hover:text-text-primary transition-colors"
                          title="Open share view"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          title="Revoke"
                          onClick={() => handleRevoke(t.id)}
                          className="text-text-secondary hover:text-danger transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <TwinShareModal isOpen={!!modalUrl} onClose={() => setModalUrl(null)} shareUrl={modalUrl ?? undefined} />
    </PageWrapper>
  );
}
