CREATE TABLE resource_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id TEXT NOT NULL,
  initiative_id INTEGER NOT NULL REFERENCES hub_initiatives(id) ON DELETE CASCADE,
  uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  image_data TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published')),
  published_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_resource_photos_tool ON resource_photos(tool_id, status);
