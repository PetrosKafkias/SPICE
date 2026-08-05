import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import RouteExperience from './components/RouteExperience';
import PublicFeatureGate from './components/PublicFeatureGate';
import { Box, DraftingCompass, MapPinned } from 'lucide-react';

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
  { path: '/citivoice-app', element: <PublicFeatureGate icon={MapPinned} eyebrow="Digital tool" title="CitiVoice" description="Collect and review place-based community feedback." capabilities={['Explore how map-based feedback supports participation.', 'Understand how contributions, photos, and priorities are organised.', 'Sign in to submit or manage project feedback.']}><CitiVoiceAppPage /></PublicFeatureGate> },
  { path: '/3d-scene-editor', element: <PublicFeatureGate icon={Box} eyebrow="Digital tool" title="3D Scene Editor" description="Review and compare public-space design alternatives." capabilities={['Inspect how 3D scenarios support co-design.', 'Compare spatial alternatives before a decision.', 'Sign in to edit, save, or submit a scenario.']}><SceneEditorPublicPage /></PublicFeatureGate> },
  { path: '/possible-scenarios', element: <PublicFeatureGate icon={DraftingCompass} eyebrow="Digital tool" title="Scenario Comparison" description="Compare community design options and their trade-offs." capabilities={['Browse the purpose and structure of scenario comparison.', 'Understand voting and evidence-based comparison.', 'Sign in to vote, submit, or save scenarios.']}><PossibleScenariosPage /></PublicFeatureGate> },
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
      { path: '/insights', Component: InsightsPage },
      { path: '/results', element: <Navigate to="/insights" replace /> },
      { path: '/co-creation-guide', Component: CoCreationGuidePage },
      { path: '/setup-questionnaire', Component: SetUpProcessQuestionnairePage },
      { path: '/explore', element: <Navigate to="/explore-toolkit" replace /> },
      { path: '/setup-tools', Component: SetUpProcessToolsPage },
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
      { path: '/app/admin', element: <Navigate to="/account" replace /> },
    ],
  },
    ],
  },
]);
