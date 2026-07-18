import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ProjectsOverviewPage } from './pages/ProjectsOverviewPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectOverviewTab } from './pages/project-detail/ProjectOverviewTab';
import { ProjectTasksTab } from './pages/project-detail/ProjectTasksTab';
import { ProjectIssuesTab } from './pages/project-detail/ProjectIssuesTab';
import { ProjectDailyUpdatesTab } from './pages/project-detail/ProjectDailyUpdatesTab';
import { ProjectReportsTab } from './pages/project-detail/ProjectReportsTab';
import { ProjectHandoffTab } from './pages/project-detail/ProjectHandoffTab';
import { ProjectMeetingsTab } from './pages/project-detail/ProjectMeetingsTab';
import { AssistantPage } from './pages/AssistantPage';
import { HomeDashboardPage } from './pages/HomeDashboardPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { MyUpdatesPage } from './pages/MyUpdatesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { DecisionsPage } from './pages/DecisionsPage';
import { TeamsPage } from './pages/TeamsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { TeamReportPage } from './pages/TeamReportPage';
import { WeeklyReportRollupPage } from './pages/WeeklyReportRollupPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { ChatHistoryPage } from './pages/ChatHistoryPage';
import { SavedAnswersPage } from './pages/SavedAnswersPage';
import { KnowledgeSearchPage } from './pages/KnowledgeSearchPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { OffboardingPage } from './pages/OffboardingPage';
import { MembersPage } from './pages/MembersPage';
import { LeadershipDashboardPage } from './pages/LeadershipDashboardPage';
import { DecisionArchivePage } from './pages/DecisionArchivePage';
import { UsersAdminPage } from './pages/UsersAdminPage';
import { RolesAdminPage } from './pages/RolesAdminPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ALL_NAV_LEAVES } from './lib/navConfig';

const BUILT_ROUTES = new Set([
  '/',
  '/projects',
  '/assistant',
  '/my-tasks',
  '/my-updates',
  '/notifications',
  '/decisions',
  '/teams',
  '/knowledge',
  '/reports/team',
  '/reports/weekly',
  '/admin/activity-log',
  '/assistant/history',
  '/assistant/saved',
  '/assistant/search',
  '/onboarding',
  '/offboarding',
  '/members',
  '/reports/leadership',
  '/knowledge/decisions',
  '/admin/users',
  '/admin/roles',
]);
const placeholderPaths = ALL_NAV_LEAVES.map((leaf) => leaf.path).filter(
  (path) => !BUILT_ROUTES.has(path),
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<HomeDashboardPage />} />
            <Route path="/projects" element={<ProjectsOverviewPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />}>
              <Route index element={<ProjectOverviewTab />} />
              <Route path="tasks" element={<ProjectTasksTab />} />
              <Route path="issues" element={<ProjectIssuesTab />} />
              <Route path="daily-updates" element={<ProjectDailyUpdatesTab />} />
              <Route path="reports" element={<ProjectReportsTab />} />
              <Route path="handoff" element={<ProjectHandoffTab />} />
              <Route path="meetings" element={<ProjectMeetingsTab />} />
            </Route>
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/my-tasks" element={<MyTasksPage />} />
            <Route path="/my-updates" element={<MyUpdatesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/decisions" element={<DecisionsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/knowledge" element={<DocumentsPage />} />
            <Route path="/reports/team" element={<TeamReportPage />} />
            <Route path="/reports/weekly" element={<WeeklyReportRollupPage />} />
            <Route path="/admin/activity-log" element={<ActivityLogPage />} />
            <Route path="/assistant/history" element={<ChatHistoryPage />} />
            <Route path="/assistant/saved" element={<SavedAnswersPage />} />
            <Route path="/assistant/search" element={<KnowledgeSearchPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/offboarding" element={<OffboardingPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/reports/leadership" element={<LeadershipDashboardPage />} />
            <Route path="/knowledge/decisions" element={<DecisionArchivePage />} />
            <Route path="/admin/users" element={<UsersAdminPage />} />
            <Route path="/admin/roles" element={<RolesAdminPage />} />
            {placeholderPaths.map((path) => (
              <Route key={path} path={path} element={<PlaceholderPage />} />
            ))}
            <Route path="*" element={<PlaceholderPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
