// frontend/src/components/AdminLayout.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // State
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const refreshSessionDetails = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token) {
      router.push('/');
      return;
    }

    if (!user) {
      setIsAuthorized(true);
      return;
    }

    try {
      const parsedUser = JSON.parse(user) as { id?: string; name?: string };
      setUserName(parsedUser.name || 'Admin');

      if (parsedUser.id) {
        const savedAvatar = localStorage.getItem(`profile-avatar-${parsedUser.id}`) || '';
        setAvatarUrl(savedAvatar);
      } else {
        setAvatarUrl('');
      }

      setIsAuthorized(true);
    } catch (e) {
      console.error('Corrupted user data found. Resetting session.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  // 1. SECURITY CHECK (Self-Healing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      refreshSessionDetails();
    }
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // 2. LOGOUT FUNCTION
  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  // Prevent flashing protected content
  if (!isAuthorized) {
    return null; 
  }

  const navItems = [
    { name: 'Admin Center', href: '/dashboard', icon: '📊' },
    { name: 'Sites', href: '/sites', icon: '🏢' },
    { name: 'Personnel', href: '/guards', icon: '👮' },
    { name: 'Schedule', href: '/shifts', icon: '📅' },
    { name: 'Incidents', href: '/incidents', icon: '⚠️' },
    { name: 'Daily Logs', href: '/reports', icon: '📋' },
  ];

  const navLinks = navItems.map((item) => (
    <Link 
      key={item.name} 
      href={item.href}
      className={`flex items-center px-4 py-3 mb-1 transition-colors ${
        pathname.startsWith(item.href) ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      <span className="text-xl">{item.icon}</span>
      <span className={`ml-3 font-medium ${!isSidebarOpen && 'md:hidden'}`}>{item.name}</span>
    </Link>
  ));

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden no-print" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex bg-slate-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} no-print flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
          <h2 className={`font-bold text-xl tracking-wider ${!isSidebarOpen && 'hidden'}`}>URBAN SEC</h2>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-white">
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="flex-1 mt-6">
          {navLinks}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen ? 'justify-center' : ''}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                {userName.charAt(0) || 'A'}
              </div>
            )}
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                {/* --- CLICKABLE PROFILE LINK --- */}
                <Link href="/profile" className="hover:underline hover:text-indigo-300 transition block">
                  <p className="text-sm font-bold truncate">{userName}</p>
                </Link>
                
                <button 
                  onClick={handleLogout} 
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1"
                >
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-slate-900 text-white z-50 transform transition-transform duration-300 md:hidden no-print ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
          <h2 className="font-bold text-xl tracking-wider">URBAN SEC</h2>
          <button onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>
        <nav className="flex-1 mt-6">{navLinks}</nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout} 
            className="text-sm text-red-300 hover:text-red-200 flex items-center gap-2"
          >
            🚪 Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center no-print">
           <div className="flex items-center gap-3">
             <button
               onClick={() => setMobileMenuOpen(true)}
               className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded border border-gray-200 text-gray-700"
             >
               ☰
             </button>
             <h1 className="text-lg md:text-xl font-bold text-gray-800">
               {navItems.find(i => pathname.startsWith(i.href))?.name || 'Operations Center'}
             </h1>
           </div>
           <div className="flex items-center gap-2">
             <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
             <span className="hidden sm:inline text-xs font-bold text-gray-500 uppercase tracking-widest">System Online</span>
           </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
