import type { Role } from '../auth/permissions';
import type { TranslationKey } from '../i18n/translations';

export interface ProcessPhaseDefinition {
  number: number;
  titleKey: TranslationKey;
  questionKey: TranslationKey;
  summaryKey: TranslationKey;
  expectedOutcomeKey: TranslationKey;
  eventTypeKeys: TranslationKey[];
}

export const PROCESS_PHASES: ProcessPhaseDefinition[] = [
  {
    number: 1,
    titleKey: 'hub.phase1',
    questionKey: 'phase.1.question',
    summaryKey: 'hub.phase1Text',
    expectedOutcomeKey: 'phase.1.outcome',
    eventTypeKeys: ['phase.event.ev1', 'phase.event.ev2'],
  },
  {
    number: 2,
    titleKey: 'hub.phase2',
    questionKey: 'phase.2.question',
    summaryKey: 'hub.phase2Text',
    expectedOutcomeKey: 'phase.2.outcome',
    eventTypeKeys: ['phase.event.ev3'],
  },
  {
    number: 3,
    titleKey: 'hub.phase3',
    questionKey: 'phase.3.question',
    summaryKey: 'hub.phase3Text',
    expectedOutcomeKey: 'phase.3.outcome',
    eventTypeKeys: ['phase.event.ev4'],
  },
  {
    number: 4,
    titleKey: 'hub.phase4',
    questionKey: 'phase.4.question',
    summaryKey: 'hub.phase4Text',
    expectedOutcomeKey: 'phase.4.outcome',
    eventTypeKeys: ['phase.event.ev5'],
  },
  {
    number: 5,
    titleKey: 'hub.phase5',
    questionKey: 'phase.5.question',
    summaryKey: 'hub.phase5Text',
    expectedOutcomeKey: 'phase.5.outcome',
    eventTypeKeys: ['phase.event.ev6', 'phase.event.ev7'],
  },
];

export interface RoleJourneyStep {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  actionKey: TranslationKey;
  path: string;
}

export interface RoleJourneyDefinition {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  steps: RoleJourneyStep[];
}

export const ROLE_JOURNEYS: Record<Role, RoleJourneyDefinition> = {
  citizen: {
    titleKey: 'journey.citizen.title',
    descriptionKey: 'journey.citizen.description',
    steps: [
      { titleKey: 'journey.citizen.1.title', descriptionKey: 'journey.citizen.1.description', actionKey: 'journey.citizen.1.action', path: '/pilot-sites' },
      { titleKey: 'journey.citizen.2.title', descriptionKey: 'journey.citizen.2.description', actionKey: 'journey.citizen.2.action', path: '/forum-voting' },
      { titleKey: 'journey.citizen.3.title', descriptionKey: 'journey.citizen.3.description', actionKey: 'journey.citizen.3.action', path: '/insights' },
      { titleKey: 'journey.citizen.4.title', descriptionKey: 'journey.citizen.4.description', actionKey: 'journey.citizen.4.action', path: '/account/notifications' },
    ],
  },
  facilitator: {
    titleKey: 'journey.facilitator.title',
    descriptionKey: 'journey.facilitator.description',
    steps: [
      { titleKey: 'journey.facilitator.1.title', descriptionKey: 'journey.facilitator.1.description', actionKey: 'journey.facilitator.1.action', path: '/analogue-tools' },
      { titleKey: 'journey.facilitator.2.title', descriptionKey: 'journey.facilitator.2.description', actionKey: 'journey.facilitator.2.action', path: '/co-creation-hub' },
      { titleKey: 'journey.facilitator.3.title', descriptionKey: 'journey.facilitator.3.description', actionKey: 'journey.facilitator.3.action', path: '/co-creation-hub' },
      { titleKey: 'journey.facilitator.4.title', descriptionKey: 'journey.facilitator.4.description', actionKey: 'journey.facilitator.4.action', path: '/repository' },
    ],
  },
  municipality: {
    titleKey: 'journey.municipality.title',
    descriptionKey: 'journey.municipality.description',
    steps: [
      { titleKey: 'journey.municipality.1.title', descriptionKey: 'journey.municipality.1.description', actionKey: 'journey.municipality.1.action', path: '/setup-questionnaire' },
      { titleKey: 'journey.municipality.2.title', descriptionKey: 'journey.municipality.2.description', actionKey: 'journey.municipality.2.action', path: '/co-creation-hub' },
      { titleKey: 'journey.municipality.3.title', descriptionKey: 'journey.municipality.3.description', actionKey: 'journey.municipality.3.action', path: '/forum-voting' },
      { titleKey: 'journey.municipality.4.title', descriptionKey: 'journey.municipality.4.description', actionKey: 'journey.municipality.4.action', path: '/repository' },
    ],
  },
  admin: {
    titleKey: 'journey.admin.title',
    descriptionKey: 'journey.admin.description',
    steps: [
      { titleKey: 'journey.admin.1.title', descriptionKey: 'journey.admin.1.description', actionKey: 'journey.admin.1.action', path: '/admin' },
      { titleKey: 'journey.admin.2.title', descriptionKey: 'journey.admin.2.description', actionKey: 'journey.admin.2.action', path: '/admin' },
      { titleKey: 'journey.admin.3.title', descriptionKey: 'journey.admin.3.description', actionKey: 'journey.admin.3.action', path: '/admin' },
      { titleKey: 'journey.admin.4.title', descriptionKey: 'journey.admin.4.description', actionKey: 'journey.admin.4.action', path: '/admin' },
    ],
  },
};

export function processPhase(number?: number | null) {
  return PROCESS_PHASES.find((phase) => phase.number === number) || PROCESS_PHASES[0];
}
