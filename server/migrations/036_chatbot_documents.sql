-- Documents uploaded through the platform to the document service of the AI Chatbot, so that the
-- Municipality sees which documents the chatbot of its pilot answers from.
CREATE TABLE IF NOT EXISTS chatbot_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pilot_slug TEXT NOT NULL,
  city TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  job_id TEXT,
  uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chatbot_documents_pilot ON chatbot_documents(pilot_slug, created_at);
