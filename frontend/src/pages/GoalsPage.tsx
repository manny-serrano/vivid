import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useTranslation } from '../i18n/useTranslation';
import { goalsService } from '../services/goalsService';
import type { Goal, GoalStats, GoalCategory, CreateGoalInput } from '../services/goalsService';
import {
  Target, Plus, Trophy, TrendingUp, CheckCircle2, Clock, Trash2,
  Flame, PiggyBank, CreditCard, Home, BarChart3, Scissors, DollarSign,
  ChevronDown, Pause, Play, X, Sparkles, Milestone,
} from 'lucide-react';

const CATEGORY_META: Record<GoalCategory, { label: string; icon: typeof Target; color: string }> = {
  SAVINGS: { label: 'Savings', icon: PiggyBank, color: 'text-emerald-400' },
  DEBT_PAYOFF: { label: 'Debt Payoff', icon: CreditCard, color: 'text-red-400' },
  EMERGENCY_FUND: { label: 'Emergency Fund', icon: Target, color: 'text-amber-400' },
  SCORE_IMPROVEMENT: { label: 'Score Improvement', icon: TrendingUp, color: 'text-violet-400' },
  MORTGAGE_READY: { label: 'Mortgage Ready', icon: Home, color: 'text-blue-400' },
  SPENDING_REDUCTION: { label: 'Cut Spending', icon: Scissors, color: 'text-orange-400' },
  INCOME_GROWTH: { label: 'Grow Income', icon: DollarSign, color: 'text-green-400' },
  CUSTOM: { label: 'Custom', icon: BarChart3, color: 'text-slate-400' },
};

function ProgressRing({ progress, size = 48 }: { progress: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-slate-700/40" strokeWidth={4} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#goalGrad)"
        strokeWidth={4} strokeLinecap="round"
        initial={{ strokeDasharray: c, strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - pct / 100) }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MilestoneTrack({ goal }: { goal: Goal }) {
  if (!goal.milestones.length) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {goal.milestones.map((m) => (
        <div key={m.id} className="flex items-center gap-2 text-xs">
          <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center
            ${m.reached ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-600'}`}>
            {m.reached && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
          </div>
          <span className={m.reached ? 'text-text-primary line-through opacity-60' : 'text-text-secondary'}>
            {m.title}
          </span>
          <span className="ml-auto text-text-secondary">
            {goal.unit === 'dollars' ? `$${m.targetValue.toLocaleString()}` : m.targetValue}
          </span>
        </div>
      ))}
    </div>
  );
}

function GoalCard({ goal, onUpdate, onDelete }: {
  goal: Goal;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(String(goal.currentValue));
  const meta = CATEGORY_META[goal.category];
  const Icon = meta.icon;
  const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  const isComplete = goal.status === 'COMPLETED';
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
    >
      <Card className={`p-4 transition-all hover:border-primary/30 ${isComplete ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="relative" style={{ width: 48, height: 48 }}>
            <div className="absolute inset-0">
              <ProgressRing progress={progress} />
            </div>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${meta.color}`} />
              <h3 className="font-semibold text-sm truncate">{goal.title}</h3>
              {isComplete && <Trophy className="w-4 h-4 text-amber-400" />}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.color} bg-current/10`}>
                {meta.label}
              </span>
              {!isComplete && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {daysLeft}d left
                </span>
              )}
            </div>

            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-secondary">
                  {goal.unit === 'dollars' ? `$${goal.currentValue.toLocaleString()}` : goal.currentValue}
                </span>
                <span className="text-text-secondary">
                  {goal.unit === 'dollars' ? `$${goal.targetValue.toLocaleString()}` : goal.targetValue}
                </span>
              </div>
              <div className="h-1.5 bg-slate-700/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-bg-elevated rounded">
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {goal.description && (
                <p className="text-xs text-text-secondary mt-3">{goal.description}</p>
              )}

              <MilestoneTrack goal={goal} />

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/40">
                {!isComplete && !editingProgress && (
                  <button
                    onClick={() => setEditingProgress(true)}
                    className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    Update Progress
                  </button>
                )}
                {editingProgress && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number" value={progressValue}
                      onChange={(e) => setProgressValue(e.target.value)}
                      className="w-24 text-xs px-2 py-1.5 bg-bg-elevated border border-slate-700 rounded-lg"
                      autoFocus
                    />
                    <button
                      onClick={() => { onUpdate(goal.id, { currentValue: Number(progressValue) }); setEditingProgress(false); }}
                      className="text-xs px-2 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingProgress(false)} className="p-1 hover:bg-bg-elevated rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {goal.status === 'ACTIVE' && (
                  <button
                    onClick={() => onUpdate(goal.id, { status: 'PAUSED' })}
                    className="text-xs px-2 py-1.5 text-text-secondary hover:bg-bg-elevated rounded-lg flex items-center gap-1"
                  >
                    <Pause className="w-3 h-3" /> Pause
                  </button>
                )}
                {goal.status === 'PAUSED' && (
                  <button
                    onClick={() => onUpdate(goal.id, { status: 'ACTIVE' })}
                    className="text-xs px-2 py-1.5 text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" /> Resume
                  </button>
                )}
                <button
                  onClick={() => onDelete(goal.id)}
                  className="text-xs px-2 py-1.5 text-danger hover:bg-danger/10 rounded-lg flex items-center gap-1 ml-auto"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function CreateGoalModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateGoalInput) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('SAVINGS');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    if (!title || !targetValue || !targetDate) return;
    onCreate({ title, description: description || undefined, category, targetValue: Number(targetValue), targetDate });
    setTitle(''); setDescription(''); setTargetValue(''); setTargetDate('');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-bg-surface border border-slate-700/60 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" /> New Goal
        </h2>

        <div className="space-y-3">
          <input
            placeholder="Goal title (e.g. Save $5,000 for emergency fund)"
            value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
          />
          <textarea
            placeholder="Description (optional)"
            value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none resize-none h-16"
          />
          <select
            value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)}
            className="w-full px-3 py-2 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
          >
            {Object.entries(CATEGORY_META).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Target Amount</label>
              <input
                type="number" placeholder="5000" value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Target Date</label>
              <input
                type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg-elevated border border-slate-700 rounded-xl focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-slate-700 rounded-xl hover:bg-bg-elevated">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || !targetValue || !targetDate}
            className="flex-1 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-40"
          >
            Create Goal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatsBar({ stats }: { stats: GoalStats }) {
  const items = [
    { label: 'Active', value: stats.active, icon: Target, color: 'text-primary' },
    { label: 'Completed', value: stats.completed, icon: Trophy, color: 'text-amber-400' },
    { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: TrendingUp, color: 'text-cyan-400' },
    { label: 'Streak', value: stats.streak, icon: Flame, color: 'text-orange-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="p-3 flex items-center gap-3">
          <item.icon className={`w-5 h-5 ${item.color}`} />
          <div>
            <p className="text-lg font-bold">{item.value}</p>
            <p className="text-xs text-text-secondary">{item.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function GoalsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const { data: goals, isLoading } = useQuery({ queryKey: ['goals'], queryFn: goalsService.list });
  const { data: stats } = useQuery({ queryKey: ['goals-stats'], queryFn: goalsService.stats });

  const createMut = useMutation({
    mutationFn: (data: CreateGoalInput) => goalsService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['goals-stats'] }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => goalsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['goals-stats'] }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => goalsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['goals-stats'] }); },
  });
  const autoMut = useMutation({
    mutationFn: () => goalsService.autoProgress(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['goals-stats'] }); },
  });

  const filtered = (goals ?? []).filter((g) => {
    if (filter === 'active') return g.status === 'ACTIVE' || g.status === 'PAUSED';
    if (filter === 'completed') return g.status === 'COMPLETED';
    return true;
  });

  return (
    <PageWrapper title={t('goals.title')}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Milestone className="w-7 h-7 text-primary" /> {t('goals.title')}
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                Set targets, track progress, hit milestones — prove product-market fit with retention.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => autoMut.mutate()}
                disabled={autoMut.isPending}
                className="px-3 py-2 text-sm border border-slate-700 rounded-xl hover:bg-bg-elevated flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                {autoMut.isPending ? 'Syncing...' : 'Auto-Progress'}
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> New Goal
              </button>
            </div>
          </div>
        </motion.div>

        {stats && <StatsBar stats={stats} />}

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                filter === f
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'border-slate-700 text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {isLoading && <Spinner className="mx-auto mt-16" />}

        {!isLoading && filtered.length === 0 && (
          <Card className="p-12 text-center">
            <Target className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-40" />
            <h3 className="font-semibold text-lg mb-1">{t('goals.noGoals')}</h3>
            <p className="text-text-secondary text-sm mb-4">{t('goals.noGoalsDesc')}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90"
            >
              Create Your First Goal
            </button>
          </Card>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onUpdate={(id, data) => updateMut.mutate({ id, data })}
                onDelete={(id) => deleteMut.mutate(id)}
              />
            ))}
          </AnimatePresence>
        </div>

        <CreateGoalModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreate={(data) => createMut.mutate(data)}
        />
      </div>
    </PageWrapper>
  );
}
