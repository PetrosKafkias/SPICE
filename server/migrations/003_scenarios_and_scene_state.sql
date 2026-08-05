CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2e6e45',
  background TEXT NOT NULL DEFAULT '#eaf4ef',
  border_color TEXT NOT NULL DEFAULT '#b6ddc6',
  tags_json TEXT NOT NULL DEFAULT '[]',
  strengths_json TEXT NOT NULL DEFAULT '[]',
  concerns_json TEXT NOT NULL DEFAULT '[]',
  upvotes INTEGER NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
  downvotes INTEGER NOT NULL DEFAULT 0 CHECK (downvotes >= 0),
  rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  contributors INTEGER NOT NULL DEFAULT 0 CHECK (contributors >= 0),
  phase INTEGER NOT NULL DEFAULT 3 CHECK (phase BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'Community Review',
  guidance TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenario_votes (
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scenario_id, user_id)
);

CREATE TABLE IF NOT EXISTS scenario_adoptions (
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (scenario_id, user_id)
);

CREATE TABLE IF NOT EXISTS scene_states (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
