import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { partnerService } from '../services/partnerService';
import type {
  PartnerDashboard, RegisterPartnerInput, TierLimits,
} from '../services/partnerService';
import {
  Building2, Key, BarChart3, TrendingUp, Users, Code2, Award,
  Copy, Check, RefreshCw, ChevronRight, Shield, DollarSign,
  Zap, Globe, Lock, Eye, EyeOff, Star, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  FREE: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', badge: 'Free' },
  STARTER: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'Starter' },
  GROWTH: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'Growth' },
  ENTERPRISE: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'Enterprise' },
};

const INDUSTRY_OPTIONS = [
  'Lending / Fintech',
  'Real Estate / Property Management',
  'Gig Economy / Staffing',
  'Insurance',
  'Banking',
  'E-Commerce',
  'SaaS',
  'Other',
];

function RegisterForm({ onRegister }: { onRegister: (data: RegisterPartnerInput) => void }) {
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [industry, setIndustry] = useState(INDUSTRY_OPTIONS[0]);
  const [contactEmail, setContactEmail] = useState('');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Partner Dashboard</h1>
          <p className="text-text-secondary text-sm mt-2">
            Register as a Vivid partner to access APIs, embed widgets, issue attestations, and monetize.
          </p>
        </div>
      </motion.div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Register Your Organization</h2>
        <div className="space-y-3">
          <input
            placeholder="Company Name" value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
          />
          <input
            placeholder="Company Domain (e.g. acme.com)" value={companyDomain}
            onChange={(e) => setCompanyDomain(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
          />
          <select
            value={industry} onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
          >
            {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <input
            placeholder="Contact Email" value={contactEmail} type="email"
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
          />
          <button
            onClick={() => {
              if (companyName && companyDomain && contactEmail) {
                onRegister({ companyName, companyDomain, industry, contactEmail });
              }
            }}
            disabled={!companyName || !companyDomain || !contactEmail}
            className="w-full py-2.5 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-40 font-medium"
          >
            Register & Get API Key
          </button>
        </div>
      </Card>

      {/* Value Prop */}
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { icon: Code2, label: 'Embeddable Widget', desc: 'Drop Vivid verification into any checkout or application flow.' },
          { icon: Award, label: 'Issue Attestations', desc: 'Attest income, rent payments, or employment for your users.' },
          { icon: DollarSign, label: 'Revenue Share', desc: 'Earn per-verification as users share their twin through your platform.' },
        ].map((item) => (
          <Card key={item.label} className="p-4 text-center">
            <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-xs text-text-secondary mt-1">{item.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ApiKeyDisplay({ apiKey, onRegenerate, isPending }: { apiKey: string | null; onRegenerate: () => void; isPending: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" /> API Key
        </h3>
        <button onClick={onRegenerate} disabled={isPending}
          className="text-xs px-2 py-1 text-text-secondary hover:bg-bg-elevated rounded-lg flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} /> Regenerate
        </button>
      </div>
      {apiKey ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-bg-elevated px-3 py-2 rounded-lg font-mono overflow-hidden">
            {visible ? apiKey : '•'.repeat(Math.min(apiKey.length, 40))}
          </code>
          <button onClick={() => setVisible(!visible)} className="p-1.5 hover:bg-bg-elevated rounded">
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={copy} className="p-1.5 hover:bg-bg-elevated rounded">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <p className="text-xs text-text-secondary">API key is hashed for security. Click Regenerate to get a new one.</p>
      )}
    </Card>
  );
}

function Dashboard({ dashboard, onRegenKey, regenPending }: {
  dashboard: PartnerDashboard;
  onRegenKey: () => void;
  regenPending: boolean;
}) {
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const { partner, analytics, apiUsage, widgets, attestations } = dashboard;
  const tierStyle = TIER_COLORS[partner.tier] ?? TIER_COLORS.FREE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{partner.companyName}</h1>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${tierStyle.bg} ${tierStyle.border} ${tierStyle.text} border`}>
                {tierStyle.badge}
              </span>
            </div>
            <p className="text-text-secondary text-sm mt-1 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" /> {partner.companyDomain} · {partner.industry}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Active</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'API Calls', value: analytics.totalApiCalls.toLocaleString(), icon: Zap, color: 'text-primary', sub: `${analytics.growthRate > 0 ? '+' : ''}${analytics.growthRate}% MoM` },
          { label: 'Widgets', value: analytics.totalWidgets, icon: Code2, color: 'text-cyan-400', sub: `${analytics.totalWidgetSessions} sessions` },
          { label: 'Conversion', value: `${analytics.conversionRate}%`, icon: TrendingUp, color: 'text-emerald-400', sub: `${widgets.reduce((s, w) => s + w.totalConversions, 0)} total` },
          { label: 'Attestations', value: analytics.totalAttestations, icon: Award, color: 'text-amber-400', sub: `${attestations.recentCount} this month` },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-3">
            <div className="flex items-start justify-between">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              {kpi.sub && <span className="text-[10px] text-text-secondary">{kpi.sub}</span>}
            </div>
            <p className="text-xl font-bold mt-1">{kpi.value}</p>
            <p className="text-xs text-text-secondary">{kpi.label}</p>
          </Card>
        ))}
      </div>

      {/* API Usage Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> API Usage (30 days)
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={apiUsage}>
              <defs>
                <linearGradient id="apiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={30} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                labelFormatter={(l) => `Date: ${l}`}
              />
              <Area type="monotone" dataKey="calls" stroke="#8b5cf6" fill="url(#apiGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* API Key */}
      <ApiKeyDisplay apiKey={newApiKey} onRegenerate={async () => {
        onRegenKey();
      }} isPending={regenPending} />

      {/* Widgets */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" /> Active Widgets
        </h3>
        {widgets.length === 0 ? (
          <p className="text-xs text-text-secondary text-center py-4">No widgets created yet.</p>
        ) : (
          <div className="space-y-2">
            {widgets.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${w.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  <span className="text-xs font-medium">{w.template}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span><Users className="w-3 h-3 inline mr-0.5" /> {w.totalSessions}</span>
                  <span><TrendingUp className="w-3 h-3 inline mr-0.5" /> {w.totalConversions}</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Attestation Breakdown */}
      {attestations.total > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" /> Attestation Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(attestations.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between bg-bg-elevated rounded-lg px-3 py-2">
                <span className="text-xs">{type.replace(/_/g, ' ')}</span>
                <span className="text-xs font-bold text-primary">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pricing Tiers */}
      <TierCards currentTier={partner.tier} />
    </div>
  );
}

function TierCards({ currentTier }: { currentTier: string }) {
  const { data: tiers } = useQuery({ queryKey: ['partner-tiers'], queryFn: partnerService.getTiers });
  if (!tiers) return null;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-400" /> Plans & Pricing
      </h3>
      <div className="grid md:grid-cols-4 gap-3">
        {Object.entries(tiers).map(([tier, limits]) => {
          const style = TIER_COLORS[tier] ?? TIER_COLORS.FREE;
          const isCurrent = tier === currentTier;
          return (
            <div
              key={tier}
              className={`rounded-xl border p-3 ${isCurrent ? `${style.border} ${style.bg}` : 'border-slate-700/40'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${style.text}`}>{tier}</span>
                {isCurrent && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">Current</span>}
              </div>
              <p className="text-xs text-text-secondary mb-2">
                {(limits as TierLimits).apiCalls === -1 ? 'Unlimited' : `${(limits as TierLimits).apiCalls.toLocaleString()}`} API calls
              </p>
              <ul className="space-y-1">
                {(limits as TierLimits).features.map((f) => (
                  <li key={f} className="text-[10px] text-text-secondary flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && tier !== 'FREE' && (
                <button className="mt-2 w-full py-1.5 text-[10px] border border-slate-700 rounded-lg hover:bg-bg-elevated flex items-center justify-center gap-1">
                  Upgrade <ArrowUpRight className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function PartnerDashboardPage() {
  const qc = useQueryClient();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data: dashboard, isLoading, error } = useQuery<PartnerDashboard>({
    queryKey: ['partner-dashboard'],
    queryFn: partnerService.getDashboard,
    retry: false,
  });

  const registerMut = useMutation({
    mutationFn: (data: RegisterPartnerInput) => partnerService.register(data),
    onSuccess: (result) => {
      setNewApiKey(result.apiKey);
      qc.invalidateQueries({ queryKey: ['partner-dashboard'] });
    },
  });

  const regenMut = useMutation({
    mutationFn: partnerService.regenerateKey,
    onSuccess: (result) => setNewApiKey(result.apiKey),
  });

  const isNotRegistered = error && !isLoading;

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto">
        {isLoading && <Spinner className="mx-auto mt-16" />}

        {isNotRegistered && (
          <>
            <RegisterForm onRegister={(data) => registerMut.mutate(data)} />
            {registerMut.isError && (
              <p className="text-xs text-danger text-center mt-2">Registration failed — please try again.</p>
            )}
          </>
        )}

        {newApiKey && !dashboard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="max-w-lg mx-auto mt-8"
          >
            <Card className="p-6 text-center border-amber-500/30">
              <Key className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <h2 className="font-bold mb-2">Your API Key</h2>
              <p className="text-xs text-text-secondary mb-3">Save this — it won't be shown again.</p>
              <code className="block text-xs bg-bg-elevated px-4 py-3 rounded-xl font-mono break-all">{newApiKey}</code>
            </Card>
          </motion.div>
        )}

        {dashboard && (
          <Dashboard dashboard={dashboard} onRegenKey={() => regenMut.mutate()} regenPending={regenMut.isPending} />
        )}
      </div>
    </PageWrapper>
  );
}
