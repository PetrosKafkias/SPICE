import { useRef, useState, type KeyboardEvent } from 'react';
import { CalendarPlus, ChevronDown, FileText, Mail, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmActionDialog from './ConfirmActionDialog';
import EventDetailsHeader, { DetailRow } from './EventDetailsHeader';
import EventFormDialog from './EventFormDialog';
import ResourcePicker, { type PickerOption } from './ResourcePicker';
import EventReportDialog from './EventReportDialog';
import EventReportView from './EventReportView';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { apiRequest, jsonBody } from '../lib/api';
import { localizedApiError } from '../lib/localizedApiError';
import { statusKey } from '../lib/statusLabel';
import { EVENT_MODE_KEYS, EVENT_STATUS_KEYS, type EventStatus, type HubEvent } from '../lib/events';
import type { ToolImplementation } from './ToolImplementationCard';
import type { ResourceOption } from '../lib/resourceRecommendation';

interface Props {
  initiativeId: number;
  phaseNumber: number;
  events: HubEvent[];
  activities: ToolImplementation[];
  /** Every SPICE resource, with the ones recommended from the Municipality's setup marked. */
  resources: ResourceOption[];
  canManage: boolean;
  /** Shows the full card of an activity in the Activities tab. */
  onOpenActivity: (toolKey: string) => void;
  onChanged: () => Promise<void>;
}

interface Registration { userId: number; name: string; email: string; registeredAt: string }
type EventTab = 'overview' | 'activities' | 'registrations' | 'report';

const STATUS_PILL: Record<EventStatus, string> = {
  draft: 'bg-[#eef0f3] text-[#444]',
  published: 'bg-[#fff0e1] text-[#8a4b16]',
  completed: 'bg-[#eaf2e3] text-[#47662f]',
  cancelled: 'bg-[#fdecea] text-[#b3261e]',
};

const ACTIVITY_PILL: Record<string, string> = {
  open: 'bg-[#fff0e1] text-[#8a4b16]',
  completed: 'bg-[#eaf2e3] text-[#47662f]',
};

const CONFIRM_COPY: Record<EventStatus | 'delete', { title: TranslationKey; body: TranslationKey; label: TranslationKey }> = {
  published: { title: 'events.confirmPublishTitle', body: 'events.confirmPublishBody', label: 'events.publish' },
  completed: { title: 'events.confirmCompleteTitle', body: 'events.confirmCompleteBody', label: 'events.markCompleted' },
  cancelled: { title: 'events.confirmCancelTitle', body: 'events.confirmCancelBody', label: 'events.cancelEvent' },
  draft: { title: 'events.confirmDraftTitle', body: 'events.confirmDraftBody', label: 'events.backToDraft' },
  delete: { title: 'events.confirmDeleteTitle', body: 'events.confirmDeleteBody', label: 'events.deleteEvent' },
};

const isPast = (event: HubEvent) => event.status === 'completed' || event.status === 'cancelled';
const byStart = (a: HubEvent, b: HubEvent) => (a.startAt || '9999').localeCompare(b.startAt || '9999');

/**
 * The events of one Objective as an agenda: one short row per event, in date order. Opening a row
 * shows that event with its own tabs (overview, activities, registrations, report), so the page
 * stays short however many events and activities an Objective has.
 */
export default function ObjectiveEvents({ initiativeId, phaseNumber, events, activities, resources, canManage, onOpenActivity, onChanged }: Props) {
  const { t, formatDate } = useI18n();
  const [editing, setEditing] = useState<HubEvent | 'new' | null>(null);
  const [pending, setPending] = useState<{ event: HubEvent; status: EventStatus | 'delete' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [registrations, setRegistrations] = useState<Record<number, Registration[] | 'loading'>>({});
  // Completing an event opens its report (Tool 17); a completed event's report can be edited later.
  const [reporting, setReporting] = useState<{ event: HubEvent; completing: boolean } | null>(null);
  const comingUp = events.filter((event) => !isPast(event)).sort(byStart);
  const earlier = events.filter(isPast).sort((a, b) => byStart(b, a));
  // The next event is open when the page loads; the others stay as one-line rows.
  const [openId, setOpenId] = useState<number | null>(() => comingUp[0]?.id ?? null);
  const [eventTab, setEventTab] = useState<EventTab>('overview');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const eventActivities = (eventId: number) => activities.filter((activity) => (activity.eventIds || []).includes(eventId) && activity.workflowStatus !== 'cancelled');
  const activityName = (activity: ToolImplementation) => resources.find((resource) => resource.id === activity.toolKey)?.name || activity.title;
  const eventActivityTitles = (eventId: number) => eventActivities(eventId).map((activity) => ({ id: activity.id, title: activityName(activity) }));
  const eventToolKeys = (eventId: number) => eventActivities(eventId).filter((activity) => activity.toolKey).map((activity) => activity.toolKey as string);

  const resourceOptions = (event: HubEvent | null): PickerOption[] => resources.map((resource) => {
    const activity = activities.find((item) => item.toolKey === resource.id && item.workflowStatus !== 'cancelled');
    // An activity can run in several events; the others it belongs to are named next to it.
    const others = events.filter((item) => item.id !== event?.id && item.status !== 'cancelled' && (activity?.eventIds || []).includes(item.id));
    return { ...resource, note: others.length ? t('events.alsoInEvents', { events: others.map((item) => item.title).join(', ') }) : null };
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

  const loadRegistrations = async (eventId: number) => {
    setRegistrations((current) => ({ ...current, [eventId]: 'loading' }));
    try {
      const result = await apiRequest<{ registrations: Registration[] }>(`/api/hub/events/${eventId}/registrations`);
      setRegistrations((current) => ({ ...current, [eventId]: result.registrations }));
    } catch {
      setRegistrations(({ [eventId]: _removed, ...rest }) => rest);
      toast.error(t('common.error'));
    }
  };

  const toggleEvent = (eventId: number) => {
    setOpenId((current) => (current === eventId ? null : eventId));
    setEventTab('overview');
  };

  const selectEventTab = (event: HubEvent, tab: EventTab) => {
    setEventTab(tab);
    // Registrations are loaded each time the tab opens, so the list is never stale.
    if (tab === 'registrations') void loadRegistrations(event.id);
  };

  // The Municipality ticks the activities of an event right in its Activities tab; each change is
  // saved at once, so there is no need to open the event form for it.
  const [savingActivities, setSavingActivities] = useState<number | null>(null);
  const toggleActivity = async (event: HubEvent, toolKey: string, add: boolean) => {
    const current = eventToolKeys(event.id);
    const next = add ? [...current, toolKey] : current.filter((key) => key !== toolKey);
    setSavingActivities(event.id);
    try {
      await apiRequest(`/api/hub/events/${event.id}`, { method: 'PATCH', body: jsonBody({ activityToolKeys: next }) });
      await onChanged();
      toast.success(t('events.activitiesSaved'));
    } catch (caught) {
      toast.error(localizedApiError(t, caught));
    } finally {
      setSavingActivities(null);
    }
  };

  const renderActivityPicker = (event: HubEvent) => {
    const saving = savingActivities === event.id;
    const selected = eventToolKeys(event.id);
    return (
      <div aria-busy={saving}>
        <p className="mb-4 text-[14px] text-[#555]">{t('events.pickActivitiesHint')}</p>
        <ResourcePicker
          idPrefix={`event-${event.id}-activity`}
          phaseNumber={phaseNumber}
          options={resourceOptions(event)}
          selected={selected}
          disabled={saving}
          onToggle={(toolKey) => void toggleActivity(event, toolKey, !selected.includes(toolKey))}
          renderSelectedExtra={(toolKey) => {
            const activity = activities.find((item) => item.toolKey === toolKey && item.workflowStatus !== 'cancelled');
            if (!activity) return null;
            return (
              <>
                <span className={`flex-none rounded-full px-2.5 py-0.5 text-[12px] font-bold ${ACTIVITY_PILL[activity.workflowStatus] || 'bg-[#eef0f3] text-[#444]'}`}>{t(statusKey(activity.workflowStatus) as TranslationKey)}</span>
                <button type="button" onClick={() => onOpenActivity(toolKey)} className="min-h-10 flex-none cursor-pointer text-[13px] font-bold text-[#a85f20] underline underline-offset-4">{t('events.openActivityShort')}</button>
              </>
            );
          }}
        />
      </div>
    );
  };

  const secondaryButton ='inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border-2 border-[#444] bg-white px-3 text-[13px] font-bold text-[#444] hover:border-[#ca7428] hover:text-[#a85f20]';
  const primaryButton = 'inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f68b2c] px-4 text-[13px] font-bold text-white hover:bg-[#df771d]';
  const dangerButton = 'min-h-10 cursor-pointer rounded-md border-2 border-red-700 bg-white px-3 text-[13px] font-bold text-red-800 hover:bg-red-50';

  const renderPanel = (event: HubEvent) => {
    const held = eventActivities(event.id);
    const editableEvent = canManage && event.status !== 'cancelled' && event.status !== 'completed';
    const tabs: Array<{ id: EventTab; label: string }> = [
      { id: 'overview', label: t('events.tabOverview') },
      { id: 'activities', label: t('events.tabActivities', { count: held.length }) },
      ...(event.status !== 'draft' ? [{ id: 'registrations' as const, label: t('events.tabRegistrations', { count: event.registrationCount }) }] : []),
      ...(event.report || (canManage && event.status === 'completed') ? [{ id: 'report' as const, label: t('events.tabReport') }] : []),
    ];
    const active = tabs.some((tab) => tab.id === eventTab) ? eventTab : 'overview';
    const list = registrations[event.id];
    const onKeyDown = (keyEvent: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (keyEvent.key !== 'ArrowRight' && keyEvent.key !== 'ArrowLeft') return;
      keyEvent.preventDefault();
      const next = (index + (keyEvent.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      selectEventTab(event, tabs[next].id);
      tabRefs.current[next]?.focus();
    };

    return (
      <div id={`event-panel-${event.id}`} className="border-t border-[#e6e6e8] px-4 pb-5 md:px-6">
        <div role="tablist" aria-label={event.title} className="flex flex-wrap gap-x-1 border-b border-[#e6e6e8]">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
              role="tab"
              id={`event-${event.id}-tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`event-${event.id}-tabpanel`}
              tabIndex={active === tab.id ? 0 : -1}
              onClick={() => selectEventTab(event, tab.id)}
              onKeyDown={(keyEvent) => onKeyDown(keyEvent, index)}
              className={`-mb-px min-h-12 cursor-pointer border-b-[3px] px-3 text-[14px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#ca7428] ${active === tab.id ? 'border-[#ca7428] text-[#a85f20]' : 'border-transparent text-[#444] hover:text-[#a85f20]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`event-${event.id}-tabpanel`} aria-labelledby={`event-${event.id}-tab-${active}`} className="pt-5">
          {active === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <EventDetailsHeader event={event} />
              <div className="grid content-start gap-3">
                {event.instructions && <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#444]">{event.instructions}</p>}
                {event.supportContact && <DetailRow icon={<Mail size={18} />} label={t('events.supportContact')}>{event.supportContact}</DetailRow>}
                {event.teamNotes && <DetailRow icon={<FileText size={18} />} label={t('events.teamNotes')}>{event.teamNotes}</DetailRow>}
              </div>
            </div>
          )}

          {active === 'activities' && editableEvent && renderActivityPicker(event)}

          {active === 'activities' && !editableEvent && (
            <div className="grid gap-3">
              {held.length ? (
                <ul className="grid gap-2">
                  {held.map((activity) => (
                    <li key={activity.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[#e6e6e8] px-4 py-3">
                      <span className="min-w-0 flex-1 text-[15px] font-bold text-[#333]">{activityName(activity)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${ACTIVITY_PILL[activity.workflowStatus] || 'bg-[#eef0f3] text-[#444]'}`}>{t(statusKey(activity.workflowStatus) as TranslationKey)}</span>
                      {activity.toolKey && (
                        <button type="button" onClick={() => onOpenActivity(activity.toolKey as string)} className="min-h-10 cursor-pointer text-[13px] font-bold text-[#a85f20] underline underline-offset-4">{t('events.openActivity')}</button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[14px] text-[#666]">{t('events.noActivitiesYet')}</p>}
            </div>
          )}

          {active === 'registrations' && (
            list === 'loading' || !list ? <p className="text-[14px] text-[#666]">{t('common.loading')}</p>
              : list.length === 0 ? <p className="text-[14px] text-[#666]">{t('events.noRegistrations')}</p>
                : (
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {list.map((item) => {
                      const initials = item.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
                      return (
                        <li key={item.userId} className="flex items-center gap-3 border border-[#e2e2e5] bg-[#fafafa] p-3">
                          <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#fde3c9] text-[14px] font-bold text-[#a85f20]" aria-hidden="true">{initials}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-bold text-[#444]">{item.name}</span>
                            <span className="block truncate text-[12px] text-[#666]" title={item.email}>{item.email}</span>
                            <span className="block text-[12px] text-[#666]">{t('events.registeredOn', { date: formatDate(item.registeredAt, { dateStyle: 'medium' }) })}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )
          )}

          {active === 'report' && (
            event.report
              ? <EventReportView eventId={event.id} report={event.report} activities={eventActivityTitles(event.id)} />
              : <p className="text-[14px] text-[#666]">{t('eventReport.missing')}</p>
          )}
        </div>

        {canManage && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#e6e6e8] pt-4">
            {editableEvent && <button type="button" onClick={() => setEditing(event)} className={secondaryButton}><Pencil size={14} aria-hidden="true" />{t('events.edit')}</button>}
            {event.status === 'draft' && event.registrationCount === 0 && <button type="button" onClick={() => setPending({ event, status: 'delete' })} className={dangerButton}>{t('events.deleteEvent')}</button>}
            {event.status === 'published' && <button type="button" onClick={() => setPending({ event, status: 'cancelled' })} className={dangerButton}>{t('events.cancelEvent')}</button>}
            <span className="flex-1" />
            {event.status === 'draft' && <button type="button" onClick={() => setPending({ event, status: 'published' })} className={primaryButton}>{t('events.publish')}</button>}
            {event.status === 'published' && <button type="button" onClick={() => setReporting({ event, completing: true })} className={primaryButton}>{t('events.markCompleted')}</button>}
            {event.status === 'completed' && <button type="button" onClick={() => setReporting({ event, completing: false })} className={secondaryButton}><Pencil size={14} aria-hidden="true" />{t(event.report ? 'eventReport.edit' : 'eventReport.fillIn')}</button>}
          </div>
        )}
      </div>
    );
  };

  const renderRow = (event: HubEvent) => {
    const open = openId === event.id;
    const meta = [
      event.startAt ? formatDate(event.startAt, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : t('events.noDate'),
      t(EVENT_MODE_KEYS[event.participationMode]),
      t('events.activityCount', { count: eventActivities(event.id).length }),
      event.status === 'draft' ? null : t('events.registeredShort', { count: event.registrationCount }),
    ].filter(Boolean).join(' · ');
    return (
      <li key={event.id} className={`rounded-xl border bg-white ${open ? 'border-[#9c9da3] shadow-sm' : event.status === 'published' ? 'border-[#f0b77f]' : 'border-[#d5d6da]'}`}>
        <h3>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`event-panel-${event.id}`}
            onClick={() => toggleEvent(event.id)}
            className="flex w-full cursor-pointer items-center gap-4 rounded-xl px-4 py-3.5 text-left hover:bg-[#fafafb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ca7428] md:px-6"
          >
            <span className={`grid h-14 w-14 flex-none place-items-center content-center rounded-lg border ${event.status === 'published' ? 'border-[#f6c89a] bg-[#fff6ec]' : 'border-[#d9dadd] bg-[#f6f6f7]'}`} aria-hidden="true">
              {event.startAt ? (
                <>
                  <span className="text-[11px] font-bold uppercase text-[#8a4b16]">{formatDate(event.startAt, { month: 'short' })}</span>
                  <span className="text-[21px] font-bold leading-none text-[#333]">{formatDate(event.startAt, { day: 'numeric' })}</span>
                </>
              ) : <span className="text-[18px] font-bold text-[#888]">?</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold leading-snug text-[#333]">{event.title}</span>
              <span className="mt-0.5 block text-[13px] text-[#555]">{meta}</span>
            </span>
            <span className={`hidden flex-none rounded-full px-3 py-1 text-[12px] font-bold sm:inline ${STATUS_PILL[event.status]}`}>{t(EVENT_STATUS_KEYS[event.status])}</span>
            <ChevronDown size={20} aria-hidden="true" className={`flex-none text-[#666] transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </h3>
        {open && renderPanel(event)}
      </li>
    );
  };

  return (
    <section className="mt-6" aria-labelledby="objective-events-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="objective-events-title" className="text-[20px] font-bold text-[#444]">{t('events.sectionTitle', { phase: phaseNumber })}</h2>
        {canManage && (
          <button type="button" onClick={() => setEditing('new')} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-[#f68b2c] px-5 text-sm font-bold text-white hover:bg-[#df771d]">
            <CalendarPlus size={17} aria-hidden="true" />{t('events.create')}
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#bfc0c5] p-6 text-sm text-[#666]">
          <p>{t(canManage ? 'events.emptyManager' : 'events.emptyFacilitator')}</p>
          {canManage && (
            <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#555]" aria-label={t('events.howItWorks')}>
              <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f68b2c] text-[12px] font-bold text-white">1</span>{t('events.step1')}</li>
              <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f68b2c] text-[12px] font-bold text-white">2</span>{t('events.step2')}</li>
              <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f68b2c] text-[12px] font-bold text-white">3</span>{t('events.step3')}</li>
            </ol>
          )}
        </div>
      ) : (
        <>
          {comingUp.length > 0 && (
            <>
              <h3 className="mt-5 text-[12px] font-bold uppercase tracking-wide text-[#666]">{t('events.comingUpTitle')}</h3>
              <ul className="mt-2 grid gap-3">{comingUp.map(renderRow)}</ul>
            </>
          )}
          {earlier.length > 0 && (
            <>
              <h3 className="mt-7 text-[12px] font-bold uppercase tracking-wide text-[#666]">{t('events.earlierTitle')}</h3>
              <ul className="mt-2 grid gap-3">{earlier.map(renderRow)}</ul>
            </>
          )}
        </>
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

      {reporting && (
        <EventReportDialog
          event={reporting.event}
          activities={eventActivityTitles(reporting.event.id)}
          completing={reporting.completing}
          onClose={() => setReporting(null)}
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
