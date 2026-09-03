ALTER TABLE hub_activities ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'draft'
  CHECK(workflow_status IN ('draft','ready_for_review','needs_revision','published','scheduled','open','closed','completed','cancelled'));
ALTER TABLE hub_activities ADD COLUMN assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE hub_activities ADD COLUMN review_notes TEXT;
ALTER TABLE hub_activities ADD COLUMN submitted_at TEXT;
ALTER TABLE hub_activities ADD COLUMN published_at TEXT;
ALTER TABLE hub_activities ADD COLUMN closed_at TEXT;
ALTER TABLE hub_activities ADD COLUMN completed_at TEXT;
ALTER TABLE hub_activities ADD COLUMN cancelled_at TEXT;

UPDATE hub_activities SET workflow_status = status;

ALTER TABLE forum_proposals ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'published'
  CHECK(workflow_status IN ('draft','municipality_review','needs_revision','published','discussion_open','voting_open','participation_closed','decision_pending','approved','declined','archived'));
ALTER TABLE forum_proposals ADD COLUMN participation_summary TEXT;
ALTER TABLE forum_proposals ADD COLUMN voting_closes_at TEXT;
ALTER TABLE forum_proposals ADD COLUMN decision_at TEXT;

UPDATE forum_proposals
SET workflow_status = CASE status
  WHEN 'Under Review' THEN 'municipality_review'
  WHEN 'Needs Revision' THEN 'needs_revision'
  WHEN 'Implemented' THEN 'approved'
  WHEN 'Rejected' THEN 'declined'
  ELSE 'discussion_open'
END;

ALTER TABLE hub_phases ADD COLUMN completion_summary TEXT;
ALTER TABLE hub_phases ADD COLUMN completion_requirements_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE hub_phases ADD COLUMN completed_at TEXT;

CREATE TABLE workflow_handoffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initiative_id INTEGER NOT NULL REFERENCES hub_initiatives(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL CHECK(phase_number BETWEEN 1 AND 5),
  item_type TEXT NOT NULL CHECK(item_type IN ('phase','activity','proposal','participation_summary','result')),
  item_id INTEGER,
  from_role TEXT NOT NULL,
  to_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','acknowledged','completed','cancelled')),
  message TEXT,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX idx_workflow_handoffs_assignee
  ON workflow_handoffs(initiative_id, to_role, status, created_at DESC);
CREATE INDEX idx_hub_activities_workflow
  ON hub_activities(initiative_id, phase_id, workflow_status);
CREATE INDEX idx_forum_proposals_workflow
  ON forum_proposals(initiative_id, workflow_status, updated_at DESC);
