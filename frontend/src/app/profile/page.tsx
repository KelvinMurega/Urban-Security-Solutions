'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { resolveApiUrl } from '../../lib/api-url';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/ToastProvider';

type LocalUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
};

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const getAvatarKey = (userId: string) => `profile-avatar-${userId}`;

export default function ProfilePage() {
  const router = useRouter();
  const apiUrl = resolveApiUrl();
  const { showToast } = useToast();

  const [user, setUser] = useState<LocalUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const parsed = JSON.parse(storedUser) as LocalUser;
    setUser(parsed);
    setForm({
      name: parsed.name || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      password: '',
      confirmPassword: ''
    });

    const savedAvatar = localStorage.getItem(getAvatarKey(parsed.id)) || '';
    setAvatarUrl(savedAvatar);
  }, [router]);

  const initials = useMemo(() => {
    if (!form.name.trim()) return 'A';
    return form.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [form.name]);

  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;

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
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        showToast('Failed to process image.', 'error');
        return;
      }

      localStorage.setItem(getAvatarKey(user.id), result);
      setAvatarUrl(result);
      window.dispatchEvent(new Event('profile:updated'));
      showToast('Profile photo updated.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    if (!user) return;

    localStorage.removeItem(getAvatarKey(user.id));
    setAvatarUrl('');
    window.dispatchEvent(new Event('profile:updated'));
    showToast('Profile photo removed.', 'info');
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();

    if (form.password && form.password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    if (form.password !== form.confirmPassword) {
      showToast('Password confirmation does not match.', 'error');
      return;
    }

    if (!user) return;

    setLoading(true);

    try {
      const payload: { name: string; email: string; phone: string; password?: string } = {
        name: form.name.trim(),
        email: form.email,
        phone: form.phone.trim()
      };

      if (form.password) {
        payload.password = form.password;
      }

      const res = await axios.put(`${apiUrl}/api/users/guards/${user.id}`, payload);

      const updatedUser: LocalUser = {
        ...user,
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone || ''
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      window.dispatchEvent(new Event('profile:updated'));
      showToast('Profile updated successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="My Profile Settings" subtitle="Manage your account, security details, and profile photo." />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-24 w-24 rounded-full border-4 border-white object-cover shadow" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
                  {initials}
                </div>
              )}

              <h2 className="mt-4 text-lg font-bold text-gray-900">{form.name || 'Administrator'}</h2>
              <div className="mt-1">
                <StatusBadge label={user.role || 'Administrator'} tone="info" />
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
            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Full Name</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Phone Number</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +254700000000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Email Address</label>
                <input
                  className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 p-3 text-black"
                  value={form.email}
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
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-indigo-900 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-60 sm:w-auto"
                >
                  {loading ? 'Saving Changes...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
