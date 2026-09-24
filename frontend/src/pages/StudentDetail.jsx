import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Pencil, X, GraduationCap, ClipboardList, Wallet, Briefcase, ShieldAlert, Users } from 'lucide-react';
import { api } from '../api';
import { usePermissions } from '../context/usePermissions';
import StatusBadge from '../components/StatusBadge';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const initialsOf = (name) => (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function InfoCard({ icon: Icon, title, accent, children }) {
  return (
    <div className={`bg-white border border-line rounded-xl p-4 border-l-4 ${accent}`}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h3>
      {children}
    </div>
  );
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = usePermissions();
  const [student, setStudent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  const load = () => api.getStudent(id).then((s) => { setStudent(s); setForm(s); });
  useEffect(() => { load(); }, [id]);

  if (!student) return <div className="p-8 text-slate-400">Loading…</div>;

  const save = async (e) => {
    e.preventDefault();
    await api.updateStudent(id, form);
    setEditing(false);
    load();
  };

  const totalPaid = student.payments.filter((p) => p.status === 'Paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalDue = student.payments.filter((p) => p.status !== 'Paid').reduce((s, p) => s + Number(p.amount), 0);
  const selectedCount = student.placements.filter((p) => p.result === 'Selected').length;

  return (
    <div className="p-8 max-w-5xl">
      <button onClick={() => navigate('/students')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-ink mb-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Students
      </button>
      <p className="text-xs text-slate-300 mb-4">Students / <span className="text-slate-500">{student.student_name}</span></p>

      {/* Gradient hero header — indigo identity for the Students module */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4338CA, #6366F1)' }}>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur text-white flex items-center justify-center font-semibold text-lg shrink-0 border border-white/20">
              {initialsOf(student.student_name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>{student.student_name}</h1>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${student.status === 'Active' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/15 text-white/70'}`}>{student.status}</span>
              </div>
              <p className="text-indigo-100 text-xs mt-1">{student.qualification || 'Qualification not on file'}</p>
              <div className="flex items-center gap-3 mt-2">
                <a href={student.mobile ? `tel:${student.mobile}` : undefined} className="flex items-center gap-1 text-xs text-white/90 hover:text-white">
                  <Phone className="w-3 h-3" /> {student.mobile || '—'}
                </a>
                <a href={student.email ? `mailto:${student.email}` : undefined} className="flex items-center gap-1 text-xs text-white/90 hover:text-white">
                  <Mail className="w-3 h-3" /> {student.email || '—'}
                </a>
              </div>
            </div>
          </div>
          {can('students', 'edit') && (
            <button onClick={() => setEditing((s) => !s)} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-3 py-2 rounded-lg backdrop-blur">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {/* Quick stats */}
        <div className="relative grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
            <div className="text-white/60 text-[10px] uppercase">Admissions</div>
            <div className="text-white text-lg font-semibold">{student.admissions.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
            <div className="text-white/60 text-[10px] uppercase">Paid / Due</div>
            <div className="text-white text-lg font-semibold">{inr(totalPaid)} <span className="text-white/50 text-xs font-normal">/ {inr(totalDue)}</span></div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
            <div className="text-white/60 text-[10px] uppercase">Placements</div>
            <div className="text-white text-lg font-semibold">{selectedCount} <span className="text-white/50 text-xs font-normal">selected</span></div>
          </div>
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="bg-white border border-line rounded-xl p-5 mt-4 grid grid-cols-2 gap-3">
          <input placeholder="Name" className="border border-line rounded-lg px-3 py-2 text-sm col-span-2" value={form.student_name || ''} onChange={(e) => setForm({ ...form, student_name: e.target.value })} />
          <input placeholder="Mobile" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.mobile || ''} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <input placeholder="Alternate mobile" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.alternate_mobile || ''} onChange={(e) => setForm({ ...form, alternate_mobile: e.target.value })} />
          <input placeholder="Email" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Aadhaar number" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.aadhaar_number || ''} onChange={(e) => setForm({ ...form, aadhaar_number: e.target.value })} />
          <input placeholder="Parent name" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.parent_name || ''} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
          <input placeholder="Parent mobile" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.parent_mobile || ''} onChange={(e) => setForm({ ...form, parent_mobile: e.target.value })} />
          <input placeholder="Emergency contact" className="border border-line rounded-lg px-3 py-2 text-sm" value={form.emergency_contact || ''} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
          <select className="border border-line rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Active</option><option>Inactive</option>
          </select>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700">Save changes</button>
            <button type="button" onClick={() => setEditing(false)} className="border border-line text-sm font-medium px-4 py-2 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <InfoCard icon={ShieldAlert} title="Identity & Safety" accent="border-l-indigo-400">
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-400">Aadhaar</dt><dd className="text-ink">{student.aadhaar_number || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Emergency contact</dt><dd className="text-ink">{student.emergency_contact || '—'}</dd></div>
          </dl>
        </InfoCard>
        <InfoCard icon={Users} title="Parent / Guardian" accent="border-l-indigo-400">
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-400">Name</dt><dd className="text-ink">{student.parent_name || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Mobile</dt><dd className="text-ink">{student.parent_mobile || '—'}</dd></div>
          </dl>
        </InfoCard>
      </div>

      {student.lead_history && (
        <p className="text-xs text-slate-400 mt-3">
          Originally a lead from <span className="text-slate-600 font-medium">{student.lead_history.source || 'unknown source'}</span> ·
          <Link to={`/leads/${student.lead_history.id}`} className="text-indigo-600 hover:underline ml-1">View original lead →</Link>
        </p>
      )}

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-teal-600" /> Admissions</h2>
          <div className="space-y-2">
            {student.admissions.map((a) => (
              <Link key={a.id} to={`/admissions/${a.id}`} className="block hover:bg-canvas -mx-2 px-2 py-2 rounded-lg border border-transparent hover:border-line">
                <div className="text-sm text-ink font-medium">{a.course_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={a.admission_status} />
                  <span className="text-xs text-slate-400">{a.admission_number}</span>
                </div>
              </Link>
            ))}
            {student.admissions.length === 0 && <p className="text-sm text-slate-400">No admissions yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-amber" /> Payments</h2>
          <div className="space-y-2">
            {student.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between border border-line rounded-lg px-2.5 py-2">
                <div>
                  <div className="text-sm text-ink font-medium">{inr(p.amount)}</div>
                  <div className="text-xs text-slate-400">Installment #{p.installment_number}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
            {student.payments.length === 0 && <p className="text-sm text-slate-400">No payments yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-blue-600" /> Placements</h2>
          <div className="space-y-2">
            {student.placements.map((p) => (
              <div key={p.id} className="border border-line rounded-lg px-2.5 py-2">
                <div className="text-sm text-ink font-medium">{p.company_name}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <StatusBadge status={p.interview_status} />
                  {p.result && <StatusBadge status={p.result} />}
                </div>
              </div>
            ))}
            {student.placements.length === 0 && <p className="text-sm text-slate-400">No placement activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
