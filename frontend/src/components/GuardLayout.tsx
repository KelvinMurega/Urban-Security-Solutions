// frontend/src/components/GuardLayout.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
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
        router.push('/dashboard');
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

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20"> {/* Padding bottom for nav bar */}
      
      {/* Mobile Header */}
      <header className="bg-slate-900 text-white p-3 sm:p-4 flex justify-between items-center shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          {displayAvatarUrl ? (
            <img src={displayAvatarUrl} alt="Profile" className="h-10 w-10 rounded-full border border-slate-700 object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
              {userName.charAt(0)?.toUpperCase() || 'G'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-wider">URBAN SEC</h1>
            <p className="truncate text-xs text-slate-300">Welcome {userName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" title="Online"></div>
          <button
            onClick={handleLogout}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-slate-800 hover:text-red-100"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-3 sm:p-4">
        {children}
      </main>

      {/* Bottom Navigation Bar (Mobile Style) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        
        <NavItem href="/guard/dashboard" active={pathname === '/guard/dashboard'} icon="🏠" label="Home" />
        <NavItem href="/guard/schedule" active={pathname === '/guard/schedule'} icon="📅" label="Schedule" />
        
        {/* Big Center Action Button */}
        <div className="-mt-8">
          <Link href="/guard/report" className="bg-indigo-600 h-14 w-14 rounded-full flex items-center justify-center text-2xl text-white shadow-lg border-4 border-gray-50 active:scale-95 transition">
            +
          </Link>
        </div>

        <NavItem href="/guard/history" active={pathname === '/guard/history'} icon="📋" label="Logs" />
        <NavItem href="/guard/profile" active={pathname === '/guard/profile'} icon="👤" label="Me" />
        
      </nav>
    </div>
  );
}

// Helper Component for Nav Items
function NavItem({ href, active, icon, label }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-12 sm:w-16 py-1 ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
      <span className="text-lg sm:text-xl mb-1">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
