import { useEffect, useRef, useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import ModalPortal from './ModalPortal';
import { useI18n } from '../context/I18nContext';
import { ApiError, apiRequest, jsonBody } from '../lib/api';
import { EVENT_MODES, EVENT_MODE_KEYS, type HubEvent } from '../lib/events';

export interface EventResourceOption {
  id: string;
  name: string;
  /** Another event already holds this resource's activity; choosing it here moves the activity. */
  inOtherEvent?: string | null;
}

interface Props {
  initiativeId: number;
  phaseNumber: number;
  event: HubEvent | null;
  resources: EventResourceOption[];
  selectedResourceIds: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const inputClass = 'mt-2 min-h-11 w-full border-2 border-[#bfc0c5] bg-white px-3 text-[14px] font-normal focus:border-[#ca7428] focus:outline-none';
const textareaClass = 'mt-2 w-full resize-y border-2 border-[#bfc0c5] bg-white p-3 text-[14px] font-normal focus:border-[#ca7428] focus:outline-none';
const labelClass = 'block text-[13px] font-bold text-[#444]';
const hintClass = 'mt-1 block text-[12px] font-normal text-[#777]';

function formFrom(event: HubEvent | null) {
  return {
    title: event?.title || '',
    startAt: event?.startAt ? event.startAt.slice(0, 16) : '',
    participationMode: event?.participationMode || 'offline',
    duration: event?.duration || '',
    location: event?.location || '',
    expectedParticipants: event?.expectedParticipants || '',
    meetingLinks: event?.meetingLinks || '',
    instructions: event?.instructions || '',
    teamNotes: event?.teamNotes || '',
    languageSupport: event?.languageSupport || '',
    supportContact: event?.supportContact || '',
  };
}

type FormKey = keyof ReturnType<typeof formFrom>;

/** Creates or edits an event: the logistics shared by every activity in it, and which activities it holds. */
export default function EventFormDialog({ initiativeId, phaseNumber, event, resources, selectedResourceIds, onClose, onSaved }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState(() => formFrom(event));
  const [registrationOpen, setRegistrationOpen] = useState(event ? event.registrationOpen || event.status === 'draft' : true);
  const [activityIds, setActivityIds] = useState<string[]>(selectedResourceIds);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (keyEvent: KeyboardEvent) => { if (keyEvent.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const field = (key: FormKey) => ({
    id: `event-${key}`,
    value: form[key],
    onChange: (change: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: change.target.value })),
    'aria-invalid': errors[key] ? true : undefined,
  });
  const errorFor = (key: string) => (errors[key]
    ? <span className="mt-1 block text-[12px] font-semibold text-red-700" role="alert">{t(key === 'startAt' ? 'events.startAtRequired' : key === 'instructions' ? 'events.instructionsRequired' : 'events.nameRequired')}</span>
    : null);

  const save = async (status?: 'draft' | 'published') => {
    setSaving(true);
    setErrors({});
    const body = { ...form, startAt: form.startAt || null, registrationOpen, activityToolKeys: activityIds, ...(status ? { status } : {}) };
    try {
      if (event) await apiRequest(`/api/hub/events/${event.id}`, { method: 'PATCH', body: jsonBody(body) });
      else await apiRequest(`/api/hub/initiatives/${initiativeId}/events`, { method: 'POST', body: jsonBody({ ...body, phaseNumber }) });
      await onSaved();
      toast.success(t(status === 'published' ? 'events.publishedToast' : 'events.savedToast'));
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      toast.error(error instanceof ApiError && error.code === 'EVENT_INVALID' ? t('events.fixFields') : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActivity = (id: string) => setActivityIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/55 p-4" onMouseDown={(mouse) => { if (mouse.target === mouse.currentTarget && !saving) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="event-form-title" className="relative mx-auto my-6 w-full max-w-[860px] border-2 border-[#b2b2b8] bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b-2 border-[#eee] p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><CalendarPlus size={21} aria-hidden="true" /></span>
              <div>
                <h2 id="event-form-title" className="text-[22px] font-bold text-[#444]">{t(event ? 'events.editTitle' : 'events.createTitle')}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#666]">{t('events.formIntro', { phase: phaseNumber })}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={saving} className="grid h-10 w-10 flex-none cursor-pointer place-items-center hover:bg-[#f4f4f4]" aria-label={t('common.close')}><X size={20} /></button>
          </header>

          <div className="grid gap-6 p-6">
            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#a85f20]">{t('events.sharedSettings')}</legend>
              <label className={`${labelClass} md:col-span-2`} htmlFor="event-title">{t('events.name')} *
                <input ref={titleRef} className={inputClass} {...field('title')} placeholder={t('events.namePlaceholder')} />
                {errorFor('title')}
              </label>
              <label className={labelClass} htmlFor="event-startAt">{t('events.dateTime')}
                <input type="datetime-local" className={inputClass} {...field('startAt')} />
                {errorFor('startAt')}
              </label>
              <label className={labelClass} htmlFor="event-participationMode">{t('events.participationType')}
                <select className={inputClass} {...field('participationMode')}>
                  {EVENT_MODES.map((mode) => <option key={mode} value={mode}>{t(EVENT_MODE_KEYS[mode])}</option>)}
                </select>
              </label>
              <label className={labelClass} htmlFor="event-duration">{t('events.duration')}
                <input className={inputClass} {...field('duration')} placeholder={t('events.durationPlaceholder')} />
              </label>
              <label className={labelClass} htmlFor="event-location">{t('events.location')}
                <input className={inputClass} {...field('location')} />
              </label>
              <label className={labelClass} htmlFor="event-expectedParticipants">{t('events.expectedParticipants')}
                <input className={inputClass} {...field('expectedParticipants')} />
              </label>
              <label className={labelClass} htmlFor="event-languageSupport">{t('events.languageSupport')}
                <input className={inputClass} {...field('languageSupport')} />
              </label>
              <label className={`${labelClass} md:col-span-2`} htmlFor="event-supportContact">{t('events.supportContact')}
                <input className={inputClass} {...field('supportContact')} />
              </label>
              <label className={`${labelClass} md:col-span-2`} htmlFor="event-meetingLinks">{t('events.meetingLinks')}
                <span className={hintClass}>{t('events.meetingLinksHint')}</span>
                <textarea rows={2} className={textareaClass} {...field('meetingLinks')} placeholder={t('events.meetingLinksPlaceholder')} />
              </label>
              <label className={`${labelClass} md:col-span-2`} htmlFor="event-instructions">{t('events.instructions')}
                <span className={hintClass}>{t('events.instructionsHint')}</span>
                <textarea rows={3} className={textareaClass} {...field('instructions')} />
                {errorFor('instructions')}
              </label>
              <label className={`${labelClass} md:col-span-2`} htmlFor="event-teamNotes">{t('events.teamNotes')}
                <span className={hintClass}>{t('events.teamNotesHint')}</span>
                <textarea rows={2} className={textareaClass} {...field('teamNotes')} />
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-[13px] font-bold text-[#444] md:col-span-2" htmlFor="event-registrationOpen">
                <input id="event-registrationOpen" type="checkbox" checked={registrationOpen} onChange={(change) => setRegistrationOpen(change.target.checked)} className="h-5 w-5 accent-[#ca7428]" />
                {t('events.registrationOpenLabel')}
              </label>
            </fieldset>

            <fieldset className="border-t-2 border-[#eee] pt-5">
              <legend className="pt-5 text-[12px] font-bold uppercase tracking-wide text-[#a85f20]">{t('events.activitiesTitle')}</legend>
              <p className="mt-1 text-[13px] text-[#666]">{t('events.activitiesHint')}</p>
              {resources.length === 0 ? (
                <p className="mt-3 spice-card-dashed p-4 text-[13px] text-[#666]">{t('events.noResources')}</p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {resources.map((resource) => (
                    <li key={resource.id}>
                      <label htmlFor={`event-activity-${resource.id}`} className={`flex min-h-12 cursor-pointer items-start gap-3 border-2 p-3 text-[13px] ${activityIds.includes(resource.id) ? 'border-[#f68b2c] bg-[#fffaf4]' : 'border-[#d5d6da] bg-white'}`}>
                        <input id={`event-activity-${resource.id}`} type="checkbox" checked={activityIds.includes(resource.id)} onChange={() => toggleActivity(resource.id)} className="mt-0.5 h-5 w-5 flex-none accent-[#ca7428]" />
                        <span>
                          <span className="block font-bold text-[#444]">{resource.name}</span>
                          {resource.inOtherEvent && <span className="mt-0.5 block text-[12px] text-[#8a4b16]">{t('events.inOtherEvent', { event: resource.inOtherEvent })}</span>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t-2 border-[#eee] p-6 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="min-h-11 cursor-pointer border-2 border-[#444] px-5 text-[14px] font-semibold text-[#444] hover:bg-[#f4f4f4] disabled:opacity-50">{t('common.cancel')}</button>
            {event ? (
              <button type="button" onClick={() => void save()} disabled={saving} className="min-h-11 cursor-pointer bg-[#f68b2c] px-5 text-[14px] font-bold text-white hover:bg-[#e07a20] disabled:cursor-wait disabled:opacity-60">{saving ? t('common.saving') : t('events.saveChanges')}</button>
            ) : (
              <>
                <button type="button" onClick={() => void save('draft')} disabled={saving} className="min-h-11 cursor-pointer border-2 border-[#ca7428] bg-white px-5 text-[14px] font-bold text-[#a85f20] hover:bg-[#fff4e9] disabled:opacity-60">{t('events.saveDraft')}</button>
                <button type="button" onClick={() => void save('published')} disabled={saving} className="min-h-11 cursor-pointer bg-[#f68b2c] px-5 text-[14px] font-bold text-white hover:bg-[#e07a20] disabled:cursor-wait disabled:opacity-60">{saving ? t('common.saving') : t('events.saveAndPublish')}</button>
              </>
            )}
          </footer>
        </section>
      </div>
    </ModalPortal>
  );
}
