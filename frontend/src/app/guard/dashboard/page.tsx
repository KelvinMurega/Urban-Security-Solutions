// frontend/src/app/guard/dashboard/page.tsx
'use client';



import Link from 'next/link';
import GuardLayout from '../../../components/GuardLayout';

export default function GuardDashboard() {
  // Home page UI with quick links to all subpages
  return (
    <GuardLayout>
      <div className="max-w-lg mx-auto p-4 space-y-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-4xl shadow-lg mb-2">
            <span role="img" aria-label="guard">🛡️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, Officer</h1>
          <p className="text-gray-500 text-sm">Your security dashboard</p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/guard/schedule" className="bg-blue-50 hover:bg-blue-100 p-5 rounded-xl flex flex-col items-center justify-center gap-2 border border-blue-100 shadow-sm transition">
            <span className="text-3xl">📅</span>
            <span className="text-sm font-bold text-blue-900">My Schedule</span>
          </Link>
          <Link href="/guard/history" className="bg-green-50 hover:bg-green-100 p-5 rounded-xl flex flex-col items-center justify-center gap-2 border border-green-100 shadow-sm transition">
            <span className="text-3xl">📝</span>
            <span className="text-sm font-bold text-green-900">Daily Logs</span>
          </Link>
          <Link href="/guard/report" className="bg-yellow-50 hover:bg-yellow-100 p-5 rounded-xl flex flex-col items-center justify-center gap-2 border border-yellow-100 shadow-sm transition">
            <span className="text-3xl">⚠️</span>
            <span className="text-sm font-bold text-yellow-900">Report Incident</span>
          </Link>
          <Link href="/guard/profile" className="bg-indigo-50 hover:bg-indigo-100 p-5 rounded-xl flex flex-col items-center justify-center gap-2 border border-indigo-100 shadow-sm transition">
            <span className="text-3xl">👤</span>
            <span className="text-sm font-bold text-indigo-900">My Profile</span>
          </Link>
        </div>

        {/* Assignment Quick Card */}
        <div className="bg-white rounded-xl shadow p-4 mt-8">
          <h2 className="font-bold text-gray-800 mb-2">Today's Assignment</h2>
          <p className="text-gray-600 text-sm mb-2">Select or view your assigned site for today in your schedule page.</p>
          <Link href="/guard/schedule" className="inline-block bg-indigo-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-indigo-700 transition">Go to Schedule</Link>
        </div>
      </div>
    </GuardLayout>
  );
}