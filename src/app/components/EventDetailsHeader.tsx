import type { ReactNode } from 'react';
import { Clock, Languages, MapPin, MonitorSmartphone, Users, UsersRound, Video } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { EVENT_MODE_KEYS, meetingLinkList, type HubEvent } from '../lib/events';

/** A rounded chip with an icon, as used for an activity's logistics in the Co-Creation Hub. */
export function InfoChip({ icon, children, tone = 'neutral' }: { icon: ReactNode; children: ReactNode; tone?: 'neutral' | 'offline' }) {
  return (
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${tone === 'offline' ? 'bg-[#fdecea] text-[#c0392b]' : 'bg-[#eef0f3] text-[#444]'}`}>
      {icon}{children}
    </span>
  );
}

/** One labelled detail row with an icon: required materials, accessibility notes, support contact, team notes. */
export function DetailRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex-none text-[#ca7428]" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#666]">{label}</p>
        <p className="whitespace-pre-line break-words text-[14px] leading-relaxed text-[#333]">{children}</p>
      </div>
    </div>
  );
}

/**
 * The shared logistics of an event: a calendar tile with the date, the time, where it happens, the
 * meeting link and chips for the participation type, duration, expected participants and languages.
 */
export default function EventDetailsHeader({ event }: { event: HubEvent }) {
  const { t, formatDate } = useI18n();
  const links = meetingLinkList(event.meetingLinks);
  const modeIcon = event.participationMode === 'citivoice'
    ? <MonitorSmartphone size={15} aria-hidden="true" />
    : <UsersRound size={15} aria-hidden="true" />;
  return (
    <div>
      <div className="flex items-start gap-4">
        <div className="grid h-[76px] w-[76px] flex-none place-items-center content-center rounded-lg border border-[#d9dadd] bg-white shadow-sm" aria-hidden="true">
          {event.startAt ? (
            <>
              <span className="text-[13px] font-bold text-[#a85f20]">{formatDate(event.startAt, { month: 'short' })}</span>
              <span className="text-[26px] font-bold leading-none text-[#333]">{formatDate(event.startAt, { day: 'numeric' })}</span>
            </>
          ) : <span className="text-[22px] font-bold text-[#aaa]">?</span>}
        </div>
        <div className="min-w-0 pt-1">
          <p className="text-[17px] font-bold text-[#333]">{event.startAt ? formatDate(event.startAt, { dateStyle: 'medium', timeStyle: 'short' }) : t('events.noDate')}</p>
          {event.location && <p className="mt-1 flex items-center gap-1.5 text-[14px] text-[#555]"><MapPin size={15} className="flex-none" aria-hidden="true" />{event.location}</p>}
          {links.map((link) => (
            <p key={link.text} className="mt-1 flex items-center gap-1.5 text-[14px] text-[#555]">
              <Video size={15} className="flex-none" aria-hidden="true" />
              {link.href ? <a href={link.href} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2 hover:text-[#a85f20]">{link.text}</a> : <span className="break-all">{link.text}</span>}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <InfoChip icon={modeIcon} tone={event.participationMode === 'offline' ? 'offline' : 'neutral'}>{t(EVENT_MODE_KEYS[event.participationMode])}</InfoChip>
        {event.duration && <InfoChip icon={<Clock size={15} aria-hidden="true" />}>{event.duration}</InfoChip>}
        {event.expectedParticipants && <InfoChip icon={<Users size={15} aria-hidden="true" />}>{event.expectedParticipants}</InfoChip>}
        {event.languageSupport && <InfoChip icon={<Languages size={15} aria-hidden="true" />}>{event.languageSupport}</InfoChip>}
      </div>
    </div>
  );
}
