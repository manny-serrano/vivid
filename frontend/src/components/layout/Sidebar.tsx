import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, User, Share2, Building2, ShieldCheck, BadgeCheck,
  Zap, AlertTriangle, Scissors, Shield, Clock, ShieldAlert, Network,
  Code2, Target, RefreshCw, Briefcase, ChevronDown, Fingerprint, BarChart3,
  MessageSquareDashed,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    defaultOpen: true,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/twin', label: 'My Twin', icon: User },
      { to: '/identity', label: 'My Identity', icon: Fingerprint },
      { to: '/benchmark', label: 'How I Compare', icon: BarChart3 },
      { to: '/goals', label: 'Goals', icon: Target },
    ],
  },
  {
    label: 'Insights',
    defaultOpen: true,
    items: [
      { to: '/red-flags', label: 'Red Flags', icon: ShieldAlert },
      { to: '/time-machine', label: 'Time Machine', icon: Clock },
      { to: '/optimize', label: 'Optimize Spend', icon: Scissors },
      { to: '/loan-shield', label: 'Loan Shield', icon: Shield },
      { to: '/stress-test', label: 'Stress Test', icon: Zap },
      { to: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
      { to: '/negotiate', label: 'Bill Negotiator', icon: MessageSquareDashed },
    ],
  },
  {
    label: 'Trust & Sharing',
    defaultOpen: false,
    items: [
      { to: '/share', label: 'Share', icon: Share2 },
      { to: '/reputation', label: 'Reputation', icon: Network },
      { to: '/zkp', label: 'ZK Proofs', icon: ShieldCheck },
      { to: '/badges', label: 'Verified Badge', icon: BadgeCheck },
    ],
  },
  {
    label: 'Platform',
    defaultOpen: false,
    items: [
      { to: '/sync', label: 'Data Sync', icon: RefreshCw },
      { to: '/widgets', label: 'Embed Widget', icon: Code2 },
      { to: '/partner', label: 'Partner Portal', icon: Briefcase },
      { to: '/institution', label: 'Institution', icon: Building2 },
    ],
  },
];

function SidebarGroup({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActiveChild = group.items.some((item) => pathname.startsWith(item.to));
  const [open, setOpen] = useState(group.defaultOpen || hasActiveChild);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/60 hover:text-text-secondary transition-colors"
      >
        {group.label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul className="space-y-0.5 pb-1">
          {group.items.map(({ to, label, icon: Icon }) => (
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
                {label}
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
  if (pathname === '/') return null;
  if (!open) return null;

  return (
    <aside className="w-52 shrink-0 border-r border-slate-700/60 bg-bg-surface/50 p-3 min-h-[calc(100vh-56px)] overflow-y-auto">
      <div className="space-y-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} group={group} pathname={pathname} />
        ))}
      </div>
    </aside>
  );
}
