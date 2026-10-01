import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft, BookOpenText, CheckCircle2, CircleAlert, Landmark, MessageSquareText } from 'lucide-react';
import SpicePublicShell from '../components/SpicePublicShell';
import LoadingState from '../components/LoadingState';
import ObjectiveToolSelection from '../components/ObjectiveToolSelection';
import ToolImplementationCard, { type ImplementationDefaults, type ToolImplementation } from '../components/ToolImplementationCard';
import { useI18n } from '../context/I18nContext';
import { phaseState } from '../lib/phaseState';
import { getTools } from '../data/tools';
import { resolveSpiceResource } from '../data/spiceResources';
import type { TranslationKey } from '../i18n/translations';
import { processPhase } from '../data/processFramework';
import { apiRequest } from '../lib/api';
import { usePermissions } from '../auth/usePermissions';

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
}

const PHASE_TEXT_KEYS: Record<number, TranslationKey> = {
  1: 'hub.phase1Text', 2: 'hub.phase2Text', 3: 'hub.phase3Text', 4: 'hub.phase4Text', 5: 'hub.phase5Text',
};

const EMPTY_TOOL_NOTES: Record<string, string> = {};

function HubPhaseManagementPage() {
  const { initiativeId, phaseNumber } = useParams();
  const { language, t, formatDate } = useI18n();
  const tools = useMemo(() => getTools(language), [language]);
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [canParticipate, setCanParticipate] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canFacilitate, setCanFacilitate] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const refresh = useCallback(() => load(true), [load]);

  const phase = initiative?.phases.find((item) => item.phaseNumber === Number(phaseNumber)) || null;
  const framework = processPhase(phase?.phaseNumber);
  const canCoordinate = canManage || canFacilitate;
  const state = phase && initiative ? phaseState(phase.phaseNumber, initiative.currentPhaseNumber, Boolean(initiative.pilotFinalizedAt)) : null;
  const stateLabelKey: TranslationKey | null = state === 'completed' ? 'hub.phaseCompleted' : state === 'current' ? 'hub.phaseCurrent' : state === 'incomplete' ? 'hub.phaseUpcoming' : null;
  const liveActivities = (phase?.activities || []).filter((activity) => activity.workflowStatus !== 'cancelled');
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

  return (
    <SpicePublicShell variant="public">
      <div className="spice-page spice-wide-page">
        <Link to={`/hub/${initiativeId}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-bold text-[#a85f20] hover:underline">
          <ArrowLeft size={18} /> {t('phaseDetail.back', { pilot: initiative?.title || t('phaseDetail.defaultPilot') })}
        </Link>

        {loading && <div className="mt-10 spice-card"><LoadingState message={t('phaseDetail.loading')} minHeight="256px" size="lg" /></div>}
        {error && <div className="mt-8 flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 font-semibold text-red-800" role="alert"><CircleAlert size={20} />{error}</div>}
        {!loading && !error && !phase && (
          <div className="mt-8 spice-card-dashed p-8 text-center text-[#666]">{t('phaseDetail.notFound')}</div>
        )}

        {!loading && phase && (
          <header className="mt-6 spice-card p-6 md:p-8">
            <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase text-[#ca7428]">
              {t('phaseDetail.progress', { phase: phase.phaseNumber, status: stateLabelKey ? t(stateLabelKey) : '' })}
            </span>
            <h1 className="mt-3 text-[30px] font-bold leading-tight text-[#444] md:text-[38px]">{t(framework.titleKey)}</h1>
            <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-[#666]">{t(PHASE_TEXT_KEYS[phase.phaseNumber] || 'hub.phase1Text')}</p>

            <section className="mt-7 grid gap-5 border-t-2 border-[#eee] pt-7 lg:grid-cols-[0.9fr_1.1fr]" aria-labelledby="phase-framework-title">
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

            {canManage && (
              <ObjectiveToolSelection
                initiativeId={Number(initiativeId)}
                phaseNumber={phase.phaseNumber}
                enabledTools={phase.enabledTools}
                municipalityNotes={phase.municipalityNotes || ''}
                municipalityToolNotes={phase.municipalityToolNotes || EMPTY_TOOL_NOTES}
                tools={tools}
                onSaved={refresh}
              />
            )}

            {canCoordinate && (
              <section className="mt-8 border-t-2 border-[#eee] pt-7" aria-labelledby="selected-tools-title">
                <h2 id="selected-tools-title" className="text-[22px] font-bold text-[#444]">{t('phaseDetail.selectedToolsTitle', { phase: phase.phaseNumber })}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#666]">{t(canManage ? 'phaseDetail.selectedToolsManagerText' : 'phaseDetail.selectedToolsFacilitatorText')}</p>

                {!canManage && (
                  <div className="mt-5 max-w-3xl border-l-4 border-[#4e789b] bg-[#f1f7fb] p-4 text-[14px] leading-relaxed text-[#31556f]">
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide"><Landmark size={14} aria-hidden="true" />{t('phaseDetail.municipalityNotesTitle')}</p>
                    <p className="mt-1.5 whitespace-pre-line">{phase.municipalityNotes || t('phaseDetail.noMunicipalityInstructions')}</p>
                  </div>
                )}

                {phase.enabledTools.length === 0 ? (
                  <div className="mt-5 spice-card-dashed p-6 text-sm text-[#666]">{t(canManage ? 'phaseDetail.noSelectedToolsManager' : 'phaseDetail.noSelectedToolsFacilitator')}</div>
                ) : (
                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    {phase.enabledTools.map((toolId) => {
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
                          canManage={canManage}
                          canFacilitate={canFacilitate}
                          onChanged={refresh}
                        />
                      );
                    })}
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
                      canManage={canManage}
                      canFacilitate={canFacilitate}
                      onChanged={refresh}
                    />
                  ))}
                </div>
              </section>
            )}

            {canCoordinate && (
              <div className="mt-8 max-w-3xl border-t-2 border-[#eee] pt-7">
                <Link to={`/repository?pilotId=${initiativeId}&phase=${phase.phaseNumber}&phaseId=${phase.id}&returnPhase=${phase.phaseNumber}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-4 py-2 text-sm font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]"><BookOpenText size={16} /> {t('phaseDetail.uploadMaterials')}</Link>
              </div>
            )}
          </header>
        )}
      </div>
    </SpicePublicShell>
  );
}

export default function HubPhaseDetailPage() {
  const { role } = usePermissions();
  const { phaseNumber } = useParams();
  if (role === 'citizen') return <Navigate to={`/co-creation-hub?phase=${phaseNumber || 1}`} replace />;
  return <HubPhaseManagementPage />;
}
