// In local dev, Vite proxies /api to localhost:4000 (see vite.config.js).
// In production, set VITE_API_BASE_URL to your backend URL.
const API_ROOT = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_ROOT}/api`;

async function req(method, path, body) {
  const token = localStorage.getItem('cd_token');
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('cd_token');
    localStorage.removeItem('cd_user');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired, please log in again');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

const qs = (params) => {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const q = new URLSearchParams(clean).toString();
  return q ? `?${q}` : '';
};

export const api = {
  // auth
  login: (username, password) => req('POST', '/auth/login', { username, password }),
  me: () => req('GET', '/auth/me'),

  // leads
  listLeads: (params) => req('GET', '/leads' + qs(params)),
  getLead: (id) => req('GET', `/leads/${id}`),
  createLead: (body) => req('POST', '/leads', body),
  updateLead: (id, body) => req('PUT', `/leads/${id}`, body),
  deleteLead: (id) => req('DELETE', `/leads/${id}`),
  addLeadActivity: (id, body) => req('POST', `/leads/${id}/activities`, body),
  convertLead: (id) => req('POST', `/leads/${id}/convert`),

  // students
  listStudents: (params) => req('GET', '/students' + qs(params)),
  getStudent: (id) => req('GET', `/students/${id}`),
  createStudent: (body) => req('POST', '/students', body),
  updateStudent: (id, body) => req('PUT', `/students/${id}`, body),
  deleteStudent: (id) => req('DELETE', `/students/${id}`),

  // courses
  listCourses: (params) => req('GET', '/courses' + qs(params)),
  getCourse: (id) => req('GET', `/courses/${id}`),
  createCourse: (body) => req('POST', '/courses', body),
  updateCourse: (id, body) => req('PUT', `/courses/${id}`, body),
  deleteCourse: (id) => req('DELETE', `/courses/${id}`),
  courseTenureOptions: () => req('GET', '/courses/tenure-options'),

  // admissions
  listAdmissions: (params) => req('GET', '/admissions' + qs(params)),
  getAdmission: (id) => req('GET', `/admissions/${id}`),
  createAdmission: (body) => req('POST', '/admissions', body),
  updateAdmission: (id, body) => req('PUT', `/admissions/${id}`, body),
  deleteAdmission: (id) => req('DELETE', `/admissions/${id}`),
  nextInstallment: (id) => req('POST', `/admissions/${id}/next-installment`),

  // payments
  listPayments: (params) => req('GET', '/payments' + qs(params)),
  getPayment: (id) => req('GET', `/payments/${id}`),
  updatePayment: (id, body) => req('PUT', `/payments/${id}`, body),
  deletePayment: (id) => req('DELETE', `/payments/${id}`),
  receiptUrl: (id, institute) => `${BASE}/payments/${id}/receipt?institute=${institute}`,

  // companies
  listCompanies: (params) => req('GET', '/companies' + qs(params)),
  getCompany: (id) => req('GET', `/companies/${id}`),
  createCompany: (body) => req('POST', '/companies', body),
  updateCompany: (id, body) => req('PUT', `/companies/${id}`, body),
  deleteCompany: (id) => req('DELETE', `/companies/${id}`),

  // placements
  listPlacements: (params) => req('GET', '/placements' + qs(params)),
  getPlacement: (id) => req('GET', `/placements/${id}`),
  createPlacement: (body) => req('POST', '/placements', body),
  updatePlacement: (id, body) => req('PUT', `/placements/${id}`, body),
  deletePlacement: (id) => req('DELETE', `/placements/${id}`),

  // dashboard
  dashboard: () => req('GET', '/dashboard'),

  // reports
  reportLeads: (params) => req('GET', '/reports/leads' + qs(params)),
  reportStudents: (params) => req('GET', '/reports/students' + qs(params)),
  reportAdmissions: (params) => req('GET', '/reports/admissions' + qs(params)),
  reportCourseWiseAdmissions: () => req('GET', '/reports/course-wise-admissions'),
  reportFeeCollection: (params) => req('GET', '/reports/fee-collection' + qs(params)),
  reportPendingFees: () => req('GET', '/reports/pending-fees'),
  reportPayments: (params) => req('GET', '/reports/payments' + qs(params)),
  reportPlacements: (params) => req('GET', '/reports/placements' + qs(params)),
  reportInterviews: (params) => req('GET', '/reports/interviews' + qs(params)),
  reportCompanies: () => req('GET', '/reports/companies'),
  reportRevenue: (params) => req('GET', '/reports/revenue' + qs(params)),
  reportMonthlyAdmissions: () => req('GET', '/reports/monthly-admissions'),
  reportMonthlyCollection: () => req('GET', '/reports/monthly-collection'),

  // notifications
  listNotifications: () => req('GET', '/notifications'),
  markNotificationRead: (key) => req('POST', `/notifications/${key}/read`),
  markAllNotificationsRead: () => req('POST', '/notifications/read-all'),

  // roles & users
  listRoles: () => req('GET', '/roles'),
  createRole: (body) => req('POST', '/roles', body),
  updateRolePermissions: (id, permissions) => req('PUT', `/roles/${id}/permissions`, { permissions }),
  deleteRole: (id) => req('DELETE', `/roles/${id}`),

  listUsers: () => req('GET', '/users'),
  createUser: (body) => req('POST', '/users', body),
  updateUser: (id, body) => req('PUT', `/users/${id}`, body),
  deleteUser: (id) => req('DELETE', `/users/${id}`),

  // settings
  listReceiptTemplates: () => req('GET', '/settings/receipt-templates'),
  updateReceiptTemplate: (id, body) => req('PUT', `/settings/receipt-templates/${id}`, body),
  listMasterOptions: (listType) => req('GET', `/settings/master-options${listType ? `?list_type=${listType}` : ''}`),
  createMasterOption: (body) => req('POST', '/settings/master-options', body),
  updateMasterOption: (id, body) => req('PUT', `/settings/master-options/${id}`, body),
  deleteMasterOption: (id) => req('DELETE', `/settings/master-options/${id}`),

  // AI assistant
  listConversations: () => req('GET', '/assistant/conversations'),
  createConversation: () => req('POST', '/assistant/conversations', {}),
  getConversation: (id) => req('GET', `/assistant/conversations/${id}`),
  sendAssistantMessage: (id, message) => req('POST', `/assistant/conversations/${id}/message`, { message }),
  confirmAssistantAction: (id, approve) => req('POST', `/assistant/conversations/${id}/confirm`, { approve }),
  assistantAuditLog: () => req('GET', '/assistant/audit-log'),

  // dev
  seedDemoData: () => req('POST', '/dev/seed-demo-data'),

  // WhatsApp integrations
  waProviderTypes: () => req('GET', '/whatsapp/provider-types'),
  waListProviders: () => req('GET', '/whatsapp/providers'),
  waConnectProvider: (body) => req('POST', '/whatsapp/providers', body),
  waUpdateProvider: (id, body) => req('PUT', `/whatsapp/providers/${id}`, body),
  waDeleteProvider: (id) => req('DELETE', `/whatsapp/providers/${id}`),
  waSetDefaultProvider: (id) => req('POST', `/whatsapp/providers/${id}/set-default`),
  waTestProvider: (id) => req('POST', `/whatsapp/providers/${id}/test`),
  waSyncTemplates: (id) => req('POST', `/whatsapp/providers/${id}/sync-templates`),
  waListTemplates: (params) => req('GET', '/whatsapp/templates' + qs(params)),
  waAuditLog: () => req('GET', '/whatsapp/audit-log'),

  // WhatsApp workflows
  waListEvents: () => req('GET', '/whatsapp/events'),
  waListWorkflows: () => req('GET', '/whatsapp/workflows'),
  waCreateWorkflow: (body) => req('POST', '/whatsapp/workflows', body),
  waUpdateWorkflow: (id, body) => req('PUT', `/whatsapp/workflows/${id}`, body),
  waActivateWorkflow: (id) => req('POST', `/whatsapp/workflows/${id}/activate`),
  waDeactivateWorkflow: (id) => req('POST', `/whatsapp/workflows/${id}/deactivate`),
  waDeleteWorkflow: (id) => req('DELETE', `/whatsapp/workflows/${id}`),
  waWorkflowRuns: (id) => req('GET', `/whatsapp/workflows/${id}/runs`),
  waRunScheduledChecks: () => req('POST', '/whatsapp/workflows/run-scheduled-checks'),

  // WhatsApp campaigns
  waPreviewRecipients: (body) => req('POST', '/whatsapp/campaigns/preview-recipients', body),
  waListCampaigns: () => req('GET', '/whatsapp/campaigns'),
  waCreateCampaign: (body) => req('POST', '/whatsapp/campaigns', body),
  waGetCampaign: (id) => req('GET', `/whatsapp/campaigns/${id}`),
  waDeleteCampaign: (id) => req('DELETE', `/whatsapp/campaigns/${id}`),
  waSendCampaign: (id, body) => req('POST', `/whatsapp/campaigns/${id}/send`, body || {}),
  waListOptouts: () => req('GET', '/whatsapp/optouts'),
  waAddOptout: (body) => req('POST', '/whatsapp/optouts', body),
  waRemoveOptout: (id) => req('DELETE', `/whatsapp/optouts/${id}`),

  // WhatsApp conversations
  waListConversations: (params) => req('GET', '/whatsapp/conversations' + qs(params)),
  waGetConversation: (id) => req('GET', `/whatsapp/conversations/${id}`),
  waMarkConversationRead: (id) => req('POST', `/whatsapp/conversations/${id}/read`),
  waReplyConversation: (id, text) => req('POST', `/whatsapp/conversations/${id}/reply`, { text }),

  // WhatsApp analytics
  waAnalytics: (params) => req('GET', '/whatsapp/analytics' + qs(params)),
  waAnalyticsCampaignOptions: () => req('GET', '/whatsapp/analytics/campaign-options'),

  // Lead source integrations
  leadSourceTypes: () => req('GET', '/lead-sources/source-types'),
  listLeadSources: () => req('GET', '/lead-sources/sources'),
  createLeadSource: (body) => req('POST', '/lead-sources/sources', body),
  updateLeadSource: (id, body) => req('PUT', `/lead-sources/sources/${id}`, body),
  regenerateLeadSourceKey: (id) => req('POST', `/lead-sources/sources/${id}/regenerate-key`),
  deleteLeadSource: (id) => req('DELETE', `/lead-sources/sources/${id}`),
  leadSourceLogs: (id) => req('GET', `/lead-sources/sources/${id}/logs`),
  leadSourceEmbedSnippet: (id) => req('GET', `/lead-sources/sources/${id}/embed-snippet`),

  // Facebook OAuth connect flow
  fbConnectUrl: () => req('GET', '/lead-sources/facebook/connect'),
  fbConnections: () => req('GET', '/lead-sources/facebook/connections'),
  fbDeleteConnection: (id) => req('DELETE', `/lead-sources/facebook/connections/${id}`),
  fbPages: (connectionId) => req('GET', `/lead-sources/facebook/connections/${connectionId}/pages`),
  fbForms: (connectionId, pageId) => req('GET', `/lead-sources/facebook/connections/${connectionId}/pages/${pageId}/forms`),
  fbConnectForm: (body) => req('POST', '/lead-sources/facebook/connect-form', body),

  // Database backup
  emailBackupNow: (to) => req('POST', '/backup/email-now', { to }),
  downloadBackup: async () => {
    const token = localStorage.getItem('cd_token');
    const res = await fetch(`${BASE}/backup/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.error || 'Download failed'); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-backup-${new Date().toISOString().slice(0, 10)}.db`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Batches
  listBatches: (params) => req('GET', '/batches' + qs(params)),
  getBatch: (id) => req('GET', `/batches/${id}`),
  createBatch: (body) => req('POST', '/batches', body),
  updateBatch: (id, body) => req('PUT', `/batches/${id}`, body),
  deleteBatch: (id) => req('DELETE', `/batches/${id}`),
  addStudentToBatch: (batchId, studentId) => req('POST', `/batches/${batchId}/students`, { student_id: studentId }),
  removeStudentFromBatch: (batchId, studentId) => req('DELETE', `/batches/${batchId}/students/${studentId}`),

  // Attendance
  getAttendanceSession: (batchId, date) => req('GET', `/attendance/session${qs({ batch_id: batchId, date })}`),
  markAttendanceBulk: (sessionId, records) => req('POST', `/attendance/session/${sessionId}/mark`, { records }),
  markAttendanceOne: (sessionId, studentId, status) => req('POST', '/attendance/mark-one', { session_id: sessionId, student_id: studentId, status }),
  attendanceSummary: (params) => req('GET', '/attendance/reports/summary' + qs(params)),
  attendanceAbsentees: (date) => req('GET', '/attendance/reports/absentees' + qs({ date })),
};
