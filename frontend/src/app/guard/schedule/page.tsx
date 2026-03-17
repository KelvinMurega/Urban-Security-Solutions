'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import GuardLayout from '../../../components/GuardLayout';
import { resolveApiUrl } from '../../../lib/api-url';
import PageHeader from '../../../components/ui/PageHeader';
import StatusBadge, { Tone } from '../../../components/ui/StatusBadge';
import { useToast } from '../../../components/ui/ToastProvider';

type Shift = {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  status: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  checkInFromGuardName?: string | null;
  checkOutToGuardName?: string | null;
  workedHours?: number;
  site?: { name?: string };
};

type Guard = {
  id: string;
  name: string;
  role?: string;
};

export default function GuardSchedulePage() {
  const apiUrl = resolveApiUrl();
  const [currentGuardId, setCurrentGuardId] = useState<string>('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [checkInSelection, setCheckInSelection] = useState<Record<string, string>>({});
  const [checkOutSelection, setCheckOutSelection] = useState<Record<string, string>>({});
  const [loadingShiftId, setLoadingShiftId] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return;

    const user = JSON.parse(userRaw) as { id: string };
    setCurrentGuardId(user.id);

    const fetchShifts = async () => {
      try {
        const [shiftRes, guardRes] = await Promise.all([
          axios.get(`${apiUrl}/api/shifts`),
          axios.get(`${apiUrl}/api/auth/guards-lite`)
        ]);

        const guardShifts = (shiftRes.data as Shift[]).filter((shift) => shift.userId === user.id);
        setShifts(
          guardShifts.sort(
            (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )
        );

        setGuards((guardRes.data as Guard[]).filter((guard) => guard.id !== user.id && guard.role === 'GUARD'));
      } catch (error) {
        console.error('Failed to load schedule', error);
      }
    };

    fetchShifts();
  }, [apiUrl]);

  const upcomingShifts = useMemo(() => {
    const now = Date.now();
    return shifts.filter((shift) => new Date(shift.startTime).getTime() >= now);
  }, [shifts]);

  const pastShifts = useMemo(() => {
    const now = Date.now();
    return shifts.filter((shift) => new Date(shift.startTime).getTime() < now);
  }, [shifts]);

  const refreshShifts = async () => {
    if (!currentGuardId) return;
    const res = await axios.get(`${apiUrl}/api/shifts`);
    const guardShifts = (res.data as Shift[]).filter((shift) => shift.userId === currentGuardId);
    setShifts(
      guardShifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    );
  };

  const handleCheckIn = async (shiftId: string) => {
    const previousGuardName = checkInSelection[shiftId];
    if (!previousGuardName || !currentGuardId) {
      showToast('Select the previous guard before check in.', 'error');
      return;
    }

    try {
      setLoadingShiftId(shiftId);
      await axios.put(`${apiUrl}/api/shifts/${shiftId}/check-in`, {
        previousGuardName
      });
      showToast('Checked in successfully.', 'success');
      await refreshShifts();
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Check in failed.', 'error');
    } finally {
      setLoadingShiftId('');
    }
  };

  const handleCheckOut = async (shiftId: string) => {
    const nextGuardName = checkOutSelection[shiftId];
    if (!nextGuardName || !currentGuardId) {
      showToast('Select the next guard before check out.', 'error');
      return;
    }

    try {
      setLoadingShiftId(shiftId);
      await axios.put(`${apiUrl}/api/shifts/${shiftId}/check-out`, {
        nextGuardName
      });
      showToast('Checked out successfully.', 'success');
      await refreshShifts();
    } catch (error: any) {
      showToast(error?.response?.data?.error || 'Check out failed.', 'error');
    } finally {
      setLoadingShiftId('');
    }
  };

  const getStatusTone = (status: string): Tone => {
    if (status === 'ACTIVE') return 'success';
    if (status === 'COMPLETED') return 'neutral';
    if (status === 'CANCELLED') return 'danger';
    return 'info';
  };

  const renderShift = (shift: Shift) => (
    <div key={shift.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <p className="text-sm font-semibold text-indigo-700">{shift.site?.name || 'Unassigned Site'}</p>
      <p className="text-sm text-gray-700 mt-1">{new Date(shift.startTime).toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-1">
        End: {shift.endTime ? new Date(shift.endTime).toLocaleString() : 'TBD'}
      </p>
      {shift.checkedInAt && (
        <p className="text-xs text-gray-600 mt-1">
          Checked in: {new Date(shift.checkedInAt).toLocaleString()} {shift.checkInFromGuardName ? `(handover from: ${shift.checkInFromGuardName})` : ''}
        </p>
      )}
      {shift.checkedOutAt && (
        <p className="text-xs text-gray-600 mt-1">
          Checked out: {new Date(shift.checkedOutAt).toLocaleString()} {shift.checkOutToGuardName ? `(handover to: ${shift.checkOutToGuardName})` : ''}
        </p>
      )}
      <p className="text-xs font-semibold text-gray-700 mt-2">
        Hours worked: {typeof shift.workedHours === 'number' ? shift.workedHours.toFixed(2) : '0.00'}h
      </p>
      <div className="mt-3">
        <StatusBadge label={shift.status} tone={getStatusTone(shift.status)} />
      </div>

      {!shift.checkedInAt && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-gray-600">Guard before you (handover from)</label>
          <select
            className="w-full border p-2 rounded text-black text-sm"
            value={checkInSelection[shift.id] || ''}
            onChange={(e) => setCheckInSelection((prev) => ({ ...prev, [shift.id]: e.target.value }))}
          >
            <option value="">Select previous guard</option>
            {guards.map((guard) => (
              <option key={guard.id} value={guard.name}>
                {guard.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleCheckIn(shift.id)}
            disabled={loadingShiftId === shift.id}
            className="w-full bg-emerald-600 text-white py-2 rounded text-sm font-semibold hover:bg-emerald-700 transition"
          >
            {loadingShiftId === shift.id ? 'Checking in...' : 'Check In'}
          </button>
        </div>
      )}

      {shift.checkedInAt && !shift.checkedOutAt && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-gray-600">Guard after you (handover to)</label>
          <select
            className="w-full border p-2 rounded text-black text-sm"
            value={checkOutSelection[shift.id] || ''}
            onChange={(e) => setCheckOutSelection((prev) => ({ ...prev, [shift.id]: e.target.value }))}
          >
            <option value="">Select next guard</option>
            {guards.map((guard) => (
              <option key={guard.id} value={guard.name}>
                {guard.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleCheckOut(shift.id)}
            disabled={loadingShiftId === shift.id}
            className="w-full bg-rose-600 text-white py-2 rounded text-sm font-semibold hover:bg-rose-700 transition"
          >
            {loadingShiftId === shift.id ? 'Checking out...' : 'Check Out'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <GuardLayout>
      <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-6">
        <PageHeader
          title="My Schedule"
          subtitle="Check in, check out, and track your worked hours."
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Upcoming</h2>
          {upcomingShifts.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500">
              No upcoming shifts assigned.
            </div>
          ) : (
            <div className="space-y-3">{upcomingShifts.map(renderShift)}</div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Past</h2>
          {pastShifts.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500">
              No shift history yet.
            </div>
          ) : (
            <div className="space-y-3">{pastShifts.map(renderShift)}</div>
          )}
        </section>
      </div>
    </GuardLayout>
  );
}
