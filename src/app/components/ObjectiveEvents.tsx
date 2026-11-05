import { useState, type ReactNode } from 'react';
import { CalendarPlus, ListPlus, Mail, Pencil, UserCheck, FileText } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmActionDialog from './ConfirmActionDialog';
import EventDetailsHeader, { DetailRow } from './EventDetailsHeader';
import EventFormDialog, { type EventResourceOption } from './EventFormDialog';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest, jsonBody } from '../lib/api';
import { EVENT_STATUS_KEYS, type EventStatus, type HubEvent } from '../lib/events';
import type { ToolImplementation } from './ToolImplementationCard';

interface Props {
  initiativeId: number;
  phaseNumber: number;
  events: HubEvent[];
  activities: ToolImplementation[];
  /** The resources the Municipality selected for this Objective, with display names. */
  resources: Array<{ id: string; name: string }>;
  canManage: boolean;
  /** Renders the activity card of one selected resource; used to nest the event's activities inside it. */
  renderActivity: (toolKey: string) => ReactNode;
  onChanged: () => Promise<void>;
}

interface Registration { userId: number; name: string; email: string; registeredAt: string }

const STATUS_PILL: Record<EventStatus, string> = {
  draft: 'bg-[#eef0f3] text-[#444]',
  published: 'bg-[#fff0e1] text-[#c4661b]',
  completed: 'bg-[#eaf2e3] text-[#47662f]',
  cancelled: 'bg-[#fdecea] text-[#b3261e]',
};

const CONFIRM_COPY: Record<EventStatus | 'delete', { title: TranslationKey; body: TranslationKey; label: TranslationKey }> = {
  published: { title: 'events.confirmPublishTitle', body: 'events.confirmPublishBody', label: 'events.publish' },
  completed: { title: 'events.confirmCompleteTitle', body: 'events.confirmCompleteBody', label: 'events.markCompleted' },
  cancelled: { title: 'events.confirmCancelTitle', body: 'events.confirmCancelBody', label: 'events.cancelEvent' },
  draft: { title: 'events.confirmDraftTitle', body: 'events.confirmDraftBody', label: 'events.backToDraft' },
  delete: { title: 'events.confirmDeleteTitle', body: 'events.confirmDeleteBody', label: 'events.deleteEvent' },
};

/**
 * The events of one Objective. The Municipality first creates an event (date, place, participation
 * type...) and then chooses the activities that take place in it; those activities appear inside it.
 */
export default function ObjectiveEvents({ initiativeId, phaseNumber, events, activities, resources, canManage, renderActivity, onChanged }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<HubEvent | 'new' | null>(null);
  const [pending, setPending] = useState<{ event: HubEvent; status: EventStatus | 'delete' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [registrations, setRegistrations] = useState<Record<number, Registration[] | 'loading'>>({});

  const eventToolKeys = (eventId: number) => activities
    .filter((activity) => activity.eventId === eventId && activity.workflowStatus !== 'cancelled' && activity.toolKey)
    .map((activity) => activity.toolKey as string);

  const resourceOptions = (event: HubEvent | null): EventResourceOption[] => resources.map((resource) => {
    const activity = activities.find((item) => item.toolKey === resource.id && item.workflowStatus !== 'cancelled');
    const other = activity?.eventId && activity.eventId !== event?.id ? events.find((item) => item.id === activity.eventId) : null;
    return { ...resource, inOtherEvent: other?.title || null };
  });

  const changeStatus = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      if (pending.status === 'delete') await apiRequest(`/api/hub/events/${pending.event.id}`, { method: 'DELETE' });
      else await apiRequest(`/api/hub/events/${pending.event.id}`, { method: 'PATCH', body: jsonBody({ status: pending.status }) });
      await onChanged();
      toast.success(t(pending.status === 'delete' ? 'events.deletedToast' : 'events.statusChangedToast'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  const toggleRegistrations = async (eventId: number) => {
    if (registrations[eventId]) {
      setRegistrations(({ [eventId]: _removed, ...rest }) => rest);
      return;
    }
    setRegistrations((current) => ({ ...current, [eventId]: 'loading' }));
    try {
      const result = await apiRequest<{ registrations: Registration[] }>(`/api/hub/events/${eventId}/registrations`);
      setRegistrations((current) => ({ ...current, [eventId]: result.registrations }));
    } catch {
      setRegistrations(({ [eventId]: _removed, ...rest }) => rest);
      toast.error(t('common.error'));
    }
  };

  const secondaryButton = 'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border-2 border-[#444] bg-white px-3 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#ca7428]';
  const primaryButton = 'inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f68b2c] px-4 text-[13px] font-bold text-white hover:bg-[#df771d]';
  const dangerButton = 'min-h-10 cursor-pointer rounded-md border-2 border-red-700 bg-white px-3 text-[13px] font-bold text-red-800 hover:bg-red-50';

  return (
    <section className="mt-8 border-t-2 border-[#eee] pt-7" aria-labelledby="objective-events-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h2 id="objective-events-title" className="text-[22px] font-bold text-[#444]">{t('events.sectionTitle', { phase: phaseNumber })}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#666]">{t(canManage ? 'events.sectionTextManager' : 'events.sectionTextFacilitator')}</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setEditing('new')} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-[#f68b2c] px-5 text-sm font-bold text-white hover:bg-[#df771d]">
            <CalendarPlus size={17} aria-hidden="true" />{t('events.create')}
          </button>
        )}
      </div>

      {canManage && (
        <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#555]" aria-label={t('events.howItWorks')}>
          <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f68b2c] text-[12px] font-bold text-white">1</span>{t('events.step1')}</li>
          <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f68b2c] text-[12px] font-bold text-white">2</span>{t('events.step2')}</li>
          <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f68b2c] text-[12px] font-bold text-white">3</span>{t('events.step3')}</li>
        </ol>
      )}

      {events.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#bfc0c5] p-6 text-sm text-[#666]">{t(canManage ? 'events.emptyManager' : 'events.emptyFacilitator')}</div>
      ) : (
        <div className="mt-5 grid gap-6">
          {events.map((event) => {
            const toolKeys = eventToolKeys(event.id);
            const list = registrations[event.id];
            const editableEvent = canManage && event.status !== 'cancelled' && event.status !== 'completed';
            return (
              <article key={event.id} className={`rounded-xl border bg-[#fafafb] p-5 md:p-6 ${event.status === 'published' ? 'border-[#f68b2c] ring-1 ring-[#f68b2c]' : 'border-[#d5d6da]'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-[#a85f20]">{t('events.eventLabel')}</p>
                    <h3 className="mt-0.5 text-[22px] font-bold text-[#333]">{event.title}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${STATUS_PILL[event.status]}`}>{t(EVENT_STATUS_KEYS[event.status])}</span>
                </div>

                <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]">
                  <EventDetailsHeader event={event} />
                  <div className="grid content-start gap-3">
                    {event.instructions && <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#444]">{event.instructions}</p>}
                    {event.supportContact && <DetailRow icon={<Mail size={18} />} label={t('events.supportContact')}>{event.supportContact}</DetailRow>}
                    {event.teamNotes && <DetailRow icon={<FileText size={18} />} label={t('events.teamNotes')}>{event.teamNotes}</DetailRow>}
                    <DetailRow icon={<UserCheck size={18} />} label={t('events.registrations')}>
                      {event.registrationCount}{event.status === 'published' && !event.registrationOpen ? ` · ${t('events.registrationClosed')}` : ''}
                      {' '}
                      <button type="button" onClick={() => void toggleRegistrations(event.id)} className="cursor-pointer text-[13px] font-bold text-[#a85f20] underline underline-offset-4" aria-expanded={Boolean(list)}>
                        {list === 'loading' ? t('common.loading') : t(list ? 'events.hideRegistrations' : 'events.showRegistrations')}
                      </button>
                    </DetailRow>
                    {list && list !== 'loading' && (
                      list.length === 0 ? <p className="pl-8 text-[13px] text-[#777]">{t('events.noRegistrations')}</p> : (
                        <ul className="grid gap-1 pl-8 text-[13px] text-[#444]">
                          {list.map((item) => <li key={item.userId}><strong>{item.name}</strong> <span className="text-[#777]">· {item.email}</span></li>)}
                        </ul>
                      )
                    )}
                  </div>
                </div>

                {canManage && (
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#e6e6e8] pt-4">
                    {editableEvent && <button type="button" onClick={() => setEditing(event)} className={secondaryButton}><Pencil size={14} aria-hidden="true" />{t('events.edit')}</button>}
                    {event.status === 'draft' && event.registrationCount === 0 && <button type="button" onClick={() => setPending({ event, status: 'delete' })} className={dangerButton}>{t('events.deleteEvent')}</button>}
                    {event.status === 'published' && <button type="button" onClick={() => setPending({ event, status: 'cancelled' })} className={dangerButton}>{t('events.cancelEvent')}</button>}
                    <span className="flex-1" />
                    {event.status === 'draft' && <button type="button" onClick={() => setPending({ event, status: 'published' })} className={primaryButton}>{t('events.publish')}</button>}
                    {event.status === 'published' && <button type="button" onClick={() => setPending({ event, status: 'completed' })} className={primaryButton}>{t('events.markCompleted')}</button>}
                  </div>
                )}

                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-[13px] font-bold uppercase tracking-wide text-[#a85f20]">{t('events.activitiesInEvent', { count: toolKeys.length })}</h4>
                    {editableEvent && toolKeys.length > 0 && (
                      <button type="button" onClick={() => setEditing(event)} className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-[13px] font-bold text-[#a85f20] underline underline-offset-4"><ListPlus size={16} aria-hidden="true" />{t('events.chooseActivities')}</button>
                    )}
                  </div>
                  {toolKeys.length ? (
                    <div className="mt-3 grid gap-5 xl:grid-cols-2">
                      {toolKeys.map((toolKey) => <div key={toolKey} className="flex">{renderActivity(toolKey)}</div>)}
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col items-start gap-3 rounded-xl border border-dashed border-[#bfc0c5] bg-white p-5 text-[14px] text-[#666]">
                      <p>{t('events.noActivitiesYet')}</p>
                      {editableEvent && <button type="button" onClick={() => setEditing(event)} className={primaryButton}><ListPlus size={16} aria-hidden="true" />{t('events.chooseActivities')}</button>}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <EventFormDialog
          initiativeId={initiativeId}
          phaseNumber={phaseNumber}
          event={editing === 'new' ? null : editing}
          resources={resourceOptions(editing === 'new' ? null : editing)}
          selectedResourceIds={editing === 'new' ? [] : eventToolKeys(editing.id)}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}

      {pending && (
        <ConfirmActionDialog
          title={t(CONFIRM_COPY[pending.status].title)}
          body={t(CONFIRM_COPY[pending.status].body)}
          confirmLabel={t(CONFIRM_COPY[pending.status].label)}
          saving={saving}
          onConfirm={() => void changeStatus()}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
}
