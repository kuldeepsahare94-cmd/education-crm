const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/auth');

router.get('/', requirePermission('students', 'view'), (req, res) => {
  const { status, q } = req.query;
  let sql = `SELECT s.*,
      (SELECT COUNT(*) FROM admissions a WHERE a.student_id = s.id) AS admission_count
    FROM students s WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND s.status = ?'; params.push(status); }
  if (q) { sql += ' AND (s.student_name LIKE ? OR s.mobile LIKE ? OR s.email LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' ORDER BY s.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requirePermission('students', 'view'), (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Not found' });
  const admissions = db.prepare(`
    SELECT a.*, c.course_name FROM admissions a JOIN courses c ON c.id = a.course_id
    WHERE a.student_id=? ORDER BY a.admission_date DESC
  `).all(req.params.id);
  const payments = db.prepare(`
    SELECT p.* FROM payments p WHERE p.student_id=? ORDER BY p.created_at DESC
  `).all(req.params.id);
  const placements = db.prepare(`
    SELECT pl.*, co.company_name FROM placements pl JOIN companies co ON co.id = pl.company_id
    WHERE pl.student_id=? ORDER BY pl.created_at DESC
  `).all(req.params.id);
  const lead = student.lead_id ? db.prepare('SELECT * FROM leads WHERE id=?').get(student.lead_id) : null;
  res.json({ ...student, admissions, payments, placements, lead_history: lead });
});

router.post('/', requirePermission('students', 'create'), (req, res) => {
  const b = req.body;
  if (!b.student_name) return res.status(400).json({ error: 'student_name is required' });
  const info = db.prepare(`
    INSERT INTO students (photo, student_name, mobile, alternate_mobile, email, gender, date_of_birth, address,
      qualification, aadhaar_number, parent_name, parent_mobile, emergency_contact, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    b.photo || null, b.student_name, b.mobile || null, b.alternate_mobile || null, b.email || null, b.gender || null,
    b.date_of_birth || null, b.address || null, b.qualification || null, b.aadhaar_number || null,
    b.parent_name || null, b.parent_mobile || null, b.emergency_contact || null, b.status || 'Active'
  );
  res.status(201).json(db.prepare('SELECT * FROM students WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', requirePermission('students', 'edit'), (req, res) => {
  const existing = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const m = { ...existing, ...req.body };
  db.prepare(`
    UPDATE students SET photo=?, student_name=?, mobile=?, alternate_mobile=?, email=?, gender=?, date_of_birth=?,
      address=?, qualification=?, aadhaar_number=?, parent_name=?, parent_mobile=?, emergency_contact=?, status=?
    WHERE id=?
  `).run(
    m.photo, m.student_name, m.mobile, m.alternate_mobile, m.email, m.gender, m.date_of_birth,
    m.address, m.qualification, m.aadhaar_number, m.parent_name, m.parent_mobile, m.emergency_contact, m.status,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id));
});

router.delete('/:id', requirePermission('students', 'delete'), (req, res) => {
  db.prepare('DELETE FROM students WHERE id=?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
