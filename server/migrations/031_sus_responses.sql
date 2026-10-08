-- The System Usability Scale is a separate questionnaire from free-text feedback.
CREATE TABLE IF NOT EXISTS sus_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  answers_json TEXT NOT NULL,
  score REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sus_responses_created_at ON sus_responses(created_at DESC);
