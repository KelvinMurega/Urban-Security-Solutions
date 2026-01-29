// frontend/src/app/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout'; 

export default function ReportsPage() {
  const router = useRouter();
  
  // Data State
  const [reports, setReports] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  
  // Form State
  const [form, setForm] = useState({ content: '', userId: '', siteId: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [repRes, guardRes, siteRes] = await Promise.all([
        axios.get('http://localhost:5000/api/reports'),
        axios.get('http://localhost:5000/api/users/guards'),
        axios.get('http://localhost:5000/api/sites')
      ]);
      setReports(repRes.data);
      setGuards(guardRes.data);
      setSites(siteRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  // 2. Submit Log
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.siteId) {
      alert("Please select both a Site and a Guard.");
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/reports', form);
      
      // Reset form and refresh list
      setForm({ content: '', userId: '', siteId: '' });
      fetchData();
    } catch (err) {
      alert('Error submitting report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📋 Daily Shift Logs</h1>
          <p className="text-gray-500">Review and submit daily activity reports.</p>
        </div>

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
              
              {/* Select Site */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Site Location</label>
                <select 
                  className="w-full border p-2 rounded text-black" 
                  required
                  value={form.siteId} 
                  onChange={e => setForm({...form, siteId: e.target.value})}
                >
                  <option value="">-- Select Site --</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Select Guard */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reporting Officer</label>
                <select 
                  className="w-full border p-2 rounded text-black" 
                  required
                  value={form.userId} 
                  onChange={e => setForm({...form, userId: e.target.value})}
                >
                  <option value="">-- Select Guard --</option>
                  {guards.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
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
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded text-sm">
                        {report.user?.name || 'Unknown Guard'}
                      </span>
                      <span className="text-gray-400 text-sm">reported at</span>
                      <span className="font-semibold text-gray-700">
                        {report.site?.name || 'Unknown Site'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
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