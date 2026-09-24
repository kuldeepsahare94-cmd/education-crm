const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/auth');

const TENURE_OPTIONS = ['1 Month', '2 Months', '3 Months', '6 Months', '9 Months', '12 Months'];

router.get('/tenure-options', requirePermission('courses', 'view'), (req, res) => res.json(TENURE_OPTIONS));

router.get('/', requirePermission('courses', 'view'), (req, res) => {
  const { status, category, q } = req.query;
  let sql = 'SELECT * FROM courses WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (q) { sql += ' AND (course_name LIKE ? OR course_code LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY course_name';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requirePermission('courses', 'view'), (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Not found' });
  res.json(course);
});

router.post('/', requirePermission('courses', 'create'), (req, res) => {
  const b = req.body;
  if (!b.course_name) return res.status(400).json({ error: 'course_name is required' });
  const info = db.prepare(`
    INSERT INTO courses (course_name, course_code, category, description, course_tenure, total_course_fees, emi_count, status)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    b.course_name, b.course_code || null, b.category || null, b.description || null,
    b.course_tenure || null, b.total_course_fees || 0, b.emi_count || 1, b.status || 'Active'
  );
  res.status(201).json(db.prepare('SELECT * FROM courses WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', requirePermission('courses', 'edit'), (req, res) => {
  const existing = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const m = { ...existing, ...req.body };
  db.prepare(`
    UPDATE courses SET course_name=?, course_code=?, category=?, description=?, course_tenure=?,
      total_course_fees=?, emi_count=?, status=? WHERE id=?
  `).run(m.course_name, m.course_code, m.category, m.description, m.course_tenure, m.total_course_fees, m.emi_count, m.status, req.params.id);
  res.json(db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id));
});

router.delete('/:id', requirePermission('courses', 'delete'), (req, res) => {
  db.prepare('DELETE FROM courses WHERE id=?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
