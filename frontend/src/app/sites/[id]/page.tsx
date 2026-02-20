// frontend/src/app/sites/[id]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Guard = {
  id: string;
  name: string;
  email: string;
  siteId?: string;
  site?: { name: string };
};

type Site = {
  id: string;
  name: string;
  address: string;
  contactPhone?: string;
  users: Guard[];
};
export default function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  // Data State
  const [site, setSite] = useState<Site | null>(null);
  const [allGuards, setAllGuards] = useState<Guard[]>([]); // To populate the dropdown

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; address: string; contactPhone: string }>({ name: '', address: '', contactPhone: '' });

  // Assigning State
  const [selectedGuardId, setSelectedGuardId] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Fetch Data
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [siteRes, guardsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sites/${id}`),
        axios.get(`${API_URL}/api/users/guards`)
      ]);
      setSite(siteRes.data);
      setAllGuards(guardsRes.data);

      // Pre-fill edit form
      setEditForm({
        name: siteRes.data.name,
        address: siteRes.data.address,
        contactPhone: siteRes.data.contactPhone || ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Handle Site Update (Edit Details)
  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/sites/${id}`, editForm);
      setIsEditing(false);
      fetchData(); // Refresh data
    } catch (err) {
      alert('Failed to update site details.');
    }
  };

  // 3. Handle Assigning an Existing Guard
  const handleAssignGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuardId) return;

    setLoading(true);
    try {
      // We update the guard's "siteId" to match THIS site
      await axios.put(`${API_URL}/api/users/guards/${selectedGuardId}`, {
        siteId: id
      });

      setSelectedGuardId('');
      fetchData(); // Refresh lists
    } catch (err) {
      alert('Failed to assign guard.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Removing a Guard (Unassign)
  const handleRemoveGuard = async (guardId: string) => {
    if(!confirm("Remove this guard from the site?")) return;
    try {
      // Set siteId to undefined to unassign (backend expects undefined or omit)
      await axios.put(`${API_URL}/api/users/guards/${guardId}`, {
        siteId: undefined
      });
      fetchData();
    } catch (err) {
      alert('Failed to remove guard.');
    }
  };

  if (!site) return <AdminLayout><div className="p-8">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* SECTION 1: SITE DETAILS HEADER (Editable) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          {!isEditing ? (
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{site.name}</h1>
                <div className="mt-2 space-y-1 text-gray-600">
                  <p>📍 {site.address}</p>
                  <p>📞 {site.contactPhone || 'No phone listed'}</p>
                </div>
              </div>
              <div className="space-x-2">
                 <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition font-medium"
                >
                  ✎ Edit Details
                </button>
                 <button onClick={() => router.push('/sites')} className="text-gray-500 hover:text-black px-4">Back</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateSite} className="space-y-4">
              <h2 className="text-xl font-bold text-blue-900">Editing Site Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input className="border p-2 rounded text-black" placeholder="Site Name" 
                  value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
                <input className="border p-2 rounded text-black" placeholder="Address" 
                  value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} required />
                <input className="border p-2 rounded text-black" placeholder="Contact Phone" 
                  value={editForm.contactPhone} onChange={e => setEditForm({...editForm, contactPhone: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save Changes</button>
                <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancel</button>
              </div>
            </form>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* SECTION 2: ASSIGNED GUARDS LIST */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              👮 Assigned Personnel 
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{(site.users || []).length}</span>
            </h2>
            
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {(site.users || []).length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic">No guards currently assigned.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(site.users || []).map((guard: any) => (
                    <li key={guard.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                           {guard.name.charAt(0)}
                         </div>
                         <div>
                           <p className="font-bold text-gray-800 text-sm">{guard.name}</p>
                           <p className="text-xs text-gray-500">{guard.email}</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveGuard(guard.id)}
                        className="text-red-400 hover:text-red-600 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Unassign
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* SECTION 3: ASSIGN EXISTING GUARD */}
          <div className="bg-white p-6 rounded-lg shadow h-fit border-t-4 border-indigo-600">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Deploy Existing Guard</h3>
            <p className="text-sm text-gray-500 mb-4">Select a guard from your workforce to assign to this location.</p>
            
            <form onSubmit={handleAssignGuard} className="space-y-4">
              <select 
                className="w-full border p-2 rounded text-black"
                value={selectedGuardId}
                onChange={e => setSelectedGuardId(e.target.value)}
                required
              >
                <option value="">-- Select Guard --</option>
                {allGuards
                  .filter(g => g.siteId !== id) // Hide guards already here
                  .map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.site ? `(Currently at: ${g.site.name})` : '(Unassigned)'}
                    </option>
                ))}
              </select>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 font-bold shadow transition"
              >
                {loading ? 'Assigning...' : 'Assign to Site'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}