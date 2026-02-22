import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, Share2, Building2, ShieldCheck, BadgeCheck, Zap, AlertTriangle, Scissors, Shield, Clock, ShieldAlert, Network, Code2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/red-flags', label: 'Red Flags', icon: ShieldAlert },
  { to: '/twin', label: 'My Twin', icon: User },
  { to: '/time-machine', label: 'Time Machine', icon: Clock },
  { to: '/optimize', label: 'Optimize Spend', icon: Scissors },
  { to: '/loan-shield', label: 'Loan Shield', icon: Shield },
  { to: '/stress-test', label: 'Stress Test', icon: Zap },
  { to: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { to: '/share', label: 'Share with Lenders', icon: Share2 },
  { to: '/zkp', label: 'ZK Proofs', icon: ShieldCheck },
  { to: '/reputation', label: 'Reputation Graph', icon: Network },
  { to: '/widgets', label: 'Embed Widget', icon: Code2 },
  { to: '/badges', label: 'Verified Badge', icon: BadgeCheck },
  { to: '/institution', label: 'Institution', icon: Building2 },
];

export function Sidebar() {
  const open = useUIStore((s) => s.sidebarOpen);
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  if (!open) return null;

  return (
    <aside className="w-56 shrink-0 border-r border-slate-700/60 bg-bg-surface/50 p-4 min-h-[calc(100vh-56px)]">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-text-primary'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
