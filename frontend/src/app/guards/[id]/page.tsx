// frontend/src/app/guards/[id]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';
import { resolveApiUrl } from '../../../lib/api-url';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge, { Tone } from '../../../components/ui/StatusBadge';
import { useToast } from '../../../components/ui/ToastProvider';

export default function GuardProfile({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const apiUrl = resolveApiUrl();
  const { showToast } = useToast();

  // Data State
  const [guard, setGuard] = useState<any>(null);
  const [guardShifts, setGuardShifts] = useState<any[]>([]);
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
        axios.get(`${apiUrl}/api/users/guards/${id}`),
        axios.get(`${apiUrl}/api/sites`)
      ]);
      const shiftsRes = await axios.get(`${apiUrl}/api/shifts`);

      setGuard(guardRes.data);
      setSites(sitesRes.data);
      setGuardShifts((shiftsRes.data || []).filter((shift: any) => shift.userId === id));

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
      // Only send fields expected by backend: siteId should be a string, not an object
      // phone is included and will be saved in the database
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
        siteId: formData.siteId || undefined,
      };
      // Only include role if admin is changing it (add logic if needed)
      // if (formData.role) payload.role = formData.role;

      await axios.put(`${apiUrl}/api/users/guards/${id}`, payload);
      setIsEditing(false); // Turn off edit mode
      fetchData(); // Refresh data to show changes
      showToast('Guard profile updated.', 'success');
    } catch (err) {
      showToast('Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTone = (status: string): Tone => {
    if (status === 'ACTIVE') return 'success';
    if (status === 'INACTIVE') return 'danger';
    if (status === 'COMPLETED') return 'neutral';
    return 'info';
  };

  if (!guard) return <AdminLayout><div className="p-8">Loading Profile...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <PageHeader
          title={guard.name}
          subtitle="Guard profile and activity timeline."
          right={
            <button onClick={() => router.push('/guards')} className="w-full md:w-auto text-sm font-semibold text-blue-700 hover:text-blue-900">
              &larr; Back to Personnel List
            </button>
          }
        />
        
        {/* HEADER CARD (Editable) */}
        <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-200">
          
          {!isEditing ? (
            // --- VIEW MODE ---
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-200 rounded-full flex items-center justify-center text-3xl md:text-4xl text-slate-500 font-bold border-4 border-white shadow-sm">
                  {guard.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{guard.name}</h1>
                  <div className="text-gray-500 mt-2 space-y-1">
                    <p className="flex items-center gap-2">📧 {guard.email}</p>
                    <p className="flex items-center gap-2">📞 {guard.phone || 'No phone number'}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 items-center">
                    <StatusBadge label={guard.status} tone={getStatusTone(guard.status)} />
                    {guard.site ? (
                      <StatusBadge label={`Deployed: ${guard.site.name}`} tone="info" />
                    ) : (
                      <StatusBadge label="Unassigned" tone="neutral" />
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsEditing(true)} 
                className="w-full lg:w-auto bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800 transition shadow flex items-center justify-center gap-2"
              >
                ✎ Edit Profile
              </button>
            </div>
          ) : (
            // --- EDIT MODE ---
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-blue-900">Editing Profile</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                   <button 
                    type="button" 
                    onClick={() => { setIsEditing(false); fetchData(); }} // Cancel reverts changes
                    className="w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input className="w-full border p-2 rounded text-black" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required 
                    placeholder="Full Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input className="w-full border p-2 rounded text-black bg-gray-100" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required 
                    placeholder="Email Address" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input className="w-full border p-2 rounded text-black" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
                    placeholder="Phone Number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                  <select className="w-full border p-2 rounded text-black"
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    title="Employment Status">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive / Suspended</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Site</label>
                   <select className="w-full border p-2 rounded text-black"
                    value={formData.siteId} onChange={e => setFormData({...formData, siteId: e.target.value})}
                    title="Assigned Site">
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
            {(guardShifts || []).length === 0 ? (
              <p className="text-gray-400 italic">No shift history available.</p>
            ) : (
              <div className="space-y-3">
                {(guardShifts || []).map((shift: any) => (
                  <div key={shift.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-bold text-gray-700">{shift.site?.name || 'Unknown Site'}</p>
                      <p className="text-xs text-gray-500">{new Date(shift.startTime).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Check in: {shift.checkedInAt ? new Date(shift.checkedInAt).toLocaleString() : 'Not checked in'}
                      </p>
                      <p className="text-xs text-gray-600">
                        Check out: {shift.checkedOutAt ? new Date(shift.checkedOutAt).toLocaleString() : 'Not checked out'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(shift.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                        {shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'TBD'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Worked: {typeof shift.workedHours === 'number' ? `${shift.workedHours.toFixed(2)}h` : '0.00h'}
                      </p>
                      <StatusBadge label={shift.status} tone={getStatusTone(shift.status)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTORY: INCIDENTS */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">🚨 Reported Incidents</h2>
            {(guard.incidents || []).length === 0 ? (
              <p className="text-gray-400 italic">Clean record. No incidents reported.</p>
            ) : (
              <div className="space-y-3">
                {(guard.incidents || []).map((inc: any) => (
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
          {(guard.reports || []).length === 0 ? (
            <p className="text-gray-400 italic">No logs submitted recently.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(guard.reports || []).map((rep: any) => (
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
