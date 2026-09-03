import type { TranslationKey } from '../i18n/translations';

const STATUS_KEYS: Record<string, TranslationKey> = {
  draft: 'status.draft', scheduled: 'status.scheduled', published: 'status.published',
  active: 'status.active', inactive: 'status.inactive', paused: 'status.paused',
  completed: 'status.completed', current: 'status.current', upcoming: 'status.upcoming',
  archived: 'status.archived', not_started: 'status.not_started', open: 'status.open',
  closed: 'status.closed', ready_for_review: 'status.ready_for_review',
  under_review: 'status.under_review', pending_approval: 'status.pending_approval',
  needs_revision: 'status.needs_revision', approved: 'status.approved',
  declined: 'status.declined', rejected: 'status.rejected', cancelled: 'status.cancelled',
  implemented: 'status.implemented', suspended: 'status.suspended', public: 'status.public',
  private: 'status.private', invitation_only: 'status.invitation_only',
  disabled: 'status.disabled', visible: 'status.visible', locked: 'status.locked', hidden: 'status.hidden',
  configured: 'status.configured', operational: 'status.operational',
  municipality_review: 'status.municipality_review', discussion_open: 'status.discussion_open',
  voting_open: 'status.voting_open', participation_closed: 'status.participation_closed',
  decision_pending: 'status.decision_pending',
};

export function statusKey(raw: unknown): TranslationKey {
  const normalized = typeof raw === 'string'
    ? raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
    : '';
  return STATUS_KEYS[normalized] || 'status.unknown';
}
