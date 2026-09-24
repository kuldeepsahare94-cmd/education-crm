import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { api } from '../api';
import { usePermissions } from '../context/usePermissions';
import StatusBadge from '../components/StatusBadge';

const TENURES = ['1 Month', '2 Months', '3 Months', '6 Months', '9 Months', '12 Months'];
const empty = { course_name: '', course_code: '', category: '', description: '', course_tenure: '3 Months', total_course_fees: '', emi_count: 1, status: 'Active' };

export default function Courses() {
  const can = usePermissions();
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  const load = () => api.listCourses().then(setList);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, total_course_fees: Number(form.total_course_fees) || 0, emi_count: Number(form.emi_count) || 1 };
    try {
      if (editingId) await api.updateCourse(editingId, body);
      else await api.createCourse(body);
      setForm(empty); setShowForm(false); setEditingId(null);
      load();
    } catch (err) { alert('Could not save: ' + err.message); }
  };

  const edit = (c) => { setForm(c); setEditingId(c.id); setShowForm(true); };
  const remove = async (c) => { if (confirm(`Delete course "${c.course_name}"?`)) { await api.deleteCourse(c.id); load(); } };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Courses</h1>
            <p className="text-sm text-slate-500 mt-1">Master source for fees, tenure &amp; EMI count used by Admissions.</p>
          </div>
        </div>
        {can('courses', 'create') && (
          <button onClick={() => { setForm(empty); setEditingId(null); setShowForm((s) => !s); }}
            className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700">
            {showForm ? 'Cancel' : '+ Add course'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-line rounded-xl p-5 mt-5 grid grid-cols-2 gap-4">
          <input required placeholder="Course name" className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} />
          <input placeholder="Course code" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.course_code || ''} onChange={(e) => setForm({ ...form, course_code: e.target.value })} />
          <input placeholder="Category" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <select className="border border-line rounded-lg px-3 py-2 text-sm" value={form.course_tenure} onChange={(e) => setForm({ ...form, course_tenure: e.target.value })}>
            {TENURES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="number" placeholder="Total course fees (₹)" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.total_course_fees} onChange={(e) => setForm({ ...form, total_course_fees: e.target.value })} />
          <input type="number" min="1" placeholder="EMI count" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.emi_count} onChange={(e) => setForm({ ...form, emi_count: e.target.value })} />
          <select className="border border-line rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Active</option><option>Inactive</option>
          </select>
          <textarea placeholder="Description" className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" className="col-span-2 bg-amber text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">
            {editingId ? 'Update course' : 'Save course'}
          </button>
        </form>
      )}

      <div className="bg-white border border-line rounded-xl mt-6 overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 bg-canvas border-b border-line">
              <th className="py-3 px-4 font-medium">Course</th>
              <th className="py-3 px-4 font-medium">Tenure</th>
              <th className="py-3 px-4 font-medium text-right">Fees</th>
              <th className="py-3 px-4 font-medium text-right">EMIs</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b border-line/60 hover:bg-violet-50/40 transition-colors">
                <td className="py-3 px-4">
                  <div className="text-ink font-medium">{c.course_name}</div>
                  {c.course_code && <div className="text-xs text-slate-400">{c.course_code}</div>}
                </td>
                <td className="py-3 px-4 text-slate-500">{c.course_tenure}</td>
                <td className="py-3 px-4 text-right text-slate-700">₹{Number(c.total_course_fees).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-slate-500">{c.emi_count}</td>
                <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                <td className="py-3 px-4 text-right space-x-2">
                  {can('courses', 'edit') && <button onClick={() => edit(c)} className="text-xs text-amber hover:underline">Edit</button>}
                  {can('courses', 'delete') && <button onClick={() => remove(c)} className="text-xs text-warn hover:underline">Delete</button>}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">No courses yet. Add your first one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
