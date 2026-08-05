INSERT INTO notifications (
  user_id, type, event_type, title, body, tag, pilot, action_url,
  is_read, archived, created_at
)
SELECT
  u.id,
  'system',
  'notification_onboarding',
  'Notifications are ready',
  'You will be notified here when someone comments on your proposal, replies to you, or changes a proposal status.',
  'Getting started',
  u.pilot_site,
  '/forum-voting',
  0,
  0,
  datetime('now')
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n WHERE n.user_id = u.id
);
