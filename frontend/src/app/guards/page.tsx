// frontend/src/app/guards/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';

export default function GuardsPage() {
  const router = useRouter();
  const [guards, setGuards] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', siteId: '', status: 'ACTIVE' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [guardsRes, sitesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/users/guards'),
        axios.get('http://localhost:5000/api/sites')
      ]);
      setGuards(guardsRes.data);
      setSites(sitesRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (guard: any) => {
    setEditingId(guard.id);
    setForm({
      name: guard.name,
      email: guard.email,
      password: '',
      phone: guard.phone || '',
      siteId: guard.siteId || '',
      status: guard.status || 'ACTIVE'
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setForm({ name: '', email: '', password: '', phone: '', siteId: '', status: 'ACTIVE' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, siteId: form.siteId || undefined };

      if (editingId) {
        await axios.put(`http://localhost:5000/api/users/guards/${editingId}`, payload);
      } else {
        await axios.post('http://localhost:5000/api/users/guards', payload);
      }

      setForm({ name: '', email: '', password: '', phone: '', siteId: '', status: 'ACTIVE' });
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert('Operation failed. Check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Personnel</h1>
            <p className="text-gray-500">Manage your workforce</p>
          </div>
          {/* Removed "Back to Dashboard" button since we have Sidebar now */}
          <div className="space-x-4">
            <button onClick={handleAddNew} className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
              {showForm && !editingId ? 'Cancel' : '+ Hire New Guard'}
            </button>
          </div>
        </div>

        {/* Form Area */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-2 border-blue-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingId ? 'Edit Guard Details' : 'New Guard Details'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Full Name" className="border p-2 rounded text-black"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />

              <input placeholder="Email Address" type="email" className="border p-2 rounded text-black"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />

              <input placeholder="Phone Number" className="border p-2 rounded text-black"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />

              <input placeholder={editingId ? "Reset Password (Optional)" : "Password"} type="password"
                className="border p-2 rounded text-black"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required={!editingId}
              />

              <select className="border p-2 rounded text-black"
                value={form.siteId} onChange={e => setForm({ ...form, siteId: e.target.value })}>
                <option value="">-- No Site Assigned --</option>
                {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>

              <select className="border p-2 rounded text-black"
                value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">✅ Active Employee</option>
                <option value="INACTIVE">❌ Inactive / Fired</option>
              </select>

              <button type="submit" disabled={loading}
                className="bg-green-600 text-white p-2 rounded hover:bg-green-700 md:col-span-2 font-bold">
                {loading ? 'Saving...' : (editingId ? 'Update Guard' : 'Create Guard Profile')}
              </button>
            </form>
          </div>
        )}

        {/* List Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Site</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {guards.map((guard) => (
                <tr key={guard.id} className="hover:bg-gray-50 transition">

                  {/* 1. Name Column (Clickable) */}
                  <td className="px-6 py-4">
                    <div
                      onClick={() => router.push(`/guards/${guard.id}`)}
                      className="font-bold text-indigo-600 hover:text-indigo-900 cursor-pointer hover:underline text-lg"
                    >
                      {guard.name}
                    </div>
                    <div className="text-sm text-gray-500">{guard.email}</div>
                  </td>

                  {/* 2. Site Column */}
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {guard.site ? guard.site.name : 'Unassigned'}
                  </td>

                  {/* 3. Status Column */}
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${guard.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {guard.status || 'ACTIVE'}
                    </span>
                  </td>

                  {/* 4. Action Column (UPDATED) */}
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => router.push(`/guards/${guard.id}`)} // <--- NOW GOES TO PROFILE
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded border border-indigo-200 hover:bg-indigo-100 transition"
                    >
                      View / Edit
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </AdminLayout>
  );
}