// frontend/src/app/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Form State
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Load User Data on Mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setForm({ 
        name: parsed.name, 
        email: parsed.email, 
        password: '' // Start with empty password
      });
    } else {
      router.push('/'); // Kick out if not logged in
    }
  }, [router]);

  // 2. Handle Update Submission
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Build the payload
      const payload: any = { name: form.name, email: form.email };
      
      // Only include password if the user actually typed something
      if (form.password) {
        payload.password = form.password;
      }

      // Send to backend
      const res = await axios.put(`http://localhost:5000/api/users/guards/${user.id}`, payload);
      
      // Update Local Storage with new details (so the sidebar updates immediately)
      const updatedUser = { ...user, name: res.data.name, email: res.data.email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Success feedback
      setMessage('✅ Profile updated successfully!');
      setForm({ ...form, password: '' }); // Clear password field for security
      setUser(updatedUser); // Update local state
    } catch (err) {
      console.error(err);
      setMessage('❌ Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile Settings</h1>

        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
          
          {/* Header Section */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-700 uppercase">
              {user.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
              <p className="text-gray-500">{user.role || 'Administrator'}</p>
            </div>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`p-4 rounded mb-6 text-center font-bold ${
              message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <input 
                className="w-full border p-3 rounded text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <input 
                className="w-full border p-3 rounded text-black bg-gray-100 cursor-not-allowed"
                value={form.email}
                disabled 
                title="Email cannot be changed"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4">
              <label className="block text-sm font-bold text-indigo-900 mb-2">Change Password</label>
              <input 
                type="password"
                placeholder="Type new password here (leave empty to keep current)"
                className="w-full border p-3 rounded text-black focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a new password only if you want to change it.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-900 text-white py-3 rounded font-bold hover:bg-indigo-800 transition shadow-lg mt-4"
            >
              {loading ? 'Saving Changes...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}