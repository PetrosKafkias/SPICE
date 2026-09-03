ALTER TABLE forum_proposals ADD COLUMN phase_number INTEGER NOT NULL DEFAULT 1
  CHECK(phase_number BETWEEN 1 AND 5);

UPDATE forum_proposals
SET phase_number = COALESCE(
  (SELECT current_phase_number
   FROM hub_initiatives
   WHERE hub_initiatives.id = forum_proposals.initiative_id),
  1
);

CREATE INDEX idx_forum_proposals_phase_workflow
  ON forum_proposals(initiative_id, phase_number, workflow_status);
