'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, LayoutDashboard, LogOut, ReceiptText, ShieldCheck } from 'lucide-react';
import { resolveApiUrl } from '../lib/api-url';

const navigation = [
  { href: '/client/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/client/activity', label: 'Site activity', icon: Activity },
  { href: '/client/invoices', label: 'Invoices', icon: ReceiptText },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const apiUrl = resolveApiUrl();
  const [clientName, setClientName] = useState('');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.replace('/');
      return;
    }

    try {
      const user = JSON.parse(storedUser) as { role?: string; name?: string };
      if (user.role !== 'CLIENT') {
        router.replace(user.role === 'GUARD' ? '/guard/dashboard' : '/dashboard');
        return;
      }
      setClientName(user.name || 'Client');
      setAuthorized(true);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/');
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await axios.post(`${apiUrl}/api/auth/logout`);
    } catch {
      // Clear the local session even if the API is unavailable.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/');
  };

  if (!authorized) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f2f4f0] text-sm text-gray-500">Loading your client portal…</div>;
  }

  const links = navigation.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || (href !== '/client/dashboard' && pathname.startsWith(href));
    return (
      <Link key={href} href={href} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-[#d8f477] text-[#17231f]' : 'text-[#c0cbc3] hover:bg-white/10 hover:text-white'}`}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  });

  return (
    <div className="min-h-screen bg-[#f2f4f0] text-[#17231f]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#17231f] text-white md:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center bg-[#d8f477] text-[#17231f]"><ShieldCheck className="h-5 w-5" /></span>
            <div><p className="text-sm font-bold tracking-wide">URBAN SECURITY</p><p className="mt-0.5 text-[10px] uppercase tracking-[.16em] text-[#9eaca2]">Client portal</p></div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">{links}</nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate px-3 pb-3 text-xs text-[#b9c5bc]">{clientName}</p>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#c0cbc3] transition hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" />Log out</button>
        </div>
      </aside>

      <div className="md:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#dce2da] bg-white/95 px-4 backdrop-blur sm:px-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#74816f]">Urban Security Solutions</p><p className="text-sm font-semibold md:hidden">Client portal</p></div>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-gray-600 sm:inline">{clientName}</span><button onClick={handleLogout} aria-label="Log out" className="grid h-9 w-9 place-items-center rounded-md border border-[#dce2da] text-gray-600 hover:bg-gray-50 md:hidden"><LogOut className="h-4 w-4" /></button></div>
        </header>
        <div className="pb-24 md:pb-8">{children}</div>
      </div>

      <nav aria-label="Client portal navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-[#dce2da] bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/client/dashboard' && pathname.startsWith(href));
          return <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-1 text-[10px] font-semibold ${active ? 'text-[#334c39]' : 'text-gray-500'}`}><Icon className="h-5 w-5" /><span>{label}</span></Link>;
        })}
      </nav>
    </div>
  );
}