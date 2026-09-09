-- ==============================================================================
-- Cyber Crew CTF - Migration 003: Row Level Security (RLS) Policies
-- Zero-Trust database architecture enforcing strict data isolation and protection.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY ACROSS ALL TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE hint_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solves ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. USERS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view active usernames and display names for leaderboard
CREATE POLICY "Public users can view active user profiles"
ON users FOR SELECT
USING (is_active = true);

-- ------------------------------------------------------------------------------
-- 2. TEAMS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view team profiles and scores for the scoreboard
CREATE POLICY "Public can view teams for leaderboard"
ON teams FOR SELECT
USING (true);

-- ------------------------------------------------------------------------------
-- 3. TEAM MEMBERS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view team rosters
CREATE POLICY "Public can view team members"
ON team_members FOR SELECT
USING (true);

-- ------------------------------------------------------------------------------
-- 4. CATEGORIES POLICIES
-- ------------------------------------------------------------------------------
-- Anyone can view active challenge categories
CREATE POLICY "Public can view active categories"
ON categories FOR SELECT
USING (is_active = true);

-- ------------------------------------------------------------------------------
-- 5. CHALLENGES POLICIES
-- ------------------------------------------------------------------------------
-- Participants can view published, active challenges (flags are in a separate table)
CREATE POLICY "Participants can view published challenges"
ON challenges FOR SELECT
USING (is_published = true AND is_active = true);

-- ------------------------------------------------------------------------------
-- 6. CHALLENGE FLAGS (CRITICAL ZERO-TRUST POLICY)
-- ------------------------------------------------------------------------------
-- ZERO access for public, anon, or authenticated participants.
-- Flags are NEVER accessible via client-side Supabase queries.
-- All flag validation MUST occur via NestJS backend using service_role key.
-- (No SELECT policies granted to public/authenticated).

-- ------------------------------------------------------------------------------
-- 7. CHALLENGE HINTS POLICIES
-- ------------------------------------------------------------------------------
-- Participants can view hint titles and costs (content unlocked via backend API)
CREATE POLICY "Participants can view active hints"
ON challenge_hints FOR SELECT
USING (is_active = true);

-- ------------------------------------------------------------------------------
-- 8. HINT UNLOCKS POLICIES
-- ------------------------------------------------------------------------------
-- Hint unlocks are managed and verified via backend API
CREATE POLICY "Participants can view own team unlocks"
ON hint_unlocks FOR SELECT
USING (
    team_id IN (
        SELECT tm.team_id FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE u.auth_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 9. CHALLENGE FILES & TARGETS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Participants can view published challenge files"
ON challenge_files FOR SELECT
USING (
    challenge_id IN (
        SELECT id FROM challenges WHERE is_published = true AND is_active = true
    )
);

CREATE POLICY "Participants can view published challenge targets"
ON challenge_targets FOR SELECT
USING (
    challenge_id IN (
        SELECT id FROM challenges WHERE is_published = true AND is_active = true
    )
);

-- ------------------------------------------------------------------------------
-- 10. SUBMISSIONS POLICIES
-- ------------------------------------------------------------------------------
-- Participants can only see their own team's submissions
CREATE POLICY "Participants can view own team submissions"
ON submissions FOR SELECT
USING (
    team_id IN (
        SELECT tm.team_id FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE u.auth_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 11. SOLVES POLICIES
-- ------------------------------------------------------------------------------
-- Public can view solve counts and timestamps for live scoreboard
CREATE POLICY "Public can view solves"
ON solves FOR SELECT
USING (true);

-- ------------------------------------------------------------------------------
-- 12. SCORE EVENTS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view solve events, participants can view their team's hint/adjustment events
CREATE POLICY "Participants can view team score events"
ON score_events FOR SELECT
USING (
    event_type = 'CHALLENGE_SOLVE'
    OR
    team_id IN (
        SELECT tm.team_id FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE u.auth_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 13. ANNOUNCEMENTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can view published announcements"
ON announcements FOR SELECT
USING (is_published = true);

-- ------------------------------------------------------------------------------
-- 14. BADGES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can view badges"
ON badges FOR SELECT
USING (true);

CREATE POLICY "Public can view team badges"
ON team_badges FOR SELECT
USING (true);

-- ------------------------------------------------------------------------------
-- 15. COMPETITION SETTINGS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public can view competition settings"
ON competition_settings FOR SELECT
USING (true);

-- ------------------------------------------------------------------------------
-- 16. AUDIT LOGS (RESTRICTED)
-- ------------------------------------------------------------------------------
-- ZERO access for normal users. Managed strictly via backend administrative service.
