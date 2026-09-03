-- Each municipality manages exactly one pilot-site initiative. Earlier data allowed
-- multiple hub_initiatives rows per organisation; keep the most "real" one per
-- organisation (active > published > paused > completed > scheduled > draft, tie-break
-- by id) and drop the rest before enforcing the constraint going forward.
DELETE FROM hub_initiatives WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY organisation_id
      ORDER BY CASE status
        WHEN 'active' THEN 0
        WHEN 'published' THEN 1
        WHEN 'paused' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'scheduled' THEN 4
        ELSE 5
      END, id
    ) AS rn
    FROM hub_initiatives
  ) WHERE rn > 1
);

CREATE UNIQUE INDEX idx_hub_initiatives_one_per_org ON hub_initiatives(organisation_id);
