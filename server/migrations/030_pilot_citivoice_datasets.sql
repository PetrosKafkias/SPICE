-- CitiVoice outputs are pilot-specific: one dataset per pilot site, replacing the single global dashboard.
CREATE TABLE IF NOT EXISTS citivoice_datasets (
  pilot_slug TEXT PRIMARY KEY,
  area_name TEXT NOT NULL,
  metrics_json TEXT NOT NULL DEFAULT '[]',
  data_json TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'demonstration' CHECK(source IN ('demonstration','citivoice')),
  updated_at TEXT NOT NULL
);
