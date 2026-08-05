import { useEffect, useMemo, useRef, useState, type ElementType } from 'react';
import { Bike, Check, GitCompare, Leaf, MessageSquare, Music, Plus, Sparkles, Sun, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { FieldMessage, FormField } from '../components/FormLayout';
import ModalPortal from '../components/ModalPortal';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest, ApiError, jsonBody } from '../lib/api';

interface Scenario {
  id: number;
  slug: string;
  title: string;
  summary: string;
  color: string;
  background: string;
  borderColor: string;
  tags: string[];
  strengths: string[];
  concerns: string[];
  upvotes: number;
  downvotes: number;
  rating: number;
  ratingCount: number;
  contributors: number;
  phase: number;
  status: string;
  guidance: string;
  userVote: null | 'up' | 'down';
  adopted: boolean;
}

const TOPICS = ['Mobility', 'Green Space', 'Climate-Resilient', 'Cultural', 'Social', 'Youth-Focused'];

const TAG_KEYS: Record<string, TranslationKey> = {
  Mobility: 'scenarios.tag.mobility',
  'Green Space': 'scenarios.tag.green',
  'Climate-Resilient': 'scenarios.tag.climate',
  Cultural: 'scenarios.tag.cultural',
  Social: 'scenarios.tag.social',
  'Youth-Focused': 'scenarios.tag.youth',
};

const ICONS: Record<string, ElementType> = {
  'green-mobility-hub': Bike,
  'cultural-gathering-square': Music,
  'multi-generational-park': Sun,
};

export default function PossibleScenariosPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeTopic, setActiveTopic] = useState('All topics');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposal, setProposal] = useState({ title: '', summary: '', topic: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const detailsRef = useRef<HTMLElement>(null);

  const load = async () => {
    setStatus('loading');
    try {
      const result = await apiRequest<{ scenarios: Scenario[] }>('/api/scenarios');
      setScenarios(result.scenarios);
      setSelectedId((current) => current && result.scenarios.some((item) => item.id === current) ? current : result.scenarios[0]?.id || null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(
    () => activeTopic === 'All topics' ? scenarios : scenarios.filter((scenario) => scenario.tags.includes(activeTopic)),
    [activeTopic, scenarios],
  );
  const selected = scenarios.find((scenario) => scenario.id === selectedId) || null;
  const compared = compareIds.map((id) => scenarios.find((scenario) => scenario.id === id)).filter(Boolean) as Scenario[];

  const tagLabel = (tag: string) => TAG_KEYS[tag] ? t(TAG_KEYS[tag]) : tag;

  const viewDetails = (scenarioId: number) => {
    setSelectedId(scenarioId);
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      detailsRef.current?.focus({ preventScroll: true });
    });
  };

  const vote = async (scenario: Scenario, direction: 'up' | 'down') => {
    try {
      const result = await apiRequest<{ userVote: null | 'up' | 'down'; upvotes: number; downvotes: number }>(`/api/scenarios/${scenario.id}/vote`, {
        method: 'POST', body: jsonBody({ direction }),
      });
      setScenarios((items) => items.map((item) => item.id === scenario.id ? { ...item, ...result } : item));
      toast.success(t('scenarios.voteSaved'));
    } catch (error) {
      toast.error((error as ApiError).message || t('common.error'));
    }
  };

  const toggleCompare = (id: number) => {
    setShowComparison(false);
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        toast.error(t('scenarios.maxCompare'));
        return current;
      }
      return [...current, id];
    });
  };

  const adopt = async (scenario: Scenario) => {
    try {
      const result = await apiRequest<{ adopted: boolean }>(`/api/scenarios/${scenario.id}/adopt`, {
        method: 'POST', body: jsonBody({ adopted: !scenario.adopted }),
      });
      setScenarios((items) => items.map((item) => item.id === scenario.id ? { ...item, adopted: result.adopted } : item));
      toast.success(t('scenarios.roadmapSaved'));
    } catch (error) {
      toast.error((error as ApiError).message || t('common.error'));
    }
  };

  const submitProposal = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (proposal.title.trim().length < 8) errors.title = 'Use at least 8 characters.';
    if (proposal.summary.trim().length < 30) errors.summary = 'Use at least 30 characters.';
    if (!proposal.topic) errors.tags = t('scenarios.topic');
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<{ scenario: Scenario }>('/api/scenarios', {
        method: 'POST', body: jsonBody({ title: proposal.title, summary: proposal.summary, tags: [proposal.topic] }),
      });
      setScenarios((items) => [result.scenario, ...items]);
      setSelectedId(result.scenario.id);
      setProposal({ title: '', summary: '', topic: '' });
      setFormErrors({});
      setProposalOpen(false);
      toast.success(t('scenarios.created'));
    } catch (error) {
      const apiError = error as ApiError;
      setFormErrors(apiError.fieldErrors || {});
      toast.error(apiError.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader icon={Sparkles} eyebrow="SPICE scenarios" title={t('scenarios.title')} description={t('scenarios.subtitle')} actions={<><button type="button" onClick={() => { setCompareMode((value) => !value); setCompareIds([]); setShowComparison(false); }} className="inline-flex min-h-12 cursor-pointer items-center gap-2 whitespace-nowrap border-2 border-[#444] bg-white px-5 py-3 text-[14px] font-bold text-[#444] transition-colors hover:border-[#ca7428] hover:text-[#ca7428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]"><GitCompare size={18} aria-hidden="true" />{compareMode ? t('scenarios.stopComparing') : t('scenarios.compare')}</button><button type="button" onClick={() => setProposalOpen(true)} className="inline-flex min-h-12 cursor-pointer items-center gap-2 whitespace-nowrap bg-[#f68b2c] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]"><Plus size={18} aria-hidden="true" />{t('scenarios.submit')}</button></>} />
      <div className="spice-page spice-wide-page" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <div className="mt-8 flex flex-wrap gap-2" aria-label={t('scenarios.topic')}>
          {['All topics', ...TOPICS].map((topic) => (
            <button key={topic} type="button" onClick={() => setActiveTopic(topic)} aria-pressed={activeTopic === topic} className={`min-h-11 cursor-pointer border px-4 py-2 text-[13px] font-semibold transition-colors ${activeTopic === topic ? 'border-[#f68b2c] bg-[#f68b2c] text-white' : 'border-[#bfc0c5] bg-white text-[#555] hover:border-[#f68b2c]'}`}>
              {topic === 'All topics' ? t('scenarios.all') : tagLabel(topic)}
            </button>
          ))}
        </div>

        {compareMode && (
          <div className="mt-6 flex flex-col gap-3 border-l-4 border-[#f68b2c] bg-[#fff4e9] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14px] font-bold text-[#444]">{t('scenarios.selected', { count: compareIds.length })}</p>
            <button type="button" disabled={compareIds.length < 2} onClick={() => setShowComparison(true)} className="min-h-11 cursor-pointer bg-[#444] px-5 py-2 text-[13px] font-bold text-white disabled:cursor-default disabled:opacity-40">
              {t('scenarios.viewComparison')}
            </button>
          </div>
        )}

        {status === 'loading' && <div className="grid min-h-[360px] place-items-center font-semibold text-[#555]" role="status">{t('common.loading')}</div>}
        {status === 'error' && <div className="mt-8 border-l-4 border-red-600 bg-red-50 p-6" role="alert"><p className="font-semibold text-red-800">{t('common.error')}</p><button type="button" onClick={() => void load()} className="mt-3 cursor-pointer text-[#ca7428] underline">{t('common.retry')}</button></div>}
        {status === 'ready' && filtered.length === 0 && <div className="mt-8 border-2 border-dashed border-[#bfc0c5] p-12 text-center font-semibold text-[#666]">{t('scenarios.noResults')}</div>}

        {status === 'ready' && filtered.length > 0 && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((scenario) => {
              const Icon = ICONS[scenario.slug] || Sparkles;
              const checked = compareIds.includes(scenario.id);
              return (
                <article key={scenario.id} className="flex min-h-[390px] flex-col border-2 bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,0.09)]" style={{ borderColor: compareMode && checked ? '#f68b2c' : scenario.borderColor }}>
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-full" style={{ backgroundColor: scenario.background, color: scenario.color }}><Icon size={24} /></span>
                    <span className="bg-[#f2f2f2] px-3 py-1.5 text-[11px] font-bold text-[#555]">{scenario.status}</span>
                  </div>
                  <h2 className="mt-5 text-[21px] font-bold text-[#444]">{scenario.title}</h2>
                  <p className="mt-3 flex-1 text-[14px] font-medium leading-relaxed text-[#666]">{scenario.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{scenario.tags.map((tag) => <span key={tag} className="bg-[#f3f3f3] px-2.5 py-1 text-[11px] font-semibold text-[#555]">{tagLabel(tag)}</span>)}</div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => void vote(scenario, 'up')} aria-pressed={scenario.userVote === 'up'} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 border px-3 py-2 text-[12px] font-bold ${scenario.userVote === 'up' ? 'border-[#2e6e45] bg-[#eaf4ef] text-[#2e6e45]' : 'border-[#bfc0c5] text-[#555] hover:border-[#2e6e45]'}`}><ThumbsUp size={16} />{scenario.upvotes}</button>
                    <button type="button" onClick={() => void vote(scenario, 'down')} aria-pressed={scenario.userVote === 'down'} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 border px-3 py-2 text-[12px] font-bold ${scenario.userVote === 'down' ? 'border-[#a84535] bg-[#fff0ed] text-[#a84535]' : 'border-[#bfc0c5] text-[#555] hover:border-[#a84535]'}`}><ThumbsDown size={16} />{scenario.downvotes}</button>
                  </div>
                  {compareMode ? (
                    <button type="button" onClick={() => toggleCompare(scenario.id)} className={`mt-3 min-h-11 cursor-pointer px-4 py-2.5 text-[13px] font-bold ${checked ? 'bg-[#f68b2c] text-white' : 'border-2 border-[#f68b2c] bg-white text-[#ca7428]'}`}>{checked ? <span className="inline-flex items-center gap-2"><Check size={16} />{t('scenarios.selected', { count: 1 })}</span> : t('scenarios.compare')}</button>
                  ) : (
                    <button type="button" onClick={() => viewDetails(scenario.id)} className="mt-3 min-h-11 cursor-pointer bg-[#444] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#222]">{t('scenarios.viewDetails')}</button>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {showComparison && compared.length >= 2 && (
          <section className="mt-10 border-2 border-[#bfc0c5] bg-white p-6 md:p-8">
            <div className="flex items-center justify-between gap-4"><h2 className="text-[27px] font-bold text-[#444]">{t('scenarios.compareHeading')}</h2><button type="button" onClick={() => setShowComparison(false)} aria-label={t('common.close')} className="grid h-11 w-11 cursor-pointer place-items-center hover:bg-[#f2f2f2]"><X size={22} /></button></div>
            <div className="mt-6 overflow-x-auto"><table className="min-w-[760px] w-full border-collapse text-left"><thead><tr>{compared.map((item) => <th key={item.id} className="border-b-2 border-[#444] p-4 text-[16px] font-bold text-[#444]">{item.title}</th>)}</tr></thead><tbody><tr>{compared.map((item) => <td key={item.id} className="border-b border-[#ddd] p-4 align-top text-[13px] leading-relaxed text-[#555]">{item.summary}</td>)}</tr><tr>{compared.map((item) => <td key={item.id} className="p-4 align-top"><p className="font-bold text-[#2e6e45]">{item.upvotes} {t('scenarios.support')}</p><p className="mt-1 font-bold text-[#a84535]">{item.downvotes} {t('scenarios.concern')}</p></td>)}</tr></tbody></table></div>
          </section>
        )}

        {selected && !compareMode && (
          <section ref={detailsRef} tabIndex={-1} className="mt-10 grid scroll-mt-24 gap-8 border-2 border-[#bfc0c5] bg-white p-6 outline-none md:p-8 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#ca7428]">{t('scenarios.phase', { phase: selected.phase })}</p>
              <h2 className="mt-2 text-[30px] font-bold text-[#444]">{selected.title}</h2>
              <p className="mt-4 text-[16px] font-medium leading-relaxed text-[#666]">{selected.summary}</p>
              <div className="mt-7 grid gap-6 sm:grid-cols-2"><div><h3 className="text-[18px] font-bold text-[#2e6e45]">{t('scenarios.strengths')}</h3><ul className="mt-3 space-y-2">{selected.strengths.map((item) => <li key={item} className="flex gap-2 text-[14px] text-[#555]"><Leaf size={16} className="mt-0.5 flex-shrink-0 text-[#2e6e45]" />{item}</li>)}</ul></div><div><h3 className="text-[18px] font-bold text-[#a84535]">{t('scenarios.concerns')}</h3><ul className="mt-3 space-y-2">{selected.concerns.map((item) => <li key={item} className="flex gap-2 text-[14px] text-[#555]"><MessageSquare size={16} className="mt-0.5 flex-shrink-0 text-[#a84535]" />{item}</li>)}</ul></div></div>
              <div className="mt-7 border-l-4 border-[#f68b2c] bg-[#fff4e9] p-5"><h3 className="text-[16px] font-bold text-[#444]">{t('scenarios.guidance')}</h3><p className="mt-2 text-[14px] leading-relaxed text-[#555]">{selected.guidance}</p></div>
            </div>
            <aside className="border-l-0 border-[#ddd] lg:border-l lg:pl-7"><div className="grid grid-cols-2 gap-3 text-center"><div className="bg-[#f4f4f4] p-4"><p className="text-[24px] font-bold text-[#444]">{selected.upvotes + selected.downvotes}</p><p className="text-[11px] font-semibold text-[#777]">{t('scenarios.votes', { count: selected.upvotes + selected.downvotes })}</p></div><div className="bg-[#f4f4f4] p-4"><p className="text-[24px] font-bold text-[#444]">{selected.contributors}</p><p className="text-[11px] font-semibold text-[#777]">{t('scenarios.contributors', { count: selected.contributors })}</p></div></div><div className="mt-5 flex flex-col gap-3"><button type="button" onClick={() => void adopt(selected)} className={`min-h-12 cursor-pointer px-4 py-3 text-[14px] font-bold ${selected.adopted ? 'bg-[#637948] text-white' : 'bg-[#f68b2c] text-white hover:bg-[#e07a20]'}`}>{selected.adopted ? t('scenarios.adopted') : t('scenarios.adopt')}</button><button type="button" onClick={() => navigate(`/forum-voting?scenario=${selected.slug}`)} className="min-h-12 cursor-pointer border-2 border-[#444] px-4 py-3 text-[14px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">{t('scenarios.discuss')}</button><button type="button" onClick={() => navigate(`/insights?scenario=${selected.slug}`)} className="min-h-12 cursor-pointer border-2 border-[#444] px-4 py-3 text-[14px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">{t('scenarios.report')}</button></div></aside>
          </section>
        )}
      </div>

      {proposalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto overscroll-contain bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="scenario-proposal-title">
          <form onSubmit={submitProposal} className="relative z-10 my-8 w-full max-w-[660px] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4"><h2 id="scenario-proposal-title" className="text-[27px] font-bold text-[#444]">{t('scenarios.submit')}</h2><button type="button" onClick={() => setProposalOpen(false)} aria-label={t('common.close')} className="grid h-11 w-11 cursor-pointer place-items-center hover:bg-[#f2f2f2]"><X size={22} /></button></div>
            <FormField className="mt-6 gap-2 text-[14px] font-bold text-[#444]">{t('scenarios.proposalTitle')}<input value={proposal.title} onChange={(event) => setProposal((value) => ({ ...value, title: event.target.value }))} className={`w-full border-2 px-4 py-3 font-medium outline-none focus:border-[#f68b2c] ${formErrors.title ? 'border-red-600' : 'border-[#bfc0c5]'}`} aria-invalid={Boolean(formErrors.title)} aria-describedby={formErrors.title ? 'scenario-title-error' : undefined} />{formErrors.title && <FieldMessage id="scenario-title-error" tone="error">{formErrors.title}</FieldMessage>}</FormField>
            <FormField className="mt-5 gap-2 text-[14px] font-bold text-[#444]">{t('scenarios.proposalSummary')}<textarea value={proposal.summary} onChange={(event) => setProposal((value) => ({ ...value, summary: event.target.value }))} rows={6} className={`w-full resize-y border-2 px-4 py-3 font-medium outline-none focus:border-[#f68b2c] ${formErrors.summary ? 'border-red-600' : 'border-[#bfc0c5]'}`} aria-invalid={Boolean(formErrors.summary)} aria-describedby={formErrors.summary ? 'scenario-summary-error' : undefined} />{formErrors.summary && <FieldMessage id="scenario-summary-error" tone="error">{formErrors.summary}</FieldMessage>}</FormField>
            <FormField className="mt-5 gap-2 text-[14px] font-bold text-[#444]">{t('scenarios.topic')}<select value={proposal.topic} onChange={(event) => setProposal((value) => ({ ...value, topic: event.target.value }))} className={`w-full cursor-pointer border-2 bg-white px-4 py-3 font-medium outline-none focus:border-[#f68b2c] ${formErrors.tags ? 'border-red-600' : 'border-[#bfc0c5]'}`} aria-invalid={Boolean(formErrors.tags)} aria-describedby={formErrors.tags ? 'scenario-topic-error' : undefined}><option value="">{t('scenarios.topic')}</option>{TOPICS.map((topic) => <option key={topic} value={topic}>{tagLabel(topic)}</option>)}</select>{formErrors.tags && <FieldMessage id="scenario-topic-error" tone="error">{formErrors.tags}</FieldMessage>}</FormField>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setProposalOpen(false)} className="min-h-12 cursor-pointer border-2 border-[#444] px-5 py-3 font-bold text-[#444]">{t('common.cancel')}</button><button type="submit" disabled={submitting} className="min-h-12 cursor-pointer bg-[#f68b2c] px-6 py-3 font-bold text-white hover:bg-[#e07a20] disabled:cursor-wait disabled:opacity-60">{submitting ? t('common.saving') : t('scenarios.publish')}</button></div>
          </form>
        </div>
        </ModalPortal>
      )}
    </SpicePublicShell>
  );
}
