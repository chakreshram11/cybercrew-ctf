-- ==============================================================================
-- Cyber Crew CTF - Migration 006: First Blood Concurrency Atomicity Guarantee
-- PostgreSQL Partial Unique Index: Guarantees at the storage engine level that
-- EXACTLY ONE team can ever possess is_first_blood = TRUE per challenge.
-- Prevents race conditions when multiple teams solve at the identical millisecond.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_first_blood
ON solves (challenge_id)
WHERE is_first_blood = TRUE;
