'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import GuardLayout from '../../../components/GuardLayout';
import { resolveApiUrl } from '../../../lib/api-url';
import { resolveAvatarUrl } from '../../../lib/avatar-url';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge from '../../../components/ui/StatusBadge';
import { useToast } from '../../../components/ui/ToastProvider';

type GuardProfile = {
  id: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  avatarUrl?: string | null;
  site?: { name?: string };
};

type ProfileForm = {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const getAvatarKey = (userId: string) => `profile-avatar-${userId}`;

export default function GuardProfilePage() {
  const apiUrl = resolveApiUrl();
  const { showToast } = useToast();

  const [guard, setGuard] = useState<GuardProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const displayAvatarUrl = resolveAvatarUrl(avatarUrl, apiUrl);

  const syncSessionUser = (next: Partial<GuardProfile>) => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return;
    const current = JSON.parse(userRaw);
    localStorage.setItem(
      'user',
      JSON.stringify({
        ...current,
        name: next.name ?? current.name,
        phone: next.phone ?? current.phone,
        email: next.email ?? current.email,
        role: next.role ?? current.role,
        avatarUrl: next.avatarUrl !== undefined ? next.avatarUrl : (current.avatarUrl ?? null)
      })
    );
    window.dispatchEvent(new Event('profile:updated'));
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  };

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return;

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/auth/me`);
        setGuard(res.data);
        setForm({
          name: res.data.name || '',
          phone: res.data.phone || '',
          password: '',
          confirmPassword: ''
        });

        if (res.data.id) {
          const savedAvatar = localStorage.getItem(getAvatarKey(res.data.id)) || '';
          const nextAvatar = res.data.avatarUrl || savedAvatar || '';
          setAvatarUrl(nextAvatar);
        }
      } catch (error) {
        console.error('Failed to load profile', error);
        showToast('Failed to load profile.', 'error');
      }
    };

    fetchProfile();
  }, [apiUrl, showToast]);

  const initials = useMemo(() => {
    if (!form.name.trim()) return 'G';
    return form.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [form.name]);

  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!guard) return;

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file.', 'error');
      return;
    }

    if (file.size > 1024 * 1024) {
      showToast('Image too large. Use a file under 1MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        showToast('Failed to process image.', 'error');
        return;
      }

      try {
        const res = await axios.put(`${apiUrl}/api/auth/me`, { avatarUrl: result });
        setGuard(res.data);
        setAvatarUrl(res.data.avatarUrl || result);
        localStorage.setItem(getAvatarKey(guard.id), res.data.avatarUrl || result);
        syncSessionUser(res.data);
        showToast('Profile photo updated.', 'success');
      } catch (error) {
        console.error(error);
        showToast('Failed to update profile photo.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    if (!guard) return;

    try {
      const res = await axios.put(`${apiUrl}/api/auth/me`, { avatarUrl: '' });
      setGuard(res.data);
      setAvatarUrl('');
      localStorage.removeItem(getAvatarKey(guard.id));
      syncSessionUser({ ...res.data, avatarUrl: null });
      showToast('Profile photo removed.', 'info');
    } catch (error) {
      console.error(error);
      showToast('Failed to remove profile photo.', 'error');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!guard) return;

    if (form.password && form.password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    if (form.password !== form.confirmPassword) {
      showToast('Password confirmation does not match.', 'error');
      return;
    }

    setLoading(true);

    try {
      const payload: { name: string; phone: string; password?: string } = {
        name: form.name.trim(),
        phone: form.phone.trim()
      };

      if (form.password) {
        payload.password = form.password;
      }

      const res = await axios.put(`${apiUrl}/api/auth/me`, payload);
      setGuard(res.data);
      syncSessionUser(res.data);

      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      showToast('Profile updated successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuardLayout>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="My Profile Settings" subtitle="Manage your account, security details, and profile photo." />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              {displayAvatarUrl ? (
                <img src={displayAvatarUrl} alt="Profile" className="h-24 w-24 rounded-full border-4 border-white object-cover shadow" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
                  {initials}
                </div>
              )}

              <h2 className="mt-4 text-lg font-bold text-gray-900">{form.name || 'Security Guard'}</h2>
              <div className="mt-1">
                <StatusBadge label={guard?.role || 'GUARD'} tone="info" />
              </div>

              <div className="mt-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assigned Site</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{guard?.site?.name || 'Unassigned'}</p>
              </div>

              <div className="mt-5 w-full space-y-2">
                <label className="block cursor-pointer rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
                  Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Remove Photo
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">PNG/JPG up to 1MB.</p>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2 md:p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Full Name</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Phone Number</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +254700000000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Email Address</label>
                <input
                  className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 p-3 text-black"
                  value={guard?.email || ''}
                  disabled
                  title="Email cannot be changed"
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-indigo-900">Security</h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="w-full rounded-lg border border-gray-300 p-3 pr-16 text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Leave empty to keep current"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="w-full rounded-lg border border-gray-300 p-3 pr-16 text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        value={form.confirmPassword}
                        onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">Last sync: {new Date().toLocaleString()}</p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 font-semibold text-red-700 transition hover:bg-red-100 sm:w-auto"
                  >
                    Log Out
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-indigo-900 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-60 sm:w-auto"
                  >
                    {loading ? 'Saving Changes...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </GuardLayout>
  );
}
