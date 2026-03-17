'use client';


import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { resolveApiUrl } from '../../lib/api-url';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';

export default function Dashboard() {
  const router = useRouter();
  const apiUrl = resolveApiUrl();
  const [stats, setStats] = useState({
    siteCount: 0,
    guardCount: 0,
    alertCount: 0,
    shiftsToday: 0,
    incidentsToday: 0,
    guardsOnDuty: 0,
  });
  const [recentIncidents, setRecentIncidents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sitesRes, guardsRes, incRes, shiftsRes] = await Promise.all([
          axios.get(`${apiUrl}/api/sites`),
          axios.get(`${apiUrl}/api/users/guards`),
          axios.get(`${apiUrl}/api/incidents`),
          axios.get(`${apiUrl}/api/shifts`),
        ]);
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        // Incidents today
        const incidentsToday = incRes.data.filter((i: any) => i.createdAt && i.createdAt.slice(0, 10) === todayStr).length;
        // Shifts today
        const shiftsToday = shiftsRes.data.filter((s: any) => s.date && s.date.slice(0, 10) === todayStr).length;
        // Guards on duty now
        const now = new Date();
        const guardsOnDuty = shiftsRes.data.filter((s: any) => {
          if (!s.startTime || !s.endTime) return false;
          const start = new Date(s.startTime);
          const end = new Date(s.endTime);
          return start <= now && now <= end;
        }).length;
        // Active alerts
        const activeAlerts = incRes.data.filter((i: any) => i.status !== 'RESOLVED').length;
        setStats({
          siteCount: sitesRes.data.length,
          guardCount: guardsRes.data.length,
          alertCount: activeAlerts,
          shiftsToday,
          incidentsToday,
          guardsOnDuty,
        });
        // Recent incidents (last 5)
        setRecentIncidents(incRes.data.slice(-5).reverse());
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          return;
        }
        console.error('Error loading stats:', error);
      }
    };
    fetchData();
  }, [apiUrl]);

  return (
    <AdminLayout> {/* <--- Wrap everything in this */}
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Command Center"
          subtitle="Live overview of security operations."
          right={<StatusBadge label="System Online" tone="success" />}
        />
        

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div onClick={() => router.push('/guards')}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition hover:-translate-y-0.5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Guards</h3>
            <p className="text-3xl md:text-4xl font-extrabold text-indigo-600 mt-2">{stats.guardCount}</p>
          </div>
          <div onClick={() => router.push('/sites')}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition hover:-translate-y-0.5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Monitored Sites</h3>
            <p className="text-3xl md:text-4xl font-extrabold text-blue-600 mt-2">{stats.siteCount}</p>
          </div>
          <div onClick={() => router.push('/incidents')}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition hover:-translate-y-0.5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Alerts</h3>
            <p className={`text-3xl md:text-4xl font-extrabold mt-2 ${stats.alertCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{stats.alertCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Shifts Today</h3>
            <p className="text-3xl md:text-4xl font-extrabold text-green-600 mt-2">{stats.shiftsToday}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Incidents Today</h3>
            <p className="text-3xl md:text-4xl font-extrabold text-orange-600 mt-2">{stats.incidentsToday}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Guards On Duty</h3>
            <p className="text-3xl md:text-4xl font-extrabold text-emerald-600 mt-2">{stats.guardsOnDuty}</p>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-10">
          <h3 className="text-lg font-bold mb-4">Recent Incidents</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Severity</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentIncidents.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-3 text-gray-400 text-center">No recent incidents.</td></tr>
                )}
                {recentIncidents.map((inc: any) => (
                  <tr key={inc.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{inc.title}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${inc.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' : inc.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{inc.severity}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${inc.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{inc.status}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{inc.createdAt ? new Date(inc.createdAt).toLocaleString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="mt-10 md:mt-12 bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-5 md:p-8 text-white shadow-xl">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Welcome back, Admin.</h2>
          <p className="text-blue-200 max-w-2xl">
            You have full control over site operations. Use the sidebar on the left to manage personnel, 
            schedule shifts, or review incident logs in real-time.
          </p>
        </div>

      </div>
    </AdminLayout>
  );
}
