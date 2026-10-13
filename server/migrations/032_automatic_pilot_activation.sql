-- Pilots no longer have a separate activation step: a pilot is active once every Objective has at
-- least one selected resource. Pilots that already meet the rule become active; the remaining
-- "ready to activate" pilots return to setup until they do.
UPDATE hub_initiatives
SET lifecycle_status = 'active',
    status = 'active',
    activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
    published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
    current_phase_number = COALESCE(current_phase_number, 1)
WHERE lifecycle_status IN ('setup_required', 'ready_to_activate')
  AND (
    SELECT COUNT(*) FROM hub_phases p
    WHERE p.initiative_id = hub_initiatives.id
      AND p.phase_number BETWEEN 1 AND 5
      AND json_valid(p.enabled_tools_json)
      AND json_array_length(p.enabled_tools_json) > 0
  ) = 5;

UPDATE hub_initiatives SET lifecycle_status = 'setup_required' WHERE lifecycle_status = 'ready_to_activate';
