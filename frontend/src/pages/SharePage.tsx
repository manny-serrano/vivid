import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCreateShare, useShareTokens } from '../hooks/useShare';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TwinShareModal } from '../components/twin/TwinShareModal';
import { Link2, ExternalLink } from 'lucide-react';

export function SharePage() {
  const { data: tokens, isLoading } = useShareTokens();
  const createShare = useCreateShare();
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  const handleCreate = () => {
    createShare.mutate(
      { showOverallScore: true, showDimensionScores: true, showNarrative: true, showLendingReadiness: true, showBlockchainProof: true },
      { onSuccess: (data) => setModalUrl(data.shareUrl) },
    );
  };

  const list = (tokens ?? []) as Array<{
    token: string;
    recipientInstitution?: string;
    recipientName?: string;
    accessCount: number;
    revokedAt?: string | null;
    createdAt: string;
  }>;

  return (
    <PageWrapper title="Share your Twin">
      <p className="text-text-secondary mb-6 max-w-lg">
        Generate permissioned links to share your Financial Twin with lenders.
        You control exactly which dimensions they can see.
      </p>
      <Button onClick={handleCreate} disabled={createShare.isPending} className="flex items-center gap-2">
        <Link2 className="h-4 w-4" />
        {createShare.isPending ? 'Creating...' : 'Create share link'}
      </Button>

      {isLoading ? (
        <p className="text-text-secondary mt-6">Loading...</p>
      ) : list.length > 0 ? (
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">Active links</h3>
          {list.map((t, i) => (
            <motion.div
              key={t.token}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {t.recipientInstitution ?? t.recipientName ?? 'Open link'}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Created {new Date(t.createdAt).toLocaleDateString()} &middot; {t.accessCount} views
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.revokedAt ? (
                    <Badge variant="danger">Revoked</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                  <a
                    href={`/share/${t.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary mt-6 text-sm">No share links yet.</p>
      )}

      <TwinShareModal isOpen={!!modalUrl} onClose={() => setModalUrl(null)} shareUrl={modalUrl ?? undefined} />
    </PageWrapper>
  );
}
