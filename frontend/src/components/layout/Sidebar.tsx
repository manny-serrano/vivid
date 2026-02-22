import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, User, Share2, Building2, ShieldCheck, BadgeCheck,
  Zap, AlertTriangle, Scissors, Shield, Clock, ShieldAlert, Network,
  Code2, Target, RefreshCw, Briefcase, ChevronDown, Fingerprint, BarChart3,
  MessageSquareDashed, Gift, Globe,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n/useTranslation';

interface NavItem {
  to: string;
  i18nKey: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  i18nKey: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    i18nKey: 'sidebar.overview',
    defaultOpen: true,
    items: [
      { to: '/wrapped', i18nKey: 'sidebar.wrapped', icon: Gift },
      { to: '/dashboard', i18nKey: 'sidebar.dashboard', icon: LayoutDashboard },
      { to: '/twin', i18nKey: 'sidebar.twin', icon: User },
      { to: '/identity', i18nKey: 'sidebar.identity', icon: Fingerprint },
      { to: '/benchmark', i18nKey: 'sidebar.benchmark', icon: BarChart3 },
      { to: '/goals', i18nKey: 'sidebar.goals', icon: Target },
    ],
  },
  {
    i18nKey: 'sidebar.insights',
    defaultOpen: true,
    items: [
      { to: '/red-flags', i18nKey: 'sidebar.redFlags', icon: ShieldAlert },
      { to: '/time-machine', i18nKey: 'sidebar.timeMachine', icon: Clock },
      { to: '/optimize', i18nKey: 'sidebar.optimize', icon: Scissors },
      { to: '/loan-shield', i18nKey: 'sidebar.loanShield', icon: Shield },
      { to: '/stress-test', i18nKey: 'sidebar.stressTest', icon: Zap },
      { to: '/anomalies', i18nKey: 'sidebar.anomalies', icon: AlertTriangle },
      { to: '/negotiate', i18nKey: 'sidebar.negotiate', icon: MessageSquareDashed },
    ],
  },
  {
    i18nKey: 'sidebar.trust',
    defaultOpen: false,
    items: [
      { to: '/share', i18nKey: 'sidebar.share', icon: Share2 },
      { to: '/reputation', i18nKey: 'sidebar.reputation', icon: Network },
      { to: '/zkp', i18nKey: 'sidebar.zkp', icon: ShieldCheck },
      { to: '/badges', i18nKey: 'sidebar.badges', icon: BadgeCheck },
    ],
  },
  {
    i18nKey: 'sidebar.platform',
    defaultOpen: false,
    items: [
      { to: '/sync', i18nKey: 'sidebar.sync', icon: RefreshCw },
      { to: '/widgets', i18nKey: 'sidebar.widgets', icon: Code2 },
      { to: '/partner', i18nKey: 'sidebar.partner', icon: Briefcase },
      { to: '/institution', i18nKey: 'sidebar.institution', icon: Building2 },
      { to: '/language', i18nKey: 'common.language', icon: Globe },
    ],
  },
];

function SidebarGroup({ group, pathname, t }: { group: NavGroup; pathname: string; t: (key: string) => string }) {
  const hasActiveChild = group.items.some((item) => pathname.startsWith(item.to));
  const [open, setOpen] = useState(group.defaultOpen || hasActiveChild);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/60 hover:text-text-secondary transition-colors"
      >
        {t(group.i18nKey)}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul className="space-y-0.5 pb-1">
          {group.items.map(({ to, i18nKey, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/15 text-text-primary'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {t(i18nKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Sidebar() {
  const open = useUIStore((s) => s.sidebarOpen);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  if (pathname === '/') return null;
  if (!open) return null;

  return (
    <aside className="w-52 shrink-0 border-r border-slate-700/60 bg-bg-surface/50 p-3 min-h-[calc(100vh-56px)] overflow-y-auto">
      <div className="space-y-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.i18nKey} group={group} pathname={pathname} t={t} />
        ))}
      </div>
    </aside>
  );
}
