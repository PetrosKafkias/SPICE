-- Municipality instructions for facilitators, per Objective and per selected tool.
ALTER TABLE hub_phases ADD COLUMN municipality_notes TEXT;
ALTER TABLE hub_phases ADD COLUMN municipality_tool_notes_json TEXT NOT NULL DEFAULT '{}';

-- A facilitator's implementation of a selected tool keeps its own notes, separate from the
-- Municipality instructions and from the public participation instructions.
ALTER TABLE hub_activities ADD COLUMN facilitator_notes TEXT;
ALTER TABLE hub_activities ADD COLUMN expected_participants TEXT;

-- Each implementation belongs to one selected tool (tool_key); backfill it from the older list column.
UPDATE hub_activities
SET tool_key = json_extract(selected_tool_ids_json, '$[0]')
WHERE tool_key IS NULL
  AND json_valid(selected_tool_ids_json)
  AND json_array_length(selected_tool_ids_json) > 0;
