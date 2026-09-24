import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, X, UserPlus, Trash2 } from 'lucide-react';
import { api } from '../api';
import { usePermissions } from '../context/usePermissions';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';

const empty = { name: '', batch_code: '', course_id: '', trainer: '', schedule_text: '', start_date: '', end_date: '', status: 'Active' };

function RosterModal({ batch, students, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [addStudentId, setAddStudentId] = useState('');

  const load = () => api.getBatch(batch.id).then(setDetail);
  useEffect(() => { load(); }, [batch.id]);

  const add = async (e) => {
    e.preventDefault();
    if (!addStudentId) return;
    await api.addStudentToBatch(batch.id, addStudentId);
    setAddStudentId('');
    load();
    onChanged();
  };

  const remove = async (studentId) => {
    await api.removeStudentFromBatch(batch.id, studentId);
    load();
    onChanged();
  };

  const rosterIds = new Set((detail?.roster || []).map((r) => r.student_id));
  const availableStudents = students.filter((s) => !rosterIds.has(s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl p-5 w-full max-w-md relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-ink"><X className="w-4 h-4" /></button>
        <h2 className="text-sm font-semibold text-ink mb-1">{batch.name}</h2>
        <p className="text-xs text-slate-400 mb-4">Roster — {detail?.roster?.length ?? 0} students</p>

        <form onSubmit={add} className="flex gap-2 mb-4">
          <select className="border border-line rounded-lg px-2 py-2 text-sm flex-1" value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)}>
            <option value="">Add a student…</option>
            {availableStudents.map((s) => <option key={s.id} value={s.id}>{s.student_name}</option>)}
          </select>
          <button type="submit" className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700"><UserPlus className="w-4 h-4" /></button>
        </form>

        <div className="space-y-2">
          {detail?.roster?.map((r) => (
            <div key={r.student_id} className="flex items-center justify-between bg-canvas rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Avatar name={r.student_name} color="teal" />
                <span className="text-sm text-ink">{r.student_name}</span>
              </div>
              <button onClick={() => remove(r.student_id)} className="text-slate-400 hover:text-warn"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {detail?.roster?.length === 0 && <p className="text-sm text-slate-400">No students on this roster yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default function Batches() {
  const can = usePermissions();
  const [list, setList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [rosterFor, setRosterFor] = useState(null);

  const load = () => api.listBatches().then(setList);
  useEffect(() => {
    load();
    api.listCourses({ status: 'Active' }).then(setCourses);
    api.listStudents().then(setStudents);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.createBatch({ ...form, course_id: form.course_id || null });
      setForm(empty); setShowForm(false); load();
    } catch (err) { alert('Could not save: ' + err.message); }
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Batches</h1>
            <p className="text-sm text-slate-500 mt-1">Group students into batches, then take attendance per batch per day.</p>
          </div>
        </div>
        {can('attendance', 'create') && (
          <button onClick={() => setShowForm((s) => !s)} className="bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700">
            {showForm ? 'Cancel' : '+ New batch'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-line rounded-xl p-5 mt-5 grid grid-cols-2 gap-4">
          <input required placeholder="Batch name (e.g. FSD Morning Batch A)" className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Batch code" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.batch_code} onChange={(e) => setForm({ ...form, batch_code: e.target.value })} />
          <select className="border border-line rounded-lg px-3 py-2 text-sm" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
            <option value="">Select course…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.course_name}</option>)}
          </select>
          <input placeholder="Trainer" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} />
          <input placeholder="Schedule (e.g. Mon-Fri 9-11AM)" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.schedule_text} onChange={(e) => setForm({ ...form, schedule_text: e.target.value })} />
          <input type="date" placeholder="Start date" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <input type="date" placeholder="End date" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <button type="submit" className="col-span-2 bg-teal-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-teal-700">Save batch</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {list.map((b) => (
          <div key={b.id} className="bg-white border border-line rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">{b.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{b.course_name || 'No course linked'} {b.trainer ? `· ${b.trainer}` : ''}</p>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-xs text-slate-500 mt-2">{b.schedule_text || 'No schedule set'}</p>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-400">{b.student_count} students enrolled</span>
              <div className="flex gap-2">
                {can('attendance', 'edit') && (
                  <button onClick={() => setRosterFor(b)} className="text-xs font-medium border border-line px-2.5 py-1.5 rounded-lg hover:bg-canvas">Manage Roster</button>
                )}
                <Link to={`/attendance?batch_id=${b.id}`} className="text-xs font-medium bg-teal-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-teal-700">Take Attendance</Link>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="col-span-2 bg-white border border-line rounded-xl p-8 text-center text-slate-400 text-sm">
            No batches yet. Create one to start taking attendance.
          </div>
        )}
      </div>

      {rosterFor && <RosterModal batch={rosterFor} students={students} onClose={() => setRosterFor(null)} onChanged={load} />}
    </div>
  );
}
