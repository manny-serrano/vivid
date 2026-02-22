import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { identityService } from '../services/identityService';
import type { IdentityCard, ProfileInput, AgeRange, IncomeRange, EmploymentType } from '../services/identityService';
import {
  Fingerprint, Shield, CheckCircle2, Globe, GraduationCap, Briefcase,
  Award, TrendingUp, BadgeCheck, Link2, Sparkles, Users, ChevronRight,
  Heart, Building2, CreditCard,
} from 'lucide-react';

const AGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: 'AGE_18_24', label: '18–24' }, { value: 'AGE_25_34', label: '25–34' },
  { value: 'AGE_35_44', label: '35–44' }, { value: 'AGE_45_54', label: '45–54' },
  { value: 'AGE_55_64', label: '55–64' }, { value: 'AGE_65_PLUS', label: '65+' },
];

const INCOME_OPTIONS: { value: IncomeRange; label: string }[] = [
  { value: 'UNDER_25K', label: 'Under $25K' }, { value: 'RANGE_25K_50K', label: '$25K–$50K' },
  { value: 'RANGE_50K_75K', label: '$50K–$75K' }, { value: 'RANGE_75K_100K', label: '$75K–$100K' },
  { value: 'RANGE_100K_150K', label: '$100K–$150K' }, { value: 'RANGE_150K_PLUS', label: '$150K+' },
];

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string; icon: typeof Briefcase }[] = [
  { value: 'FULL_TIME', label: 'Full-Time', icon: Building2 },
  { value: 'PART_TIME', label: 'Part-Time', icon: Briefcase },
  { value: 'GIG_FREELANCE', label: 'Gig / Freelance', icon: Sparkles },
  { value: 'SELF_EMPLOYED', label: 'Self-Employed', icon: TrendingUp },
  { value: 'STUDENT', label: 'Student', icon: GraduationCap },
];

const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  'Blockchain Verified': { bg: 'bg-violet-500/15', text: 'text-violet-400' },
  'Vivid Trusted': { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  'Credit Pioneer': { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  'Gig Economy Verified': { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  'Global Citizen': { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  'Peer Attested': { bg: 'bg-pink-500/15', text: 'text-pink-400' },
  'Network Trusted': { bg: 'bg-orange-500/15', text: 'text-orange-400' },
};

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={60} cy={60} r={r} fill="none" stroke="currentColor" className="text-slate-700/30" strokeWidth={8} />
      <motion.circle
        cx={60} cy={60} r={r} fill="none" stroke="url(#idGrad)" strokeWidth={8} strokeLinecap="round"
        initial={{ strokeDasharray: c, strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - score / 100) }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id="idGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IdentityCardView({ card }: { card: IdentityCard }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-slate-900 via-slate-800 to-violet-950 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Fingerprint className="w-5 h-5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Vivid Financial Identity</span>
              </div>
              <h2 className="text-2xl font-bold">{card.name}</h2>
              {card.creditStatus === 'CREDIT_INVISIBLE' && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-semibold rounded-full">
                  <CreditCard className="w-3 h-3" /> Credit Pioneer — First Financial Identity
                </span>
              )}
            </div>
            <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
              <div className="absolute inset-0">
                <ScoreRing score={card.vividScore} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black">{Math.round(card.vividScore)}</span>
                <span className="text-[9px] text-text-secondary uppercase tracking-wider">Vivid Score</span>
              </div>
            </div>
          </div>

          {/* Pillars */}
          <div className="grid grid-cols-5 gap-2 mb-5">
            {card.pillarScores.map((p) => (
              <div key={p.label} className="text-center">
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mb-1">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                    initial={{ width: 0 }} animate={{ width: `${p.score}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </div>
                <p className="text-[9px] text-text-secondary truncate">{p.label}</p>
                <p className="text-xs font-bold">{Math.round(p.score)}</p>
              </div>
            ))}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Months', value: card.monthsOfData, icon: TrendingUp },
              { label: 'Transactions', value: card.transactionCount.toLocaleString(), icon: CreditCard },
              { label: 'Income Streams', value: card.incomeStreams, icon: Sparkles },
              { label: 'Strengths', value: card.strengths.length, icon: Award },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-2 text-center">
                <s.icon className="w-3.5 h-3.5 mx-auto mb-0.5 text-text-secondary" />
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[9px] text-text-secondary">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Badges */}
          {card.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {card.badges.map((badge) => {
                const style = BADGE_STYLES[badge] ?? { bg: 'bg-slate-500/15', text: 'text-slate-400' };
                return (
                  <span key={badge} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                    <BadgeCheck className="w-2.5 h-2.5" /> {badge}
                  </span>
                );
              })}
            </div>
          )}

          {/* Strengths */}
          {card.strengths.length > 0 && (
            <div className="space-y-1 mb-4">
              {card.strengths.slice(0, 4).map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-text-secondary">{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[10px] text-text-secondary">
            <div className="flex items-center gap-1">
              {card.blockchainVerified && <Shield className="w-3 h-3 text-emerald-400" />}
              {card.blockchainVerified ? 'Blockchain Verified' : 'Pending Verification'}
            </div>
            <span>Generated {new Date(card.generatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileSetup({ onComplete }: { onComplete: (data: ProfileInput) => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProfileInput>({});

  const steps = [
    {
      title: "Let's build your identity",
      subtitle: '45 million Americans have no credit score. Vivid gives you a financial identity based on your real bank data.',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Do you have a traditional credit score (FICO)?</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "No — I'm credit invisible", value: false, icon: Fingerprint, desc: 'No FICO, thin file, or new to the US' },
              { label: 'Yes — I have a FICO score', value: true, icon: CreditCard, desc: 'I have an established credit history' },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => { setData({ ...data, hasFico: opt.value, creditStatus: opt.value ? 'ESTABLISHED' : 'CREDIT_INVISIBLE' }); setStep(1); }}
                className="p-4 rounded-xl border border-slate-700 hover:border-primary/40 hover:bg-primary/5 text-left transition-all"
              >
                <opt.icon className="w-6 h-6 text-primary mb-2" />
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Tell us about yourself',
      subtitle: 'Anonymous demographics help us show you how you compare to similar people.',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Age Range</label>
              <div className="flex flex-wrap gap-2">
                {AGE_OPTIONS.map((a) => (
                  <button key={a.value} onClick={() => setData({ ...data, ageRange: a.value })}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${data.ageRange === a.value ? 'bg-primary/15 border-primary/40 text-primary' : 'border-slate-700 hover:bg-bg-elevated'}`}
                  >{a.label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block">State</label>
                <input
                  placeholder="e.g. Texas" value={data.state ?? ''}
                  onChange={(e) => setData({ ...data, state: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block">City</label>
                <input
                  placeholder="e.g. Austin" value={data.city ?? ''}
                  onChange={(e) => setData({ ...data, city: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Income Range</label>
              <div className="flex flex-wrap gap-2">
                {INCOME_OPTIONS.map((i) => (
                  <button key={i.value} onClick={() => setData({ ...data, incomeRange: i.value })}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${data.incomeRange === i.value ? 'bg-primary/15 border-primary/40 text-primary' : 'border-slate-700 hover:bg-bg-elevated'}`}
                  >{i.label}</button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => setStep(2)} className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90">
            Continue <ChevronRight className="w-4 h-4 inline" />
          </button>
        </div>
      ),
    },
    {
      title: 'How do you earn?',
      subtitle: 'This helps Vivid understand your financial patterns.',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {EMPLOYMENT_OPTIONS.map((e) => (
              <button
                key={e.value}
                onClick={() => setData({ ...data, employmentType: e.value, isGigWorker: e.value === 'GIG_FREELANCE', isStudent: e.value === 'STUDENT' })}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${data.employmentType === e.value ? 'bg-primary/10 border-primary/40' : 'border-slate-700 hover:bg-bg-elevated'}`}
              >
                <e.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm">{e.label}</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-700 hover:bg-bg-elevated cursor-pointer">
            <input
              type="checkbox" checked={data.isInternational ?? false}
              onChange={(e) => setData({ ...data, isInternational: e.target.checked })}
              className="rounded border-slate-600"
            />
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-sm">I'm an immigrant or international resident</span>
          </label>
          <button
            onClick={() => onComplete(data)}
            className="w-full py-2.5 bg-gradient-to-r from-primary to-cyan-500 text-white rounded-xl text-sm font-bold hover:opacity-90"
          >
            Generate My Financial Identity
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {steps.map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-slate-700'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <h2 className="text-xl font-bold mb-1">{steps[step].title}</h2>
          <p className="text-sm text-text-secondary mb-5">{steps[step].subtitle}</p>
          {steps[step].content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function IdentityPage() {
  const qc = useQueryClient();

  const { data: card, isLoading: cardLoading } = useQuery({
    queryKey: ['identity-card'],
    queryFn: identityService.getCard,
    retry: false,
  });

  const { data: profile } = useQuery({
    queryKey: ['identity-profile'],
    queryFn: identityService.getProfile,
  });

  const setupMut = useMutation({
    mutationFn: async (data: ProfileInput) => {
      await identityService.updateProfile(data);
      await identityService.completeOnboarding();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['identity-card'] });
      qc.invalidateQueries({ queryKey: ['identity-profile'] });
    },
  });

  const showSetup = profile && !profile.onboardedAt && !setupMut.isSuccess;

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fingerprint className="w-7 h-7 text-primary" /> Financial Identity
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Your Vivid-powered financial identity — no credit score required. Built from real bank data, verified on-chain.
          </p>
        </motion.div>

        {cardLoading && <Spinner className="mx-auto mt-16" />}

        {showSetup && <ProfileSetup onComplete={(data) => setupMut.mutate(data)} />}

        {card && !showSetup && (
          <>
            <IdentityCardView card={card} />

            {/* Who is this for */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-3">Built for the 45 Million</h3>
              <div className="grid md:grid-cols-3 gap-4 text-xs text-text-secondary">
                {[
                  { icon: Globe, title: 'Immigrants & International Residents', desc: 'New to the US with no credit history? Your bank data tells your financial story.' },
                  { icon: GraduationCap, title: 'Recent Graduates', desc: 'Just starting out? Build a financial identity from day one with your actual spending patterns.' },
                  { icon: Sparkles, title: 'Gig Workers & Freelancers', desc: 'Irregular income? Vivid understands gig patterns that FICO ignores entirely.' },
                ].map((item) => (
                  <div key={item.title}>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="font-medium text-text-primary mb-1">{item.title}</p>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* How to use */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-3">How To Use Your Identity</h3>
              <div className="space-y-2">
                {[
                  { icon: Building2, text: 'Share with landlords instead of a credit report' },
                  { icon: Heart, text: 'Apply for loans with your Vivid score as proof of financial health' },
                  { icon: Link2, text: 'Share a verified link — blockchain-stamped and tamper-proof' },
                  { icon: Users, text: 'Build your reputation with peer attestations from employers and landlords' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2.5 text-xs">
                    <item.icon className="w-4 h-4 text-primary shrink-0" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
