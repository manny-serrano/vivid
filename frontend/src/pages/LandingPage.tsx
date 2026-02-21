import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { Shield, BarChart3, Brain, Link2, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const DEMO_MARCUS = [
  { subject: 'Income', score: 72, fullMark: 100 },
  { subject: 'Discipline', score: 88, fullMark: 100 },
  { subject: 'Debt', score: 85, fullMark: 100 },
  { subject: 'Resilience', score: 68, fullMark: 100 },
  { subject: 'Growth', score: 70, fullMark: 100 },
];

const DEMO_SARAH = [
  { subject: 'Income', score: 85, fullMark: 100 },
  { subject: 'Discipline', score: 48, fullMark: 100 },
  { subject: 'Debt', score: 52, fullMark: 100 },
  { subject: 'Resilience', score: 42, fullMark: 100 },
  { subject: 'Growth', score: 58, fullMark: 100 },
];

const FEATURES = [
  {
    icon: Brain,
    title: '5-Dimension AI Analysis',
    desc: 'Income stability, spending discipline, debt trajectory, financial resilience, and growth momentum — scored 0-100 each.',
  },
  {
    icon: Shield,
    title: 'Blockchain Verified',
    desc: 'Every profile hash is stamped on Hedera Hashgraph. Tamper-proof, auditable, and trust-ready.',
  },
  {
    icon: Link2,
    title: 'Permissioned Sharing',
    desc: 'You control exactly what lenders see. Generate share links with granular permission toggles.',
  },
  {
    icon: Zap,
    title: 'Real-Time Processing',
    desc: 'Connect once; your twin updates automatically. Pub/Sub pipeline processes in seconds, not days.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
  }),
};

export function LandingPage() {
  return (
    <div className="min-h-screen -m-8 overflow-hidden">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative py-28 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-5xl md:text-6xl font-bold tracking-tight"
        >
          Your Financial{' '}
          <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Digital Twin
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="relative mt-5 text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed"
        >
          A living, AI-powered replica of your complete financial identity.
          Beyond what a three-digit credit score could ever capture.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative mt-10 flex gap-4 justify-center"
        >
          <Link to="/onboarding">
            <Button>Build your twin</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary">View demo</Button>
          </Link>
        </motion.div>

        {/* Floating radar preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative mt-16 max-w-xs mx-auto"
        >
          <div className="h-64 w-64 mx-auto">
            <ResponsiveContainer>
              <RadarChart data={DEMO_MARCUS}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Radar
                  dataKey="score"
                  stroke="#6B21A8"
                  fill="url(#radarGrad)"
                  fillOpacity={0.6}
                  animationDuration={1200}
                />
                <defs>
                  <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6B21A8" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      {/* ── Problem ────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-bg-surface/50">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-3xl font-bold mb-6"
          >
            FICO is broken
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-3 gap-6 mt-10"
          >
            {[
              { stat: '45M', label: 'Americans are credit invisible' },
              { stat: '35yr', label: 'Old scoring model still in use' },
              { stat: '1 of 5', label: 'Adults have thin or no credit file' },
            ].map((item, i) => (
              <motion.div key={item.label} variants={fadeUp} custom={i + 1}>
                <Card className="text-center">
                  <p className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    {item.stat}
                  </p>
                  <p className="text-sm text-text-secondary mt-2">{item.label}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Marcus vs Sarah ────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-3xl font-bold text-center mb-4"
          >
            Same world. Two stories.
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="text-text-secondary text-center mb-12 max-w-xl mx-auto"
          >
            Traditional credit scores get it wrong. Vivid sees the full picture.
          </motion.p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Marcus */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={2}
            >
              <Card className="h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Marcus Johnson</h3>
                    <p className="text-sm text-text-secondary">Gig worker — Uber, Lyft, TaskRabbit</p>
                  </div>
                  <BarChart3 className="text-success h-5 w-5" />
                </div>

                <div className="flex gap-6 items-center mb-6">
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-wide text-slate-400">FICO</p>
                    <p className="text-2xl font-bold text-danger">580</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-wide text-slate-400">Vivid</p>
                    <p className="text-2xl font-bold text-success">74</p>
                  </div>
                </div>

                <div className="h-48">
                  <ResponsiveContainer>
                    <RadarChart data={DEMO_MARCUS}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Radar dataKey="score" stroke="#10B981" fill="#10B981" fillOpacity={0.35} animationDuration={1000} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-sm text-text-secondary mt-4 leading-relaxed">
                  Irregular but growing income across 3 gig platforms. Excellent spending discipline,
                  consistent rent, 2-month emergency fund. No credit card history makes him invisible
                  to FICO — but Vivid sees a responsible, rising earner.
                </p>
              </Card>
            </motion.div>

            {/* Sarah */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={3}
            >
              <Card className="h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Sarah Chen</h3>
                    <p className="text-sm text-text-secondary">Salaried — $6,500/month</p>
                  </div>
                  <BarChart3 className="text-warning h-5 w-5" />
                </div>

                <div className="flex gap-6 items-center mb-6">
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-wide text-slate-400">FICO</p>
                    <p className="text-2xl font-bold text-success">720</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-wide text-slate-400">Vivid</p>
                    <p className="text-2xl font-bold text-warning">61</p>
                  </div>
                </div>

                <div className="h-48">
                  <ResponsiveContainer>
                    <RadarChart data={DEMO_SARAH}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Radar dataKey="score" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.35} animationDuration={1000} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-sm text-text-secondary mt-4 leading-relaxed">
                  Stable salary but high discretionary spend on dining, travel, luxury retail.
                  Multiple credit cards with carried balances. Zero emergency fund, no savings
                  transfers. FICO loves her utilization; Vivid sees fragile finances.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="py-20 px-4 bg-bg-surface/50">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-3xl font-bold text-center mb-12"
          >
            How Vivid works
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="h-full">
                  <f.icon className="h-8 w-8 text-accent mb-4" />
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="max-w-xl mx-auto"
        >
          <h2 className="text-3xl font-bold mb-4">
            Ready to see your{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              true score
            </span>
            ?
          </h2>
          <p className="text-text-secondary mb-8">
            Built for LIVE AI Ivy Plus 2026 — powered by BankSocial &amp; Hedera Hashgraph.
          </p>
          <Link to="/onboarding">
            <Button>Get started free</Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
