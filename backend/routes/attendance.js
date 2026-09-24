const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/auth');

function rosterFor(batchId) {
  return db.prepare(`SELECT student_id FROM batch_students WHERE batch_id=? AND status='Active'`).all(batchId).map((r) => r.student_id);
}

// Get (or create) today's — or any date's — attendance session for a batch.
// Every actively-enrolled student is auto-marked Present the moment the
// session is created; the UI then lets you flip individuals to Absent/Late/Leave.
router.get('/session', requirePermission('attendance', 'view'), (req, res) => {
  const { batch_id, date } = req.query;
  if (!batch_id || !date) return res.status(400).json({ error: 'batch_id and date are required' });

  let session = db.prepare('SELECT * FROM attendance_sessions WHERE batch_id=? AND session_date=?').get(batch_id, date);
  if (!session) {
    const info = db.prepare('INSERT INTO attendance_sessions (batch_id, session_date, created_by) VALUES (?,?,?)').run(batch_id, date, req.user.id);
    session = db.prepare('SELECT * FROM attendance_sessions WHERE id=?').get(info.lastInsertRowid);

    const roster = rosterFor(batch_id);
    const insertRecord = db.prepare(`INSERT INTO attendance_records (session_id, student_id, status, marked_via) VALUES (?,?,'Present','manual')`);
    const tx = db.transaction((ids) => { for (const sid of ids) insertRecord.run(session.id, sid); });
    tx(roster);
  } else {
    // Roster may have grown since the session was first created (a student added
    // mid-batch) — backfill any missing records as Present too, same default rule.
    const existing = new Set(db.prepare('SELECT student_id FROM attendance_records WHERE session_id=?').all(session.id).map((r) => r.student_id));
    const roster = rosterFor(batch_id);
    const missing = roster.filter((sid) => !existing.has(sid));
    if (missing.length) {
      const insertRecord = db.prepare(`INSERT INTO attendance_records (session_id, student_id, status, marked_via) VALUES (?,?,'Present','manual')`);
      const tx = db.transaction((ids) => { for (const sid of ids) insertRecord.run(session.id, sid); });
      tx(missing);
    }
  }

  const records = db.prepare(`
    SELECT ar.*, s.student_name, s.mobile FROM attendance_records ar JOIN students s ON s.id = ar.student_id
    WHERE ar.session_id=? ORDER BY s.student_name
  `).all(session.id);
  res.json({ ...session, records });
});

// Bulk update — used by the "Save" button after flipping several students.
router.post('/session/:id/mark', requirePermission('attendance', 'edit'), (req, res) => {
  const { records } = req.body || {}; // [{student_id, status, remarks?}]
  if (!Array.isArray(records)) return res.status(400).json({ error: 'records must be an array' });
  const upsert = db.prepare(`
    INSERT INTO attendance_records (session_id, student_id, status, remarks, marked_via) VALUES (?,?,?,?,'manual')
    ON CONFLICT(session_id, student_id) DO UPDATE SET status=excluded.status, remarks=excluded.remarks, updated_at=datetime('now')
  `);
  const tx = db.transaction((rows) => { for (const r of rows) upsert.run(req.params.id, r.student_id, r.status, r.remarks || null); });
  tx(records);
  const updated = db.prepare(`
    SELECT ar.*, s.student_name FROM attendance_records ar JOIN students s ON s.id = ar.student_id WHERE ar.session_id=? ORDER BY s.student_name
  `).all(req.params.id);
  res.json(updated);
});

// Quick single-student toggle (used by clicking a status pill directly).
router.post('/mark-one', requirePermission('attendance', 'edit'), (req, res) => {
  const { session_id, student_id, status } = req.body || {};
  if (!session_id || !student_id || !status) return res.status(400).json({ error: 'session_id, student_id, and status are required' });
  db.prepare(`
    INSERT INTO attendance_records (session_id, student_id, status, marked_via) VALUES (?,?,?,'manual')
    ON CONFLICT(session_id, student_id) DO UPDATE SET status=excluded.status, updated_at=datetime('now')
  `).run(session_id, student_id, status);
  res.json(db.prepare('SELECT * FROM attendance_records WHERE session_id=? AND student_id=?').get(session_id, student_id));
});

// ===== Biometric / device import =====
// Generic receiver for punch records exported (CSV→JSON, or pushed by a local
// bridge script) from whatever biometric device you have. Matches each record
// to a student via students.biometric_id — set that field once per student
// (Students page) to whatever ID your device enrolls them under.
router.post('/biometric-import', requirePermission('attendance', 'edit'), (req, res) => {
  const { batch_id, records } = req.body || {}; // records: [{biometric_id, date, time?}]
  if (!batch_id || !Array.isArray(records)) return res.status(400).json({ error: 'batch_id and records[] are required' });

  const results = { matched: 0, unmatched: [], sessions_touched: new Set() };
  for (const r of records) {
    const student = db.prepare('SELECT id FROM students WHERE biometric_id=?').get(r.biometric_id);
    if (!student) { results.unmatched.push(r.biometric_id); continue; }

    let session = db.prepare('SELECT * FROM attendance_sessions WHERE batch_id=? AND session_date=?').get(batch_id, r.date);
    if (!session) {
      const info = db.prepare('INSERT INTO attendance_sessions (batch_id, session_date, created_by) VALUES (?,?,?)').run(batch_id, r.date, req.user.id);
      session = db.prepare('SELECT * FROM attendance_sessions WHERE id=?').get(info.lastInsertRowid);
    }
    db.prepare(`
      INSERT INTO attendance_records (session_id, student_id, status, marked_via, check_in_time) VALUES (?,?,'Present','biometric',?)
      ON CONFLICT(session_id, student_id) DO UPDATE SET status='Present', marked_via='biometric', check_in_time=excluded.check_in_time, updated_at=datetime('now')
    `).run(session.id, student.id, r.time || null);
    results.matched++;
    results.sessions_touched.add(session.id);
  }
  res.json({ matched: results.matched, unmatched_biometric_ids: results.unmatched, sessions_touched: results.sessions_touched.size });
});

// ===== Reports =====
router.get('/reports/summary', requirePermission('attendance', 'view'), (req, res) => {
  const { batch_id, date_from, date_to } = req.query;
  let sql = `
    SELECT s.id AS student_id, s.student_name,
      COUNT(ar.id) AS total_sessions,
      SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END) AS present_count,
      SUM(CASE WHEN ar.status='Absent' THEN 1 ELSE 0 END) AS absent_count,
      SUM(CASE WHEN ar.status='Late' THEN 1 ELSE 0 END) AS late_count,
      SUM(CASE WHEN ar.status='Leave' THEN 1 ELSE 0 END) AS leave_count
    FROM attendance_records ar
    JOIN attendance_sessions ses ON ses.id = ar.session_id
    JOIN students s ON s.id = ar.student_id
    WHERE 1=1
  `;
  const params = [];
  if (batch_id) { sql += ' AND ses.batch_id=?'; params.push(batch_id); }
  if (date_from) { sql += ' AND date(ses.session_date)>=date(?)'; params.push(date_from); }
  if (date_to) { sql += ' AND date(ses.session_date)<=date(?)'; params.push(date_to); }
  sql += ' GROUP BY s.id ORDER BY s.student_name';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((r) => ({ ...r, attendance_pct: r.total_sessions ? Math.round((r.present_count / r.total_sessions) * 1000) / 10 : 0 })));
});

router.get('/reports/absentees', requirePermission('attendance', 'view'), (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required' });
  res.json(db.prepare(`
    SELECT s.id AS student_id, s.student_name, s.mobile, b.name AS batch_name, ar.status
    FROM attendance_records ar
    JOIN attendance_sessions ses ON ses.id = ar.session_id
    JOIN students s ON s.id = ar.student_id
    JOIN batches b ON b.id = ses.batch_id
    WHERE ses.session_date = ? AND ar.status IN ('Absent','Leave')
    ORDER BY b.name, s.student_name
  `).all(date));
});

module.exports = router;
