ALTER TABLE forum_proposals ADD COLUMN item_type TEXT NOT NULL DEFAULT 'proposal'
  CHECK(item_type IN ('issue', 'proposal', 'design_alternative', 'finding', 'workshop_outcome', 'prototype'));

ALTER TABLE forum_proposals ADD COLUMN category TEXT;
ALTER TABLE forum_proposals ADD COLUMN workflow_step_id TEXT;

ALTER TABLE forum_proposals ADD COLUMN voting_mode TEXT NOT NULL DEFAULT 'support'
  CHECK(voting_mode IN ('support', 'binary'));

ALTER TABLE forum_proposals ADD COLUMN voting_opens_at TEXT;
ALTER TABLE forum_proposals ADD COLUMN linked_output_type TEXT;
ALTER TABLE forum_proposals ADD COLUMN linked_output_id TEXT;
ALTER TABLE forum_proposals ADD COLUMN linked_output_label TEXT;
ALTER TABLE forum_proposals ADD COLUMN linked_output_url TEXT;
ALTER TABLE forum_proposals ADD COLUMN source_proposal_id INTEGER REFERENCES forum_proposals(id) ON DELETE SET NULL;

UPDATE forum_proposals
SET category = json_extract(tags_json, '$[0]')
WHERE category IS NULL AND json_array_length(tags_json) > 0;

UPDATE forum_proposals
SET voting_mode = 'binary'
WHERE workflow_status IN ('voting_open', 'participation_closed', 'decision_pending', 'approved', 'declined');

CREATE TABLE forum_proposal_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL REFERENCES forum_proposals(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL CHECK(phase_number BETWEEN 1 AND 5),
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO forum_proposal_events (
  proposal_id, phase_number, event_type, to_status, actor_user_id, note, created_at
)
SELECT id, phase_number, 'created', workflow_status, user_id,
       'Proposal added to the pilot deliberation history.', created_at
FROM forum_proposals;

CREATE INDEX idx_forum_proposals_context
  ON forum_proposals(initiative_id, phase_number, item_type, category, workflow_status);

CREATE INDEX idx_forum_proposal_events_history
  ON forum_proposal_events(proposal_id, created_at);
