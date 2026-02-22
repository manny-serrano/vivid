import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LogIn } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isLanding = pathname === '/';

  const qc = useQueryClient();

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    qc.clear();
    navigate('/');
  };

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
            <img src="/vivid-logo.png" alt="Vivid logo" className="h-8 w-8 rounded-full object-cover" />
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
            to="/institution/login"
            className={`transition-colors ${pathname.startsWith('/institution') ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Institutions
          </Link>
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-text-secondary hover:text-danger transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          ) : (
            <Link
              to="/login"
              className={`flex items-center gap-1.5 transition-colors ${pathname === '/login' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <LogIn className="h-4 w-4" />
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
