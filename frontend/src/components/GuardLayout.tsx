// frontend/src/components/GuardLayout.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, ClipboardList, User, LogOut, ShieldAlert, Loader2 } from 'lucide-react';
import { resolveApiUrl } from '../lib/api-url';
import { resolveAvatarUrl } from '../lib/avatar-url';

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const apiUrl = resolveApiUrl();
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const displayAvatarUrl = resolveAvatarUrl(avatarUrl, apiUrl);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out?')) return;

    try {
      await axios.post(`${apiUrl}/api/auth/logout`);
    } catch {
      // Best-effort — proceed with clearing the local session regardless.
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const refreshSessionDetails = () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/');
      return;
    }

    try {
      const user = JSON.parse(userStr) as { role?: string; name?: string; id?: string; avatarUrl?: string | null };
      if (user.role && user.role !== 'GUARD') {
        router.push(user.role === 'CLIENT' ? '/client/dashboard' : '/dashboard');
        return;
      }

      setUserName(user.name || 'Guard');
      const localFallback = user.id ? localStorage.getItem(`profile-avatar-${user.id}`) || '' : '';
      setAvatarUrl(user.avatarUrl || localFallback);
      setIsAuthorized(true);
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  useEffect(() => {
    refreshSessionDetails();
  }, [router]);

  useEffect(() => {
    const onProfileUpdated = () => refreshSessionDetails();
    const onStorageChanged = (event: StorageEvent) => {
      if (event.key === 'user' || event.key?.startsWith('profile-avatar-')) {
        refreshSessionDetails();
      }
    };

    window.addEventListener('profile:updated', onProfileUpdated);
    window.addEventListener('storage', onStorageChanged);

    return () => {
      window.removeEventListener('profile:updated', onProfileUpdated);
      window.removeEventListener('storage', onStorageChanged);
    };
  }, []);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24"> {/* Padding bottom for nav bar */}

      {/* Mobile Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-md sm:p-4"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {displayAvatarUrl ? (
            <img src={displayAvatarUrl} alt="Profile" className="h-10 w-10 rounded-full border border-slate-700 object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
              {userName.charAt(0)?.toUpperCase() || 'G'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-wider text-white">URBAN SEC</h1>
            <p className="truncate text-xs text-slate-300">Welcome, {userName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            ONLINE
          </span>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-red-300 transition hover:bg-slate-800 hover:text-red-200 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-3 sm:p-4">
        {children}
      </main>

      {/* Bottom Navigation Bar (Mobile Style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-gray-200 bg-white/95 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)] backdrop-blur">

        <NavItem href="/guard/dashboard" active={pathname === '/guard/dashboard'} icon={Home} label="Home" />
        <NavItem href="/guard/schedule" active={pathname === '/guard/schedule'} icon={Calendar} label="Schedule" />

        {/* Big Center Action Button */}
        <div className="-mt-7">
          <Link
            href="/guard/report"
            aria-label="File report"
            className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-gray-50 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <ShieldAlert className="h-6 w-6" />
          </Link>
        </div>

        <NavItem href="/guard/history" active={pathname === '/guard/history'} icon={ClipboardList} label="Logs" />
        <NavItem href="/guard/profile" active={pathname === '/guard/profile'} icon={User} label="Me" />

      </nav>
    </div>
  );
}

// Helper Component for Nav Items
function NavItem({ href, active, icon: Icon, label }: { href: string; active: boolean; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className={`flex min-w-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors ${
        active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${active ? 'bg-indigo-50' : ''}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}
