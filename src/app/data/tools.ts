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
  phaseName: string;
  objectiveTags: string[];
  mode: Mode;
  duration: string;
  groupSize: string;
  budget: 'Flexible';
  facilitatorRatio: string;
  suppliesRequired: string;
  expectedOutputs: string[];
  accessibilityNotes: string;
  usageTip: string;
  proTip: string;
  implementationTime: string;
  developmentTime: string;
  howTo: string;
  budgetAdaptation: string;
  examples: string;
  requirements: string;
  reference: string;
  printableUrl: string;
  onlineResources: string;
}

export const PHASES: { id: Phase; name: string; question: string; nameKey: TranslationKey; questionKey: TranslationKey; color: string; bg: string; light: string }[] = [
  { id: 1, name: 'Framing & Readiness', question: 'Are we ready to co-design, and on what terms?', nameKey: 'hub.phase1', questionKey: 'phase.1.question', color: 'text-[#1e3d5c]', bg: 'bg-[#1e3d5c]', light: 'bg-[#e8f0f7]' },
  { id: 2, name: 'Collective Understanding', question: 'How do different actors understand the place and the challenges?', nameKey: 'hub.phase2', questionKey: 'phase.2.question', color: 'text-[#0f6e6e]', bg: 'bg-[#0f6e6e]', light: 'bg-[#e6f5f5]' },
  { id: 3, name: 'Co-Design & Scenario Building', question: 'What futures are possible and desirable?', nameKey: 'hub.phase3', questionKey: 'phase.3.question', color: 'text-[#3a6b3a]', bg: 'bg-[#3a6b3a]', light: 'bg-[#eaf3ea]' },
  { id: 4, name: 'Prototyping & Testing', question: 'What happens if we try this, even temporarily?', nameKey: 'hub.phase4', questionKey: 'phase.4.question', color: 'text-[#8b4f15]', bg: 'bg-[#c8691e]', light: 'bg-[#fef3e8]' },
  { id: 5, name: 'Consolidation, Governance & Learning', question: 'What stays, who takes care of it, and what did we learn?', nameKey: 'hub.phase5', questionKey: 'phase.5.question', color: 'text-[#5a3f7a]', bg: 'bg-[#5a3f7a]', light: 'bg-[#f0eaf8]' },
];

const phaseNames = new Map(PHASES.map((phase) => [phase.id, phase.name]));

export const TOOLS: Tool[] = sourceTools.map((tool) => ({
  ...tool,
  phase: tool.phase as Phase,
  phaseName: phaseNames.get(tool.phase as Phase) || PHASES[0].name,
  mode: tool.mode as Mode,
  budget: 'Flexible',
  status: tool.status as Tool['status'],
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
      phaseName: phaseNames.get(source.phase as Phase) || PHASES[0].name,
      mode: source.mode as Mode,
      budget: 'Flexible',
      status: source.status as Tool['status'],
    };
  });
}
