'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import { resolveApiUrl } from '../../lib/api-url';
import { useToast } from '../../components/ui/ToastProvider';

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: string } | null;
};

const PAGE_SIZE = 50;
const ENTITY_TYPES = ['', 'user', 'client', 'site', 'shift', 'incident', 'report', 'invoice', 'auth'];

const describeMetadata = (metadata: AuditEntry['metadata']) => {
  if (!metadata) return '';
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' · ');
};

export default function AuditLogPage() {
  const apiUrl = resolveApiUrl();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/api/audit-logs`, {
        params: { limit: PAGE_SIZE, offset, ...(entityType && { entityType }) },
      });
      setEntries(res.data);
      setTotal(Number(res.headers['x-total-count'] || res.data.length));
    } catch {
      showToast('Failed to load audit log.', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, offset, entityType, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <PageHeader
        title="Audit Log"
        subtitle="Read-only record of every change: who did what, when, and from where."
        right={
          <select
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 md:w-48"
            value={entityType}
            onChange={(e) => {
              setOffset(0);
              setEntityType(e.target.value);
            }}
            aria-label="Filter by record type"
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type || 'all'} value={type}>
                {type ? type[0].toUpperCase() + type.slice(1) : 'All records'}
              </option>
            ))}
          </select>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No audit entries yet.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {entry.actor ? (
                      <>
                        <span className="font-medium text-gray-900">{entry.actor.name}</span>
                        <span className="ml-1 text-xs text-gray-400">{entry.actor.role}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">System</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-indigo-700">{entry.action}</td>
                  <td className="max-w-md break-words px-4 py-3 text-xs text-gray-600">{describeMetadata(entry.metadata)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-400">{entry.ip || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          {total === 0 ? '0 entries' : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </button>
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
