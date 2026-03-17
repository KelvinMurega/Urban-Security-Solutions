// frontend/src/app/sites/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { resolveApiUrl } from '../../lib/api-url';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/ToastProvider';

export default function SitesPage() {
  const router = useRouter();
  const apiUrl = resolveApiUrl();
  const { showToast } = useToast();
  const [sites, setSites] = useState<any[]>([]);
  
  // MODAL STATE
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', address: '', location: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch Sites
  const fetchSites = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/sites`);
      setSites(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load sites.', 'error');
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  // 2. Handle Create Submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${apiUrl}/api/sites`, newSite);
      
      // Success: Close modal, reset form, refresh list
      setShowCreateModal(false);
      setNewSite({ name: '', address: '', location: '' });
      fetchSites();
      showToast('Site created successfully.', 'success');
    } catch (err) {
      showToast('Failed to create site. Name may already exist.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto relative">
        
        <PageHeader
          title="Site Management"
          subtitle="Select a site to view details or assign guards."
          right={
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800 transition shadow-lg flex items-center justify-center gap-2"
            >
              <span>+</span> Add New Site
            </button>
          }
        />

        {/* Sites Grid */}
        {sites.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded-lg text-gray-400 border border-dashed border-gray-300">
            No sites found. Add your first site to start assigning guards.
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <div 
              key={site.id}
              onClick={() => router.push(`/sites/${site.id}`)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition group"
            >
              <div className="flex justify-between items-start gap-3">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-700 transition">
                  {site.name}
                </h3>
                <span className="text-2xl text-gray-300 group-hover:text-blue-500">🏢</span>
              </div>
              
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  📍 {site.address}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  📍 {site.location || 'No location notes'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                <StatusBadge label="Active" tone="success" />
                <span className="text-blue-600 text-sm font-medium">Manage &rarr;</span>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* --- CREATE SITE MODAL --- */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white p-5 md:p-8 rounded-lg shadow-2xl w-full max-w-md transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Register New Location</h2>
              
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                  <input 
                    autoFocus
                    placeholder="e.g. Westside Mall" 
                    className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newSite.name}
                    onChange={e => setNewSite({...newSite, name: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input 
                    placeholder="e.g. 123 Market St, Nairobi" 
                    className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newSite.address}
                    onChange={e => setNewSite({...newSite, address: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Notes</label>
                  <input 
                    placeholder="e.g. Near west gate" 
                    className="w-full border p-2 rounded text-black focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newSite.location}
                    onChange={e => setNewSite({...newSite, location: e.target.value})}
                    required
                  />
                </div>

                <div className="flex gap-3 mt-6 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-900 text-white py-2 rounded hover:bg-blue-800 font-bold shadow transition"
                  >
                    {loading ? 'Creating...' : 'Create Site'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
