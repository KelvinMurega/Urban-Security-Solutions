// frontend/src/app/page.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      console.log("Login Response:", res.data); // Debugging log

      // 1. Save Token
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      } else {
        throw new Error("No token received");
      }

      // 2. Save User (Safely)
      // We check if 'user' exists and is an object before stringifying
      if (res.data.user && typeof res.data.user === 'object') {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } else {
        // Fallback if backend sends weird structure
        localStorage.setItem('user', JSON.stringify({ name: 'Admin', email: email }));
      }

      // 3. Redirect
      // Small delay to ensure storage is saved
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);

    } catch (err: any) {
      console.error("Login Error:", err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">URBAN SECURITY</h1>
          <p className="text-gray-500 mt-2">Operations Command Login</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-900 outline-none transition"
              placeholder="admin@urbansecurity.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-900 outline-none transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-900 text-white py-3 rounded font-bold hover:bg-blue-800 transition duration-200"
          >
            {loading ? 'Authenticating...' : 'Access System'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-xs text-gray-400">
          Restricted Access. Unauthorized attempts are logged.
        </p>
      </div>
    </div>
  );
}