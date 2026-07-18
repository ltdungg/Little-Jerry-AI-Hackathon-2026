import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ProjectsOverviewPage } from './pages/ProjectsOverviewPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { AssistantPage } from './pages/AssistantPage';
import { HomeDashboardPage } from './pages/HomeDashboardPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { MyUpdatesPage } from './pages/MyUpdatesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { TasksPage } from './pages/TasksPage';
import { WeeklyUpdatesPage } from './pages/WeeklyUpdatesPage';
import { IssuesPage } from './pages/IssuesPage';
import { DecisionsPage } from './pages/DecisionsPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { TeamsPage } from './pages/TeamsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { TeamReportPage } from './pages/TeamReportPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { ChatHistoryPage } from './pages/ChatHistoryPage';
import { SavedAnswersPage } from './pages/SavedAnswersPage';
import { KnowledgeSearchPage } from './pages/KnowledgeSearchPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HandoffPage } from './pages/HandoffPage';
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
  '/tasks',
  '/weekly-updates',
  '/issues',
  '/decisions',
  '/meetings',
  '/teams',
  '/knowledge',
  '/reports/team',
  '/admin/activity-log',
  '/assistant/history',
  '/assistant/saved',
  '/assistant/search',
  '/onboarding',
  '/handoff',
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
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/my-tasks" element={<MyTasksPage />} />
            <Route path="/my-updates" element={<MyUpdatesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/weekly-updates" element={<WeeklyUpdatesPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/decisions" element={<DecisionsPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/knowledge" element={<DocumentsPage />} />
            <Route path="/reports/team" element={<TeamReportPage />} />
            <Route path="/admin/activity-log" element={<ActivityLogPage />} />
            <Route path="/assistant/history" element={<ChatHistoryPage />} />
            <Route path="/assistant/saved" element={<SavedAnswersPage />} />
            <Route path="/assistant/search" element={<KnowledgeSearchPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/handoff" element={<HandoffPage />} />
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
