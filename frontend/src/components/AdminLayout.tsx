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
  const [userName, setUserName] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 1. SECURITY CHECK (Self-Healing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (!token) {
        // No token? Kick them out immediately
        router.push('/');
      } else {
        // Token exists? Check User Data
        if (user) {
          try {
            const parsedUser = JSON.parse(user);
            setUserName(parsedUser.name || 'Admin');
            setIsAuthorized(true); // Data is good, show page
          } catch (e) {
            console.error("Corrupted user data found. Resetting session.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/'); // Force re-login
          }
        } else {
          setIsAuthorized(true);
        }
      }
    }
  }, [router]);

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

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      
      {/* Sidebar - Hidden on Print */}
      <aside className={`bg-slate-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} no-print flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
          <h2 className={`font-bold text-xl tracking-wider ${!isSidebarOpen && 'hidden'}`}>URBAN SEC</h2>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-white">
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="flex-1 mt-6">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center px-4 py-3 mb-1 transition-colors ${
                pathname.startsWith(item.href) ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`ml-3 font-medium ${!isSidebarOpen && 'hidden'}`}>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
              {userName.charAt(0) || 'A'}
            </div>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center no-print">
           <h1 className="text-xl font-bold text-gray-800">
             {navItems.find(i => pathname.startsWith(i.href))?.name || 'Operations Center'}
           </h1>
           <div className="flex items-center gap-2">
             <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">System Online</span>
           </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}