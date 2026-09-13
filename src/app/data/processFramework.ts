import type { TranslationKey } from '../i18n/translations';

export interface ProcessPhaseDefinition {
  number: number;
  titleKey: TranslationKey;
  objectiveKey: TranslationKey;
  questionKey: TranslationKey;
  summaryKey: TranslationKey;
  fullDescriptionKey: TranslationKey;
  actionsIntroKey?: TranslationKey;
  actionKeys: TranslationKey[];
  expectedOutcomeKey: TranslationKey;
  eventTypeKeys: TranslationKey[];
}

export const PROCESS_PHASES: ProcessPhaseDefinition[] = [
  {
    number: 1,
    titleKey: 'hub.phase1',
    objectiveKey: 'phase.1.objective',
    questionKey: 'phase.1.question',
    summaryKey: 'hub.phase1Text',
    fullDescriptionKey: 'phase.1.fullDescription',
    actionsIntroKey: 'phase.1.actionsIntro',
    actionKeys: ['phase.1.action1', 'phase.1.action2', 'phase.1.action3', 'phase.1.action4'],
    expectedOutcomeKey: 'phase.1.outcome',
    eventTypeKeys: ['phase.event.ev1', 'phase.event.ev2'],
  },
  {
    number: 2,
    titleKey: 'hub.phase2',
    objectiveKey: 'phase.2.objective',
    questionKey: 'phase.2.question',
    summaryKey: 'hub.phase2Text',
    fullDescriptionKey: 'phase.2.fullDescription',
    actionKeys: ['phase.2.action1', 'phase.2.action2', 'phase.2.action3', 'phase.2.action4', 'phase.2.action5', 'phase.2.action6'],
    expectedOutcomeKey: 'phase.2.outcome',
    eventTypeKeys: ['phase.event.ev3'],
  },
  {
    number: 3,
    titleKey: 'hub.phase3',
    objectiveKey: 'phase.3.objective',
    questionKey: 'phase.3.question',
    summaryKey: 'hub.phase3Text',
    fullDescriptionKey: 'phase.3.fullDescription',
    actionKeys: ['phase.3.action1', 'phase.3.action2', 'phase.3.action3', 'phase.3.action4', 'phase.3.action5', 'phase.3.action6', 'phase.3.action7'],
    expectedOutcomeKey: 'phase.3.outcome',
    eventTypeKeys: ['phase.event.ev4'],
  },
  {
    number: 4,
    titleKey: 'hub.phase4',
    objectiveKey: 'phase.4.objective',
    questionKey: 'phase.4.question',
    summaryKey: 'hub.phase4Text',
    fullDescriptionKey: 'phase.4.fullDescription',
    actionKeys: ['phase.4.action1', 'phase.4.action2', 'phase.4.action3', 'phase.4.action4', 'phase.4.action5', 'phase.4.action6', 'phase.4.action7', 'phase.4.action8'],
    expectedOutcomeKey: 'phase.4.outcome',
    eventTypeKeys: ['phase.event.ev5'],
  },
  {
    number: 5,
    titleKey: 'hub.phase5',
    objectiveKey: 'phase.5.objective',
    questionKey: 'phase.5.question',
    summaryKey: 'hub.phase5Text',
    fullDescriptionKey: 'phase.5.fullDescription',
    actionsIntroKey: 'phase.5.actionsIntro',
    actionKeys: ['phase.5.action1', 'phase.5.action2', 'phase.5.action3', 'phase.5.action4', 'phase.5.action5', 'phase.5.action6', 'phase.5.action7', 'phase.5.action8', 'phase.5.action9'],
    expectedOutcomeKey: 'phase.5.outcome',
    eventTypeKeys: ['phase.event.ev6', 'phase.event.ev7'],
  },
];

export function processPhase(number?: number | null) {
  return PROCESS_PHASES.find((phase) => phase.number === number) || PROCESS_PHASES[0];
}
