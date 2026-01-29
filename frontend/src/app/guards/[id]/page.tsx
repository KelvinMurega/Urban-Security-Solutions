// frontend/src/app/guards/[id]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';

export default function GuardProfile({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  // Data State
  const [guard, setGuard] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]); // Need sites for the dropdown
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', status: '', siteId: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch Guard Data AND Sites (for the dropdown)
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [guardRes, sitesRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/users/guards/${id}`),
        axios.get('http://localhost:5000/api/sites')
      ]);
      setGuard(guardRes.data);
      setSites(sitesRes.data);

      // Prepare Form Data in case they want to edit
      setFormData({
        name: guardRes.data.name,
        email: guardRes.data.email,
        phone: guardRes.data.phone || '',
        status: guardRes.data.status,
        siteId: guardRes.data.siteId || ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Handle Update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Send Update to Backend
      await axios.put(`http://localhost:5000/api/users/guards/${id}`, formData);
      setIsEditing(false); // Turn off edit mode
      fetchData(); // Refresh data to show changes
    } catch (err) {
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!guard) return <AdminLayout><div className="p-8">Loading Profile...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => router.push('/guards')} className="hover:text-blue-600 hover:underline">
            &larr; Back to Personnel List
          </button>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{guard.name}</span>
        </div>
        
        {/* HEADER CARD (Editable) */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          
          {!isEditing ? (
            // --- VIEW MODE ---
            <div className="flex justify-between items-start">
              <div className="flex gap-6">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center text-4xl text-slate-500 font-bold border-4 border-white shadow-sm">
                  {guard.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{guard.name}</h1>
                  <div className="text-gray-500 mt-2 space-y-1">
                    <p className="flex items-center gap-2">📧 {guard.email}</p>
                    <p className="flex items-center gap-2">📞 {guard.phone || 'No phone number'}</p>
                  </div>
                  <div className="mt-4 flex gap-3 items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      guard.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {guard.status}
                    </span>
                    {guard.site ? (
                       <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        📍 Deployed at: {guard.site.name}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsEditing(true)} 
                className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800 transition shadow flex items-center gap-2"
              >
                ✎ Edit Profile
              </button>
            </div>
          ) : (
            // --- EDIT MODE ---
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-blue-900">Editing Profile</h2>
                <div className="flex gap-2">
                   <button 
                    type="button" 
                    onClick={() => { setIsEditing(false); fetchData(); }} // Cancel reverts changes
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input className="w-full border p-2 rounded text-black" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input className="w-full border p-2 rounded text-black bg-gray-100" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input className="w-full border p-2 rounded text-black" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                  <select className="w-full border p-2 rounded text-black"
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive / Suspended</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Site</label>
                   <select className="w-full border p-2 rounded text-black"
                    value={formData.siteId} onChange={e => setFormData({...formData, siteId: e.target.value})}>
                    <option value="">-- Unassigned --</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                   <p className="text-xs text-gray-500 mt-1">Changing this will immediately re-deploy the guard.</p>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* HISTORY: SHIFTS */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📅 Recent Shifts</h2>
            {guard.shifts.length === 0 ? (
              <p className="text-gray-400 italic">No shift history available.</p>
            ) : (
              <div className="space-y-3">
                {guard.shifts.map((shift: any) => (
                  <div key={shift.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-bold text-gray-700">{shift.site.name}</p>
                      <p className="text-xs text-gray-500">{new Date(shift.startTime).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(shift.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                        {new Date(shift.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </p>
                      <span className="text-xs text-green-600 font-bold">{shift.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTORY: INCIDENTS */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">🚨 Reported Incidents</h2>
            {guard.incidents.length === 0 ? (
              <p className="text-gray-400 italic">Clean record. No incidents reported.</p>
            ) : (
              <div className="space-y-3">
                {guard.incidents.map((inc: any) => (
                  <div key={inc.id} className="p-3 border-l-4 border-red-500 bg-red-50 rounded">
                    <div className="flex justify-between">
                      <h3 className="font-bold text-red-900">{inc.title}</h3>
                      <span className="text-xs text-red-700 font-mono">{new Date(inc.reportedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-red-800 mt-1 truncate">{inc.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RECENT LOGS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📋 Daily Log Entries</h2>
          {guard.reports.length === 0 ? (
            <p className="text-gray-400 italic">No logs submitted recently.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guard.reports.map((rep: any) => (
                <div key={rep.id} className="bg-slate-50 p-4 rounded text-sm text-slate-700">
                  <p className="mb-2 italic">"{rep.content}"</p>
                  <p className="text-xs text-slate-400 text-right">{new Date(rep.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}