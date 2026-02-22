import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { attestationService } from '../services/attestationService';
import type {
  Attestation,
  ReputationScore,
  ReputationGraph,
  GraphNode,
  GraphEdge,
  AttestationType,
  ReputationBreakdown,
} from '../services/attestationService';
import {
  Network, ShieldCheck, BadgeCheck, Building2, ChevronDown,
  ExternalLink, Clock, Plus, Send, Copy, CheckCircle2,
  Star, Users, Link2, Award, Briefcase, Home,
  Truck, Zap, Globe, Hash,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  VERIFIED_INCOME: 'Verified Income',
  ON_TIME_RENT: 'On-Time Rent',
  EMPLOYMENT_VERIFIED: 'Employment Verified',
  GIG_EARNINGS: 'Gig Earnings',
  LOAN_REPAYMENT: 'Loan Repayment',
  UTILITY_PAYMENT: 'Utility Payment',
  IDENTITY_VERIFIED: 'Identity Verified',
  REFERENCE: 'Reference',
  CUSTOM: 'Custom',
};

const TYPE_ICONS: Record<string, typeof Briefcase> = {
  VERIFIED_INCOME: Award,
  ON_TIME_RENT: Home,
  EMPLOYMENT_VERIFIED: Briefcase,
  GIG_EARNINGS: Truck,
  LOAN_REPAYMENT: CheckCircle2,
  UTILITY_PAYMENT: Zap,
  IDENTITY_VERIFIED: ShieldCheck,
  REFERENCE: Users,
  CUSTOM: Star,
};

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  EMPLOYER: 'Employer',
  LANDLORD: 'Landlord',
  LENDER: 'Lender',
  GIG_PLATFORM: 'Gig Platform',
  PAYROLL_PROVIDER: 'Payroll Provider',
  UTILITY: 'Utility',
  GOVERNMENT: 'Government',
  OTHER: 'Other',
};

// ---------------------------------------------------------------------------
// Reputation Score Ring
// ---------------------------------------------------------------------------

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : score > 0 ? '#ef4444' : '#475569';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-text-secondary">/ 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Network Graph Visualization (SVG-based)
// ---------------------------------------------------------------------------

function NetworkGraph({ graph }: { graph: ReputationGraph }) {
  if (graph.nodes.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <Network className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">No attestations yet. Your reputation graph will appear here.</p>
      </div>
    );
  }

  const width = 600;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;

  const userNode = graph.nodes.find((n) => n.type === 'user');
  const providerNodes = graph.nodes.filter((n) => n.type === 'provider');

  const nodePositions = new Map<string, { x: number; y: number }>();
  if (userNode) {
    nodePositions.set(userNode.id, { x: centerX, y: centerY });
  }

  const angleStep = (2 * Math.PI) / Math.max(providerNodes.length, 1);
  const orbitRadius = Math.min(width, height) * 0.35;
  providerNodes.forEach((node, i) => {
    const angle = angleStep * i - Math.PI / 2;
    nodePositions.set(node.id, {
      x: centerX + orbitRadius * Math.cos(angle),
      y: centerY + orbitRadius * Math.sin(angle),
    });
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[400px]">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {graph.edges.map((edge, i) => {
        const from = nodePositions.get(edge.source);
        const to = nodePositions.get(edge.target);
        if (!from || !to) return null;
        const opacity = 0.3 + (edge.strength / 100) * 0.5;
        const strokeWidth = 1 + (edge.strength / 100) * 2;
        return (
          <motion.line
            key={i}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={edge.hederaVerified ? '#8b5cf6' : '#64748b'}
            strokeWidth={strokeWidth}
            opacity={opacity}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
          />
        );
      })}

      {graph.nodes.map((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return null;
        const isUser = node.type === 'user';
        const r = isUser ? 28 : 20;
        const fill = isUser ? '#8b5cf6' : node.verified ? '#22c55e' : '#475569';

        return (
          <g key={node.id}>
            <motion.circle
              cx={pos.x} cy={pos.y} r={r}
              fill={fill}
              filter="url(#glow)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
            />
            {node.verified && !isUser && (
              <circle cx={pos.x + r * 0.7} cy={pos.y - r * 0.7} r={6} fill="#22c55e" stroke="#0f172a" strokeWidth={2} />
            )}
            <text
              x={pos.x} y={pos.y + r + 16}
              textAnchor="middle" fontSize={11}
              fill="#cbd5e1"
              className="font-medium"
            >
              {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
            </text>
            <text
              x={pos.x} y={pos.y + (isUser ? 5 : 4)}
              textAnchor="middle" fontSize={isUser ? 12 : 10}
              fill="white" fontWeight="bold"
            >
              {isUser ? 'YOU' : (node.label.charAt(0) + (node.label.split(' ')[1]?.charAt(0) ?? '')).toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Attestation Card
// ---------------------------------------------------------------------------

function AttestationCard({ attestation, index }: { attestation: Attestation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICONS[attestation.attestationType] ?? Star;
  const isVerified = attestation.provider.verified;
  const hasHedera = !!attestation.hederaTransactionId;
  const [copied, setCopied] = useState(false);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(attestation.attestationHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        isVerified
          ? 'bg-primary/5 border-primary/30'
          : 'bg-bg-surface border-slate-700/50'
      }`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
            isVerified ? 'bg-primary/15 text-primary' : 'bg-slate-800 text-slate-400'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary truncate">
                {TYPE_LABELS[attestation.attestationType] ?? attestation.attestationType}
              </p>
              {isVerified && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  <BadgeCheck className="h-3 w-3" /> VERIFIED
                </span>
              )}
              {hasHedera && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-full">
                  <Link2 className="h-3 w-3" /> HEDERA
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary truncate">{attestation.claim}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-text-primary">{attestation.strength}</p>
              <p className="text-[10px] text-text-secondary">strength</p>
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
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 border-t border-slate-700/30 pt-4 space-y-4">
                {/* Provider info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated/50">
                  <Building2 className="h-5 w-5 text-text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{attestation.provider.name}</p>
                    <p className="text-xs text-text-secondary">
                      {PROVIDER_TYPE_LABELS[attestation.provider.type] ?? attestation.provider.type} · {attestation.provider.domain}
                    </p>
                  </div>
                  {isVerified && (
                    <span className="text-xs text-success font-semibold">Verified Provider</span>
                  )}
                </div>

                {/* Details */}
                {attestation.details && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1 font-medium">Details</p>
                    <p className="text-sm text-text-primary">{attestation.details}</p>
                  </div>
                )}

                {/* Date range */}
                {(attestation.startDate || attestation.endDate) && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Clock className="h-3.5 w-3.5" />
                    {attestation.startDate && (
                      <span>From {new Date(attestation.startDate).toLocaleDateString()}</span>
                    )}
                    {attestation.endDate && (
                      <span>to {new Date(attestation.endDate).toLocaleDateString()}</span>
                    )}
                  </div>
                )}

                {/* Blockchain provenance */}
                <div className="p-3 rounded-xl bg-slate-900/50 space-y-2">
                  <p className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> Provenance
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded font-mono truncate flex-1">
                      {attestation.attestationHash}
                    </code>
                    <button
                      onClick={handleCopyHash}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                      title="Copy hash"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                  {hasHedera && (
                    <p className="text-[10px] text-violet-400">
                      Hedera TX: {attestation.hederaTransactionId}
                    </p>
                  )}
                  <p className="text-[10px] text-text-secondary">
                    Verified {attestation.verificationCount} time{attestation.verificationCount !== 1 ? 's' : ''} · Created {new Date(attestation.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Breakdown Card
// ---------------------------------------------------------------------------

function BreakdownRow({ item }: { item: ReputationBreakdown }) {
  const Icon = TYPE_ICONS[item.category] ?? Star;
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
        item.verified ? 'bg-primary/15 text-primary' : 'bg-slate-800 text-slate-400'
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{TYPE_LABELS[item.category] ?? item.category}</p>
        <p className="text-xs text-text-secondary">{item.count} attestation{item.count !== 1 ? 's' : ''}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold">{item.avgStrength}</p>
        <div className="w-16 h-1.5 rounded-full bg-slate-800 mt-1">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${item.avgStrength}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Request Attestation Modal
// ---------------------------------------------------------------------------

function RequestModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: { providerDomain: string; attestationType: string }) => void;
}) {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState<AttestationType>('VERIFIED_INCOME');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-surface border border-slate-700/60 rounded-2xl p-6 w-full max-w-md mx-4 space-y-5"
      >
        <h3 className="text-lg font-bold">Request Attestation</h3>
        <p className="text-sm text-text-secondary">
          Ask an employer, landlord, or platform to verify something about you.
        </p>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Provider Domain</label>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. stripe.com, doordash.com"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Attestation Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AttestationType)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl text-text-secondary hover:text-text-primary hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (domain) onSubmit({ providerDomain: domain, attestationType: type }); }}
            disabled={!domain}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white disabled:opacity-30 hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2"
          >
            <Send className="h-4 w-4" /> Send Request
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export function ReputationPage() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestResult, setRequestResult] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['reputation-dashboard'],
    queryFn: attestationService.getMyDashboard,
  });

  const requestMutation = useMutation({
    mutationFn: attestationService.requestAttestation,
    onSuccess: (res: { message: string }) => {
      setShowRequestModal(false);
      setRequestResult(res.message);
      queryClient.invalidateQueries({ queryKey: ['reputation-dashboard'] });
      setTimeout(() => setRequestResult(null), 6000);
    },
  });

  if (isLoading) {
    return (
      <PageWrapper title="Reputation Graph">
        <div className="flex justify-center py-20"><Spinner /></div>
      </PageWrapper>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper title="Reputation Graph">
        <Card className="p-8 text-center">
          <p className="text-text-secondary">Could not load reputation data.</p>
        </Card>
      </PageWrapper>
    );
  }

  const { attestations, reputation, graph } = data;

  return (
    <PageWrapper title="Reputation Graph">
      {/* Success toast */}
      <AnimatePresence>
        {requestResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 rounded-xl bg-success/10 border border-success/30 text-sm text-success"
          >
            {requestResult}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero: Score + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Reputation Score */}
        <Card className="p-6 flex flex-col items-center justify-center lg:col-span-1">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Reputation Score</p>
          <ScoreRing score={reputation.overall} />
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-text-secondary">Trust Multiplier:</span>
            <span className="text-sm font-bold text-primary">{reputation.trustMultiplier}x</span>
          </div>
          {reputation.strongestCategory !== 'none' && (
            <p className="text-xs text-text-secondary mt-2">
              Strongest: <span className="text-text-primary font-medium">{TYPE_LABELS[reputation.strongestCategory] ?? reputation.strongestCategory}</span>
            </p>
          )}
        </Card>

        {/* Stats Grid */}
        <Card className="p-6 lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Attestations', value: reputation.attestationCount, icon: ShieldCheck },
              { label: 'Providers', value: reputation.providerCount, icon: Building2 },
              { label: 'Verified', value: reputation.verifiedProviderCount, icon: BadgeCheck },
              { label: 'Categories', value: reputation.breakdown.length, icon: Star },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center p-3 rounded-xl bg-bg-elevated/50">
                <Icon className="h-5 w-5 mx-auto mb-1.5 text-text-secondary" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-text-secondary">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Breakdown by Type</p>
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-violet-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Request Attestation
            </button>
          </div>

          {reputation.breakdown.length > 0 ? (
            <div className="divide-y divide-slate-700/30">
              {reputation.breakdown.map((item) => (
                <BreakdownRow key={item.category} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center py-4">
              No attestations yet. Request one from your employer or landlord to get started.
            </p>
          )}
        </Card>
      </div>

      {/* Network Graph */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Trust Network</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> You
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" /> Verified
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Unverified
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-6 border-t-2 border-violet-500" /> Hedera
            </span>
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
          <NetworkGraph graph={graph} />
        </div>
      </Card>

      {/* Attestation List */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Attestations ({attestations.length})
        </h2>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        >
          <Plus className="h-4 w-4" /> Request New
        </button>
      </div>

      {attestations.length > 0 ? (
        <div className="space-y-3">
          {attestations.map((att, i) => (
            <AttestationCard key={att.id} attestation={att} index={i} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Globe className="h-12 w-12 mx-auto mb-4 text-text-secondary opacity-40" />
          <p className="text-lg font-semibold mb-2">No attestations yet</p>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            Your reputation graph grows when employers, landlords, lenders, and gig platforms
            verify aspects of your financial life. Each attestation multiplies your twin's credibility.
          </p>
          <button
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Send className="h-4 w-4" /> Request Your First Attestation
          </button>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Briefcase, title: 'Employer', desc: 'Get income & employment verified by your employer or payroll provider' },
              { icon: Home, title: 'Landlord', desc: 'Prove on-time rent payments to boost resilience and lending readiness' },
              { icon: Truck, title: 'Gig Platform', desc: 'Verify gig earnings from DoorDash, Uber, Stripe, and more' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-4 rounded-xl bg-bg-elevated/50 border border-slate-700/30 text-left">
                <Icon className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm font-semibold mb-1">{title}</p>
                <p className="text-xs text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* How It Works */}
      <Card className="p-6 mt-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4">How the Reputation Graph Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Request', desc: 'Ask your employer, landlord, or platform to verify an aspect of your financial life.' },
            { step: '2', title: 'Attest', desc: 'The provider submits a signed attestation via their API key — no passwords shared.' },
            { step: '3', title: 'Anchor', desc: 'Every attestation is hashed and anchored on the Hedera Consensus Service for tamper-proof provenance.' },
            { step: '4', title: 'Amplify', desc: 'Each verified attestation multiplies your twin\'s credibility. More providers = higher trust multiplier.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="h-10 w-10 rounded-full bg-primary/15 text-primary text-lg font-bold flex items-center justify-center mx-auto mb-3">
                {step}
              </div>
              <p className="text-sm font-semibold mb-1">{title}</p>
              <p className="text-xs text-text-secondary">{desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <RequestModal
            onClose={() => setShowRequestModal(false)}
            onSubmit={(data) => requestMutation.mutate(data)}
          />
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
