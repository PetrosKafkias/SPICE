ALTER TABLE hub_initiatives ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'setup_required'
  CHECK(lifecycle_status IN ('setup_required','ready_to_activate','active','completed'));
ALTER TABLE hub_initiatives ADD COLUMN activated_at TEXT;
ALTER TABLE hub_initiatives ADD COLUMN setup_updated_at TEXT;

UPDATE hub_initiatives
SET lifecycle_status = CASE
  WHEN status = 'completed' THEN 'completed'
  WHEN status IN ('active','published','paused') THEN 'active'
  WHEN setup_completed_at IS NOT NULL AND json_array_length(setup_selected_tools_json) > 0 THEN 'ready_to_activate'
  ELSE 'setup_required'
END,
activated_at = CASE
  WHEN status IN ('active','published','paused','completed') THEN COALESCE(published_at, updated_at)
  ELSE NULL
END,
setup_updated_at = CASE
  WHEN setup_completed_at IS NOT NULL THEN COALESCE(setup_completed_at, updated_at)
  ELSE NULL
END;

CREATE INDEX idx_hub_initiatives_lifecycle
  ON hub_initiatives(organisation_id, lifecycle_status, updated_at DESC);
