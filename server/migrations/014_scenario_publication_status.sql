ALTER TABLE scenarios ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'in_preparation' CHECK(publication_status IN ('in_preparation','implementation_ongoing','under_evaluation','published'));
ALTER TABLE scenarios ADD COLUMN pilot_context TEXT NOT NULL DEFAULT '';
ALTER TABLE scenarios ADD COLUMN tools_used_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE scenarios ADD COLUMN stakeholders TEXT NOT NULL DEFAULT '';
ALTER TABLE scenarios ADD COLUMN activities TEXT NOT NULL DEFAULT '';
ALTER TABLE scenarios ADD COLUMN outputs_results TEXT NOT NULL DEFAULT '';
ALTER TABLE scenarios ADD COLUMN lessons_learned TEXT NOT NULL DEFAULT '';
ALTER TABLE scenarios ADD COLUMN recommendations TEXT NOT NULL DEFAULT '';
