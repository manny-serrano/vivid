import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { notificationService } from '../services/notificationService';
import type { Notification, NotificationSeverity, NotificationType, NotificationPreferences } from '../services/notificationService';
import {
  Bell, BellOff, CheckCheck, X, ExternalLink, Settings,
  TrendingUp, TrendingDown, Clock, DollarSign, CreditCard,
  Target, AlertTriangle, RefreshCw, Sparkles, Info, Filter,
} from 'lucide-react';

const SEVERITY_STYLES: Record<NotificationSeverity, { bg: string; border: string; dot: string; text: string }> = {
  INFO: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', dot: 'bg-blue-400', text: 'text-blue-400' },
  SUCCESS: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  WARNING: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', dot: 'bg-amber-400', text: 'text-amber-400' },
  CRITICAL: { bg: 'bg-red-500/5', border: 'border-red-500/20', dot: 'bg-red-400', text: 'text-red-400' },
};

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  SCORE_MILESTONE: TrendingUp,
  SCORE_DROP: TrendingDown,
  INCOME_LATE: Clock,
  INCOME_DROP: DollarSign,
  SPENDING_SPIKE: AlertTriangle,
  SUBSCRIPTION_CHANGE: CreditCard,
  DTI_WARNING: AlertTriangle,
  GOAL_PROGRESS: Target,
  GOAL_COMPLETED: Sparkles,
  RED_FLAG_NEW: AlertTriangle,
  SYNC_COMPLETE: RefreshCw,
  GENERAL: Info,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function NotificationCard({ n, onRead, onDismiss }: {
  n: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const navigate = useNavigate();
  const style = SEVERITY_STYLES[n.severity];
  const Icon = TYPE_ICONS[n.type] ?? Bell;
  const isUnread = !n.readAt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.2 }}
    >
      <Card className={`p-3 transition-all ${isUnread ? `${style.bg} ${style.border} border` : 'opacity-70'}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isUnread ? style.bg : 'bg-bg-elevated'}`}>
            <Icon className={`w-4 h-4 ${isUnread ? style.text : 'text-text-secondary'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isUnread && <div className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />}
              <h3 className={`text-sm font-medium truncate ${isUnread ? '' : 'text-text-secondary'}`}>{n.title}</h3>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.body}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-text-secondary">{timeAgo(n.createdAt)}</span>
              {n.actionUrl && (
                <button
                  onClick={() => { onRead(n.id); navigate(n.actionUrl!); }}
                  className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5"
                >
                  View <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
              {isUnread && (
                <button onClick={() => onRead(n.id)}
                  className="text-[10px] text-text-secondary hover:text-text-primary flex items-center gap-0.5"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>

          <button onClick={() => onDismiss(n.id)} className="p-1 hover:bg-bg-elevated rounded shrink-0">
            <X className="w-3 h-3 text-text-secondary" />
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

function PreferencesPanel({ prefs, onUpdate }: {
  prefs: NotificationPreferences;
  onUpdate: (data: Partial<NotificationPreferences>) => void;
}) {
  const toggles = [
    { key: 'scoreAlerts' as const, label: 'Score milestones & drops', icon: TrendingUp },
    { key: 'incomeAlerts' as const, label: 'Income deposit alerts', icon: DollarSign },
    { key: 'spendAlerts' as const, label: 'Spending & subscription alerts', icon: CreditCard },
    { key: 'goalAlerts' as const, label: 'Goal progress & completion', icon: Target },
  ];

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Settings className="w-4 h-4 text-text-secondary" /> Alert Preferences
      </h3>
      <div className="space-y-2">
        {toggles.map((t) => (
          <label key={t.key} className="flex items-center justify-between py-1.5 cursor-pointer">
            <span className="flex items-center gap-2 text-xs">
              <t.icon className="w-3.5 h-3.5 text-text-secondary" /> {t.label}
            </span>
            <button
              onClick={() => onUpdate({ [t.key]: !prefs[t.key] })}
              className={`w-8 h-4.5 rounded-full transition-colors relative ${prefs[t.key] ? 'bg-primary' : 'bg-slate-600'}`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${prefs[t.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </label>
        ))}
        <div className="pt-2 border-t border-slate-700/40">
          <label className="flex items-center justify-between py-1.5 text-xs">
            <span className="flex items-center gap-2">
              <BellOff className="w-3.5 h-3.5 text-text-secondary" /> Quiet hours ({prefs.quietStart}:00 – {prefs.quietEnd}:00)
            </span>
          </label>
        </div>
      </div>
    </Card>
  );
}

export function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showPrefs, setShowPrefs] = useState(false);

  const { data: feed, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationService.list({ limit: 50, unreadOnly: filter === 'unread' }),
    refetchInterval: 30000,
  });

  const { data: prefs } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: notificationService.getPreferences,
  });

  const readMut = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread-count'] }); },
  });

  const readAllMut = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread-count'] }); },
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => notificationService.dismiss(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const prefsMut = useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) => notificationService.updatePreferences(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="w-7 h-7 text-primary" /> Notifications
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                Real-time alerts when your AI detects changes that matter.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPrefs(!showPrefs)}
                className={`p-2 rounded-lg border transition-colors ${showPrefs ? 'bg-primary/10 border-primary/30 text-primary' : 'border-slate-700 text-text-secondary hover:bg-bg-elevated'}`}
              >
                <Settings className="w-4 h-4" />
              </button>
              {(feed?.unreadCount ?? 0) > 0 && (
                <button
                  onClick={() => readAllMut.mutate()}
                  className="px-3 py-2 text-xs border border-slate-700 rounded-lg hover:bg-bg-elevated flex items-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showPrefs && prefs && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <PreferencesPanel prefs={prefs} onUpdate={(data) => prefsMut.mutate(data)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-secondary" />
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                filter === f
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'border-slate-700 text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              {f === 'all' ? 'All' : `Unread (${feed?.unreadCount ?? 0})`}
            </button>
          ))}
        </div>

        {isLoading && <Spinner className="mx-auto mt-16" />}

        {!isLoading && (feed?.notifications.length ?? 0) === 0 && (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-30" />
            <h3 className="font-semibold text-lg mb-1">All clear</h3>
            <p className="text-text-secondary text-sm">
              {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet. Alerts will appear here as your AI detects important changes.'}
            </p>
          </Card>
        )}

        <div className="space-y-2">
          <AnimatePresence>
            {feed?.notifications.map((n) => (
              <NotificationCard
                key={n.id}
                n={n}
                onRead={(id) => readMut.mutate(id)}
                onDismiss={(id) => dismissMut.mutate(id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
