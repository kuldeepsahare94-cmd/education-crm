import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import Avatar from '../components/Avatar';
import { api } from '../api';
import { usePermissions } from '../context/usePermissions';
import { downloadCSV } from '../utils/csv';

const empty = { company_name: '', industry: '', hr_name: '', hr_mobile: '', email: '', website: '', address: '', contact_person: '', notes: '' };

export default function Companies() {
  const can = usePermissions();
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.listCompanies().then(setList);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.createCompany(form); setForm(empty); setShowForm(false); load(); }
    catch (err) { alert('Could not save: ' + err.message); }
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Companies</h1>
            <p className="text-sm text-slate-500 mt-1">Recruiters you place students with.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {can('companies', 'export') && (
            <button onClick={() => downloadCSV('companies.csv', list)} className="border border-line text-sm font-medium px-4 py-2 rounded-lg hover:bg-white">Export CSV</button>
          )}
          {can('companies', 'create') && (
            <button onClick={() => setShowForm((s) => !s)} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
              {showForm ? 'Cancel' : '+ Add company'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-line rounded-xl p-5 mt-5 grid grid-cols-2 gap-4">
          <input required placeholder="Company name" className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <input placeholder="Industry" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          <input placeholder="Website" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <input placeholder="HR name" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.hr_name} onChange={(e) => setForm({ ...form, hr_name: e.target.value })} />
          <input placeholder="HR mobile" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.hr_mobile} onChange={(e) => setForm({ ...form, hr_mobile: e.target.value })} />
          <input placeholder="Email" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Contact person" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          <input placeholder="Address" className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <textarea placeholder="Notes" className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" className="col-span-2 bg-amber text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">Save company</button>
        </form>
      )}

      <div className="bg-white border border-line rounded-xl mt-6 overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 bg-canvas border-b border-line">
              <th className="py-3 px-4 font-medium">Company</th>
              <th className="py-3 px-4 font-medium">Industry</th>
              <th className="py-3 px-4 font-medium">HR Contact</th>
              <th className="py-3 px-4 font-medium text-right">Placements</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b border-line/60 hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.company_name} color="blue" />
                    <Link to={`/companies/${c.id}`} className="text-ink font-medium hover:text-blue-600">{c.company_name}</Link>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-500">{c.industry || '—'}</td>
                <td className="py-3 px-4 text-slate-500">{c.hr_name} {c.hr_mobile ? `· ${c.hr_mobile}` : ''}</td>
                <td className="py-3 px-4 text-right">{c.placement_count}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400">No companies yet. Add your first one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
