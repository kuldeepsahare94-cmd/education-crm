import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { api } from '../api';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ leads: [], students: [], companies: [] });
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults({ leads: [], students: [], companies: [] }); return; }
    setLoading(true);
    const q = query.trim();
    const timer = setTimeout(async () => {
      const [leads, students, companies] = await Promise.all([
        api.listLeads({ q }), api.listStudents({ q }), api.listCompanies({ q }),
      ]);
      setResults({ leads: leads.slice(0, 5), students: students.slice(0, 5), companies: companies.slice(0, 5) });
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const goTo = (path) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  const hasResults = results.leads.length || results.students.length || results.companies.length;

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="flex items-center bg-canvas border border-line rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search leads, students, companies…"
          className="bg-transparent border-0 outline-none text-sm px-2 flex-1 min-w-0"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-400 hover:text-ink shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-xl shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
          {loading && <p className="text-xs text-slate-400 px-4 py-3">Searching…</p>}
          {!loading && !hasResults && <p className="text-xs text-slate-400 px-4 py-3">No matches.</p>}

          {results.leads.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-4 pt-3 pb-1">Leads</div>
              {results.leads.map((l) => (
                <button key={l.id} onClick={() => goTo(`/leads/${l.id}`)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-canvas flex justify-between">
                  <span className="text-ink font-medium">{l.student_name}</span>
                  <span className="text-slate-400 text-xs">{l.mobile}</span>
                </button>
              ))}
            </div>
          )}
          {results.students.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-4 pt-3 pb-1">Students</div>
              {results.students.map((s) => (
                <button key={s.id} onClick={() => goTo(`/students/${s.id}`)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-canvas flex justify-between">
                  <span className="text-ink font-medium">{s.student_name}</span>
                  <span className="text-slate-400 text-xs">{s.mobile}</span>
                </button>
              ))}
            </div>
          )}
          {results.companies.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-4 pt-3 pb-1">Companies</div>
              {results.companies.map((c) => (
                <button key={c.id} onClick={() => goTo(`/companies/${c.id}`)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-canvas">
                  <span className="text-ink font-medium">{c.company_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
