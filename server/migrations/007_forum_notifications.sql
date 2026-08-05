ALTER TABLE notifications ADD COLUMN event_type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN action_url TEXT;
ALTER TABLE notifications ADD COLUMN actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE forum_comments ADD COLUMN parent_comment_id INTEGER REFERENCES forum_comments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(user_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_comments_parent ON forum_comments(parent_comment_id);

UPDATE notifications
SET action_url = '/forum-voting',
    event_type = CASE
      WHEN type = 'comment' THEN 'comment_reply'
      WHEN type IN ('forum', 'proposal') THEN 'proposal_status'
      ELSE event_type
    END
WHERE type IN ('comment', 'forum', 'proposal') AND action_url IS NULL;
