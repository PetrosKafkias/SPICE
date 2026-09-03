import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ExternalLink, RotateCcw, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useI18n } from '../context/I18nContext';
import type { LocaleCode } from '../i18n/config';
import enEntries from '../data/localized/glossary.en.json';
import elEntries from '../data/localized/glossary.el.json';
import fiEntries from '../data/localized/glossary.fi.json';
import plEntries from '../data/localized/glossary.pl.json';
import ptEntries from '../data/localized/glossary.pt.json';

interface GlossaryEntry { id: string; term: string; definition: string | null; definitionOwner: string | null; category: string; tags: string[]; relevance: string; sourceSheet: string; }
const ALL_CATEGORY = '__all__';
const ENTRIES: Record<LocaleCode, GlossaryEntry[]> = { en: enEntries as GlossaryEntry[], el: elEntries as GlossaryEntry[], fi: fiEntries as GlossaryEntry[], pl: plEntries as GlossaryEntry[], pt: ptEntries as GlossaryEntry[] };
const CATEGORY_BY_ENTRY_ID = new Map((enEntries as GlossaryEntry[]).map((entry) => [entry.id, entry.category]));
const RELATED_ROUTES: Record<string, string> = { 'co-creation': '/co-creation-hub', 'co-design': '/methodology', method: '/analogue-tools', technique: '/analogue-tools', tool: '/analogue-tools', placemaking: '/methodology', 'nature-based-solutions': '/methodology', 'hybrid-participation': '/analogue-tools', prototyping: '/methodology' };

export default function GlossaryPage() {
  const { language, t, tp, formatNumber } = useI18n();
  const entries = ENTRIES[language];
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('term') || '');
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [letter, setLetter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(params.get('term'));
  const categories = useMemo(() => {
    const labels = new Map<string, string>();
    entries.forEach((entry) => labels.set(CATEGORY_BY_ENTRY_ID.get(entry.id) || entry.category, entry.category));
    return Array.from(labels, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label, language));
  }, [entries, language]);
  const initials = useMemo(() => Array.from(new Set(entries.map((entry) => Array.from(entry.term.trim())[0]?.toLocaleUpperCase(language)).filter(Boolean))).sort((a, b) => a.localeCompare(b, language)), [entries, language]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(language);
    return entries.filter((entry) => {
      const searchable = `${entry.term} ${entry.definition || ''} ${entry.category} ${(entry.tags || []).join(' ')} ${entry.relevance}`.toLocaleLowerCase(language);
      const categoryId = CATEGORY_BY_ENTRY_ID.get(entry.id) || entry.category;
      return (!query || searchable.includes(query)) && (category === ALL_CATEGORY || categoryId === category) && (!letter || entry.term.toLocaleUpperCase(language).startsWith(letter));
    }).sort((a, b) => a.term.localeCompare(b.term, language));
  }, [category, entries, language, letter, search]);
  const hasActiveFilters = Boolean(search.trim() || category !== ALL_CATEGORY || letter);
  const reset = () => { setSearch(''); setCategory(ALL_CATEGORY); setLetter(''); setExpanded(null); setParams({}); };
  const toggleEntry = (entry: GlossaryEntry) => { const next = expanded === entry.id ? null : entry.id; setExpanded(next); setParams(next ? { term: entry.id } : {}); };

  return <SpicePublicShell variant="public">
    <StandardPageHeader icon={BookOpen} eyebrow={t('glossary.eyebrow')} title={t('glossary.title')} description={t('glossary.description')} />
    <div className="spice-page spice-wide-page" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <section aria-label={t('glossary.filters')} className="spice-card p-4 md:p-5">
        <div className={`spice-form-grid gap-3 ${hasActiveFilters ? 'lg:grid-cols-[minmax(280px,1fr)_220px_auto]' : 'lg:grid-cols-[minmax(280px,1fr)_220px]'}`}>
          <label className="flex min-h-12 items-center gap-3 border-2 border-[#b7b7bb] bg-white px-4 focus-within:border-[#ca7428]"><Search size={20} aria-hidden="true" /><span className="sr-only">{t('glossary.searchLabel')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('glossary.searchPlaceholder')} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#777]" /></label>
          <label className="grid gap-1 text-[12px] font-semibold text-[#555]"><span className="sr-only">{t('glossary.category')}</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-12 cursor-pointer border-2 border-[#b7b7bb] bg-white px-3 text-[14px] font-medium focus:border-[#ca7428] focus:outline-none"><option value={ALL_CATEGORY}>{t('glossary.allCategories')}</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          {hasActiveFilters && <button type="button" onClick={reset} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 border-2 border-[#444] bg-white px-4 text-[14px] font-semibold text-[#444] hover:bg-[#f1f1f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]"><RotateCcw size={17} aria-hidden="true" /> {t('glossary.reset')}</button>}
        </div>
        <div className="mt-4 flex flex-wrap gap-1" aria-label={t('glossary.filterByLetter')}><button type="button" onClick={() => setLetter('')} aria-pressed={!letter} className={`min-h-9 min-w-9 cursor-pointer border px-2 text-[12px] font-semibold ${!letter ? 'border-[#ca7428] bg-[#ca7428] text-white' : 'border-[#bbb] bg-white text-[#444] hover:border-[#ca7428]'}`}>{t('glossary.allLetters')}</button>{initials.map((item) => <button key={item} type="button" onClick={() => setLetter(item)} aria-pressed={letter === item} className={`min-h-9 min-w-9 cursor-pointer border text-[12px] font-semibold ${letter === item ? 'border-[#ca7428] bg-[#ca7428] text-white' : 'border-[#bbb] bg-white text-[#444] hover:border-[#ca7428]'}`}>{item}</button>)}</div>
      </section>
      <p className="mb-5 mt-5 text-[14px] font-semibold text-[#444]" aria-live="polite">{tp(entries.length, { one: 'glossary.results.one', few: 'glossary.results.few', many: 'glossary.results.many', other: 'glossary.results.other' }, { visible: formatNumber(filtered.length), total: formatNumber(entries.length) })}</p>
      <div className="grid gap-4">{filtered.length === 0 ? <div className="spice-card-dashed p-10 text-center"><BookOpen size={38} className="mx-auto text-[#777]" aria-hidden="true" /><h2 className="mt-3 text-[18px] font-bold text-[#444]">{t('glossary.empty')}</h2><button type="button" onClick={reset} className="mt-4 cursor-pointer font-semibold text-[#ca7428] underline">{t('glossary.reset')}</button></div> : filtered.map((entry) => {
        const isExpanded = expanded === entry.id;
        const related = entries.filter((candidate) => candidate.id !== entry.id && candidate.category === entry.category).slice(0, 3);
        const relatedRoute = RELATED_ROUTES[entry.id];
        return <article key={entry.id} id={`glossary-${entry.id}`} className="bg-white"><button type="button" onClick={() => toggleEntry(entry)} className="spice-interactive-card flex w-full items-start justify-between gap-5 p-5 text-left md:p-6" aria-expanded={isExpanded} aria-controls={`glossary-detail-${entry.id}`} aria-label={t('glossary.expandTerm', { term: entry.term })}><span className="min-w-0"><span className="block text-[19px] font-bold text-[#444]">{entry.term}</span><span className="mt-2 line-clamp-2 block text-[14px] leading-relaxed text-[#555]">{entry.definition || t('glossary.definitionMissing')}</span><span className="mt-3 flex flex-wrap gap-2">{(entry.tags || [entry.category]).map((tag, tagIndex) => <span key={`${entry.id}-${tagIndex}-${tag}`} className="inline-flex bg-[#eee] px-2.5 py-1 text-[11px] font-semibold text-[#555]">{tag}</span>)}</span></span><ChevronDown size={22} className={`mt-1 flex-none text-[#ca7428] transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" /></button>
          {isExpanded && <div id={`glossary-detail-${entry.id}`} className="border-x-2 border-b-2 border-[#dedee1] px-5 pb-6 pt-5 md:px-6"><p className="max-w-[1000px] whitespace-pre-line text-[14px] leading-7 text-[#444]">{entry.definition || t('glossary.definitionMissing')}</p>{entry.definitionOwner && <p className="mt-3 text-[12px] text-[#777]">{t('glossary.definitionContribution', { owner: entry.definitionOwner })}</p>}{entry.relevance && <p className="mt-2 text-[12px] text-[#777]">{t('glossary.sourceClassification', { classification: entry.relevance })}</p>}{related.length > 0 && <div className="mt-5 flex flex-wrap items-center gap-2"><span className="text-[12px] font-bold text-[#555]">{t('glossary.relatedTerms')}</span>{related.map((item) => <button key={item.id} type="button" onClick={() => { setSearch(item.term); setExpanded(item.id); setParams({ term: item.id }); }} className="cursor-pointer border border-[#bbb] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">{item.term}</button>)}</div>}{relatedRoute && <Link to={relatedRoute} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#ca7428] px-4 py-2 text-[13px] font-bold text-[#ca7428] hover:bg-[#fff4e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]">{t('glossary.openRelated')} <ExternalLink size={16} aria-hidden="true" /></Link>}</div>}
        </article>;
      })}</div>
    </div>
  </SpicePublicShell>;
}
