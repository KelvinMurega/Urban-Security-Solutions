// frontend/src/app/incidents/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';

export default function IncidentsPage() {
  // Data State
  const [incidents, setIncidents] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  // UI State
  const [filterSiteId, setFilterSiteId] = useState('ALL');
  const [showLogModal, setShowLogModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

  // Forms & Selection
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', severity: 'LOW', userId: '', siteId: ''
  });
  const [loading, setLoading] = useState(false);

  // FIX: Date State to prevent Hydration Error
  const [printDate, setPrintDate] = useState('');

  useEffect(() => {
    fetchData();
    // Set the date ONLY on the client side
    setPrintDate(new Date().toLocaleDateString());
  }, []);

  const fetchData = async () => {
    try {
      const [incRes, guardRes, siteRes] = await Promise.all([
        axios.get('http://localhost:5000/api/incidents'),
        axios.get('http://localhost:5000/api/users/guards'),
        axios.get('http://localhost:5000/api/sites')
      ]);
      setIncidents(incRes.data);
      setGuards(guardRes.data);
      setSites(siteRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // --- ACTIONS ---

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/incidents', form);
      setForm({ title: '', description: '', severity: 'LOW', userId: '', siteId: '' });
      setShowLogModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to log incident');
    } finally {
      setLoading(false);
    }
  };

  const submitResolution = async () => {
    if (!resolutionText.trim()) return alert("Please enter resolution details.");
    setLoading(true);
    try {
      await axios.put(`http://localhost:5000/api/incidents/${selectedIncident.id}`, {
        status: 'RESOLVED',
        resolutionDetails: resolutionText
      });
      setShowResolveModal(false);
      setSelectedIncident(null);
      fetchData();
    } catch (err) {
      alert('Failed to resolve');
    } finally {
      setLoading(false);
    }
  };

  // --- FILTERS ---

  const filteredIncidents = filterSiteId === 'ALL'
    ? incidents
    : incidents.filter(i => i.siteId === filterSiteId);

  const selectedSiteName = filterSiteId === 'ALL'
    ? 'All Monitored Locations'
    : sites.find(s => s.id === filterSiteId)?.name || 'Unknown Site';

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">

        {/* --- SCREEN HEADER (Hidden on Print) --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Incident Management</h1>
            <p className="text-gray-500">Track, resolve, and report security breaches.</p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <select
              className="border p-2 rounded text-gray-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={filterSiteId}
              onChange={(e) => setFilterSiteId(e.target.value)}
            >
              <option value="ALL">Show All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <button
              onClick={() => setShowLogModal(true)}
              className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 transition shadow font-bold"
            >
              + Log Incident
            </button>

            <button
              onClick={() => window.print()}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-black transition shadow flex items-center gap-2"
            >
              🖨️ Print Report
            </button>
          </div>
        </div>

        {/* --- SCREEN CONTENT --- */}
        <div className="grid gap-6 no-print">
          {filteredIncidents.length === 0 ? (
            <div className="text-center p-12 bg-gray-50 rounded-lg text-gray-400 border border-dashed border-gray-300">
              No incidents found for this selection.
            </div>
          ) : (
            filteredIncidents.map((inc) => (
              <div key={inc.id} className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${inc.status === 'RESOLVED' ? 'border-green-500' : 'border-red-500'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${inc.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-800'}`}>
                        {inc.severity}
                      </span>
                      {inc.status === 'RESOLVED' && <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded">RESOLVED</span>}
                      <span className="text-xs text-gray-400">{new Date(inc.reportedAt).toLocaleString()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{inc.title}</h3>
                    <p className="text-gray-600 mt-1">{inc.description}</p>

                    {inc.resolutionDetails && (
                      <div className="mt-3 bg-green-50 p-3 rounded border border-green-100 text-sm">
                        <span className="font-bold text-green-800">Action Taken: </span>
                        <span className="text-green-900">{inc.resolutionDetails}</span>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-400 flex gap-4">
                      <span>📍 {inc.site?.name}</span>
                      <span>👮 {inc.user?.name}</span>
                    </div>
                  </div>

                  {inc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => { setSelectedIncident(inc); setShowResolveModal(true); }}
                      className="ml-4 text-sm bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 font-medium"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- PRINTABLE REPORT --- */}
        <div id="printable-area" className="print-only">

          {/* Professional Letterhead Header */}
          <div className="mb-8 text-center border-b-4 border-black pb-4">
            <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">Urban Security Solutions</h1>
            <h2 className="text-xl font-semibold text-gray-800">Official Incident Report Log</h2>
          </div>

          {/* Report Meta Data */}
          <div className="flex justify-between items-end mb-6 border-b border-gray-400 pb-4 font-sans">
            <div>
              <p className="text-sm text-gray-600 uppercase tracking-wide">Assignment Location</p>
              <p className="text-xl font-bold">{selectedSiteName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 uppercase tracking-wide">Date Generated</p>
              <p className="text-xl font-bold">{printDate}</p>
            </div>
          </div>

          {/* Professional Table with DEFINED WIDTHS */}
          <table className="w-full">
            <thead>
              <tr className="bg-gray-200">
                {/* 1. Date: Narrow (12%) */}
                <th style={{ width: '12%' }}>Date & Time</th>

                {/* 2. Severity: Very Narrow (8%) */}
                <th style={{ width: '8%' }}>Level</th>

                {/* 3. Details: Wide (30%) */}
                <th style={{ width: '30%' }}>Incident Details</th>

                {/* 4. Resolution: Wide (35%) */}
                <th style={{ width: '35%' }}>Action Taken / Resolution</th>

                {/* 5. Officer: Narrow (15%) */}
                <th style={{ width: '15%' }}>Officer</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => (
                <tr key={inc.id}>
                  <td className="font-mono text-sm">
                    {new Date(inc.reportedAt).toLocaleDateString()}<br />
                    <span className="text-gray-600">{new Date(inc.reportedAt).toLocaleTimeString()}</span>
                  </td>

                  <td>
                    <span className={`font-bold text-xs px-1 border rounded ${inc.severity === 'CRITICAL' ? 'border-black' : 'border-transparent'
                      }`}>
                      {inc.severity}
                    </span>
                  </td>

                  <td>
                    <strong className="block mb-1 underline">{inc.title}</strong>
                    <span className="text-sm leading-snug">{inc.description}</span>
                  </td>

                  <td className="bg-gray-50">
                    {inc.status === 'RESOLVED' ? (
                      <span className="text-sm leading-snug">{inc.resolutionDetails || 'Resolved (No details logged)'}</span>
                    ) : (
                      <span className="font-bold">OPEN / PENDING</span>
                    )}
                  </td>

                  <td>
                    {inc.user?.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Professional Footer */}
          <div className="mt-12 pt-4 border-t-2 border-gray-300 flex justify-between text-xs text-gray-500 font-sans">
            <p>CONFIDENTIAL: This document contains sensitive security information.</p>
            <p>Authorized by Urban Security Operations Center</p>
            <p>Page 1 of 1</p>
          </div>
        </div>

        {/* --- MODALS --- */}
        {showLogModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold mb-4">Log New Incident</h2>
              <form onSubmit={handleReport} className="space-y-4">
                <input className="w-full border p-2 rounded" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                <textarea className="w-full border p-2 rounded h-24" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                <div className="grid grid-cols-2 gap-2">
                  <select className="border p-2 rounded" value={form.siteId} onChange={e => setForm({ ...form, siteId: e.target.value })} required>
                    <option value="">Select Site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select className="border p-2 rounded" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required>
                    <option value="">Select Guard</option>
                    {guards.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <select className="w-full border p-2 rounded" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 bg-red-700 text-white py-2 rounded">{loading ? 'Saving...' : 'Log Incident'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showResolveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold mb-2">Resolve Incident</h2>
              <p className="text-sm text-gray-500 mb-4">Describe the actions taken to close this case.</p>
              <textarea
                className="w-full border p-2 rounded h-32 mb-4"
                placeholder="e.g. Police contacted, perimeter secured..."
                value={resolutionText}
                onChange={e => setResolutionText(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setShowResolveModal(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                <button onClick={submitResolution} disabled={loading} className="flex-1 bg-green-600 text-white py-2 rounded">{loading ? 'Saving...' : 'Confirm Resolution'}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}