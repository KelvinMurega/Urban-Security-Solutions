'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { MapPin, Clock, LogIn, LogOut, CalendarX, ArrowRightLeft } from 'lucide-react';
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
  checkInFromUser?: { id: string; name: string } | null;
  checkOutToUser?: { id: string; name: string } | null;
  workedHours?: number;
  site?: { name?: string };
};

const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, () => {
      reject(new Error('Could not get your location. Enable location access and try again.'));
    }, { enableHighAccuracy: true, timeout: 15000 });
  });
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
  const [loading, setLoading] = useState(true);
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
      } finally {
        setLoading(false);
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
    if (!currentGuardId) return;

    try {
      setLoadingShiftId(shiftId);
      const position = await getCurrentPosition();
      const res = await axios.put(`${apiUrl}/api/shifts/${shiftId}/check-in`, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        previousGuardId: checkInSelection[shiftId] || undefined
      });
      const distance = res.data?.checkInDistanceMeters;
      showToast(
        typeof distance === 'number' ? `Checked in — ${distance}m from site.` : 'Checked in successfully.',
        'success'
      );
      await refreshShifts();
    } catch (error: any) {
      showToast(error?.response?.data?.error || error?.message || 'Check in failed.', 'error');
    } finally {
      setLoadingShiftId('');
    }
  };

  const handleCheckOut = async (shiftId: string) => {
    if (!currentGuardId) return;

    try {
      setLoadingShiftId(shiftId);
      const position = await getCurrentPosition();
      const res = await axios.put(`${apiUrl}/api/shifts/${shiftId}/check-out`, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        nextGuardId: checkOutSelection[shiftId] || undefined
      });
      const distance = res.data?.checkOutDistanceMeters;
      showToast(
        typeof distance === 'number' ? `Checked out — ${distance}m from site.` : 'Checked out successfully.',
        'success'
      );
      await refreshShifts();
    } catch (error: any) {
      showToast(error?.response?.data?.error || error?.message || 'Check out failed.', 'error');
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

  const statusAccent: Record<string, string> = {
    ACTIVE: 'border-l-emerald-500',
    COMPLETED: 'border-l-gray-300',
    CANCELLED: 'border-l-rose-400',
    SCHEDULED: 'border-l-indigo-400',
  };

  const renderShift = (shift: Shift) => (
    <div
      key={shift.id}
      className={`rounded-xl border border-gray-200 border-l-4 bg-white p-4 shadow-sm ${statusAccent[shift.status] || 'border-l-indigo-400'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {shift.site?.name || 'Unassigned Site'}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-700">
            <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {new Date(shift.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <p className="mt-0.5 pl-5 text-xs text-gray-500">
            until {shift.endTime ? new Date(shift.endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}
          </p>
        </div>
        <StatusBadge label={shift.status} tone={getStatusTone(shift.status)} />
      </div>

      {(shift.checkedInAt || shift.checkedOutAt) && (
        <div className="mt-3 space-y-1 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">
          {shift.checkedInAt && (
            <p className="flex items-center gap-1.5">
              <LogIn className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              In: {new Date(shift.checkedInAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              {shift.checkInFromUser ? ` · from ${shift.checkInFromUser.name}` : ''}
            </p>
          )}
          {shift.checkedOutAt && (
            <p className="flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5 shrink-0 text-rose-600" />
              Out: {new Date(shift.checkedOutAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              {shift.checkOutToUser ? ` · to ${shift.checkOutToUser.name}` : ''}
            </p>
          )}
        </div>
      )}

      <p className="mt-2 text-xs font-semibold text-gray-700">
        Hours worked: {typeof shift.workedHours === 'number' ? shift.workedHours.toFixed(2) : '0.00'}h
      </p>

      {!shift.checkedInAt && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <ArrowRightLeft className="h-3 w-3" />
            Guard before you (handover from) — optional
          </label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-base text-black sm:text-sm"
            value={checkInSelection[shift.id] || ''}
            onChange={(e) => setCheckInSelection((prev) => ({ ...prev, [shift.id]: e.target.value }))}
          >
            <option value="">No handover / not applicable</option>
            {guards.map((guard) => (
              <option key={guard.id} value={guard.id}>
                {guard.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleCheckIn(shift.id)}
            disabled={loadingShiftId === shift.id}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loadingShiftId === shift.id ? 'Getting location...' : 'Check In'}
          </button>
        </div>
      )}

      {shift.checkedInAt && !shift.checkedOutAt && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <ArrowRightLeft className="h-3 w-3" />
            Guard after you (handover to) — optional
          </label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-base text-black sm:text-sm"
            value={checkOutSelection[shift.id] || ''}
            onChange={(e) => setCheckOutSelection((prev) => ({ ...prev, [shift.id]: e.target.value }))}
          >
            <option value="">No handover / not applicable</option>
            {guards.map((guard) => (
              <option key={guard.id} value={guard.id}>
                {guard.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleCheckOut(shift.id)}
            disabled={loadingShiftId === shift.id}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-[0.99] disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {loadingShiftId === shift.id ? 'Getting location...' : 'Check Out'}
          </button>
        </div>
      )}
    </div>
  );

  const skeletonCard = (key: number) => (
    <div key={key} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="h-4 w-1/2 rounded bg-gray-100" />
      <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
      <div className="mt-4 h-8 w-full rounded bg-gray-100" />
    </div>
  );

  return (
    <GuardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="My Schedule"
          subtitle="Check in, check out, and track your worked hours."
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Upcoming {!loading && upcomingShifts.length > 0 && `(${upcomingShifts.length})`}
          </h2>
          {loading ? (
            <div className="space-y-3">{[0, 1].map(skeletonCard)}</div>
          ) : upcomingShifts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              <CalendarX className="h-6 w-6 text-gray-300" />
              No upcoming shifts assigned.
            </div>
          ) : (
            <div className="space-y-3">{upcomingShifts.map(renderShift)}</div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Past {!loading && pastShifts.length > 0 && `(${pastShifts.length})`}
          </h2>
          {loading ? (
            <div className="space-y-3">{[0].map(skeletonCard)}</div>
          ) : pastShifts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              <CalendarX className="h-6 w-6 text-gray-300" />
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
