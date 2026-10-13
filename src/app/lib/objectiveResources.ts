import { useCallback, useEffect, useState } from 'react';
import { apiRequest, jsonBody } from './api';
import type { TranslationKey } from '../i18n/translations';

// The resources a Municipality selected per Objective. "Set up my process", "Explore the toolkit
// freely" and the hub's Objective workspace read and write the same selections, under the same rules.
export const OBJECTIVE_NUMBERS = [1, 2, 3, 4, 5] as const;

export type ObjectiveSelections = Record<number, string[]>;

export interface ObjectiveResourceState {
  phaseNumber: number;
  resourceIds: string[];
  /** Resources whose activity was approved and published (or went further). */
  publishedResourceIds: string[];
  completedResourceIds: string[];
}

export interface ObjectiveResourcesSummary {
  objectives: ObjectiveResourceState[];
  complete: boolean;
}

export interface MunicipalityInitiative {
  id: number;
  version: number;
  lifecycleStatus: 'setup_required' | 'ready_to_activate' | 'active' | 'completed';
  currentPhaseNumber: number | null;
  setupStage: string | null;
  setupObjectives: string[];
  setupParticipationLevel: string | null;
  setupGroupSize: string | null;
  setupDuration: string | null;
  setupFacilitator: string | null;
  setupMode: string | null;
  setupSelectedTools: string[];
  objectiveResources?: ObjectiveResourcesSummary;
}

export function selectionsFromSummary(summary?: ObjectiveResourcesSummary): ObjectiveSelections {
  const selections: ObjectiveSelections = Object.fromEntries(OBJECTIVE_NUMBERS.map((number) => [number, []]));
  summary?.objectives.forEach((objective) => { selections[objective.phaseNumber] = objective.resourceIds; });
  return selections;
}

export function selectionsComplete(selections: ObjectiveSelections) {
  return OBJECTIVE_NUMBERS.every((number) => (selections[number] || []).length > 0);
}

// From "Approve and publish" onwards a tool's activity is public, so the tool stays in its Objective.
export const PUBLISHED_ACTIVITY_STATUSES = ['published', 'scheduled', 'open', 'closed', 'completed'];

// Why a resource cannot be added or removed. The server applies the same rules.
export type ResourceLock = 'pilotCompleted' | 'previousObjective' | 'published' | 'lastResource';

export interface ResourceEditContext {
  lifecycleStatus: string;
  currentPhaseNumber: number | null;
  /** Published resources of each Objective. */
  published: Record<number, string[]>;
}

export function editContextFor(initiative: Pick<MunicipalityInitiative, 'lifecycleStatus' | 'currentPhaseNumber' | 'objectiveResources'> | null): ResourceEditContext {
  return {
    lifecycleStatus: initiative?.lifecycleStatus || 'setup_required',
    currentPhaseNumber: initiative?.currentPhaseNumber ?? null,
    published: Object.fromEntries((initiative?.objectiveResources?.objectives || []).map((objective) => [objective.phaseNumber, objective.publishedResourceIds])),
  };
}

/** Whether the Objective's resources can change at all: completed Objectives and completed pilots are read-only. */
export function objectiveLock(context: ResourceEditContext, phaseNumber: number): ResourceLock | null {
  if (context.lifecycleStatus === 'completed') return 'pilotCompleted';
  if (context.lifecycleStatus === 'active' && context.currentPhaseNumber != null && phaseNumber < context.currentPhaseNumber) return 'previousObjective';
  return null;
}

/** Whether a selected resource can be removed, given the Objective's selection after any pending changes. */
export function removalLock(context: ResourceEditContext, phaseNumber: number, resourceId: string, selectedIds: string[]): ResourceLock | null {
  const locked = objectiveLock(context, phaseNumber);
  if (locked) return locked;
  if (context.lifecycleStatus !== 'active') return null;
  if (phaseNumber === context.currentPhaseNumber && (context.published[phaseNumber] || []).includes(resourceId)) return 'published';
  if (selectedIds.length <= 1) return 'lastResource';
  return null;
}

export const RESOURCE_LOCK_KEYS: Record<ResourceLock, TranslationKey> = {
  pilotCompleted: 'lock.pilotCompleted',
  previousObjective: 'lock.previousObjective',
  published: 'lock.published',
  lastResource: 'lock.lastResource',
};

/** The explanation shown on a resource that cannot be toggled, or null when it can. */
export function resourceLockMessage(
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
  context: ResourceEditContext,
  phaseNumber: number,
  resourceId: string,
  selectedIds: string[],
) {
  const lock = selectedIds.includes(resourceId) ? removalLock(context, phaseNumber, resourceId, selectedIds) : objectiveLock(context, phaseNumber);
  return lock ? t(RESOURCE_LOCK_KEYS[lock], { number: phaseNumber }) : null;
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

/** Saves every Objective whose selection changed, then keeps the setup's tool list in step with them. */
export async function saveObjectiveSelections(initiative: MunicipalityInitiative, previous: ObjectiveSelections, next: ObjectiveSelections) {
  for (const number of OBJECTIVE_NUMBERS) {
    if (sameIds(previous[number] || [], next[number] || [])) continue;
    await apiRequest(`/api/hub/initiatives/${initiative.id}/phases/${number}`, {
      method: 'PATCH', body: jsonBody({ enabledTools: next[number] || [] }),
    });
  }
  const allIds = [...new Set(OBJECTIVE_NUMBERS.flatMap((number) => next[number] || []))];
  if (sameIds(allIds, initiative.setupSelectedTools || [])) return;
  // No version check: saving the Objectives above may itself have activated the pilot and changed its version.
  await apiRequest(`/api/hub/initiatives/${initiative.id}`, {
    method: 'PATCH', body: jsonBody({ setupSelectedTools: allIds }),
  });
}

/** Loads the Municipality's pilot and its per-Objective selections. `enabled` false skips the request (e.g. guests). */
export function useObjectiveResources(enabled: boolean) {
  const [initiative, setInitiative] = useState<MunicipalityInitiative | null>(null);
  const [selections, setSelections] = useState<ObjectiveSelections>(() => selectionsFromSummary());
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    const { initiatives } = await apiRequest<{ initiatives: MunicipalityInitiative[] }>('/api/hub/initiatives');
    const current = initiatives[0] || null;
    setInitiative(current);
    setSelections(selectionsFromSummary(current?.objectiveResources));
    return current;
  }, []);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    load()
      .catch((caught) => { if (active) setError(caught); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled, load]);

  /**
   * Saves the new selections for every Objective and reloads the pilot, which becomes active once every
   * Objective has a resource. A rejected change still reloads what was saved, then rethrows.
   */
  const save = useCallback(async (next: ObjectiveSelections) => {
    if (!initiative) return;
    try {
      await saveObjectiveSelections(initiative, selections, next);
    } finally {
      await load();
    }
  }, [initiative, load, selections]);

  return { initiative, selections, loading, error, save, reload: load, editContext: editContextFor(initiative) };
}
