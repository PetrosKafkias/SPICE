-- The event report (SPICE Toolkit, Tool 17) that the Municipality completes when an event ends.
-- Public fields are shown to citizens; internal fields are visible only to the Municipality and the
-- facilitators of the pilot.
CREATE TABLE IF NOT EXISTS hub_event_reports (
  event_id INTEGER PRIMARY KEY REFERENCES hub_events(id) ON DELETE CASCADE,
  -- Public
  report_date TEXT,
  location TEXT,
  participants INTEGER,
  short_article TEXT,
  insights TEXT,
  -- Internal
  summary_scope TEXT,
  opening_check_json TEXT NOT NULL DEFAULT '{}',
  survey_json TEXT NOT NULL DEFAULT '{}',
  submitted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Minutes (key points) and feedback for each activity of the event. Internal.
CREATE TABLE IF NOT EXISTS hub_event_activity_notes (
  event_id INTEGER NOT NULL REFERENCES hub_events(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES hub_activities(id) ON DELETE CASCADE,
  minutes TEXT,
  feedback TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (event_id, activity_id)
);

-- Annexes of the report: invitation, agenda, attendance list, presentations, photos and press
-- clippings, each as an uploaded file or a link. Internal.
CREATE TABLE IF NOT EXISTS hub_event_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES hub_events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('invitation', 'agenda', 'attendance', 'presentation', 'photo', 'press')),
  title TEXT NOT NULL DEFAULT '',
  file_name TEXT,
  file_data TEXT,
  link_url TEXT,
  uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  CHECK (file_data IS NOT NULL OR link_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_hub_event_attachments_event ON hub_event_attachments(event_id, kind);
