'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import GuardLayout from '../../../components/GuardLayout';
import { resolveApiUrl } from '../../../lib/api-url';

type GuardProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  site?: { name?: string };
};

export default function GuardProfilePage() {
  const apiUrl = resolveApiUrl();
  const [guard, setGuard] = useState<GuardProfile | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return;

    const user = JSON.parse(userRaw) as { id: string };

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/users/guards/${user.id}`);
        setGuard(res.data);
        setForm({
          name: res.data.name || '',
          phone: res.data.phone || '',
          password: ''
        });
      } catch (error) {
        console.error('Failed to load profile', error);
      }
    };

    fetchProfile();
  }, [apiUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guard) return;

    setLoading(true);
    setMessage('');
    try {
      const payload: { name: string; phone: string; password?: string } = {
        name: form.name,
        phone: form.phone
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const res = await axios.put(`${apiUrl}/api/users/guards/${guard.id}`, payload);
      setGuard(res.data);

      const userRaw = localStorage.getItem('user');
      if (userRaw) {
        const current = JSON.parse(userRaw);
        localStorage.setItem('user', JSON.stringify({ ...current, name: res.data.name }));
      }

      setForm((prev) => ({ ...prev, password: '' }));
      setMessage('Profile updated successfully.');
    } catch (error) {
      console.error(error);
      setMessage('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuardLayout>
      <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Manage your personal details.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-gray-500">Assigned Site</p>
            <p className="font-semibold text-gray-900">{guard?.site?.name || 'Unassigned'}</p>
          </div>

          {message && (
            <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm rounded p-3">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                className="w-full border p-2 rounded text-black"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="w-full border p-2 rounded text-black bg-gray-100" value={guard?.email || ''} disabled />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="w-full border p-2 rounded text-black"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
              <input
                type="password"
                className="w-full border p-2 rounded text-black"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded font-semibold hover:bg-indigo-700 transition"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </GuardLayout>
  );
}
