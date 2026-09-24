import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Courses from './pages/Courses';
import Admissions from './pages/Admissions';
import AdmissionDetail from './pages/AdmissionDetail';
import Payments from './pages/Payments';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Placements from './pages/Placements';
import Reports from './pages/Reports';
import Roles from './pages/Roles';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Appearance from './pages/Appearance';
import WhatsAppIntegrations from './pages/WhatsAppIntegrations';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import WhatsAppWorkflows from './pages/WhatsAppWorkflows';
import WhatsAppCampaigns from './pages/WhatsAppCampaigns';
import WhatsAppInbox from './pages/WhatsAppInbox';
import WhatsAppAnalytics from './pages/WhatsAppAnalytics';
import LeadSources from './pages/LeadSources';
import Batches from './pages/Batches';
import Attendance from './pages/Attendance';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
              <Route path="/students" element={<Students />} />
              <Route path="/students/:id" element={<StudentDetail />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/admissions" element={<Admissions />} />
              <Route path="/admissions/:id" element={<AdmissionDetail />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/payments/:id" element={<Payments />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/placements" element={<Placements />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/appearance" element={<Appearance />} />
              <Route path="/whatsapp" element={<WhatsAppIntegrations />} />
              <Route path="/whatsapp/templates" element={<WhatsAppTemplates />} />
              <Route path="/whatsapp/workflows" element={<WhatsAppWorkflows />} />
              <Route path="/whatsapp/campaigns" element={<WhatsAppCampaigns />} />
              <Route path="/whatsapp/inbox" element={<WhatsAppInbox />} />
              <Route path="/whatsapp/inbox/:id" element={<WhatsAppInbox />} />
              <Route path="/whatsapp/analytics" element={<WhatsAppAnalytics />} />
              <Route path="/lead-sources" element={<LeadSources />} />
              <Route path="/batches" element={<Batches />} />
              <Route path="/attendance" element={<Attendance />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
