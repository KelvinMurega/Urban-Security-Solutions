"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  CalendarCheck,
  CalendarDays,
  AlertTriangle,
  MapPin,
  Clock,
  ShieldAlert,
  ClipboardList,
  UserCircle,
  ArrowRight,
} from "lucide-react";
import GuardLayout from "../../../components/GuardLayout";
import { resolveApiUrl } from "../../../lib/api-url";
import StatusBadge from "../../../components/ui/StatusBadge";

type Shift = {
  id: string;
  userId: string;
  site?: { name?: string };
  startTime: string;
  endTime?: string;
  status: string;
};

type Incident = {
  id: string;
  userId: string;
  title: string;
  severity: string;
  createdAt: string;
};

type StoredUser = {
  id: string;
  name: string;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function GuardDashboard() {
  const apiUrl = resolveApiUrl();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return;

    const parsed: StoredUser = JSON.parse(userRaw);
    setUser(parsed);

    const fetchDashboard = async () => {
      try {
        const [shiftRes, incidentRes] = await Promise.all([
          axios.get(`${apiUrl}/api/shifts`),
          axios.get(`${apiUrl}/api/incidents`),
        ]);

        const guardShifts = (shiftRes.data as Shift[]).filter(
          (shift) => shift.userId === parsed.id,
        );
        const guardIncidents = (incidentRes.data as Incident[]).filter(
          (incident) => incident.userId === parsed.id,
        );

        setShifts(guardShifts);
        setIncidents(guardIncidents);
      } catch (error) {
        console.error("Failed to load guard dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [apiUrl]);

  const nextShift = useMemo(() => {
    const now = Date.now();
    return [...shifts]
      .filter((shift) => new Date(shift.startTime).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )[0];
  }, [shifts]);

  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return shifts.filter((shift) => new Date(shift.startTime) >= weekStart)
      .length;
  }, [shifts]);

  const isToday = nextShift ? new Date(nextShift.startTime).toDateString() === new Date().toDateString() : false;

  return (
    <GuardLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white shadow-sm sm:p-6">
          <p className="text-sm font-medium text-indigo-100">{getGreeting()},</p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {user?.name?.split(" ")[0] || "Officer"}
          </h1>
          <p className="mt-1 text-sm text-indigo-100">
            Here is your live assignment overview.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={CalendarCheck}
            label="Scheduled"
            value={shifts.length}
            loading={loading}
            tone="blue"
          />
          <StatCard
            icon={CalendarDays}
            label="This Week"
            value={thisWeekCount}
            loading={loading}
            tone="emerald"
          />
          <StatCard
            icon={AlertTriangle}
            label="Incidents"
            value={incidents.length}
            loading={loading}
            tone="amber"
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Next Assignment</h2>
            {nextShift && <StatusBadge label={isToday ? "Today" : "Upcoming"} tone={isToday ? "success" : "info"} />}
          </div>
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-2/3 rounded bg-gray-100" />
              <div className="h-4 w-1/2 rounded bg-gray-100" />
            </div>
          ) : nextShift ? (
            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-indigo-500" />
                {nextShift.site?.name || "Unassigned site"}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-indigo-500" />
                {new Date(nextShift.startTime).toLocaleString()}
                {" → "}
                {nextShift.endTime ? new Date(nextShift.endTime).toLocaleString() : "TBD"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No upcoming assignment found.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <QuickAction href="/guard/schedule" icon={CalendarDays} label="View Schedule" tone="primary" />
          <QuickAction href="/guard/report" icon={ShieldAlert} label="File Report" tone="danger" />
          <QuickAction href="/guard/history" icon={ClipboardList} label="My History" tone="neutral" />
          <QuickAction href="/guard/profile" icon={UserCircle} label="My Profile" tone="neutral" />
        </div>
      </div>
    </GuardLayout>
  );
}

const statTones: Record<string, string> = {
  blue: "bg-blue-50 border-blue-100 text-blue-700",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
  amber: "bg-amber-50 border-amber-100 text-amber-700",
};

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  loading: boolean;
  tone: "blue" | "emerald" | "amber";
}) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${statTones[tone]}`}>
      <Icon className="h-4 w-4" />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">{label}</p>
      {loading ? (
        <div className="mt-1.5 h-6 w-8 animate-pulse rounded bg-black/10" />
      ) : (
        <p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p>
      )}
    </div>
  );
}

const actionTones: Record<string, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  neutral: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
};

function QuickAction({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: "primary" | "danger" | "neutral";
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-xl p-4 font-semibold shadow-sm transition active:scale-[0.98] ${actionTones[tone]}`}
    >
      <span className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <ArrowRight className="h-4 w-4 opacity-60" />
    </Link>
  );
}
