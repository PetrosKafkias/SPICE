import type { Tool } from '../data/tools';
import { processPhase } from '../data/processFramework';
import { DIGITAL_TOOL_IDS, isDigitalToolId, resolveSpiceResource } from '../data/spiceResources';
import type { TranslationKey } from '../i18n/translations';

/** One SPICE resource of an Objective, recommended from the setup or not. */
export interface ResourceOption {
  id: string;
  name: string;
  kind: 'analog' | 'digital';
  /** The Objective the catalogue files it under; digital tools have none. */
  phase: number | null;
  /** Chosen by the Municipality for this Objective in the setup questionnaire. */
  recommended: boolean;
}

/** The Municipality's choices from setting up the pilot, as the hub returns them. */
export interface SetupChoices {
  setupSelectedTools?: string[];
}

/**
 * The SPICE resources of one Objective: its catalogue resources, the digital tools the methodology
 * lists for it and anything already chosen for it. Recommended are the ones the Municipality picked
 * in the setup questionnaire; the others stay available as the Objective's other resources.
 */
export function objectiveResourceOptions(
  phaseNumber: number,
  tools: Tool[],
  t: (key: TranslationKey) => string,
  setup: SetupChoices,
  chosenForObjective: string[],
): ResourceOption[] {
  const fromSetup = new Set(setup.setupSelectedTools || []);
  const methodologyDigital = new Set((processPhase(phaseNumber).digitalTools || []).map((tool) => tool.toolId as string));
  const ids = [
    ...tools.filter((tool) => tool.phase === phaseNumber || chosenForObjective.includes(tool.id)).map((tool) => tool.id),
    ...DIGITAL_TOOL_IDS.filter((id) => methodologyDigital.has(id) || chosenForObjective.includes(id)),
  ];
  const options: ResourceOption[] = [];
  ids.forEach((id) => {
    const resource = resolveSpiceResource(id, tools, t);
    if (!resource) return;
    // The setup list is shared by all Objectives; a digital tool counts for this Objective only when
    // the Municipality chose it for this Objective.
    const recommended = fromSetup.has(id) && (!isDigitalToolId(id) || chosenForObjective.includes(id));
    options.push({ id, name: resource.name, kind: resource.kind, phase: tools.find((tool) => tool.id === id)?.phase ?? null, recommended });
  });
  // Analog resources before digital tools, then by name.
  return options.sort((a, b) => Number(a.kind === 'digital') - Number(b.kind === 'digital') || a.name.localeCompare(b.name));
}
