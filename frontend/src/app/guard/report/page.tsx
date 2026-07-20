'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ShieldAlert, ClipboardList, CalendarClock } from 'lucide-react';
import GuardLayout from '../../../components/GuardLayout';
import { resolveApiUrl } from '../../../lib/api-url';
import { useToast } from '../../../components/ui/ToastProvider';

type Shift = {
  id: string;
  userId: string;
  siteId: string;
  site?: { name?: string };
  startTime: string;
};

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const severityOptions: { value: Severity; label: string; activeClass: string }[] = [
  { value: 'LOW', label: 'Low', activeClass: 'bg-blue-600 text-white border-blue-600' },
  { value: 'MEDIUM', label: 'Medium', activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'HIGH', label: 'High', activeClass: 'bg-orange-600 text-white border-orange-600' },
  { value: 'CRITICAL', label: 'Critical', activeClass: 'bg-rose-600 text-white border-rose-600' },
];

export default function GuardReportPage() {
  const apiUrl = resolveApiUrl();
  const { showToast } = useToast();
  const [guardId, setGuardId] = useState<string>('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'incident' | 'log'>('incident');

  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM' as Severity,
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
    try {
      await axios.post(`${apiUrl}/api/incidents`, {
        title: incidentForm.title,
        description: incidentForm.description,
        severity: incidentForm.severity,
        userId: guardId,
        siteId: selectedShift.siteId
      });

      setIncidentForm((prev) => ({ ...prev, title: '', description: '', severity: 'MEDIUM' }));
      showToast('Incident submitted successfully.', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Failed to submit incident.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardId || !logForm.shiftId) return;

    setLoading(true);
    try {
      await axios.post(`${apiUrl}/api/reports`, {
        content: logForm.content,
        userId: guardId,
        shiftId: logForm.shiftId
      });
      setLogForm((prev) => ({ ...prev, content: '' }));
      showToast('Daily log submitted successfully.', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Failed to submit daily log.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const shiftSelect = (value: string, onChange: (value: string) => void) => (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
        <CalendarClock className="h-3.5 w-3.5" />
        Shift
      </label>
      <select
        className="w-full rounded-lg border border-gray-300 p-3 text-base text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="">Select shift</option>
        {shifts.map((shift) => (
          <option key={shift.id} value={shift.id}>
            {shift.site?.name || 'Site'} · {new Date(shift.startTime).toLocaleDateString()}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <GuardLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Report Center</h1>
          <p className="text-sm text-gray-500">Submit incidents and daily shift logs.</p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('incident')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              activeTab === 'incident' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Incident Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
              activeTab === 'log' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Daily Log
          </button>
        </div>

        {activeTab === 'incident' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <form onSubmit={handleIncidentSubmit} className="space-y-4">
              {shiftSelect(incidentForm.shiftId, (value) => setIncidentForm((prev) => ({ ...prev, shiftId: value })))}

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
                <input
                  className="w-full rounded-lg border border-gray-300 p-3 text-base text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                  placeholder="e.g. Unauthorized entry attempt"
                  value={incidentForm.title}
                  onChange={(e) => setIncidentForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Description</label>
                <textarea
                  className="h-28 w-full rounded-lg border border-gray-300 p-3 text-base text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                  placeholder="Describe what happened..."
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm((prev) => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Severity</label>
                <div className="grid grid-cols-4 gap-2">
                  {severityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setIncidentForm((prev) => ({ ...prev, severity: option.value }))}
                      className={`rounded-lg border py-2 text-xs font-semibold transition ${
                        incidentForm.severity === option.value
                          ? option.activeClass
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-rose-600 py-3 font-semibold text-white transition hover:bg-rose-700 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? 'Submitting...' : 'Submit Incident'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <form onSubmit={handleLogSubmit} className="space-y-4">
              {shiftSelect(logForm.shiftId, (value) => setLogForm((prev) => ({ ...prev, shiftId: value })))}

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Observations</label>
                <textarea
                  className="h-32 w-full rounded-lg border border-gray-300 p-3 text-base text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                  placeholder="What did you observe during your shift?"
                  value={logForm.content}
                  onChange={(e) => setLogForm((prev) => ({ ...prev, content: e.target.value }))}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? 'Submitting...' : 'Submit Daily Log'}
              </button>
            </form>
          </div>
        )}
      </div>
    </GuardLayout>
  );
}
