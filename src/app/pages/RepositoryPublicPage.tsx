import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, File, FileArchive, FileImage, FileText, Search, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router';
import SpicePublicShell from '../components/SpicePublicShell';
import StandardPageHeader from '../components/StandardPageHeader';
import ModalPortal from '../components/ModalPortal';
import { FieldMessage, FormField } from '../components/FormLayout';
import { useI18n } from '../context/I18nContext';
import { usePermissions } from '../auth/usePermissions';
import { useAuth } from '../context/AuthContext';
import { apiRequest, ApiError, jsonBody } from '../lib/api';
import LoadingState from '../components/LoadingState';
import { statusKey } from '../lib/statusLabel';
import type { TranslationKey } from '../i18n/translations';
import { localizedApiError, localizedFieldErrors } from '../lib/localizedApiError';
import { getTools } from '../data/tools';

type PublicationStatus = 'draft' | 'ready_for_review' | 'published' | 'archived';

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
  publicationStatus: PublicationStatus;
  uploadedByUserId: number | null;
  phaseId: number | null;
  activityId: number | null;
  resultType: string | null;
  toolKey: string | null;
  publishedAt: string | null;
  publishedByName: string | null;
  uploadedByName: string | null;
  relatedActivityTitle: string | null;
}

interface RepositoryActivityOption {
  id: number;
  title: string;
  selectedToolIds: string[];
}

interface RepositoryHubContext {
  id: number;
  phases: Array<{ phaseNumber: number; activities: RepositoryActivityOption[] }>;
}

const STATUS_STYLES: Record<PublicationStatus, string> = {
  draft: 'bg-[#f2f2f2] text-[#666]',
  ready_for_review: 'bg-[#fff5d9] text-[#7a5b00]',
  published: 'bg-[#e7f2df] text-[#47662f]',
  archived: 'bg-[#eee] text-[#888]',
};

const DOCUMENT_TYPES: Array<{ value: string; key: TranslationKey }> = [
  { value: 'Workshop notes', key: 'repository.type.workshopNotes' }, { value: 'Workshop outputs', key: 'repository.type.workshopOutputs' },
  { value: 'Report', key: 'repository.type.report' }, { value: 'Summary', key: 'repository.type.summary' },
  { value: 'Method', key: 'repository.type.method' }, { value: 'Evaluation', key: 'repository.type.evaluation' },
  { value: 'Photos', key: 'repository.type.photos' }, { value: '3D export', key: 'repository.type.3dExport' },
];
const documentTypeKey = (value: string) => DOCUMENT_TYPES.find((item) => item.value === value)?.key;
const FILE_FORMATS = ['PDF', 'ZIP', 'PNG', 'JPG', 'DOCX', 'XLSX', 'GLTF'];
const RESULT_TYPES = [
  'workshop_summary', 'participation_summary', 'tool_output', 'citizen_contribution_summary',
  'map_or_visual', 'proposal', 'voting_result', 'municipality_decision', 'report',
  'dataset', 'media_collection', 'lessons_learned',
];

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
  const { t, tp, formatDate, language } = useI18n();
  const { can } = usePermissions();
  const { user } = useAuth();
  const canUpload = can('repository:upload');
  const canManage = can('repository:manage');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', phase: '', activityId: '', toolKey: '', documentType: '', fileFormat: '', resultType: '', tags: '' });
  const [hubContext, setHubContext] = useState<RepositoryHubContext | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPhase = searchParams.get('phase');
  const requestedPilotId = searchParams.get('pilotId');
  const requestedPhaseId = searchParams.get('phaseId');
  const requestedContentType = searchParams.get('contentType');
  const returnPhase = searchParams.get('returnPhase') || requestedPhase || '1';
  const initialPhase = requestedPhase && ['1', '2', '3', '4', '5'].includes(requestedPhase) ? requestedPhase : 'all';
  const [documents, setDocuments] = useState<RepositoryDocument[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [pilotFilter, setPilotFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState(initialPhase);
  const [typeFilter, setTypeFilter] = useState('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const requestParams = new URLSearchParams();
      if (requestedPilotId) requestParams.set('pilotId', requestedPilotId);
      if (requestedPhaseId) requestParams.set('phaseId', requestedPhaseId);
      if (requestedPhase) requestParams.set('phase', requestedPhase);
      if (requestedContentType) requestParams.set('contentType', requestedContentType);
      const result = await apiRequest<{ documents: RepositoryDocument[] }>(`/api/repository?${requestParams.toString()}`);
      setDocuments(result.documents);
      setStatus('ready');
    } catch { setStatus('error'); }
  }, [requestedContentType, requestedPhase, requestedPhaseId, requestedPilotId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!canUpload) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await apiRequest<{ initiatives: Array<{ id: number }> }>('/api/hub/initiatives');
        const initiativeId = requestedPilotId ? Number(requestedPilotId) : list.initiatives[0]?.id;
        if (!initiativeId) return;
        const detail = await apiRequest<{ initiative: RepositoryHubContext }>(`/api/hub/initiatives/${initiativeId}`);
        if (!cancelled) setHubContext(detail.initiative);
      } catch {
        if (!cancelled) setHubContext(null);
      }
    })();
    return () => { cancelled = true; };
  }, [canUpload, requestedPilotId]);

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

  const submitUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      const result = await apiRequest<{ document: RepositoryDocument }>('/api/repository', {
        method: 'POST',
        body: jsonBody({
          title: form.title,
          description: form.description,
          phase: Number(form.phase),
          documentType: form.documentType,
          fileFormat: form.fileFormat,
          resultType: form.resultType || null,
          activityId: form.activityId ? Number(form.activityId) : null,
          toolKey: form.toolKey || null,
          pilotId: requestedPilotId ? Number(requestedPilotId) : undefined,
          tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      setDocuments((current) => [result.document, ...current]);
      setForm({ title: '', description: '', phase: '', activityId: '', toolKey: '', documentType: '', fileFormat: '', resultType: '', tags: '' });
      setUploadOpen(false);
      toast.success(t('repository.draftSaved'));
    } catch (caught) {
      const apiError = caught as ApiError;
      setFormErrors(localizedFieldErrors(t, apiError.fieldErrors));
      toast.error(localizedApiError(t, apiError));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (document: RepositoryDocument, publicationStatus: PublicationStatus) => {
    try {
      const result = await apiRequest<{ document: RepositoryDocument }>(`/api/repository/${document.id}/status`, {
        method: 'PATCH', body: jsonBody({ publicationStatus }),
      });
      setDocuments((current) => current.map((item) => item.id === document.id ? result.document : item));
      toast.success(t('repository.statusChanged', { status: t(statusKey(publicationStatus)) }));
    } catch (caught) {
      toast.error(localizedApiError(t, caught));
    }
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
  const contextualPhase = initialPhase !== 'all' ? Number(initialPhase) : null;
  const contextualTitle = contextualPhase
    ? t('repository.phaseResultsTitle', { phase: contextualPhase, title: t(`hub.phase${contextualPhase}` as TranslationKey) })
    : t('nav.repository');
  const activityOptions = hubContext?.phases.find((phase) => phase.phaseNumber === Number(form.phase))?.activities || [];
  const toolOptions = getTools(language).filter((tool) => tool.phase === Number(form.phase));

  return (
    <SpicePublicShell>
      <StandardPageHeader
        icon={FileText}
        eyebrow={t('repository.eyebrow')}
        title={contextualTitle}
        description={t('repository.subtitle')}
        actions={canUpload ? (
          <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex min-h-12 cursor-pointer items-center gap-2 whitespace-nowrap bg-[#f68b2c] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]">
            <Upload size={18} aria-hidden="true" /> {t('repository.upload')}
          </button>
        ) : undefined}
      />
      <div className="spice-page spice-wide-page flex flex-col gap-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>

        {contextualPhase && (
          <nav aria-label={t('common.breadcrumb')} className="flex flex-wrap items-center gap-2 text-[13px] text-[#666]">
            <Link to={`/co-creation-hub?phase=${returnPhase}`} className="font-bold text-[#a85f20] underline underline-offset-4">{t('nav.coCreationHub')}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{contextualTitle}</span>
            <Link to={`/co-creation-hub?phase=${returnPhase}`} className="ml-auto inline-flex min-h-11 items-center border-2 border-[#444] px-4 font-bold text-[#444] hover:border-[#ca7428] hover:text-[#a85f20]">{t('repository.backToPhase')}</Link>
          </nav>
        )}

        <div className="flex flex-col items-start gap-3 lg:flex-row">
          <label className="flex min-h-11 w-full flex-1 items-center gap-3 border border-gray-300 bg-white px-4 py-3 focus-within:border-[#ca7428]"><Search size={18} className="flex-shrink-0 text-[#888]" /><span className="sr-only">{t('repository.search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('repository.search')} className="min-w-0 flex-1 bg-transparent text-[14px] text-[#444] outline-none placeholder:text-[#aaa]" /></label>
          <div className="spice-form-grid w-full gap-3 sm:grid-cols-3 sm:[&>label]:min-w-[185px] lg:w-auto">
            <label className="relative"><span className="sr-only">{t('repository.allPilots')}</span><select value={pilotFilter} onChange={(event) => setPilotFilter(event.target.value)} disabled={Boolean(requestedPilotId)} className={`${selectClass} disabled:cursor-not-allowed disabled:bg-[#f2f2f2] disabled:text-[#666]`}><option value="all">{requestedPilotId ? t('repository.selectedPilot') : t('repository.allPilots')}</option>{pilots.map((pilot) => <option key={pilot}>{pilot}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
            <label className="relative"><span className="sr-only">{t('repository.allPhases')}</span><select value={phaseFilter} onChange={(event) => updatePhaseFilter(event.target.value)} disabled={Boolean(requestedPhaseId)} className={`${selectClass} disabled:cursor-not-allowed disabled:bg-[#f2f2f2] disabled:text-[#666]`}><option value="all">{t('repository.allPhases')}</option>{[1, 2, 3, 4, 5].map((phase) => <option key={phase} value={phase}>{t('repository.phase', { phase })}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
            <label className="relative"><span className="sr-only">{t('repository.allTypes')}</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={selectClass}><option value="all">{t('repository.allTypes')}</option>{types.map((type) => <option key={type}>{type}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#444]" /></label>
          </div>
        </div>

        {status === 'loading' && <LoadingState message={t('common.loading')} minHeight="300px" />}
        {status === 'error' && <div className="border-l-4 border-red-600 bg-red-50 p-6" role="alert"><p className="font-semibold text-red-800">{t('common.error')}</p><button type="button" onClick={load} className="mt-3 cursor-pointer text-[#ca7428] underline">{t('common.retry')}</button></div>}

        {status === 'ready' && <p className="text-[14px] font-medium text-[#888]" aria-live="polite">{tp(filtered.length, { one: 'repository.found.one', few: 'repository.found.few', many: 'repository.found.many', other: 'repository.found.other' })}</p>}

        {status === 'ready' && filtered.length === 0 && <div className="spice-card-dashed py-14 text-center text-[14px] font-semibold text-[#777]">{t('repository.noResults')}</div>}

        {status === 'ready' && filtered.length > 0 && (
          <div className="grid gap-6">
            {filtered.map((document) => {
              const Icon = documentIcon(document.fileFormat);
              return (
                <article key={document.id} className="flex flex-col gap-5 spice-card p-6 sm:flex-row sm:items-start">
                  <span className="grid h-12 w-12 flex-shrink-0 place-items-center text-[#555]"><Icon size={35} /></span>
<div className="min-w-0 flex-1"><h2 className="text-[16px] font-semibold text-[#444]">{document.title}</h2><p className="mt-1 text-[13px] leading-relaxed text-[#777]">{document.description}</p><p className="mt-2 text-[11px] font-medium text-[#777]">{document.pilot} · {formatDate(document.publishedAt || document.updatedAt, { dateStyle: 'medium' })}{document.publishedByName ? ` · ${t('repository.publishedBy', { name: document.publishedByName })}` : ''}</p>{document.relatedActivityTitle && <p className="mt-2 text-[12px] text-[#666]"><strong>{t('repository.relatedActivity')}:</strong> {document.relatedActivityTitle}</p>}<div className="mt-3 flex flex-wrap gap-2">{canUpload && document.publicationStatus !== 'published' && <span className={`px-2.5 py-1 text-[11px] font-bold uppercase ${STATUS_STYLES[document.publicationStatus]}`}>{t(statusKey(document.publicationStatus))}</span>}<span className="bg-[#f68b2c] px-2.5 py-1 text-[11px] font-semibold text-white">{t('repository.phase', { phase: document.phase })}</span><span className="bg-[#e8f0f7] px-2.5 py-1 text-[11px] font-medium text-[#444]">{documentTypeKey(document.documentType) ? t(documentTypeKey(document.documentType)!) : document.documentType}</span>{document.resultType && <span className="bg-[#e7f2df] px-2.5 py-1 text-[11px] font-medium text-[#47662f]">{t(`repository.resultType.${document.resultType}` as TranslationKey)}</span>}{document.tags.map((tag) => <span key={tag} className="bg-[#f0f0f0] px-2.5 py-1 text-[11px] font-medium text-[#444]">{tag}</span>)}</div></div>
                  <div className="flex flex-shrink-0 flex-col gap-2">
                    <button type="button" onClick={() => { downloadRecord(document); toast.success(t('repository.downloaded')); }} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-[#f68b2c] px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#e07a20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#444]"><Download size={15} />{t('repository.downloadRecord')}</button>
                    {canUpload && !canManage && document.publicationStatus === 'draft' && document.uploadedByUserId === user?.id && (
                      <button type="button" onClick={() => void changeStatus(document, 'ready_for_review')} className="min-h-11 cursor-pointer border-2 border-[#444] px-4 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]">{t('repository.submitReview')}</button>
                    )}
                    {canManage && document.publicationStatus !== 'published' && (
                      <button type="button" onClick={() => void changeStatus(document, 'published')} className="min-h-11 cursor-pointer border-2 border-[#59713d] bg-[#e7f2df] px-4 text-[13px] font-bold text-[#47662f]">{t('repository.publish')}</button>
                    )}
                    {canManage && document.publicationStatus === 'published' && (
                      <button type="button" onClick={() => void changeStatus(document, 'archived')} className="min-h-11 cursor-pointer border-2 border-[#a86622] px-4 text-[13px] font-bold text-[#a86622] hover:bg-[#fff3e8]">{t('repository.archive')}</button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {uploadOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto overscroll-contain bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="repository-upload-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setUploadOpen(false); }}>
            <form onSubmit={submitUpload} className="relative z-10 my-8 w-full max-w-[660px] border-2 border-[#bfc0c5] bg-white p-6 shadow-2xl md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="repository-upload-title" className="text-[26px] font-bold text-[#444]">{t('repository.upload')}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{t(canManage ? 'repository.uploadTextManager' : 'repository.uploadTextContributor')}</p>
                </div>
                <button type="button" onClick={() => setUploadOpen(false)} aria-label={t('common.close')} className="grid h-11 w-11 flex-none cursor-pointer place-items-center hover:bg-[#f2f2f2]"><X size={22} /></button>
              </div>

              <FormField className="mt-6 gap-2 text-[14px] font-bold text-[#444]">{t('repository.titleField')}
                <input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} className={`w-full border-2 px-4 py-3 font-medium outline-none focus:border-[#f68b2c] ${formErrors.title ? 'border-red-600' : 'border-[#bfc0c5]'}`} aria-invalid={Boolean(formErrors.title)} required />
                {formErrors.title && <FieldMessage tone="error">{formErrors.title}</FieldMessage>}
              </FormField>

              <FormField className="mt-5 gap-2 text-[14px] font-bold text-[#444]">{t('repository.descriptionField')}
                <textarea value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} rows={4} className={`w-full resize-y border-2 px-4 py-3 font-medium outline-none focus:border-[#f68b2c] ${formErrors.description ? 'border-red-600' : 'border-[#bfc0c5]'}`} aria-invalid={Boolean(formErrors.description)} required />
                {formErrors.description && <FieldMessage tone="error">{formErrors.description}</FieldMessage>}
              </FormField>

              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('repository.phaseField')}
                  <select value={form.phase} onChange={(event) => setForm((value) => ({ ...value, phase: event.target.value, activityId: '', toolKey: '' }))} className={`w-full cursor-pointer border-2 bg-white px-3 py-3 font-medium outline-none focus:border-[#f68b2c] ${formErrors.phase ? 'border-red-600' : 'border-[#bfc0c5]'}`} required>
                    <option value="">{t('repository.select')}</option>
                    {[1, 2, 3, 4, 5].map((phase) => <option key={phase} value={phase}>{t('repository.phase', { phase })}</option>)}
                  </select>
                  {formErrors.phase && <FieldMessage tone="error">{formErrors.phase}</FieldMessage>}
                </FormField>
                <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('repository.documentType')}
                  <select value={form.documentType} onChange={(event) => setForm((value) => ({ ...value, documentType: event.target.value }))} className={`w-full cursor-pointer border-2 bg-white px-3 py-3 font-medium outline-none focus:border-[#f68b2c] ${formErrors.documentType ? 'border-red-600' : 'border-[#bfc0c5]'}`} required>
                    <option value="">{t('repository.select')}</option>
                    {DOCUMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{t(type.key)}</option>)}
                  </select>
                  {formErrors.documentType && <FieldMessage tone="error">{formErrors.documentType}</FieldMessage>}
                </FormField>
                <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('repository.fileFormat')}
                  <select value={form.fileFormat} onChange={(event) => setForm((value) => ({ ...value, fileFormat: event.target.value }))} className={`w-full cursor-pointer border-2 bg-white px-3 py-3 font-medium outline-none focus:border-[#f68b2c] ${formErrors.fileFormat ? 'border-red-600' : 'border-[#bfc0c5]'}`} required>
                    <option value="">{t('repository.select')}</option>
                    {FILE_FORMATS.map((format) => <option key={format}>{format}</option>)}
                  </select>
                  {formErrors.fileFormat && <FieldMessage tone="error">{formErrors.fileFormat}</FieldMessage>}
                </FormField>
                <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('repository.resultType')}
                  <select value={form.resultType} onChange={(event) => setForm((value) => ({ ...value, resultType: event.target.value }))} className="w-full cursor-pointer border-2 border-[#bfc0c5] bg-white px-3 py-3 font-medium outline-none focus:border-[#f68b2c]">
                    <option value="">{t('repository.resourceNotResult')}</option>
                    {RESULT_TYPES.map((resultType) => <option key={resultType} value={resultType}>{t(`repository.resultType.${resultType}` as TranslationKey)}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('repository.relatedActivityField')}
                  <select value={form.activityId} onChange={(event) => setForm((value) => ({ ...value, activityId: event.target.value }))} disabled={!form.phase || activityOptions.length === 0} className="w-full cursor-pointer border-2 border-[#bfc0c5] bg-white px-3 py-3 font-medium outline-none focus:border-[#f68b2c] disabled:cursor-not-allowed disabled:bg-[#f2f2f2]">
                    <option value="">{t(activityOptions.length ? 'repository.noRelatedActivity' : 'repository.noActivitiesForPhase')}</option>
                    {activityOptions.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}
                  </select>
                </FormField>
                <FormField className="gap-2 text-[14px] font-bold text-[#444]">{t('repository.relatedToolField')}
                  <select value={form.toolKey} onChange={(event) => setForm((value) => ({ ...value, toolKey: event.target.value }))} disabled={!form.phase} className="w-full cursor-pointer border-2 border-[#bfc0c5] bg-white px-3 py-3 font-medium outline-none focus:border-[#f68b2c] disabled:cursor-not-allowed disabled:bg-[#f2f2f2]">
                    <option value="">{t('repository.noRelatedTool')}</option>
                    {toolOptions.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
                  </select>
                </FormField>
              </div>

              <FormField className="mt-5 gap-2 text-[14px] font-bold text-[#444]">{t('repository.tags')} <span className="font-medium text-[#888]">{t('repository.tagsHint')}</span>
                <input value={form.tags} onChange={(event) => setForm((value) => ({ ...value, tags: event.target.value }))} placeholder={t('repository.tagsPlaceholder')} className="w-full border-2 border-[#bfc0c5] px-4 py-3 font-medium outline-none focus:border-[#f68b2c]" />
              </FormField>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setUploadOpen(false)} className="min-h-12 cursor-pointer border-2 border-[#444] px-5 py-3 font-bold text-[#444]">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="min-h-12 cursor-pointer bg-[#f68b2c] px-6 py-3 font-bold text-white hover:bg-[#e07a20] disabled:cursor-wait disabled:opacity-60">{saving ? t('common.saving') : t('repository.saveDraft')}</button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </SpicePublicShell>
  );
}
