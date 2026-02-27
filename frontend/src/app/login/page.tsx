// frontend/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { resolveApiUrl } from '../../lib/api-url';

export default function LoginPage() {
  const router = useRouter();
  const apiUrl = resolveApiUrl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.status === 200) {
        const { token, user } = response.data || {};
        if (token) {
          localStorage.setItem('token', token);
        }
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Unable to sign in. Check your credentials.');
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.25),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.18),transparent_35%),linear-gradient(160deg,#020617_0%,#0f172a_50%,#111827_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
        <div className="grid w-full overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-2xl backdrop-blur md:grid-cols-2">
          <div className="hidden bg-slate-900 p-10 text-white md:flex md:flex-col md:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                Security Operations
              </p>
              <h1 className="mt-6 text-3xl font-bold leading-tight">
                Urban Security Solutions
              </h1>
              <p className="mt-3 max-w-sm text-sm text-slate-300">
                Access your command center, monitor site activity, and coordinate shift operations.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Live shift visibility</p>
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Incident and guard tracking</p>
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Role-based access control</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 md:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-600">Authorized personnel only</p>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-black shadow-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-20 text-black shadow-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password.trim()}
                className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
