import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Search, Users, User, Users2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Layout = () => {
  const location = useLocation();
  const { authError, clearAuthError } = useAuth();
  const hideNavOn = ['/media/']; // Hide nav on media details
  const shouldHideNav = hideNavOn.some(path => location.pathname.includes(path));

  return (
    <div className="bg-background-dark text-text-light font-display min-h-screen flex flex-col relative overflow-x-hidden selection:bg-primary/30">
      {/* Global Theme Blur Background */}
      <div className="fixed inset-0 z-[-1] bg-[var(--theme-bg-glow)] blur-[100px] pointer-events-none"></div>

      {authError && (
        <div className="sticky top-0 z-[60] px-4 pt-4">
          <div className="mx-auto max-w-3xl rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <div className="flex items-start justify-between gap-4">
              <p>{authError}</p>
              <button
                type="button"
                onClick={clearAuthError}
                className="shrink-0 rounded-full border border-amber-200/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-50 hover:bg-amber-200/10"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={`flex-1 flex flex-col h-full overflow-y-auto no-scrollbar ${shouldHideNav ? '' : 'pb-24'}`}>
        <Outlet />
      </div>

      {!shouldHideNav && (
        <nav className="fixed bottom-0 w-full z-50">
          <div className="flex gap-2 border-t border-white/5 bg-surface/90 backdrop-blur-lg px-4 pb-6 pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? "text-primary neon-shadow" : "text-muted hover:text-white"
                )
              }
            >
              <Home size={26} />
              <span className="text-[10px] font-medium tracking-wide">Accueil</span>
            </NavLink>
            <NavLink
              to="/search"
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? "text-primary neon-shadow" : "text-muted hover:text-white"
                )
              }
            >
              <Search size={26} />
              <span className="text-[10px] font-medium tracking-wide">Recherche</span>
            </NavLink>
            <NavLink
              to="/groups"
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? "text-primary neon-shadow" : "text-muted hover:text-white"
                )
              }
            >
              <Users2 size={26} />
              <span className="text-[10px] font-medium tracking-wide">Groupes</span>
            </NavLink>
            <NavLink
              to="/social"
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? "text-primary neon-shadow" : "text-muted hover:text-white"
                )
              }
            >
              <Users size={26} />
              <span className="text-[10px] font-medium tracking-wide">Amis</span>
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? "text-primary neon-shadow" : "text-muted hover:text-white"
                )
              }
            >
              <User size={26} />
              <span className="text-[10px] font-medium tracking-wide">Profil</span>
            </NavLink>
          </div>
          <div className="h-1 bg-surface/90 backdrop-blur-lg w-full"></div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
