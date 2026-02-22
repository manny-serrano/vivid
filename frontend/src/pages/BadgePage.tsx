import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { badgeService, SCOPE_LABELS } from '../services/badgeService';
import type { BadgeCreateResult, BadgeItem } from '../services/badgeService';
import { BadgeCheck, Copy, XCircle, Code2, Globe } from 'lucide-react';

const ALL_SCOPES = Object.keys(SCOPE_LABELS);

export function BadgePage() {
  const qc = useQueryClient();
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(['score_tier', 'blockchain_verified']));
  const [label, setLabel] = useState('');
  const [expiryDays, setExpiryDays] = useState('90');
  const [resultModal, setResultModal] = useState<BadgeCreateResult | null>(null);

  const { data: badges, isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: badgeService.listBadges,
  });

  const createMutation = useMutation({
    mutationFn: badgeService.createBadge,
    onSuccess: (data) => {
      setResultModal(data);
      qc.invalidateQueries({ queryKey: ['badges'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: badgeService.revokeBadge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['badges'] }),
  });

  const toggleScope = (scope: string) => {
    const next = new Set(selectedScopes);
    next.has(scope) ? next.delete(scope) : next.add(scope);
    setSelectedScopes(next);
  };

  const handleCreate = () => {
    if (selectedScopes.size === 0) return;
    createMutation.mutate({
      scopes: [...selectedScopes],
      label: label || undefined,
      expiresInDays: Number(expiryDays) || 90,
    });
  };

  const baseUrl = window.location.origin;

  const embedSnippet = (token: string) =>
`<!-- Vivid Verified Badge -->
<a href="${baseUrl}/verify/${token}" target="_blank"
   style="display:inline-flex;align-items:center;gap:6px;
   padding:6px 14px;border-radius:8px;background:#0d1117;
   color:#58a6ff;font-family:system-ui;font-size:14px;
   text-decoration:none;border:1px solid #30363d">
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
  Vivid Verified
</a>`;

  const curlSnippet = (token: string) =>
    `curl ${baseUrl}/api/v1/verify/${token}`;

  return (
    <PageWrapper title="Vivid Verified Badge">
      <p className="text-text-secondary mb-8 max-w-2xl">
        Let third-party apps verify your financial standing with your cryptographic consent.
        Choose what data they can see — they only learn what you permit.
      </p>

      {/* CREATE BADGE */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-primary" />
          Create a consent badge
        </h2>

        <div className="mb-4">
          <label className="text-sm text-text-secondary block mb-2">
            What can the third party see? (select scopes)
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_SCOPES.map((scope) => (
              <button
                key={scope}
                onClick={() => toggleScope(scope)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  selectedScopes.has(scope)
                    ? 'bg-primary/20 border-primary/40 text-text-primary'
                    : 'bg-bg-elevated border-slate-700 text-text-secondary hover:border-slate-500'
                }`}
              >
                {SCOPE_LABELS[scope]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1">Label (optional)</label>
            <input
              type="text"
              placeholder="e.g. Apartment Application"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
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

        <Button onClick={handleCreate} disabled={createMutation.isPending || selectedScopes.size === 0}>
          {createMutation.isPending ? 'Creating...' : 'Generate Badge'}
        </Button>
        {createMutation.isError && (
          <p className="text-danger text-sm mt-2">Failed to create badge.</p>
        )}
      </Card>

      {/* EXISTING BADGES */}
      <h2 className="text-lg font-semibold mb-4">Your Badges</h2>
      {isLoading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : (badges ?? []).length === 0 ? (
        <p className="text-text-secondary text-sm">No badges yet.</p>
      ) : (
        <div className="space-y-3">
          {(badges as BadgeItem[]).map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                      {b.label || 'Vivid Verified Badge'}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Scopes: {b.allowedScopes.map((s) => SCOPE_LABELS[s] ?? s).join(', ')}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Created {new Date(b.createdAt).toLocaleDateString()}
                      {b.expiresAt && ` · Expires ${new Date(b.expiresAt).toLocaleDateString()}`}
                      {' · '}{b.accessCount} check{b.accessCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {b.revokedAt ? (
                      <Badge variant="danger">Revoked</Badge>
                    ) : (
                      <>
                        <Badge variant="success">Active</Badge>
                        <button
                          title="Copy consent token"
                          onClick={() => navigator.clipboard.writeText(b.consentToken)}
                          className="text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          title="Revoke"
                          onClick={() => revokeMutation.mutate(b.id)}
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

      {/* RESULT MODAL */}
      <Modal isOpen={!!resultModal} onClose={() => setResultModal(null)} title="Badge Created">
        {resultModal && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-success font-medium">
              <BadgeCheck className="h-5 w-5" /> Badge ready
            </div>

            <div className="bg-bg-elevated rounded-xl p-3 border border-slate-700">
              <label className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                <Globe className="h-3 w-3" /> API Endpoint
              </label>
              <div className="flex items-center gap-2">
                <code className="text-xs flex-1 break-all">{`GET ${baseUrl}/api/v1/verify/${resultModal.consentToken}`}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(`${baseUrl}/api/v1/verify/${resultModal.consentToken}`)}
                  className="text-text-secondary hover:text-text-primary shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="bg-bg-elevated rounded-xl p-3 border border-slate-700">
              <label className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                <Code2 className="h-3 w-3" /> cURL
              </label>
              <pre className="text-xs whitespace-pre-wrap break-all">{curlSnippet(resultModal.consentToken)}</pre>
            </div>

            <div className="bg-bg-elevated rounded-xl p-3 border border-slate-700">
              <label className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                <Code2 className="h-3 w-3" /> Embed HTML
              </label>
              <pre className="text-xs whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {embedSnippet(resultModal.consentToken)}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(embedSnippet(resultModal.consentToken))}
                className="text-xs text-primary hover:underline mt-1"
              >
                Copy embed code
              </button>
            </div>

            <Button onClick={() => setResultModal(null)} className="w-full">Done</Button>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
