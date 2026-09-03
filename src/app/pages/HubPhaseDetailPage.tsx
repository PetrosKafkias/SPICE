import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft, BookOpenText, CheckCircle2, CircleAlert, Clock, MessageSquareText, Plus, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import LoadingState from '../components/LoadingState';
import { useI18n } from '../context/I18nContext';
import { phaseState } from '../lib/phaseState';
import { getTools } from '../data/tools';
import type { TranslationKey } from '../i18n/translations';
import { processPhase } from '../data/processFramework';
import { apiRequest, jsonBody } from '../lib/api';
import { statusKey } from '../lib/statusLabel';
import { usePermissions } from '../auth/usePermissions';

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  Hybrid: { bg: '#e8f0f7', text: '#1b3a5c' },
  Online: { bg: '#e8f5ef', text: '#2e6e45' },
  Offline: { bg: '#f0eef8', text: '#5a3f7a' },
};

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
  startDate: string | null;
  endDate: string | null;
  activities: Activity[];
}

interface Activity {
  id: number;
  initiativeId: number;
  phaseId: number;
  title: string;
  description: string;
  status: 'scheduled' | 'open' | 'closed' | 'completed';
  workflowStatus: 'draft' | 'ready_for_review' | 'needs_revision' | 'published' | 'scheduled' | 'open' | 'closed' | 'completed' | 'cancelled';
  reviewNotes: string | null;
  instructions: string;
  selectedToolIds: string[];
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  participationMode: 'online' | 'offline' | 'hybrid';
  estimatedDuration: string | null;
  requiredMaterials: string | null;
  accessibilityNotes: string | null;
  languageSupport: string | null;
  supportContact: string | null;
  contributionTypes: string[];
  votingEnabled: boolean;
  forumEnabled: boolean;
  resultsVisible: boolean;
}

interface Contribution {
  id: number;
  activityId: number;
  contributionType: string;
  content: string;
  status: string;
  municipalityResponse: string | null;
  createdAt: string;
}

interface Initiative {
  id: number;
  title: string;
  phases: Phase[];
  currentPhaseNumber: number | null;
  pilotFinalizedAt: string | null;
}

const PHASE_TEXT_KEYS: Record<number, TranslationKey> = {
  1: 'hub.phase1Text', 2: 'hub.phase2Text', 3: 'hub.phase3Text', 4: 'hub.phase4Text', 5: 'hub.phase5Text',
};

function HubPhaseManagementPage() {
  const { initiativeId, phaseNumber } = useParams();
  const { language, t, tp, formatDate } = useI18n();
  const tools = useMemo(() => getTools(language), [language]);
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [canParticipate, setCanParticipate] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canFacilitate, setCanFacilitate] = useState(false);
  const [contributions, setContributions] = useState<Record<number, Contribution[]>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [submittingActivityId, setSubmittingActivityId] = useState<number | null>(null);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityInstructions, setActivityInstructions] = useState('');
  const [activityStartDate, setActivityStartDate] = useState('');
  const [activityEndDate, setActivityEndDate] = useState('');
  const [activityLocation, setActivityLocation] = useState('');
  const [activityMode, setActivityMode] = useState<'online' | 'offline' | 'hybrid'>('offline');
  const [activityDuration, setActivityDuration] = useState('');
  const [activityMaterials, setActivityMaterials] = useState('');
  const [activityAccessibility, setActivityAccessibility] = useState('');
  const [activityLanguages, setActivityLanguages] = useState('');
  const [activitySupport, setActivitySupport] = useState('');
  const [activityToolIds, setActivityToolIds] = useState<string[]>([]);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [transitioningActivityId, setTransitioningActivityId] = useState<number | null>(null);
  const [activityReviewNotes, setActivityReviewNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
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

  const phase = initiative?.phases.find((item) => item.phaseNumber === Number(phaseNumber)) || null;
  const framework = processPhase(phase?.phaseNumber);
  const canCoordinate = canManage || canFacilitate;
  const state = phase && initiative ? phaseState(phase.phaseNumber, initiative.currentPhaseNumber, Boolean(initiative.pilotFinalizedAt)) : null;
  const stateLabelKey: TranslationKey | null = state === 'completed' ? 'hub.phaseCompleted' : state === 'current' ? 'hub.phaseCurrent' : state === 'incomplete' ? 'hub.phaseUpcoming' : null;

  const loadContributions = useCallback(async (activityId: number) => {
    try {
      const result = await apiRequest<{ contributions: Contribution[] }>(`/api/hub/activities/${activityId}/contributions`);
      setContributions((current) => ({ ...current, [activityId]: result.contributions }));
    } catch {
      setContributions((current) => ({ ...current, [activityId]: [] }));
    }
  }, []);

  useEffect(() => {
    if (!phase || (!canParticipate && !canCoordinate)) return;
    phase.activities.forEach((activity) => { void loadContributions(activity.id); });
  }, [phase, canParticipate, canCoordinate, loadContributions]);

  const submitContribution = async (activity: Activity) => {
    const content = (drafts[activity.id] || '').trim();
    if (content.length < 2) {
      toast.error(t('phaseDetail.writeFirst'));
      return;
    }
    setSubmittingActivityId(activity.id);
    try {
      await apiRequest(`/api/hub/activities/${activity.id}/contributions`, {
        method: 'POST',
        body: jsonBody({ contributionType: activity.contributionTypes[0] || 'text', content }),
      });
      setDrafts((current) => ({ ...current, [activity.id]: '' }));
      await loadContributions(activity.id);
      toast.success(t('phaseDetail.submitted'));
    } catch {
      toast.error(t('phaseDetail.submitFailed'));
    } finally {
      setSubmittingActivityId(null);
    }
  };

  const createActivity = async () => {
    if (!phase || activityTitle.trim().length < 3) {
      toast.error(t('phaseDetail.enterTitle'));
      return;
    }
    setCreatingActivity(true);
    try {
      await apiRequest(`/api/hub/initiatives/${initiativeId}/activities`, {
        method: 'POST',
        body: jsonBody({
          phaseNumber: phase.phaseNumber,
          title: activityTitle,
          description: activityDescription,
          instructions: activityInstructions,
          startDate: activityStartDate || null,
          endDate: activityEndDate || null,
          location: activityLocation,
          participationMode: activityMode,
          estimatedDuration: activityDuration,
          requiredMaterials: activityMaterials,
          accessibilityNotes: activityAccessibility,
          languageSupport: activityLanguages,
          supportContact: activitySupport,
          selectedToolIds: activityToolIds,
          toolKey: activityToolIds[0] || null,
          workflowStatus: 'draft',
          contributionTypes: ['text'],
        }),
      });
      setActivityTitle('');
      setActivityDescription('');
      setActivityInstructions('');
      setActivityStartDate('');
      setActivityEndDate('');
      setActivityLocation('');
      setActivityMode('offline');
      setActivityDuration('');
      setActivityMaterials('');
      setActivityAccessibility('');
      setActivityLanguages('');
      setActivitySupport('');
      setActivityToolIds([]);
      await load();
      toast.success(t('phaseDetail.created'));
    } catch {
      toast.error(t('phaseDetail.createFailed'));
    } finally {
      setCreatingActivity(false);
    }
  };

  const transitionActivity = async (activity: Activity, workflowStatus: Activity['workflowStatus']) => {
    const reviewNotes = (activityReviewNotes[activity.id] || '').trim();
    if (workflowStatus === 'needs_revision' && reviewNotes.length < 10) {
      toast.error(t('phaseDetail.reviewNotesRequired'));
      return;
    }
    setTransitioningActivityId(activity.id);
    try {
      await apiRequest(`/api/hub/activities/${activity.id}`, {
        method: 'PATCH',
        body: jsonBody({ workflowStatus, reviewNotes: reviewNotes || undefined }),
      });
      setActivityReviewNotes((current) => ({ ...current, [activity.id]: '' }));
      await load();
      toast.success(t('phaseDetail.activityUpdated'));
    } catch {
      toast.error(t('phaseDetail.activityUpdateFailed'));
    } finally {
      setTransitioningActivityId(null);
    }
  };

  const activityActions = (activity: Activity): Array<{ status: Activity['workflowStatus']; label: TranslationKey; primary?: boolean }> => {
    if (canManage) {
      if (activity.workflowStatus === 'draft') return [{ status: 'ready_for_review', label: 'phaseDetail.submitForReview', primary: true }];
      if (activity.workflowStatus === 'ready_for_review') return [
        { status: 'needs_revision', label: 'phaseDetail.requestRevision' },
        { status: 'published', label: 'phaseDetail.approveAndPublish', primary: true },
      ];
      if (activity.workflowStatus === 'needs_revision') return [{ status: 'draft', label: 'phaseDetail.returnToDraft' }];
      if (activity.workflowStatus === 'published') return [{ status: 'scheduled', label: 'phaseDetail.scheduleActivity', primary: true }];
      if (activity.workflowStatus === 'scheduled') return [{ status: 'open', label: 'phaseDetail.openParticipation', primary: true }];
      if (activity.workflowStatus === 'open') return [{ status: 'closed', label: 'phaseDetail.closeParticipation', primary: true }];
      if (activity.workflowStatus === 'closed') return [{ status: 'completed', label: 'phaseDetail.completeActivity', primary: true }];
      return [];
    }
    if (canFacilitate) {
      if (activity.workflowStatus === 'draft' || activity.workflowStatus === 'needs_revision') return [{ status: 'ready_for_review', label: 'phaseDetail.submitForReview', primary: true }];
      if (activity.workflowStatus === 'published') return [{ status: 'scheduled', label: 'phaseDetail.scheduleActivity', primary: true }];
      if (activity.workflowStatus === 'scheduled') return [{ status: 'open', label: 'phaseDetail.openParticipation', primary: true }];
      if (activity.workflowStatus === 'open') return [{ status: 'closed', label: 'phaseDetail.closeParticipation', primary: true }];
      if (activity.workflowStatus === 'closed') return [{ status: 'completed', label: 'phaseDetail.completeActivity', primary: true }];
    }
    return [];
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

            <section className="mt-8 max-w-4xl border-t-2 border-[#eee] pt-7" aria-labelledby="phase-activities-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="phase-activities-title" className="text-[22px] font-bold text-[#444]">{t('phaseDetail.activities')}</h2>
                  <p className="mt-1 text-sm text-[#666]">{t('phaseDetail.activitiesText')}</p>
                </div>
                <span className="bg-[#f2f2f2] px-3 py-1.5 text-xs font-bold text-[#555]">{tp(phase.activities.length, { one: 'common.activities.one', other: 'common.activities.other' })}</span>
              </div>

              {phase.activities.length === 0 && (
                <div className="mt-5 spice-card-dashed p-6 text-sm text-[#666]">
                  {canCoordinate ? t('phaseDetail.noActivitiesManager') : t('phaseDetail.noActivitiesPublic')}
                </div>
              )}

              <div className="mt-5 space-y-5">
                {phase.activities.map((activity) => {
                  const activityContributions = contributions[activity.id] || [];
                  const isOpen = activity.workflowStatus === 'open';
                  const actions = activityActions(activity);
                  return (
                    <article key={activity.id} className={`border-2 bg-white p-5 ${isOpen ? 'border-[#f68b2c]' : 'border-[#d5d6da]'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-[#444]">{activity.title}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-[#666]">{activity.description || t('phaseDetail.defaultActivity')}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold uppercase ${isOpen ? 'bg-[#fff0e1] text-[#a85f20]' : 'bg-[#eee] text-[#666]'}`}>{t(statusKey(activity.workflowStatus))}</span>
                      </div>

                      {(activity.instructions || activity.startDate || activity.location) && (
                        <div className="mt-4 border-l-4 border-[#ca7428] bg-[#fff8f2] p-4 text-[13px] leading-relaxed text-[#555]">
                          <h4 className="font-bold text-[#444]">{t('phaseDetail.publishedInstructionDetails')}</h4>
                          {activity.instructions && <p className="mt-2">{activity.instructions}</p>}
                          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                            {activity.startDate && <div><dt className="inline font-bold">{t('phaseDetail.startDate')}: </dt><dd className="inline">{formatDate(activity.startDate, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}
                            {activity.endDate && <div><dt className="inline font-bold">{t('phaseDetail.endDate')}: </dt><dd className="inline">{formatDate(activity.endDate, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}
                            {activity.location && <div><dt className="inline font-bold">{t('phaseDetail.location')}: </dt><dd className="inline">{activity.location}</dd></div>}
                            {activity.estimatedDuration && <div><dt className="inline font-bold">{t('phaseDetail.duration')}: </dt><dd className="inline">{activity.estimatedDuration}</dd></div>}
                            {activity.accessibilityNotes && <div className="sm:col-span-2"><dt className="inline font-bold">{t('phaseDetail.accessibilityNotes')}: </dt><dd className="inline">{activity.accessibilityNotes}</dd></div>}
                          </dl>
                        </div>
                      )}

                      {activity.reviewNotes && activity.workflowStatus === 'needs_revision' && (
                        <div className="mt-4 flex items-start gap-2 border-l-4 border-[#ca7428] bg-[#fff7ef] p-3 text-sm text-[#65401f]" role="status">
                          <CircleAlert size={17} className="mt-0.5 flex-none" aria-hidden="true" />
                          <p><strong>{t('phaseDetail.revisionRequested')}:</strong> {activity.reviewNotes}</p>
                        </div>
                      )}

                      {canManage && activity.workflowStatus === 'ready_for_review' && (
                        <label className="mt-4 block text-sm font-bold text-[#444]">
                          {t('phaseDetail.reviewNotes')}
                          <textarea value={activityReviewNotes[activity.id] || ''} onChange={(event) => setActivityReviewNotes((current) => ({ ...current, [activity.id]: event.target.value }))} rows={2} className="mt-2 w-full resize-y border-2 border-[#bfc0c5] bg-white p-3 font-normal focus:border-[#ca7428] focus:outline-none" placeholder={t('phaseDetail.reviewNotesPlaceholder')} />
                        </label>
                      )}

                      {actions.length > 0 && (
                        <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-[#eee] pt-4" aria-label={t('phaseDetail.activityActions')}>
                          {actions.map((action) => (
                            <button key={action.status} type="button" onClick={() => void transitionActivity(activity, action.status)} disabled={transitioningActivityId === activity.id} className={`inline-flex min-h-11 cursor-pointer items-center justify-center px-4 py-2 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${action.primary ? 'bg-[#f68b2c] text-white hover:bg-[#df771d]' : 'border-2 border-[#ca7428] bg-white text-[#a85f20] hover:bg-[#fff4e9]'}`}>
                              {t(action.label)}
                            </button>
                          ))}
                        </div>
                      )}

                      {canParticipate && isOpen && (
                        <div className="mt-5 border-t border-[#eee] pt-5">
                          <label htmlFor={`activity-${activity.id}`} className="block text-sm font-bold text-[#444]">{t('phaseDetail.contribution')} <span aria-hidden="true" className="text-[#b42318]">*</span></label>
                          <textarea id={`activity-${activity.id}`} value={drafts[activity.id] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [activity.id]: event.target.value }))} rows={4} className="mt-2 w-full resize-y border-2 border-[#bfc0c5] bg-white p-3 text-[#444] focus:border-[#ca7428] focus:outline-none" placeholder={t('phaseDetail.contributionPlaceholder')} />
                          <button type="button" onClick={() => void submitContribution(activity)} disabled={submittingActivityId === activity.id} className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-2.5 font-bold text-white disabled:cursor-wait disabled:opacity-60">
                            <Send size={16} /> {submittingActivityId === activity.id ? t('phaseDetail.submitting') : t('phaseDetail.submit')}
                          </button>
                        </div>
                      )}

                      {!isOpen && canParticipate && <p className="mt-4 text-sm font-semibold text-[#666]">{['published', 'scheduled'].includes(activity.workflowStatus) ? t('phaseDetail.activityScheduled') : t('phaseDetail.activityClosed')}</p>}

                      {activityContributions.length > 0 && (
                        <div className="mt-5 border-t border-[#eee] pt-4">
                  <h4 className="text-sm font-bold text-[#444]">{canCoordinate ? t('phaseDetail.participantContributions') : t('phaseDetail.yourSubmissions')}</h4>
                          <div className="mt-3 space-y-3">
                            {activityContributions.map((contribution) => (
                              <div key={contribution.id} className="bg-[#f7f7f7] p-3 text-sm text-[#555]">
                                <p>{contribution.content}</p>
                                <p className="mt-2 text-xs text-[#777]">{formatDate(contribution.createdAt)} · {t(statusKey(contribution.status))}</p>
                                {contribution.municipalityResponse && <p className="mt-2 border-l-2 border-[#ca7428] pl-3 font-semibold text-[#444]">{t('phaseDetail.municipalityResponse', { response: contribution.municipalityResponse })}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {canCoordinate && (
                <div className="mt-6 border-2 border-[#ca7428] bg-[#fff7ef] p-5">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-[#444]"><Plus size={18} /> {t('phaseDetail.createActivity')}</h3>
                  <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.activityTitle')} <span aria-hidden="true" className="text-[#b42318]">*</span><input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} className="mt-2 min-h-12 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.activityDescription')}<textarea value={activityDescription} onChange={(event) => setActivityDescription(event.target.value)} rows={3} className="mt-2 w-full border-2 border-[#bfc0c5] bg-white p-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    <label className="block text-sm font-bold text-[#444] md:col-span-2">{t('phaseDetail.instructions')}<textarea value={activityInstructions} onChange={(event) => setActivityInstructions(event.target.value)} rows={4} className="mt-2 w-full border-2 border-[#bfc0c5] bg-white p-3 focus:border-[#ca7428] focus:outline-none" placeholder={t('phaseDetail.instructionsPlaceholder')} /></label>
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.startDate')}<input type="datetime-local" value={activityStartDate} onChange={(event) => setActivityStartDate(event.target.value)} className="mt-2 min-h-12 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.endDate')}<input type="datetime-local" value={activityEndDate} onChange={(event) => setActivityEndDate(event.target.value)} className="mt-2 min-h-12 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.location')}<input value={activityLocation} onChange={(event) => setActivityLocation(event.target.value)} className="mt-2 min-h-12 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.mode')}<select value={activityMode} onChange={(event) => setActivityMode(event.target.value as typeof activityMode)} className="mt-2 min-h-12 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none"><option value="offline">{t('analogue.offline')}</option><option value="online">{t('analogue.online')}</option><option value="hybrid">{t('analogue.hybrid')}</option></select></label>
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.duration')}<input value={activityDuration} onChange={(event) => setActivityDuration(event.target.value)} className="mt-2 min-h-12 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.requiredMaterials')}<input value={activityMaterials} onChange={(event) => setActivityMaterials(event.target.value)} className="mt-2 min-h-12 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    <label className="block text-sm font-bold text-[#444] md:col-span-2">{t('phaseDetail.accessibilityNotes')}<textarea value={activityAccessibility} onChange={(event) => setActivityAccessibility(event.target.value)} rows={3} className="mt-2 w-full border-2 border-[#bfc0c5] bg-white p-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.languageSupport')}<input value={activityLanguages} onChange={(event) => setActivityLanguages(event.target.value)} className="mt-2 min-h-12 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    <label className="block text-sm font-bold text-[#444]">{t('phaseDetail.supportContact')}<input value={activitySupport} onChange={(event) => setActivitySupport(event.target.value)} className="mt-2 min-h-12 w-full border-2 border-[#bfc0c5] bg-white px-3 focus:border-[#ca7428] focus:outline-none" /></label>
                    {phase.enabledTools.length > 0 && <fieldset className="md:col-span-2"><legend className="text-sm font-bold text-[#444]">{t('phaseDetail.selectedTools')}</legend><div className="mt-2 flex flex-wrap gap-2">{phase.enabledTools.map((toolId) => { const tool = tools.find((item) => item.id === toolId); const checked = activityToolIds.includes(toolId); return <label key={toolId} className={`flex min-h-11 cursor-pointer items-center gap-2 border-2 px-3 text-sm font-semibold ${checked ? 'border-[#f68b2c] bg-white' : 'border-[#bfc0c5] bg-white'}`}><input type="checkbox" checked={checked} onChange={() => setActivityToolIds((current) => checked ? current.filter((item) => item !== toolId) : [...current, toolId])} />{tool?.name || toolId}</label>; })}</div></fieldset>}
                  </div>
                  <button type="button" onClick={() => void createActivity()} disabled={creatingActivity} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-2.5 font-bold text-white disabled:cursor-wait disabled:opacity-60"><Plus size={16} />{creatingActivity ? t('phaseDetail.creating') : t('phaseDetail.createDraft')}</button>
                </div>
              )}
            </section>

            {phase.enabledTools.length > 0 && (
              <div className="mt-6 max-w-3xl border-t-2 border-[#eee] pt-6">
                <h2 className="text-[16px] font-bold text-[#444]">
                  {state === 'current' ? t('phaseDetail.toolsCurrent') : state === 'completed' ? t('phaseDetail.toolsCompleted') : t('phaseDetail.toolsUpcoming')}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {phase.enabledTools.map((toolId) => {
                    const tool = tools.find((item) => item.id === toolId);
                    if (!tool) return (
                      <span key={toolId} className="inline-flex items-center gap-1.5 self-start bg-[#fff0e1] px-2.5 py-1 text-[12px] font-semibold text-[#a85f20]">{toolId}</span>
                    );
                    const mc = MODE_COLORS[tool.mode];
                    return (
                      <Link key={tool.id} to={`/tool-detail/${tool.id}`} className="flex flex-col gap-2 spice-card p-4 transition-colors hover:border-[#f68b2c]">
                        <p className="text-[14px] font-bold text-[#444]">{tool.name}</p>
                        <p className="line-clamp-2 text-[12px] leading-relaxed text-[#666]">{tool.shortDesc}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: mc.bg, color: mc.text }}>{t(`analogue.${tool.mode.toLowerCase()}` as 'analogue.online' | 'analogue.offline' | 'analogue.hybrid')}</span>
                          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-[#444]"><Clock size={10} />{tool.duration}</span>
                          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-[#444]"><Users size={10} />{tool.groupSize}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
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
