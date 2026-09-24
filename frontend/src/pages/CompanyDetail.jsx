import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, Mail, Globe, User, TrendingUp } from 'lucide-react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);

  useEffect(() => { api.getCompany(id).then(setCompany); }, [id]);
  if (!company) return <div className="p-8 text-slate-400">Loading…</div>;

  const selected = company.placements.filter((p) => p.result === 'Selected').length;
  const successRate = company.placements.length ? Math.round((selected / company.placements.length) * 100) : 0;

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={() => navigate('/companies')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-ink mb-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Companies
      </button>
      <p className="text-xs text-slate-300 mb-4">Companies / <span className="text-slate-500">{company.company_name}</span></p>

      {/* Gradient hero — blue identity for Companies/Placements */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur text-white flex items-center justify-center shrink-0 border border-white/20">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>{company.company_name}</h1>
              <p className="text-blue-100 text-xs mt-1">{company.industry || 'Industry not on file'}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {company.hr_mobile && <a href={`tel:${company.hr_mobile}`} className="flex items-center gap-1 text-xs text-white/90 hover:text-white"><Phone className="w-3 h-3" /> {company.hr_mobile}</a>}
                {company.email && <a href={`mailto:${company.email}`} className="flex items-center gap-1 text-xs text-white/90 hover:text-white"><Mail className="w-3 h-3" /> {company.email}</a>}
                {company.website && <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-white/90 hover:text-white"><Globe className="w-3 h-3" /> Website</a>}
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
            <div className="text-white/60 text-[10px] uppercase">Total Interviews</div>
            <div className="text-white text-lg font-semibold">{company.placements.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
            <div className="text-white/60 text-[10px] uppercase">Selected</div>
            <div className="text-white text-lg font-semibold">{selected}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
            <div className="text-white/60 text-[10px] uppercase flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Success Rate</div>
            <div className="text-white text-lg font-semibold">{successRate}%</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-white border border-line rounded-xl p-4 border-l-4 border-l-blue-500">
          <h2 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2"><User className="w-3.5 h-3.5" /> Contact</h2>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-400">HR Name</dt><dd className="text-ink">{company.hr_name || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Contact Person</dt><dd className="text-ink">{company.contact_person || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Address</dt><dd className="text-ink text-right max-w-[60%]">{company.address || '—'}</dd></div>
          </dl>
          {company.notes && <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-line">{company.notes}</p>}
        </div>

        <div className="bg-white border border-line rounded-xl p-4 border-l-4 border-l-blue-500">
          <h2 className="text-xs font-semibold text-slate-500 uppercase mb-2">Placement History</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {company.placements.map((p) => (
              <div key={p.id} className="flex items-center justify-between border border-line rounded-lg px-2.5 py-2">
                <div>
                  <div className="text-sm text-ink font-medium">{p.student_name}</div>
                  <div className="text-xs text-slate-400">{p.interview_date?.slice(0, 10) || '—'} {p.interview_round ? `· ${p.interview_round}` : ''}</div>
                </div>
                <div className="flex gap-1">
                  <StatusBadge status={p.interview_status} />
                  {p.result && <StatusBadge status={p.result} />}
                </div>
              </div>
            ))}
            {company.placements.length === 0 && <p className="text-sm text-slate-400">No interviews scheduled yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
