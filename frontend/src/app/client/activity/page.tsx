'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Activity, ClipboardList, Clock3, TriangleAlert } from 'lucide-react';
import ClientLayout from '../../../components/ClientLayout';
import PhotoGallery from '../../../components/ui/PhotoGallery';
import { formatDateTime, formatHours } from '../../../lib/client-format';
import { resolveApiUrl } from '../../../lib/api-url';
import type { ClientDashboardData } from '../../../types/client';

type ActivityTab = 'shifts' | 'incidents' | 'reports';

export default function ClientActivityPage() {
  const apiUrl = resolveApiUrl();
  const [data, setData] = useState<ClientDashboardData | null>(null);
  const [tab, setTab] = useState<ActivityTab>('shifts');
  const [siteId, setSiteId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${apiUrl}/api/client/dashboard`)
      .then((response) => setData(response.data as ClientDashboardData))
      .catch(() => setError('We could not load site activity. Please try again.'))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const filtered = useMemo(() => {
    if (!data) return { shifts: [], incidents: [], reports: [] };
    return {
      shifts: data.shifts.filter((item) => siteId === 'all' || item.site.id === siteId),
      incidents: data.incidents.filter((item) => siteId === 'all' || item.site.id === siteId),
      reports: data.reports.filter((item) => siteId === 'all' || item.shift.site.id === siteId),
    };
  }, [data, siteId]);

  return (
    <ClientLayout>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#75836d]">Site records</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Activity and attendance</h1><p className="mt-1 text-sm text-gray-600">A record of guard shifts, incidents and submitted reports.</p></div><label className="grid gap-1 text-xs font-semibold text-gray-600">Filter by site<select value={siteId} onChange={(event) => setSiteId(event.target.value)} className="min-w-52 rounded-md border border-[#ccd5ca] bg-white px-3 py-2 text-sm font-normal text-gray-800 outline-none focus:border-[#718a4f]"> <option value="all">All assigned sites</option>{data?.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label></div>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        <div className="flex border-b border-[#dce2da]" role="tablist" aria-label="Activity type">
          <TabButton active={tab === 'shifts'} onClick={() => setTab('shifts')} icon={Clock3} label="Shifts" count={filtered.shifts.length} />
          <TabButton active={tab === 'incidents'} onClick={() => setTab('incidents')} icon={TriangleAlert} label="Incidents" count={filtered.incidents.length} />
          <TabButton active={tab === 'reports'} onClick={() => setTab('reports')} icon={ClipboardList} label="Guard reports" count={filtered.reports.length} />
        </div>

        <section className="overflow-hidden rounded-md border border-[#dce2da] bg-white">
          {loading ? <p className="p-6 text-sm text-gray-500">Loading records…</p> : tab === 'shifts' ? (
            filtered.shifts.length ? <div className="divide-y divide-[#edf0eb]">{filtered.shifts.map((shift) => <article key={shift.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-center sm:px-5"><div><p className="font-semibold">{shift.site.name}</p><p className="text-xs text-gray-500">{shift.user.name}</p></div><Detail label="Scheduled" value={formatDateTime(shift.startTime)} /><Detail label="Checked in" value={formatDateTime(shift.checkedInAt)} /><Detail label="Checked out" value={formatDateTime(shift.checkedOutAt)} /><div className="flex items-center justify-between gap-3 sm:block sm:text-right"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${shift.checkedOutAt ? 'bg-gray-100 text-gray-700' : shift.checkedInAt ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'}`}>{shift.checkedOutAt ? 'Completed' : shift.checkedInAt ? 'On site' : shift.status.toLowerCase()}</span><p className="mt-1 text-sm font-semibold">{formatHours(shift.workedHours)}</p></div></article>)}</div> : <Empty icon={Clock3} title="No shift records" detail="Attendance records will appear here once guards begin working assigned shifts." />
          ) : tab === 'incidents' ? (
            filtered.incidents.length ? <div className="divide-y divide-[#edf0eb]">{filtered.incidents.map((incident) => <article key={incident.id} className="p-4 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{incident.title}</p><p className="mt-1 text-xs text-gray-500">{incident.site.name} · Filed by {incident.user.name} · {formatDateTime(incident.reportedAt)}</p></div><div className="flex gap-2"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-900">{incident.severity.toLowerCase()}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${incident.status === 'OPEN' ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>{incident.status.toLowerCase()}</span></div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{incident.description}</p><PhotoGallery urls={incident.photoUrls} /></article>)}</div> : <Empty icon={TriangleAlert} title="No incidents recorded" detail="Incident reports for this site will appear here." />
          ) : (
            filtered.reports.length ? <div className="divide-y divide-[#edf0eb]">{filtered.reports.map((report) => <article key={report.id} className="p-4 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{report.shift.site.name}</p><p className="mt-1 text-xs text-gray-500">Filed by {report.user.name} · {formatDateTime(report.createdAt)}</p></div><span className="inline-flex items-center gap-1.5 text-xs text-gray-500"><Activity className="h-3.5 w-3.5" />Shift log</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{report.content}</p><PhotoGallery urls={report.photoUrls} /></article>)}</div> : <Empty icon={ClipboardList} title="No guard reports yet" detail="Submitted reports and daily logs will appear here." />
          )}
        </section>
      </div>
    </ClientLayout>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: typeof Activity; label: string; count: number }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold sm:px-4 ${active ? 'border-[#698349] text-[#344d37]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><Icon className="h-4 w-4" />{label}<span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{count}</span></button>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <p className="text-xs text-gray-600"><span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>{value}</p>;
}

function Empty({ icon: Icon, title, detail }: { icon: typeof Activity; title: string; detail: string }) {
  return <div className="px-6 py-14 text-center"><Icon className="mx-auto h-6 w-6 text-[#85927f]" /><h2 className="mt-3 font-semibold">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{detail}</p></div>;
}