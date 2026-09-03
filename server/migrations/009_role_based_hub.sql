ALTER TABLE users ADD COLUMN organisation_id INTEGER;
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN roles_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE organisations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  municipality TEXT NOT NULL,
  pilot_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE hub_initiatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  pilot_slug TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  objectives TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','published','active','paused','completed','archived')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private','invitation_only')),
  participation_rules TEXT NOT NULL DEFAULT '',
  enabled_tools_json TEXT NOT NULL DEFAULT '[]',
  start_date TEXT,
  end_date TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_hub_initiatives_scope ON hub_initiatives(organisation_id, status, visibility);

CREATE TABLE hub_phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initiative_id INTEGER NOT NULL REFERENCES hub_initiatives(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL CHECK(phase_number BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','scheduled','open','closed','completed')),
  enabled_tools_json TEXT NOT NULL DEFAULT '[]',
  instructions TEXT NOT NULL DEFAULT '',
  results_visible INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  UNIQUE(initiative_id, phase_number)
);

CREATE TABLE hub_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initiative_id INTEGER NOT NULL REFERENCES hub_initiatives(id) ON DELETE CASCADE,
  phase_id INTEGER NOT NULL REFERENCES hub_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','open','closed','completed')),
  tool_key TEXT,
  contribution_types_json TEXT NOT NULL DEFAULT '["text"]',
  voting_enabled INTEGER NOT NULL DEFAULT 0,
  forum_enabled INTEGER NOT NULL DEFAULT 0,
  results_visible INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE hub_participants (
  initiative_id INTEGER NOT NULL REFERENCES hub_initiatives(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_at TEXT NOT NULL,
  PRIMARY KEY(initiative_id, user_id)
);

ALTER TABLE forum_proposals ADD COLUMN initiative_id INTEGER REFERENCES hub_initiatives(id) ON DELETE SET NULL;
ALTER TABLE forum_proposals ADD COLUMN organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL;
ALTER TABLE forum_proposals ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE forum_proposals ADD COLUMN withdrawn_at TEXT;

CREATE TABLE forum_official_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL REFERENCES forum_proposals(id) ON DELETE CASCADE,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK(decision IN ('under_review','approved','declined')),
  previous_status TEXT NOT NULL,
  rationale TEXT NOT NULL,
  reference TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  timestamp TEXT NOT NULL,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  organisation_id INTEGER,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  source TEXT NOT NULL DEFAULT 'api'
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
