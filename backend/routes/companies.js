const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/auth');

router.get('/', requirePermission('companies', 'view'), (req, res) => {
  const { status, q } = req.query;
  let sql = `SELECT co.*, (SELECT COUNT(*) FROM placements pl WHERE pl.company_id = co.id) AS placement_count
    FROM companies co WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND co.status = ?'; params.push(status); }
  if (q) { sql += ' AND (co.company_name LIKE ? OR co.hr_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY co.company_name';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requirePermission('companies', 'view'), (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id=?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Not found' });
  const placements = db.prepare(`
    SELECT pl.*, s.student_name FROM placements pl JOIN students s ON s.id = pl.student_id
    WHERE pl.company_id=? ORDER BY pl.interview_date DESC
  `).all(req.params.id);
  res.json({ ...company, placements });
});

router.post('/', requirePermission('companies', 'create'), (req, res) => {
  const b = req.body;
  if (!b.company_name) return res.status(400).json({ error: 'company_name is required' });
  const info = db.prepare(`
    INSERT INTO companies (company_name, industry, hr_name, hr_mobile, email, website, address, contact_person, status, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(b.company_name, b.industry || null, b.hr_name || null, b.hr_mobile || null, b.email || null,
    b.website || null, b.address || null, b.contact_person || null, b.status || 'Active', b.notes || null);
  res.status(201).json(db.prepare('SELECT * FROM companies WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', requirePermission('companies', 'edit'), (req, res) => {
  const existing = db.prepare('SELECT * FROM companies WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const m = { ...existing, ...req.body };
  db.prepare(`
    UPDATE companies SET company_name=?, industry=?, hr_name=?, hr_mobile=?, email=?, website=?, address=?,
      contact_person=?, status=?, notes=? WHERE id=?
  `).run(m.company_name, m.industry, m.hr_name, m.hr_mobile, m.email, m.website, m.address, m.contact_person, m.status, m.notes, req.params.id);
  res.json(db.prepare('SELECT * FROM companies WHERE id=?').get(req.params.id));
});

router.delete('/:id', requirePermission('companies', 'delete'), (req, res) => {
  db.prepare('DELETE FROM companies WHERE id=?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
