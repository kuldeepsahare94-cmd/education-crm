const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/auth');

router.get('/', requirePermission('attendance', 'view'), (req, res) => {
  const { status, course_id, q } = req.query;
  let sql = `SELECT b.*, c.course_name,
      (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status='Active') AS student_count
    FROM batches b LEFT JOIN courses c ON c.id = b.course_id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND b.status=?'; params.push(status); }
  if (course_id) { sql += ' AND b.course_id=?'; params.push(course_id); }
  if (q) { sql += ' AND b.name LIKE ?'; params.push(`%${q}%`); }
  sql += ' ORDER BY b.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requirePermission('attendance', 'view'), (req, res) => {
  const batch = db.prepare(`SELECT b.*, c.course_name FROM batches b LEFT JOIN courses c ON c.id = b.course_id WHERE b.id=?`).get(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Not found' });
  const roster = db.prepare(`
    SELECT bs.id AS enrollment_id, bs.status AS enrollment_status, bs.enrolled_at, s.id AS student_id, s.student_name, s.mobile
    FROM batch_students bs JOIN students s ON s.id = bs.student_id WHERE bs.batch_id=? ORDER BY s.student_name
  `).all(req.params.id);
  res.json({ ...batch, roster });
});

router.post('/', requirePermission('attendance', 'create'), (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const info = db.prepare(`
    INSERT INTO batches (name, batch_code, course_id, trainer, schedule_text, start_date, end_date, status, created_by)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(b.name, b.batch_code || null, b.course_id || null, b.trainer || null, b.schedule_text || null, b.start_date || null, b.end_date || null, b.status || 'Active', req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM batches WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', requirePermission('attendance', 'edit'), (req, res) => {
  const existing = db.prepare('SELECT * FROM batches WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const m = { ...existing, ...(req.body || {}) };
  db.prepare(`
    UPDATE batches SET name=?, batch_code=?, course_id=?, trainer=?, schedule_text=?, start_date=?, end_date=?, status=? WHERE id=?
  `).run(m.name, m.batch_code, m.course_id, m.trainer, m.schedule_text, m.start_date, m.end_date, m.status, req.params.id);
  res.json(db.prepare('SELECT * FROM batches WHERE id=?').get(req.params.id));
});

router.delete('/:id', requirePermission('attendance', 'delete'), (req, res) => {
  db.prepare('DELETE FROM batches WHERE id=?').run(req.params.id);
  res.status(204).end();
});

// ===== Roster management =====
router.post('/:id/students', requirePermission('attendance', 'edit'), (req, res) => {
  const { student_id, admission_id } = req.body || {};
  if (!student_id) return res.status(400).json({ error: 'student_id is required' });
  try {
    const info = db.prepare('INSERT INTO batch_students (batch_id, student_id, admission_id) VALUES (?,?,?)').run(req.params.id, student_id, admission_id || null);
    res.status(201).json(db.prepare('SELECT * FROM batch_students WHERE id=?').get(info.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'This student is already on this batch\'s roster.' });
    throw e;
  }
});

router.delete('/:id/students/:studentId', requirePermission('attendance', 'edit'), (req, res) => {
  db.prepare('DELETE FROM batch_students WHERE batch_id=? AND student_id=?').run(req.params.id, req.params.studentId);
  res.status(204).end();
});

module.exports = router;
