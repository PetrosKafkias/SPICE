import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Eye, FileText, Link2, Lock, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import ModalPortal from './ModalPortal';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { ApiError, apiRequest, jsonBody } from '../lib/api';
import { EVENT_ATTACHMENT_KINDS, type EventAttachment, type EventAttachmentKind, type HubEvent } from '../lib/events';

interface Props {
  event: HubEvent;
  /** The activities of the event, for their minutes and feedback. */
  activities: Array<{ id: number; title: string }>;
  /** True when the event is being completed; false when its report is edited afterwards. */
  completing: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const SURVEY_FIELDS: Array<{ key: 'influenceScore' | 'underrepresentedPct' | 'accessibilityPct' | 'trustScore' | 'belongingPct' | 'validationPct'; labelKey: TranslationKey; percent: boolean }> = [
  { key: 'influenceScore', labelKey: 'eventReport.survey.influence', percent: false },
  { key: 'underrepresentedPct', labelKey: 'eventReport.survey.underrepresented', percent: true },
  { key: 'accessibilityPct', labelKey: 'eventReport.survey.accessibility', percent: true },
  { key: 'trustScore', labelKey: 'eventReport.survey.trust', percent: false },
  { key: 'belongingPct', labelKey: 'eventReport.survey.belonging', percent: true },
  { key: 'validationPct', labelKey: 'eventReport.survey.validation', percent: true },
];

export const ATTACHMENT_KIND_KEYS: Record<EventAttachmentKind, TranslationKey> = {
  invitation: 'eventReport.annex.invitation',
  agenda: 'eventReport.annex.agenda',
  attendance: 'eventReport.annex.attendance',
  presentation: 'eventReport.annex.presentation',
  photo: 'eventReport.annex.photo',
  press: 'eventReport.annex.press',
};

const MAX_FILE_BYTES = 550_000;
const inputClass = 'mt-2 min-h-11 w-full rounded-md border-2 border-[#bfc0c5] bg-white px-3 text-[14px] font-normal focus:border-[#ca7428] focus:outline-none';
const textareaClass = 'mt-2 w-full resize-y rounded-md border-2 border-[#bfc0c5] bg-white p-3 text-[14px] font-normal focus:border-[#ca7428] focus:outline-none';
const labelClass = 'block text-[13px] font-bold text-[#444]';

const str = (value: unknown) => (value == null ? '' : String(value));

function percentage(part: string, total: string) {
  const a = Number(part);
  const b = Number(total);
  return part !== '' && total !== '' && Number.isFinite(a) && Number.isFinite(b) && b > 0 ? Math.round((a / b) * 100) : null;
}

/** Marks a field as shown to citizens or kept internal to the Municipality and facilitators. */
function Visibility({ internal }: { internal?: boolean }) {
  const { t } = useI18n();
  return internal
    ? <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#eef0f3] px-2 py-0.5 align-middle text-[11px] font-bold text-[#555]"><Lock size={11} aria-hidden="true" />{t('eventReport.internal')}</span>
    : <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#eaf2e3] px-2 py-0.5 align-middle text-[11px] font-bold text-[#47662f]"><Eye size={11} aria-hidden="true" />{t('eventReport.public')}</span>;
}

function Section({ title, internal, hint, children }: { title: string; internal?: boolean; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t-2 border-[#eee] pt-5">
      <legend className="pt-5 text-[15px] font-bold text-[#333]">{title}<Visibility internal={internal} /></legend>
      {hint && <p className="-mt-2 text-[13px] leading-relaxed text-[#666]">{hint}</p>}
      {children}
    </fieldset>
  );
}

/** The event report (SPICE Toolkit, Tool 17), filled in by the Municipality when an event ends. */
export default function EventReportDialog({ event, activities, completing, onClose, onSaved }: Props) {
  const { t } = useI18n();
  const report = event.report;
  const [form, setForm] = useState({
    date: (report?.date || event.startAt || '').slice(0, 10),
    location: report?.location || event.location || '',
    participants: str(report?.participants),
    shortArticle: report?.shortArticle || '',
    insights: report?.insights || '',
    summaryScope: report?.summaryScope || '',
  });
  const [notes, setNotes] = useState<Record<number, { minutes: string; feedback: string }>>(() => Object.fromEntries(activities.map((activity) => {
    const note = report?.activityNotes?.find((item) => item.activityId === activity.id);
    return [activity.id, { minutes: note?.minutes || '', feedback: note?.feedback || '' }];
  })));
  const [opening, setOpening] = useState({
    method: report?.openingCheck?.method || '',
    respondents: str(report?.openingCheck?.respondents),
    statement1Agree: str(report?.openingCheck?.statement1Agree),
    statement2Agree: str(report?.openingCheck?.statement2Agree),
  });
  const [survey, setSurvey] = useState<Record<string, string>>(() => Object.fromEntries([...SURVEY_FIELDS.map((field) => field.key), 'link'].map((key) => [key, str(report?.survey?.[key as keyof typeof report.survey])])));
  const [attachments, setAttachments] = useState<EventAttachment[]>(report?.attachments || []);
  const [annex, setAnnex] = useState<{ kind: EventAttachmentKind; title: string; linkUrl: string; file: File | null }>({ kind: 'agenda', title: '', linkUrl: '', file: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstFieldRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (keyEvent: KeyboardEvent) => { if (keyEvent.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const field = (key: keyof typeof form) => ({
    id: `report-${key}`,
    value: form[key],
    onChange: (change: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: change.target.value })),
    'aria-invalid': errors[key] ? true : undefined,
  });
  const errorText = (key: string) => (errors[key] ? <span className="mt-1 block text-[12px] font-semibold text-red-700" role="alert">{t('eventReport.fieldError')}</span> : null);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      await apiRequest(`/api/hub/events/${event.id}`, {
        method: 'PATCH',
        body: jsonBody({
          ...(completing ? { status: 'completed' } : {}),
          report: {
            ...form,
            date: form.date || null,
            activityNotes: activities.map((activity) => ({ activityId: activity.id, ...notes[activity.id] })),
            openingCheck: opening,
            survey,
          },
        }),
      });
      await onSaved();
      toast.success(t(completing ? 'eventReport.completedToast' : 'eventReport.savedToast'));
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors) setErrors(caught.fieldErrors);
      toast.error(caught instanceof ApiError && caught.code.startsWith('EVENT_REPORT') ? t('eventReport.fixFields') : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const readFile = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const addAnnex = async () => {
    if (!annex.file && !annex.linkUrl.trim()) { toast.error(t('eventReport.annex.chooseFileOrLink')); return; }
    if (annex.file && annex.file.size > MAX_FILE_BYTES) { toast.error(t('eventReport.annex.tooLarge')); return; }
    setUploading(true);
    try {
      const fileData = annex.file ? await readFile(annex.file) : undefined;
      const result = await apiRequest<{ attachments: EventAttachment[] }>(`/api/hub/events/${event.id}/attachments`, {
        method: 'POST',
        body: jsonBody({ kind: annex.kind, title: annex.title, linkUrl: annex.file ? undefined : annex.linkUrl.trim(), fileName: annex.file?.name, fileData }),
      });
      setAttachments(result.attachments);
      setAnnex((current) => ({ ...current, title: '', linkUrl: '', file: null }));
      if (fileRef.current) fileRef.current.value = '';
      toast.success(t('eventReport.annex.added'));
    } catch (caught) {
      toast.error(caught instanceof ApiError && caught.code === 'EVENT_ATTACHMENT_INVALID' ? t('eventReport.annex.invalid') : t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const removeAnnex = async (attachment: EventAttachment) => {
    try {
      const result = await apiRequest<{ attachments: EventAttachment[] }>(`/api/hub/events/${event.id}/attachments/${attachment.id}`, { method: 'DELETE' });
      setAttachments(result.attachments);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const statement1Pct = percentage(opening.statement1Agree, opening.respondents);
  const statement2Pct = percentage(opening.statement2Agree, opening.respondents);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/55 p-4" onMouseDown={(mouse) => { if (mouse.target === mouse.currentTarget && !saving) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="event-report-title" className="relative mx-auto my-6 w-full max-w-[900px] rounded-xl border-2 border-[#b2b2b8] bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b-2 border-[#eee] p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><FileText size={21} aria-hidden="true" /></span>
              <div>
                <h2 id="event-report-title" className="text-[22px] font-bold text-[#444]">{t('eventReport.title', { event: event.title })}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#666]">{t('eventReport.intro')}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={saving} className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-md hover:bg-[#f4f4f4]" aria-label={t('common.close')}><X size={20} /></button>
          </header>

          <div className="grid gap-2 px-6 pb-6">
            <Section title={t('eventReport.section.public')} hint={t('eventReport.section.publicHint')}>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className={labelClass} htmlFor="report-date">{t('eventReport.date')}<input ref={firstFieldRef} type="date" className={inputClass} {...field('date')} />{errorText('date')}</label>
                <label className={labelClass} htmlFor="report-location">{t('eventReport.location')}<input className={inputClass} {...field('location')} /></label>
                <label className={labelClass} htmlFor="report-participants">{t('eventReport.participants')} *<input type="number" min={0} inputMode="numeric" className={inputClass} {...field('participants')} />{errorText('participants')}</label>
              </div>
              <label className={labelClass} htmlFor="report-shortArticle">{t('eventReport.shortArticle')}
                <span className="mt-1 block text-[12px] font-normal text-[#777]">{t('eventReport.shortArticleHint')}</span>
                <textarea rows={4} className={textareaClass} {...field('shortArticle')} />
              </label>
              <label className={labelClass} htmlFor="report-insights">{t('eventReport.insights')}
                <textarea rows={3} className={textareaClass} {...field('insights')} />
              </label>
            </Section>

            <Section title={t('eventReport.section.internal')} internal hint={t('eventReport.section.internalHint')}>
              <label className={labelClass} htmlFor="report-summaryScope">{t('eventReport.summaryScope')} *
                <textarea rows={4} className={textareaClass} {...field('summaryScope')} />
                {errorText('summaryScope')}
              </label>
              {activities.length > 0 && (
                <div className="grid gap-4">
                  <p className="text-[13px] font-bold text-[#444]">{t('eventReport.perActivity')}</p>
                  {activities.map((activity) => (
                    <div key={activity.id} className="rounded-lg border border-[#d9dadd] p-4">
                      <p className="text-[15px] font-bold text-[#333]">{activity.title}</p>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <label className={labelClass} htmlFor={`report-minutes-${activity.id}`}>{t('eventReport.minutes')}
                          <textarea id={`report-minutes-${activity.id}`} rows={3} className={textareaClass} value={notes[activity.id]?.minutes || ''} onChange={(change) => setNotes((current) => ({ ...current, [activity.id]: { ...current[activity.id], minutes: change.target.value } }))} />
                        </label>
                        <label className={labelClass} htmlFor={`report-feedback-${activity.id}`}>{t('eventReport.feedback')}
                          <textarea id={`report-feedback-${activity.id}`} rows={3} className={textareaClass} value={notes[activity.id]?.feedback || ''} onChange={(change) => setNotes((current) => ({ ...current, [activity.id]: { ...current[activity.id], feedback: change.target.value } }))} />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title={t('eventReport.openingCheck')} internal hint={t('eventReport.openingCheckHint')}>
              <ul className="grid gap-1 rounded-lg bg-[#f7f7f8] p-4 text-[13px] text-[#444]">
                <li>1. {t('eventReport.statement1')}</li>
                <li>2. {t('eventReport.statement2')}</li>
              </ul>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className={labelClass} htmlFor="report-opening-method">{t('eventReport.method')}
                  <input id="report-opening-method" className={inputClass} value={opening.method} placeholder={t('eventReport.methodPlaceholder')} onChange={(change) => setOpening((current) => ({ ...current, method: change.target.value }))} />
                </label>
                <label className={labelClass} htmlFor="report-opening-respondents">{t('eventReport.respondents')}
                  <input id="report-opening-respondents" type="number" min={0} className={inputClass} value={opening.respondents} onChange={(change) => setOpening((current) => ({ ...current, respondents: change.target.value }))} />
                  {errorText('openingCheck.respondents')}
                </label>
                <label className={labelClass} htmlFor="report-opening-s1">{t('eventReport.agreeStatement', { number: 1 })}
                  <input id="report-opening-s1" type="number" min={0} className={inputClass} value={opening.statement1Agree} onChange={(change) => setOpening((current) => ({ ...current, statement1Agree: change.target.value }))} />
                  {statement1Pct != null && <span className="mt-1 block text-[12px] font-semibold text-[#47662f]">{t('eventReport.agreeing', { percent: statement1Pct })}</span>}
                </label>
                <label className={labelClass} htmlFor="report-opening-s2">{t('eventReport.agreeStatement', { number: 2 })}
                  <input id="report-opening-s2" type="number" min={0} className={inputClass} value={opening.statement2Agree} onChange={(change) => setOpening((current) => ({ ...current, statement2Agree: change.target.value }))} />
                  {statement2Pct != null && <span className="mt-1 block text-[12px] font-semibold text-[#47662f]">{t('eventReport.agreeing', { percent: statement2Pct })}</span>}
                </label>
              </div>
            </Section>

            <Section title={t('eventReport.survey')} internal hint={t('eventReport.surveyHint')}>
              <div className="grid gap-4 sm:grid-cols-2">
                {SURVEY_FIELDS.map(({ key, labelKey, percent }) => (
                  <label key={key} className={labelClass} htmlFor={`report-survey-${key}`}>{t(labelKey)}{percent ? ' (%)' : ''}
                    <input id={`report-survey-${key}`} type="number" min={0} max={percent ? 100 : undefined} step="0.1" className={inputClass} value={survey[key]} onChange={(change) => setSurvey((current) => ({ ...current, [key]: change.target.value }))} />
                    {errorText(`survey.${key}`)}
                  </label>
                ))}
                <label className={`${labelClass} sm:col-span-2`} htmlFor="report-survey-link">{t('eventReport.survey.link')}
                  <input id="report-survey-link" type="url" className={inputClass} value={survey.link} placeholder={t('events.meetingLinksPlaceholder')} onChange={(change) => setSurvey((current) => ({ ...current, link: change.target.value }))} />
                  {errorText('survey.link')}
                </label>
              </div>
            </Section>

            <Section title={t('eventReport.annexes')} internal hint={t('eventReport.annexesHint')}>
              {attachments.length > 0 && (
                <ul className="grid gap-2">
                  {attachments.map((attachment) => (
                    <li key={attachment.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#d9dadd] px-3 py-2 text-[13px]">
                      <span className="rounded-full bg-[#eef0f3] px-2 py-0.5 text-[11px] font-bold text-[#555]">{t(ATTACHMENT_KIND_KEYS[attachment.kind])}</span>
                      {attachment.hasFile
                        ? <a href={`/api/hub/events/${event.id}/attachments/${attachment.id}/file`} className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-[#a85f20] underline underline-offset-2"><Paperclip size={14} aria-hidden="true" /><span className="break-all">{attachment.title || attachment.fileName}</span></a>
                        : <a href={attachment.linkUrl || '#'} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-[#a85f20] underline underline-offset-2"><Link2 size={14} aria-hidden="true" /><span className="break-all">{attachment.title || attachment.linkUrl}</span></a>}
                      <button type="button" onClick={() => void removeAnnex(attachment)} className="ml-auto grid h-9 w-9 cursor-pointer place-items-center rounded-md text-red-800 hover:bg-red-50" aria-label={t('eventReport.annex.remove')}><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid gap-3 rounded-lg bg-[#f7f7f8] p-4 md:grid-cols-[180px_1fr]">
                <label className={labelClass} htmlFor="report-annex-kind">{t('eventReport.annex.type')}
                  <select id="report-annex-kind" className={inputClass} value={annex.kind} onChange={(change) => setAnnex((current) => ({ ...current, kind: change.target.value as EventAttachmentKind }))}>
                    {EVENT_ATTACHMENT_KINDS.map((kind) => <option key={kind} value={kind}>{t(ATTACHMENT_KIND_KEYS[kind])}</option>)}
                  </select>
                </label>
                <label className={labelClass} htmlFor="report-annex-title">{t('eventReport.annex.title')}
                  <input id="report-annex-title" className={inputClass} value={annex.title} onChange={(change) => setAnnex((current) => ({ ...current, title: change.target.value }))} />
                </label>
                <label className={labelClass} htmlFor="report-annex-file">{t('eventReport.annex.file')}
                  <input ref={fileRef} id="report-annex-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xlsx,.txt" className="mt-2 block w-full text-[13px] font-normal" onChange={(change) => setAnnex((current) => ({ ...current, file: change.target.files?.[0] || null }))} />
                </label>
                <label className={labelClass} htmlFor="report-annex-link">{t('eventReport.annex.link')}
                  <input id="report-annex-link" type="url" disabled={Boolean(annex.file)} className={inputClass} value={annex.linkUrl} placeholder={t('events.meetingLinksPlaceholder')} onChange={(change) => setAnnex((current) => ({ ...current, linkUrl: change.target.value }))} />
                </label>
                <div className="md:col-span-2">
                  <button type="button" onClick={() => void addAnnex()} disabled={uploading} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border-2 border-[#444] bg-white px-4 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428] disabled:cursor-wait disabled:opacity-60"><Upload size={15} aria-hidden="true" />{uploading ? t('common.saving') : t('eventReport.annex.add')}</button>
                  <p className="mt-2 text-[12px] text-[#777]">{t('eventReport.annex.limit')}</p>
                </div>
              </div>
            </Section>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t-2 border-[#eee] p-6 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="min-h-11 cursor-pointer rounded-md border-2 border-[#444] px-5 text-[14px] font-semibold text-[#444] hover:bg-[#f4f4f4] disabled:opacity-50">{t('common.cancel')}</button>
            <button type="button" onClick={() => void save()} disabled={saving} className="min-h-11 cursor-pointer rounded-md bg-[#f68b2c] px-5 text-[14px] font-bold text-white hover:bg-[#e07a20] disabled:cursor-wait disabled:opacity-60">
              {saving ? t('common.saving') : t(completing ? 'eventReport.completeAndSave' : 'eventReport.save')}
            </button>
          </footer>
        </section>
      </div>
    </ModalPortal>
  );
}
