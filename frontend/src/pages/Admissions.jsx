import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import Avatar from '../components/Avatar';
import { api } from '../api';
import { usePermissions } from '../context/usePermissions';
import StatusBadge from '../components/StatusBadge';
import { downloadCSV } from '../utils/csv';

const STATUSES = ['Active', 'Hold', 'Completed', 'Cancelled', 'Dropped'];
const empty = { student_id: '', course_id: '', period: '', batch: '', counselor: '', remarks: '' };

export default function Admissions() {
  const can = usePermissions();
  const [list, setList] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => api.listAdmissions({ status: statusFilter }).then(setList);
  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { api.listStudents().then(setStudents); api.listCourses({ status: 'Active' }).then(setCourses); }, []);

  const selectedCourse = courses.find((c) => String(c.id) === String(form.course_id));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.course_id) return alert('Select a student and a course.');
    try {
      // Backend auto-fetches tenure/fees/EMI from the Course Master and
      // auto-creates the first Pending payment — nothing else to send here.
      const adm = await api.createAdmission(form);
      setForm(empty); setShowForm(false);
      load();
    } catch (err) { alert('Could not save: ' + err.message); }
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Admissions</h1>
            <p className="text-sm text-slate-500 mt-1">Selecting a student + course auto-fills fees from the Course Master and creates the first pending payment.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {can('admissions', 'export') && (
            <button onClick={() => downloadCSV('admissions.csv', list)} className="border border-line text-sm font-medium px-4 py-2 rounded-lg hover:bg-white">Export CSV</button>
          )}
          {can('admissions', 'create') && (
            <button onClick={() => setShowForm((s) => !s)} className="bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700">
              {showForm ? 'Cancel' : '+ New admission'}
            </button>
          )}
        </div>
      </div>

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm mt-5">
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-line rounded-xl p-5 mt-5 grid grid-cols-2 gap-4">
          <select required className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
            <option value="">Select student…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.student_name} ({s.mobile})</option>)}
          </select>
          <select required className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
            <option value="">Select course…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.course_name}</option>)}
          </select>

          {selectedCourse && (
            <div className="col-span-2 bg-amber-soft text-sm rounded-lg px-4 py-3 grid grid-cols-3 gap-2">
              <div><div className="text-slate-500 text-xs">Tenure</div><div className="text-ink font-medium">{selectedCourse.course_tenure}</div></div>
              <div><div className="text-slate-500 text-xs">Total Fees</div><div className="text-ink font-medium">₹{Number(selectedCourse.total_course_fees).toLocaleString('en-IN')}</div></div>
              <div><div className="text-slate-500 text-xs">EMI Count</div><div className="text-ink font-medium">{selectedCourse.emi_count}</div></div>
            </div>
          )}

          <input placeholder="Period (e.g. Batch A - Morning)" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
          <input placeholder="Batch" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
          <input placeholder="Counselor" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.counselor} onChange={(e) => setForm({ ...form, counselor: e.target.value })} />
          <input placeholder="Remarks" className="border border-line rounded-lg px-3 py-2 text-sm"
            value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          <button type="submit" className="col-span-2 bg-amber text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">
            Save admission &amp; create pending payment
          </button>
        </form>
      )}

      <div className="bg-white border border-line rounded-xl mt-6 overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 bg-canvas border-b border-line">
              <th className="py-3 px-4 font-medium">Admission #</th>
              <th className="py-3 px-4 font-medium">Student</th>
              <th className="py-3 px-4 font-medium">Course</th>
              <th className="py-3 px-4 font-medium">Stage</th>
              <th className="py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-b border-line/60 hover:bg-teal-50/40 transition-colors">
                <td className="py-3 px-4"><Link to={`/admissions/${a.id}`} className="text-ink font-medium hover:text-amber">{a.admission_number}</Link></td>
                <td className="py-3 px-4 text-slate-600">
                  <div className="flex items-center gap-3">
                    <Avatar name={a.student_name} color="teal" />
                    {a.student_name}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-500">{a.course_name}</td>
                <td className="py-3 px-4"><StatusBadge status={a.admission_stage} /></td>
                <td className="py-3 px-4"><StatusBadge status={a.admission_status} /></td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">No admissions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
