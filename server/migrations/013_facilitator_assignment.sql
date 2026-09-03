ALTER TABLE hub_participants ADD COLUMN assignment_role TEXT NOT NULL DEFAULT 'participant' CHECK(assignment_role IN ('participant','facilitator'));
