const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission } = require('../middleware/auth');

const admissionNumber = (id) => `ADM-${String(id).padStart(5, '0')}`;
const paymentNumber = (id) => `PAY-${String(id).padStart(5, '0')}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

// Admin-only, one-click sample data so every module has something to look at.
// Safe to call more than once — it just adds more rows each time.
router.post('/seed-demo-data', requirePermission('settings', 'edit'), (req, res) => {
  const counts = {};

  // ---- Courses ----
  const courseDefs = [
    ['Full Stack Web Development', 'FSD', 'Development', '6 Months', 60000, 3],
    ['Digital Marketing Mastery', 'DGM', 'Marketing', '3 Months', 30000, 2],
    ['Data Analytics with Python', 'DAP', 'Data', '4 Months', 45000, 2],
    ['UI/UX Design Fundamentals', 'UXD', 'Design', '2 Months', 22000, 1],
    ['Spoken English & Communication', 'SEC', '1 Month', '1 Month', 8000, 1],
  ];
  const courseIds = [];
  for (const [name, code, category, tenure, fees, emi] of courseDefs) {
    const exists = db.prepare('SELECT id FROM courses WHERE course_code=?').get(code);
    if (exists) { courseIds.push(exists.id); continue; }
    const info = db.prepare(`INSERT INTO courses (course_name, course_code, category, course_tenure, total_course_fees, emi_count, status) VALUES (?,?,?,?,?,?, 'Active')`)
      .run(name, code, category, tenure, fees, emi);
    courseIds.push(info.lastInsertRowid);
  }
  counts.courses = courseIds.length;

  // ---- Companies ----
  const companyDefs = [
    ['Nexora Technologies', 'IT Services', 'Radhika Menon', '9812300001'],
    ['BrightPath Digital', 'Marketing', 'Arjun Sethi', '9812300002'],
    ['Quanta Analytics', 'Data & Analytics', 'Farah Khan', '9812300003'],
  ];
  const companyIds = [];
  for (const [name, industry, hr, mobile] of companyDefs) {
    const exists = db.prepare('SELECT id FROM companies WHERE company_name=?').get(name);
    if (exists) { companyIds.push(exists.id); continue; }
    const info = db.prepare(`INSERT INTO companies (company_name, industry, hr_name, hr_mobile, status) VALUES (?,?,?,?, 'Active')`).run(name, industry, hr, mobile);
    companyIds.push(info.lastInsertRowid);
  }
  counts.companies = companyIds.length;

  // ---- Leads (mix of statuses, sources, counselors, dates) ----
  const counselors = ['Ravi', 'Meena', 'Farah'];
  const sources = ['Referral', 'Walk-in', 'Instagram', 'Google', 'Website'];
  const leadNames = ['Anita Kumar', 'Sunil Rao', 'Priya Verma', 'Rahul Sharma', 'Divya Iyer', 'Karan Malhotra', 'Neha Joshi', 'Vikram Singh'];
  const statuses = ['New', 'Contacted', 'Interested', 'Follow-up', 'Not Interested'];
  const leadIds = [];
  leadNames.forEach((name, i) => {
    const info = db.prepare(`
      INSERT INTO leads (student_name, mobile, source, city, assigned_counselor, status, follow_up_date, interested_course_id, created_at)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(
      name, `98765${String(10000 + i)}`, sources[i % sources.length], 'Nagpur',
      counselors[i % counselors.length], statuses[i % statuses.length],
      i % 3 === 0 ? new Date().toISOString().slice(0, 10) : null,
      courseIds[i % courseIds.length], daysAgo(i)
    );
    leadIds.push(info.lastInsertRowid);
  });
  counts.leads = leadIds.length;

  // ---- Convert 4 of those leads to Students, admit them, generate payments ----
  const studentIds = [];
  for (let i = 0; i < 4; i++) {
    const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(leadIds[i]);
    const sInfo = db.prepare(`INSERT INTO students (lead_id, student_name, mobile, status) VALUES (?,?,?, 'Active')`).run(lead.id, lead.student_name, lead.mobile);
    const studentId = sInfo.lastInsertRowid;
    db.prepare(`UPDATE leads SET status='Converted', converted_student_id=? WHERE id=?`).run(studentId, lead.id);
    studentIds.push(studentId);

    const courseId = courseIds[i % courseIds.length];
    const course = db.prepare('SELECT * FROM courses WHERE id=?').get(courseId);
    const aInfo = db.prepare(`
      INSERT INTO admissions (student_id, course_id, admission_date, admission_status, admission_stage, counselor, course_tenure, total_course_fees, emi_count, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(studentId, courseId, daysAgo(i), i === 3 ? 'Completed' : 'Active', i === 0 ? 'Fees Pending' : 'Ongoing', counselors[i % counselors.length], course.course_tenure, course.total_course_fees, course.emi_count, daysAgo(i));
    const admissionId = aInfo.lastInsertRowid;
    db.prepare('UPDATE admissions SET admission_number=? WHERE id=?').run(admissionNumber(admissionId), admissionId);

    const installment = course.emi_count > 0 ? Math.round((course.total_course_fees / course.emi_count) * 100) / 100 : course.total_course_fees;
    for (let n = 1; n <= course.emi_count; n++) {
      const paid = n === 1 || i >= 2; // first installment always paid, later students fully paid
      const pInfo = db.prepare(`
        INSERT INTO payments (student_id, admission_id, course_id, installment_number, amount, status, payment_mode, payment_date, created_at)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).run(studentId, admissionId, courseId, n, installment, paid ? 'Paid' : 'Pending', paid ? 'UPI' : null, paid ? daysAgo(i) : null, daysAgo(i));
      db.prepare('UPDATE payments SET payment_number=? WHERE id=?').run(paymentNumber(pInfo.lastInsertRowid), pInfo.lastInsertRowid);
    }
  }
  counts.students = studentIds.length;

  // ---- Placements for 2 of the students ----
  const placementDefs = [
    [studentIds[0], companyIds[0], daysAgo(-2), 'Scheduled', null],
    [studentIds[1], companyIds[1], daysAgo(1), 'Attended', 'Selected'],
    [studentIds[2], companyIds[2], daysAgo(3), 'Attended', 'Waiting'],
  ];
  let placementCount = 0;
  for (const [studentId, companyId, date, status, result] of placementDefs) {
    db.prepare(`INSERT INTO placements (student_id, company_id, interview_date, interview_round, interview_status, result) VALUES (?,?,?,?,?,?)`)
      .run(studentId, companyId, date, 'Round 1', status, result);
    placementCount++;
  }
  counts.placements = placementCount;

  res.json({ message: 'Demo data loaded', counts });
});

module.exports = router;
