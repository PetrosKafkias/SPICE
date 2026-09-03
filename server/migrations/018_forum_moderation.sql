ALTER TABLE forum_proposals ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible'
  CHECK (moderation_status IN ('visible', 'locked', 'hidden'));

ALTER TABLE forum_proposals ADD COLUMN moderation_reason TEXT;
ALTER TABLE forum_proposals ADD COLUMN moderated_at TEXT;
ALTER TABLE forum_proposals ADD COLUMN moderated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS forum_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL REFERENCES forum_proposals(id) ON DELETE CASCADE,
  reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (proposal_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON forum_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_proposals_moderation ON forum_proposals(moderation_status, updated_at DESC);
