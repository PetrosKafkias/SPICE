-- Repository items gain the draft -> ready for review -> published workflow described in the
-- role-journey specification (section 17). Existing seeded rows default to 'published' so the
-- current public catalogue stays visible; anything uploaded from now on starts as a draft.
ALTER TABLE repository_documents ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'published' CHECK(publication_status IN ('draft','ready_for_review','published','archived'));
ALTER TABLE repository_documents ADD COLUMN access_level TEXT NOT NULL DEFAULT 'public' CHECK(access_level IN ('public','participants','internal'));
ALTER TABLE repository_documents ADD COLUMN initiative_id INTEGER REFERENCES hub_initiatives(id) ON DELETE SET NULL;
ALTER TABLE repository_documents ADD COLUMN organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL;
ALTER TABLE repository_documents ADD COLUMN uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE repository_documents ADD COLUMN tool_key TEXT;
ALTER TABLE repository_documents ADD COLUMN related_proposal_id INTEGER REFERENCES forum_proposals(id) ON DELETE SET NULL;
ALTER TABLE repository_documents ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE repository_documents ADD COLUMN created_at TEXT;

CREATE INDEX IF NOT EXISTS idx_repository_publication ON repository_documents(publication_status, phase);
