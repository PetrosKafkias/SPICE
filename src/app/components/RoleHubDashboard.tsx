import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Accessibility, Activity, ArrowRight, BookOpenText, Building2, CalendarDays, CheckCircle2,
  Circle, CircleAlert, CircleDot, Clock, FileDown, FilePlus2, FileText, GitCompareArrows,
  Layers3, ListChecks, LockKeyhole, MapPin, MapPinned, MessageSquareText, Minus,
  PencilLine, Plus, Send, Users, Vote, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../auth/usePermissions';
import { normalizeRole, roleKey } from '../auth/permissions';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { apiRequest, jsonBody } from '../lib/api';
import { pilotSlug } from '../lib/pilot';
import { statusKey } from '../lib/statusLabel';
import { phaseState } from '../lib/phaseState';
import { getTools, type Tool } from '../data/tools';
import PhaseChangeDialog from './PhaseChangeDialog';
import type { WorkflowSummary } from './WorkflowNextActionPanel';
import type { TranslationKey } from '../i18n/translations';

interface Initiative {
  id: number;
  title: string;
  description: string;
  location: string;
  pilotSlug: string;
  status: 'draft' | 'scheduled' | 'published' | 'active' | 'paused' | 'completed' | 'archived';
  lifecycleStatus: 'setup_required' | 'ready_to_activate' | 'active' | 'completed';
  visibility: 'public' | 'private' | 'invitation_only';
  updatedAt: string;
}

interface Phase {
  id: number;
  phaseNumber: number;
  title: string;
  description: string;
  status: 'not_started' | 'scheduled' | 'open' | 'closed' | 'completed';
  instructions: string;
  enabledTools: string[];
  resultsVisible: boolean;
  completionSummary: string | null;
  completedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  activities: HubActivity[];
  results: PhaseResult[];
  myContributions: CitizenContribution[];
}

interface HubActivity {
  id: number;
  title: string;
  description: string;
  status: 'scheduled' | 'open' | 'closed' | 'completed';
  workflowStatus: 'draft' | 'ready_for_review' | 'needs_revision' | 'published' | 'scheduled' | 'open' | 'closed' | 'completed' | 'cancelled';
  activityType: string;
  selectedToolIds: string[];
  instructions: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  participationMode: 'online' | 'offline' | 'hybrid';
  estimatedDuration: string | null;
  requiredMaterials: string | null;
  eligibility: string | null;
  submissionType: string | null;
  submissionDeadline: string | null;
  accessibilityNotes: string | null;
  languageSupport: string | null;
  supportContact: string | null;
  votingEnabled: boolean;
  forumEnabled: boolean;
}

interface PhaseResult {
  id: number;
  title: string;
  description: string;
  documentType: string;
  fileFormat: string;
  toolKey: string | null;
  resultType: string | null;
  relatedActivityTitle: string | null;
  publishedAt: string | null;
  publishedByName: string | null;
}

interface CitizenContribution {
  id: number;
  activityId: number;
  contributionType: string;
  content: string;
  status: string;
  municipalityResponse: string | null;
  createdAt: string;
}

interface InitiativeDetail {
  id: number;
  version: number;
  status: Initiative['status'];
  location: string;
  startDate: string | null;
  endDate: string | null;
  phases: Phase[];
  setupCompletedAt: string | null;
  setupSelectedTools: string[];
  lifecycleStatus: Initiative['lifecycleStatus'];
  activatedAt: string | null;
  setupUpdatedAt: string | null;
  currentPhaseNumber: number | null;
  pilotFinalizedAt: string | null;
  facilitator: { id: number; fullName: string; email: string } | null;
}

interface FacilitatorInitiative extends Initiative {
  phases: Phase[];
  currentPhaseNumber: number | null;
}

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  Hybrid: { bg: '#e8f0f7', text: '#1b3a5c' },
  Online: { bg: '#e8f5ef', text: '#2e6e45' },
  Offline: { bg: '#f0eef8', text: '#5a3f7a' },
};

const STATUS_STYLES: Record<Initiative['status'], string> = {
  draft: 'bg-[#eee] text-[#555]',
  scheduled: 'bg-[#fff0e1] text-[#9b571d]',
  published: 'bg-[#e8f0f7] text-[#254f72]',
  active: 'bg-[#e7f2df] text-[#47662f]',
  paused: 'bg-[#fff5d9] text-[#7a5b00]',
  completed: 'bg-[#e9e4f3] text-[#55436e]',
  archived: 'bg-[#eee] text-[#666]',
};

const LIFECYCLE_STYLES: Record<Initiative['lifecycleStatus'], string> = {
  setup_required: 'bg-[#fff0e1] text-[#8f501b]',
  ready_to_activate: 'bg-[#e8f0f7] text-[#254f72]',
  active: 'bg-[#e7f2df] text-[#47662f]',
  completed: 'bg-[#e9e4f3] text-[#55436e]',
};

const PHASE_TEXT_KEYS: Record<number, TranslationKey> = {
  1: 'hub.phase1Text', 2: 'hub.phase2Text', 3: 'hub.phase3Text', 4: 'hub.phase4Text', 5: 'hub.phase5Text',
};

const RESULT_TYPE_KEYS: Record<string, TranslationKey> = {
  participation_summary: 'hub.citizen.resultType.participationSummary',
  citizen_contribution_summary: 'hub.citizen.resultType.contributionSummary',
  tool_output: 'hub.citizen.resultType.toolOutput',
  municipality_decision: 'hub.citizen.resultType.municipalityDecision',
};

const ACTIVITY_TYPE_KEYS: Record<string, TranslationKey> = {
  workshop: 'hub.citizen.activityType.workshop',
  interview: 'hub.citizen.activityType.interview',
  co_design_workshop: 'hub.citizen.activityType.coDesignWorkshop',
  participation: 'hub.citizen.activityType.participation',
};

const ROADMAP_PHASE_NUMBERS = [1, 2, 3, 4, 5] as const;

function completeRoadmapPhases(phases: Phase[]): Phase[] {
  const phasesByNumber = new Map(phases.map((phase) => [phase.phaseNumber, phase]));

  return ROADMAP_PHASE_NUMBERS.map((phaseNumber) => phasesByNumber.get(phaseNumber) ?? {
    id: -phaseNumber,
    phaseNumber,
    title: '',
    description: '',
    status: 'not_started',
    instructions: '',
    enabledTools: [],
    resultsVisible: false,
    completionSummary: null,
    completedAt: null,
    startDate: null,
    endDate: null,
    activities: [],
    results: [],
    myContributions: [],
  });
}

function ToolTile({ tool, enabled, canManage, canParticipate, onAdd, onRemove }: {
  tool: Tool;
  enabled: boolean;
  canManage: boolean;
  canParticipate: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const mc = MODE_COLORS[tool.mode];
  return (
    <div className="flex flex-col gap-3 border-2 bg-white p-4" style={{ borderColor: enabled ? '#f68b2c' : '#d7d8dc' }}>
      <p className="text-[14px] font-bold text-[#444]">{tool.name}</p>
      <p className="flex-1 text-[12px] leading-relaxed text-[#666]">{tool.shortDesc}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: mc.bg, color: mc.text }}>{t(`analogue.${tool.mode.toLowerCase()}` as TranslationKey)}</span>
        <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-[#444]"><Clock size={10} />{tool.duration}</span>
        <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-[#444]"><Users size={10} />{tool.groupSize}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/tool-detail/${tool.id}`} className="cursor-pointer border border-[#bfc0c5] px-3 py-1.5 text-[12px] font-semibold text-[#444] hover:bg-[#f7f7f7]">{t('common.moreInformation')}</Link>
        {canManage && (
          enabled
            ? <button type="button" onClick={onRemove} className="flex cursor-pointer items-center gap-1 border-2 border-[#a86622] px-3 py-1.5 text-[12px] font-bold text-[#a86622] hover:bg-[#fff3e8]"><Minus size={12} /> {t('hub.removeFromPhase')}</button>
            : <button type="button" onClick={onAdd} className="flex cursor-pointer items-center gap-1 bg-[#f68b2c] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#e07a20]"><Plus size={12} /> {t('hub.addToPhase')}</button>
        )}
        {!canManage && enabled && canParticipate && (
          <Link to="/forum-voting" className="cursor-pointer bg-[#f68b2c] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#e07a20]">{t('hub.participate')}</Link>
        )}
      </div>
    </div>
  );
}

export default function RoleHubDashboard() {
  const { role, can } = usePermissions();
  const { user } = useAuth();
  const { formatDate, language, t } = useI18n();
  const tools = useMemo(() => getTools(language), [language]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const previewingAsCitizen = searchParams.get('preview') === 'citizen' && role !== 'citizen';
  const citizenView = role === 'citizen' || previewingAsCitizen;
  const canManageInitiative = can('hub:configure-tools');
  const canManageLifecycle = can('hub:manage-phases');

  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [detail, setDetail] = useState<InitiativeDetail | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowSummary | null>(null);
  const [canParticipate, setCanParticipate] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPhaseNumber, setSelectedPhaseNumber] = useState<number | null>(null);
  const [pendingPhaseNumber, setPendingPhaseNumber] = useState<number | null>(null);
  const [savingPhaseChange, setSavingPhaseChange] = useState(false);
  const [savingTool, setSavingTool] = useState(false);
  const [facilitatorEmail, setFacilitatorEmail] = useState('');
  const [savingFacilitator, setSavingFacilitator] = useState(false);
  const [facilitatorInitiatives, setFacilitatorInitiatives] = useState<FacilitatorInitiative[]>([]);
  const [facilitatorLoading, setFacilitatorLoading] = useState(false);
  const [activationConfirming, setActivationConfirming] = useState(false);
  const [activating, setActivating] = useState(false);
  const [contributionDrafts, setContributionDrafts] = useState<Record<number, string>>({});
  const [submittingActivityId, setSubmittingActivityId] = useState<number | null>(null);

  const citizenPilotSlug = role === 'citizen' && user ? pilotSlug(user.pilotSite) : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{ initiatives: Initiative[] }>('/api/hub/initiatives');
      setInitiatives(result.initiatives);
    } catch {
      setError(t('hub.errorLoadInitiatives'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const displayedInitiatives = citizenPilotSlug
    ? initiatives.filter((initiative) => initiative.pilotSlug === citizenPilotSlug)
    : initiatives;

  const municipalityInitiative = role === 'municipality' ? initiatives[0] || null : null;
  const citizenInitiative = citizenView && displayedInitiatives.length === 1 ? displayedInitiatives[0] : null;
  const facilitatorInitiative = role === 'facilitator' ? facilitatorInitiatives[0] || null : null;
  const activeInitiative = municipalityInitiative || citizenInitiative || facilitatorInitiative;

  const loadDetail = useCallback(async (initiativeId: number) => {
    setDetailLoading(true);
    try {
      const previewQuery = previewingAsCitizen ? '?view=citizen' : '';
      const result = await apiRequest<{ initiative: InitiativeDetail; workflow: WorkflowSummary; access: { canManage: boolean; canParticipate: boolean } }>(`/api/hub/initiatives/${initiativeId}${previewQuery}`);
      setDetail(result.initiative);
      setWorkflow(result.workflow);
      setCanParticipate(result.access.canParticipate);
      const requestedPhase = Number(searchParams.get('phase') || 0);
      setSelectedPhaseNumber((current) => current ?? (requestedPhase >= 1 && requestedPhase <= 5 ? requestedPhase : result.initiative.currentPhaseNumber ?? 1));
    } catch {
      setError(t('hub.errorLoadRoadmap'));
    } finally {
      setDetailLoading(false);
    }
  }, [previewingAsCitizen, searchParams, t]);

  useEffect(() => {
    if (activeInitiative) void loadDetail(activeInitiative.id);
  }, [activeInitiative, loadDetail]);

  useEffect(() => {
    if (role !== 'facilitator') return;
    setFacilitatorLoading(true);
    apiRequest<{ initiatives: FacilitatorInitiative[] }>('/api/hub/facilitator-assignments')
      .then((result) => setFacilitatorInitiatives(result.initiatives))
      .catch(() => setError(t('hub.errorLoadFacilitatorAssignments')))
      .finally(() => setFacilitatorLoading(false));
  }, [role, t]);

  const roadmapPhases = useMemo(() => completeRoadmapPhases(detail?.phases ?? []), [detail?.phases]);
  const selectedPhase = selectedPhaseNumber ? roadmapPhases.find((phase) => phase.phaseNumber === selectedPhaseNumber) || null : null;
  const pilotFinalized = Boolean(detail?.pilotFinalizedAt);

  const phaseTitles = useMemo(() => {
    const map: Record<number, string> = {};
    roadmapPhases.forEach((phase) => { map[phase.phaseNumber] = t(`hub.phase${phase.phaseNumber}` as TranslationKey); });
    return map;
  }, [roadmapPhases, t]);

  const selectPhase = (phaseNumber: number) => {
    setSelectedPhaseNumber(phaseNumber);
    if (citizenView) {
      const next = new URLSearchParams(searchParams);
      next.set('phase', String(phaseNumber));
      setSearchParams(next, { replace: true });
      window.requestAnimationFrame(() => document.getElementById('citizen-phase-content')?.focus({ preventScroll: true }));
    }
  };

  const submitCitizenContribution = async (activity: HubActivity) => {
    const content = String(contributionDrafts[activity.id] || '').trim();
    if (!content || !detail) return;
    setSubmittingActivityId(activity.id);
    try {
      const result = await apiRequest<{ contribution: CitizenContribution }>(`/api/hub/activities/${activity.id}/contributions`, {
        method: 'POST', body: jsonBody({ contributionType: 'text', content }),
      });
      setDetail((current) => current ? {
        ...current,
        phases: current.phases.map((phase) => phase.id === selectedPhase?.id
          ? { ...phase, myContributions: [result.contribution, ...phase.myContributions] }
          : phase),
      } : current);
      setContributionDrafts((current) => ({ ...current, [activity.id]: '' }));
      toast.success(t('hub.citizen.contributionSubmitted'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmittingActivityId(null);
    }
  };

  const confirmPhaseChange = async () => {
    if (!detail || pendingPhaseNumber == null) return;
    setSavingPhaseChange(true);
    try {
      const result = await apiRequest<{ initiative: InitiativeDetail; workflow: WorkflowSummary }>(`/api/hub/initiatives/${detail.id}/current-phase`, {
        method: 'PATCH', body: jsonBody({ currentPhaseNumber: pendingPhaseNumber, version: detail.version, confirmed: true }),
      });
      setDetail(result.initiative);
      setWorkflow(result.workflow);
      setSelectedPhaseNumber(pendingPhaseNumber);
      setPendingPhaseNumber(null);
      toast.success(t('hub.phaseChangedSuccess', { phase: pendingPhaseNumber }));
    } catch {
      setError(t('hub.errorUpdatePhase'));
    } finally {
      setSavingPhaseChange(false);
    }
  };

  const toggleToolOnSelectedPhase = async (toolId: string, add: boolean) => {
    if (!detail || !selectedPhase) return;
    const nextTools = add
      ? [...selectedPhase.enabledTools, toolId]
      : selectedPhase.enabledTools.filter((id) => id !== toolId);
    setSavingTool(true);
    try {
      const result = await apiRequest<{ phase: Phase }>(`/api/hub/initiatives/${detail.id}/phases/${selectedPhase.phaseNumber}`, {
        method: 'PATCH', body: jsonBody({ enabledTools: nextTools }),
      });
      setDetail({ ...detail, phases: detail.phases.map((phase) => phase.id === result.phase.id ? result.phase : phase) });
      void loadDetail(detail.id);
      toast.success(t(add ? 'hub.toolAddedSuccess' : 'hub.toolRemovedSuccess'));
    } catch {
      setError(t('hub.errorUpdateTools'));
    } finally {
      setSavingTool(false);
    }
  };

  const assignFacilitator = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail || !facilitatorEmail.trim()) return;
    setSavingFacilitator(true);
    try {
      const result = await apiRequest<{ initiative: InitiativeDetail }>(`/api/hub/initiatives/${detail.id}/facilitator`, {
        method: 'PATCH', body: jsonBody({ email: facilitatorEmail.trim() }),
      });
      setDetail({ ...detail, facilitator: result.initiative.facilitator });
      void loadDetail(detail.id);
      setFacilitatorEmail('');
      toast.success(t('hub.facilitatorAssignedSuccess', { name: result.initiative.facilitator?.fullName || t(roleKey('facilitator')) }));
    } catch {
      setError(t('hub.errorAssignFacilitator'));
    } finally {
      setSavingFacilitator(false);
    }
  };

  const unassignFacilitator = async () => {
    if (!detail) return;
    setSavingFacilitator(true);
    try {
      await apiRequest(`/api/hub/initiatives/${detail.id}/facilitator`, { method: 'DELETE' });
      setDetail({ ...detail, facilitator: null });
      void loadDetail(detail.id);
      toast.success(t('hub.facilitatorUnassignedSuccess'));
    } catch {
      setError(t('hub.errorUnassignFacilitator'));
    } finally {
      setSavingFacilitator(false);
    }
  };

  const activatePilot = async () => {
    if (!detail) return;
    setActivating(true);
    setError('');
    try {
      const result = await apiRequest<{ initiative: InitiativeDetail }>(`/api/hub/initiatives/${detail.id}/activate`, {
        method: 'POST',
        body: jsonBody({ version: detail.version, confirmed: true, reason: 'Municipality reviewed the process setup and activated the pilot.' }),
      });
      setDetail(result.initiative);
      setInitiatives((current) => current.map((initiative) => initiative.id === result.initiative.id
        ? { ...initiative, lifecycleStatus: result.initiative.lifecycleStatus, status: result.initiative.status }
        : initiative));
      setActivationConfirming(false);
      toast.success(t('hub.lifecycle.activatedSuccess'));
      void loadDetail(detail.id);
    } catch {
      setError(t('hub.lifecycle.activationFailed'));
    } finally {
      setActivating(false);
    }
  };

  const createInitiative = async (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim().length < 5 || description.trim().length < 20) {
      setError(t('hub.createValidation'));
      return;
    }
    setCreating(true);
    setError('');
    try {
      await apiRequest<{ initiative: Initiative }>('/api/hub/initiatives', {
        method: 'POST',
        body: jsonBody({ title, description, visibility: 'public' }),
      });
      toast.success(t('hub.pilotCreatedSuccess'));
      navigate('/setup-questionnaire');
    } catch {
      setError(t('hub.errorCreatePilot'));
    } finally {
      setCreating(false);
    }
  };

  const renderHubOverview = () => {
    if (!role) return null;

    const firstName = user?.fullName?.trim().split(/\s+/)[0];
    const descriptionKey: TranslationKey = citizenView
      ? 'hub.dashboardIntroCitizen'
      : role === 'municipality'
      ? 'hub.dashboardIntroMunicipality'
      : role === 'facilitator'
          ? 'hub.workspaceResponsibilityFacilitator'
          : 'hub.workspaceResponsibilityAdmin';
    const stats = [
      { icon: Layers3, value: tools.length, label: t('hub.statCoCreationTools') },
      { icon: PencilLine, value: workflow?.metrics.contributions ?? 0, label: t('hub.statCitizenContributions') },
    ];

    return (
      <section className="border-b-2 border-[#dedee1] pb-8" aria-labelledby="dashboard-intro-title">
        <div className={`grid gap-8 ${activeInitiative ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#ca7428]">
              {t('hub.welcomeBack')}{firstName ? `, ${firstName}` : ''}
            </p>
            <h1 id="dashboard-intro-title" className="mt-2 text-[34px] font-bold leading-tight text-[#444]">{t('hub.title')}</h1>
            <p className="mt-3 max-w-4xl text-[15px] leading-relaxed text-[#555]">{t(descriptionKey)}</p>
            <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-5">
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex min-w-[190px] items-center gap-3">
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]" aria-hidden="true">
                    <Icon size={23} />
                  </span>
                  <div>
                    <dd className="text-[22px] font-bold leading-none text-[#333]">{value}</dd>
                    <dt className="mt-1 text-[12px] font-medium text-[#555]">{label}</dt>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          {activeInitiative && renderPilotCard(
            activeInitiative,
            role === 'municipality' && activeInitiative.lifecycleStatus === 'active'
              ? previewingAsCitizen
                ? { label: t('hub.exitPreview'), to: '/co-creation-hub' }
                : { label: t('hub.previewAsCitizen'), to: `/co-creation-hub?phase=${detail?.currentPhaseNumber || 1}&preview=citizen` }
              : undefined,
          )}
        </div>
      </section>
    );
  };

  const renderPilotCard = (initiative: Initiative, action?: { label: string; to: string }) => (
    <div className="flex w-full flex-col gap-4 spice-card p-5 lg:w-[320px] lg:flex-shrink-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#888]">{t('hub.yourPilot')}</p>
        <span className={`inline-flex px-2.5 py-0.5 text-[11px] font-bold uppercase ${LIFECYCLE_STYLES[initiative.lifecycleStatus]}`}>{t(`hub.lifecycle.${initiative.lifecycleStatus}` as TranslationKey)}</span>
      </div>
      <h3 className="text-[19px] font-bold leading-tight text-[#444]">{initiative.title}</h3>
      {initiative.lifecycleStatus === 'active' && detail?.currentPhaseNumber && (
        <div className="border-l-4 border-[#f68b2c] bg-[#fff8f2] px-3 py-2">
          <p className="text-[11px] font-bold uppercase text-[#a85f20]">{t('hub.phaseNumber', { phase: detail.currentPhaseNumber })}</p>
          <p className="text-[13px] font-semibold text-[#444]">{t(`hub.phase${detail.currentPhaseNumber}` as TranslationKey)}</p>
        </div>
      )}
      {initiative.location && <p className="flex items-center gap-2 text-[13px] text-[#666]"><MapPinned size={14} className="flex-shrink-0 text-[#ca7428]" />{initiative.location}</p>}
      {(detail?.startDate || detail?.endDate) && (
        <p className="flex items-center gap-2 text-[13px] text-[#666]">
          <CalendarDays size={14} className="flex-shrink-0 text-[#ca7428]" />
          {detail.startDate ? formatDate(detail.startDate, { dateStyle: 'medium' }) : '—'} – {detail.endDate ? formatDate(detail.endDate, { dateStyle: 'medium' }) : '—'}
        </p>
      )}
      {action && (
        <Link to={action.to} className="mt-1 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border-2 border-[#444] bg-white px-4 py-2 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">
          {action.label}
        </Link>
      )}
    </div>
  );

  const renderMunicipalityLifecycle = () => {
    if (!detail || detail.lifecycleStatus === 'active' || detail.lifecycleStatus === 'completed') return null;
    const questionnaireComplete = Boolean(detail.setupCompletedAt);
    const toolsSelected = detail.setupSelectedTools.length > 0;

    if (detail.lifecycleStatus === 'setup_required') {
      return (
        <section className="spice-card border-l-4 border-l-[#f68b2c] p-6 md:p-8" aria-labelledby="setup-required-title">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#a85f20]">{t('hub.lifecycle.setup_required')}</p>
          <h2 id="setup-required-title" className="mt-2 text-[24px] font-bold text-[#444]">{t('hub.lifecycle.setupRequiredTitle')}</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#666]">{t('hub.lifecycle.setupRequiredText')}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 border-2 border-[#e4e4e4] bg-white p-4">
              {questionnaireComplete ? <CheckCircle2 className="text-[#3f7046]" size={20} /> : <Circle className="text-[#999]" size={20} />}
              <span className="font-semibold text-[#444]">{t('hub.lifecycle.questionnaire')}</span>
            </div>
            <div className="flex items-center gap-3 border-2 border-[#e4e4e4] bg-white p-4">
              {toolsSelected ? <CheckCircle2 className="text-[#3f7046]" size={20} /> : <Circle className="text-[#999]" size={20} />}
              <span className="font-semibold text-[#444]">{t('hub.lifecycle.recommendations')}</span>
            </div>
          </div>
          <Link to={questionnaireComplete ? '/setup-tools' : '/setup-questionnaire'} className="mt-6 inline-flex min-h-12 items-center gap-2 bg-[#f68b2c] px-6 font-bold text-white hover:bg-[#df771d]">
            {t(questionnaireComplete ? 'hub.lifecycle.reviewRecommendations' : 'hub.lifecycle.startSetup')} <ArrowRight size={17} />
          </Link>
        </section>
      );
    }

    return (
      <section className="spice-card border-l-4 border-l-[#4e789b] p-6 md:p-8" aria-labelledby="ready-activate-title">
        <p className="text-[12px] font-bold uppercase tracking-wide text-[#254f72]">{t('hub.lifecycle.ready_to_activate')}</p>
        <h2 id="ready-activate-title" className="mt-2 text-[24px] font-bold text-[#444]">{t('hub.lifecycle.readyTitle')}</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#666]">{t('hub.lifecycle.readyText')}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[t('hub.lifecycle.questionnaireComplete'), t('hub.lifecycle.toolsReviewed'), t('hub.lifecycle.historyProtected')].map((label) => (
            <div key={label} className="flex items-center gap-3 border-2 border-[#dce5ec] bg-[#f7fbfd] p-4"><CheckCircle2 size={20} className="flex-none text-[#3f7046]" /><span className="text-[13px] font-semibold text-[#444]">{label}</span></div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/setup-questionnaire" className="inline-flex min-h-12 items-center border-2 border-[#444] bg-white px-5 font-bold text-[#444]">{t('hub.lifecycle.reviewSetup')}</Link>
          {!activationConfirming && <button type="button" onClick={() => setActivationConfirming(true)} className="inline-flex min-h-12 cursor-pointer items-center gap-2 bg-[#f68b2c] px-6 font-bold text-white hover:bg-[#df771d]">{t('hub.lifecycle.activate')} <ArrowRight size={17} /></button>}
        </div>
        {activationConfirming && (
          <div className="mt-6 border-2 border-[#f68b2c] bg-[#fff8f2] p-5" role="alertdialog" aria-labelledby="activation-confirm-title">
            <h3 id="activation-confirm-title" className="text-[18px] font-bold text-[#444]">{t('hub.lifecycle.confirmTitle')}</h3>
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#666]">{t('hub.lifecycle.confirmText')}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => setActivationConfirming(false)} disabled={activating} className="min-h-11 cursor-pointer border-2 border-[#444] bg-white px-5 font-bold text-[#444]">{t('common.cancel')}</button>
              <button type="button" onClick={() => void activatePilot()} disabled={activating} className="min-h-11 cursor-pointer bg-[#f68b2c] px-5 font-bold text-white disabled:cursor-wait disabled:opacity-60">{activating ? t('hub.lifecycle.activating') : t('hub.lifecycle.confirmActivate')}</button>
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderRoadmap = () => {
    if (!detail) return null;
    return (
      <section className="mt-8 spice-card p-6 md:p-8" aria-labelledby="roadmap-title">
        <h2 id="roadmap-title" className="text-[20px] font-bold text-[#444]">{t('hub.roadmapTitle')}</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {roadmapPhases.map((phase, index) => {
            const state = phaseState(phase.phaseNumber, detail.currentPhaseNumber, pilotFinalized);
            const isSelected = selectedPhaseNumber === phase.phaseNumber;
            const stateLabelKey: TranslationKey = state === 'completed' ? 'hub.phaseCompleted'
              : state === 'current' ? 'hub.phaseCurrent'
              : !citizenView && (role === 'municipality' || role === 'admin') ? 'hub.phaseIncomplete' : 'hub.phaseUpcoming';
            return (
              <div key={phase.id} className="relative flex flex-col items-center text-center">
                {index > 0 && <span className="absolute right-1/2 top-5 -z-10 hidden h-0.5 w-full bg-[#e0e0e0] lg:block" aria-hidden="true" />}
                <button
                  type="button"
                  aria-label={`${t('hub.phaseNumber', { phase: phase.phaseNumber })} - ${t(`hub.phase${phase.phaseNumber}` as TranslationKey)} - ${t(stateLabelKey)}`}
                  aria-pressed={isSelected}
                  onClick={() => selectPhase(phase.phaseNumber)}
                  className={`grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-full border-2 font-bold transition-colors hover:border-[#f68b2c] hover:bg-[#fff8f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] ${
                    isSelected ? 'border-[#f68b2c] bg-[#fff0e1]' : 'border-[#d5d6da] bg-white'
                  }`}
                >
                  {state === 'completed'
                    ? <CheckCircle2 size={20} className="text-[#2e6e45]" />
                    : state === 'current'
                      ? <CircleDot size={20} className="text-[#ca7428]" />
                      : <Circle size={20} className="text-[#aaa]" />}
                </button>
                <span className="mt-3 text-[11px] font-bold uppercase text-[#a85f20]">
                  {t('hub.phaseNumber', { phase: phase.phaseNumber })} <span aria-hidden="true">·</span> {t(stateLabelKey)}
                </span>
                <p className="mt-1 max-w-[140px] text-[13px] font-bold leading-tight text-[#444]">{t(`hub.phase${phase.phaseNumber}` as TranslationKey)}</p>
                <p className="mt-1 text-[11px] text-[#888]">{t('hub.phaseToolCount', { count: phase.enabledTools.length })}</p>
              </div>
            );
          })}
        </div>

        {selectedPhaseNumber != null && selectedPhase && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#eee] pt-6">
            <p className="text-[14px] text-[#666]">
              {t(selectedPhaseNumber === detail.currentPhaseNumber ? 'hub.currentPhaseDetailsNotice' : 'hub.notCurrentPhaseNotice', { phase: selectedPhaseNumber })}
            </p>
            {citizenView ? (
              phaseState(selectedPhaseNumber, detail.currentPhaseNumber, pilotFinalized) === 'completed' ? (
                <Link
                  to={`/repository?pilotId=${detail.id}&phase=${selectedPhaseNumber}&phaseId=${selectedPhase.id}&contentType=result&returnPhase=${selectedPhaseNumber}`}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#df7720]"
                >
                  {t('hub.citizen.viewResults')} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : (
                <a href="#citizen-phase-content" className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] px-4 py-2 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">
                  {t(selectedPhaseNumber === detail.currentPhaseNumber ? 'hub.citizen.viewCurrentPhase' : 'hub.citizen.viewOverview')} <ArrowRight size={15} aria-hidden="true" />
                </a>
              )
            ) : (
              <Link to={`/hub/${detail.id}/phase/${selectedPhaseNumber}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] px-4 py-2 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">
                {t('hub.viewPhaseDetails')} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
            {!previewingAsCitizen && canManageLifecycle && workflow?.readiness.ready && workflow.currentPhaseNumber < 5 && (
              <button
                type="button"
                onClick={() => setPendingPhaseNumber(workflow.currentPhaseNumber + 1)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#df7720] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]"
              >
                {t('workflow.button.advancePhase', { phase: workflow.currentPhaseNumber + 1 })} <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>
    );
  };

  const renderCitizenPhaseWorkspace = (initiative: Initiative) => {
    if (!detail || !selectedPhase || selectedPhaseNumber == null) return null;
    const state = phaseState(selectedPhaseNumber, detail.currentPhaseNumber, pilotFinalized);
    const phaseTitle = t(`hub.phase${selectedPhaseNumber}` as TranslationKey);
    const stateKey: TranslationKey = state === 'completed' ? 'hub.phaseCompleted' : state === 'current' ? 'hub.phaseCurrent' : 'hub.phaseUpcoming';
    const phaseResultsPath = `/repository?pilotId=${detail.id}&phase=${selectedPhaseNumber}&phaseId=${selectedPhase.id}&contentType=result&returnPhase=${selectedPhaseNumber}`;
    const period = selectedPhase.startDate && selectedPhase.endDate
      ? t('hub.citizen.phasePeriod', { start: formatDate(selectedPhase.startDate, { dateStyle: 'medium' }), end: formatDate(selectedPhase.endDate, { dateStyle: 'medium' }) })
      : selectedPhase.completedAt
        ? t('hub.citizen.completedOn', { date: formatDate(selectedPhase.completedAt, { dateStyle: 'medium' }) })
        : null;
    const visibleTools = tools.filter((tool) => selectedPhase.enabledTools.includes(tool.id));
    const publishedResults = selectedPhase.results.filter((result) => result.resultType);
    const publishedResources = selectedPhase.results.filter((result) => !result.resultType);
    const openActivities = selectedPhase.activities.filter((activity) => activity.workflowStatus === 'open');

    const renderResultCard = (result: PhaseResult) => (
      <article key={result.id} className="flex min-w-0 flex-col border-2 border-[#dedfe2] bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center bg-[#fff0e1] text-[#ca7428]" aria-hidden="true"><FileText size={20} /></span>
          <div className="min-w-0">
            <h4 className="text-[14px] font-bold leading-snug text-[#444]">{result.title}</h4>
            <p className="mt-1 text-[11px] font-semibold uppercase text-[#a85f20]">
              {result.resultType && RESULT_TYPE_KEYS[result.resultType] ? t(RESULT_TYPE_KEYS[result.resultType]) : result.documentType}
            </p>
          </div>
        </div>
        <p className="mt-3 flex-1 text-[13px] leading-relaxed text-[#666]">{result.description}</p>
        <dl className="mt-3 grid gap-1 text-[12px] text-[#666]">
          {result.relatedActivityTitle && <div><dt className="inline font-bold">{t('hub.citizen.relatedActivity')}: </dt><dd className="inline">{result.relatedActivityTitle}</dd></div>}
          {result.toolKey && <div><dt className="inline font-bold">{t('hub.citizen.relatedTool')}: </dt><dd className="inline">{tools.find((tool) => tool.id === result.toolKey)?.name || result.toolKey}</dd></div>}
          {result.publishedByName && <div><dt className="inline font-bold">{t('hub.citizen.publishedBy')}: </dt><dd className="inline">{result.publishedByName}</dd></div>}
          {result.publishedAt && <div><dt className="inline font-bold">{t('hub.citizen.publishedOn')}: </dt><dd className="inline"><time dateTime={result.publishedAt}>{formatDate(result.publishedAt, { dateStyle: 'medium' })}</time></dd></div>}
        </dl>
        <Link to={`${phaseResultsPath}&q=${encodeURIComponent(result.title)}`} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[#444] px-4 text-[12px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#a85f20]">
          {t('hub.citizen.viewPublishedResult')} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </article>
    );

    const renderContributionList = () => (
      <section aria-labelledby="citizen-contributions-heading">
        <h3 id="citizen-contributions-heading" className="text-[18px] font-bold text-[#444]">{t('hub.citizen.myContributions')}</h3>
        {selectedPhase.myContributions.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {selectedPhase.myContributions.map((contribution) => (
              <article key={contribution.id} className="border-l-4 border-[#ca7428] bg-[#fff8f2] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase text-[#a85f20]">{t(statusKey(contribution.status))}</span>
                  <time dateTime={contribution.createdAt} className="text-[11px] text-[#777]">{formatDate(contribution.createdAt, { dateStyle: 'medium' })}</time>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-[#444]">{contribution.content}</p>
                {contribution.municipalityResponse && (
                  <div className="mt-3 border-t border-[#e8c8aa] pt-3">
                    <p className="text-[11px] font-bold uppercase text-[#7a4b20]">{t('hub.citizen.municipalityResponse')}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#5f5144]">{contribution.municipalityResponse}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 spice-card-dashed p-4 text-[13px] text-[#666]">{t('hub.citizen.noContributionsForPhase')}</p>
        )}
      </section>
    );

    return (
      <section id="citizen-phase-content" tabIndex={-1} className="mt-5 border-2 border-[#cfd0d4] bg-white p-5 outline-none md:p-7" aria-labelledby="selected-phase-heading" aria-live="polite">
        <header className="flex flex-col gap-4 border-b-2 border-[#eee] pb-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase text-[#a85f20]">{t('hub.phaseNumber', { phase: selectedPhaseNumber })} <span aria-hidden="true">·</span> {t(stateKey)}</p>
            <h2 id="selected-phase-heading" className="mt-1 text-[24px] font-bold leading-tight text-[#444]">{phaseTitle}</h2>
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#666]">{t(PHASE_TEXT_KEYS[selectedPhaseNumber])}</p>
          </div>
          {period && <p className="flex min-h-10 flex-none items-center gap-2 bg-[#f5f5f5] px-3 text-[12px] font-semibold text-[#555]"><CalendarDays size={16} aria-hidden="true" />{period}</p>}
        </header>

        {state === 'incomplete' ? (
          <div className="py-6">
            <div className="border-l-4 border-[#888] bg-[#f3f3f4] p-5" role="status">
              <h3 className="text-[17px] font-bold text-[#444]">{t('hub.citizen.upcomingNotOpen')}</h3>
              <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#666]">{t('hub.citizen.upcomingMessage')}</p>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="text-[16px] font-bold text-[#444]">{t('hub.citizen.phasePurpose')}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{t(PHASE_TEXT_KEYS[selectedPhaseNumber])}</p>
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#444]">{t('hub.citizen.whatCitizensMayDo')}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{t(`hub.citizen.upcomingPhase${selectedPhaseNumber}` as TranslationKey)}</p>
              </div>
            </div>
          </div>
        ) : state === 'completed' ? (
          <div className="space-y-7 pt-6">
            <section aria-labelledby="phase-summary-heading" className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div>
                <h3 id="phase-summary-heading" className="text-[18px] font-bold text-[#444]">{t('hub.citizen.phaseSummary')}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{selectedPhase.completionSummary || t('hub.citizen.completedSummaryFallback')}</p>
                <p className="mt-3 text-[13px] font-semibold text-[#47662f]">{t('hub.citizen.completedNoActiveControls')}</p>
              </div>
              <Link to={phaseResultsPath} className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#f68b2c] px-5 text-[14px] font-bold text-white hover:bg-[#df7720]">
                <FileDown size={17} aria-hidden="true" /> {t('hub.citizen.viewResults')}
              </Link>
            </section>

            <section aria-labelledby="completed-tools-heading">
              <h3 id="completed-tools-heading" className="text-[18px] font-bold text-[#444]">{t('hub.citizen.toolsUsed')}</h3>
              {visibleTools.length ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {visibleTools.map((tool) => {
                    const relatedActivity = selectedPhase.activities.find((activity) => activity.selectedToolIds.includes(tool.id));
                    const output = publishedResults.find((result) => result.toolKey === tool.id);
                    return (
                      <article key={tool.id} className="border-2 border-[#dedfe2] p-4">
                        <h4 className="text-[15px] font-bold text-[#444]">{tool.name}</h4>
                        <p className="mt-2 text-[12px] leading-relaxed text-[#666]">{tool.shortDesc}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[#555]"><span className="bg-[#f2f2f2] px-2 py-1">{tool.mode}</span><span className="bg-[#f2f2f2] px-2 py-1">{tool.duration}</span></div>
                        {relatedActivity && <p className="mt-3 text-[12px] text-[#666]"><strong>{t('hub.citizen.relatedActivity')}:</strong> {relatedActivity.title}</p>}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link to={`/tool-detail/${tool.id}`} className="inline-flex min-h-10 items-center border-2 border-[#444] px-3 text-[12px] font-bold text-[#444]">{t('hub.citizen.viewToolDetails')}</Link>
                          {output && <Link to={`${phaseResultsPath}&q=${encodeURIComponent(output.title)}`} className="inline-flex min-h-10 items-center bg-[#f68b2c] px-3 text-[12px] font-bold text-white">{t('hub.citizen.viewOutput')}</Link>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : <p className="mt-3 spice-card-dashed p-4 text-[13px] text-[#666]">{t('hub.citizen.completedNoTools')}</p>}
            </section>

            <section aria-labelledby="published-results-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 id="published-results-heading" className="text-[18px] font-bold text-[#444]">{t('hub.citizen.publishedResults')}</h3>
                {publishedResults.length > 0 && <Link to={phaseResultsPath} className="text-[13px] font-bold text-[#a85f20] underline underline-offset-4">{t('hub.citizen.viewAllResults')}</Link>}
              </div>
              {publishedResults.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{publishedResults.slice(0, 4).map(renderResultCard)}</div>
                : <div className="mt-4 spice-card-dashed p-5"><p className="font-bold text-[#555]">{t('hub.citizen.noPublishedResults')}</p><p className="mt-1 text-[13px] text-[#666]">{t('hub.citizen.noPublishedResultsText')}</p></div>}
            </section>

            {renderContributionList()}

            <section className="border-l-4 border-[#59713d] bg-[#f0f8ea] p-5" aria-labelledby="published-outcomes-heading">
              <h3 id="published-outcomes-heading" className="text-[17px] font-bold text-[#3d5c26]">{t('hub.citizen.publishedOutcomes')}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#3d5c26]">{selectedPhase.completionSummary || t('hub.citizen.completedSummaryFallback')}</p>
              <Link to={`/forum-voting?initiative=${initiative.id}&phase=${selectedPhaseNumber}`} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-[#35521f] underline underline-offset-4">{t('hub.citizen.viewMunicipalityDecisions')} <ArrowRight size={15} /></Link>
            </section>
          </div>
        ) : (
          <div className="space-y-7 pt-6">
            <section className="grid gap-4 md:grid-cols-3" aria-label={t('hub.citizen.currentPhaseFacts')}>
              <div className="border-l-4 border-[#f68b2c] bg-[#fff8f2] p-4"><p className="text-[11px] font-bold uppercase text-[#a85f20]">{t('hub.citizen.happeningNow')}</p><p className="mt-2 text-[13px] leading-relaxed text-[#555]">{openActivities.length ? t('hub.citizen.openActivitiesCount', { count: openActivities.length }) : t('hub.citizen.noOpenActivitiesText')}</p></div>
              <div className="border-l-4 border-[#59713d] bg-[#f3f7ef] p-4"><p className="text-[11px] font-bold uppercase text-[#47662f]">{t('hub.citizen.availableTools')}</p><p className="mt-2 text-[13px] leading-relaxed text-[#555]">{t('hub.citizen.availableToolsCount', { count: visibleTools.length })}</p></div>
              <div className="border-l-4 border-[#55738f] bg-[#f1f6fa] p-4"><p className="text-[11px] font-bold uppercase text-[#355b78]">{t('hub.citizen.whatHappensNext')}</p><p className="mt-2 text-[13px] leading-relaxed text-[#555]">{t('hub.citizen.currentNext')}</p></div>
            </section>

            <section aria-labelledby="open-activities-heading">
              <h3 id="open-activities-heading" className="text-[18px] font-bold text-[#444]">{t('hub.citizen.openActivities')}</h3>
              {selectedPhase.activities.length ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {selectedPhase.activities.map((activity) => {
                    const isOpen = activity.workflowStatus === 'open';
                    return (
                      <article key={activity.id} className="border-2 border-[#dedfe2] bg-white p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div><p className="text-[11px] font-bold uppercase text-[#a85f20]">{t(ACTIVITY_TYPE_KEYS[activity.activityType] || ACTIVITY_TYPE_KEYS.participation)}</p><h4 className="mt-1 text-[17px] font-bold text-[#444]">{activity.title}</h4></div>
                          <span className={`px-2.5 py-1 text-[11px] font-bold uppercase ${isOpen ? 'bg-[#e7f2df] text-[#47662f]' : 'bg-[#f2f2f2] text-[#666]'}`}>{t(statusKey(activity.status))}</span>
                        </div>
                        <p className="mt-3 text-[13px] leading-relaxed text-[#666]">{activity.description}</p>
                        <dl className="mt-4 grid gap-2 text-[12px] text-[#555] sm:grid-cols-2">
                          {activity.startDate && <div className="flex gap-2"><CalendarDays size={15} className="flex-none text-[#ca7428]" /><span><strong>{t('hub.citizen.starts')}:</strong> <time dateTime={activity.startDate}>{formatDate(activity.startDate, { dateStyle: 'medium', timeStyle: 'short' })}</time></span></div>}
                          {activity.submissionDeadline && <div className="flex gap-2"><Clock size={15} className="flex-none text-[#ca7428]" /><span><strong>{t('hub.citizen.deadline')}:</strong> <time dateTime={activity.submissionDeadline}>{formatDate(activity.submissionDeadline, { dateStyle: 'medium', timeStyle: 'short' })}</time></span></div>}
                          {activity.location && <div className="flex gap-2"><MapPin size={15} className="flex-none text-[#ca7428]" /><span>{activity.location}</span></div>}
                          <div className="flex gap-2"><Activity size={15} className="flex-none text-[#ca7428]" /><span>{t(`analogue.${activity.participationMode === 'offline' ? 'offline' : activity.participationMode}` as TranslationKey)}{activity.estimatedDuration ? ` · ${activity.estimatedDuration}` : ''}</span></div>
                        </dl>
                        <div className="mt-5 border-l-4 border-[#f68b2c] bg-[#fff8f2] p-4">
                          <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#444]"><BookOpenText size={16} aria-hidden="true" />{t('hub.citizen.participationInstructions')}</h5>
                          <p className="mt-2 text-[13px] leading-relaxed text-[#555]">{activity.instructions}</p>
                          {activity.requiredMaterials && <p className="mt-2 text-[12px] text-[#666]"><strong>{t('hub.citizen.requiredMaterials')}:</strong> {activity.requiredMaterials}</p>}
                          {activity.accessibilityNotes && <p className="mt-2 flex items-start gap-2 text-[12px] text-[#555]"><Accessibility size={15} className="mt-0.5 flex-none" aria-hidden="true" /><span><strong>{t('hub.citizen.accessibility')}:</strong> {activity.accessibilityNotes}</span></p>}
                        </div>
                        {isOpen && canParticipate && (
                          <form onSubmit={(event) => { event.preventDefault(); void submitCitizenContribution(activity); }} className="mt-5">
                            <label htmlFor={`contribution-${activity.id}`} className="text-[13px] font-bold text-[#444]">{t('hub.citizen.yourContribution')}</label>
                            <textarea id={`contribution-${activity.id}`} value={contributionDrafts[activity.id] || ''} onChange={(event) => setContributionDrafts((current) => ({ ...current, [activity.id]: event.target.value }))} rows={3} required className="mt-2 w-full resize-y border-2 border-[#bfc0c5] p-3 text-[13px] outline-none focus:border-[#ca7428]" placeholder={t('hub.citizen.contributionPlaceholder')} />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="submit" disabled={submittingActivityId === activity.id || !String(contributionDrafts[activity.id] || '').trim()} className="inline-flex min-h-11 items-center gap-2 bg-[#f68b2c] px-4 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} />{submittingActivityId === activity.id ? t('common.saving') : t('hub.citizen.submitContribution')}</button>
                              {activity.forumEnabled && <Link to={`/forum-voting?initiative=${initiative.id}&phase=${selectedPhaseNumber}`} className="inline-flex min-h-11 items-center gap-2 border-2 border-[#444] px-4 text-[13px] font-bold text-[#444]"><MessageSquareText size={15} />{t('hub.citizen.joinDiscussion')}</Link>}
                              {activity.votingEnabled && <Link to={`/forum-voting?initiative=${initiative.id}&phase=${selectedPhaseNumber}`} className="inline-flex min-h-11 items-center gap-2 border-2 border-[#444] px-4 text-[13px] font-bold text-[#444]"><Vote size={15} />{t('hub.citizen.vote')}</Link>}
                            </div>
                          </form>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : <div className="mt-4 spice-card-dashed p-5"><p className="font-bold text-[#555]">{t('hub.citizen.noOpenActivities')}</p><p className="mt-1 text-[13px] text-[#666]">{t('hub.citizen.noOpenActivitiesText')}</p></div>}
            </section>

            <section aria-labelledby="available-tools-heading">
              <h3 id="available-tools-heading" className="text-[18px] font-bold text-[#444]">{t('hub.citizen.toolsAvailable')}</h3>
              {visibleTools.length ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {visibleTools.map((tool) => {
                    const activity = selectedPhase.activities.find((item) => item.selectedToolIds.includes(tool.id));
                    return (
                      <article key={tool.id} className="border-2 border-[#dedfe2] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3"><h4 className="text-[15px] font-bold text-[#444]">{tool.name}</h4><span className="bg-[#e7f2df] px-2 py-1 text-[11px] font-bold text-[#47662f]">{t('status.available')}</span></div>
                        <p className="mt-2 text-[12px] leading-relaxed text-[#666]">{tool.purpose || tool.shortDesc}</p>
                        {activity && <p className="mt-3 text-[12px] text-[#555]"><strong>{t('hub.citizen.usedFor')}:</strong> {activity.title}</p>}
                        <p className="mt-2 text-[12px] text-[#555]"><strong>{t('hub.citizen.whatYouCanDo')}:</strong> {t('hub.citizen.toolCitizenAction')}</p>
                        <Link to={`/tool-detail/${tool.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 border-2 border-[#444] px-4 text-[12px] font-bold text-[#444]">{t('hub.citizen.openToolDetails')} <ArrowRight size={14} /></Link>
                      </article>
                    );
                  })}
                </div>
              ) : <div className="mt-4 spice-card-dashed p-5"><p className="font-bold text-[#555]">{t('hub.citizen.noPublishedTools')}</p><p className="mt-1 text-[13px] text-[#666]">{t('hub.citizen.noPublishedToolsText')}</p></div>}
            </section>

            {publishedResources.length > 0 && <section aria-labelledby="phase-resources-heading"><h3 id="phase-resources-heading" className="text-[18px] font-bold text-[#444]">{t('hub.citizen.publishedResources')}</h3><div className="mt-4 grid gap-4 md:grid-cols-2">{publishedResources.map(renderResultCard)}</div></section>}
            {renderContributionList()}
          </div>
        )}
      </section>
    );
  };

  const renderToolsSection = () => {
    if (!detail || !selectedPhaseNumber || !selectedPhase) return null;
    const state = phaseState(selectedPhaseNumber, detail.currentPhaseNumber, pilotFinalized);
    const isManaging = canManageInitiative;

    const headingKey: TranslationKey = isManaging
      ? 'hub.toolsHeadingManage'
      : state === 'current' ? 'hub.toolsHeadingCurrent'
      : state === 'completed' ? 'hub.toolsHeadingCompleted'
      : 'hub.toolsHeadingUpcoming';

    const visibleTools = isManaging
      ? tools.filter((tool) => tool.phase === selectedPhaseNumber && detail.setupSelectedTools.includes(tool.id))
      : tools.filter((tool) => selectedPhase.enabledTools.includes(tool.id));

    const emptyKey: TranslationKey | null = visibleTools.length > 0 ? null
      : isManaging ? 'hub.toolsEmptyManage'
      : state === 'completed' ? 'hub.toolsEmptyCompleted'
      : state === 'current' ? 'hub.toolsEmptyCurrent'
      : 'hub.toolsEmptyUpcoming';

    return (
      <section className="mt-8 spice-card p-6 md:p-8" aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="text-[20px] font-bold text-[#444]">{t(headingKey, { phase: selectedPhaseNumber })}</h2>
        {!isManaging && (
          <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{t(PHASE_TEXT_KEYS[selectedPhaseNumber] || 'hub.phase1Text')}</p>
        )}
        {state === 'completed' && !isManaging && (
          <div className="mt-4 border-l-4 border-[#59713d] bg-[#f0f8ea] p-4">
            <p className="text-[13px] font-bold text-[#3d5c26]">{t('hub.phaseCompleted')}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#3d5c26]">
              {t(selectedPhase.resultsVisible ? 'hub.resultsAvailable' : 'hub.resultsUnavailable')}
            </p>
          </div>
        )}
        {emptyKey ? (
          <div className="mt-6 spice-card-dashed p-6 text-center">
            <p className="text-[14px] text-[#666]">{t(emptyKey)}</p>
            {isManaging && <Link to="/setup-questionnaire" className="mt-3 inline-block text-[13px] font-bold text-[#a85f20] underline underline-offset-4">{t('hub.goToQuestionnaire')}</Link>}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleTools.map((tool) => (
              <ToolTile
                key={tool.id}
                tool={tool}
                enabled={selectedPhase.enabledTools.includes(tool.id)}
                canManage={isManaging}
                canParticipate={canParticipate && state === 'current'}
                onAdd={() => !savingTool && void toggleToolOnSelectedPhase(tool.id, true)}
                onRemove={() => !savingTool && void toggleToolOnSelectedPhase(tool.id, false)}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderCrossPilotComparison = () => {
    if (!detail || !activeInitiative) return null;
    const comparisonAvailable = pilotFinalized || (detail.currentPhaseNumber ?? 0) >= 5;

    return (
      <section
        className={`mt-8 border-2 p-6 md:p-8 ${comparisonAvailable ? 'border-[#d0d1d5] bg-white' : 'border-[#c9cbd1] bg-[#f1f1f2]'}`}
        aria-labelledby="cross-pilot-comparison-title"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className={`grid h-12 w-12 flex-none place-items-center rounded-full ${comparisonAvailable ? 'bg-[#fff0e1] text-[#ca7428]' : 'bg-[#dedfe2] text-[#666]'}`} aria-hidden="true">
              {comparisonAvailable ? <GitCompareArrows size={23} /> : <LockKeyhole size={22} />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="cross-pilot-comparison-title" className={`text-[20px] font-bold ${comparisonAvailable ? 'text-[#444]' : 'text-[#555]'}`}>
                  {t('hub.crossPilotComparisonTitle')}
                </h2>
                <span className={`px-2.5 py-1 text-[11px] font-bold uppercase ${comparisonAvailable ? 'bg-[#e8f5ef] text-[#2e6e45]' : 'bg-[#dedfe2] text-[#555]'}`}>
                  {t(comparisonAvailable ? 'hub.crossPilotComparisonAvailable' : 'status.locked')}
                </span>
              </div>
              <p className={`mt-2 max-w-3xl text-[14px] leading-relaxed ${comparisonAvailable ? 'text-[#666]' : 'text-[#5f6063]'}`}>
                {t('hub.crossPilotComparisonText')}
              </p>
              {!comparisonAvailable && (
                <p id="cross-pilot-comparison-lock-note" className="mt-3 flex items-start gap-2 text-[13px] font-semibold text-[#555]" role="status">
                  <LockKeyhole size={16} className="mt-0.5 flex-none" aria-hidden="true" />
                  {t('hub.crossPilotComparisonLocked', { phase: 5 })}
                </p>
              )}
            </div>
          </div>

          {comparisonAvailable ? (
            <Link
              to="/pilot-sites#cross-site-evaluation"
              className="inline-flex min-h-12 flex-none cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[14px] font-bold text-white transition-colors duration-200 hover:bg-[#df7720] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]"
            >
              {t('hub.openCrossPilotComparison')} <ArrowRight size={17} aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-describedby="cross-pilot-comparison-lock-note"
              className="inline-flex min-h-12 flex-none cursor-not-allowed items-center justify-center gap-2 border-2 border-[#b8bac0] bg-[#dedfe2] px-5 py-3 text-[14px] font-bold text-[#666]"
            >
              <LockKeyhole size={17} aria-hidden="true" /> {t('hub.openCrossPilotComparison')}
            </button>
          )}
        </div>
      </section>
    );
  };

  const renderFacilitatorHub = () => {
    if (facilitatorLoading) {
      return (
        <div className="spice-card p-6 md:p-8" role="status" aria-live="polite">
          <span className="sr-only">{t('hub.loadingFacilitatorAssignments')}</span>
          <div className="h-6 w-1/3 animate-pulse bg-[#eee] motion-reduce:animate-none" aria-hidden="true" />
          <div className="mt-4 h-4 w-full animate-pulse bg-[#eee] motion-reduce:animate-none" aria-hidden="true" />
        </div>
      );
    }
    if (facilitatorInitiatives.length === 0) {
      return (
        <section className="spice-card p-6 md:p-8" aria-labelledby="facilitator-empty-title">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]"><Users size={22} /></span>
            <div>
              <h2 id="facilitator-empty-title" className="text-[22px] font-bold text-[#444]">{t('hub.noFacilitatorPilotTitle')}</h2>
              <p className="mt-2 max-w-2xl text-[15px] text-[#666]">{t('hub.noFacilitatorPilotText')}</p>
            </div>
          </div>
        </section>
      );
    }
    return (
      <div className="space-y-8">
        {facilitatorInitiatives.map((initiative) => {
          const phase = initiative.currentPhaseNumber ? initiative.phases.find((item) => item.phaseNumber === initiative.currentPhaseNumber) : null;
          return (
            <section key={initiative.id} className="spice-card p-6 md:p-8" aria-labelledby={`facilitator-initiative-${initiative.id}`}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#888]">{t('hub.assignedPilot')}</p>
              <h2 id={`facilitator-initiative-${initiative.id}`} className="mt-1 text-[22px] font-bold text-[#444]">{initiative.title}</h2>
              {initiative.location && <p className="mt-1 flex items-center gap-2 text-[13px] text-[#666]"><MapPinned size={14} className="text-[#ca7428]" />{initiative.location}</p>}
              {initiative.currentPhaseNumber ? (
                <div className="mt-4 border-l-4 border-[#f68b2c] bg-[#fff8f2] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase text-[#a85f20]">{t('hub.currentPhaseNumber', { phase: initiative.currentPhaseNumber })}</p>
                  <p className="text-[15px] font-semibold text-[#444]">{t(`hub.phase${initiative.currentPhaseNumber}` as TranslationKey)}</p>
                </div>
              ) : (
                <p className="mt-4 text-[14px] text-[#666]">{t('hub.phaseNotStarted')}</p>
              )}
              {phase && phase.enabledTools.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-[15px] font-bold text-[#444]">{t('hub.toolsEnabledForPhase')}</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {phase.enabledTools.map((toolId) => {
                      const tool = tools.find((item) => item.id === toolId);
                      if (!tool) return null;
                      return <Link key={toolId} to={`/tool-detail/${tool.id}`} className="spice-card p-3 text-[13px] font-semibold text-[#444] hover:border-[#f68b2c]">{tool.name}</Link>;
                    })}
                  </div>
                </div>
              )}
              <div className="mt-6 border-t-2 border-[#eee] pt-5">
                <h3 className="text-[14px] font-bold text-[#444]">{t('hub.relatedWorkspaceLinks')}</h3>
                <div className="mt-3 flex flex-wrap gap-3">
                {initiative.currentPhaseNumber && (
                  <Link to={`/hub/${initiative.id}/phase/${initiative.currentPhaseNumber}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-4 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#a85f20]"><ListChecks size={16} /> {t('hub.preparePhaseActivities')}</Link>
                )}
                <Link to="/repository" className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-4 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#a85f20]"><Wrench size={16} /> {t('hub.uploadWorkshopOutput')}</Link>
                <Link to={`/forum-voting?initiative=${initiative.id}`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#444] px-4 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]"><MessageSquareText size={16} /> {t('hub.prepareDraftProposal')}</Link>
                </div>
              </div>
            </section>
          );
        })}
        {detail && facilitatorInitiative?.id === detail.id && (
          <>
            {renderRoadmap()}
            {renderToolsSection()}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {error && <div role="alert" className="flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 font-semibold text-red-800"><CircleAlert size={20} />{error}</div>}

      {user?.accountStatus === 'pending_approval' && (
        <div role="status" className="flex items-start gap-3 border-l-4 border-[#ca7428] bg-[#fff8f2] p-4 font-semibold text-[#8a5b12]">
          <CircleAlert size={20} className="mt-0.5 flex-none" />
          {t('hub.pendingApprovalNotice', { role: t(roleKey(normalizeRole(user.role))) })}
        </div>
      )}

      {previewingAsCitizen && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-[#ca7428] bg-[#fff8f2] p-4">
          <p className="font-semibold text-[#8f4d18]">{t('hub.previewCitizenNotice')}</p>
          <Link to="/co-creation-hub" className="inline-flex min-h-10 items-center font-bold text-[#a85f20] underline underline-offset-4">{t('hub.exitPreview')}</Link>
        </div>
      )}

      {pendingPhaseNumber != null && detail && (
        <PhaseChangeDialog
          targetPhaseNumber={pendingPhaseNumber}
          currentPhaseNumber={detail.currentPhaseNumber ?? 0}
          phaseTitles={phaseTitles}
          saving={savingPhaseChange}
          requirements={workflow?.readiness.requirements ?? []}
          onConfirm={() => void confirmPhaseChange()}
          onCancel={() => setPendingPhaseNumber(null)}
        />
      )}

      {role && renderHubOverview()}

      {citizenView && citizenInitiative ? (
        loading ? (
          <div className="spice-card p-6 md:p-8" role="status" aria-live="polite">
            <span className="sr-only">{t('hub.loadingPilot')}</span>
            <div className="h-6 w-1/3 animate-pulse bg-[#eee] motion-reduce:animate-none" aria-hidden="true" />
          </div>
        ) : (
          <>
            {detailLoading && !detail ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-40 animate-pulse border-2 border-[#eee] bg-[#f7f7f7] motion-reduce:animate-none" />)}
              </div>
            ) : (
              <>
                {renderRoadmap()}
                {renderCitizenPhaseWorkspace(citizenInitiative)}
              </>
            )}
          </>
        )
      ) : role === 'municipality' ? (
        loading ? (
          <div className="spice-card p-6 md:p-8" role="status" aria-live="polite">
            <span className="sr-only">{t('hub.loadingPilot')}</span>
            <div className="h-6 w-1/3 animate-pulse bg-[#eee] motion-reduce:animate-none" aria-hidden="true" />
            <div className="mt-4 h-4 w-full animate-pulse bg-[#eee] motion-reduce:animate-none" aria-hidden="true" />
            <div className="mt-2 h-4 w-2/3 animate-pulse bg-[#eee] motion-reduce:animate-none" aria-hidden="true" />
          </div>
        ) : !municipalityInitiative ? (
          <section className="spice-card p-6 md:p-8" aria-labelledby="pilot-setup-title">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]"><Building2 size={22} /></span>
              <div>
                <h2 id="pilot-setup-title" className="text-[22px] font-bold text-[#444]">{t('hub.noPilotAssigned')}</h2>
                <p className="mt-2 max-w-2xl text-[15px] text-[#666]">
                  {user?.organisationId
                    ? t('hub.municipalitySetupRequired')
                    : t('hub.accountNoPilot')}
                </p>
              </div>
            </div>

            {user?.organisationId && (
              <>
                {!showCreate && (
                  <button type="button" onClick={() => setShowCreate(true)} className="mt-6 inline-flex min-h-12 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 py-3 font-bold text-white hover:bg-[#df771d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]">
                    <FilePlus2 size={18} /> {t('hub.completePilotSetup')}
                  </button>
                )}
                {showCreate && (
                  <form onSubmit={createInitiative} className="mt-7 grid items-start gap-4 border-t-2 border-[#eee] pt-6 md:grid-cols-2" noValidate>
                    <label className="flex min-w-0 flex-col gap-2 font-semibold text-[#444]">{t('hub.pilotTitle')} <span aria-hidden="true">*</span><span className="sr-only">{t('common.required')}</span>
                      <input value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-12 w-full border-2 border-[#bfc0c5] px-4 focus:border-[#ca7428] focus:outline-none" required />
                    </label>
                    <label className="flex min-w-0 flex-col gap-2 font-semibold text-[#444]">{t('hub.pilotDescription')} <span aria-hidden="true">*</span><span className="sr-only">{t('common.required')}</span>
                      <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full border-2 border-[#bfc0c5] px-4 py-3 focus:border-[#ca7428] focus:outline-none" required />
                    </label>
                    <div className="md:col-span-2 flex flex-wrap justify-end gap-3">
                      <button type="button" onClick={() => setShowCreate(false)} className="min-h-11 cursor-pointer border-2 border-[#444] px-5 font-bold">{t('common.cancel')}</button>
                      <button type="submit" disabled={creating} className="inline-flex min-h-11 cursor-pointer items-center gap-2 bg-[#f68b2c] px-5 font-bold text-white disabled:cursor-wait disabled:opacity-60">
                        {creating ? t('hub.creatingPilot') : t('hub.completePilotSetup')}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        ) : (
          <>
            {detailLoading && !detail ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-40 animate-pulse border-2 border-[#eee] bg-[#f7f7f7] motion-reduce:animate-none" />)}
              </div>
            ) : (
              <>
                {detail && detail.lifecycleStatus !== 'active' && detail.lifecycleStatus !== 'completed' ? renderMunicipalityLifecycle() : <>
                {renderRoadmap()}
                {detail && (
                  <section aria-labelledby="facilitator-assignment-title" className="spice-card p-6">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#fff0e1] text-[#ca7428]"><Users size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <h3 id="facilitator-assignment-title" className="text-[18px] font-bold text-[#444]">{t(roleKey('facilitator'))}</h3>
                        {detail.facilitator ? (
                          <>
                            <p className="mt-1 text-[14px] text-[#666]">
                              {t('hub.facilitatorAssigned', { name: detail.facilitator.fullName, email: detail.facilitator.email })}
                            </p>
                            <button type="button" onClick={() => void unassignFacilitator()} disabled={savingFacilitator} className="mt-3 min-h-10 cursor-pointer border-2 border-[#a86622] px-4 text-[13px] font-bold text-[#a86622] hover:bg-[#fff3e8] disabled:cursor-wait disabled:opacity-60">
                              {savingFacilitator ? t('hub.unassigningFacilitator') : t('hub.unassignFacilitator')}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="mt-1 text-[14px] text-[#666]">{t('hub.noFacilitatorAssigned')}</p>
                            <form onSubmit={assignFacilitator} className="mt-3 flex flex-wrap items-center gap-3">
                              <input type="email" required value={facilitatorEmail} onChange={(event) => setFacilitatorEmail(event.target.value)} placeholder="facilitator@example.org" className="min-h-11 min-w-0 flex-1 border-2 border-[#bfc0c5] px-3 text-[14px] focus:border-[#ca7428] focus:outline-none" />
                              <button type="submit" disabled={savingFacilitator || !facilitatorEmail.trim()} className="min-h-11 cursor-pointer bg-[#f68b2c] px-4 text-[13px] font-bold text-white hover:bg-[#e07a20] disabled:cursor-wait disabled:opacity-60">
                                {savingFacilitator ? t('hub.assigningFacilitator') : t('hub.assignFacilitator')}
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </div>
                  </section>
                )}
                {renderToolsSection()}
                </>}
              </>
            )}
          </>
        )
      ) : role === 'facilitator' ? (
        renderFacilitatorHub()
      ) : role === 'citizen' && (citizenInitiative || (loading && citizenPilotSlug)) ? (
        loading ? (
          <div className="spice-card p-6 md:p-8" role="status" aria-live="polite">
            <span className="sr-only">{t('hub.loadingPilot')}</span>
            <div className="h-6 w-1/3 animate-pulse bg-[#eee] motion-reduce:animate-none" aria-hidden="true" />
          </div>
        ) : citizenInitiative && (
          <>
            {detailLoading && !detail ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-40 animate-pulse border-2 border-[#eee] bg-[#f7f7f7] motion-reduce:animate-none" />)}
              </div>
            ) : (
              <>
                {renderRoadmap()}
                {renderCitizenPhaseWorkspace(citizenInitiative)}
              </>
            )}
          </>
        )
      ) : (
        <>
          {can('admin:access') && (
            <section className="spice-card p-6 md:p-8" aria-labelledby="role-dashboard-title">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 id="role-dashboard-title" className="text-[20px] font-bold text-[#444]">{t('hub.platformAdministration')}</h2>
                <Link to="/admin" className="inline-flex min-h-12 cursor-pointer items-center gap-2 border-2 border-[#444] bg-white px-5 py-3 font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]">
                  {t('hub.openAdministration')} <ArrowRight size={18} />
                </Link>
              </div>
            </section>
          )}

          <section aria-labelledby="initiatives-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="initiatives-title" className="text-[27px] font-bold text-[#444]">
                  {role === 'admin'
                    ? t('hub.allPlatformPilots')
                    : user?.pilotSite ? t('hub.availablePilotsFor', { pilot: user.pilotSite }) : t('hub.availablePilots')}
                </h2>
                <p className="mt-2 text-[15px] text-[#666]">
                  {role === 'admin'
                    ? t('hub.allPlatformPilotsText')
                    : t('hub.availablePilotsText')}
                </p>
              </div>
              <button type="button" onClick={() => void load()} className="cursor-pointer text-sm font-bold text-[#a85f20] underline underline-offset-4">{t('common.refresh')}</button>
            </div>

            {loading ? (
              <div className="mt-6" role="status" aria-live="polite">
                <span className="sr-only">{t('hub.loadingPilots')}</span>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex min-h-60 flex-col spice-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-5 w-20 animate-pulse bg-[#eee] motion-reduce:animate-none" />
                        <div className="h-4 w-12 animate-pulse bg-[#eee] motion-reduce:animate-none" />
                      </div>
                      <div className="mt-5 h-6 w-4/5 animate-pulse bg-[#eee] motion-reduce:animate-none" />
                      <div className="mt-3 h-3 w-full animate-pulse bg-[#eee] motion-reduce:animate-none" />
                      <div className="mt-2 h-3 w-3/5 animate-pulse bg-[#eee] motion-reduce:animate-none" />
                      <div className="mt-auto h-4 w-24 animate-pulse bg-[#eee] motion-reduce:animate-none" />
                    </div>
                  ))}
                </div>
              </div>
            ) : displayedInitiatives.length === 0 ? (
              <div className="mt-6 spice-card-dashed p-8 text-center">
                <Activity className="mx-auto text-[#ca7428]" size={32} />
                {role === 'admin' ? (
                  <>
                    <h3 className="mt-4 text-xl font-bold text-[#444]">{t('hub.noPlatformPilots')}</h3>
                    <p className="mt-2 text-[#666]">{t('hub.noPlatformPilotsText')}</p>
                  </>
                ) : (
                  <>
                    <h3 className="mt-4 text-xl font-bold text-[#444]">{user?.pilotSite ? t('hub.noAvailablePilotsFor', { pilot: user.pilotSite }) : t('hub.noAvailablePilots')}</h3>
                    <p className="mt-2 text-[#666]">{t('hub.noAvailablePilotsText')}</p>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {displayedInitiatives.map((initiative) => (
                  <Link key={initiative.id} to={`/hub/${initiative.id}`} className="group flex min-h-60 cursor-pointer flex-col spice-card p-5 transition-[border-color,box-shadow] duration-200 hover:border-[#f68b2c] hover:shadow-[0_10px_24px_rgba(246,139,44,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ca7428]">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`px-3 py-1 text-[11px] font-bold uppercase ${STATUS_STYLES[initiative.status]}`}>{t(statusKey(initiative.status))}</span>
                      <span className="text-[12px] text-[#777]">{t(statusKey(initiative.visibility))}</span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-[#444] group-hover:text-[#a85f20]">{initiative.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#666]">{initiative.description}</p>
                    <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-[#a85f20]">{t('hub.openPilot')} <ArrowRight size={17} /></span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {renderCrossPilotComparison()}
    </div>
  );
}
