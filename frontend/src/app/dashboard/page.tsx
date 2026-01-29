'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ siteCount: 0, guardCount: 0, alertCount: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sitesRes, guardsRes, incRes] = await Promise.all([
          axios.get('http://localhost:5000/api/sites'),
          axios.get('http://localhost:5000/api/users/guards'),
          axios.get('http://localhost:5000/api/incidents')
        ]);
        const activeAlerts = incRes.data.filter((i: any) => i.status !== 'RESOLVED').length;
        setStats({
          siteCount: sitesRes.data.length,
          guardCount: guardsRes.data.length,
          alertCount: activeAlerts,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <AdminLayout> {/* <--- Wrap everything in this */}
      <div className="max-w-7xl mx-auto">
        
        {/* Simplified Header */}
        <div className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Command Center</h1>
          <p className="mt-1 text-gray-500">System Status: <span className="text-green-600 font-bold tracking-wide">● ONLINE</span></p>
        </div>
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div onClick={() => router.push('/guards')} 
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Guards</h3>
            <p className="text-4xl font-extrabold text-indigo-600 mt-2">{stats.guardCount}</p>
          </div>

          <div onClick={() => router.push('/sites')} 
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Monitored Sites</h3>
            <p className="text-4xl font-extrabold text-blue-600 mt-2">{stats.siteCount}</p>
          </div>

          <div onClick={() => router.push('/incidents')} 
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active  Alerts</h3>
            <p className={`text-4xl font-extrabold mt-2 ${stats.alertCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {stats.alertCount}
            </p>
          </div>
          
        </div>

        {/* Welcome Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-8 text-white shadow-xl">
          <h2 className="text-2xl font-bold mb-2">Welcome back, Admin.</h2>
          <p className="text-blue-200 max-w-2xl">
            You have full control over site operations. Use the sidebar on the left to manage personnel, 
            schedule shifts, or review incident logs in real-time.
          </p>
        </div>

      </div>
    </AdminLayout>
  );
}