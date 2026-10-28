import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';

import LandingPage from './pages/LandingPage';
import FeaturesPage from './pages/FeaturesPage';
import PricingPage from './pages/PricingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import RefundPolicy from './pages/RefundPolicy';
import ContactUs from './pages/ContactUs';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import InstituteDashboard from './pages/InstituteDashboard';
import MyInstituteProfile from './pages/MyInstituteProfile';
import SecuritySettings from './pages/SecuritySettings';

import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import QuestionBank from './pages/QuestionBank';
import BankAnalytics from './pages/BankAnalytics';
import Recharge from './pages/Recharge';
import RechargeApprovals from './pages/RechargeApprovals';
import RegistrationApprovals from './pages/RegistrationApprovals';
import SyllabusMaster from './pages/SyllabusMaster';
import AiTagging from './pages/AiTagging';
import Duplicates from './pages/Duplicates';
import GeneratePaper from './pages/GeneratePaper';
import PaperPreview from './pages/PaperPreview';
import PapersList from './pages/PapersList';
import QualityChecks from './pages/QualityChecks';
import ChapterAnalytics from './pages/ChapterAnalytics';
import ImageLibrary from './pages/ImageLibrary';
import ExamHub from './pages/ExamHub';
import ExamDashboard from './pages/ExamDashboard';
import Institutes from './pages/Institutes';
import TrialAccounts from './pages/TrialAccounts';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Requires login (Admin or Institute) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* Shared between both roles */}
              <Route path="/generate" element={<GeneratePaper />} />
              <Route path="/papers" element={<PapersList />} />
              <Route path="/papers/:id" element={<PaperPreview />} />
              <Route path="/questions" element={<QuestionBank />} />
              <Route path="/images" element={<ImageLibrary />} />

              {/* Institute-only */}
              <Route path="/institute-dashboard" element={<InstituteDashboard />} />
              <Route path="/my-institute" element={<MyInstituteProfile />} />
              <Route path="/recharge" element={<Recharge />} />
              <Route path="/security" element={<SecuritySettings />} />

              {/* Admin-only */}
              <Route element={<AdminRoute />}>
                <Route path="/dashboard" element={<ExamHub />} />
                <Route path="/exam/:examName" element={<ExamDashboard />} />
                <Route path="/overview" element={<Dashboard />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/syllabus" element={<SyllabusMaster />} />
                <Route path="/bank-analytics" element={<BankAnalytics />} />
                <Route path="/tagging" element={<AiTagging />} />
                <Route path="/duplicates" element={<Duplicates />} />
                <Route path="/checks" element={<QualityChecks />} />
                <Route path="/analytics/:chapterId" element={<ChapterAnalytics />} />
                <Route path="/institutes" element={<Institutes />} />
                <Route path="/trial-accounts" element={<TrialAccounts />} />
                <Route path="/recharge-approvals" element={<RechargeApprovals />} />
                <Route path="/admin/registrations" element={<RegistrationApprovals />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}




