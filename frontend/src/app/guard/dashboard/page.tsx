// frontend/src/app/guard/dashboard/page.tsx
'use client';

import GuardLayout from '../../../components/GuardLayout';

export default function GuardDashboard() {
  return (
    <GuardLayout>
      <div className="space-y-6">
        
        {/* Status Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-4 border-4 border-white shadow-sm">
            <span className="text-3xl">🛑</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Currently Off Duty</h2>
          <p className="text-gray-500 text-sm mt-1">Next shift starts in 14 hours</p>
          
          <button className="mt-6 w-full bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition">
            Start Shift
          </button>
        </div>

        {/* Quick Actions */}
        <h3 className="font-bold text-gray-700 ml-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="bg-indigo-50 p-4 rounded-xl flex flex-col items-center justify-center gap-2 border border-indigo-100 hover:bg-indigo-100 transition">
            <span className="text-2xl">⚠️</span>
            <span className="text-sm font-bold text-indigo-900">Report Incident</span>
          </button>
          
          <button className="bg-green-50 p-4 rounded-xl flex flex-col items-center justify-center gap-2 border border-green-100 hover:bg-green-100 transition">
            <span className="text-2xl">📝</span>
            <span className="text-sm font-bold text-green-900">Daily Log</span>
          </button>
        </div>

        {/* Next Shift Preview */}
        <h3 className="font-bold text-gray-700 ml-1">Up Next</h3>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-gray-900">Central Bank HQ</h4>
              <p className="text-sm text-gray-500">Main Entrance</p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">Tomorrow</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span>🕒</span>
            <span>08:00 AM - 06:00 PM</span>
          </div>
        </div>

      </div>
    </GuardLayout>
  );
}