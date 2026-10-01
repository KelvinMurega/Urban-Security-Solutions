'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Clock3, MapPin, ReceiptText, ShieldCheck, TriangleAlert } from 'lucide-react';
import ClientLayout from '../../../components/ClientLayout';
import { formatDate, formatDateTime, formatHours, formatMoney, invoiceState } from '../../../lib/client-format';
import { resolveApiUrl } from '../../../lib/api-url';
import type { ClientDashboardData } from '../../../types/client';

const emptyDashboard: ClientDashboardData = {
  sites: [], activeShifts: [], shifts: [], incidents: [], reports: [], invoices: [],
  summary: { siteCount: 0, activeGuards: 0, hoursThisMonth: 0, openIncidents: 0, outstandingByCurrency: [], outstandingCount: 0 },
};

export default function ClientDashboardPage() {
  const apiUrl = resolveApiUrl();
  const [data, setData] = useState<ClientDashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${apiUrl}/api/client/dashboard`)
      .then((response) => setData(response.data as ClientDashboardData))
      .catch(() => setError('We could not load your site overview. Please try again.'))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const outstandingInvoices = data.invoices.filter((invoice) => invoiceState(invoice) === 'ISSUED' || invoiceState(invoice) === 'OVERDUE');

  return (
    <ClientLayout>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#75836d]">Client overview</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Your sites, at a glance</h1><p className="mt-1 text-sm text-gray-600">Live coverage, shift records and site updates.</p></div>
          <p className="text-xs text-gray-500">Updated {formatDateTime(new Date().toISOString())}</p>
        </div>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {loading ? <div className="rounded-md border border-[#dce2da] bg-white p-8 text-sm text-gray-500">Loading site activity…</div> : (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Metric label="Assigned sites" value={data.summary.siteCount} icon={MapPin} detail="Sites linked to your account" />
              <Metric label="On-site now" value={data.summary.activeGuards} icon={ShieldCheck} detail="Guards checked in" />
              <Metric label="Hours this month" value={formatHours(data.summary.hoursThisMonth)} icon={Clock3} detail="Based on recorded attendance" />
              <Metric label="Open incidents" value={data.summary.openIncidents} icon={TriangleAlert} detail="Across your assigned sites" />
            </div>

            {data.summary.outstandingCount > 0 && <section className="flex flex-col gap-3 rounded-md border border-[#d8c486] bg-[#fffbed] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{data.summary.outstandingCount} outstanding {data.summary.outstandingCount === 1 ? 'invoice' : 'invoices'}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">{data.summary.outstandingByCurrency.map((balance) => <span key={balance.currency}>{formatMoney(balance.amount, balance.currency)} due</span>)}</div></div><a href="/client/invoices" className="inline-flex items-center gap-2 text-sm font-semibold text-[#405b34]">Review invoices <span aria-hidden="true">→</span></a></section>}

            <section className="rounded-md border border-[#dce2da] bg-white">
              <div className="flex items-center justify-between border-b border-[#e4e8e2] px-4 py-4 sm:px-5"><div><h2 className="font-semibold">Current site coverage</h2><p className="text-xs text-gray-500">Guards currently checked in</p></div><ShieldCheck className="h-5 w-5 text-[#768b50]" /></div>
              {data.activeShifts.length ? <div className="divide-y divide-[#edf0eb]">{data.activeShifts.map((shift) => <div key={shift.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1.1fr_1fr_1fr_auto] sm:items-center sm:px-5"><div><p className="font-medium">{shift.site.name}</p><p className="text-xs text-gray-500">{shift.user.name}</p></div><p className="text-xs text-gray-600"><span className="font-semibold text-gray-800">Checked in</span><br />{formatDateTime(shift.checkedInAt)}</p><p className="text-xs text-gray-600"><span className="font-semibold text-gray-800">Time on shift</span><br />{formatHours(shift.workedHours)}</p><span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">On site</span></div>)}</div> : <p className="px-5 py-8 text-sm text-gray-500">No guards are currently checked in at your assigned sites.</p>}
            </section>

            <section className="rounded-md border border-[#dce2da] bg-white">
              <div className="flex items-center justify-between border-b border-[#e4e8e2] px-4 py-4 sm:px-5"><div><h2 className="font-semibold">Recent shifts</h2><p className="text-xs text-gray-500">Check-in, check-out and recorded hours</p></div><a href="/client/activity" className="text-xs font-semibold text-[#49623b]">All activity →</a></div>
              {data.shifts.length ? <div className="divide-y divide-[#edf0eb]">{data.shifts.slice(0, 6).map((shift) => <div key={shift.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_1fr_1fr] sm:items-center sm:px-5"><div><p className="text-sm font-medium">{shift.site.name}</p><p className="text-xs text-gray-500">{shift.user.name}</p></div><p className="text-xs text-gray-600"><span className="text-gray-400">In </span>{formatDateTime(shift.checkedInAt)}</p><p className="text-xs text-gray-600"><span className="text-gray-400">Out </span>{formatDateTime(shift.checkedOutAt)}</p><p className="text-xs font-semibold text-gray-700">{formatHours(shift.workedHours)}</p></div>)}</div> : <p className="px-5 py-8 text-sm text-gray-500">No shift records are available yet.</p>}
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <Feed title="Recent incidents" icon={TriangleAlert} empty="No incidents have been filed for your sites." count={data.incidents.length}>
                {data.incidents.slice(0, 5).map((incident) => <div key={incident.id} className="flex items-start justify-between gap-3 border-t border-[#edf0eb] py-3"><div><p className="text-sm font-medium">{incident.title}</p><p className="mt-1 text-xs text-gray-500">{incident.site.name} · {incident.user.name} · {formatDate(incident.reportedAt)}</p></div><StatusPill label={incident.status} /></div>)}
              </Feed>
              <Feed title="Latest guard reports" icon={Activity} empty="No reports have been filed for your sites." count={data.reports.length}>
                {data.reports.slice(0, 5).map((report) => <div key={report.id} className="border-t border-[#edf0eb] py-3"><p className="line-clamp-2 text-sm text-gray-800">{report.content}</p><p className="mt-1 text-xs text-gray-500">{report.shift.site.name} · {report.user.name} · {formatDateTime(report.createdAt)}</p></div>)}
              </Feed>
            </div>

            {!data.sites.length && <section className="rounded-md border border-dashed border-[#c9d4c9] bg-white p-6 text-center"><MapPin className="mx-auto h-6 w-6 text-gray-400" /><h2 className="mt-2 font-semibold">No sites assigned yet</h2><p className="mt-1 text-sm text-gray-500">Ask your Urban Security administrator to link your account to a site.</p></section>}
            {!!outstandingInvoices.length && <section className="rounded-md border border-[#dce2da] bg-white"><div className="flex items-center justify-between border-b border-[#e4e8e2] px-4 py-4 sm:px-5"><div><h2 className="font-semibold">Bills requiring attention</h2><p className="text-xs text-gray-500">Issued invoices not marked as paid</p></div><ReceiptText className="h-5 w-5 text-[#768b50]" /></div>{outstandingInvoices.slice(0, 4).map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0eb] px-4 py-3 last:border-b-0 sm:px-5"><div><p className="text-sm font-medium">{invoice.invoiceNumber} · {invoice.site?.name || 'General'}</p><p className="text-xs text-gray-500">Due {formatDate(invoice.dueDate)}</p></div><p className="text-sm font-semibold">{formatMoney(invoice.amount, invoice.currency)}</p></div>)}</section>}
          </>
        )}
      </div>
    </ClientLayout>
  );
}

function Metric({ label, value, icon: Icon, detail }: { label: string; value: string | number; icon: typeof MapPin; detail: string }) {
  return <section className="min-w-0 rounded-md border border-[#dce2da] bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-gray-600">{label}</p><Icon className="h-4 w-4 shrink-0 text-[#74884c]" /></div><p className="mt-3 truncate text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-gray-500">{detail}</p></section>;
}

function Feed({ title, icon: Icon, empty, count, children }: { title: string; icon: typeof Activity; empty: string; count: number; children: React.ReactNode }) {
  return <section className="rounded-md border border-[#dce2da] bg-white px-4 py-4 sm:px-5"><div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#74884c]" /><h2 className="font-semibold">{title}</h2></div><span className="text-xs text-gray-500">{count}</span></div>{count ? children : <p className="border-t border-[#edf0eb] py-5 text-sm text-gray-500">{empty}</p>}</section>;
}

function StatusPill({ label }: { label: string }) {
  const tone = label === 'OPEN' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800';
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{label.toLowerCase()}</span>;
}