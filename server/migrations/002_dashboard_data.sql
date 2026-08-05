CREATE TABLE IF NOT EXISTS dashboard_data (
  page TEXT NOT NULL,
  data_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (page, data_key)
);
