import type { TranslationKey } from '../i18n/translations';

export type EventMode = 'offline' | 'online' | 'hybrid' | 'citivoice';
export type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled';

/** An event groups several activities of one Objective under shared logistics. */
export interface HubEvent {
  id: number;
  initiativeId: number;
  phaseId: number;
  title: string;
  instructions: string;
  startAt: string | null;
  participationMode: EventMode;
  duration: string | null;
  location: string | null;
  expectedParticipants: string | null;
  /** Only sent to staff and to citizens who registered. */
  meetingLinks: string | null;
  hasMeetingLinks: boolean;
  /** Internal to staff. */
  teamNotes: string | null;
  languageSupport: string | null;
  supportContact: string | null;
  status: EventStatus;
  registrationOpen: boolean;
  registered: boolean;
  registrationCount: number;
  publishedAt: string | null;
  /** Present once a report exists; citizens receive only its public part, after the event is completed. */
  report?: EventReport | null;
}

/** What the Municipality recorded when an activity was completed. The summary is public. */
export interface ActivityCompletion {
  summary: string;
  outcomes: string | null;
  discussionPoints: string | null;
  nextSteps: string | null;
  participants: number | null;
  recordedAt: string | null;
}

export const EVENT_MODES: EventMode[] = ['offline', 'online', 'hybrid', 'citivoice'];

export const EVENT_MODE_KEYS: Record<EventMode, TranslationKey> = {
  offline: 'events.mode.offline',
  online: 'events.mode.online',
  hybrid: 'events.mode.hybrid',
  citivoice: 'events.mode.citivoice',
};

export const EVENT_STATUS_KEYS: Record<EventStatus, TranslationKey> = {
  draft: 'events.status.draft',
  published: 'events.status.published',
  completed: 'events.status.completed',
  cancelled: 'events.status.cancelled',
};

/** Splits the meeting-links field into one link per line, keeping only web addresses as links. */
export function meetingLinkList(value: string | null): Array<{ text: string; href: string | null }> {
  return (value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((text) => {
    const match = text.match(/https?:\/\/\S+/);
    return { text, href: match ? match[0] : null };
  });
}

export function isUpcoming(event: Pick<HubEvent, 'startAt'>): boolean {
  return !event.startAt || Date.parse(event.startAt) > Date.now() - 12 * 60 * 60 * 1000;
}

export type EventAttachmentKind = 'invitation' | 'agenda' | 'attendance' | 'presentation' | 'photo' | 'press';

export const EVENT_ATTACHMENT_KINDS: EventAttachmentKind[] = ['invitation', 'agenda', 'attendance', 'presentation', 'photo', 'press'];

export interface EventAttachment {
  id: number;
  kind: EventAttachmentKind;
  title: string;
  fileName: string | null;
  linkUrl: string | null;
  hasFile: boolean;
  createdAt: string;
}

export interface EventSurvey {
  influenceScore?: number | null;
  underrepresentedPct?: number | null;
  accessibilityPct?: number | null;
  trustScore?: number | null;
  belongingPct?: number | null;
  validationPct?: number | null;
  link?: string | null;
}

export interface EventOpeningCheck {
  method?: string | null;
  respondents?: number | null;
  statement1Agree?: number | null;
  statement2Agree?: number | null;
  statement1Pct?: number | null;
  statement2Pct?: number | null;
}

/**
 * The event report (SPICE Toolkit, Tool 17). Date, location, participants, short article and
 * insights are public; the other fields are sent only to the pilot's staff.
 */
export interface EventReport {
  date: string | null;
  location: string | null;
  participants: number | null;
  shortArticle: string | null;
  insights: string | null;
  updatedAt: string;
  summaryScope?: string | null;
  openingCheck?: EventOpeningCheck;
  survey?: EventSurvey;
  activityNotes?: Array<{ activityId: number; minutes: string; feedback: string }>;
  attachments?: EventAttachment[];
}
