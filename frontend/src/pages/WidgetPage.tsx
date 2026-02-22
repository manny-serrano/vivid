import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { widgetService } from '../services/widgetService';
import type {
  WidgetConfig,
  WidgetCreateResult,
  WidgetAnalytics,
  WidgetTemplate,
} from '../services/widgetService';
import {
  Code2, Plus, Copy, CheckCircle2, ExternalLink,
  BarChart3, Eye, Globe, Palette, Shield,
  CreditCard, Home, Briefcase, ShoppingCart, Box,
  ChevronDown, Key, Link2, Activity,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEMPLATE_META: Record<WidgetTemplate, { label: string; icon: typeof CreditCard; desc: string }> = {
  LENDING: { label: 'Lending', icon: CreditCard, desc: 'Loan origination flows — shows scores, lending readiness, blockchain proof' },
  RENTAL: { label: 'Rental', icon: Home, desc: 'Rental applications — shows overall score, dimensions, narrative' },
  GIG_HIRING: { label: 'Gig Hiring', icon: Briefcase, desc: 'Gig platform onboarding — shows score tier and reputation' },
  CHECKOUT: { label: 'Checkout', icon: ShoppingCart, desc: 'Checkout discounts — shows overall score and tier' },
  GENERIC: { label: 'Generic', icon: Box, desc: 'Custom integration — choose your own scopes' },
};

const SCOPE_LABELS: Record<string, string> = {
  overall_score: 'Overall Score',
  score_tier: 'Score Tier',
  dimension_scores: 'Dimension Scores',
  lending_readiness: 'Lending Readiness',
  narrative: 'Narrative Summary',
  blockchain_proof: 'Blockchain Proof',
  reputation_score: 'Reputation Score',
};

// ---------------------------------------------------------------------------
// Create Widget Modal
// ---------------------------------------------------------------------------

function CreateWidgetModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Parameters<typeof widgetService.create>[0]) => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [template, setTemplate] = useState<WidgetTemplate>('LENDING');
  const [origins, setOrigins] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [callback, setCallback] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-surface border border-slate-700/60 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto space-y-5"
      >
        <h3 className="text-lg font-bold">Create Embedded Widget</h3>

        {/* Template picker */}
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-2">Template</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.entries(TEMPLATE_META) as [WidgetTemplate, typeof TEMPLATE_META.LENDING][]).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setTemplate(key)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  template === key
                    ? 'border-primary bg-primary/10 text-text-primary'
                    : 'border-slate-700/50 bg-bg-elevated/30 text-text-secondary hover:border-slate-600'
                }`}
              >
                <meta.icon className="h-4 w-4 mb-1" />
                <p className="text-xs font-semibold">{meta.label}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-1.5">{TEMPLATE_META[template].desc}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Partner Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Lending"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Partner Domain</label>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. acmelending.com"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Allowed Origins (comma-separated)</label>
          <input
            value={origins}
            onChange={(e) => setOrigins(e.target.value)}
            placeholder="e.g. https://acmelending.com, https://app.acmelending.com"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-10 rounded-lg border border-slate-700 cursor-pointer"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-text-primary font-mono focus:border-primary outline-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Callback URL (optional)</label>
            <input
              value={callback}
              onChange={(e) => setCallback(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-slate-500 focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl text-text-secondary hover:text-text-primary hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              if (name && domain && origins) {
                onCreate({
                  partnerName: name,
                  partnerDomain: domain,
                  template,
                  allowedOrigins: origins.split(',').map((o) => o.trim()).filter(Boolean),
                  brandColor: color,
                  callbackUrl: callback || undefined,
                  scopes: [],
                });
              }
            }}
            disabled={!name || !domain || !origins}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white disabled:opacity-30 hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create Widget
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API Key + Embed Code Modal (shown after creation)
// ---------------------------------------------------------------------------

function CreatedModal({ result, onClose }: { result: WidgetCreateResult; onClose: () => void }) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-surface border border-slate-700/60 rounded-2xl p-6 w-full max-w-lg mx-4 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-success/15 text-success flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Widget Created!</h3>
            <p className="text-xs text-text-secondary">{result.partnerName} · {result.template}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-warning/5 border border-warning/30">
          <p className="text-xs font-bold text-warning mb-2 flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5" /> API Key — save this now, it won't be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-slate-900 text-slate-300 px-3 py-2 rounded-lg font-mono flex-1 truncate">
              {result.apiKey}
            </code>
            <button
              onClick={() => copyText(result.apiKey, setCopiedKey)}
              className="shrink-0 p-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              {copiedKey ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-slate-400" />}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-text-secondary mb-2 flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5" /> Embed Code
          </p>
          <div className="relative">
            <pre className="text-[11px] bg-slate-900 text-slate-300 p-4 rounded-xl font-mono overflow-x-auto whitespace-pre-wrap">
              {result.embedCode}
            </pre>
            <button
              onClick={() => copyText(result.embedCode, setCopiedEmbed)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              {copiedEmbed ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
        >
          Done
        </button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget Card
// ---------------------------------------------------------------------------

function WidgetCard({ widget, index }: { widget: WidgetConfig; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const meta = TEMPLATE_META[widget.template] ?? TEMPLATE_META.GENERIC;
  const Icon = meta.icon;

  const { data: analytics } = useQuery({
    queryKey: ['widget-analytics', widget.id],
    queryFn: () => widgetService.getAnalytics(widget.id),
    enabled: expanded,
  });

  const embedSnippet = `<div id="vivid-widget"></div>\n<script src="${widget.partnerDomain.includes('localhost') ? 'http://localhost:5173' : 'https://app.vivid.finance'}/widget/sdk.js" data-widget-id="${widget.id}" async></script>`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="rounded-2xl border border-slate-700/50 bg-bg-surface overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${widget.brandColor}20`, color: widget.brandColor }}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary truncate">{widget.partnerName}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                widget.active ? 'bg-success/10 text-success' : 'bg-slate-700 text-slate-400'
              }`}>
                {widget.active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-xs text-text-secondary">{meta.label} · {widget.partnerDomain}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{widget.totalSessions}</p>
              <p className="text-[10px] text-text-secondary">sessions</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-success">{widget.totalConversions}</p>
              <p className="text-[10px] text-text-secondary">conversions</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-slate-700/30 pt-4 space-y-4">
                {/* Scopes */}
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-2">Data Scopes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {widget.scopes.map((s) => (
                      <span key={s} className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium">
                        {SCOPE_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Origins */}
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-2">Allowed Origins</p>
                  <div className="flex flex-wrap gap-1.5">
                    {widget.allowedOrigins.map((o) => (
                      <span key={o} className="text-[10px] px-2 py-1 rounded-lg bg-bg-elevated text-text-secondary font-mono">
                        {o}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Analytics */}
                {analytics && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Sessions', value: analytics.totalSessions, color: 'text-text-primary' },
                      { label: 'Completed', value: analytics.completed, color: 'text-success' },
                      { label: 'Denied', value: analytics.denied, color: 'text-danger' },
                      { label: 'Conversion', value: `${analytics.conversionRate}%`, color: 'text-primary' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center p-2 rounded-xl bg-bg-elevated/50">
                        <p className={`text-lg font-bold ${color}`}>{value}</p>
                        <p className="text-[10px] text-text-secondary">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Embed code */}
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5" /> Embed Code
                  </p>
                  <div className="relative">
                    <pre className="text-[10px] bg-slate-900 text-slate-400 p-3 rounded-xl font-mono overflow-x-auto whitespace-pre-wrap">
                      {embedSnippet}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(embedSnippet);
                        setCopiedEmbed(true);
                        setTimeout(() => setCopiedEmbed(false), 2000);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      {copiedEmbed ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-slate-400" />}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-text-secondary">
                  Created {new Date(widget.createdAt).toLocaleDateString()} · Widget ID: <code className="font-mono text-slate-400">{widget.id}</code>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function WidgetPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [created, setCreated] = useState<WidgetCreateResult | null>(null);
  const queryClient = useQueryClient();

  const { data: widgets, isLoading } = useQuery({
    queryKey: ['my-widgets'],
    queryFn: widgetService.listMine,
  });

  const createMutation = useMutation({
    mutationFn: widgetService.create,
    onSuccess: (result) => {
      setShowCreate(false);
      setCreated(result);
      queryClient.invalidateQueries({ queryKey: ['my-widgets'] });
    },
  });

  if (isLoading) {
    return (
      <PageWrapper title="Embedded Widget">
        <div className="flex justify-center py-20"><Spinner /></div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Embedded Widget">
      {/* Hero */}
      <Card className="p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Code2 className="h-6 w-6 text-primary" /> Vivid Widget SDK
            </h2>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              Drop a tiny widget into any checkout, rental listing, or loan origination flow.
              Users verify with Vivid in-flow — no redirects, no friction. Partners get instant
              trust signals. You control what data is shared.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Plus className="h-4 w-4" /> Create Widget
          </button>
        </div>
      </Card>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { step: '1', icon: Code2, title: 'Embed', desc: 'Partner drops a one-line script tag into their site.' },
          { step: '2', icon: Eye, title: 'User Sees Widget', desc: 'A Vivid button appears in the partner\'s flow — "Verify with Vivid".' },
          { step: '3', icon: Shield, title: 'Consent', desc: 'User logs in via iframe, reviews scopes, and consents to share.' },
          { step: '4', icon: Link2, title: 'Token Exchange', desc: 'Partner server exchanges the session token for verified data.' },
        ].map(({ step, icon: Icon, title, desc }) => (
          <Card key={step} className="p-4 text-center">
            <div className="h-9 w-9 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center mx-auto mb-2">
              {step}
            </div>
            <Icon className="h-5 w-5 mx-auto mb-2 text-text-secondary" />
            <p className="text-sm font-semibold mb-1">{title}</p>
            <p className="text-xs text-text-secondary">{desc}</p>
          </Card>
        ))}
      </div>

      {/* Template gallery */}
      <Card className="p-6 mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4">Prebuilt Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(Object.entries(TEMPLATE_META) as [WidgetTemplate, typeof TEMPLATE_META.LENDING][]).map(([key, meta]) => (
            <div key={key} className="p-4 rounded-xl border border-slate-700/40 bg-bg-elevated/30 hover:border-primary/30 transition-colors">
              <meta.icon className="h-6 w-6 text-primary mb-2" />
              <p className="text-sm font-semibold mb-1">{meta.label}</p>
              <p className="text-xs text-text-secondary">{meta.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Widget list */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          My Widgets ({widgets?.length ?? 0})
        </h2>
      </div>

      {widgets && widgets.length > 0 ? (
        <div className="space-y-3">
          {widgets.map((w, i) => (
            <WidgetCard key={w.id} widget={w} index={i} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Globe className="h-12 w-12 mx-auto mb-4 text-text-secondary opacity-40" />
          <p className="text-lg font-semibold mb-2">No widgets yet</p>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            Create your first embedded widget to let partners verify users with Vivid in their own flows.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Plus className="h-4 w-4" /> Create Your First Widget
          </button>
        </Card>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateWidgetModal
            onClose={() => setShowCreate(false)}
            onCreate={(data) => createMutation.mutate(data)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {created && (
          <CreatedModal result={created} onClose={() => setCreated(null)} />
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
