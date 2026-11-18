import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { Check, ChevronDown, CircleAlert, FileText, FolderUp, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import ModalPortal from './ModalPortal';
import ChatbotPilotFlag from './ChatbotPilotFlag';
import { useI18n } from '../context/I18nContext';
import { ApiError, apiRequest } from '../lib/api';
import { CHATBOT_PILOTS, type ChatbotPilot } from '../data/chatbotPilots';
import type { TranslationKey } from '../i18n/translations';

type Stage = 'received' | 'paused' | 'saving' | 'rebuilding' | 'restarting' | 'ready';
type PilotSlug = ChatbotPilot['slug'];

interface DocumentJob {
  id: string;
  city: string;
  files: string[];
  result: string;
  stage: Stage | null;
  finishedAt: string | null;
}

interface DocumentStatus {
  /** False when the document service of the chatbot is not configured. */
  connected: boolean;
  chatbotAvailable: boolean;
  stage: Stage | null;
  jobs: DocumentJob[];
  log: string[];
  /** The pilots whose documents the user may update. */
  pilots: PilotSlug[];
}

interface UploadedDocument {
  name: string;
  size: number | null;
  uploadedAt: string | null;
  uploadedBy: string | null;
}

const STAGES: Array<{ id: Stage; labelKey: TranslationKey }> = [
  { id: 'received', labelKey: 'documents.step.received' },
  { id: 'paused', labelKey: 'documents.step.paused' },
  { id: 'saving', labelKey: 'documents.step.saving' },
  { id: 'rebuilding', labelKey: 'documents.step.rebuilding' },
  { id: 'restarting', labelKey: 'documents.step.restarting' },
  { id: 'ready', labelKey: 'documents.step.ready' },
];

// The names of the pilots in the document service.
const SERVICE_CITY: Record<PilotSlug, string> = { thessaloniki: 'Thessaloniki', cuba: 'Cuba', 'bielsko-biala': 'BielskoBiala', rovaniemi: 'Rovaniemi' };

const BUSY_POLL_MS = 2500;
const IDLE_POLL_MS = 15000;

function resultKey(result: string): TranslationKey {
  const value = result.toLowerCase();
  if (/(success|done|complete|ready|ok)/.test(value)) return 'documents.result.success';
  if (/(fail|error)/.test(value)) return 'documents.result.failed';
  return 'documents.result.running';
}

function fileSize(bytes: number | null) {
  if (bytes == null) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The Municipality uploads PDF documents for its pilot and sees the documents the chatbot already
 * answers from; the document service of the AI Chatbot stores them and rebuilds the knowledge of the
 * pilot, while the steps of the update light up as they run.
 */
export default function ChatbotDocumentManager({ onClose, initialPilot }: { onClose: () => void; initialPilot?: PilotSlug }) {
  const { t, formatDate } = useI18n();
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pilotSlug, setPilotSlug] = useState<PilotSlug | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[] | null>(null);
  const [chosen, setChosen] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await apiRequest<DocumentStatus>('/api/chatbot/documents/status'));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  const loadDocuments = useCallback(async (slug: PilotSlug) => {
    try {
      const result = await apiRequest<{ documents: UploadedDocument[] }>(`/api/chatbot/documents?pilot=${encodeURIComponent(slug)}`);
      setDocuments(result.documents);
    } catch {
      setDocuments([]);
    }
  }, []);

  const busy = Boolean(status?.connected && (!status.chatbotAvailable || (status.stage && status.stage !== 'ready')));
  const connected = Boolean(status?.connected) && !loadError;

  // While an update runs, the status is followed every few seconds; otherwise now and then.
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), busy || uploading ? BUSY_POLL_MS : IDLE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [busy, load, uploading]);

  // One pilot at a time: the user's own pilot, or the one chosen by an administrator.
  useEffect(() => {
    if (!status || pilotSlug) return;
    setPilotSlug(status.pilots.includes(initialPilot as PilotSlug) ? initialPilot as PilotSlug : status.pilots[0] || null);
  }, [initialPilot, pilotSlug, status]);

  // The list is read again when the pilot changes and when an update has finished.
  useEffect(() => {
    if (!pilotSlug || busy) return;
    setDocuments(null);
    void loadDocuments(pilotSlug);
  }, [busy, loadDocuments, pilotSlug]);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pilot = CHATBOT_PILOTS.find((item) => item.slug === pilotSlug) || null;

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list || []);
    const pdfs = picked.filter((file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
    if (pdfs.length < picked.length) toast.error(t('documents.onlyPdf'));
    if (!pdfs.length) return;
    setChosen((current) => {
      const names = new Set(current.map((file) => file.name));
      return [...current, ...pdfs.filter((file) => !names.has(file.name))];
    });
  };

  const upload = async () => {
    if (!pilot || !chosen.length) return;
    setUploading(true);
    const form = new FormData();
    form.append('city', SERVICE_CITY[pilot.slug]);
    chosen.forEach((file) => form.append('files', file, file.name));
    try {
      await apiRequest(`/api/chatbot/documents/upload?pilot=${encodeURIComponent(pilot.slug)}`, { method: 'POST', body: form });
      setChosen([]);
      toast.success(t('documents.uploaded', { pilot: pilot.name }));
      await Promise.all([load(), loadDocuments(pilot.slug)]);
    } catch (caught) {
      toast.error(caught instanceof ApiError && caught.code === 'DOCUMENTS_PDF_ONLY' ? t('documents.onlyPdf') : t('documents.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    addFiles(event.dataTransfer.files);
  };

  const stageIndex = status?.stage ? STAGES.findIndex((stage) => stage.id === status.stage) : -1;
  const allReady = !busy && (status?.stage === 'ready' || stageIndex === -1);
  const pilotJobs = (status?.jobs || []).filter((job) => !pilot || !job.city || job.city === SERVICE_CITY[pilot.slug]);

  // Whether the chatbot and its document service are online, shown next to the title.
  const serviceState: { labelKey: TranslationKey; tone: string; dot: string; pulse: boolean } = !status && !loadError
    ? { labelKey: 'documents.state.checking', tone: 'bg-[#f0f0f2] text-[#555]', dot: 'bg-[#9c9da3]', pulse: true }
    : !connected
      ? { labelKey: 'documents.state.offline', tone: 'bg-[#f0f0f2] text-[#555]', dot: 'bg-[#8a8b90]', pulse: false }
      : busy
        ? { labelKey: 'documents.state.updating', tone: 'bg-[#fff0e1] text-[#8a4b16]', dot: 'bg-[#f68b2c]', pulse: true }
        : { labelKey: 'documents.state.online', tone: 'bg-[#eaf2e3] text-[#47662f]', dot: 'bg-[#59713d]', pulse: false };

  const banner = !connected
    ? { tone: 'border-[#d5d6da] bg-[#f6f6f7] text-[#444]', icon: <CircleAlert size={24} className="flex-none text-[#666]" aria-hidden="true" />, title: t('documents.notConnected'), text: t('documents.notConnectedText') }
    : busy
      ? { tone: 'border-[#f0b77f] bg-[#fff6ec] text-[#5c3511]', icon: <Loader2 size={24} className="flex-none animate-spin text-[#ca7428] motion-reduce:animate-none" aria-hidden="true" />, title: t('documents.updating'), text: t('documents.updatingText') }
      : { tone: 'border-[#9cc08a] bg-[#eef6e8] text-[#2f4a1f]', icon: <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-[#59713d] text-white"><Check size={18} aria-hidden="true" /></span>, title: t('documents.ready'), text: t('documents.readyText') };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/55 p-4" onMouseDown={(mouse) => { if (mouse.target === mouse.currentTarget) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="documents-title" className="relative mx-auto my-6 w-full max-w-[1040px] rounded-xl border border-[#b2b2b8] bg-white shadow-2xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <header className="flex items-start justify-between gap-4 border-b border-[#e6e6e8] px-6 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><FolderUp size={21} aria-hidden="true" /></span>
              <div>
                <h2 id="documents-title" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[21px] font-bold text-[#444]">
                  {t('documents.title')}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${serviceState.tone}`}>
                    <span className={`h-2 w-2 rounded-full ${serviceState.dot} ${serviceState.pulse ? 'animate-pulse motion-reduce:animate-none' : ''}`} aria-hidden="true" />
                    {t(serviceState.labelKey)}
                  </span>
                </h2>
                <p className="mt-0.5 text-[13px] text-[#666]">{t('documents.subtitle')}</p>
              </div>
            </div>
            <button ref={closeRef} type="button" onClick={onClose} className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-md hover:bg-[#f4f4f4]" aria-label={t('common.close')}><X size={20} /></button>
          </header>

          <div className="grid gap-5 px-6 py-5">
            <div className={`flex items-center gap-4 rounded-lg border px-5 py-4 ${banner.tone}`} role="status" aria-live="polite">
              {banner.icon}
              <div>
                <p className="text-[16px] font-bold">{banner.title}</p>
                <p className="text-[13px]">{banner.text}</p>
              </div>
            </div>

            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label={t('documents.stepsLabel')}>
              {STAGES.map((stage, index) => {
                const done = connected && (allReady || index < stageIndex);
                const current = connected && !allReady && index === stageIndex;
                return (
                  <li
                    key={stage.id}
                    aria-current={current ? 'step' : undefined}
                    className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-center text-[12px] font-semibold ${current ? 'bg-[#f68b2c] text-white' : done ? 'bg-[#e3efdb] text-[#2f4a1f]' : 'bg-[#f0f0f2] text-[#666]'}`}
                  >
                    {current && <Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {done && !current && <Check size={13} aria-hidden="true" />}
                    {t(stage.labelKey)}
                  </li>
                );
              })}
            </ol>

            {status && !pilot && <p className="rounded-lg border border-dashed border-[#bfc0c5] p-4 text-[13px] text-[#666]">{t('documents.noPilot')}</p>}

            {pilot && (
              <article className="rounded-xl border border-[#d5d6da] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e6e8] px-5 py-3">
                  <h3 className="flex items-center gap-2 text-[17px] font-bold text-[#333]"><ChatbotPilotFlag slug={pilot.slug} />{pilot.name}</h3>
                  {status && status.pilots.length > 1 && (
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-[#444]">
                      {t('documents.pilotLabel')}
                      <span className="relative flex items-center">
                        <select value={pilot.slug} onChange={(event) => { setPilotSlug(event.target.value as PilotSlug); setChosen([]); }} className="min-h-10 cursor-pointer appearance-none rounded-md border border-[#bfc0c5] bg-white pl-3 pr-9 text-[14px] font-medium text-[#444] focus:border-[#ca7428] focus:outline-none">
                          {CHATBOT_PILOTS.filter((item) => status.pilots.includes(item.slug)).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3 text-[#666]" aria-hidden="true" />
                      </span>
                    </label>
                  )}
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-2">
                  <section aria-labelledby="documents-add" className="flex flex-col gap-3">
                    <h4 id="documents-add" className="text-[14px] font-bold text-[#444]">{t('documents.addTitle')}</h4>
                    <label
                      htmlFor="documents-files"
                      onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 text-center text-[13px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#ca7428] ${dragOver ? 'border-[#ca7428] bg-[#fff6ec] text-[#8a4b16]' : 'border-[#c9cace] text-[#555] hover:border-[#9c9da3]'} ${connected ? '' : 'pointer-events-none bg-[#fafafb] opacity-60'}`}
                    >
                      <Upload size={20} className="text-[#ca7428]" aria-hidden="true" />
                      {t('documents.drop')}
                      <input id="documents-files" type="file" accept="application/pdf,.pdf" multiple className="sr-only" disabled={!connected} onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
                    </label>
                    {chosen.length > 0 && (
                      <ul className="grid gap-1">
                        {chosen.map((file) => (
                          <li key={file.name} className="flex items-center gap-2 rounded-md bg-[#f6f6f7] px-2 py-1 text-[12px] text-[#444]">
                            <FileText size={14} className="flex-none text-[#ca7428]" aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                            <span className="flex-none text-[#666]">{fileSize(file.size)}</span>
                            <button type="button" onClick={() => setChosen((current) => current.filter((item) => item.name !== file.name))} aria-label={t('documents.remove', { file: file.name })} className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded hover:bg-[#e6e6e8]"><X size={14} aria-hidden="true" /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => void upload()}
                      disabled={!chosen.length || uploading || !connected || busy}
                      className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f68b2c] px-4 text-[14px] font-bold text-white hover:bg-[#df771d] disabled:cursor-not-allowed disabled:bg-[#ececee] disabled:text-[#6b6b70]"
                    >
                      {uploading ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <FolderUp size={16} aria-hidden="true" />}
                      {uploading ? t('documents.uploading') : t('documents.upload')}
                    </button>
                  </section>

                  <section aria-labelledby="documents-current" className="flex min-w-0 flex-col gap-3">
                    <h4 id="documents-current" className="flex items-center gap-2 text-[14px] font-bold text-[#444]">
                      {t('documents.currentTitle')}
                      {documents && <span className="rounded-full bg-[#eef0f3] px-2 py-0.5 text-[12px] text-[#444]">{documents.length}</span>}
                    </h4>
                    {documents === null ? (
                      <p className="flex items-center gap-2 text-[13px] text-[#666]"><Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{t('common.loading')}</p>
                    ) : documents.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[#c9cace] p-4 text-[13px] text-[#666]">{t('documents.noDocuments')}</p>
                    ) : (
                      <ul className="max-h-[260px] divide-y divide-[#eee] overflow-y-auto rounded-lg border border-[#e6e6e8]">
                        {documents.map((document) => (
                          <li key={`${document.name}-${document.uploadedAt}`} className="flex items-start gap-3 px-3 py-2.5">
                            <FileText size={16} className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-[#333]" title={document.name}>{document.name}</span>
                              <span className="block text-[12px] text-[#666]">
                                {[fileSize(document.size), document.uploadedAt ? formatDate(document.uploadedAt, { dateStyle: 'medium' }) : null, document.uploadedBy].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </article>
            )}

            <section aria-labelledby="documents-recent">
              <h3 id="documents-recent" className="text-[16px] font-bold text-[#333]">{t('documents.recent')}</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b-2 border-[#e6e6e8] text-[12px] uppercase tracking-wide text-[#555]">
                      <th scope="col" className="px-2 py-2 font-bold">{t('documents.col.id')}</th>
                      <th scope="col" className="px-2 py-2 font-bold">{t('documents.col.files')}</th>
                      <th scope="col" className="px-2 py-2 font-bold">{t('documents.col.result')}</th>
                      <th scope="col" className="px-2 py-2 font-bold">{t('documents.col.finished')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pilotJobs.length ? pilotJobs.map((job) => {
                      const key = resultKey(job.result);
                      return (
                        <tr key={job.id} className="border-b border-[#eee] text-[#444]">
                          <td className="px-2 py-2 font-mono text-[12px]">{job.id}</td>
                          <td className="max-w-[420px] px-2 py-2"><span className="line-clamp-2" title={job.files.join(', ')}>{job.files.join(', ') || '—'}</span></td>
                          <td className="px-2 py-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${key === 'documents.result.success' ? 'bg-[#eaf2e3] text-[#47662f]' : key === 'documents.result.failed' ? 'bg-[#fdecea] text-[#b3261e]' : 'bg-[#fff0e1] text-[#8a4b16]'}`}>{t(key)}</span>
                          </td>
                          <td className="px-2 py-2 text-[#555]">{job.finishedAt ? formatDate(job.finishedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={4} className="px-2 py-3 text-[#666]">{t('documents.noUpdates')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <details className="group rounded-lg border border-[#e6e6e8]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[14px] font-bold text-[#444]">
                <ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden="true" />{t('documents.log')}
              </summary>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap border-t border-[#e6e6e8] bg-[#fafafb] px-4 py-3 font-mono text-[12px] leading-relaxed text-[#444]">{status?.log.length ? status.log.join('\n') : t('documents.noLog')}</pre>
            </details>
          </div>
        </section>
      </div>
    </ModalPortal>
  );
}
