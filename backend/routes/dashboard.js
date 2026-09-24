const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const count = (sql, ...params) => db.prepare(sql).get(...params).c;
  const sum = (sql, ...params) => db.prepare(sql).get(...params).s || 0;

  const cards = {
    total_leads: count('SELECT COUNT(*) c FROM leads'),
    todays_leads: count("SELECT COUNT(*) c FROM leads WHERE date(created_at) = date(?)", today),
    monthly_leads: count("SELECT COUNT(*) c FROM leads WHERE date(created_at) >= date(?)", monthStart),

    total_students: count('SELECT COUNT(*) c FROM students'),
    active_students: count("SELECT COUNT(*) c FROM students WHERE status = 'Active'"),
    completed_students: count(`SELECT COUNT(DISTINCT student_id) c FROM admissions WHERE admission_status = 'Completed'`),

    new_admissions: count("SELECT COUNT(*) c FROM admissions WHERE date(created_at) = date(?)", today),
    monthly_admissions: count("SELECT COUNT(*) c FROM admissions WHERE date(created_at) >= date(?)", monthStart),
    pending_admissions: count(`SELECT COUNT(*) c FROM admissions WHERE admission_stage NOT IN ('Completed')`),

    total_revenue: sum(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = 'Paid'`),
    todays_collection: sum(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = 'Paid' AND date(payment_date) = date(?)`, today),
    monthly_collection: sum(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = 'Paid' AND date(payment_date) >= date(?)`, monthStart),
    pending_fees: sum(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status IN ('Pending','Partial')`),
    due_payments: count(`SELECT COUNT(*) c FROM payments WHERE status IN ('Pending','Partial')`),

    total_companies: count('SELECT COUNT(*) c FROM companies'),
    interviews_scheduled: count(`SELECT COUNT(*) c FROM placements WHERE interview_status = 'Scheduled'`),
    interviews_completed: count(`SELECT COUNT(*) c FROM placements WHERE interview_status = 'Attended'`),
    students_selected: count(`SELECT COUNT(*) c FROM placements WHERE result = 'Selected'`),
    placement_pending: count(`SELECT COUNT(*) c FROM placements WHERE result IS NULL OR result = 'Waiting'`),
  };

  const admissions_by_status = db.prepare(`SELECT admission_status AS status, COUNT(*) c FROM admissions GROUP BY admission_status`).all();

  const course_wise_revenue = db.prepare(`
    SELECT c.course_name, COALESCE(SUM(p.amount), 0) revenue
    FROM courses c LEFT JOIN payments p ON p.course_id = c.id AND p.status = 'Paid'
    GROUP BY c.id ORDER BY revenue DESC LIMIT 10
  `).all();

  const top_courses = db.prepare(`
    SELECT c.course_name, COUNT(a.id) admissions
    FROM courses c LEFT JOIN admissions a ON a.course_id = c.id
    GROUP BY c.id ORDER BY admissions DESC LIMIT 5
  `).all();

  const admission_trends = db.prepare(`
    SELECT strftime('%Y-%m', created_at) month, COUNT(*) c FROM admissions
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all().reverse();

  const monthly_revenue_trend = db.prepare(`
    SELECT strftime('%Y-%m', payment_date) month, COALESCE(SUM(amount),0) revenue
    FROM payments WHERE status = 'Paid' AND payment_date IS NOT NULL
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all().reverse();

  const placement_success_rate = (() => {
    const total = count(`SELECT COUNT(*) c FROM placements WHERE result IS NOT NULL`);
    const selected = count(`SELECT COUNT(*) c FROM placements WHERE result = 'Selected'`);
    return total ? Math.round((selected / total) * 1000) / 10 : 0;
  })();

  const recent_admissions = db.prepare(`
    SELECT a.id, a.admission_number, a.created_at, s.student_name, c.course_name
    FROM admissions a JOIN students s ON s.id = a.student_id JOIN courses c ON c.id = a.course_id
    ORDER BY a.created_at DESC LIMIT 5
  `).all();

  const recent_payments = db.prepare(`
    SELECT p.id, p.payment_number, p.amount, p.status, p.created_at, s.student_name
    FROM payments p JOIN students s ON s.id = p.student_id
    ORDER BY p.created_at DESC LIMIT 5
  `).all();

  const upcoming_interviews = db.prepare(`
    SELECT pl.id, pl.interview_date, pl.interview_round, s.student_name, co.company_name
    FROM placements pl JOIN students s ON s.id = pl.student_id JOIN companies co ON co.id = pl.company_id
    WHERE pl.interview_status IN ('Scheduled','Rescheduled') AND date(pl.interview_date) >= date(?)
    ORDER BY pl.interview_date LIMIT 5
  `).all(today);

  res.json({
    cards,
    admissions_by_status,
    course_wise_revenue,
    top_courses,
    admission_trends,
    monthly_revenue_trend,
    placement_success_rate,
    recent_admissions,
    recent_payments,
    upcoming_interviews,
  });
});

module.exports = router;
