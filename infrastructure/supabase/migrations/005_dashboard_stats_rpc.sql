-- ==============================================================================
-- Cyber Crew CTF - Migration 005: High-Performance Admin Telemetry RPC
-- Consolidates 8 individual PostgREST count queries into a single atomic function.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'participants_count', (SELECT count(*)::int FROM users WHERE role = 'PARTICIPANT'),
    'teams_count', (SELECT count(*)::int FROM teams),
    'challenges_count', (SELECT count(*)::int FROM challenges),
    'active_challenges_count', (SELECT count(*)::int FROM challenges WHERE status = 'ACTIVE'),
    'submissions_count', (SELECT count(*)::int FROM submissions),
    'solves_count', (SELECT count(*)::int FROM solves),
    'hints_unlocked_count', (SELECT count(*)::int FROM hint_unlocks),
    'points_deducted_hints', COALESCE((SELECT sum(cost)::int FROM hint_unlocks), 0)
  );
$$;
