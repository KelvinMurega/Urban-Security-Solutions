"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import GuardLayout from "../../../components/GuardLayout";
import { resolveApiUrl } from "../../../lib/api-url";

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

export default function GuardDashboard() {
  const apiUrl = resolveApiUrl();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

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

  return (
    <GuardLayout>
      <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-6">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 sm:p-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome, {user?.name?.split(" ")[0] || "Officer"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here is your live assignment overview.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-xs text-blue-700 font-semibold uppercase">
              Scheduled
            </p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {shifts.length}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
            <p className="text-xs text-emerald-700 font-semibold uppercase">
              This Week
            </p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">
              {thisWeekCount}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <p className="text-xs text-amber-700 font-semibold uppercase">
              Incidents Logged
            </p>
            <p className="text-2xl font-bold text-amber-900 mt-1">
              {incidents.length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 sm:p-5">
          <h2 className="font-bold text-gray-800 mb-2">Next Assignment</h2>
          {nextShift ? (
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">Site:</span>{" "}
                {nextShift.site?.name || "Unassigned site"}
              </p>
              <p>
                <span className="font-semibold">Start:</span>{" "}
                {new Date(nextShift.startTime).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold">End:</span>{" "}
                {nextShift.endTime
                  ? new Date(nextShift.endTime).toLocaleString()
                  : "TBD"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No upcoming assignment found.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/guard/schedule"
            className="bg-indigo-600 text-white rounded-lg p-4 text-center font-semibold hover:bg-indigo-700 transition"
          >
            View Schedule
          </Link>
          <Link
            href="/guard/report"
            className="bg-red-600 text-white rounded-lg p-4 text-center font-semibold hover:bg-red-700 transition"
          >
            File Report
          </Link>
          <Link
            href="/guard/history"
            className="bg-white border border-gray-200 rounded-lg p-4 text-center font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            My History
          </Link>
          <Link
            href="/guard/profile"
            className="bg-white border border-gray-200 rounded-lg p-4 text-center font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            My Profile
          </Link>
        </div>
      </div>
    </GuardLayout>
  );
}
