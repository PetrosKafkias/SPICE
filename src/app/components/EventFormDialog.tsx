import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CalendarPlus, Check, Eye, EyeOff, MonitorSmartphone, Shuffle, UsersRound, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import ModalPortal from './ModalPortal';
import ResourcePicker, { type PickerOption } from './ResourcePicker';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { ApiError, apiRequest, jsonBody } from '../lib/api';
import { EVENT_MODES, EVENT_MODE_KEYS, type EventMode, type HubEvent } from '../lib/events';

interface Props {
  initiativeId: number;
  phaseNumber: number;
  event: HubEvent | null;
  /** Every SPICE resource for the Objective, recommended ones marked. */
  resources: PickerOption[];
  selectedResourceIds: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const inputClass = 'mt-2 min-h-11 w-full rounded-md border-2 border-[#bfc0c5] bg-white px-3 text-[14px] font-normal focus:border-[#ca7428] focus:outline-none';
const textareaClass = 'mt-2 w-full resize-y rounded-md border-2 border-[#bfc0c5] bg-white p-3 text-[14px] font-normal focus:border-[#ca7428] focus:outline-none';
const labelClass = 'block text-[13px] font-bold text-[#444]';
const hintClass = 'mt-1 block text-[12px] font-normal text-[#666]';

const MODE_ICONS: Record<EventMode, ReactNode> = {
  offline: <UsersRound size={20} aria-hidden="true" />,
  online: <Video size={20} aria-hidden="true" />,
  hybrid: <Shuffle size={20} aria-hidden="true" />,
  citivoice: <MonitorSmartphone size={20} aria-hidden="true" />,
};

const STEPS: Array<{ titleKey: TranslationKey; hintKey: TranslationKey }> = [
  { titleKey: 'events.stepBasics', hintKey: 'events.stepBasicsHint' },
  { titleKey: 'events.stepPlace', hintKey: 'events.stepPlaceHint' },
  { titleKey: 'events.stepActivities', hintKey: 'events.activitiesHint' },
  { titleKey: 'events.stepInfo', hintKey: 'events.stepInfoHint' },
];

// The step that holds each field, so a server error opens the right step.
const FIELD_STEP: Record<string, number> = { title: 0, startAt: 0, instructions: 3 };

function formFrom(event: HubEvent | null) {
  return {
    title: event?.title || '',
    startAt: event?.startAt ? event.startAt.slice(0, 16) : '',
    participationMode: (event?.participationMode || 'offline') as EventMode,
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

type FormKey = Exclude<keyof ReturnType<typeof formFrom>, 'participationMode'>;

/**
 * Creates or edits an event in four short steps: the basics, where people join, the activities that
 * take place in it, and what participants read. Editing an event can jump straight to any step.
 */
export default function EventFormDialog({ initiativeId, phaseNumber, event, resources, selectedResourceIds, onClose, onSaved }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState(() => formFrom(event));
  const [registrationOpen, setRegistrationOpen] = useState(event ? event.registrationOpen || event.status === 'draft' : true);
  const [activityIds, setActivityIds] = useState<string[]>(selectedResourceIds);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => { titleRef.current?.focus(); }, []);
  // Moving between steps brings the step's heading into focus for keyboard and screen-reader users.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [step]);

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

  const titleMissing = form.title.trim().length < 3;
  const goTo = (target: number) => {
    if (target > 0 && titleMissing) {
      setErrors({ title: 'required' });
      setStep(0);
      return;
    }
    setErrors({});
    setStep(target);
  };

  const save = async (status?: 'draft' | 'published') => {
    if (titleMissing) { goTo(1); return; }
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
      if (error instanceof ApiError && error.fieldErrors) {
        setErrors(error.fieldErrors);
        const firstStep = Math.min(...Object.keys(error.fieldErrors).map((key) => FIELD_STEP[key] ?? 0));
        setStep(firstStep);
      }
      toast.error(error instanceof ApiError && error.code === 'EVENT_INVALID' ? t('events.fixFields') : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActivity = (id: string) => setActivityIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const showLocation = form.participationMode !== 'online';
  const showLinks = form.participationMode !== 'offline';
  const lastStep = step === STEPS.length - 1;

  const primaryButton = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f68b2c] px-5 text-[14px] font-bold text-white hover:bg-[#e07a20] disabled:cursor-wait disabled:opacity-60';
  const secondaryButton = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-[#ca7428] bg-white px-5 text-[14px] font-bold text-[#a85f20] hover:bg-[#fff4e9] disabled:opacity-60';
  const plainButton = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-[#bfc0c5] bg-white px-4 text-[14px] font-semibold text-[#444] hover:border-[#444] disabled:opacity-50';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/55 p-4" onMouseDown={(mouse) => { if (mouse.target === mouse.currentTarget && !saving) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="event-form-title" className="relative mx-auto my-6 w-full max-w-[820px] rounded-xl border border-[#b2b2b8] bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-[#e6e6e8] px-6 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#fff0e2] text-[#ca7428]"><CalendarPlus size={21} aria-hidden="true" /></span>
              <div>
                <h2 id="event-form-title" className="text-[21px] font-bold text-[#444]">{t(event ? 'events.editTitle' : 'events.createTitle')}</h2>
                <p className="mt-0.5 text-[13px] text-[#666]">{t('events.formIntro', { phase: phaseNumber })}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={saving} className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-md hover:bg-[#f4f4f4]" aria-label={t('common.close')}><X size={20} /></button>
          </header>

          {/* The steps: done steps show a tick; any step can be opened once the event has a name. */}
          <nav aria-label={t('events.stepsLabel')} className="border-b border-[#e6e6e8] px-6 py-3">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STEPS.map((item, index) => {
                const current = index === step;
                const done = index < step;
                return (
                  <li key={item.titleKey}>
                    <button
                      type="button"
                      onClick={() => goTo(index)}
                      aria-current={current ? 'step' : undefined}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-bold transition-colors ${current ? 'bg-[#fff0e1] text-[#8a4b16]' : 'text-[#555] hover:bg-[#f6f6f7]'}`}
                    >
                      <span className={`grid h-6 w-6 flex-none place-items-center rounded-full text-[12px] ${current ? 'bg-[#ca7428] text-white' : done ? 'bg-[#59713d] text-white' : 'border-2 border-[#bfc0c5] text-[#555]'}`}>
                        {done ? <Check size={13} aria-hidden="true" /> : index + 1}
                      </span>
                      <span className="min-w-0 truncate">{t(item.titleKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="px-6 py-5">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[#a85f20]">{t('events.stepOf', { step: step + 1, total: STEPS.length })}</p>
            <h3 ref={headingRef} tabIndex={-1} className="mt-0.5 text-[18px] font-bold text-[#333] outline-none">{t(STEPS[step].titleKey)}</h3>
            <p className="mt-0.5 text-[13px] text-[#666]">{t(STEPS[step].hintKey)}</p>

            <div className="mt-5">
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={`${labelClass} md:col-span-2`} htmlFor="event-title">{t('events.name')} *
                    <input ref={titleRef} className={inputClass} {...field('title')} placeholder={t('events.namePlaceholder')} />
                    {errorFor('title')}
                  </label>
                  <label className={labelClass} htmlFor="event-startAt">{t('events.dateTime')}
                    <input type="datetime-local" className={inputClass} {...field('startAt')} />
                    {errorFor('startAt')}
                  </label>
                  <label className={labelClass} htmlFor="event-duration">{t('events.duration')}
                    <input className={inputClass} {...field('duration')} placeholder={t('events.durationPlaceholder')} />
                  </label>
                  <fieldset className="md:col-span-2">
                    <legend className={labelClass}>{t('events.participationType')}</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {EVENT_MODES.map((mode) => {
                        const checked = form.participationMode === mode;
                        return (
                          <label key={mode} className={`flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-center text-[13px] font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#ca7428] ${checked ? 'border-[#ca7428] bg-[#fff8f1] text-[#8a4b16]' : 'border-[#d9dadd] bg-white text-[#444] hover:border-[#9c9da3]'}`}>
                            <input type="radio" name="event-participation-mode" value={mode} checked={checked} onChange={() => setForm((current) => ({ ...current, participationMode: mode }))} className="sr-only" />
                            {MODE_ICONS[mode]}
                            {t(EVENT_MODE_KEYS[mode])}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {showLocation && (
                    <label className={`${labelClass} md:col-span-2`} htmlFor="event-location">{t('events.location')}
                      <input className={inputClass} {...field('location')} />
                    </label>
                  )}
                  {showLinks && (
                    <label className={`${labelClass} md:col-span-2`} htmlFor="event-meetingLinks">{t('events.meetingLinks')}
                      <span className={hintClass}>{t('events.meetingLinksHint')}</span>
                      <textarea rows={2} className={textareaClass} {...field('meetingLinks')} placeholder={t('events.meetingLinksPlaceholder')} />
                    </label>
                  )}
                  <label className={labelClass} htmlFor="event-expectedParticipants">{t('events.expectedParticipants')}
                    <input className={inputClass} {...field('expectedParticipants')} />
                  </label>
                  <label className={labelClass} htmlFor="event-languageSupport">{t('events.languageSupport')}
                    <input className={inputClass} {...field('languageSupport')} />
                  </label>
                  <label className={`${labelClass} md:col-span-2`} htmlFor="event-supportContact">{t('events.supportContact')}
                    <input className={inputClass} {...field('supportContact')} />
                  </label>
                </div>
              )}

              {step === 2 && (
                <ResourcePicker idPrefix="event-activity" phaseNumber={phaseNumber} options={resources} selected={activityIds} onToggle={toggleActivity} />
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <div className="rounded-lg border border-[#e3e3e6] p-4">
                    <label className={labelClass} htmlFor="event-instructions">
                      <span className="flex flex-wrap items-center gap-2">{t('events.instructions')}
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf2e3] px-2 py-0.5 text-[11px] font-bold text-[#47662f]"><Eye size={12} aria-hidden="true" />{t('activity.audiencePublic')}</span>
                      </span>
                      <span className={hintClass}>{t('events.instructionsHint')}</span>
                      <textarea rows={4} className={textareaClass} {...field('instructions')} />
                      {errorFor('instructions')}
                    </label>
                    <label className="mt-4 flex cursor-pointer items-center gap-3 text-[13px] font-bold text-[#444]" htmlFor="event-registrationOpen">
                      <input id="event-registrationOpen" type="checkbox" checked={registrationOpen} onChange={(change) => setRegistrationOpen(change.target.checked)} className="h-5 w-5 accent-[#ca7428]" />
                      {t('events.registrationOpenLabel')}
                    </label>
                  </div>
                  <div className="rounded-lg border border-[#c9d8e4] bg-[#f6f9fc] p-4">
                    <label className={labelClass} htmlFor="event-teamNotes">
                      <span className="flex flex-wrap items-center gap-2">{t('events.teamNotes')}
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e3edf5] px-2 py-0.5 text-[11px] font-bold text-[#31556f]"><EyeOff size={12} aria-hidden="true" />{t('activity.audienceInternal')}</span>
                      </span>
                      <span className={hintClass}>{t('events.teamNotesHint')}</span>
                      <textarea rows={2} className={textareaClass} {...field('teamNotes')} />
                    </label>
                  </div>
                  <p className="text-[13px] text-[#555]">
                    {[
                      form.title.trim(),
                      form.startAt ? form.startAt.replace('T', ' ') : t('events.noDate'),
                      t(EVENT_MODE_KEYS[form.participationMode]),
                      t('events.activityCount', { count: activityIds.length }),
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <footer className="flex flex-wrap items-center gap-3 border-t border-[#e6e6e8] px-6 py-4">
            {step > 0 ? (
              <button type="button" onClick={() => goTo(step - 1)} disabled={saving} className={plainButton}><ArrowLeft size={16} aria-hidden="true" />{t('events.back')}</button>
            ) : (
              <button type="button" onClick={onClose} disabled={saving} className={plainButton}>{t('common.cancel')}</button>
            )}
            <span className="flex-1" />
            {event ? (
              <>
                {!lastStep && <button type="button" onClick={() => goTo(step + 1)} disabled={saving} className={secondaryButton}>{t('events.next')}<ArrowRight size={16} aria-hidden="true" /></button>}
                <button type="button" onClick={() => void save()} disabled={saving} className={primaryButton}>{saving ? t('common.saving') : t('events.saveChanges')}</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => void save('draft')} disabled={saving} className={secondaryButton}>{t('events.saveDraft')}</button>
                {lastStep
                  ? <button type="button" onClick={() => void save('published')} disabled={saving} className={primaryButton}>{saving ? t('common.saving') : t('events.saveAndPublish')}</button>
                  : <button type="button" onClick={() => goTo(step + 1)} disabled={saving} className={primaryButton}>{t('events.next')}<ArrowRight size={16} aria-hidden="true" /></button>}
              </>
            )}
          </footer>
        </section>
      </div>
    </ModalPortal>
  );
}
