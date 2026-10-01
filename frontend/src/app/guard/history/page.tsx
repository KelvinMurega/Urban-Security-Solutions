'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ShieldAlert, ClipboardList, Inbox } from 'lucide-react';
import GuardLayout from '../../../components/GuardLayout';
import { resolveApiUrl } from '../../../lib/api-url';
import PhotoGallery from '../../../components/ui/PhotoGallery';

type Incident = {
  id: string;
  userId: string;
  title: string;
  description: string;
  severity: string;
  createdAt: string;
  site?: { name?: string };
  photoUrls?: unknown;
};

type Report = {
  id: string;
  content: string;
  shiftId?: string;
  createdAt: string;
  shift?: { userId?: string };
  photoUrls?: unknown;
};

type Shift = {
  id: string;
  site?: { name?: string };
};

const severityDot: Record<string, string> = {
  LOW: 'bg-blue-500',
  MEDIUM: 'bg-amber-500',
  HIGH: 'bg-orange-600',
  CRITICAL: 'bg-rose-600',
};

export default function GuardHistoryPage() {
  const apiUrl = resolveApiUrl();
  const [guardId, setGuardId] = useState('');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'incident' | 'log'>('all');

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return;

    const user = JSON.parse(userRaw) as { id: string };
    setGuardId(user.id);

    const fetchHistory = async () => {
      try {
        const [incidentRes, reportRes, shiftRes] = await Promise.all([
          axios.get(`${apiUrl}/api/incidents`),
          axios.get(`${apiUrl}/api/reports`),
          axios.get(`${apiUrl}/api/shifts`)
        ]);

        const myIncidents = (incidentRes.data as Incident[]).filter((incident) => incident.userId === user.id);
        const myReports = (reportRes.data as Report[]).filter((report) => report.shift?.userId === user.id);

        setIncidents(myIncidents);
        setReports(myReports);
        setShifts(shiftRes.data as Shift[]);
      } catch (error) {
        console.error('Failed to load history', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [apiUrl]);

  const historyItems = useMemo(() => {
    const incidentItems = incidents.map((incident) => ({
      id: incident.id,
      type: 'incident' as const,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      meta: incident.site?.name || 'Unknown Site',
      createdAt: incident.createdAt,
      photoUrls: incident.photoUrls
    }));

    const reportItems = reports.map((report) => ({
      id: report.id,
      type: 'log' as const,
      title: 'Daily Log Entry',
      description: report.content,
      severity: undefined,
      meta: shifts.find((shift) => shift.id === report.shiftId)?.site?.name || 'Unknown Site',
      createdAt: report.createdAt,
      photoUrls: report.photoUrls
    }));

    return [...incidentItems, ...reportItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [incidents, reports, shifts]);

  const filteredItems = useMemo(
    () => (filter === 'all' ? historyItems : historyItems.filter((item) => item.type === filter)),
    [historyItems, filter]
  );

  const filters: { value: typeof filter; label: string }[] = [
    { value: 'all', label: `All (${historyItems.length})` },
    { value: 'incident', label: `Incidents (${incidents.length})` },
    { value: 'log', label: `Logs (${reports.length})` },
  ];

  return (
    <GuardLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Daily Logs and History</h1>
          <p className="text-sm text-gray-500">Your incident submissions and shift logs.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f.value
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="h-4 w-1/2 rounded bg-gray-100" />
                <div className="mt-3 h-3 w-full rounded bg-gray-100" />
                <div className="mt-2 h-3 w-2/3 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : guardId && filteredItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            <Inbox className="h-6 w-6 text-gray-300" />
            No records found yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        item.type === 'incident' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {item.type === 'incident' ? <ShieldAlert className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                        {item.severity && <span className={`h-1.5 w-1.5 rounded-full ${severityDot[item.severity] || 'bg-gray-400'}`} />}
                        {item.severity ? `${item.severity} · ` : ''}
                        {item.meta}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold ${
                      item.type === 'incident' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {item.type === 'incident' ? 'INCIDENT' : 'LOG'}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-700">{item.description}</p>
                <PhotoGallery urls={item.photoUrls} />
                <p className="mt-3 text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GuardLayout>
  );
}
