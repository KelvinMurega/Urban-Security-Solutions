'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import GuardLayout from '../../../components/GuardLayout';
import { resolveApiUrl } from '../../../lib/api-url';

type Shift = {
  id: string;
  userId: string;
  siteId: string;
  site?: { name?: string };
  startTime: string;
};

export default function GuardReportPage() {
  const apiUrl = resolveApiUrl();
  const [guardId, setGuardId] = useState<string>('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM',
    shiftId: ''
  });

  const [logForm, setLogForm] = useState({
    content: '',
    shiftId: ''
  });

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return;

    const user = JSON.parse(userRaw) as { id: string };
    setGuardId(user.id);

    const fetchShifts = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/shifts`);
        const guardShifts = (res.data as Shift[])
          .filter((shift) => shift.userId === user.id)
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        setShifts(guardShifts);
        if (guardShifts[0]) {
          setIncidentForm((prev) => ({ ...prev, shiftId: guardShifts[0].id }));
          setLogForm((prev) => ({ ...prev, shiftId: guardShifts[0].id }));
        }
      } catch (error) {
        console.error('Failed to load shifts for reporting', error);
      }
    };

    fetchShifts();
  }, [apiUrl]);

  const shiftById = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach((shift) => map.set(shift.id, shift));
    return map;
  }, [shifts]);

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedShift = shiftById.get(incidentForm.shiftId);
    if (!selectedShift || !guardId) return;

    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${apiUrl}/api/incidents`, {
        title: incidentForm.title,
        description: incidentForm.description,
        severity: incidentForm.severity,
        userId: guardId,
        siteId: selectedShift.siteId
      });

      setIncidentForm((prev) => ({ ...prev, title: '', description: '' }));
      setMessage('Incident submitted successfully.');
    } catch (error) {
      console.error(error);
      setMessage('Failed to submit incident.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardId || !logForm.shiftId) return;

    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${apiUrl}/api/reports`, {
        content: logForm.content,
        userId: guardId,
        shiftId: logForm.shiftId
      });
      setLogForm((prev) => ({ ...prev, content: '' }));
      setMessage('Daily log submitted successfully.');
    } catch (error) {
      console.error(error);
      setMessage('Failed to submit daily log.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuardLayout>
      <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Report Center</h1>
          <p className="text-sm text-gray-500">Submit incidents and daily shift logs.</p>
        </div>

        {message && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm rounded-lg p-3">
            {message}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">Incident Report</h2>
          <form onSubmit={handleIncidentSubmit} className="space-y-3">
            <select
              className="w-full border p-2 rounded text-black"
              value={incidentForm.shiftId}
              onChange={(e) => setIncidentForm((prev) => ({ ...prev, shiftId: e.target.value }))}
              required
            >
              <option value="">Select Shift</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.site?.name || 'Site'} - {new Date(shift.startTime).toLocaleString()}
                </option>
              ))}
            </select>

            <input
              className="w-full border p-2 rounded text-black"
              placeholder="Incident title"
              value={incidentForm.title}
              onChange={(e) => setIncidentForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />

            <textarea
              className="w-full border p-2 rounded text-black h-24"
              placeholder="Describe what happened..."
              value={incidentForm.description}
              onChange={(e) => setIncidentForm((prev) => ({ ...prev, description: e.target.value }))}
              required
            />

            <select
              className="w-full border p-2 rounded text-black"
              value={incidentForm.severity}
              onChange={(e) => setIncidentForm((prev) => ({ ...prev, severity: e.target.value }))}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-2 rounded font-semibold hover:bg-red-700 transition"
            >
              {loading ? 'Submitting...' : 'Submit Incident'}
            </button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">Daily Log</h2>
          <form onSubmit={handleLogSubmit} className="space-y-3">
            <select
              className="w-full border p-2 rounded text-black"
              value={logForm.shiftId}
              onChange={(e) => setLogForm((prev) => ({ ...prev, shiftId: e.target.value }))}
              required
            >
              <option value="">Select Shift</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.site?.name || 'Site'} - {new Date(shift.startTime).toLocaleString()}
                </option>
              ))}
            </select>

            <textarea
              className="w-full border p-2 rounded text-black h-28"
              placeholder="What did you observe during your shift?"
              value={logForm.content}
              onChange={(e) => setLogForm((prev) => ({ ...prev, content: e.target.value }))}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded font-semibold hover:bg-indigo-700 transition"
            >
              {loading ? 'Submitting...' : 'Submit Daily Log'}
            </button>
          </form>
        </div>
      </div>
    </GuardLayout>
  );
}
