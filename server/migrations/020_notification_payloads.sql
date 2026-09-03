ALTER TABLE notifications ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{}';

UPDATE notifications
SET event_type = 'scenario_proposed',
    payload_json = '{"scenarioTitle":"Parko Kritis"}'
WHERE title = 'New 3D Variant Proposed';

UPDATE notifications
SET event_type = 'map_reply',
    payload_json = '{}'
WHERE title = 'Reply to your map pin';

UPDATE notifications
SET event_type = 'repository_summary',
    payload_json = '{}'
WHERE title = 'Workshop summary available';

UPDATE notifications
SET event_type = 'proposal_technical_review',
    payload_json = '{}'
WHERE title = 'Proposal status updated' AND body LIKE '%technical review%';

UPDATE notifications
SET event_type = 'profile_preferences_saved',
    payload_json = '{}'
WHERE title = 'Profile preferences saved';
