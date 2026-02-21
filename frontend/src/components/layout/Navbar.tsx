import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

export function Navbar() {
  const { pathname } = useLocation();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const isLanding = pathname === '/';

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-700/60 bg-bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 items-center justify-between px-4 max-w-7xl">
        <div className="flex items-center gap-3">
          {!isLanding && (
            <button onClick={toggleSidebar} className="text-text-secondary hover:text-text-primary transition-colors">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Vivid
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-5 text-sm">
          <Link
            to="/dashboard"
            className={`transition-colors ${pathname === '/dashboard' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Dashboard
          </Link>
          <Link
            to="/onboarding"
            className={`transition-colors ${pathname === '/onboarding' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Get started
          </Link>
          <Link
            to="/institution/login"
            className={`transition-colors ${pathname.startsWith('/institution') ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Institutions
          </Link>
        </div>
      </div>
    </nav>
  );
}
