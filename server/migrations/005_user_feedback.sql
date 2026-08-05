CREATE TABLE user_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'technical', 'improvement')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('footer', 'account')),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);
