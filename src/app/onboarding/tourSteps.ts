import type { Role } from '../auth/permissions';
import type { TranslationKey } from '../i18n/translations';

// Bump when the tour changes enough that returning users should be offered it again.
export const TOUR_VERSION = 1;

export interface TourStep {
  id: string;
  /** Route the step lives on. The tour navigates here before showing the step. */
  route: string;
  /**
   * `data-tour` attribute value of the element to spotlight. Omit for a centred
   * dialog with no highlight (used for the welcome and closing steps).
   */
  target?: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  placement?: 'top' | 'bottom';
}

const WELCOME: TourStep = {
  id: 'welcome',
  route: '/co-creation-hub',
  titleKey: 'tour.welcomeTitle',
  bodyKey: 'tour.welcomeBody',
};

const FINISH: TourStep = {
  id: 'finish',
  route: '/co-creation-hub',
  titleKey: 'tour.finishTitle',
  bodyKey: 'tour.finishBody',
};

const CITIZEN_STEPS: TourStep[] = [
  WELCOME,
  { id: 'pilot', route: '/co-creation-hub', target: 'hub-pilot-card', titleKey: 'tour.pilotTitle', bodyKey: 'tour.pilotBodyCitizen' },
  { id: 'roadmap', route: '/co-creation-hub', target: 'hub-roadmap', titleKey: 'tour.roadmapTitle', bodyKey: 'tour.roadmapBodyCitizen' },
  { id: 'participation', route: '/co-creation-hub', target: 'hub-participation', titleKey: 'tour.participationTitle', bodyKey: 'tour.participationBody' },
  { id: 'tools', route: '/co-creation-hub', target: 'hub-tools', titleKey: 'tour.toolsTitle', bodyKey: 'tour.toolsBodyCitizen' },
  { id: 'forum', route: '/forum-voting', target: 'forum-main', titleKey: 'tour.forumTitle', bodyKey: 'tour.forumBodyCitizen' },
  { id: 'repository', route: '/repository', target: 'repository-main', titleKey: 'tour.repositoryTitle', bodyKey: 'tour.repositoryBodyCitizen' },
  { id: 'toolkit', route: '/explore-toolkit', target: 'toolkit-main', titleKey: 'tour.toolkitTitle', bodyKey: 'tour.toolkitBody' },
  FINISH,
];

const FACILITATOR_STEPS: TourStep[] = [
  WELCOME,
  { id: 'assignment', route: '/co-creation-hub', target: 'facilitator-pilot', titleKey: 'tour.assignmentTitle', bodyKey: 'tour.assignmentBody' },
  { id: 'facilitator-tools', route: '/co-creation-hub', target: 'facilitator-tools', titleKey: 'tour.toolsTitle', bodyKey: 'tour.toolsBodyFacilitator' },
  { id: 'facilitator-actions', route: '/co-creation-hub', target: 'facilitator-actions', titleKey: 'tour.facilitatorActionsTitle', bodyKey: 'tour.facilitatorActionsBody' },
  { id: 'repository', route: '/repository', target: 'repository-main', titleKey: 'tour.repositoryTitle', bodyKey: 'tour.repositoryBodyFacilitator' },
  { id: 'forum', route: '/forum-voting', target: 'forum-main', titleKey: 'tour.forumTitle', bodyKey: 'tour.forumBodyFacilitator' },
  { id: 'toolkit', route: '/explore-toolkit', target: 'toolkit-main', titleKey: 'tour.toolkitTitle', bodyKey: 'tour.toolkitBody' },
  FINISH,
];

const MUNICIPALITY_STEPS: TourStep[] = [
  WELCOME,
  { id: 'pilot', route: '/co-creation-hub', target: 'hub-pilot-card', titleKey: 'tour.pilotTitle', bodyKey: 'tour.pilotBodyMunicipality' },
  { id: 'roadmap', route: '/co-creation-hub', target: 'hub-roadmap', titleKey: 'tour.roadmapTitle', bodyKey: 'tour.roadmapBodyMunicipality' },
  { id: 'facilitator', route: '/co-creation-hub', target: 'hub-facilitator', titleKey: 'tour.facilitatorTitle', bodyKey: 'tour.facilitatorBody' },
  { id: 'get-started', route: '/co-creation-hub', target: 'hub-get-started', titleKey: 'tour.getStartedTitle', bodyKey: 'tour.getStartedBody' },
  { id: 'tools', route: '/co-creation-hub', target: 'hub-tools', titleKey: 'tour.toolsTitle', bodyKey: 'tour.toolsBodyMunicipality' },
  { id: 'forum', route: '/forum-voting', target: 'forum-main', titleKey: 'tour.forumTitle', bodyKey: 'tour.forumBodyMunicipality' },
  { id: 'repository', route: '/repository', target: 'repository-main', titleKey: 'tour.repositoryTitle', bodyKey: 'tour.repositoryBodyMunicipality' },
  FINISH,
];

export function tourStepsForRole(role: Role | null): TourStep[] {
  if (role === 'municipality') return MUNICIPALITY_STEPS;
  if (role === 'facilitator') return FACILITATOR_STEPS;
  if (role === 'admin') return MUNICIPALITY_STEPS;
  return CITIZEN_STEPS;
}
