-- An Event groups several activities of one Objective. Its logistics apply to every activity in it,
-- while each activity keeps its own instructions, required notes, team notes and accessibility notes.
CREATE TABLE IF NOT EXISTS hub_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initiative_id INTEGER NOT NULL REFERENCES hub_initiatives(id) ON DELETE CASCADE,
  phase_id INTEGER NOT NULL REFERENCES hub_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  start_at TEXT,
  participation_mode TEXT NOT NULL DEFAULT 'offline'
    CHECK (participation_mode IN ('offline', 'online', 'hybrid', 'citivoice')),
  duration TEXT,
  location TEXT,
  expected_participants TEXT,
  meeting_links TEXT,
  team_notes TEXT,
  language_support TEXT,
  support_contact TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
  registration_open INTEGER NOT NULL DEFAULT 1,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hub_events_scope ON hub_events(initiative_id, phase_id, status);

-- Citizens register for a published event; cancelling keeps the row so the history stays visible.
CREATE TABLE IF NOT EXISTS hub_event_registrations (
  event_id INTEGER NOT NULL REFERENCES hub_events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_event_registrations_user ON hub_event_registrations(user_id, status);

ALTER TABLE hub_activities ADD COLUMN event_id INTEGER REFERENCES hub_events(id) ON DELETE SET NULL;

-- What the Municipality records when an activity is completed. The summary is public.
ALTER TABLE hub_activities ADD COLUMN completion_summary TEXT;
ALTER TABLE hub_activities ADD COLUMN completion_outcomes TEXT;
ALTER TABLE hub_activities ADD COLUMN completion_discussion_points TEXT;
ALTER TABLE hub_activities ADD COLUMN completion_next_steps TEXT;
ALTER TABLE hub_activities ADD COLUMN completion_participants INTEGER;
ALTER TABLE hub_activities ADD COLUMN completion_recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE hub_activities ADD COLUMN completion_recorded_at TEXT;
