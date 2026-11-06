-- An activity can take place in several events (for example the same workshop run twice), so the
-- link between events and activities moves from hub_activities.event_id to its own table.
CREATE TABLE IF NOT EXISTS hub_event_activities (
  event_id INTEGER NOT NULL REFERENCES hub_events(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES hub_activities(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (event_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_event_activities_activity ON hub_event_activities(activity_id);

INSERT OR IGNORE INTO hub_event_activities (event_id, activity_id, created_at)
SELECT event_id, id, COALESCE(updated_at, created_at) FROM hub_activities WHERE event_id IS NOT NULL;

-- The old single link is no longer read; clear it so it cannot drift from the new table.
UPDATE hub_activities SET event_id = NULL WHERE event_id IS NOT NULL;
