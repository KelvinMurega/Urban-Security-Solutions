'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ReceiptText } from 'lucide-react';
import ClientLayout from '../../../components/ClientLayout';
import { formatDate, formatMoney, invoiceState } from '../../../lib/client-format';
import { resolveApiUrl } from '../../../lib/api-url';
import type { ClientInvoice } from '../../../types/client';

export default function ClientInvoicesPage() {
  const apiUrl = resolveApiUrl();
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${apiUrl}/api/invoices`)
      .then((response) => setInvoices(response.data as ClientInvoice[]))
      .catch(() => setError('We could not load your invoices. Please try again.'))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const outstanding = useMemo(() => invoices.filter((invoice) => ['ISSUED', 'OVERDUE'].includes(invoiceState(invoice))), [invoices]);
  const balances = useMemo(() => {
    const totals = new Map<string, number>();
    outstanding.forEach((invoice) => totals.set(invoice.currency, (totals.get(invoice.currency) || 0) + Number(invoice.amount)));
    return [...totals].map(([currency, amount]) => ({ currency, amount }));
  }, [outstanding]);

  return (
    <ClientLayout>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#75836d]">Billing</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Invoices</h1><p className="mt-1 text-sm text-gray-600">Review bills issued for your account and their due dates.</p></div>
        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {!loading && outstanding.length > 0 && <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d8c486] bg-[#fffbed] p-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#74643a]">Outstanding balance</p><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{balances.map((balance) => <p key={balance.currency} className="text-xl font-semibold">{formatMoney(balance.amount, balance.currency)}</p>)}</div></div><p className="text-sm text-gray-600">{outstanding.length} {outstanding.length === 1 ? 'invoice' : 'invoices'} awaiting payment</p></section>}
        <section className="overflow-hidden rounded-md border border-[#dce2da] bg-white">
          <div className="flex items-center justify-between border-b border-[#e4e8e2] px-4 py-4 sm:px-5"><div><h2 className="font-semibold">Invoice history</h2><p className="text-xs text-gray-500">Invoices remain visible here after they are paid.</p></div><ReceiptText className="h-5 w-5 text-[#74884c]" /></div>
          {loading ? <p className="p-6 text-sm text-gray-500">Loading invoices…</p> : invoices.length ? <div className="divide-y divide-[#edf0eb]">{invoices.map((invoice) => {
            const state = invoiceState(invoice);
            const tone = state === 'PAID' ? 'bg-emerald-50 text-emerald-800' : state === 'CANCELLED' ? 'bg-gray-100 text-gray-600' : state === 'OVERDUE' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900';
            return <article key={invoice.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center sm:px-5"><div><p className="font-semibold">{invoice.invoiceNumber}</p><p className="mt-1 text-xs text-gray-500">{invoice.description}</p><p className="mt-1 text-[11px] text-gray-500">{invoice.site?.name || 'General service'}</p></div><p className="text-xs text-gray-600"><span className="text-gray-400">Issued </span>{formatDate(invoice.issuedAt)}</p><p className="text-xs text-gray-600"><span className="text-gray-400">Due </span>{formatDate(invoice.dueDate)}</p><div className="flex items-center justify-between gap-3 sm:block sm:text-right"><div><p className="font-semibold">{formatMoney(invoice.amount, invoice.currency)}</p><span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{state.toLowerCase()}</span></div></div></article>;
          })}</div> : <div className="px-6 py-14 text-center"><ReceiptText className="mx-auto h-6 w-6 text-[#85927f]" /><h2 className="mt-3 font-semibold">No invoices yet</h2><p className="mt-1 text-sm text-gray-500">Invoices issued for your account will appear here.</p></div>}
        </section>
        <p className="text-xs text-gray-500">For questions about an invoice, contact your Urban Security account administrator.</p>
      </div>
    </ClientLayout>
  );
}