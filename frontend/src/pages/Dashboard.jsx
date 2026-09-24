import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, GraduationCap, ClipboardList, Wallet, Briefcase, Building2, TrendingUp, CalendarClock, IndianRupee, UserCheck } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const initialsOf = (name) => (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// Bold, colored KPI cards — a top accent bar + tinted icon chip + big number,
// Zoho/Freshdesk-style rather than a flat white box with a tiny badge.
function KpiCard({ label, value, sub, icon: Icon, color, to }) {
  const body = (
    <div className="relative bg-white border border-line rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all h-full overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color.bar }} />
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
        {Icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color.chipBg, color: color.chipText }}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>
      <div className="font-display text-3xl font-bold text-ink mt-2" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-400 mt-1.5">{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

const COLORS = {
  amber: { bar: '#F59E0B', chipBg: '#FEF3C7', chipText: '#B45309' },
  indigo: { bar: '#6366F1', chipBg: '#E0E7FF', chipText: '#4338CA' },
  teal: { bar: '#14B8A6', chipBg: '#CCFBF1', chipText: '#0F766E' },
  emerald: { bar: '#10B981', chipBg: '#D1FAE5', chipText: '#047857' },
  blue: { bar: '#3B82F6', chipBg: '#DBEAFE', chipText: '#1D4ED8' },
  rose: { bar: '#F43F5E', chipBg: '#FFE4E6', chipText: '#BE123C' },
};

function SectionLabel({ children }) {
  return <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 mt-8 mb-3">{children}</h2>;
}

function AvatarChip({ name, color }) {
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
      style={{ background: color.chipBg, color: color.chipText }}>
      {initialsOf(name)}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => { api.dashboard().then(setData); }, []);

  if (!data) return <div className="p-8 text-slate-400">Loading…</div>;
  const c = data.cards;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-8 max-w-6xl">
      <div className="rounded-2xl p-6 mb-2 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-ink), var(--color-ink-light))' }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/50 text-xs">{today}</p>
            <h1 className="font-display text-2xl font-semibold mt-1" style={{ fontFamily: 'var(--font-display)' }}>
              {greeting}, {user?.full_name?.split(' ')[0] || user?.username || 'there'}
            </h1>
            <p className="text-white/60 text-sm mt-1">Here's where things stand today.</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-white/50 text-[10px] uppercase">Today's Revenue</div>
              <div className="text-xl font-bold">{inr(c.todays_collection)}</div>
            </div>
            <div className="text-right">
              <div className="text-white/50 text-[10px] uppercase">New Leads Today</div>
              <div className="text-xl font-bold">{c.todays_leads}</div>
            </div>
          </div>
        </div>
      </div>

      <SectionLabel>Pipeline</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Leads" value={c.total_leads} sub={`${c.todays_leads} today · ${c.monthly_leads} this month`} icon={Users} color={COLORS.amber} to="/leads" />
        <KpiCard label="Active Students" value={c.active_students} sub={`${c.total_students} total`} icon={GraduationCap} color={COLORS.indigo} to="/students" />
        <KpiCard label="Pending Admissions" value={c.pending_admissions} sub={`${c.new_admissions} today · ${c.monthly_admissions} this month`} icon={ClipboardList} color={COLORS.teal} to="/admissions" />
        <KpiCard label="Companies" value={c.total_companies} sub="Active recruiter partners" icon={Building2} color={COLORS.blue} to="/companies" />
      </div>

      <SectionLabel>Revenue</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={inr(c.total_revenue)} sub="All-time collected" icon={IndianRupee} color={COLORS.emerald} to="/payments" />
        <KpiCard label="Monthly Collection" value={inr(c.monthly_collection)} sub="This calendar month" icon={TrendingUp} color={COLORS.emerald} to="/payments" />
        <KpiCard label="Pending Fees" value={inr(c.pending_fees)} sub={`${c.due_payments} payments due`} icon={Wallet} color={COLORS.rose} to="/payments" />
        <KpiCard label="Students Selected" value={c.students_selected} sub={`${c.interviews_scheduled} interviews scheduled`} icon={UserCheck} color={COLORS.blue} to="/placements" />
      </div>

      {data.admissions_by_status.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {data.admissions_by_status.map((s) => (
            <Link key={s.status} to={`/admissions?status=${encodeURIComponent(s.status)}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors">
              {s.status}: {s.c}
            </Link>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white border border-line rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-1">Admission Trends</h2>
          <p className="text-xs text-slate-400 mb-4">Last 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.admission_trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="c" name="Admissions" fill="#14B8A6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-line rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-1">Monthly Revenue</h2>
          <p className="text-xs text-slate-400 mb-4">Collected payments, last 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.monthly_revenue_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => inr(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-line rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" /> Top Courses (by admissions)</h2>
          <div className="space-y-3">
            {data.top_courses.map((tc, i) => (
              <div key={tc.course_name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-violet-50 text-violet-600 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-slate-600 truncate">{tc.course_name}</span>
                </div>
                <span className="font-semibold text-ink shrink-0">{tc.admissions}</span>
              </div>
            ))}
            {data.top_courses.length === 0 && <p className="text-sm text-slate-400">No admissions yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Course-wise Revenue</h2>
          <div className="space-y-3">
            {data.course_wise_revenue.map((cw) => (
              <div key={cw.course_name} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate">{cw.course_name}</span>
                <span className="font-semibold text-ink shrink-0">{inr(cw.revenue)}</span>
              </div>
            ))}
            {data.course_wise_revenue.length === 0 && <p className="text-sm text-slate-400">No revenue yet.</p>}
          </div>
        </div>
      </div>

      <SectionLabel>Recent Activity</SectionLabel>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border border-line rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Recent Admissions</h2>
          <div className="space-y-1">
            {data.recent_admissions.map((a) => (
              <Link key={a.id} to={`/admissions/${a.id}`} className="flex items-center gap-3 hover:bg-teal-50/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                <AvatarChip name={a.student_name} color={COLORS.teal} />
                <div className="min-w-0">
                  <div className="text-sm text-ink font-medium truncate">{a.student_name}</div>
                  <div className="text-xs text-slate-400 truncate">{a.course_name} · {a.admission_number}</div>
                </div>
              </Link>
            ))}
            {data.recent_admissions.length === 0 && <p className="text-sm text-slate-400">Nothing yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Recent Payments</h2>
          <div className="space-y-1">
            {data.recent_payments.map((p) => (
              <Link key={p.id} to={`/payments/${p.id}`} className="flex items-center gap-3 hover:bg-amber-soft/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                <AvatarChip name={p.student_name} color={COLORS.amber} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink font-medium truncate">{p.student_name}</div>
                  <div className="text-xs text-slate-400">{inr(p.amount)}</div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
            {data.recent_payments.length === 0 && <p className="text-sm text-slate-400">Nothing yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-blue-600" /> Upcoming Interviews
          </h2>
          <div className="space-y-1">
            {data.upcoming_interviews.map((i) => (
              <Link key={i.id} to={`/placements`} className="flex items-center gap-3 hover:bg-blue-50/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                <AvatarChip name={i.student_name} color={COLORS.blue} />
                <div className="min-w-0">
                  <div className="text-sm text-ink font-medium truncate">{i.student_name} → {i.company_name}</div>
                  <div className="text-xs text-slate-400">{i.interview_date?.slice(0, 10)} {i.interview_round ? `· ${i.interview_round}` : ''}</div>
                </div>
              </Link>
            ))}
            {data.upcoming_interviews.length === 0 && <p className="text-sm text-slate-400">Nothing scheduled.</p>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6 bg-white border border-line rounded-xl p-4">
        <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-sm text-slate-600">
          Placement success rate: <span className="font-bold text-ink">{data.placement_success_rate}%</span>
        </p>
      </div>
    </div>
  );
}
