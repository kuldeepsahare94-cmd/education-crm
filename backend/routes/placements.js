const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/auth');
const { fireEvent } = require('../services/whatsapp/workflowEngine');

router.get('/', requirePermission('placements', 'view'), (req, res) => {
  const { status, result, company_id, student_id, q } = req.query;
  let sql = `SELECT pl.*, s.student_name, co.company_name FROM placements pl
    JOIN students s ON s.id = pl.student_id JOIN companies co ON co.id = pl.company_id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND pl.interview_status = ?'; params.push(status); }
  if (result) { sql += ' AND pl.result = ?'; params.push(result); }
  if (company_id) { sql += ' AND pl.company_id = ?'; params.push(company_id); }
  if (student_id) { sql += ' AND pl.student_id = ?'; params.push(student_id); }
  if (q) { sql += ' AND (s.student_name LIKE ? OR co.company_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY pl.interview_date DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requirePermission('placements', 'view'), (req, res) => {
  const placement = db.prepare(`
    SELECT pl.*, s.student_name, co.company_name FROM placements pl
    JOIN students s ON s.id = pl.student_id JOIN companies co ON co.id = pl.company_id WHERE pl.id=?
  `).get(req.params.id);
  if (!placement) return res.status(404).json({ error: 'Not found' });
  res.json(placement);
});

// Create Company -> Schedule Interview -> Assign Student
router.post('/', requirePermission('placements', 'create'), (req, res) => {
  const b = req.body;
  if (!b.student_id || !b.company_id) return res.status(400).json({ error: 'student_id and company_id are required' });
  const info = db.prepare(`
    INSERT INTO placements (student_id, admission_id, course_id, company_id, interview_date, interview_round,
      interview_status, result, package, joining_date, remarks)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    b.student_id, b.admission_id || null, b.course_id || null, b.company_id, b.interview_date || null,
    b.interview_round || null, b.interview_status || 'Scheduled', b.result || null, b.package || null,
    b.joining_date || null, b.remarks || null
  );
  const placement = db.prepare('SELECT * FROM placements WHERE id=?').get(info.lastInsertRowid);
  const student = db.prepare('SELECT * FROM students WHERE id=?').get(b.student_id);
  const company = db.prepare('SELECT * FROM companies WHERE id=?').get(b.company_id);
  fireEvent('workshop_registration', {
    entityType: 'placement', entityId: placement.id, mobile: student?.mobile,
    fields: { student_name: student?.student_name, company_name: company?.company_name, interview_date: placement.interview_date, interview_round: placement.interview_round },
  });
  res.status(201).json(placement);
});

// Update Interview Status -> Update Result -> Placement Statistics auto-reflect (dashboard reads live)
router.put('/:id', requirePermission('placements', 'edit'), (req, res) => {
  const existing = db.prepare('SELECT * FROM placements WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const m = { ...existing, ...req.body };
  db.prepare(`
    UPDATE placements SET interview_date=?, interview_round=?, interview_status=?, result=?, package=?, joining_date=?, remarks=?
    WHERE id=?
  `).run(m.interview_date, m.interview_round, m.interview_status, m.result, m.package, m.joining_date, m.remarks, req.params.id);
  res.json(db.prepare('SELECT * FROM placements WHERE id=?').get(req.params.id));
});

router.delete('/:id', requirePermission('placements', 'delete'), (req, res) => {
  db.prepare('DELETE FROM placements WHERE id=?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
