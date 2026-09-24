import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import Avatar from '../components/Avatar';
import { api } from '../api';
import { usePermissions } from '../context/usePermissions';
import StatusBadge from '../components/StatusBadge';
import { downloadCSV } from '../utils/csv';

const INTERVIEW_STATUSES = ['Scheduled', 'Rescheduled', 'Attended', 'Cancelled'];
const RESULTS = ['Selected', 'Rejected', 'Waiting', 'Hold'];
const empty = { student_id: '', company_id: '', interview_date: '', interview_round: '', interview_status: 'Scheduled', result: '', package: '', joining_date: '', remarks: '' };

export default function Placements() {
  const can = usePermissions();
  const [list, setList] = useState([]);
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  const load = () => api.listPlacements().then(setList);
  useEffect(() => { load(); api.listStudents().then(setStudents); api.listCompanies().then(setCompanies); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.updatePlacement(editingId, form);
      else await api.createPlacement(form);
      setForm(empty); setShowForm(false); setEditingId(null);
      load();
    } catch (err) { alert('Could not save: ' + err.message); }
  };

  const edit = (p) => { setForm({ ...empty, ...p, interview_date: p.interview_date?.slice(0, 10) || '', joining_date: p.joining_date?.slice(0, 10) || '' }); setEditingId(p.id); setShowForm(true); };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Placements</h1>
            <p className="text-sm text-slate-500 mt-1">Schedule interviews, then update status and result as they progress.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {can('placements', 'export') && (
            <button onClick={() => downloadCSV('placements.csv', list)} className="border border-line text-sm font-medium px-4 py-2 rounded-lg hover:bg-white">Export CSV</button>
          )}
          {can('placements', 'create') && (
            <button onClick={() => { setForm(empty); setEditingId(null); setShowForm((s) => !s); }} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
              {showForm ? 'Cancel' : '+ Schedule interview'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-line rounded-xl p-5 mt-5 grid grid-cols-2 gap-4">
          <select required className="border border-line rounded-lg px-3 py-2 text-sm" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
            <option value="">Select student…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.student_name}</option>)}
          </select>
          <select required className="border border-line rounded-lg px-3 py-2 text-sm" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
            <option value="">Select company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <input type="date" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.interview_date} onChange={(e) => setForm({ ...form, interview_date: e.target.value })} />
          <input placeholder="Interview round" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.interview_round} onChange={(e) => setForm({ ...form, interview_round: e.target.value })} />
          <select className="border border-line rounded-lg px-3 py-2 text-sm" value={form.interview_status} onChange={(e) => setForm({ ...form, interview_status: e.target.value })}>
            {INTERVIEW_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="border border-line rounded-lg px-3 py-2 text-sm" value={form.result || ''} onChange={(e) => setForm({ ...form, result: e.target.value })}>
            <option value="">Result (pending)…</option>
            {RESULTS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <input placeholder="Package offered" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} />
          <input type="date" placeholder="Joining date" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
          <textarea placeholder="Remarks" className="border border-line rounded-lg px-3 py-2 text-sm col-span-2" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          <button type="submit" className="col-span-2 bg-amber text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">
            {editingId ? 'Update placement' : 'Save placement'}
          </button>
        </form>
      )}

      <div className="bg-white border border-line rounded-xl mt-6 overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 bg-canvas border-b border-line">
              <th className="py-3 px-4 font-medium">Student</th>
              <th className="py-3 px-4 font-medium">Company</th>
              <th className="py-3 px-4 font-medium">Interview Date</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Result</th>
              <th className="py-3 px-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-line/60 hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-4 text-ink font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.student_name} color="blue" />
                    {p.student_name}
                  </div>
                </td>
                <td className="py-3 px-4"><Link to={`/companies/${p.company_id}`} className="text-slate-600 hover:text-amber">{p.company_name}</Link></td>
                <td className="py-3 px-4 text-slate-400 text-xs">{p.interview_date?.slice(0, 10) || '—'}</td>
                <td className="py-3 px-4"><StatusBadge status={p.interview_status} /></td>
                <td className="py-3 px-4">{p.result ? <StatusBadge status={p.result} /> : '—'}</td>
                <td className="py-3 px-4 text-right">
                  {can('placements', 'edit') && <button onClick={() => edit(p)} className="text-xs text-amber hover:underline">Update</button>}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">No interviews scheduled yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
