const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/auth');
const { fireEvent } = require('../services/whatsapp/workflowEngine');

const admissionNumber = (id) => `ADM-${String(id).padStart(5, '0')}`;
const paymentNumber = (id) => `PAY-${String(id).padStart(5, '0')}`;

router.get('/', requirePermission('admissions', 'view'), (req, res) => {
  const { status, stage, student_id, q } = req.query;
  let sql = `SELECT a.*, s.student_name, c.course_name FROM admissions a
    JOIN students s ON s.id = a.student_id JOIN courses c ON c.id = a.course_id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND a.admission_status = ?'; params.push(status); }
  if (stage) { sql += ' AND a.admission_stage = ?'; params.push(stage); }
  if (student_id) { sql += ' AND a.student_id = ?'; params.push(student_id); }
  if (q) { sql += ' AND (s.student_name LIKE ? OR a.admission_number LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY a.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requirePermission('admissions', 'view'), (req, res) => {
  const admission = db.prepare(`
    SELECT a.*, s.student_name, c.course_name FROM admissions a
    JOIN students s ON s.id = a.student_id JOIN courses c ON c.id = a.course_id WHERE a.id=?
  `).get(req.params.id);
  if (!admission) return res.status(404).json({ error: 'Not found' });
  const payments = db.prepare('SELECT * FROM payments WHERE admission_id=? ORDER BY installment_number').all(req.params.id);
  res.json({ ...admission, payments });
});

// ===== Admission creation automation =====
// Student + Course selected -> auto-fetch tenure/fees/EMI count from Course Master
// -> save Admission -> auto-create a Pending Payment record. No manual payment creation required.
router.post('/', requirePermission('admissions', 'create'), (req, res) => {
  const b = req.body;
  if (!b.student_id || !b.course_id) return res.status(400).json({ error: 'student_id and course_id are required' });

  const student = db.prepare('SELECT * FROM students WHERE id=?').get(b.student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const course = db.prepare('SELECT * FROM courses WHERE id=?').get(b.course_id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const tx = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO admissions (student_id, course_id, admission_date, period, admission_status, admission_stage,
        batch, counselor, course_tenure, total_course_fees, emi_count, remarks)
      VALUES (?,?,COALESCE(?, datetime('now')),?,?,?,?,?,?,?,?,?)
    `).run(
      b.student_id, b.course_id, b.admission_date || null, b.period || null,
      b.admission_status || 'Active', b.admission_stage || 'New', b.batch || null, b.counselor || null,
      course.course_tenure, course.total_course_fees, course.emi_count, b.remarks || null
    );
    const admissionId = info.lastInsertRowid;
    db.prepare('UPDATE admissions SET admission_number=? WHERE id=?').run(admissionNumber(admissionId), admissionId);

    // Auto-create the first pending payment record (installment 1 of emi_count), no manual step needed
    const installmentAmount = course.emi_count > 0 ? Math.round((course.total_course_fees / course.emi_count) * 100) / 100 : course.total_course_fees;
    const payInfo = db.prepare(`
      INSERT INTO payments (student_id, admission_id, course_id, installment_number, amount, status)
      VALUES (?,?,?,?,?, 'Pending')
    `).run(b.student_id, admissionId, b.course_id, 1, installmentAmount);
    db.prepare('UPDATE payments SET payment_number=? WHERE id=?').run(paymentNumber(payInfo.lastInsertRowid), payInfo.lastInsertRowid);

    return admissionId;
  });

  const admissionId = tx();
  const admission = db.prepare('SELECT * FROM admissions WHERE id=?').get(admissionId);
  fireEvent('admission_confirmed', {
    entityType: 'admission', entityId: admissionId, mobile: student.mobile,
    fields: { student_name: student.student_name, course_name: course.course_name, admission_number: admission.admission_number, admission_date: admission.admission_date, total_course_fees: admission.total_course_fees, course_tenure: admission.course_tenure },
  });
  res.status(201).json(admission);
});

router.put('/:id', requirePermission('admissions', 'edit'), (req, res) => {
  const existing = db.prepare('SELECT * FROM admissions WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const m = { ...existing, ...req.body };
  db.prepare(`
    UPDATE admissions SET period=?, admission_status=?, admission_stage=?, batch=?, counselor=?, remarks=?
    WHERE id=?
  `).run(m.period, m.admission_status, m.admission_stage, m.batch, m.counselor, m.remarks, req.params.id);
  res.json(db.prepare('SELECT * FROM admissions WHERE id=?').get(req.params.id));
});

router.delete('/:id', requirePermission('admissions', 'delete'), (req, res) => {
  db.prepare('DELETE FROM admissions WHERE id=?').run(req.params.id);
  res.status(204).end();
});

// Create the *next* installment's pending payment (installments 2..emi_count), used by the Payments UI
router.post('/:id/next-installment', requirePermission('admissions', 'edit'), (req, res) => {
  const admission = db.prepare('SELECT * FROM admissions WHERE id=?').get(req.params.id);
  if (!admission) return res.status(404).json({ error: 'Admission not found' });
  const existingCount = db.prepare('SELECT COUNT(*) c FROM payments WHERE admission_id=?').get(admission.id).c;
  if (existingCount >= admission.emi_count) return res.status(400).json({ error: 'All installments already created' });

  const installmentAmount = admission.emi_count > 0
    ? Math.round((admission.total_course_fees / admission.emi_count) * 100) / 100
    : admission.total_course_fees;
  const info = db.prepare(`
    INSERT INTO payments (student_id, admission_id, course_id, installment_number, amount, status)
    VALUES (?,?,?,?,?, 'Pending')
  `).run(admission.student_id, admission.id, admission.course_id, existingCount + 1, installmentAmount);
  db.prepare('UPDATE payments SET payment_number=? WHERE id=?').run(paymentNumber(info.lastInsertRowid), info.lastInsertRowid);
  res.status(201).json(db.prepare('SELECT * FROM payments WHERE id=?').get(info.lastInsertRowid));
});

module.exports = router;
