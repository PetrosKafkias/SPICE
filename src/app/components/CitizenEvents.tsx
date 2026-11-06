import { useState } from 'react';
import { Link } from 'react-router';
import { Accessibility, CalendarCheck2, Mail, Package } from 'lucide-react';
import { toast } from 'sonner';
import EventDetailsHeader, { DetailRow } from './EventDetailsHeader';
import EventReportView from './EventReportView';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import { ApiError, apiRequest } from '../lib/api';
import { statusKey } from '../lib/statusLabel';
import { isUpcoming, type HubEvent } from '../lib/events';

export interface CitizenEventActivity {
  id: number;
  eventId: number | null;
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
  /** Signed in with an account that can take part (citizens). */
  canParticipate: boolean;
  signedIn: boolean;
  /** Staff previewing the citizen view see the page but cannot register. */
  preview?: boolean;
  onChanged: () => void;
}

const ACTIVITY_PILL: Record<string, string> = {
  open: 'bg-[#fff0e1] text-[#c4661b]',
  completed: 'bg-[#eaf2e3] text-[#47662f]',
};

/** Upcoming events of the pilot, each with the activities that take place in it, where citizens register. */
export default function CitizenEvents({ events, activities, canParticipate, signedIn, preview = false, onChanged }: Props) {
  const { t } = useI18n();
  const [overrides, setOverrides] = useState<Record<number, Pick<HubEvent, 'registered' | 'registrationCount' | 'meetingLinks'>>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const upcoming = events
    .filter((event) => event.status === 'published' && isUpcoming(event))
    .sort((a, b) => (a.startAt || '').localeCompare(b.startAt || ''));
  const past = events
    .filter((event) => event.status === 'completed' && event.report)
    .sort((a, b) => (b.startAt || '').localeCompare(a.startAt || ''));
  if (upcoming.length === 0 && past.length === 0) return null;

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

  const fullWidthButton = 'flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md text-[16px] font-bold';

  const pastEvents = past.length > 0 && (
    <section className="mt-6" aria-labelledby="citizen-past-events-heading">
      <h2 id="citizen-past-events-heading" className="text-[20px] font-bold text-[#444]">{t('eventReport.pastEvents')}</h2>
      <div className="mt-4 grid gap-4">
        {past.map((event) => (
          <article key={event.id} className="rounded-xl border border-[#d5d6da] bg-white p-5">
            <p className="text-[12px] font-medium text-[#666]">{t('hub.phaseNumber', { phase: event.phaseNumber })} · {t('events.eventLabel')}</p>
            <h3 className="mt-0.5 text-[19px] font-bold text-[#333]">{event.title}</h3>
            <div className="mt-3">{event.report && <EventReportView eventId={event.id} report={event.report} />}</div>
          </article>
        ))}
      </div>
    </section>
  );
  if (upcoming.length === 0) return <div className="mt-5">{pastEvents}</div>;

  return (
    <>
    <section className="mt-5" aria-labelledby="citizen-events-heading">
      <h2 id="citizen-events-heading" className="flex items-center gap-2 text-[22px] font-bold text-[#444]"><CalendarCheck2 size={22} className="text-[#ca7428]" aria-hidden="true" />{t('events.upcomingTitle')}</h2>
      <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-[#666]">{t('events.upcomingText')}</p>
      <div className="mt-5 grid gap-6">
        {upcoming.map((base) => {
          const event = { ...base, ...overrides[base.id] };
          const held = activities.filter((activity) => activity.eventId === event.id);
          return (
            <article key={event.id} className={`flex flex-col rounded-xl border bg-white p-5 md:p-6 ${event.registered ? 'border-[#59713d] ring-1 ring-[#59713d]' : 'border-[#f68b2c] ring-1 ring-[#f68b2c]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#666]">{t('hub.phaseNumber', { phase: event.phaseNumber })} · {t('events.eventLabel')}</p>
                  <h3 className="mt-0.5 text-[22px] font-bold text-[#333]">{event.title}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${event.registered ? 'bg-[#eaf2e3] text-[#47662f]' : 'bg-[#fff0e1] text-[#c4661b]'}`}>
                  {event.registered ? t('events.youAreRegistered') : t('events.registeredCount', { count: event.registrationCount })}
                </span>
              </div>

              <div className="mt-4 border-t border-[#e6e6e8] pt-4">
                {event.instructions && <p className="mb-4 whitespace-pre-line text-[15px] leading-relaxed text-[#444]">{event.instructions}</p>}
                <EventDetailsHeader event={event} />
                {event.hasMeetingLinks && !event.meetingLinks && <p className="mt-3 text-[12px] text-[#777]">{t('events.linksAfterRegistration')}</p>}
              </div>

              {held.length > 0 && (
                <div className="mt-5 border-t border-[#e6e6e8] pt-4">
                  <h4 className="text-[14px] font-bold text-[#a85f20]">{t('events.activitiesInEvent', { count: held.length })}</h4>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {held.map((activity) => (
                      <div key={activity.id} className="rounded-lg border border-[#d9dadd] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-[16px] font-bold text-[#333]">{activity.title}</p>
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

              <div className="mt-5 border-t border-[#e6e6e8] pt-4">
                {event.registered ? (
                  <button type="button" onClick={() => void register(event, false)} disabled={busy === event.id || preview} className={`${fullWidthButton} border-2 border-[#444] bg-white text-[#444] hover:bg-[#f4f4f4] disabled:cursor-wait disabled:opacity-60`}>{t('events.cancelRegistration')}</button>
                ) : !event.registrationOpen ? (
                  <p className="rounded-md bg-[#f3f3f4] px-4 py-3 text-center text-[14px] font-semibold text-[#555]">{t('events.registrationClosed')}</p>
                ) : canParticipate && !preview ? (
                  <button type="button" onClick={() => void register(event, true)} disabled={busy === event.id} className={`${fullWidthButton} bg-[#ea9139] text-white hover:bg-[#df771d] disabled:cursor-wait disabled:opacity-60`}>
                    <CalendarCheck2 size={19} aria-hidden="true" />{busy === event.id ? t('common.saving') : t('events.register')}
                  </button>
                ) : preview ? (
                  <p className="text-center text-[13px] font-semibold text-[#777]">{t('events.previewNoRegistration')}</p>
                ) : signedIn ? (
                  <p className="text-center text-[13px] font-semibold text-[#777]">{t('events.citizensOnly')}</p>
                ) : (
                  <Link to="/signin" className={`${fullWidthButton} bg-[#ea9139] text-white hover:bg-[#df771d]`}>{t('events.signInToRegister')}</Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
    {pastEvents}
    </>
  );
}
