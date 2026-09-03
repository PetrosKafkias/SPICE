ALTER TABLE hub_activities ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'participation';
ALTER TABLE hub_activities ADD COLUMN selected_tool_ids_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE hub_activities ADD COLUMN instructions TEXT NOT NULL DEFAULT '';
ALTER TABLE hub_activities ADD COLUMN start_date TEXT;
ALTER TABLE hub_activities ADD COLUMN end_date TEXT;
ALTER TABLE hub_activities ADD COLUMN location TEXT;
ALTER TABLE hub_activities ADD COLUMN participation_mode TEXT NOT NULL DEFAULT 'offline'
  CHECK (participation_mode IN ('online', 'offline', 'hybrid'));
ALTER TABLE hub_activities ADD COLUMN estimated_duration TEXT;
ALTER TABLE hub_activities ADD COLUMN required_materials TEXT;
ALTER TABLE hub_activities ADD COLUMN eligibility TEXT;
ALTER TABLE hub_activities ADD COLUMN submission_type TEXT;
ALTER TABLE hub_activities ADD COLUMN submission_deadline TEXT;
ALTER TABLE hub_activities ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'participants', 'internal'));
ALTER TABLE hub_activities ADD COLUMN allow_anonymous_participation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hub_activities ADD COLUMN allow_editing INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hub_activities ADD COLUMN accessibility_notes TEXT;
ALTER TABLE hub_activities ADD COLUMN language_support TEXT;
ALTER TABLE hub_activities ADD COLUMN support_contact TEXT;
ALTER TABLE hub_activities ADD COLUMN published_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE repository_documents ADD COLUMN phase_id INTEGER REFERENCES hub_phases(id) ON DELETE SET NULL;
ALTER TABLE repository_documents ADD COLUMN activity_id INTEGER REFERENCES hub_activities(id) ON DELETE SET NULL;
ALTER TABLE repository_documents ADD COLUMN result_type TEXT;
ALTER TABLE repository_documents ADD COLUMN author_role TEXT;
ALTER TABLE repository_documents ADD COLUMN published_at TEXT;
ALTER TABLE repository_documents ADD COLUMN published_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

UPDATE hub_activities
SET selected_tool_ids_json = CASE
  WHEN tool_key IS NULL OR TRIM(tool_key) = '' THEN '[]'
  ELSE json_array(tool_key)
END
WHERE selected_tool_ids_json = '[]';

UPDATE repository_documents
SET phase_id = (
  SELECT hp.id FROM hub_phases hp
  WHERE hp.initiative_id = repository_documents.initiative_id
    AND hp.phase_number = repository_documents.phase
  LIMIT 1
)
WHERE phase_id IS NULL AND initiative_id IS NOT NULL;

UPDATE repository_documents
SET author_role = (
  SELECT u.role FROM users u WHERE u.id = repository_documents.uploaded_by_user_id
)
WHERE author_role IS NULL AND uploaded_by_user_id IS NOT NULL;

UPDATE repository_documents
SET published_at = updated_at
WHERE publication_status = 'published' AND published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hub_activities_public_phase
  ON hub_activities(initiative_id, phase_id, workflow_status, visibility);
CREATE INDEX IF NOT EXISTS idx_repository_phase_results
  ON repository_documents(initiative_id, phase_id, publication_status, access_level, result_type);
CREATE INDEX IF NOT EXISTS idx_repository_activity
  ON repository_documents(activity_id);
