import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Branches from '@/pages/Branches';
import Classes from '@/pages/Classes';
import Teachers from '@/pages/Teachers';
import Students from '@/pages/Students';
import Attendance from '@/pages/Attendance';
import ParentUpdates from '@/pages/ParentUpdates';
import Homework from '@/pages/Homework';
import Leads from '@/pages/Leads';
import ClassSession from '@/pages/ClassSession';
import ParentView from '@/pages/ParentView';
import Observations from '@/pages/Observations';
import ObservationDetailPage from '@/pages/ObservationDetail';
import TeacherKpi from '@/pages/TeacherKpi';
import FutureAiLearningEngine from '@/pages/FutureAiLearningEngine';
import MigrationOwnershipAudit from '@/pages/MigrationOwnershipAudit';
import BranchPerformance from '@/pages/BranchPerformance';
import TrialScheduling from '@/pages/TrialScheduling';
import MyTasks from '@/pages/MyTasks';
import PrototypeSummary from '@/pages/PrototypeSummary';
import FeeTracking from '@/pages/FeeTracking';
import PublicWelcome from '@/pages/PublicWelcome';
import AuthPreview from '@/pages/AuthPreview';
import SalesKit from '@/pages/SalesKit';
import { SupabaseAuthStateProvider } from '@/hooks/useSupabaseAuthState';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/students" element={<Students />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/parent-updates" element={<ParentUpdates />} />
        <Route path="/homework" element={<Homework />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/class-session" element={<ClassSession />} />
        <Route path="/observations" element={<Observations />} />
        <Route path="/observations/:id" element={<ObservationDetailPage />} />
        <Route path="/teacher-kpi" element={<TeacherKpi />} />
        <Route path="/future-ai-learning-engine" element={<FutureAiLearningEngine />} />
        <Route path="/migration-ownership-audit" element={<MigrationOwnershipAudit />} />
        <Route path="/branch-performance" element={<BranchPerformance />} />
        <Route path="/trial-scheduling" element={<TrialScheduling />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/prototype-summary" element={<PrototypeSummary />} />
        <Route path="/fee-tracking" element={<FeeTracking />} />
        <Route path="/sales-kit" element={<SalesKit />} />
        <Route path="/parent-view" element={<ParentView />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <QueryClientProvider client={queryClientInstance}>
      <SupabaseAuthStateProvider>
      <Router>
        <Routes>
          <Route path="/auth-preview" element={<AuthPreview />} />
          <Route path="/welcome" element={<PublicWelcome />} />
          <Route path="/*" element={(
            <AuthProvider>
              <AuthenticatedApp />
            </AuthProvider>
          )} />
        </Routes>
        <Toaster />
      </Router>
      </SupabaseAuthStateProvider>
    </QueryClientProvider>
  )
}

export default App