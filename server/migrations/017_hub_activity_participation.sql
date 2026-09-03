CREATE TABLE IF NOT EXISTS hub_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initiative_id INTEGER NOT NULL REFERENCES hub_initiatives(id) ON DELETE CASCADE,
  phase_id INTEGER NOT NULL REFERENCES hub_phases(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES hub_activities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  contribution_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewed','incorporated','declined','withdrawn','hidden')),
  municipality_response TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_hub_contributions_scope
  ON hub_contributions(initiative_id, activity_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_hub_contributions_user
  ON hub_contributions(user_id, created_at);

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);
