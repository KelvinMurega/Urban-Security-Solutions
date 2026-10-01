'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react';
import { resolveApiUrl } from '../../../lib/api-url';

export default function ClientLoginPage() {
  const router = useRouter();
  const apiUrl = resolveApiUrl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        email: email.trim().toLowerCase(),
        password,
      });
      const { token, user } = response.data || {};

      if (user?.role !== 'CLIENT' || !token) {
        await axios.post(`${apiUrl}/api/auth/logout`).catch(() => undefined);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setError('This sign-in is for client accounts. Please check your account or contact your administrator.');
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      router.replace('/client/dashboard');
    } catch (loginError: unknown) {
      if (axios.isAxiosError(loginError)) {
        setError(loginError.response?.data?.error || 'We could not sign you in. Check your email and password.');
      } else {
        setError('We could not sign you in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f2f4f0] text-[#17231f]">
      <header className="flex h-[72px] items-center justify-between border-b border-[#dce2da] bg-white px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Urban Security Solutions sign-in options">
          <span className="grid h-9 w-9 place-items-center bg-[#17231f] text-[#d8f477]"><ShieldCheck className="h-5 w-5" /></span>
          <span className="leading-none"><span className="block text-sm font-bold tracking-wide">URBAN SECURITY</span><span className="mt-1 block text-[9px] font-semibold uppercase tracking-[.17em] text-[#6f7b72]">Solutions Limited</span></span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#56645b] transition hover:text-[#17231f]"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Staff sign in</span><span className="sm:hidden">Staff</span></Link>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl md:grid-cols-[1.05fr_.95fr]">
        <section className="relative flex min-h-[250px] flex-col justify-between overflow-hidden bg-[#17231f] px-6 py-8 text-white sm:px-10 md:min-h-0 md:px-14 md:py-14">
          <div className="absolute -right-24 bottom-[-170px] h-[390px] w-[390px] rounded-full border border-[#d8f477]/20" aria-hidden="true"><span className="absolute inset-8 rounded-full border border-[#d8f477]/15" /><span className="absolute inset-16 rounded-full border border-[#ec795f]/30" /></div>
          <p className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#c3cec6]"><span className="h-1.5 w-1.5 rounded-full bg-[#d8f477]" /> Client access</p>
          <div className="relative mt-10 md:mt-0">
            <h1 className="font-[family-name:var(--font-geist-sans)] text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Your sites.<br /><span className="text-[#d8f477]">Clear in view.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-[#c0cbc3]">See site activity, attendance, reports and invoices in one secure place.</p>
          </div>
          <p className="relative mt-8 text-[10px] font-semibold uppercase tracking-[.15em] text-[#90a095] md:mt-12">People-first security. Clear accountability.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 md:px-12 lg:px-20">
          <div className="w-full max-w-md">
            <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#6b8050]">Client portal</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back</h2>
            <p className="mt-2 text-sm text-[#68746c]">Sign in to view the security services for your sites.</p>

            {error && <div role="alert" className="mt-6 border-l-2 border-[#cf654e] bg-[#fff6f2] px-4 py-3 text-sm leading-5 text-[#803c2c]">{error}</div>}

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label htmlFor="client-email" className="mb-2 block text-xs font-semibold text-[#35433a]">Email address</label>
                <input id="client-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="h-12 w-full border border-[#cdd5cc] bg-white px-3 text-sm text-[#17231f] outline-none transition placeholder:text-[#929c94] focus:border-[#73884e] focus:ring-2 focus:ring-[#d8f477]/50" />
              </div>

              <div>
                <label htmlFor="client-password" className="mb-2 block text-xs font-semibold text-[#35433a]">Password</label>
                <div className="relative">
                  <input id="client-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-12 w-full border border-[#cdd5cc] bg-white px-3 pr-12 text-sm text-[#17231f] outline-none transition placeholder:text-[#929c94] focus:border-[#73884e] focus:ring-2 focus:ring-[#d8f477]/50" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#647067] hover:text-[#17231f]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </div>

              <button type="submit" disabled={loading || !email.trim() || !password} className="flex h-12 w-full items-center justify-between bg-[#17231f] px-4 text-sm font-semibold text-white transition hover:bg-[#30443b] disabled:cursor-not-allowed disabled:opacity-55">
                <span>{loading ? 'Signing in…' : 'Sign in to client portal'}</span>
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span aria-hidden="true">↗</span>}
              </button>
            </form>

            <p className="mt-6 border-t border-[#dce2da] pt-5 text-xs leading-5 text-[#758078]">Need access? Contact your Urban Security account administrator to set up your client account.</p>
            <p className="mt-5 text-center text-xs text-[#7c877f]">Not a client? <Link href="/" className="font-semibold text-[#435d37] underline decoration-[#9aab83] underline-offset-4 hover:text-[#17231f]">Go to staff sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}