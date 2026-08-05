import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, CircleAlert, MessageSquare, Plus, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { FieldMessage, FormField, FormGrid } from '../components/FormLayout';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { apiRequest, ApiError, jsonBody } from '../lib/api';

interface Proposal {
  id: number;
  tags: string[];
  status: string;
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
  userVote: null | 'up' | 'down';
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

const TOPICS = ['Greenery & Nature', 'Accessibility', 'Safety & Lighting', 'Play & Sport', 'Seating & Rest'];

const STATUS_BADGE: Record<string, string> = {
  'Under Review': 'bg-[#e8f0f7] text-[#1b3a5c]',
  Open: 'bg-[#e8f5ef] text-[#2e6e45]',
  Implemented: 'bg-[#e8f5ef] text-[#2e6e45]',
  Rejected: 'bg-[#fde8e8] text-[#c0392b]',
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
  const { t, formatDate } = useI18n();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [topicFilter, setTopicFilter] = useState('All topics');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, CommentItem[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<number, CommentItem | null>>({});
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalForm, setProposalForm] = useState({ title: '', description: '', topic: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [proposalAttempted, setProposalAttempted] = useState(false);
  const [proposalShake, setProposalShake] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);

  const missingProposalFields = useMemo(() => [
    proposalForm.title.trim().length < 8 ? t('forum.proposalTitle') : null,
    !proposalForm.topic ? t('forum.selectTopic') : null,
    proposalForm.description.trim().length < 20 ? t('forum.proposalDescription') : null,
  ].filter((field): field is string => Boolean(field)), [proposalForm, t]);
  const proposalComplete = missingProposalFields.length === 0;

  const signIn = () => navigate(`/signin?reason=auth&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`);

  const loadProposals = async () => {
    setStatus('loading');
    try {
      const result = await apiRequest<{ proposals: Proposal[] }>('/api/forum/proposals');
      setProposals(result.proposals);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { void loadProposals(); }, [user?.id]);

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

  const filtered = useMemo(() => proposals.filter((proposal) => {
    const topicMatches = topicFilter === 'All topics' || proposal.tags.includes(topicFilter);
    const statusMatches = statusFilter === 'All statuses' || proposal.status === statusFilter;
    return topicMatches && statusMatches;
  }), [proposals, statusFilter, topicFilter]);

  const statusOptions = useMemo(() => ['All statuses', ...Array.from(new Set(proposals.map((proposal) => proposal.status)))], [proposals]);

  const openProposalForm = () => {
    if (!user) { signIn(); return; }
    setShowProposalForm(true);
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
        body: jsonBody({ title: proposalForm.title, description: proposalForm.description, tags: proposalForm.topic ? [proposalForm.topic] : [] }),
      });
      setProposals((current) => [result.proposal, ...current]);
      setProposalForm({ title: '', description: '', topic: '' });
      setProposalAttempted(false);
      setShowProposalForm(false);
      toast.success(t('forum.published'));
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.status === 401) signIn();
      else {
        setFormErrors(apiError.fieldErrors || {});
        toast.error(apiError.message || t('common.error'));
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
      else toast.error((caught as ApiError).message || t('common.error'));
    }
  };

  return (
    <SpicePublicShell>
      <StandardPageHeader icon={MessageSquare} eyebrow="SPICE community" title={t('forum.title')} description={t('forum.subtitle')} actions={<button type="button" onClick={openProposalForm} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444]"><Plus size={18} aria-hidden="true" />{t('forum.submit')}</button>} />
      <div className="spice-page flex flex-col gap-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {!user && <SignInPrompt onSignIn={signIn} />}

        {showProposalForm && user && (
          <form onSubmit={submitProposal} className={`border-2 border-[#f68b2c] bg-white p-5 shadow-[7px_8px_22px_rgba(0,0,0,0.1)] sm:p-7 ${proposalShake ? 'spice-form-shake' : ''}`} noValidate aria-describedby={proposalAttempted && !proposalComplete ? 'proposal-form-guidance' : undefined}>
            <div className="flex items-start justify-between gap-4"><h2 className="text-[23px] font-bold text-[#444]">{t('forum.submit')}</h2><button type="button" onClick={() => setShowProposalForm(false)} className="grid h-9 w-9 cursor-pointer place-items-center text-[#444] hover:bg-[#f4f4f4]" aria-label={t('common.close')}><X size={19} /></button></div>
            <FormGrid className="mt-5 gap-5 md:grid-cols-2">
              <FormField className="gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.proposalTitle')} <span className="text-[#b33a2b]" aria-hidden="true">*</span><span className="sr-only"> ({t('common.required')})</span></span><input required minLength={8} value={proposalForm.title} onChange={(event) => { setProposalForm((current) => ({ ...current, title: event.target.value })); setFormErrors((current) => ({ ...current, title: '' })); }} aria-invalid={Boolean(formErrors.title)} aria-describedby={formErrors.title ? 'proposal-title-error' : undefined} className={`border-2 px-4 py-3 text-[15px] outline-none focus:border-[#ca7428] ${formErrors.title ? 'border-red-600' : 'border-[#b2b2b8]'}`} />{formErrors.title && <FieldMessage id="proposal-title-error" tone="error">{formErrors.title}</FieldMessage>}</FormField>
              <FormField className="gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.selectTopic')} <span className="text-[#b33a2b]" aria-hidden="true">*</span><span className="sr-only"> ({t('common.required')})</span></span><select required value={proposalForm.topic} onChange={(event) => { setProposalForm((current) => ({ ...current, topic: event.target.value })); setFormErrors((current) => ({ ...current, tags: '' })); }} aria-invalid={Boolean(formErrors.tags)} aria-describedby={formErrors.tags ? 'proposal-topic-error' : undefined} className={`cursor-pointer border-2 bg-white px-4 py-3 text-[15px] outline-none focus:border-[#ca7428] ${formErrors.tags ? 'border-red-600' : 'border-[#b2b2b8]'}`}><option value="">{t('forum.selectTopic')}</option>{TOPICS.map((topic) => <option key={topic}>{topic}</option>)}</select>{formErrors.tags && <FieldMessage id="proposal-topic-error" tone="error">{formErrors.tags}</FieldMessage>}</FormField>
            </FormGrid>
            <FormField className="mt-5 gap-2 text-[14px] font-bold text-[#444]"><span>{t('forum.proposalDescription')} <span className="text-[#b33a2b]" aria-hidden="true">*</span><span className="sr-only"> ({t('common.required')})</span></span><textarea required minLength={20} value={proposalForm.description} onChange={(event) => { setProposalForm((current) => ({ ...current, description: event.target.value })); setFormErrors((current) => ({ ...current, description: '' })); }} rows={4} aria-invalid={Boolean(formErrors.description)} aria-describedby={formErrors.description ? 'proposal-description-error' : undefined} className={`resize-y border-2 px-4 py-3 text-[15px] outline-none focus:border-[#ca7428] ${formErrors.description ? 'border-red-600' : 'border-[#b2b2b8]'}`} />{formErrors.description && <FieldMessage id="proposal-description-error" tone="error">{formErrors.description}</FieldMessage>}</FormField>
            {proposalAttempted && !proposalComplete && <div id="proposal-form-guidance" className="mt-5 flex items-start gap-3 border-l-4 border-[#b33a2b] bg-[#fff3f1] p-3 text-[13px] text-[#5a2923]" role="alert" aria-live="assertive"><CircleAlert size={19} className="mt-0.5 flex-none" aria-hidden="true" /><div><p className="font-bold">{t('forum.incompleteTitle')}</p><p className="mt-0.5">{t('forum.incompleteMessage', { fields: missingProposalFields.join(', ') })}</p></div></div>}
            <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setShowProposalForm(false)} className="cursor-pointer border-2 border-[#444] px-5 py-3 text-[14px] font-semibold">{t('common.cancel')}</button><button type="submit" disabled={submitting} aria-disabled={!proposalComplete || submitting} className={`px-5 py-3 text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#444] ${proposalComplete ? 'cursor-pointer bg-[#f68b2c] text-white hover:bg-[#e07a20]' : 'cursor-not-allowed bg-[#d9d9d9] text-[#666]'} disabled:cursor-wait disabled:opacity-60`}>{submitting ? t('common.saving') : t('forum.publish')}</button></div>
          </form>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative"><span className="sr-only">{t('forum.allTopics')}</span><select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)} className="min-h-11 cursor-pointer appearance-none border border-[#999] bg-white px-4 py-2 pr-9 text-[14px] text-[#444] outline-none transition-colors hover:border-[#ca7428]"><option value="All topics">{t('forum.allTopics')}</option>{TOPICS.map((topic) => <option key={topic}>{topic}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
          <label className="relative"><span className="sr-only">{t('forum.allStatuses')}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 cursor-pointer appearance-none border border-[#999] bg-white px-4 py-2 pr-9 text-[14px] text-[#444] outline-none transition-colors hover:border-[#ca7428]">{statusOptions.map((item) => <option key={item} value={item}>{item === 'All statuses' ? t('forum.allStatuses') : item}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
        </div>

        {status === 'loading' && <div className="grid min-h-[280px] place-items-center font-semibold text-[#555]" role="status">{t('common.loading')}</div>}
        {status === 'error' && <div className="border-l-4 border-red-600 bg-red-50 p-5" role="alert"><p className="font-semibold text-red-800">{t('common.error')}</p><button type="button" onClick={loadProposals} className="mt-3 cursor-pointer text-[#ca7428] underline">{t('common.retry')}</button></div>}
        {status === 'ready' && filtered.length === 0 && <div className="border-2 border-[#bfc0c5] bg-white p-10 text-center"><p className="text-[16px] font-semibold text-[#444]">{t('forum.noResults')}</p><button type="button" onClick={() => { setTopicFilter('All topics'); setStatusFilter('All statuses'); }} className="mt-3 cursor-pointer text-[14px] font-semibold text-[#ca7428] underline">{t('forum.clearFilters')}</button></div>}

        {status === 'ready' && filtered.map((proposal) => (
          <article id={`proposal-${proposal.id}`} key={proposal.id} className="scroll-mt-24 overflow-hidden border-2 border-[#f68b2c] bg-white shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">{proposal.tags.map((tag) => <span key={tag} className="bg-[#e8f5ef] px-3 py-1 text-[12px] font-semibold text-[#444]">{tag}</span>)}<span className={`px-3 py-1 text-[12px] font-semibold ${STATUS_BADGE[proposal.status] || 'bg-gray-100 text-gray-600'}`}>{proposal.status}</span></div>
              <div className="flex gap-4 sm:gap-5">
                <div className="flex flex-shrink-0 flex-col items-center gap-2">
                  <button type="button" onClick={() => vote(proposal, 'up')} className={`grid h-10 w-10 cursor-pointer place-items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428] ${proposal.userVote === 'up' ? 'bg-[#eaf3ea] text-[#2e6e45]' : 'text-[#777] hover:bg-[#f4f4f4]'}`} title="Support proposal" aria-pressed={proposal.userVote === 'up'}><ThumbsUp size={20} /></button>
                  <span className="text-[16px] font-bold text-[#444]">{proposal.upvotes}</span>
                  <button type="button" onClick={() => vote(proposal, 'down')} className={`grid h-10 w-10 cursor-pointer place-items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ca7428] ${proposal.userVote === 'down' ? 'bg-red-50 text-red-600' : 'text-[#777] hover:bg-[#f4f4f4]'}`} title="Oppose proposal" aria-pressed={proposal.userVote === 'down'}><ThumbsDown size={20} /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-bold text-[#444]">{proposal.title}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{proposal.description}</p>
                  <div className="mt-4"><p className="mb-1.5 text-[12px] text-[#777]">{t('forum.support', { percent: proposal.supportPct, count: proposal.totalVotes })}</p><div className="h-1.5 w-full bg-gray-100"><div className="h-1.5 bg-[#2e6e45]" style={{ width: `${proposal.supportPct}%` }} /></div></div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><ForumAvatar src={proposal.authorAvatar} name={proposal.author} size="md"/><p className="text-[12px] text-[#777]">{t('forum.by', { name: proposal.author, role: proposal.authorRole })} - {formatDate(proposal.createdAt, { dateStyle: 'medium' })}</p></div><button type="button" onClick={() => toggleComments(proposal.id)} className="flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-gray-300 px-4 py-2 text-[13px] font-medium text-[#444] hover:bg-gray-50" aria-expanded={expandedId === proposal.id}><MessageSquare size={15} />{proposal.comments} {t('forum.comments')}<ChevronDown size={14} className={`transition-transform ${expandedId === proposal.id ? 'rotate-180' : ''}`} /></button></div>
                </div>
              </div>

              {proposal.officialResponse && <div className="mt-5 flex items-start gap-3 bg-[#f1f1f1] p-4"><Building2 size={19} className="mt-0.5 flex-shrink-0 text-[#777]" /><div><p className="text-[13px] font-semibold text-[#444]">{t('forum.officialResponse')}</p><p className="mt-1 text-[13px] leading-relaxed text-[#666]">{proposal.officialResponse}</p></div></div>}

              {expandedId === proposal.id && (
                <section className="mt-5 border-t-2 border-[#e5e5e5] pt-5" aria-label={t('forum.comments')}>
                  {!comments[proposal.id] ? <p className="py-5 text-center text-[13px] text-[#777]">{t('common.loading')}</p> : comments[proposal.id].length === 0 ? <p className="py-5 text-center text-[13px] text-[#777]">{t('notifications.empty')}</p> : <div className="grid gap-3">{comments[proposal.id].map((comment) => <article key={comment.id} className={`flex items-start gap-3 bg-[#f7f7f7] p-4 ${comment.parentCommentId ? 'ml-5 border-l-2 border-[#ca7428] sm:ml-10' : ''}`}><ForumAvatar src={comment.authorAvatar} name={comment.author}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-[12px]"><span className="font-bold text-[#444]">{comment.author}</span><span className="text-[#777]">({comment.authorRole})</span><span className="text-[#999]">{formatDate(comment.createdAt)}</span></div><p className="mt-2 text-[13px] leading-relaxed text-[#555]">{comment.body}</p>{user && Number(user.id) !== 0 && <button type="button" onClick={() => { setReplyingTo((current) => ({ ...current, [proposal.id]: comment })); document.getElementById(`comment-input-${proposal.id}`)?.focus(); }} className="mt-2 cursor-pointer text-[12px] font-semibold text-[#ca7428] underline underline-offset-3 hover:text-[#9b4e13]">{t('forum.reply')}</button>}</div></article>)}</div>}
                  {user ? <div className="mt-4">{replyingTo[proposal.id] && <div className="mb-2 flex items-center justify-between gap-3 border-l-4 border-[#ca7428] bg-[#fff4e9] px-3 py-2 text-[12px] font-semibold text-[#555]"><span>{t('forum.replyingTo', { name: replyingTo[proposal.id]?.author || '' })}</span><button type="button" onClick={() => setReplyingTo((current) => ({ ...current, [proposal.id]: null }))} className="grid h-7 w-7 cursor-pointer place-items-center hover:bg-white" aria-label={t('common.cancel')}><X size={15} /></button></div>}<div className="flex flex-col gap-3 sm:flex-row"><label className="flex-1"><span className="sr-only">{t('forum.addComment')}</span><textarea id={`comment-input-${proposal.id}`} value={commentDrafts[proposal.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [proposal.id]: event.target.value }))} rows={2} placeholder={t('forum.addComment')} className="w-full resize-y border-2 border-[#b2b2b8] px-4 py-3 text-[13px] outline-none focus:border-[#ca7428]" /></label><button type="button" onClick={() => postComment(proposal.id)} disabled={!(commentDrafts[proposal.id] || '').trim()} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#e07a20] disabled:cursor-default disabled:opacity-45"><Send size={16} />{t('forum.post')}</button></div></div> : <div className="mt-4"><SignInPrompt onSignIn={signIn} /></div>}
                </section>
              )}
            </div>
          </article>
        ))}
      </div>
    </SpicePublicShell>
  );
}
