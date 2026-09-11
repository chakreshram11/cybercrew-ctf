-- ==============================================================================
-- Cyber Crew CTF - Migration 007: Challenge Visibility and Competition Reset
-- Adds is_visible boolean column to challenges table with composite index
-- ==============================================================================

ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_challenges_visibility
ON challenges(is_visible, is_published, is_active);
