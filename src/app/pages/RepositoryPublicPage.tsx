import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, File, FileArchive, FileImage, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import { useI18n } from '../context/I18nContext';
import { apiRequest } from '../lib/api';

interface RepositoryDocument {
  id: number;
  title: string;
  description: string;
  phase: number;
  documentType: string;
  pilot: string;
  fileFormat: string;
  tags: string[];
  updatedAt: string;
}

function documentIcon(format: string) {
  if (format === 'ZIP') return FileArchive;
  if (['PNG', 'JPG', 'JPEG'].includes(format)) return FileImage;
  if (format === 'PDF') return FileText;
  return File;
}

function downloadRecord(document: RepositoryDocument) {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `${document.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `repository-${document.id}`}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function RepositoryPublicPage() {
  const { t, formatDate } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPhase = searchParams.get('phase');
  const initialPhase = requestedPhase && ['1', '2', '3', '4', '5'].includes(requestedPhase) ? requestedPhase : 'all';
  const [documents, setDocuments] = useState<RepositoryDocument[]>([]);
  const [search, setSearch] = useState('');
  const [pilotFilter, setPilotFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState(initialPhase);
  const [typeFilter, setTypeFilter] = useState('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = async () => {
    setStatus('loading');
    try {
      const result = await apiRequest<{ documents: RepositoryDocument[] }>('/api/repository');
      setDocuments(result.documents);
      setStatus('ready');
    } catch { setStatus('error'); }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const phase = searchParams.get('phase');
    setPhaseFilter(phase && ['1', '2', '3', '4', '5'].includes(phase) ? phase : 'all');
  }, [searchParams]);

  const updatePhaseFilter = (phase: string) => {
    setPhaseFilter(phase);
    const next = new URLSearchParams(searchParams);
    if (phase === 'all') next.delete('phase');
    else next.set('phase', phase);
    setSearchParams(next, { replace: true });
  };

  const pilots = useMemo(() => Array.from(new Set(documents.map((document) => document.pilot))).sort(), [documents]);
  const types = useMemo(() => Array.from(new Set(documents.map((document) => document.documentType))).sort(), [documents]);
  const filtered = useMemo(() => documents.filter((document) => {
    const searchable = `${document.title} ${document.description} ${document.pilot} ${document.documentType} ${document.tags.join(' ')}`.toLowerCase();
    return (!search || searchable.includes(search.toLowerCase()))
      && (pilotFilter === 'all' || document.pilot === pilotFilter)
      && (phaseFilter === 'all' || document.phase === Number(phaseFilter))
      && (typeFilter === 'all' || document.documentType === typeFilter);
  }), [documents, phaseFilter, pilotFilter, search, typeFilter]);

  const selectClass = 'min-h-11 w-full cursor-pointer appearance-none border border-gray-300 bg-white py-3 pl-4 pr-10 text-[14px] text-[#444] outline-none transition-colors hover:border-[#ca7428] focus:border-[#ca7428]';

  return (
    <SpicePublicShell>
      <StandardPageHeader icon={FileText} eyebrow="SPICE outputs" title={t('nav.repository')} description={t('repository.subtitle')} />
      <div className="spice-page spice-wide-page flex flex-col gap-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>

        <div className="flex flex-col items-start gap-3 lg:flex-row">
          <label className="flex min-h-11 w-full flex-1 items-center gap-3 border border-gray-300 bg-white px-4 py-3 focus-within:border-[#ca7428]"><Search size={18} className="flex-shrink-0 text-[#888]" /><span className="sr-only">{t('repository.search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('repository.search')} className="min-w-0 flex-1 bg-transparent text-[14px] text-[#444] outline-none placeholder:text-[#aaa]" /></label>
          <div className="spice-form-grid w-full gap-3 sm:grid-cols-3 sm:[&>label]:min-w-[185px] lg:w-auto">
            <label className="relative"><span className="sr-only">{t('repository.allPilots')}</span><select value={pilotFilter} onChange={(event) => setPilotFilter(event.target.value)} className={selectClass}><option value="all">{t('repository.allPilots')}</option>{pilots.map((pilot) => <option key={pilot}>{pilot}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
            <label className="relative"><span className="sr-only">{t('repository.allPhases')}</span><select value={phaseFilter} onChange={(event) => updatePhaseFilter(event.target.value)} className={selectClass}><option value="all">{t('repository.allPhases')}</option>{[1, 2, 3, 4, 5].map((phase) => <option key={phase} value={phase}>Phase {phase}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
            <label className="relative"><span className="sr-only">{t('repository.allTypes')}</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={selectClass}><option value="all">{t('repository.allTypes')}</option>{types.map((type) => <option key={type}>{type}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
          </div>
        </div>

        {status === 'loading' && <div className="grid min-h-[300px] place-items-center font-semibold text-[#555]" role="status">{t('common.loading')}</div>}
        {status === 'error' && <div className="border-l-4 border-red-600 bg-red-50 p-6" role="alert"><p className="font-semibold text-red-800">{t('common.error')}</p><button type="button" onClick={load} className="mt-3 cursor-pointer text-[#ca7428] underline">{t('common.retry')}</button></div>}

        {status === 'ready' && <p className="text-[14px] font-medium text-[#888]" aria-live="polite">{t('repository.found', { count: filtered.length })}</p>}

        {status === 'ready' && filtered.length === 0 && <div className="border-2 border-dashed border-[#bfc0c5] bg-white py-14 text-center text-[14px] font-semibold text-[#777]">{t('repository.noResults')}</div>}

        {status === 'ready' && filtered.length > 0 && (
          <div className="grid gap-6">
            {filtered.map((document) => {
              const Icon = documentIcon(document.fileFormat);
              return (
                <article key={document.id} className="flex flex-col gap-5 bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.10)] transition-shadow hover:shadow-[0_12px_30px_rgba(0,0,0,0.14)] sm:flex-row sm:items-start">
                  <span className="grid h-12 w-12 flex-shrink-0 place-items-center text-[#555]"><Icon size={35} /></span>
                  <div className="min-w-0 flex-1"><h2 className="text-[16px] font-semibold text-[#444]">{document.title}</h2><p className="mt-1 text-[13px] leading-relaxed text-[#777]">{document.description}</p><p className="mt-2 text-[11px] font-medium text-[#999]">{document.pilot} - {formatDate(document.updatedAt, { dateStyle: 'medium' })}</p><div className="mt-3 flex flex-wrap gap-2"><span className="bg-[#f68b2c] px-2.5 py-1 text-[11px] font-semibold text-white">Phase {document.phase}</span><span className="bg-[#e8f0f7] px-2.5 py-1 text-[11px] font-medium text-[#444]">{document.documentType}</span>{document.tags.map((tag) => <span key={tag} className="bg-[#f0f0f0] px-2.5 py-1 text-[11px] font-medium text-[#444]">{tag}</span>)}</div></div>
                  <button type="button" onClick={() => { downloadRecord(document); toast.success(t('repository.downloaded')); }} className="flex min-h-11 flex-shrink-0 cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]"><Download size={15} />{t('repository.downloadRecord')}</button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </SpicePublicShell>
  );
}
