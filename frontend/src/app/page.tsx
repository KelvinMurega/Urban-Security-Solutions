// frontend/src/app/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use environment variables for API URLs for better flexibility
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${apiUrl}/api/auth/login`, {
        email,
        password
      });

      const { token, user: userData } = res.data;

      // The backend should always return a token and user object on success.
      // Fail safely instead of making assumptions about user data.
      if (!token || !userData?.role) {
        setError('Login failed: No token received from server.');
        return;
      }

      // 1. Save Token & User Data
      // SECURITY NOTE: Storing tokens in localStorage is vulnerable to XSS attacks.
      // For production apps, consider using httpOnly cookies set by the server.
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      console.log("Login Success. Role:", userData.role);

      // 2. Redirect based on Role
      // localStorage.setItem is synchronous, so no timeout is needed.
      if (userData.role === 'GUARD') {
        router.push('/guard/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">URBAN SECURITY</h1>
          <p className="text-gray-500 mt-2">Personnel Login</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
            <input 
              id="email"
              type="email" 
              required
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-900 outline-none transition"
              placeholder="name@urbansecurity.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input 
              id="password"
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
          Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}