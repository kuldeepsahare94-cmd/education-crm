import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import Avatar from '../components/Avatar';
import { api } from '../api';
import { usePermissions } from '../context/usePermissions';
import StatusBadge from '../components/StatusBadge';
import { downloadCSV } from '../utils/csv';

export default function Students() {
  const can = usePermissions();
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');

  const load = () => api.listStudents({ q }).then(setList);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Students</h1>
            <p className="text-sm text-slate-500 mt-1">Converted from leads. Admit them into a course to start the fee cycle.</p>
          </div>
        </div>
        {can('students', 'export') && (
          <button onClick={() => downloadCSV('students.csv', list)} className="border border-line text-sm font-medium px-4 py-2 rounded-lg hover:bg-white">Export CSV</button>
        )}
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, mobile, email…"
        className="border border-line rounded-lg px-3 py-2 text-sm mt-5 w-full max-w-md" />

      <div className="bg-white border border-line rounded-xl mt-6 overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 bg-canvas border-b border-line">
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Mobile</th>
              <th className="py-3 px-4 font-medium">Qualification</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Admissions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-b border-line/60 hover:bg-indigo-50/40 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.student_name} color="indigo" />
                    <Link to={`/students/${s.id}`} className="text-ink font-medium hover:text-indigo-600">{s.student_name}</Link>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-500">{s.mobile}</td>
                <td className="py-3 px-4 text-slate-500">{s.qualification || '—'}</td>
                <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                <td className="py-3 px-4 text-right">{s.admission_count}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">No students yet — convert a lead first.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
