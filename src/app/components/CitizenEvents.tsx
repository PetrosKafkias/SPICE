import { useState } from 'react';
import { Link } from 'react-router';
import { Accessibility, CalendarCheck2, ChevronDown, Mail, Package } from 'lucide-react';
import { toast } from 'sonner';
import EventDetailsHeader, { DetailRow } from './EventDetailsHeader';
import EventReportView from './EventReportView';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { ApiError, apiRequest } from '../lib/api';
import { statusKey } from '../lib/statusLabel';
import { EVENT_MODE_KEYS, isUpcoming, type HubEvent } from '../lib/events';

export interface CitizenEventActivity {
  id: number;
  eventIds: number[];
  title: string;
  kindLabel: string | null;
  workflowStatus: string;
  instructions: string;
  requiredMaterials: string | null;
  accessibilityNotes: string | null;
}

interface Props {
  events: Array<HubEvent & { phaseNumber: number }>;
  activities: CitizenEventActivity[];
  /** Upcoming events to register for, or past events with the public part of their report. */
  show: 'upcoming' | 'past';
  /** Signed in with an account that can take part (citizens). */
  canParticipate: boolean;
  signedIn: boolean;
  /** Staff previewing the citizen view see the page but cannot register. */
  preview?: boolean;
  onChanged: () => void;
}

const ACTIVITY_PILL: Record<string, string> = {
  open: 'bg-[#fff0e1] text-[#8a4b16]',
  completed: 'bg-[#eaf2e3] text-[#47662f]',
};

/** The upcoming events where citizens register, or the past events with what came out of them. */
export default function CitizenEvents({ events, activities, show, canParticipate, signedIn, preview = false, onChanged }: Props) {
  const { t, formatDate } = useI18n();
  const [overrides, setOverrides] = useState<Record<number, Pick<HubEvent, 'registered' | 'registrationCount' | 'meetingLinks'>>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const upcoming = events
    .filter((event) => event.status === 'published' && isUpcoming(event))
    .sort((a, b) => (a.startAt || '').localeCompare(b.startAt || ''));
  const past = events
    .filter((event) => event.status === 'completed' && event.report)
    .sort((a, b) => (b.startAt || '').localeCompare(a.startAt || ''));
  const list = show === 'upcoming' ? upcoming : past;
  // The nearest upcoming event, or the latest past one, is open; the others are one-line rows.
  const [openId, setOpenId] = useState<number | null>(list[0]?.id ?? null);
  if (list.length === 0) return null;

  const register = async (event: HubEvent, join: boolean) => {
    setBusy(event.id);
    try {
      const result = await apiRequest<{ event: HubEvent }>(`/api/hub/events/${event.id}/registration`, { method: join ? 'POST' : 'DELETE' });
      setOverrides((current) => ({ ...current, [event.id]: { registered: result.event.registered, registrationCount: result.event.registrationCount, meetingLinks: result.event.meetingLinks } }));
      toast.success(t(join ? 'events.registeredToast' : 'events.unregisteredToast', { event: event.title }));
      onChanged();
    } catch (error) {
      toast.error(error instanceof ApiError && error.code === 'EVENT_REGISTRATION_CLOSED' ? t('events.registrationClosed') : t('common.error'));
    } finally {
      setBusy(null);
    }
  };

  const button = 'inline-flex min-h-11 flex-none cursor-pointer items-center justify-center gap-2 rounded-md px-5 text-[15px] font-bold';

  // Register, cancel, or why neither is possible: always visible on the event's row.
  const registrationControl = (event: HubEvent) => {
    if (event.registered) {
      return <button type="button" onClick={() => void register(event, false)} disabled={busy === event.id || preview} className={`${button} border-2 border-[#444] bg-white text-[#444] hover:bg-[#f4f4f4] disabled:cursor-wait disabled:opacity-60`}>{t('events.cancelRegistration')}</button>;
    }
    if (!event.registrationOpen) return <span className="text-[13px] font-semibold text-[#555]">{t('events.registrationClosed')}</span>;
    if (preview) return <span className="text-[13px] font-semibold text-[#666]">{t('events.previewNoRegistration')}</span>;
    if (canParticipate) {
      return (
        <button type="button" onClick={() => void register(event, true)} disabled={busy === event.id} className={`${button} bg-[#ea9139] text-white hover:bg-[#df771d] disabled:cursor-wait disabled:opacity-60`}>
          <CalendarCheck2 size={18} aria-hidden="true" />{busy === event.id ? t('common.saving') : t('events.register')}
        </button>
      );
    }
    if (signedIn) return <span className="text-[13px] font-semibold text-[#666]">{t('events.citizensOnly')}</span>;
    return <Link to="/signin" className={`${button} bg-[#ea9139] text-white hover:bg-[#df771d]`}>{t('events.signInToRegister')}</Link>;
  };

  const renderDetails = (event: HubEvent) => {
    const held = activities.filter((activity) => activity.eventIds.includes(event.id));
    return (
      <div id={`citizen-event-${event.id}`} className="border-t border-[#e6e6e8] px-4 pb-5 pt-4 md:px-6">
        {event.instructions && <p className="mb-4 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-[#444]">{event.instructions}</p>}
        <EventDetailsHeader event={event} />
        {event.hasMeetingLinks && !event.meetingLinks && <p className="mt-3 text-[13px] text-[#666]">{t('events.linksAfterRegistration')}</p>}

        {held.length > 0 && (
          <div className="mt-5 border-t border-[#e6e6e8] pt-4">
            <h4 className="text-[14px] font-bold text-[#8a4b16]">{t('events.activitiesInEvent', { count: held.length })}</h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {held.map((activity) => (
                <div key={activity.id} className="rounded-lg border border-[#d9dadd] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-bold text-[#333]">{activity.title}</p>
                      {activity.kindLabel && <p className="text-[12px] font-medium text-[#666]">{activity.kindLabel}</p>}
                    </div>
                    {ACTIVITY_PILL[activity.workflowStatus] && <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${ACTIVITY_PILL[activity.workflowStatus]}`}>{t(statusKey(activity.workflowStatus) as TranslationKey)}</span>}
                  </div>
                  {activity.instructions && <p className="mt-2 text-[14px] leading-relaxed text-[#444]">{activity.instructions}</p>}
                  {(activity.requiredMaterials || activity.accessibilityNotes) && (
                    <div className="mt-3 grid gap-2 border-t border-[#eee] pt-3">
                      {activity.requiredMaterials && <DetailRow icon={<Package size={17} />} label={t('activity.requiredNotes')}>{activity.requiredMaterials}</DetailRow>}
                      {activity.accessibilityNotes && <DetailRow icon={<Accessibility size={17} />} label={t('activity.accessibilityNotes')}>{activity.accessibilityNotes}</DetailRow>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {event.supportContact && (
          <div className="mt-5 border-t border-[#e6e6e8] pt-4">
            <DetailRow icon={<Mail size={18} />} label={t('events.supportContact')}>{event.supportContact}</DetailRow>
          </div>
        )}
      </div>
    );
  };

  const renderRow = (base: HubEvent & { phaseNumber: number }) => {
    const event = { ...base, ...overrides[base.id] };
    const open = openId === event.id;
    const meta = show === 'upcoming'
      ? [event.startAt ? formatDate(event.startAt, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : t('events.noDate'), event.location, t(EVENT_MODE_KEYS[event.participationMode])]
      : [event.report?.date ? formatDate(event.report.date, { dateStyle: 'medium' }) : null, event.report?.participants != null ? t('eventReport.participantsCount', { count: event.report.participants }) : null];
    const highlight = show === 'upcoming' ? (event.registered ? 'border-[#59713d] ring-1 ring-[#59713d]' : 'border-[#f0b77f]') : 'border-[#d5d6da]';
    return (
      <li key={event.id} className={`rounded-xl border bg-white ${highlight}`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 md:px-6">
          <span className={`grid h-14 w-14 flex-none place-items-center content-center rounded-lg border ${show === 'upcoming' ? 'border-[#f6c89a] bg-[#fff6ec]' : 'border-[#d9dadd] bg-[#f6f6f7]'}`} aria-hidden="true">
            {event.startAt ? (
              <>
                <span className="text-[11px] font-bold uppercase text-[#8a4b16]">{formatDate(event.startAt, { month: 'short' })}</span>
                <span className="text-[21px] font-bold leading-none text-[#333]">{formatDate(event.startAt, { day: 'numeric' })}</span>
              </>
            ) : <span className="text-[18px] font-bold text-[#888]">?</span>}
          </span>
          <div className="min-w-[200px] flex-1">
            <h3 className="text-[17px] font-bold leading-snug text-[#333]">{event.title}</h3>
            <p className="mt-0.5 text-[13px] text-[#555]">{meta.filter(Boolean).join(' · ')}</p>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`citizen-event-${event.id}`}
              onClick={() => setOpenId(open ? null : event.id)}
              className="mt-1 inline-flex min-h-8 cursor-pointer items-center gap-1 text-[13px] font-bold text-[#8a4b16] underline underline-offset-4"
            >
              {t(show === 'upcoming' ? (open ? 'events.hideDetails' : 'events.showDetails') : (open ? 'eventReport.hideSummary' : 'eventReport.readSummary'))}
              <ChevronDown size={15} aria-hidden="true" className={open ? 'rotate-180' : ''} />
            </button>
          </div>
          {show === 'upcoming' && (
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${event.registered ? 'bg-[#eaf2e3] text-[#47662f]' : 'bg-[#f3f3f4] text-[#444]'}`}>
                {event.registered ? t('events.youAreRegistered') : t('events.registeredCount', { count: event.registrationCount })}
              </span>
              {registrationControl(event)}
            </div>
          )}
        </div>
        {open && (show === 'upcoming'
          ? renderDetails(event)
          : event.report && <div id={`citizen-event-${event.id}`} className="border-t border-[#e6e6e8] px-4 pb-5 pt-4 md:px-6"><EventReportView eventId={event.id} report={event.report} /></div>)}
      </li>
    );
  };

  return (
    <section aria-labelledby={`citizen-${show}-events-heading`}>
      <h2 id={`citizen-${show}-events-heading`} className="text-[20px] font-bold text-[#444]">{t(show === 'upcoming' ? 'events.upcomingTitle' : 'eventReport.pastEvents')}</h2>
      {show === 'upcoming' && <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-[#666]">{t('events.upcomingText')}</p>}
      <ul className="mt-4 grid gap-3">{list.map(renderRow)}</ul>
    </section>
  );
}
