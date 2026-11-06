import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { BookOpenText, CheckCircle2, CircleAlert, Landmark, MessageSquareText } from 'lucide-react';
import LoadingState from './LoadingState';
import ObjectiveTabs, { type ObjectiveTab } from './ObjectiveTabs';
import ObjectiveEvents from './ObjectiveEvents';
import ToolImplementationCard, { type ImplementationDefaults, type ToolImplementation } from './ToolImplementationCard';
import { useI18n } from '../context/I18nContext';
import { phaseState } from '../lib/phaseState';
import { getTools } from '../data/tools';
import { recommendedResourceIds, resolveSpiceResource } from '../data/spiceResources';
import type { TranslationKey } from '../i18n/translations';
import { processPhase } from '../data/processFramework';
import { apiRequest, jsonBody } from '../lib/api';
import { localizedApiError } from '../lib/localizedApiError';
import { toast } from 'sonner';
import type { HubEvent } from '../lib/events';

interface Phase {
  id: number;
  phaseNumber: number;
  title: string;
  description: string;
  status: 'not_started' | 'scheduled' | 'open' | 'closed' | 'completed';
  instructions: string;
  enabledTools: string[];
  resultsVisible: boolean;
  eventTypes: string[];
  expectedOutputs: string[];
  completionSummary: string | null;
  startDate: string | null;
  endDate: string | null;
  activities: ToolImplementation[];
  events: HubEvent[];
  municipalityNotes?: string;
  municipalityToolNotes?: Record<string, string>;
}

interface Initiative {
  id: number;
  title: string;
  location: string | null;
  setupGroupSize: string | null;
  setupDuration: string | null;
  phases: Phase[];
  currentPhaseNumber: number | null;
  pilotFinalizedAt: string | null;
  lifecycleStatus: string;
}

const PHASE_TEXT_KEYS: Record<number, TranslationKey> = {
  1: 'hub.phase1Text', 2: 'hub.phase2Text', 3: 'hub.phase3Text', 4: 'hub.phase4Text', 5: 'hub.phase5Text',
};


interface Props {
  initiativeId: number;
  phaseNumber: number;
  /** Called after a save so the surrounding hub can refresh its roadmap and readiness. */
  onChanged?: () => void;
  /** The Municipality's facilitator team, shown in its own tab. */
  renderTeam?: () => ReactNode;
  teamCount?: number;
}

/** Staff workspace of one objective: its events, activities, team and methodology, each in a tab. */
export default function ObjectiveWorkspace({ initiativeId, phaseNumber, onChanged, renderTeam, teamCount }: Props) {
  const { language, t, formatDate } = useI18n();
  const tools = useMemo(() => getTools(language), [language]);
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [canParticipate, setCanParticipate] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canFacilitate, setCanFacilitate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ObjectiveTab>('events');
  const [objectiveNotes, setObjectiveNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{ initiative: Initiative; access: { canParticipate: boolean; canManage: boolean; canFacilitate: boolean } }>(`/api/hub/initiatives/${initiativeId}`);
      setInitiative(result.initiative);
      setCanParticipate(result.access.canParticipate);
      setCanManage(result.access.canManage);
      setCanFacilitate(result.access.canFacilitate);
    } catch {
      setError(t('phaseDetail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [initiativeId, t]);

  useEffect(() => { void load(); }, [load]);
  // Refresh after saving without the full-page loading state, so open forms and scroll position survive.
  const refresh = useCallback(async () => {
    await load(true);
    onChanged?.();
  }, [load, onChanged]);

  const phase = initiative?.phases.find((item) => item.phaseNumber === Number(phaseNumber)) || null;
  const framework = processPhase(phase?.phaseNumber);
  const canCoordinate = canManage || canFacilitate;
  const state = phase && initiative ? phaseState(phase.phaseNumber, initiative.currentPhaseNumber, Boolean(initiative.pilotFinalizedAt)) : null;
  const stateLabelKey: TranslationKey | null = state === 'completed' ? 'hub.phaseCompleted' : state === 'current' ? 'hub.phaseCurrent' : state === 'incomplete' ? 'hub.phaseUpcoming' : null;
  const liveActivities = (phase?.activities || []).filter((activity) => activity.workflowStatus !== 'cancelled');
  const savedObjectiveNotes = phase?.municipalityNotes || '';
  useEffect(() => { setObjectiveNotes(savedObjectiveNotes); }, [savedObjectiveNotes]);

  // The Municipality configures an Objective through its events: choosing a resource for an event
  // adds it to the Objective. The dialog offers the Objective's resources and the methodology's
  // recommended ones for it.
  const eventResources = phase
    ? [...new Set([...phase.enabledTools, ...recommendedResourceIds(phase.phaseNumber, tools)])]
      .map((toolId) => ({ id: toolId, name: resolveSpiceResource(toolId, tools, t)?.name || toolId }))
    : [];

  const patchPhase = async (body: Record<string, unknown>, successKey: TranslationKey) => {
    if (!phase) return false;
    try {
      await apiRequest(`/api/hub/initiatives/${initiativeId}/phases/${phase.phaseNumber}`, { method: 'PATCH', body: jsonBody(body) });
      await refresh();
      toast.success(t(successKey));
      return true;
    } catch (caught) {
      toast.error(localizedApiError(t, caught));
      return false;
    }
  };
  const saveObjectiveNotes = async () => {
    setSavingNotes(true);
    await patchPhase({ municipalityNotes: objectiveNotes }, 'objectiveTabs.instructionsSaved');
    setSavingNotes(false);
  };
  const saveToolNote = (toolId: string) => (note: string) => patchPhase(
    { municipalityToolNotes: { ...(phase?.municipalityToolNotes || {}), [toolId]: note } },
    'objectiveTabs.instructionsSaved',
  );
  const removeFromObjective = (toolId: string) => () => patchPhase(
    { enabledTools: (phase?.enabledTools || []).filter((id) => id !== toolId) },
    'objectiveTabs.resourceRemoved',
  );
  const otherActivities = liveActivities.filter((activity) => !activity.toolKey || !phase?.enabledTools.includes(activity.toolKey));

  // A new implementation starts from what the platform already knows: the resource's catalogue
  // entry, the initiative's setup answers and the logistics of its latest implementation.
  const defaultsFor = (toolId: string): ImplementationDefaults => {
    const tool = tools.find((item) => item.id === toolId);
    const resource = resolveSpiceResource(toolId, tools, t);
    const latest = (initiative?.phases || []).flatMap((item) => item.activities)
      .filter((activity) => activity.workflowStatus !== 'cancelled')
      .sort((a, b) => b.id - a.id)[0];
    const mode = tool?.mode.toLowerCase();
    return {
      instructions: tool?.shortDesc || resource?.description || '',
      participationMode: mode === 'online' || mode === 'hybrid' || mode === 'offline' ? mode : resource?.kind === 'digital' ? 'online' : 'offline',
      estimatedDuration: tool?.duration || initiative?.setupDuration || '',
      requiredMaterials: tool?.suppliesRequired || '',
      expectedParticipants: initiative?.setupGroupSize || '',
      location: latest?.location || initiative?.location || '',
      accessibilityNotes: latest?.accessibilityNotes || '',
      languageSupport: latest?.languageSupport || '',
      supportContact: latest?.supportContact || '',
    };
  };

  // Activities not in an event yet come first in the Activities tab: they still need an event.
  const assignedEventIds = new Set((phase?.events || []).filter((event) => event.status !== 'cancelled').map((event) => event.id));
  const toolInEvent = (toolId: string) => liveActivities.some((activity) => activity.toolKey === toolId && (activity.eventIds || []).some((eventId) => assignedEventIds.has(eventId)));
  const orderedTools = [
    ...(phase?.enabledTools || []).filter((toolId) => !toolInEvent(toolId)),
    ...(phase?.enabledTools || []).filter(toolInEvent),
  ];
  const tabs: ObjectiveTab[] = ['events', 'activities', ...(renderTeam ? ['team' as const] : []), 'about'];
  const openActivity = (toolId: string) => {
    setTab('activities');
    // Wait for the Activities tab to render, then bring the activity's card into view.
    window.setTimeout(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(`objective-activity-${toolId}`)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, 60);
  };
  const renderToolCard = (toolId: string, insideEvent: boolean) => {
    if (!phase) return null;
    const resource = resolveSpiceResource(toolId, tools, t);
    return (
      <ToolImplementationCard
        key={toolId}
        initiativeId={Number(initiativeId)}
        phaseNumber={phase.phaseNumber}
        toolKey={toolId}
        title={resource?.name || toolId}
        kindLabel={resource ? t(resource.kind === 'digital' ? 'phaseDetail.kindDigital' : 'phaseDetail.kindAnalog') : undefined}
        municipalityNote={phase.municipalityToolNotes?.[toolId]}
        implementation={liveActivities.find((activity) => activity.toolKey === toolId)}
        defaults={defaultsFor(toolId)}
        events={phase.events || []}
        insideEvent={insideEvent}
        onSaveMunicipalityNote={canManage ? saveToolNote(toolId) : undefined}
        onRemoveFromObjective={canManage && !insideEvent ? removeFromObjective(toolId) : undefined}
        canManage={canManage}
        canFacilitate={canFacilitate}
        onChanged={refresh}
      />
    );
  };

  return (
    <>
      <div id="objective-workspace" className="scroll-mt-24">

        {loading && <div className="mt-10 spice-card"><LoadingState message={t('phaseDetail.loading')} minHeight="256px" size="lg" /></div>}
        {error && <div className="mt-8 flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 font-semibold text-red-800" role="alert"><CircleAlert size={20} />{error}</div>}
        {!loading && !error && !phase && (
          <div className="mt-8 spice-card-dashed p-8 text-center text-[#666]">{t('phaseDetail.notFound')}</div>
        )}

        {!loading && phase && (
          <section className="mt-8 spice-card p-6 md:p-8" aria-labelledby="objective-workspace-title">
            <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase text-[#ca7428]">
              {t('phaseDetail.progress', { phase: phase.phaseNumber, status: stateLabelKey ? t(stateLabelKey) : '' })}
            </span>
            <h2 id="objective-workspace-title" className="mt-3 text-[28px] font-bold leading-tight text-[#444] md:text-[34px]">{t(framework.titleKey)}</h2>

            <ObjectiveTabs
              idPrefix="objective"
              tabs={tabs}
              active={tab}
              onChange={setTab}
              counts={{ events: (phase.events || []).filter((event) => event.status !== 'cancelled').length, activities: phase.enabledTools.length, team: teamCount }}
            />

            {tab === 'events' && canCoordinate && (
              <div role="tabpanel" id="objective-panel-events" aria-labelledby="objective-tab-events">
                <ObjectiveEvents
                  initiativeId={Number(initiativeId)}
                  phaseNumber={phase.phaseNumber}
                  events={phase.events || []}
                  activities={phase.activities}
                  resources={eventResources}
                  canManage={canManage}
                  onOpenActivity={openActivity}
                  onChanged={refresh}
                />
              </div>
            )}

            {tab === 'team' && renderTeam && (
              <div role="tabpanel" id="objective-panel-team" aria-labelledby="objective-tab-team">{renderTeam()}</div>
            )}

            {tab === 'activities' && (
              <div role="tabpanel" id="objective-panel-activities" aria-labelledby="objective-tab-activities">
              {canCoordinate && (
                <section className="mt-6" aria-labelledby="selected-tools-title">
                  <h2 id="selected-tools-title" className="text-[20px] font-bold text-[#444]">{t('phaseDetail.selectedToolsTitle', { phase: phase.phaseNumber })}</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#666]">{t('objectiveTabs.activitiesIntro')}</p>

                  {phase.enabledTools.length === 0 ? (
                    <div className="mt-5 spice-card-dashed p-6 text-sm text-[#666]">{t(canManage ? 'phaseDetail.noSelectedToolsManager' : 'phaseDetail.noSelectedToolsFacilitator')}</div>
                  ) : (
                    <div className="mt-5 grid gap-5 xl:grid-cols-2">
                      {orderedTools.map((toolId) => <div key={toolId} id={`objective-activity-${toolId}`} className="flex scroll-mt-24">{renderToolCard(toolId, false)}</div>)}
                    </div>
                  )}
                </section>
              )}

              {canCoordinate && otherActivities.length > 0 && (
                <section className="mt-8 border-t-2 border-[#eee] pt-7" aria-labelledby="other-activities-title">
                  <h2 id="other-activities-title" className="text-[18px] font-bold text-[#444]">{t('phaseDetail.otherActivitiesTitle')}</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#666]">{t('phaseDetail.otherActivitiesText')}</p>
                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    {otherActivities.map((activity) => (
                      <ToolImplementationCard
                        key={activity.id}
                        initiativeId={Number(initiativeId)}
                        phaseNumber={phase.phaseNumber}
                        toolKey={null}
                        title={activity.title}
                        implementation={activity}
                        events={phase.events || []}
                        canManage={canManage}
                        canFacilitate={canFacilitate}
                        onChanged={refresh}
                      />
                    ))}
                  </div>
                </section>
              )}

              </div>
            )}

            {tab === 'about' && (
              <div role="tabpanel" id="objective-panel-about" aria-labelledby="objective-tab-about">
              <p className="mt-6 max-w-3xl text-[16px] leading-relaxed text-[#555]">{t(PHASE_TEXT_KEYS[phase.phaseNumber] || 'hub.phase1Text')}</p>
              <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]" aria-labelledby="phase-framework-title">
                <div className="border-l-4 border-[#ca7428] bg-[#fff7ef] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#a85f20]">{t('phaseDetail.guidingQuestion')}</p>
                  <h2 id="phase-framework-title" className="mt-2 text-[20px] font-bold leading-snug text-[#444]">{t(framework.questionKey)}</h2>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#666]">{t(framework.summaryKey)}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="border-2 border-[#d7d8dc] bg-white p-5">
                    <h3 className="text-[15px] font-bold text-[#444]">{t('phaseDetail.eventTypes')}</h3>
                    <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[#666]">
                      {framework.eventTypeKeys.map((eventTypeKey) => <li key={eventTypeKey} className="border-l-2 border-[#efc79f] pl-3">{t(eventTypeKey)}</li>)}
                    </ul>
                  </div>
                  <div className="border-2 border-[#d7d8dc] bg-white p-5">
                    <h3 className="text-[15px] font-bold text-[#444]">{t('phaseDetail.outputs')}</h3>
                    <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[#666]">
                      <li className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 flex-none text-[#58723d]" aria-hidden="true" />{t(framework.expectedOutcomeKey)}</li>
                    </ul>
                  </div>
                </div>
              </section>

              {(phase.startDate || phase.endDate) && (
                <p className="mt-4 text-sm font-semibold text-[#59713d]">
                  {phase.startDate ? formatDate(phase.startDate, { dateStyle: 'medium' }) : '—'}
                  {' – '}
                  {phase.endDate ? formatDate(phase.endDate, { dateStyle: 'medium' }) : '—'}
                </p>
              )}

              <div className="mt-6 max-w-3xl border-t-2 border-[#eee] pt-6">
                {state === 'current' && (
                  <>
                    <h2 className="text-[16px] font-bold text-[#444]">{t('phaseDetail.doNow')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#666]">{phase.instructions || t('phaseDetail.defaultInstructions')}</p>
                    {canParticipate ? (
                      <Link to={`/forum-voting?initiative=${initiativeId}`} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-2.5 font-bold text-white">{t('phaseDetail.joinDiscussion')} <MessageSquareText size={16} /></Link>
                    ) : (
                      <p className="mt-4 text-sm font-semibold text-[#8f4d18]">{t('phaseDetail.signIn')}</p>
                    )}
                  </>
                )}
                {state === 'completed' && (
                  <>
                    <h2 className="text-[16px] font-bold text-[#444]">{t('phaseDetail.publishedOutcomes')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#666]">
                      {phase.resultsVisible
                        ? t('phaseDetail.resultsAvailable')
                        : t('phaseDetail.resultsPending')}
                    </p>
                    {phase.resultsVisible && phase.completionSummary && (
                      <div className="mt-4 border-l-4 border-[#58723d] bg-[#f4f8ef] p-4 text-sm leading-relaxed text-[#444]">
                        <p className="font-bold">{t('phaseDetail.reportTitle')}</p>
                        <p className="mt-2 whitespace-pre-line">{phase.completionSummary}</p>
                      </div>
                    )}
                    <p className="mt-4 text-sm font-semibold text-[#8f4d18]">{t('phaseDetail.closed')}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {phase.resultsVisible && (
                        <Link to="/repository" className="inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-2.5 font-bold text-white"><BookOpenText size={16} /> {t('phaseDetail.viewRepository')}</Link>
                      )}
                      <Link to={`/forum-voting?initiative=${initiativeId}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-5 py-2.5 font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]"><MessageSquareText size={16} /> {t('phaseDetail.reviewDiscussion')}</Link>
                    </div>
                  </>
                )}
                {state === 'incomplete' && (
                  <>
                    <h2 className="text-[16px] font-bold text-[#444]">{t('phaseDetail.next')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#666]">{t('phaseDetail.upcomingText')}</p>
                  </>
                )}
              </div>


                {canCoordinate && (
                  <div className="mt-8 max-w-3xl border-t-2 border-[#eee] pt-7">
                    <div className="rounded-lg border-l-4 border-[#4e789b] bg-[#f1f7fb] p-4 text-[14px] leading-relaxed text-[#31556f]">
                      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide"><Landmark size={14} aria-hidden="true" />{t(canManage ? 'phaseDetail.municipalityNotesLabel' : 'phaseDetail.municipalityNotesTitle')}</p>
                      {canManage ? (
                        <>
                          <textarea
                            id="objective-municipality-notes"
                            value={objectiveNotes}
                            onChange={(event) => setObjectiveNotes(event.target.value)}
                            rows={3}
                            className="mt-2 w-full resize-y rounded-md border-2 border-[#c9d8e4] bg-white p-3 text-[14px] text-[#444] focus:border-[#4e789b] focus:outline-none"
                            placeholder={t('phaseDetail.municipalityNotesPlaceholder')}
                          />
                          <button type="button" onClick={() => void saveObjectiveNotes()} disabled={savingNotes || objectiveNotes.trim() === (phase.municipalityNotes || '').trim()} className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-[#f68b2c] px-4 text-[13px] font-bold text-white hover:bg-[#df771d] disabled:cursor-not-allowed disabled:opacity-50">{t('objectiveTabs.saveInstructions')}</button>
                        </>
                      ) : (
                        <p className="mt-1.5 whitespace-pre-line">{phase.municipalityNotes || t('phaseDetail.noMunicipalityInstructions')}</p>
                      )}
                    </div>
                  </div>
                )}

              {canCoordinate && (
                <div className="mt-8 flex max-w-3xl flex-wrap gap-3 border-t-2 border-[#eee] pt-7">
                  <Link to={`/forum-voting?initiative=${initiativeId}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-4 py-2 text-sm font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]"><MessageSquareText size={16} /> {t(canManage ? 'phaseDetail.reviewDiscussion' : 'hub.prepareDraftProposal')}</Link>
                  <Link to={`/repository?pilotId=${initiativeId}&phase=${phase.phaseNumber}&phaseId=${phase.id}&returnPhase=${phase.phaseNumber}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-4 py-2 text-sm font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]"><BookOpenText size={16} /> {t('phaseDetail.uploadMaterials')}</Link>
                </div>
              )}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
