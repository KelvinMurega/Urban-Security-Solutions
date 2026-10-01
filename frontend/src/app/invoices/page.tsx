'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FilePlus2, ReceiptText } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/ToastProvider';
import { formatDate, formatMoney, invoiceState } from '../../lib/client-format';
import { resolveApiUrl } from '../../lib/api-url';
import type { ClientInvoice } from '../../types/client';

type SiteOption = { id: string; name: string; address: string };
type ManagedClient = { id: string; name: string; email: string; clientSites: { siteId: string; site: SiteOption }[] };
type InvoiceStatus = ClientInvoice['status'];

const initialForm = { clientId: '', siteId: '', description: '', amount: '', currency: '', dueDate: '' };

export default function InvoicesPage() {
  const apiUrl = resolveApiUrl();
  const { showToast } = useToast();
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedClient = clients.find((client) => client.id === form.clientId);
  const outstandingCount = useMemo(() => invoices.filter((invoice) => ['ISSUED', 'OVERDUE'].includes(invoiceState(invoice))).length, [invoices]);

  useEffect(() => {
    Promise.all([axios.get(`${apiUrl}/api/clients`), axios.get(`${apiUrl}/api/invoices`)]).then(([clientResponse, invoiceResponse]) => {
      setClients(clientResponse.data as ManagedClient[]);
      setInvoices(invoiceResponse.data as ClientInvoice[]);
    }).catch(() => setError('Could not load billing data.')).finally(() => setLoading(false));
  }, [apiUrl]);

  const issueInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await axios.post(`${apiUrl}/api/invoices`, { ...form, amount: Number(form.amount), siteId: form.siteId || null, currency: form.currency.trim().toUpperCase() });
      setInvoices((current) => [response.data as ClientInvoice, ...current]);
      setForm({ ...initialForm, currency: form.currency });
      showToast('Invoice issued to client.', 'success');
    } catch (requestError) {
      const message = axios.isAxiosError(requestError) ? requestError.response?.data?.error : null;
      setError(typeof message === 'string' ? message : 'Could not issue invoice.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (invoiceId: string, status: InvoiceStatus) => {
    try {
      const response = await axios.patch(`${apiUrl}/api/invoices/${invoiceId}/status`, { status });
      const updated = response.data as ClientInvoice;
      setInvoices((current) => current.map((invoice) => invoice.id === updated.id ? updated : invoice));
      showToast('Invoice status updated.', 'success');
    } catch {
      showToast('Could not update invoice status.', 'error');
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <PageHeader title="Client billing" subtitle="Issue invoices and track payment status." right={<span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">{outstandingCount} outstanding</span>} />
        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{String(error)}</div>}
        <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-50 text-emerald-800"><FilePlus2 className="h-4 w-4" /></span><div><h2 className="font-semibold text-gray-900">Issue an invoice</h2><p className="text-xs text-gray-500">The client will see it in their billing area.</p></div></div>
            <form onSubmit={issueInvoice} className="space-y-4">
              <Field label="Client"><select className={inputClass} value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, siteId: '' })} required><option value="">Select a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.email}</option>)}</select></Field>
              <Field label="Related site (optional)"><select className={inputClass} value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })} disabled={!selectedClient}><option value="">General service</option>{selectedClient?.clientSites.map(({ site }) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></Field>
              <Field label="Description"><textarea className={inputClass} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required minLength={3} placeholder="Service period or work covered" /></Field>
              <div className="grid grid-cols-[1fr_100px] gap-3"><Field label="Amount"><input className={inputClass} type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></Field><Field label="Currency"><input className={`${inputClass} uppercase`} maxLength={3} minLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} required placeholder="GBP" /></Field></div>
              <Field label="Payment due"><input className={inputClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required /></Field>
              <button disabled={saving || !clients.length} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#17231f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#30443b] disabled:opacity-60">{saving ? 'Issuing…' : 'Issue invoice'}<span aria-hidden="true">↗</span></button>
              {!clients.length && <p className="text-xs text-amber-800">Create a client account before issuing an invoice.</p>}
            </form>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Issued invoices</h2><p className="text-xs text-gray-500">Update status when payment is received.</p></div><ReceiptText className="h-5 w-5 text-gray-400" /></div>
            {loading ? <p className="p-6 text-sm text-gray-500">Loading invoices…</p> : invoices.length ? <div className="divide-y divide-gray-100">{invoices.map((invoice) => {
              const state = invoiceState(invoice);
              const tone = state === 'PAID' ? 'bg-emerald-50 text-emerald-800' : state === 'CANCELLED' ? 'bg-gray-100 text-gray-600' : state === 'OVERDUE' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900';
              return <article key={invoice.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center"><div><p className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</p><p className="mt-1 text-xs text-gray-600">{invoice.client?.name || 'Client'} · {invoice.site?.name || 'General service'}</p><p className="mt-1 text-xs text-gray-500">{invoice.description}</p></div><div><p className="font-semibold">{formatMoney(invoice.amount, invoice.currency)}</p><p className="mt-1 text-xs text-gray-500">Due {formatDate(invoice.dueDate)}</p><span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{state.toLowerCase()}</span></div><label className="text-[11px] font-semibold text-gray-600">Update status<select aria-label={`Status for ${invoice.invoiceNumber}`} className={`${inputClass} mt-1 min-w-32`} value={invoice.status} onChange={(event) => updateStatus(invoice.id, event.target.value as InvoiceStatus)}><option value="ISSUED">Issued</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option></select></label></article>;
            })}</div> : <p className="p-8 text-center text-sm text-gray-500">No invoices issued yet.</p>}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#718a4f] focus:ring-2 focus:ring-[#d8f477]/40 disabled:bg-gray-100';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-700">{label}<span className="mt-1 block">{children}</span></label>;
}