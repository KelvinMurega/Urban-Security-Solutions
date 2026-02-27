// frontend/src/app/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout'; 
import { resolveApiUrl } from '../../lib/api-url';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/ToastProvider';

export default function ReportsPage() {
  const apiUrl = resolveApiUrl();
  const { showToast } = useToast();
  
  // Data State
  const [reports, setReports] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  
  // Form State
  const [form, setForm] = useState({ content: '', userId: '', shiftId: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [repRes, guardRes, shiftRes] = await Promise.all([
        axios.get(`${apiUrl}/api/reports`),
        axios.get(`${apiUrl}/api/users/guards`),
        axios.get(`${apiUrl}/api/shifts`)
      ]);
      setReports(repRes.data);
      setGuards(guardRes.data);
      setShifts(shiftRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Failed to load reports data.', 'error');
    }
  };

  // 2. Submit Log
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.shiftId) {
      showToast('Please select a shift before submitting.', 'info');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${apiUrl}/api/reports`, form);
      
      // Reset form and refresh list
      setForm({ content: '', userId: '', shiftId: '' });
      fetchData();
      showToast('Report submitted.', 'success');
    } catch (err) {
      showToast('Error submitting report. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        
        <PageHeader
          title="Daily Shift Logs"
          subtitle="Review and submit daily activity reports."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* LEFT: Submission Form */}
          <div className="bg-white p-6 rounded-lg shadow-md h-fit border-t-4 border-teal-600">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Submit New Log</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Log Content */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Log Details</label>
                <textarea 
                  placeholder="e.g. Completed perimeter check. North gate secure. No unusual activity."
                  className="w-full border p-2 rounded text-black h-32 focus:ring-2 focus:ring-teal-500 outline-none"
                  value={form.content} 
                  onChange={e => setForm({...form, content: e.target.value})} 
                  required
                />
              </div>
              
              {/* Select Shift */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Shift</label>
                <select 
                  className="w-full border p-2 rounded text-black" 
                  required
                  value={form.shiftId} 
                  onChange={e => {
                    const shiftId = e.target.value;
                    const selectedShift = shifts.find((s) => s.id === shiftId);
                    setForm({
                      ...form,
                      shiftId,
                      userId: selectedShift?.userId || ''
                    });
                  }}
                >
                  <option value="">-- Select Shift --</option>
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>
                      {(s.site?.name || 'Unknown Site')} - {(s.user?.name || 'Unknown Guard')} - {new Date(s.startTime).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>Reporting Officer:</span>
                <StatusBadge label={guards.find((g) => g.id === form.userId)?.name || 'Select shift first'} tone="info" />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700 font-bold shadow transition"
              >
                {loading ? 'Submitting...' : 'Submit Log Entry'}
              </button>
            </form>
          </div>

          {/* RIGHT: Log History Feed */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Recent Logs</h2>
            
            {reports.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center text-gray-400">
                <p>No logs have been submitted yet today.</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded text-sm">
                        {report.user?.name || 'Unknown Guard'}
                      </span>
                      <span className="text-gray-400 text-sm">reported at</span>
                      <span className="font-semibold text-gray-700">
                        {report.shift?.site?.name || 'Unknown Site'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded self-start sm:self-auto">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-800 leading-relaxed border-l-2 border-gray-200 pl-3">
                    {report.content}
                  </p>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
