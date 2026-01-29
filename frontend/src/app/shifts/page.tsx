// frontend/src/app/shifts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';

export default function ShiftsPage() {
  const router = useRouter();
  
  // Data State
  const [shifts, setShifts] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    siteId: '',
    startTime: '',
    endTime: ''
  });

  // 1. Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [shiftRes, guardRes, siteRes] = await Promise.all([
        axios.get('http://localhost:5000/api/shifts'),
        axios.get('http://localhost:5000/api/users/guards'),
        axios.get('http://localhost:5000/api/sites')
      ]);
      setShifts(shiftRes.data);
      setGuards(guardRes.data);
      setSites(siteRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Create Shift
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      return alert("End time must be after Start time.");
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/shifts', {
        userId: form.userId,
        siteId: form.siteId,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
      
      setShowModal(false);
      setForm({ userId: '', siteId: '', startTime: '', endTime: '' });
      fetchData(); // Refresh list
    } catch (err) {
      alert('Failed to create shift. Check overlapping times.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Format Date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper: Get Shift Status Color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-gray-100 text-gray-500';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200'; // UPCOMING
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto relative">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📅 Shift Schedule</h1>
            <p className="text-gray-500">Manage guard assignments and rosters.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition shadow flex items-center gap-2"
          >
            <span>+</span> Assign Shift
          </button>
        </div>

        {/* Shift List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {shifts.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No shifts scheduled. Click "Assign Shift" to create the roster.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Officer</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Time Schedule</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{shift.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-400">ID: {shift.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {shift.site?.name || 'Unknown Site'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">
                        {formatDate(shift.startTime)}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {formatDate(shift.endTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(shift.status)}`}>
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* --- CREATE SHIFT MODAL --- */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">Assign New Shift</h2>
              
              <form onSubmit={handleCreate} className="space-y-4">
                
                {/* 1. Select Guard */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Select Officer</label>
                  <select 
                    className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={form.userId} 
                    onChange={e => setForm({...form, userId: e.target.value})}
                    required
                  >
                    <option value="">-- Choose Guard --</option>
                    {guards.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.status})</option>
                    ))}
                  </select>
                </div>

                {/* 2. Select Site */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Select Location</label>
                  <select 
                    className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={form.siteId} 
                    onChange={e => setForm({...form, siteId: e.target.value})}
                    required
                  >
                    <option value="">-- Choose Site --</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                    <input 
                      type="datetime-local"
                      className="w-full border p-2 rounded text-black"
                      value={form.startTime}
                      onChange={e => setForm({...form, startTime: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                    <input 
                      type="datetime-local"
                      className="w-full border p-2 rounded text-black"
                      value={form.endTime}
                      onChange={e => setForm({...form, endTime: e.target.value})}
                      required
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-6 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 font-bold shadow"
                  >
                    {loading ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}