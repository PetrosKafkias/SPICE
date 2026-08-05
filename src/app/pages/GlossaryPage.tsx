import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ExternalLink, RotateCcw, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useI18n } from '../context/I18nContext';
import sourceEntries from '../data/glossarySource.json';

interface GlossaryEntry {
  id: string;
  term: string;
  definition: string | null;
  definitionOwner: string | null;
  category: string;
  tags: string[];
  language: 'en';
  relevance: string;
  sourceSheet: string;
}

const ENTRIES = sourceEntries as GlossaryEntry[];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const RELATED_ROUTES: Record<string, string> = {
  'co-creation': '/co-creation-hub',
  'co-design': '/methodology',
  method: '/analogue-tools',
  technique: '/analogue-tools',
  tool: '/analogue-tools',
  placemaking: '/methodology',
  'nature-based-solutions': '/methodology',
  'hybrid-participation': '/analogue-tools',
  prototyping: '/methodology',
};

export default function GlossaryPage() {
  const { language } = useI18n();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('term') || '');
  const [category, setCategory] = useState('All categories');
  const [languageFilter, setLanguageFilter] = useState('All languages');
  const [letter, setLetter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(params.get('term'));

  const categories = useMemo(
    () => ['All categories', ...Array.from(new Set(ENTRIES.map((entry) => entry.category))).sort()],
    [],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return ENTRIES.filter((entry) => {
      const searchable = `${entry.term} ${entry.definition || ''} ${entry.category} ${(entry.tags || []).join(' ')} ${entry.relevance}`.toLocaleLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (category === 'All categories' || entry.category === category) &&
        (languageFilter === 'All languages' || entry.language === 'en') &&
        (!letter || entry.term.toLocaleUpperCase().startsWith(letter))
      );
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [category, languageFilter, letter, search]);

  const hasActiveFilters = Boolean(
    search.trim() ||
    category !== 'All categories' ||
    languageFilter !== 'All languages' ||
    letter,
  );

  const reset = () => {
    setSearch('');
    setCategory('All categories');
    setLanguageFilter('All languages');
    setLetter('');
    setExpanded(null);
    setParams({});
  };

  const toggleEntry = (entry: GlossaryEntry) => {
    const next = expanded === entry.id ? null : entry.id;
    setExpanded(next);
    setParams(next ? { term: entry.id } : {});
  };

  return (
    <SpicePublicShell variant="public">
      <StandardPageHeader
        icon={BookOpen}
        eyebrow="SPICE knowledge"
        title="Glossary"
        description="Explore clear explanations of the key terms, methods, tools, and concepts used throughout the SPICE co-creation process."
      />
      <div className="spice-page spice-wide-page" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {language !== 'EN' && (
          <div className="mb-5 border-l-4 border-[#ca7428] bg-[#fff4e9] px-4 py-3 text-[14px] text-[#444]" role="status">
            The official source currently provides English definitions only. English is shown as a clearly identified fallback.
          </div>
        )}

        <section aria-label="Glossary filters" className="border-2 border-[#e1e1e1] bg-white p-4 md:p-5">
          <div className={`spice-form-grid gap-3 ${hasActiveFilters ? 'lg:grid-cols-[minmax(280px,1fr)_220px_190px_auto]' : 'lg:grid-cols-[minmax(280px,1fr)_220px_190px]'}`}>
            <label className="flex min-h-12 items-center gap-3 border-2 border-[#b7b7bb] bg-white px-4 focus-within:border-[#ca7428]">
              <Search size={20} aria-hidden="true" />
              <span className="sr-only">Search glossary</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search terms, methods, tools, or concepts"
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#777]"
              />
            </label>
            <label className="grid gap-1 text-[12px] font-semibold text-[#555]">
              <span className="sr-only">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-12 cursor-pointer border-2 border-[#b7b7bb] bg-white px-3 text-[14px] font-medium focus:border-[#ca7428] focus:outline-none">
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-[12px] font-semibold text-[#555]">
              <span className="sr-only">Language</span>
              <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} className="min-h-12 cursor-pointer border-2 border-[#b7b7bb] bg-white px-3 text-[14px] font-medium focus:border-[#ca7428] focus:outline-none">
                <option>All languages</option>
                <option value="en">English</option>
              </select>
            </label>
            {hasActiveFilters && (
              <button type="button" onClick={reset} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 border-2 border-[#444] bg-white px-4 text-[14px] font-semibold text-[#444] hover:bg-[#f1f1f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca7428]">
                <RotateCcw size={17} aria-hidden="true" /> Reset filters
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-1" aria-label="Filter by first letter">
            <button type="button" onClick={() => setLetter('')} aria-pressed={!letter} className={`min-h-9 min-w-9 cursor-pointer border px-2 text-[12px] font-semibold ${!letter ? 'border-[#ca7428] bg-[#ca7428] text-white' : 'border-[#bbb] bg-white text-[#444] hover:border-[#ca7428]'}`}>All</button>
            {ALPHABET.map((item) => (
              <button key={item} type="button" onClick={() => setLetter(item)} aria-pressed={letter === item} className={`min-h-9 min-w-9 cursor-pointer border text-[12px] font-semibold ${letter === item ? 'border-[#ca7428] bg-[#ca7428] text-white' : 'border-[#bbb] bg-white text-[#444] hover:border-[#ca7428]'}`}>{item}</button>
            ))}
          </div>
        </section>

        <p className="mb-5 mt-5 text-[14px] font-semibold text-[#444]" aria-live="polite">
          {filtered.length} of {ENTRIES.length} glossary terms
        </p>

        <div className="grid gap-4">
          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-[#aaa] bg-white p-10 text-center">
              <BookOpen size={38} className="mx-auto text-[#777]" aria-hidden="true" />
              <h2 className="mt-3 text-[18px] font-bold text-[#444]">No glossary terms match these filters.</h2>
              <button type="button" onClick={reset} className="mt-4 cursor-pointer font-semibold text-[#ca7428] underline">Reset filters</button>
            </div>
          ) : filtered.map((entry) => {
            const isExpanded = expanded === entry.id;
            const related = ENTRIES.filter((candidate) => candidate.id !== entry.id && candidate.category === entry.category).slice(0, 3);
            const relatedRoute = RELATED_ROUTES[entry.id];
            return (
              <article key={entry.id} id={`glossary-${entry.id}`} className="bg-white">
                <button
                  type="button"
                  onClick={() => toggleEntry(entry)}
                  className="spice-interactive-card flex w-full items-start justify-between gap-5 p-5 text-left md:p-6"
                  aria-expanded={isExpanded}
                  aria-controls={`glossary-detail-${entry.id}`}
                >
                  <span className="min-w-0">
                    <span className="block text-[19px] font-bold text-[#444]">{entry.term}</span>
                    <span className="mt-2 line-clamp-2 block text-[14px] leading-relaxed text-[#555]">
                      {entry.definition || 'No official definition is currently provided in the source glossary.'}
                    </span>
                    <span className="mt-3 flex flex-wrap gap-2">
                      {(entry.tags || [entry.category]).map((tag) => <span key={tag} className="inline-flex bg-[#eee] px-2.5 py-1 text-[11px] font-semibold text-[#555]">{tag}</span>)}
                    </span>
                  </span>
                  <ChevronDown size={22} className={`mt-1 flex-none text-[#ca7428] transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {isExpanded && (
                  <div id={`glossary-detail-${entry.id}`} className="border-x-2 border-b-2 border-[#dedee1] px-5 pb-6 pt-5 md:px-6">
                    <p className="max-w-[1000px] whitespace-pre-line text-[14px] leading-7 text-[#444]">
                      {entry.definition || 'This term is listed in the official SPICE Glossary, but the source file does not yet include an approved definition.'}
                    </p>
                    {entry.definitionOwner && <p className="mt-3 text-[12px] text-[#777]">Definition contribution: {entry.definitionOwner}</p>}
                    {entry.relevance && <p className="mt-2 text-[12px] text-[#777]">Source classification: {entry.relevance}</p>}
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-bold text-[#555]">Related terms:</span>
                      {related.map((item) => (
                        <button key={item.id} type="button" onClick={() => { setSearch(item.term); setExpanded(item.id); setParams({ term: item.id }); }} className="cursor-pointer border border-[#bbb] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">{item.term}</button>
                      ))}
                    </div>
                    {relatedRoute && (
                      <Link to={relatedRoute} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#ca7428] px-4 py-2 text-[13px] font-bold text-[#ca7428] hover:bg-[#fff4e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]">
                        Open related SPICE page <ExternalLink size={16} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </SpicePublicShell>
  );
}
