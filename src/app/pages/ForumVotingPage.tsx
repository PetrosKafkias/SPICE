import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, CircleAlert, ExternalLink, Flag, History, Landmark, Link2, MessageSquare, Plus, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { FieldMessage, FormField, FormGrid } from '../components/FormLayout';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { apiRequest, ApiError, jsonBody } from '../lib/api';
import { usePermissions } from '../auth/usePermissions';
import LoadingState from '../components/LoadingState';
import { normalizeRole, roleKey } from '../auth/permissions';
import { statusKey } from '../lib/statusLabel';
import type { TranslationKey } from '../i18n/translations';
import { localizedApiError, localizedFieldErrors } from '../lib/localizedApiError';
import ProposalLifecycle from '../components/ProposalLifecycle';

interface Proposal {
  id: number;
  initiativeId: number | null;
  phaseNumber: number;
  itemType: string;
  category: string | null;
  workflowStepId: number | null;
  votingMode: 'support' | 'binary';
  votingOpensAt: string | null;
  linkedOutput: { type: string; id: string | null; label: string; url: string | null } | null;
  sourceProposalId: number | null;
  history: Array<{ id: number; phaseNumber: number; eventType: string; fromStatus: string | null; toStatus: string | null; note: string | null; createdAt: string; actorName: string | null; actorRole: string | null }>;
  tags: string[];
  status: string;
  workflowStatus: string;
  participationSummary: string | null;
  votingClosesAt: string | null;
  title: string;
  description: string;
  supportPct: number;
  totalVotes: number;
  author: string;
  authorRole: string;
  authorAvatar: string | null;
  createdAt: string;
  comments: number;
  upvotes: number;
  downvotes: number;
  officialResponse?: string;
  version: number;
  userVote: null | 'up' | 'down';
  moderationStatus: 'visible' | 'locked';
}

interface ForumContext {
  initiativeId: number;
  title: string;
  pilotSlug: string;
  municipality: string | null;
  location: string | null;
  currentPhaseNumber: number;
  currentPhase: { phaseNumber: number; title: string; description: string; status: string } | null;
  phases: Array<{ phaseNumber: number; title: string; description: string; status: string }>;
  access: { canView: boolean; canParticipate: boolean; canManage: boolean; canFacilitate: boolean };
  availablePilots: Array<{ id: number; title: string; pilotSlug: string; municipality: string | null; currentPhaseNumber: number }>;
}

interface ForumFacets {
  itemTypes: string[];
  categories: string[];
  statuses: string[];
}

interface CommentItem {
  id: number;
  body: string;
  createdAt: string;
  author: string;
  authorRole: string;
  authorAvatar: string | null;
  parentCommentId: number | null;
}

const TOPICS: Array<{ value: string; key: TranslationKey }> = [
  { value: 'Greenery & Nature', key: 'forum.topic.greenery' },
  { value: 'Accessibility', key: 'forum.topic.accessibility' },
  { value: 'Safety & Lighting', key: 'forum.topic.safety' },
  { value: 'Play & Sport', key: 'forum.topic.play' },
  { value: 'Seating & Rest', key: 'forum.topic.seating' },
];

const STATUS_BADGE: Record<string, string> = {
  'Under Review': 'bg-[#e8f0f7] text-[#1b3a5c]',
  Open: 'bg-[#e8f5ef] text-[#2e6e45]',
  Implemented: 'bg-[#e8f5ef] text-[#2e6e45]',
  Rejected: 'bg-[#fde8e8] text-[#c0392b]',
  'Needs Revision': 'bg-[#fff5d9] text-[#7a5b00]',
};

function ForumAvatar({ src, name, size = 'sm' }: { src: string | null; name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return <span className={`grid flex-none place-items-center overflow-hidden rounded-full border border-[#ca7428] bg-[#fff0e2] font-bold text-[#ca7428] ${size === 'md' ? 'h-10 w-10 text-[12px]' : 'h-8 w-8 text-[10px]'}`}>{src ? <img src={src} alt="" className="h-full w-full object-cover"/> : <span aria-hidden="true">{initials}</span>}<span className="sr-only">{name}</span></span>;
}

function SignInPrompt({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-start gap-3 border-l-4 border-[#f68b2c] bg-[#fff4e9] p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[14px] font-semibold text-[#444]">{t('forum.signInPrompt')}</p>
      <button type="button" onClick={onSignIn} className="cursor-pointer bg-[#f68b2c] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#e07a20]">{t('auth.signIn')}</button>
    </div>
  );
}

export default function ForumVotingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { t, formatDate } = useI18n();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [context, setContext] = useState<ForumContext | null>(null);
  const [facets, setFacets] = useState<ForumFacets>({ itemTypes: [], categories: [], statuses: [] });
  const [phaseScope, setPhaseScope] = useState<'current' | 'all' | 'previous'>('current');
  const [topicFilter, setTopicFilter] = useState('all');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [votingFilter, setVotingFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, CommentItem[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<number, CommentItem | null>>({});
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalForm, setProposalForm] = useState({ title: '', description: '', topic: '', itemType: 'proposal', votingMode: 'support', evidenceLabel: '', evidenceUrl: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [proposalAttempted, setProposalAttempted] = useState(false);
  const [proposalShake, setProposalShake] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [decisionForm, setDecisionForm] = useState<{ proposalId: number; status: string; rationale: string } | null>(null);
  const [workflowForm, setWorkflowForm] = useState<{ proposalId: number; nextStatus: string; reviewNotes: string; participationSummary: string; votingClosesAt: string } | null>(null);
  const [reportForm, setReportForm] = useState<{ proposalId: number; reason: string; details: string } | null>(null);

  const missingProposalFields = useMemo(() => [
    proposalForm.title.trim().length < 8 ? t('forum.proposalTitle') : null,
    !proposalForm.topic ? t('forum.selectTopic') : null,
    proposalForm.description.trim().length < 20 ? t('forum.proposalDescription') : null,
  ].filter((field): field is string => Boolean(field)), [proposalForm, t]);
  const proposalComplete = missingProposalFields.length === 0;

  const signIn = () => navigate(`/signin?reason=auth&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`);

  const loadProposals = useCallback(async () => {
    setStatus('loading');
    try {
      const routeParams = new URLSearchParams(location.search);
      const query = new URLSearchParams({ phaseScope });
      const initiative = routeParams.get('initiative');
      const proposal = routeParams.get('proposal');
      if (initiative) query.set('initiative', initiative);
      if (proposal) query.set('proposal', proposal);
      if (topicFilter !== 'all') query.set('category', topicFilter);
      if (itemTypeFilter !== 'all') query.set('itemType', itemTypeFilter);
      if (statusFilter !== 'all') query.set('status', statusFilter);
      if (votingFilter !== 'all') query.set('voting', votingFilter);
      const result = await apiRequest<{ proposals: Proposal[]; context: ForumContext; facets: ForumFacets }>(`/api/forum/proposals?${query.toString()}`);
      setProposals(result.proposals);
      setContext(result.context);
      setFacets(result.facets ?? { itemTypes: [], categories: [], statuses: [] });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [itemTypeFilter, location.search, phaseScope, statusFilter, topicFilter, votingFilter]);

  useEffect(() => { void loadProposals(); }, [loadProposals, user?.id]);

  useEffect(() => {
    if (status !== 'ready') return;
    const proposalId = Number(new URLSearchParams(location.search).get('proposal'));
    if (!proposalId || !proposals.some((proposal) => proposal.id === proposalId)) return;
    setExpandedId(proposalId);
    if (!comments[proposalId]) {
      void apiRequest<{ comments: CommentItem[] }>(`/api/forum/proposals/${proposalId}/comments`)
        .then((result) => setComments((current) => ({ ...current, [proposalId]: result.comments })))
        .catch(() => toast.error(t('common.error')));
    }
    window.setTimeout(() => document.getElementById(`proposal-${proposalId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [comments, location.search, proposals, status, t]);

  const statusOptions = useMemo(() => ['all', ...facets.statuses], [facets.statuses]);

  const openProposalForm = () => {
    if (!user) { signIn(); return; }
    if (!context?.access.canParticipate) { toast.error(t('forum.participationRestricted')); return; }
    setShowProposalForm(true);
  };

  const switchPilot = (initiativeId: number) => {
    const params = new URLSearchParams(location.search);
    params.set('initiative', String(initiativeId));
    params.delete('proposal');
    setExpandedId(null);
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const submitProposal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!proposalComplete) {
      setProposalAttempted(true);
      setFormErrors({
        ...(proposalForm.title.trim().length < 8 ? { title: t('forum.titleRequirement') } : {}),
        ...(!proposalForm.topic ? { tags: t('forum.topicRequirement') } : {}),
        ...(proposalForm.description.trim().length < 20 ? { description: t('forum.descriptionRequirement') } : {}),
      });
      setProposalShake(false);
      window.requestAnimationFrame(() => setProposalShake(true));
      window.setTimeout(() => setProposalShake(false), 300);
      return;
    }
    setSubmitting(true);
    setFormErrors({});
    try {
      const result = await apiRequest<{ proposal: Proposal }>('/api/forum/proposals', {
        method: 'POST',
        body: jsonBody({
          initiativeId: context?.initiativeId,
          title: proposalForm.title,
          description: proposalForm.description,
          tags: proposalForm.topic ? [proposalForm.topic] : [],
          category: proposalForm.topic,
          itemType: proposalForm.itemType,
          votingMode: proposalForm.votingMode,
          linkedOutput: proposalForm.evidenceLabel.trim() ? { type: 'resource', label: proposalForm.evidenceLabel.trim(), url: proposalForm.evidenceUrl.trim() || null } : undefined,
        }),
      });
      setProposals((current) => [result.proposal, ...current]);
      setProposalForm({ title: '', description: '', topic: '', itemType: 'proposal', votingMode: 'support', evidenceLabel: '', evidenceUrl: '' });
      setProposalAttempted(false);
      setShowProposalForm(false);
      toast.success(t('forum.published'));
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.status === 401) signIn();
      else {
        setFormErrors(localizedFieldErrors(t, apiError.fieldErrors));
        toast.error(localizedApiError(t, apiError));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const vote = async (proposal: Proposal, direction: 'up' | 'down') => {
    if (!user) { signIn(); return; }
    try {
      const result = await apiRequest<Pick<Proposal, 'userVote' | 'upvotes' | 'downvotes' | 'totalVotes' | 'supportPct'>>(`/api/forum/proposals/${proposal.id}/vote`, {
        method: 'POST', body: jsonBody({ direction }),
      });
      setProposals((current) => current.map((item) => item.id === proposal.id ? { ...item, ...result } : item));
      toast.success(t('forum.voteUpdated'));
    } catch (caught) {
      if ((caught as ApiError).status === 401) signIn();
      else toast.error(t('common.error'));
    }
  };

  const toggleComments = async (proposalId: number) => {
    if (expandedId === proposalId) { setExpandedId(null); return; }
    setExpandedId(proposalId);
    if (!comments[proposalId]) {
      try {
        const result = await apiRequest<{ comments: CommentItem[] }>(`/api/forum/proposals/${proposalId}/comments`);
        setComments((current) => ({ ...current, [proposalId]: result.comments }));
      } catch { toast.error(t('common.error')); }
    }
  };

  const postComment = async (proposalId: number) => {
    if (!user) { signIn(); return; }
    const body = (commentDrafts[proposalId] || '').trim();
    if (!body) return;
    try {
      const result = await apiRequest<{ comment: CommentItem }>(`/api/forum/proposals/${proposalId}/comments`, { method: 'POST', body: jsonBody({ body, parentCommentId: replyingTo[proposalId]?.id || null }) });
      setComments((current) => ({ ...current, [proposalId]: [...(current[proposalId] || []), result.comment] }));
      setCommentDrafts((current) => ({ ...current, [proposalId]: '' }));
      setReplyingTo((current) => ({ ...current, [proposalId]: null }));
      setProposals((current) => current.map((proposal) => proposal.id === proposalId ? { ...proposal, comments: proposal.comments + 1 } : proposal));
      toast.success(t('forum.commentPublished'));
    } catch (caught) {
      if ((caught as ApiError).status === 401) signIn();
      else toast.error(localizedApiError(t, caught));
    }
  };

  const submitOfficialDecision = async (proposal: Proposal) => {
    if (!decisionForm || decisionForm.proposalId !== proposal.id) return;
    if (decisionForm.rationale.trim().length < 10) {
      toast.error(t('forum.rationaleRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<{ proposal: Proposal }>(`/api/forum/proposals/${proposal.id}/status`, {
        method: 'PATCH',
        body: jsonBody({ status: decisionForm.status, rationale: decisionForm.rationale, version: proposal.version }),
      });
      setProposals((current) => current.map((item) => item.id === proposal.id ? result.proposal : item));
      setDecisionForm(null);
      toast.success(t('forum.decisionRecorded'));
    } catch (caught) {
      toast.error(localizedApiError(t, caught, 'forum.decisionSaveFailed'));
      if ((caught as ApiError).status === 409) void loadProposals();
    } finally {
      setSubmitting(false);
    }
  };

  const workflowActions = (proposal: Proposal): Array<{ status: string; label: TranslationKey; primary?: boolean }> => {
    const role = normalizeRole(user?.role || '');
    const status = proposal.workflowStatus;
    if (role === 'facilitator') {
      if (status === 'draft') return [{ status: 'municipality_review', label: 'forum.workflow.submitForReview', primary: true }];
      if (status === 'needs_revision') return [{ status: 'draft', label: 'forum.workflow.returnToDraft' }, { status: 'municipality_review', label: 'forum.workflow.resubmitForReview', primary: true }];
      if (status === 'voting_open') return [{ status: 'participation_closed', label: 'forum.workflow.closeParticipation', primary: true }];
      if (status === 'participation_closed') return [{ status: 'decision_pending', label: 'forum.workflow.requestDecision', primary: true }];
    }
    if (role === 'municipality') {
      if (status === 'draft') return [{ status: 'municipality_review', label: 'forum.workflow.startReview', primary: true }];
      if (status === 'municipality_review') return [{ status: 'needs_revision', label: 'forum.workflow.requestRevision' }, { status: 'published', label: 'forum.workflow.publishProposal', primary: true }];
      if (status === 'needs_revision') return [{ status: 'draft', label: 'forum.workflow.returnToDraft' }];
      if (status === 'published') return [{ status: 'discussion_open', label: 'forum.workflow.openDiscussion', primary: true }];
      if (status === 'discussion_open') return [{ status: 'voting_open', label: 'forum.workflow.openVoting', primary: true }, { status: 'participation_closed', label: 'forum.workflow.closeParticipation' }];
      if (status === 'voting_open') return [{ status: 'participation_closed', label: 'forum.workflow.closeParticipation', primary: true }];
      if (status === 'participation_closed') return [{ status: 'decision_pending', label: 'forum.workflow.requestDecision', primary: true }];
    }
    return [];
  };

  const transitionProposal = async (proposal: Proposal, nextStatus: string, details: { reviewNotes?: string; participationSummary?: string; votingClosesAt?: string }) => {
    setSubmitting(true);
    try {
      const result = await apiRequest<{ proposal: Proposal }>(`/api/forum/proposals/${proposal.id}/workflow`, {
        method: 'PATCH',
        body: jsonBody({ workflowStatus: nextStatus, version: proposal.version, ...details }),
      });
      setProposals((current) => current.map((item) => item.id === proposal.id ? result.proposal : item));
      setWorkflowForm(null);
      toast.success(t('forum.workflow.updated'));
    } catch (caught) {
      toast.error(localizedApiError(t, caught, 'forum.workflow.updateFailed'));
      if ((caught as ApiError).status === 409) void loadProposals();
    } finally {
      setSubmitting(false);
    }
  };

  const beginWorkflowTransition = (proposal: Proposal, nextStatus: string) => {
    if (!['needs_revision', 'voting_open', 'decision_pending'].includes(nextStatus)) {
      void transitionProposal(proposal, nextStatus, {});
      return;
    }
    setWorkflowForm({
      proposalId: proposal.id,
      nextStatus,
      reviewNotes: '',
      participationSummary: proposal.participationSummary || '',
      votingClosesAt: proposal.votingClosesAt ? proposal.votingClosesAt.slice(0, 16) : '',
    });
  };

  const submitReport = async (proposalId: number) => {
    if (!user) { signIn(); return; }
    if (!reportForm || reportForm.proposalId !== proposalId || !reportForm.reason) return;
    try {
      await apiRequest(`/api/forum/proposals/${proposalId}/report`, {
        method: 'POST',
        body: jsonBody({ reason: reportForm.reason, details: reportForm.details }),
      });
      setReportForm(null);
      toast.success(t('forum.reportSubmitted'));
    } catch (caught) {
      toast.error(localizedApiError(t, caught));
    }
  };

  const votingAvailable = (proposal: Proposal) => Boolean(
    context?.access.canParticipate
    && proposal.moderationStatus !== 'locked'
    && (proposal.votingMode === 'support'
      ? ['published', 'discussion_open', 'voting_open'].includes(proposal.workflowStatus)
      : proposal.workflowStatus === 'voting_open'),
  );

  return (
    <SpicePublicShell>
      <StandardPageHeader icon={MessageSquare} eyebrow={t('forum.community')} title={t('forum.title')} description={t('forum.subtitle')} actions={<button type="button" onClick={openProposalForm} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]"><Plus size={18} aria-hidden="true" />{t('forum.submit')}</button>} />
      <div className="spice-page spice-wide-page flex flex-col gap-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {context && (
          <section className="border-2 border-[#bfc0c5] bg-white p-5 sm:p-6" aria-labelledby="forum-context-title">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase text-[#b85f17]"><Landmark size={17} aria-hidden="true" />{t('forum.currentPilot')}</p>
                <h2 id="forum-context-title" className="mt-2 text-[24px] font-bold text-[#444]">{context.municipality || context.title}</h2>
                <p className="mt-2 text-[15px] font-semibold text-[#555]">{t('forum.phaseOf', { number: context.currentPhaseNumber, total: 5, phase: t(`hub.phase${context.currentPhaseNumber}` as TranslationKey) })}</p>
                <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#666]">{t('forum.contextDescription')}</p>
              </div>
              {context.availablePilots.length > 1 && (
                <label className="flex min-w-[240px] flex-col gap-2 text-[13px] font-bold text-[#444]">
                  {t('forum.switchPilot')}
                  <span className="relative">
                    <select value={context.initiativeId} onChange={(event) => switchPilot(Number(event.target.value))} className="min-h-12 w-full cursor-pointer appearance-none border-2 border-[#999] bg-white px-4 pr-10 text-[14px] outline-none hover:border-[#ca7428] focus:border-[#ca7428]">
                      {context.availablePilots.map((pilot) => <option key={pilot.id} value={pilot.id}>{pilot.municipality || pilot.title}</option>)}
                    </select>
                    <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  </span>
                </label>
              )}
            </div>
          </section>
        )}

        {!user && <SignInPrompt onSignIn={signIn} />}
        {user && context && !context.access.canParticipate && <div className="flex items-start gap-3 border-l-4 border-[#ca7428] bg-[#fff4e9] p-4" role="status"><CircleAlert size={19} className="mt-0.5 flex-none" aria-hidden="true" /><p className="text-[14px] font-semibold text-[#5d3a1c]">{t('forum.participationRestricted')}</p></div>}

        <div className="grid gap-4 border-b-2 border-[#dedee1] pb-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-[22px] font-bold text-[#444]">{t(`forum.scope.${phaseScope}Title` as TranslationKey)}</h2>
            <p className="mt-1 text-[14px] text-[#666]">{t(`forum.scope.${phaseScope}Description` as TranslationKey)}</p>
          </div>
          <div role="tablist" aria-label={t('forum.phaseNavigation')} className="grid min-h-12 grid-cols-3 bg-[#e9e9eb] p-1">
            {(['current', 'all', 'previous'] as const).map((scope) => <button key={scope} type="button" role="tab" aria-selected={phaseScope === scope} onClick={() => setPhaseScope(scope)} className={`min-h-10 cursor-pointer px-4 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428] ${phaseScope === scope ? 'bg-white text-[#b85f17] shadow-sm' : 'text-[#555] hover:bg-[#f7f7f7]'}`}>{t(`forum.scope.${scope}` as TranslationKey)}</button>)}
          </div>
        </div>

        {showProposalForm && user && context?.access.canParticipate && (
          <form onSubmit={submitProposal} className={`border-2 border-[#f68b2c] bg-white p-5 shadow-[7px_8px_22px_rgba(0,0,0,0.1)] sm:p-7 ${proposalShake ? 'spice-form-shake' : ''}`} noValidate aria-describedby={proposalAttempted && !proposalComplete ? 'proposal-form-guidance' : undefined}>
            <div className="flex items-start justify-between gap-4"><h2 className="text-[23px] font-bold text-[#444]">{t('forum.submit')}</h2><button type="button" onClick={() => setShowProposalForm(false)} className="grid h-9 w-9 cursor-pointer place-items-center text-[#444] hover:bg-[#f4f4f4]" aria-label={t('common.close')}><X size={19} /></button></div>
            <FormGrid className="mt-5 gap-5 md:grid-cols-2">
              <FormField className="gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.proposalTitle')} <span className="text-[#b33a2b]" aria-hidden="true">*</span><span className="sr-only"> ({t('common.required')})</span></span><input required minLength={8} value={proposalForm.title} onChange={(event) => { setProposalForm((current) => ({ ...current, title: event.target.value })); setFormErrors((current) => ({ ...current, title: '' })); }} aria-invalid={Boolean(formErrors.title)} aria-describedby={formErrors.title ? 'proposal-title-error' : undefined} className={`border-2 px-4 py-3 text-[15px] outline-none focus:border-[#ca7428] ${formErrors.title ? 'border-red-600' : 'border-[#b2b2b8]'}`} />{formErrors.title && <FieldMessage id="proposal-title-error" tone="error">{formErrors.title}</FieldMessage>}</FormField>
              <FormField className="gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.selectTopic')} <span className="text-[#b33a2b]" aria-hidden="true">*</span><span className="sr-only"> ({t('common.required')})</span></span><select required value={proposalForm.topic} onChange={(event) => { setProposalForm((current) => ({ ...current, topic: event.target.value })); setFormErrors((current) => ({ ...current, tags: '' })); }} aria-invalid={Boolean(formErrors.tags)} aria-describedby={formErrors.tags ? 'proposal-topic-error' : undefined} className={`cursor-pointer border-2 bg-white px-4 py-3 text-[15px] outline-none focus:border-[#ca7428] ${formErrors.tags ? 'border-red-600' : 'border-[#b2b2b8]'}`}><option value="">{t('forum.selectTopic')}</option>{TOPICS.map((topic) => <option key={topic.value} value={topic.value}>{t(topic.key)}</option>)}</select>{formErrors.tags && <FieldMessage id="proposal-topic-error" tone="error">{formErrors.tags}</FieldMessage>}</FormField>
            </FormGrid>
            <FormField className="mt-5 gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.proposalDescription')} <span className="text-[#b33a2b]" aria-hidden="true">*</span><span className="sr-only"> ({t('common.required')})</span></span><textarea required minLength={20} value={proposalForm.description} onChange={(event) => { setProposalForm((current) => ({ ...current, description: event.target.value })); setFormErrors((current) => ({ ...current, description: '' })); }} rows={4} aria-invalid={Boolean(formErrors.description)} aria-describedby={formErrors.description ? 'proposal-description-error' : undefined} className={`resize-y border-2 px-4 py-3 text-[15px] outline-none focus:border-[#ca7428] ${formErrors.description ? 'border-red-600' : 'border-[#b2b2b8]'}`} />{formErrors.description && <FieldMessage id="proposal-description-error" tone="error">{formErrors.description}</FieldMessage>}</FormField>
            <FormGrid className="mt-5 gap-5 md:grid-cols-2">
              <FormField className="gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.form.itemType')}</span><select value={proposalForm.itemType} onChange={(event) => setProposalForm((current) => ({ ...current, itemType: event.target.value }))} className="min-h-12 cursor-pointer border-2 border-[#b2b2b8] bg-white px-4 outline-none focus:border-[#ca7428]">{['issue', 'proposal', 'design_alternative', 'finding', 'workshop_outcome', 'prototype'].map((type) => <option key={type} value={type}>{t(`forum.item.${type}` as TranslationKey)}</option>)}</select></FormField>
              <FormField className="gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.form.votingMode')}</span><select value={proposalForm.votingMode} onChange={(event) => setProposalForm((current) => ({ ...current, votingMode: event.target.value }))} className="min-h-12 cursor-pointer border-2 border-[#b2b2b8] bg-white px-4 outline-none focus:border-[#ca7428]"><option value="support">{t('forum.voting.support')}</option><option value="binary">{t('forum.voting.binary')}</option></select></FormField>
            </FormGrid>
            <FormGrid className="mt-5 gap-5 md:grid-cols-2">
              <FormField className="gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.form.evidenceLabel')}</span><input value={proposalForm.evidenceLabel} onChange={(event) => setProposalForm((current) => ({ ...current, evidenceLabel: event.target.value }))} className="min-h-12 border-2 border-[#b2b2b8] px-4 outline-none focus:border-[#ca7428]" /></FormField>
              <FormField className="gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.form.evidenceUrl')}</span><input type="url" value={proposalForm.evidenceUrl} onChange={(event) => setProposalForm((current) => ({ ...current, evidenceUrl: event.target.value }))} className="min-h-12 border-2 border-[#b2b2b8] px-4 outline-none focus:border-[#ca7428]" /></FormField>
            </FormGrid>
            {proposalAttempted && !proposalComplete && <div id="proposal-form-guidance" className="mt-5 flex items-start gap-3 border-l-4 border-[#b33a2b] bg-[#fff3f1] p-3 text-[13px] text-[#5a2923]" role="alert" aria-live="assertive"><CircleAlert size={19} className="mt-0.5 flex-none" aria-hidden="true" /><div><p className="font-bold">{t('forum.incompleteTitle')}</p><p className="mt-0.5">{t('forum.incompleteMessage', { fields: missingProposalFields.join(', ') })}</p></div></div>}
            <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setShowProposalForm(false)} className="cursor-pointer border-2 border-[#444] px-5 py-3 text-[14px] font-semibold">{t('common.cancel')}</button><button type="submit" disabled={submitting} aria-disabled={!proposalComplete || submitting} className={`px-5 py-3 text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444] ${proposalComplete ? 'cursor-pointer bg-[#f68b2c] text-white hover:bg-[#e07a20]' : 'cursor-not-allowed bg-[#d9d9d9] text-[#666]'} disabled:cursor-wait disabled:opacity-60`}>{submitting ? t('common.saving') : t('forum.publish')}</button></div>
          </form>
        )}

        <div className="flex flex-wrap items-center gap-3" aria-label={t('forum.filters')}>
          <label className="relative"><span className="sr-only">{t('forum.allTopics')}</span><select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)} className="min-h-11 cursor-pointer appearance-none border border-[#999] bg-white px-4 py-2 pr-9 text-[14px] text-[#444] outline-none transition-colors hover:border-[#ca7428]"><option value="all">{t('forum.allTopics')}</option>{TOPICS.map((topic) => <option key={topic.value} value={topic.value}>{t(topic.key)}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
          <label className="relative"><span className="sr-only">{t('forum.filter.itemType')}</span><select value={itemTypeFilter} onChange={(event) => setItemTypeFilter(event.target.value)} className="min-h-11 cursor-pointer appearance-none border border-[#999] bg-white px-4 py-2 pr-9 text-[14px] text-[#444] outline-none transition-colors hover:border-[#ca7428]"><option value="all">{t('forum.filter.allTypes')}</option>{facets.itemTypes.map((type) => <option key={type} value={type}>{t(`forum.item.${type}` as TranslationKey)}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
          <label className="relative"><span className="sr-only">{t('forum.allStatuses')}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 cursor-pointer appearance-none border border-[#999] bg-white px-4 py-2 pr-9 text-[14px] text-[#444] outline-none transition-colors hover:border-[#ca7428]">{statusOptions.map((item) => <option key={item} value={item}>{item === 'all' ? t('forum.allStatuses') : t(statusKey(item))}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
          <label className="relative"><span className="sr-only">{t('forum.filter.voting')}</span><select value={votingFilter} onChange={(event) => setVotingFilter(event.target.value)} className="min-h-11 cursor-pointer appearance-none border border-[#999] bg-white px-4 py-2 pr-9 text-[14px] text-[#444] outline-none transition-colors hover:border-[#ca7428]"><option value="all">{t('forum.filter.allVoting')}</option><option value="support">{t('forum.voting.support')}</option><option value="binary">{t('forum.voting.binary')}</option><option value="open">{t('forum.voting.open')}</option><option value="closed">{t('forum.voting.closed')}</option></select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
          {(topicFilter !== 'all' || itemTypeFilter !== 'all' || statusFilter !== 'all' || votingFilter !== 'all') && <button type="button" onClick={() => { setTopicFilter('all'); setItemTypeFilter('all'); setStatusFilter('all'); setVotingFilter('all'); }} className="min-h-11 cursor-pointer px-3 text-[13px] font-bold text-[#a85f20] underline underline-offset-4 hover:text-[#7d4214]">{t('forum.filter.reset')}</button>}
        </div>

        {status === 'loading' && <LoadingState message={t('common.loading')} minHeight="280px" />}
        {status === 'error' && <div className="border-l-4 border-red-600 bg-red-50 p-5" role="alert"><p className="font-semibold text-red-800">{t('common.error')}</p><button type="button" onClick={loadProposals} className="mt-3 cursor-pointer text-[#ca7428] underline">{t('common.retry')}</button></div>}
        {status === 'ready' && proposals.length === 0 && <div className="spice-card p-10 text-center"><p className="text-[16px] font-semibold text-[#444]">{t(phaseScope === 'current' ? 'forum.noCurrentResults' : phaseScope === 'previous' ? 'forum.noPreviousResults' : 'forum.noResults')}</p>{(topicFilter !== 'all' || itemTypeFilter !== 'all' || statusFilter !== 'all' || votingFilter !== 'all') && <button type="button" onClick={() => { setTopicFilter('all'); setItemTypeFilter('all'); setStatusFilter('all'); setVotingFilter('all'); }} className="mt-3 cursor-pointer text-[14px] font-semibold text-[#ca7428] underline">{t('forum.clearFilters')}</button>}</div>}

        {status === 'ready' && proposals.map((proposal) => (
          <article id={`proposal-${proposal.id}`} key={proposal.id} className="scroll-mt-24 overflow-hidden border-2 border-[#f68b2c] bg-white shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="bg-[#fff0e1] px-3 py-1 text-[12px] font-bold text-[#a85f20]">{t('forum.phaseLabel', { number: proposal.phaseNumber, phase: t(`hub.phase${proposal.phaseNumber}` as TranslationKey) })}</span>
                <span className="bg-[#f0f0f2] px-3 py-1 text-[12px] font-semibold text-[#444]">{t(`forum.item.${proposal.itemType}` as TranslationKey)}</span>
                {(proposal.category || proposal.tags[0]) && <span className="bg-[#e8f5ef] px-3 py-1 text-[12px] font-semibold text-[#444]">{t(TOPICS.find((topic) => topic.value === (proposal.category || proposal.tags[0]))?.key || 'forum.selectTopic')}</span>}
                <span className={`px-3 py-1 text-[12px] font-semibold ${STATUS_BADGE[proposal.status] || 'bg-gray-100 text-gray-600'}`}>{t(statusKey(proposal.workflowStatus || proposal.status))}</span>
                <span className="border border-[#bfc0c5] px-3 py-1 text-[12px] font-semibold text-[#555]">{t(`forum.voting.${proposal.votingMode}` as TranslationKey)}</span>
                {proposal.moderationStatus === 'locked' && <span className="bg-[#fff0e1] px-3 py-1 text-[12px] font-semibold text-[#8f501b]">{t('forum.locked')}</span>}
              </div>
              <div className="flex gap-4 sm:gap-5">
                <div className="flex flex-shrink-0 flex-col items-center gap-2">
                  <button type="button" onClick={() => vote(proposal, 'up')} disabled={!votingAvailable(proposal)} className={`grid h-10 w-10 place-items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428] disabled:cursor-not-allowed disabled:opacity-40 ${votingAvailable(proposal) ? 'cursor-pointer' : ''} ${proposal.userVote === 'up' ? 'bg-[#eaf3ea] text-[#2e6e45]' : 'text-[#777] hover:bg-[#f4f4f4]'}`} title={proposal.votingMode === 'support' ? t('forum.supportProposal') : t('forum.voteFor')} aria-pressed={proposal.userVote === 'up'}><ThumbsUp size={20} /></button>
                  <span className="text-[16px] font-bold text-[#444]">{proposal.upvotes}</span>
                  {proposal.votingMode === 'binary' && <button type="button" onClick={() => vote(proposal, 'down')} disabled={!votingAvailable(proposal)} className={`grid h-10 w-10 place-items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428] disabled:cursor-not-allowed disabled:opacity-40 ${votingAvailable(proposal) ? 'cursor-pointer' : ''} ${proposal.userVote === 'down' ? 'bg-red-50 text-red-600' : 'text-[#777] hover:bg-[#f4f4f4]'}`} title={t('forum.opposeProposal')} aria-pressed={proposal.userVote === 'down'}><ThumbsDown size={20} /></button>}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-bold text-[#444]">{proposal.title}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{proposal.description}</p>
                  {proposal.linkedOutput && <a href={proposal.linkedOutput.url || '#'} onClick={(event) => { if (!proposal.linkedOutput?.url) event.preventDefault(); }} className={`mt-4 flex items-center gap-3 border-2 border-[#dedee1] bg-[#fafafa] p-3 text-[13px] font-semibold text-[#555] ${proposal.linkedOutput.url ? 'cursor-pointer hover:border-[#ca7428] hover:text-[#a85f20]' : ''}`}><Link2 size={18} className="flex-none text-[#ca7428]" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase text-[#888]">{t('forum.linkedEvidence')}</span>{proposal.linkedOutput.label}</span>{proposal.linkedOutput.url && <ExternalLink size={16} aria-hidden="true" />}</a>}
                  <div className="mt-4"><p className="mb-1.5 text-[12px] text-[#777]">{t('forum.support', { percent: proposal.supportPct, count: proposal.totalVotes })}</p><div className="h-1.5 w-full bg-gray-100"><div className="h-1.5 bg-[#2e6e45]" style={{ width: `${proposal.supportPct}%` }} /></div></div>
                  <ProposalLifecycle status={proposal.workflowStatus || proposal.status} />
                  {proposal.history.length > 0 && <details className="mt-4 border-t border-[#dedee1] pt-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-bold text-[#a85f20]"><History size={17} aria-hidden="true" />{t('forum.evolutionHistory')}<ChevronDown size={15} className="ml-1" aria-hidden="true" /></summary><ol className="mt-3 grid gap-2 border-l-2 border-[#e7c8aa] pl-4">{proposal.history.map((event) => <li key={event.id} className="text-[12px] leading-relaxed text-[#666]"><span className="font-bold text-[#444]">{t(`forum.history.${event.eventType}` as TranslationKey)}</span> · {t('forum.phaseShort', { number: event.phaseNumber })} · {formatDate(event.createdAt, { dateStyle: 'medium' })}{event.note && <span className="block mt-0.5">{event.note}</span>}</li>)}</ol></details>}
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><ForumAvatar src={proposal.authorAvatar} name={proposal.author} size="md"/><p className="text-[12px] text-[#777]">{t('forum.by', { name: proposal.author, role: t(roleKey(normalizeRole(proposal.authorRole))) })} - {formatDate(proposal.createdAt, { dateStyle: 'medium' })}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => user ? setReportForm({ proposalId: proposal.id, reason: '', details: '' }) : signIn()} className="flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-gray-300 px-3 py-2 text-[13px] font-medium text-[#444] hover:bg-gray-50"><Flag size={15} />{t('forum.report')}</button><button type="button" onClick={() => toggleComments(proposal.id)} className="flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-gray-300 px-4 py-2 text-[13px] font-medium text-[#444] hover:bg-gray-50" aria-expanded={expandedId === proposal.id}><MessageSquare size={15} />{proposal.comments} {t('forum.comments')}<ChevronDown size={14} className={`transition-transform ${expandedId === proposal.id ? 'rotate-180' : ''}`} /></button></div></div>
                </div>
              </div>

              {proposal.moderationStatus === 'locked' && <div className="mt-5 flex items-start gap-3 border-l-4 border-[#ca7428] bg-[#fff4e9] p-4 text-sm text-[#65401f]" role="status"><CircleAlert size={18} className="mt-0.5 flex-none" /><p>{t('forum.lockedMessage')}</p></div>}

              {workflowActions(proposal).length > 0 && (
                <section className="mt-5 border-2 border-[#ca7428] bg-[#fffaf5] p-4" aria-label={t('forum.workflow.actions')}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><h3 className="font-bold text-[#444]">{t('forum.workflow.actions')}</h3><p className="mt-1 text-sm text-[#666]">{t('forum.workflow.actionHelp')}</p></div>
                    <div className="flex flex-wrap gap-2">{workflowActions(proposal).map((action) => <button key={action.status} type="button" disabled={submitting} onClick={() => beginWorkflowTransition(proposal, action.status)} className={`min-h-11 cursor-pointer border-2 px-4 text-sm font-bold disabled:cursor-wait disabled:opacity-60 ${action.primary ? 'border-[#f68b2c] bg-[#f68b2c] text-white hover:bg-[#df781f]' : 'border-[#ca7428] bg-white text-[#a85f20] hover:bg-[#fff0e1]'}`}>{t(action.label)}</button>)}</div>
                  </div>
                  {workflowForm?.proposalId === proposal.id && (
                    <div className="mt-4 border-t border-[#e7c8aa] pt-4">
                      {workflowForm.nextStatus === 'needs_revision' && <FormField className="gap-2 text-sm font-bold"><span>{t('forum.workflow.reviewNotes')} <span className="text-red-700" aria-hidden="true">*</span></span><textarea rows={3} value={workflowForm.reviewNotes} onChange={(event) => setWorkflowForm({ ...workflowForm, reviewNotes: event.target.value })} className="border-2 border-[#bfc0c5] bg-white px-3 py-2" placeholder={t('forum.workflow.reviewNotesPlaceholder')} /></FormField>}
                      {workflowForm.nextStatus === 'voting_open' && <FormField className="gap-2 text-sm font-bold"><span>{t('forum.workflow.votingClosesAt')}</span><input type="datetime-local" value={workflowForm.votingClosesAt} onChange={(event) => setWorkflowForm({ ...workflowForm, votingClosesAt: event.target.value })} className="min-h-12 border-2 border-[#bfc0c5] bg-white px-3" /></FormField>}
                      {workflowForm.nextStatus === 'decision_pending' && <FormField className="gap-2 text-sm font-bold"><span>{t('forum.workflow.participationSummary')} <span className="text-red-700" aria-hidden="true">*</span></span><textarea rows={4} value={workflowForm.participationSummary} onChange={(event) => setWorkflowForm({ ...workflowForm, participationSummary: event.target.value })} className="border-2 border-[#bfc0c5] bg-white px-3 py-2" placeholder={t('forum.workflow.participationSummaryPlaceholder')} /></FormField>}
                      <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setWorkflowForm(null)} className="min-h-11 cursor-pointer border-2 border-[#444] bg-white px-4 font-bold">{t('common.cancel')}</button><button type="button" disabled={submitting || (workflowForm.nextStatus === 'needs_revision' && workflowForm.reviewNotes.trim().length < 10) || (workflowForm.nextStatus === 'decision_pending' && workflowForm.participationSummary.trim().length < 20)} onClick={() => void transitionProposal(proposal, workflowForm.nextStatus, { reviewNotes: workflowForm.reviewNotes, participationSummary: workflowForm.participationSummary, votingClosesAt: workflowForm.votingClosesAt || undefined })} className="min-h-11 cursor-pointer bg-[#f68b2c] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{t('common.save')}</button></div>
                    </div>
                  )}
                </section>
              )}

              {reportForm?.proposalId === proposal.id && <section className="mt-5 border-2 border-[#ca7428] bg-[#fffaf5] p-4" aria-label={t('forum.reportTitle')}><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#444]">{t('forum.reportTitle')}</h3><button type="button" onClick={() => setReportForm(null)} className="grid h-9 w-9 cursor-pointer place-items-center hover:bg-white" aria-label={t('common.close')}><X size={18} /></button></div><FormGrid className="mt-4 gap-4 md:grid-cols-2"><FormField className="gap-2 text-sm font-bold"><span>{t('forum.reportReason')} <span className="text-red-700" aria-hidden="true">*</span></span><select required value={reportForm.reason} onChange={(event) => setReportForm({ ...reportForm, reason: event.target.value })} className="min-h-11 cursor-pointer border-2 border-[#bfc0c5] bg-white px-3"><option value="">{t('forum.reportReason')}</option><option value="spam">{t('forum.report.spam')}</option><option value="abuse">{t('forum.report.abuse')}</option><option value="misinformation">{t('forum.report.misinformation')}</option><option value="privacy">{t('forum.report.privacy')}</option><option value="other">{t('forum.report.other')}</option></select></FormField><FormField className="gap-2 text-sm font-bold"><span>{t('forum.reportDetails')}</span><textarea rows={2} value={reportForm.details} onChange={(event) => setReportForm({ ...reportForm, details: event.target.value })} className="border-2 border-[#bfc0c5] bg-white px-3 py-2" /></FormField></FormGrid><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setReportForm(null)} className="min-h-11 cursor-pointer border-2 border-[#444] bg-white px-4 font-bold">{t('common.cancel')}</button><button type="button" disabled={!reportForm.reason} onClick={() => void submitReport(proposal.id)} className="min-h-11 cursor-pointer bg-[#f68b2c] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{t('forum.report')}</button></div></section>}

              {proposal.officialResponse && <div className="mt-5 flex items-start gap-3 bg-[#f1f1f1] p-4"><Building2 size={19} className="mt-0.5 flex-shrink-0 text-[#777]" /><div><p className="text-[13px] font-semibold text-[#444]">{t('forum.officialResponse')}</p><p className="mt-1 text-[13px] leading-relaxed text-[#666]">{proposal.officialResponse}</p></div></div>}

              {can('forum:official-decision') && proposal.workflowStatus === 'decision_pending' && (
                <div className="mt-5 spice-card bg-[#fffaf5] p-4">
                  {decisionForm?.proposalId !== proposal.id ? (
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-[#444]">{t('forum.decisionReview')}</p><p className="mt-1 text-sm text-[#666]">{t('forum.decisionReviewText')}</p></div><button type="button" onClick={() => setDecisionForm({ proposalId: proposal.id, status: 'Implemented', rationale: '' })} className="min-h-11 cursor-pointer border-2 border-[#ca7428] bg-white px-4 font-bold text-[#a85f20]">{t('forum.reviewDecision')}</button></div>
                  ) : (
                    <div className="grid items-start gap-4 md:grid-cols-[220px_1fr_auto]">
                      <label className="flex flex-col gap-2 text-sm font-bold text-[#444]">{t('forum.decisionStatus')}
                        <select value={decisionForm.status} onChange={(event) => setDecisionForm({ ...decisionForm, status: event.target.value })} className="min-h-12 border-2 border-[#bfc0c5] bg-white px-3">{['Implemented', 'Rejected', 'Needs Revision'].map((value) => <option key={value} value={value}>{t(statusKey(value))}</option>)}</select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-bold text-[#444]">{t('forum.publicRationale')} <span className="sr-only">{t('common.required')}</span>
                        <textarea value={decisionForm.rationale} onChange={(event) => setDecisionForm({ ...decisionForm, rationale: event.target.value })} rows={2} className="min-h-12 border-2 border-[#bfc0c5] bg-white px-3 py-2" placeholder={t('forum.rationalePlaceholder')} />
                      </label>
                      <div className="flex gap-2 self-end"><button type="button" onClick={() => setDecisionForm(null)} className="min-h-12 cursor-pointer border-2 border-[#444] bg-white px-3 font-bold">{t('common.cancel')}</button><button type="button" disabled={submitting} onClick={() => void submitOfficialDecision(proposal)} className="min-h-12 cursor-pointer bg-[#f68b2c] px-4 font-bold text-white disabled:opacity-60">{t('common.save')}</button></div>
                    </div>
                  )}
                </div>
              )}

              {expandedId === proposal.id && (
                <section className="mt-5 border-t-2 border-[#e5e5e5] pt-5" aria-label={t('forum.comments')}>
                  {!comments[proposal.id] ? <p className="py-5 text-center text-[13px] text-[#777]">{t('common.loading')}</p> : comments[proposal.id].length === 0 ? <p className="py-5 text-center text-[13px] text-[#777]">{t('notifications.empty')}</p> : <div className="grid gap-3">{comments[proposal.id].map((comment) => <article key={comment.id} className={`flex items-start gap-3 bg-[#f7f7f7] p-4 ${comment.parentCommentId ? 'ml-5 border-l-2 border-[#ca7428] sm:ml-10' : ''}`}><ForumAvatar src={comment.authorAvatar} name={comment.author}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-[12px]"><span className="font-bold text-[#444]">{comment.author}</span><span className="text-[#777]">({t(roleKey(normalizeRole(comment.authorRole)))})</span><span className="text-[#999]">{formatDate(comment.createdAt)}</span></div><p className="mt-2 text-[13px] leading-relaxed text-[#555]">{comment.body}</p>{user && Number(user.id) !== 0 && <button type="button" onClick={() => { setReplyingTo((current) => ({ ...current, [proposal.id]: comment })); document.getElementById(`comment-input-${proposal.id}`)?.focus(); }} className="mt-2 cursor-pointer text-[12px] font-semibold text-[#ca7428] underline underline-offset-3 hover:text-[#9b4e13]">{t('forum.reply')}</button>}</div></article>)}</div>}
                  {proposal.moderationStatus === 'locked' || !['discussion_open', 'voting_open'].includes(proposal.workflowStatus) ? <p className="mt-4 text-sm font-semibold text-[#666]">{t('forum.discussionClosed')}</p> : user && context?.access.canParticipate ? <div className="mt-4">{replyingTo[proposal.id] && <div className="mb-2 flex items-center justify-between gap-3 border-l-4 border-[#ca7428] bg-[#fff4e9] px-3 py-2 text-[12px] font-semibold text-[#555]"><span>{t('forum.replyingTo', { name: replyingTo[proposal.id]?.author || '' })}</span><button type="button" onClick={() => setReplyingTo((current) => ({ ...current, [proposal.id]: null }))} className="grid h-7 w-7 cursor-pointer place-items-center hover:bg-white" aria-label={t('common.cancel')}><X size={15} /></button></div>}<div className="flex flex-col gap-3 sm:flex-row"><label className="flex-1"><span className="sr-only">{t('forum.addComment')}</span><textarea id={`comment-input-${proposal.id}`} value={commentDrafts[proposal.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [proposal.id]: event.target.value }))} rows={2} placeholder={t('forum.addComment')} className="w-full resize-y border-2 border-[#b2b2b8] px-4 py-3 text-[13px] outline-none focus:border-[#ca7428]" /></label><button type="button" onClick={() => postComment(proposal.id)} disabled={!(commentDrafts[proposal.id] || '').trim()} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#e07a20] disabled:cursor-default disabled:opacity-45"><Send size={16} />{t('forum.post')}</button></div></div> : <div className="mt-4">{user ? <p className="border-l-4 border-[#ca7428] bg-[#fff4e9] p-4 text-[13px] font-semibold text-[#5d3a1c]">{t('forum.participationRestricted')}</p> : <SignInPrompt onSignIn={signIn} />}</div>}
                </section>
              )}
            </div>
          </article>
        ))}
      </div>
    </SpicePublicShell>
  );
}
