'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import GuardLayout from '../../../components/GuardLayout';
import { resolveApiUrl } from '../../../lib/api-url';

type Incident = {
  id: string;
  userId: string;
  title: string;
  description: string;
  severity: string;
  createdAt: string;
  site?: { name?: string };
};

type Report = {
  id: string;
  content: string;
  shiftId?: string;
  createdAt: string;
  shift?: { userId?: string };
};

type Shift = {
  id: string;
  site?: { name?: string };
};

export default function GuardHistoryPage() {
  const apiUrl = resolveApiUrl();
  const [guardId, setGuardId] = useState('');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

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
      meta: `${incident.severity} - ${incident.site?.name || 'Unknown Site'}`,
      createdAt: incident.createdAt
    }));

    const reportItems = reports.map((report) => ({
      id: report.id,
      type: 'log' as const,
      title: 'Daily Log Entry',
      description: report.content,
      meta: shifts.find((shift) => shift.id === report.shiftId)?.site?.name || 'Unknown Site',
      createdAt: report.createdAt
    }));

    return [...incidentItems, ...reportItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [incidents, reports, shifts]);

  return (
    <GuardLayout>
      <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Daily Logs and History</h1>
          <p className="text-sm text-gray-500">Your incident submissions and shift logs.</p>
        </div>

        {guardId && historyItems.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500">
            No records found yet.
          </div>
        ) : (
          <div className="space-y-3">
            {historyItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.meta}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${item.type === 'incident' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {item.type === 'incident' ? 'INCIDENT' : 'LOG'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-3">{item.description}</p>
                <p className="text-xs text-gray-400 mt-3">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GuardLayout>
  );
}
