import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ProjectsOverviewPage } from './pages/ProjectsOverviewPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { HandoffsListPage } from './pages/HandoffsListPage';
import { HandoffDetailPage } from './pages/HandoffDetailPage';
import { AssistantPage } from './pages/AssistantPage';
import { HomeDashboardPage } from './pages/HomeDashboardPage';
import { TeamsPage } from './pages/TeamsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { KnowledgeSearchPage } from './pages/KnowledgeSearchPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { OffboardingPage } from './pages/OffboardingPage';
import { MembersPage } from './pages/MembersPage';
import { OrgChartPage } from './pages/OrgChartPage';
import { DecisionArchivePage } from './pages/DecisionArchivePage';
import { UsersAdminPage } from './pages/UsersAdminPage';
import { RolesAdminPage } from './pages/RolesAdminPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ALL_NAV_LEAVES } from './lib/navConfig';

const BUILT_ROUTES = new Set([
  '/',
  '/projects',
  '/handoffs',
  '/assistant',
  '/teams',
  '/knowledge',
  '/knowledge/search',
  '/admin/activity-log',
  '/offboarding',
  '/members',
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
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/handoffs" element={<HandoffsListPage />} />
            <Route path="/handoffs/:id" element={<HandoffDetailPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/knowledge" element={<DocumentsPage />} />
            <Route path="/knowledge/search" element={<KnowledgeSearchPage />} />
            <Route path="/admin/activity-log" element={<ActivityLogPage />} />
            <Route path="/offboarding" element={<OffboardingPage />} />
            <Route path="/members" element={<MembersPage />} />
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
