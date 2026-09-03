-- GuideProgress (specification section 5). Tracks whether a user has seen the onboarding
-- product tour, how far they got, and which tour version they saw so the tour can be
-- re-offered after a significant platform change without resetting anything else.
CREATE TABLE user_guide_progress (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tour_version INTEGER NOT NULL DEFAULT 1,
  last_step_index INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  skipped_at TEXT,
  updated_at TEXT NOT NULL
);
