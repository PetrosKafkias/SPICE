import sourceTools from './localized/analogueTools.en.json';
import elTools from './localized/analogueTools.el.json';
import fiTools from './localized/analogueTools.fi.json';
import plTools from './localized/analogueTools.pl.json';
import ptTools from './localized/analogueTools.pt.json';
import type { LocaleCode } from '../i18n/config';
import type { TranslationKey } from '../i18n/translations';

export type Phase = 1 | 2 | 3 | 4 | 5;
export type Mode = 'Online' | 'Offline' | 'Hybrid';

export interface Tool {
  id: string;
  name: string;
  status: 'Formatted for printing' | 'Content ready';
  typology: string;
  shortDesc: string;
  purpose: string;
  phase: Phase;
  objectiveTags: string[];
  mode: Mode;
  duration: string;
  groupSize: string;
  facilitatorRatio: string;
  targetUsers: 'Internal team' | 'Public participants';
  prerequisites: string;
  suppliesRequired: string;
  usageTip: string;
  developmentTime: string;
  howTo: string;
  printableUrl: string;
  onlineResources: string;
}

// Cross-references derived from the "Prerequisites" column of the SPICE Resources workbook,
// where a tool's prerequisite text names another catalogue tool by name.
export const PREREQUISITE_TOOL_IDS: Record<string, string[]> = {
  'stakeholders-engagement-planning': ['stakeholder-mapping'],
  'levels-of-participation-map': ['stakeholder-mapping'],
  'opportunity-map': ['challenge-reframing'],
  'world-cafe': ['opportunity-map'],
  'roleplay-stepping-in-others-shoes': ['personas-non-human-personas'],
  'actant-journey-map': ['personas-non-human-personas'],
  'scenario-building': ['challenge-reframing'],
  'top-10-design-principles-manifesto': ['challenge-reframing', 'scenario-building'],
  'start-park-card-game': ['challenge-reframing'],
};

export const PHASES: { id: Phase; question: string; nameKey: TranslationKey; questionKey: TranslationKey; color: string; bg: string; light: string }[] = [
  { id: 1, question: 'Are we ready to co-design, and on what terms?', nameKey: 'hub.phase1', questionKey: 'phase.1.question', color: 'text-[#1e3d5c]', bg: 'bg-[#1e3d5c]', light: 'bg-[#e8f0f7]' },
  { id: 2, question: 'How do different actors understand the place and the challenges?', nameKey: 'hub.phase2', questionKey: 'phase.2.question', color: 'text-[#0f6e6e]', bg: 'bg-[#0f6e6e]', light: 'bg-[#e6f5f5]' },
  { id: 3, question: 'What futures are possible and desirable?', nameKey: 'hub.phase3', questionKey: 'phase.3.question', color: 'text-[#3a6b3a]', bg: 'bg-[#3a6b3a]', light: 'bg-[#eaf3ea]' },
  { id: 4, question: 'What happens if we try this, even temporarily?', nameKey: 'hub.phase4', questionKey: 'phase.4.question', color: 'text-[#8b4f15]', bg: 'bg-[#c8691e]', light: 'bg-[#fef3e8]' },
  { id: 5, question: 'What stays, who takes care of it, and what did we learn?', nameKey: 'hub.phase5', questionKey: 'phase.5.question', color: 'text-[#5a3f7a]', bg: 'bg-[#5a3f7a]', light: 'bg-[#f0eaf8]' },
];

export const TOOLS: Tool[] = sourceTools.map((tool) => ({
  ...tool,
  phase: tool.phase as Phase,
  mode: tool.mode as Mode,
  status: tool.status as Tool['status'],
  targetUsers: tool.targetUsers as Tool['targetUsers'],
}));

const LOCALIZED_TOOLS: Record<LocaleCode, typeof sourceTools> = {
  en: sourceTools,
  el: elTools,
  fi: fiTools,
  pl: plTools,
  pt: ptTools,
};

export function getTools(language: LocaleCode): Tool[] {
  const localizedById = new Map(LOCALIZED_TOOLS[language].map((tool) => [tool.id, tool]));
  return sourceTools.map((source) => {
    const localized = localizedById.get(source.id) || source;
    return {
      ...source,
      ...localized,
      phase: source.phase as Phase,
      mode: source.mode as Mode,
      status: source.status as Tool['status'],
      targetUsers: source.targetUsers as Tool['targetUsers'],
    };
  });
}
