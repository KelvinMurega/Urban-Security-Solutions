// frontend/src/components/GuardLayout.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Security Check
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/');
      return;
    }

    const user = JSON.parse(userStr);
    
    // 2. Role Check (Kick out Admins who stumble here?)
    // Optional: You might want Admins to be able to see this too for testing.
    // For now, we just ensure they are logged in.
    
    setUserName(user.name);
    setIsAuthorized(true);
  }, [router]);

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20"> {/* Padding bottom for nav bar */}
      
      {/* Mobile Header */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold tracking-wider">URBAN SEC</h1>
          <p className="text-xs text-slate-400">Officer {userName.split(' ')[0]}</p>
        </div>
        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" title="Online"></div>
      </header>

      {/* Main Content Area */}
      <main className="p-4">
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
    <Link href={href} className={`flex flex-col items-center justify-center w-16 py-1 ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}