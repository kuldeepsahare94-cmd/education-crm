const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/auth');
const { generateReceiptPdf } = require('../services/receiptPdf');
const { fireEvent } = require('../services/whatsapp/workflowEngine');

router.get('/', requirePermission('payments', 'view'), (req, res) => {
  const { status, student_id, admission_id, q } = req.query;
  let sql = `SELECT p.*, s.student_name, c.course_name, a.admission_number FROM payments p
    JOIN students s ON s.id = p.student_id JOIN courses c ON c.id = p.course_id
    JOIN admissions a ON a.id = p.admission_id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (student_id) { sql += ' AND p.student_id = ?'; params.push(student_id); }
  if (admission_id) { sql += ' AND p.admission_id = ?'; params.push(admission_id); }
  if (q) { sql += ' AND (s.student_name LIKE ? OR p.payment_number LIKE ? OR p.transaction_number LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requirePermission('payments', 'view'), (req, res) => {
  const payment = db.prepare(`
    SELECT p.*, s.student_name, c.course_name, a.admission_number FROM payments p
    JOIN students s ON s.id = p.student_id JOIN courses c ON c.id = p.course_id
    JOIN admissions a ON a.id = p.admission_id WHERE p.id=?
  `).get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  res.json(payment);
});

// Mark Pending/Partial -> Paid (or Failed), capturing mode/transaction details
router.put('/:id', requirePermission('payments', 'edit'), (req, res) => {
  const existing = db.prepare('SELECT * FROM payments WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const m = { ...existing, ...req.body };
  db.prepare(`
    UPDATE payments SET payment_date=?, amount=?, payment_mode=?, transaction_number=?, status=?, remarks=?
    WHERE id=?
  `).run(
    m.payment_date || (m.status === 'Paid' ? new Date().toISOString() : existing.payment_date),
    m.amount, m.payment_mode, m.transaction_number, m.status, m.remarks, req.params.id
  );
  const updated = db.prepare('SELECT * FROM payments WHERE id=?').get(req.params.id);
  if (m.status === 'Paid' && existing.status !== 'Paid') {
    const student = db.prepare('SELECT * FROM students WHERE id=?').get(updated.student_id);
    const course = db.prepare('SELECT * FROM courses WHERE id=?').get(updated.course_id);
    fireEvent('payment_received', {
      entityType: 'payment', entityId: updated.id, mobile: student?.mobile,
      fields: { student_name: student?.student_name, amount: updated.amount, payment_number: updated.payment_number, installment_number: updated.installment_number, course_name: course?.course_name },
    });
  }
  res.json(updated);
});

router.delete('/:id', requirePermission('payments', 'delete'), (req, res) => {
  db.prepare('DELETE FROM payments WHERE id=?').run(req.params.id);
  res.status(204).end();
});

// ===== Receipt download: two selectable institute templates =====
// GET /api/payments/:id/receipt?institute=A  (or B)
router.get('/:id/receipt', requirePermission('payments', 'view'), (req, res) => {
  const institute = (req.query.institute || 'A').toUpperCase();
  if (!['A', 'B'].includes(institute)) return res.status(400).json({ error: "institute must be 'A' or 'B'" });

  const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status !== 'Paid') return res.status(400).json({ error: 'Receipt is only available once the payment is marked Paid' });

  const student = db.prepare('SELECT * FROM students WHERE id=?').get(payment.student_id);
  const admission = db.prepare('SELECT * FROM admissions WHERE id=?').get(payment.admission_id);
  const course = db.prepare('SELECT * FROM courses WHERE id=?').get(payment.course_id);
  const template = db.prepare('SELECT * FROM receipt_templates WHERE id=?').get(institute);

  db.prepare('UPDATE payments SET receipt_institute=? WHERE id=?').run(institute, payment.id);
  generateReceiptPdf({ payment, student, admission, course, template }, res);
});

module.exports = router;
