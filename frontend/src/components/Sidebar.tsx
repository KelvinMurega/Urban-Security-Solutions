// frontend/src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Command Center', path: '/dashboard', icon: '📡' },
    { name: 'Sites', path: '/sites', icon: '🏢' },
    { name: 'Personnel', path: '/guards', icon: '👮' },
    { name: 'Schedule', path: '/shifts', icon: '📅' },
    { name: 'Incidents', path: '/incidents', icon: '🚨' },
    { name: 'Daily Logs', path: '/reports', icon: '📋' },
  ];

  const handleLogout = async () => {
    try {
      // Call backend to clear cookie
      await axios.post('http://localhost:5000/api/auth/logout');
      // Redirect to Login
      router.push('/');
    } catch (error) {
      console.error('Logout failed', error);
      router.push('/');
    }
  };

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 h-full border-r border-slate-800 z-50">
      
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-wider text-blue-400">URBAN SECURITY</h1>
        <p className="text-xs text-slate-500 mt-1">OPERATIONS CENTER</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">A</div>
          <div>
            <p className="text-sm font-white">Administrator</p>
            <p className="text-xs text-green-500">● Online</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-900/30 text-red-400 py-2 rounded border border-red-900/50 hover:bg-red-900/50 transition"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );
}