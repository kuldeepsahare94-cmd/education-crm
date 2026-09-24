import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, Check, X as XIcon, Clock, Plane } from 'lucide-react';
import { api } from '../api';
import { usePermissions } from '../context/usePermissions';
import Avatar from '../components/Avatar';

const STATUSES = [
  { key: 'Present', icon: Check, color: 'text-good bg-emerald-50 border-emerald-200' },
  { key: 'Absent', icon: XIcon, color: 'text-warn bg-red-50 border-red-200' },
  { key: 'Late', icon: Clock, color: 'text-amber bg-amber-soft border-amber/30' },
  { key: 'Leave', icon: Plane, color: 'text-sky-600 bg-sky-50 border-sky-200' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const can = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState(searchParams.get('batch_id') || '');
  const [date, setDate] = useState(todayStr());
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.listBatches({ status: 'Active' }).then(setBatches); }, []);

  const loadSession = () => {
    if (!batchId) return;
    setLoading(true);
    api.getAttendanceSession(batchId, date).then(setSession).finally(() => setLoading(false));
  };
  useEffect(() => { loadSession(); }, [batchId, date]);

  useEffect(() => {
    if (batchId) setSearchParams({ batch_id: batchId }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const setStatus = async (studentId, status) => {
    setSession((s) => ({ ...s, records: s.records.map((r) => (r.student_id === studentId ? { ...r, status } : r)) }));
    await api.markAttendanceOne(session.id, studentId, status);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const presentCount = session?.records.filter((r) => r.status === 'Present').length || 0;
  const absentCount = session?.records.filter((r) => r.status === 'Absent').length || 0;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
          <CalendarCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Everyone starts marked Present — just flip whoever's actually absent.</p>
        </div>
      </div>

      <div className="flex gap-3 mt-5 flex-wrap items-center">
        <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm">
          <option value="">Select a batch…</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm" />
        {saved && <span className="text-xs text-good">✓ Saved</span>}
      </div>

      {!batchId && <p className="text-sm text-slate-400 mt-8 text-center">Select a batch to take attendance.</p>}
      {loading && <p className="text-sm text-slate-400 mt-8 text-center">Loading…</p>}

      {session && !loading && (
        <>
          <div className="flex gap-4 mt-6 mb-4">
            <div className="bg-emerald-50 text-good text-sm font-semibold px-4 py-2 rounded-lg">{presentCount} Present</div>
            <div className="bg-red-50 text-warn text-sm font-semibold px-4 py-2 rounded-lg">{absentCount} Absent</div>
            <div className="text-sm text-slate-400 px-4 py-2">{session.records.length} total</div>
          </div>

          <div className="bg-white border border-line rounded-xl overflow-hidden">
            {session.records.map((r) => (
              <div key={r.student_id} className="flex items-center justify-between px-4 py-3 border-b border-line/60 last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar name={r.student_name} color="teal" />
                  <div>
                    <div className="text-sm text-ink font-medium">{r.student_name}</div>
                    {r.marked_via === 'biometric' && <div className="text-[10px] text-slate-400">Biometric · {r.check_in_time?.slice(11, 16) || ''}</div>}
                  </div>
                </div>
                {can('attendance', 'edit') ? (
                  <div className="flex gap-1.5">
                    {STATUSES.map((s) => {
                      const Icon = s.icon;
                      const active = r.status === s.key;
                      return (
                        <button key={s.key} onClick={() => setStatus(r.student_id, s.key)}
                          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                            active ? s.color : 'border-line text-slate-400 hover:border-ink/30'
                          }`}>
                          <Icon className="w-3.5 h-3.5" /> {s.key}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs font-medium text-slate-500">{r.status}</span>
                )}
              </div>
            ))}
            {session.records.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No students on this batch's roster yet — add some from the Batches page.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
