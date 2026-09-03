import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import RequirePermission from './components/RequirePermission';
import RouteExperience from './components/RouteExperience';
import PublicFeatureGate from './components/PublicFeatureGate';
import { Bot, Box, MapPinned } from 'lucide-react';

const PossibleScenariosPage = lazy(() => import('./pages/PossibleScenariosPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const GlossaryPage = lazy(() => import('./pages/GlossaryPage'));
const CitiVoiceAppPage = lazy(() => import('./pages/CitiVoiceAppPage'));
const ForumVotingPage = lazy(() => import('./pages/ForumVotingPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const CoCreationGuidePage = lazy(() => import('./pages/CoCreationGuidePage'));
const RepositoryPublicPage = lazy(() => import('./pages/RepositoryPublicPage'));
const SceneEditorPublicPage = lazy(() => import('./pages/SceneEditorPublicPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const PilotSitesPage = lazy(() => import('./pages/PilotSitesPage'));
const DemoGuidePage = lazy(() => import('./pages/DemoGuidePage'));
const SetUpProcessQuestionnairePage = lazy(() => import('./pages/SetUpProcessQuestionnairePage'));
const ExploreToolkitPage = lazy(() => import('./pages/ExploreToolkitPage'));
const ToolDetailPublicPage = lazy(() => import('./pages/ToolDetailPublicPage'));
const SetUpProcessToolsPage = lazy(() => import('./pages/SetUpProcessToolsPage'));
const HubInitiativePage = lazy(() => import('./pages/HubInitiativePage'));
const HubPhaseDetailPage = lazy(() => import('./pages/HubPhaseDetailPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    element: <RouteExperience />,
    children: [
  { path: '/', Component: HomePage },
  { path: '/home', element: <Navigate to="/" replace /> },
  { path: '/landing', element: <Navigate to="/" replace /> },

  { path: '/co-creation-process', element: <Navigate to="/co-creation-hub" replace /> },
  { path: '/get-started', element: <Navigate to="/co-creation-hub" replace /> },
  { path: '/co-creation-hub', Component: OverviewPage },
  { path: '/hub', element: <Navigate to="/co-creation-hub" replace /> },
  { path: '/hub/:initiativeId', Component: HubInitiativePage },
  { path: '/hub/:initiativeId/overview', Component: HubInitiativePage },
  { path: '/hub/:initiativeId/phases', Component: HubInitiativePage },
  { path: '/hub/:initiativeId/activities', Component: HubInitiativePage },
  { path: '/hub/:initiativeId/participate', Component: HubInitiativePage },
  { path: '/hub/:initiativeId/results', Component: HubInitiativePage },
  { path: '/hub/:initiativeId/resources', Component: HubInitiativePage },
  { path: '/hub/:initiativeId/phase/:phaseNumber', Component: HubPhaseDetailPage },
  { path: '/overview', element: <Navigate to="/co-creation-hub" replace /> },
  { path: '/repository', Component: RepositoryPublicPage },
  { path: '/repository-public', element: <Navigate to="/repository" replace /> },
  { path: '/methodology', Component: MethodologyPage },
  { path: '/glossary', Component: GlossaryPage },
  { path: '/privacy-policy', Component: PrivacyPolicyPage },
  { path: '/privacy-cookies-policy', element: <Navigate to="/privacy-policy" replace /> },
  { path: '/pilot-sites', Component: PilotSitesPage },
  { path: '/pilot-sites/:slug', Component: PilotSitesPage },
  { path: '/demo', Component: DemoGuidePage },
  { path: '/analogue-tools', Component: ExploreToolkitPage },
  { path: '/explore-toolkit', Component: ExploreToolkitPage },
  { path: '/tool-detail/:id', Component: ToolDetailPublicPage },
  { path: '/tool/:id', Component: ToolDetailPublicPage },
  { path: '/chatbot', element: <Navigate to="/co-creation-guide" replace /> },
  { path: '/co-creation-guide', element: <PublicFeatureGate icon={Bot} eyebrowKey="gate.guide.eyebrow" titleKey="nav.coCreationGuide" descriptionKey="gate.guide.description" capabilityKeys={['gate.guide.capability1', 'gate.guide.capability2', 'gate.guide.capability3']}><CoCreationGuidePage /></PublicFeatureGate> },
  { path: '/citivoice-app', element: <PublicFeatureGate icon={MapPinned} eyebrowKey="gate.digitalTool" titleKey="nav.citivoice" descriptionKey="gate.citivoice.description" capabilityKeys={['gate.citivoice.capability1', 'gate.citivoice.capability2', 'gate.citivoice.capability3']}><CitiVoiceAppPage /></PublicFeatureGate> },
  { path: '/3d-scene-editor', element: <PublicFeatureGate icon={Box} eyebrowKey="gate.digitalTool" titleKey="nav.sceneEditor" descriptionKey="gate.scene.description" capabilityKeys={['gate.scene.capability1', 'gate.scene.capability2', 'gate.scene.capability3']}><SceneEditorPublicPage /></PublicFeatureGate> },
  { path: '/possible-scenarios', Component: PossibleScenariosPage },
  { path: '/scenarios', element: <Navigate to="/possible-scenarios" replace /> },

  { path: '/forum-voting', Component: ForumVotingPage },
  { path: '/signin', Component: SignInPage },
  { path: '/register', Component: RegisterPage },
  { path: '/verify-email', Component: VerifyEmailPage },

  {
    element: <ProtectedRoute />,
    children: [
      { path: '/account', Component: AccountPage },
      { path: '/account/notifications', Component: AccountPage },
      { path: '/account/privacy', Component: AccountPage },
      { path: '/account/rate-us', Component: AccountPage },
      { path: '/user-details', element: <Navigate to="/account" replace /> },
      { path: '/insights', element: <RequirePermission permission="hub:view-analytics"><InsightsPage /></RequirePermission> },
      { path: '/results', element: <Navigate to="/insights" replace /> },
      { path: '/setup-questionnaire', element: <RequirePermission permission="hub:create"><SetUpProcessQuestionnairePage /></RequirePermission> },
      { path: '/explore', element: <Navigate to="/explore-toolkit" replace /> },
      { path: '/setup-tools', element: <RequirePermission permission="hub:configure-tools"><SetUpProcessToolsPage /></RequirePermission> },
      { path: '/hub/:initiativeId/manage', element: <RequirePermission permission="hub:edit"><HubInitiativePage /></RequirePermission> },
      { path: '/hub/:initiativeId/manage/phases', element: <RequirePermission permission="hub:manage-phases"><HubInitiativePage /></RequirePermission> },
      { path: '/hub/:initiativeId/manage/tools', element: <RequirePermission permission="hub:configure-tools"><HubInitiativePage /></RequirePermission> },
      { path: '/hub/:initiativeId/manage/participants', element: <RequirePermission permission="hub:view-participant-input"><HubInitiativePage /></RequirePermission> },
      { path: '/hub/:initiativeId/manage/results', element: <RequirePermission permission="hub:view-analytics"><HubInitiativePage /></RequirePermission> },
      { path: '/hub/:initiativeId/manage/settings', element: <RequirePermission permission="hub:edit"><HubInitiativePage /></RequirePermission> },
      { path: '/admin', element: <RequirePermission permission="admin:access"><AdminPage /></RequirePermission> },
      { path: '/app', element: <Navigate to="/co-creation-hub" replace /> },
      { path: '/app/setup', element: <Navigate to="/setup-questionnaire" replace /> },
      { path: '/app/filtered-tools', element: <Navigate to="/setup-tools" replace /> },
      { path: '/app/explore', element: <Navigate to="/explore-toolkit" replace /> },
      { path: '/app/scenarios', element: <Navigate to="/possible-scenarios" replace /> },
      { path: '/app/possible-scenarios', element: <Navigate to="/possible-scenarios" replace /> },
      { path: '/app/my-process', element: <Navigate to="/setup-tools" replace /> },
      { path: '/app/tool/:id', Component: ToolDetailPublicPage },
      { path: '/app/ai-agent', element: <Navigate to="/co-creation-guide" replace /> },
      { path: '/app/citivoice', element: <Navigate to="/citivoice-app" replace /> },
      { path: '/app/scene-editor', element: <Navigate to="/3d-scene-editor" replace /> },
      { path: '/app/repository', element: <Navigate to="/repository" replace /> },
      { path: '/app/reports', element: <Navigate to="/insights" replace /> },
      { path: '/app/forum', element: <Navigate to="/forum-voting" replace /> },
      { path: '/app/admin', element: <Navigate to="/admin" replace /> },
    ],
  },
  { path: '*', Component: NotFoundPage },
    ],
  },
]);
