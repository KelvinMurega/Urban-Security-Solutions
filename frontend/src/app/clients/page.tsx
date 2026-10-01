'use client';

import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { Building2, UserPlus, UsersRound } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/ToastProvider';
import { resolveApiUrl } from '../../lib/api-url';

type SiteOption = { id: string; name: string; address: string };
type ManagedClient = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  clientSites: { siteId: string; site: SiteOption }[];
};

const emptyForm = { name: '', email: '', password: '', phone: '' };

export default function ClientsPage() {
  const apiUrl = resolveApiUrl();
  const { showToast } = useToast();
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [savingClient, setSavingClient] = useState(false);
  const [savingSites, setSavingSites] = useState(false);
  const [error, setError] = useState('');
  const selectedClient = clients.find((client) => client.id === selectedClientId);

  useEffect(() => {
    Promise.all([axios.get(`${apiUrl}/api/clients`), axios.get(`${apiUrl}/api/sites`)])
      .then(([clientResponse, siteResponse]) => {
        setClients(clientResponse.data as ManagedClient[]);
        setSites(siteResponse.data as SiteOption[]);
      })
      .catch(() => setError('Could not load client and site records.'))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const createClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingClient(true);
    setError('');
    try {
      const response = await axios.post(`${apiUrl}/api/clients`, form);
      const client = response.data as ManagedClient;
      setClients((current) => [client, ...current]);
      setSelectedClientId(client.id);
      setSelectedSiteIds([]);
      setForm(emptyForm);
      showToast('Client account created.', 'success');
    } catch (requestError) {
      const message = axios.isAxiosError(requestError) ? requestError.response?.data?.error : null;
      setError(typeof message === 'string' ? message : 'Could not create the client account.');
    } finally {
      setSavingClient(false);
    }
  };

  const selectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((item) => item.id === clientId);
    setSelectedSiteIds(client?.clientSites.map((assignment) => assignment.siteId) || []);
  };

  const toggleSite = (siteId: string, checked: boolean) => {
    setSelectedSiteIds((current) => checked ? [...new Set([...current, siteId])] : current.filter((id) => id !== siteId));
  };

  const saveAssignments = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClient) return;
    setSavingSites(true);
    setError('');
    try {
      const response = await axios.put(`${apiUrl}/api/clients/${selectedClient.id}/sites`, { siteIds: selectedSiteIds });
      const updated = response.data as ManagedClient;
      setClients((current) => current.map((client) => client.id === updated.id ? updated : client));
      setSelectedSiteIds(updated.clientSites.map((assignment) => assignment.siteId));
      showToast('Client site access updated.', 'success');
    } catch (requestError) {
      const message = axios.isAxiosError(requestError) ? requestError.response?.data?.error : null;
      setError(typeof message === 'string' ? message : 'Could not update site access.');
    } finally {
      setSavingSites(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <PageHeader title="Client accounts" subtitle="Create client access and link each account to its sites." />
        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{String(error)}</div>}
        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-50 text-emerald-800"><UserPlus className="h-4 w-4" /></span><div><h2 className="font-semibold text-gray-900">Create a client account</h2><p className="text-xs text-gray-500">Credentials are used with the main portal login.</p></div></div>
            <form onSubmit={createClient} className="space-y-4">
              <Field label="Client name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} /></Field>
              <Field label="Email"><input className={inputClass} type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
              <Field label="Temporary password"><input className={inputClass} type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /><span className="mt-1 block text-[11px] text-gray-500">Share the initial password securely.</span></Field>
              <Field label="Phone (optional)"><input className={inputClass} type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#17231f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#30443b] disabled:opacity-60" disabled={savingClient}>{savingClient ? 'Creating…' : 'Create client'}</button>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-lime-50 text-lime-900"><Building2 className="h-4 w-4" /></span><div><h2 className="font-semibold text-gray-900">Assign site access</h2><p className="text-xs text-gray-500">Clients can only see records for selected sites.</p></div></div>
            <form onSubmit={saveAssignments} className="space-y-4">
              <Field label="Client"><select className={inputClass} value={selectedClientId} onChange={(event) => selectClient(event.target.value)}><option value="">Choose a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.email}</option>)}</select></Field>
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
                {sites.length ? sites.map((site) => <label key={site.id} className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 ${selectedClient ? 'hover:bg-gray-50' : 'opacity-50'}`}><input type="checkbox" className="mt-1 accent-[#526a3a]" checked={selectedSiteIds.includes(site.id)} onChange={(event) => toggleSite(site.id, event.target.checked)} disabled={!selectedClient} /><span><span className="block text-sm font-medium text-gray-800">{site.name}</span><span className="block text-xs text-gray-500">{site.address}</span></span></label>) : <p className="p-4 text-sm text-gray-500">Create a site before assigning client access.</p>}
              </div>
              <button className="inline-flex w-full items-center justify-center rounded-md border border-[#526a3a] px-4 py-2.5 text-sm font-semibold text-[#405b34] hover:bg-[#f3f7eb] disabled:opacity-50" disabled={!selectedClient || savingSites}>{savingSites ? 'Saving…' : 'Save site access'}</button>
            </form>
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Client directory</h2><p className="text-xs text-gray-500">Select a client above to change site access.</p></div><UsersRound className="h-5 w-5 text-gray-400" /></div>
          {loading ? <p className="p-6 text-sm text-gray-500">Loading clients…</p> : clients.length ? <div className="divide-y divide-gray-100">{clients.map((client) => <button type="button" key={client.id} onClick={() => selectClient(client.id)} className={`grid w-full gap-2 px-5 py-4 text-left transition sm:grid-cols-[1.2fr_1.2fr_1.6fr_auto] sm:items-center ${selectedClientId === client.id ? 'bg-[#f5f8ef]' : 'hover:bg-gray-50'}`}><span><span className="block text-sm font-semibold text-gray-900">{client.name}</span><span className="block text-xs text-gray-500">{client.phone || 'No phone provided'}</span></span><span className="text-xs text-gray-600">{client.email}</span><span className="text-xs text-gray-600">{client.clientSites.map((assignment) => assignment.site.name).join(', ') || 'No sites assigned'}</span><span className="text-xs font-semibold text-[#526a3a]">{client.clientSites.length} {client.clientSites.length === 1 ? 'site' : 'sites'}</span></button>)}</div> : <p className="p-8 text-center text-sm text-gray-500">No client accounts yet.</p>}
        </section>
      </div>
    </AdminLayout>
  );
}

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#718a4f] focus:ring-2 focus:ring-[#d8f477]/40';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-700">{label}<span className="mt-1 block">{children}</span></label>;
}