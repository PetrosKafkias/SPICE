import type { TranslationKey } from '../i18n/translations';
import { processPhase, type DigitalToolId } from './processFramework';
import type { Tool } from './tools';

export const DIGITAL_TOOL_IDS: DigitalToolId[] = ['citivoice', 'chatbot', 'scene'];

const DIGITAL_TOOLS: Record<DigitalToolId, { nameKey: TranslationKey; descriptionKey: TranslationKey; route: string }> = {
  citivoice: { nameKey: 'nav.citivoice', descriptionKey: 'gate.citivoice.description', route: '/citivoice-app' },
  chatbot: { nameKey: 'nav.aiChatbot', descriptionKey: 'tools.aiChatbotText', route: '/co-creation-guide' },
  scene: { nameKey: 'nav.sceneEditor', descriptionKey: 'gate.scene.description', route: '/3d-scene-editor' },
};

export interface SpiceResource {
  id: string;
  kind: 'analog' | 'digital';
  name: string;
  description: string;
  route: string;
}

export function isDigitalToolId(id: string): id is DigitalToolId {
  return (DIGITAL_TOOL_IDS as string[]).includes(id);
}

export function resolveSpiceResource(id: string, tools: Tool[], t: (key: TranslationKey) => string): SpiceResource | null {
  if (isDigitalToolId(id)) {
    const digital = DIGITAL_TOOLS[id];
    return { id, kind: 'digital', name: t(digital.nameKey), description: t(digital.descriptionKey), route: digital.route };
  }
  const tool = tools.find((item) => item.id === id);
  return tool ? { id, kind: 'analog', name: tool.name, description: tool.shortDesc, route: `/tool-detail/${tool.id}` } : null;
}

// What the SPICE methodology suggests for an Objective: its catalogue resources plus the digital tools D3.3 lists for it.
export function recommendedResourceIds(phaseNumber: number, tools: Tool[]): string[] {
  return [
    ...tools.filter((tool) => tool.phase === phaseNumber).map((tool) => tool.id),
    ...(processPhase(phaseNumber).digitalTools || []).map((tool) => tool.toolId),
  ];
}
