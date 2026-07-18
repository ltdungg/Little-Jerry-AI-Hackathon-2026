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
import { ProjectDecisionsTab } from './pages/project-detail/ProjectDecisionsTab';
import { ProjectHandoffTab } from './pages/project-detail/ProjectHandoffTab';
import { ProjectMeetingsTab } from './pages/project-detail/ProjectMeetingsTab';
import { AssistantPage } from './pages/AssistantPage';
import { HomeDashboardPage } from './pages/HomeDashboardPage';
import { TeamsPage } from './pages/TeamsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { WeeklyReportRollupPage } from './pages/WeeklyReportRollupPage';
import { ProjectReportPage } from './pages/ProjectReportPage';
import { HandoffRollupPage } from './pages/HandoffRollupPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { OffboardingPage } from './pages/OffboardingPage';
import { OrgChartPage } from './pages/OrgChartPage';
import { DecisionArchivePage } from './pages/DecisionArchivePage';
import { UsersAdminPage } from './pages/UsersAdminPage';
import { RolesAdminPage } from './pages/RolesAdminPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ALL_NAV_LEAVES } from './lib/navConfig';

const BUILT_ROUTES = new Set([
  '/',
  '/projects',
  '/assistant',
  '/teams',
  '/knowledge',
  '/reports/weekly',
  '/handoff',
  '/admin/activity-log',
  '/offboarding',
  '/org-chart',
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
              <Route path="decisions" element={<ProjectDecisionsTab />} />
              <Route path="handoff" element={<ProjectHandoffTab />} />
              <Route path="meetings" element={<ProjectMeetingsTab />} />
            </Route>
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/knowledge" element={<DocumentsPage />} />
            <Route path="/reports/weekly" element={<WeeklyReportRollupPage />} />
            <Route path="/reports/weekly/:projectId" element={<ProjectReportPage />} />
            <Route path="/handoff" element={<HandoffRollupPage />} />
            <Route path="/admin/activity-log" element={<ActivityLogPage />} />
            <Route path="/offboarding" element={<OffboardingPage />} />
            <Route path="/org-chart" element={<OrgChartPage />} />
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
