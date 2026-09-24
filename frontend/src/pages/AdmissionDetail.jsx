import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Wallet, Calendar, Layers } from 'lucide-react';
import { api } from '../api';
import { usePermissions } from '../context/usePermissions';
import StatusBadge from '../components/StatusBadge';

const STATUSES = ['Active', 'Hold', 'Completed', 'Cancelled', 'Dropped'];
const STAGES = ['New', 'Documents Pending', 'Fees Pending', 'Admitted', 'Ongoing', 'Completed'];
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function AdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = usePermissions();
  const [admission, setAdmission] = useState(null);

  const load = () => api.getAdmission(id).then(setAdmission);
  useEffect(() => { load(); }, [id]);

  if (!admission) return <div className="p-8 text-slate-400">Loading…</div>;

  const paidCount = admission.payments.filter((p) => p.status === 'Paid').length;
  const paidAmount = admission.payments.filter((p) => p.status === 'Paid').reduce((s, p) => s + Number(p.amount), 0);
  const progressPct = admission.emi_count > 0 ? Math.round((paidCount / admission.emi_count) * 100) : 0;
  const canAddInstallment = admission.payments.length < admission.emi_count;
  const stageIndex = STAGES.indexOf(admission.admission_stage);

  const update = async (field, value) => { await api.updateAdmission(id, { [field]: value }); load(); };
  const addInstallment = async () => { await api.nextInstallment(id); load(); };

  return (
    <div className="p-8 max-w-5xl">
      <button onClick={() => navigate('/admissions')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-ink mb-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Admissions
      </button>
      <p className="text-xs text-slate-300 mb-4">Admissions / <span className="text-slate-500">{admission.admission_number}</span></p>

      {/* Gradient hero — teal identity for the Admissions module */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur text-white flex items-center justify-center shrink-0 border border-white/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>{admission.admission_number}</h1>
              <p className="text-teal-100 text-xs mt-1">
                <Link to={`/students/${admission.student_id}`} className="hover:text-white underline decoration-white/30">{admission.student_name}</Link> · {admission.course_name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={admission.admission_status} />
          </div>
        </div>

        {/* Payment progress bar */}
        <div className="relative mt-5">
          <div className="flex items-center justify-between text-xs text-white/70 mb-1">
            <span>Fee collected</span>
            <span>{inr(paidAmount)} / {inr(admission.total_course_fees)} · {paidCount}/{admission.emi_count} installments</span>
          </div>
          <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Stage tracker */}
        <div className="relative flex items-center mt-5">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                  i <= stageIndex ? 'bg-white text-teal-700' : 'bg-white/15 text-white/50'
                }`}>{i + 1}</div>
                <span className={`text-[10px] whitespace-nowrap ${i === stageIndex ? 'text-white font-medium' : 'text-white/50'}`}>{stage}</span>
              </div>
              {i < STAGES.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < stageIndex ? 'bg-white' : 'bg-white/15'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-white border border-line rounded-xl p-4 border-l-4 border-l-teal-500">
          <h2 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2"><Layers className="w-3.5 h-3.5" /> Admission Details</h2>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-400">Course Tenure</dt><dd className="text-ink">{admission.course_tenure}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Total Fees</dt><dd className="text-ink">{inr(admission.total_course_fees)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Batch</dt><dd className="text-ink">{admission.batch || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Counselor</dt><dd className="text-ink">{admission.counselor || '—'}</dd></div>
            <div className="flex items-center gap-1 justify-between"><dt className="text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Admission Date</dt><dd className="text-ink">{admission.admission_date?.slice(0, 10)}</dd></div>
          </dl>

          {can('admissions', 'edit') && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-line">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                <select value={admission.admission_status} onChange={(e) => update('admission_status', e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm w-full">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Stage</label>
                <select value={admission.admission_stage} onChange={(e) => update('admission_stage', e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm w-full">
                  {STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-line rounded-xl p-4 border-l-4 border-l-amber">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Payments</h2>
            {can('admissions', 'edit') && canAddInstallment && (
              <button onClick={addInstallment} className="text-xs text-amber hover:underline">+ Next installment</button>
            )}
          </div>
          <div className="space-y-2">
            {admission.payments.map((p) => (
              <Link key={p.id} to={`/payments/${p.id}`} className="flex items-center justify-between hover:bg-canvas -mx-2 px-2 py-2 rounded-lg border border-transparent hover:border-line">
                <div>
                  <div className="text-sm text-ink font-medium">Installment #{p.installment_number} — {inr(p.amount)}</div>
                  <div className="text-xs text-slate-400">{p.payment_number}</div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
            {admission.payments.length === 0 && <p className="text-sm text-slate-400">No payments yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
