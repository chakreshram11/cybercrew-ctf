-- ==============================================================================
-- Cyber Crew CTF - Migration 002: Performance Indexes & Constraints
-- Optimizes scoreboard querying, lookups, solve verification, and audit pipelines.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. USERS INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth_id ON users(auth_id);

-- ------------------------------------------------------------------------------
-- 2. TEAMS INDEXES (CRITICAL FOR REAL-TIME SCOREBOARD PERFORMANCE)
-- ------------------------------------------------------------------------------
CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_invite_code ON teams(invite_code);
CREATE INDEX idx_teams_score_leaderboard ON teams(score DESC, updated_at ASC);

-- ------------------------------------------------------------------------------
-- 3. TEAM MEMBERS INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- ------------------------------------------------------------------------------
-- 4. CATEGORIES INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_display_order ON categories(display_order ASC);
CREATE INDEX idx_categories_active ON categories(is_active);

-- ------------------------------------------------------------------------------
-- 5. CHALLENGES INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_challenges_category_id ON challenges(category_id);
CREATE INDEX idx_challenges_slug ON challenges(slug);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_challenges_type ON challenges(challenge_type);
CREATE INDEX idx_challenges_published_active ON challenges(is_published, is_active);

-- ------------------------------------------------------------------------------
-- 6. CHALLENGE FLAGS INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_challenge_flags_challenge_id ON challenge_flags(challenge_id);
CREATE INDEX idx_challenge_flags_hash ON challenge_flags(flag_hash);

-- ------------------------------------------------------------------------------
-- 7. CHALLENGE HINTS & UNLOCKS INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_challenge_hints_challenge_id ON challenge_hints(challenge_id);
CREATE INDEX idx_challenge_hints_order ON challenge_hints(challenge_id, display_order ASC);
CREATE INDEX idx_hint_unlocks_team_id ON hint_unlocks(team_id);
CREATE INDEX idx_hint_unlocks_challenge_id ON hint_unlocks(challenge_id);
CREATE INDEX idx_hint_unlocks_hint_id ON hint_unlocks(hint_id);

-- ------------------------------------------------------------------------------
-- 8. CHALLENGE FILES & TARGETS INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_challenge_files_challenge_id ON challenge_files(challenge_id);
CREATE INDEX idx_challenge_targets_challenge_id ON challenge_targets(challenge_id);

-- ------------------------------------------------------------------------------
-- 9. SUBMISSIONS INDEXES (ANTI-CHEAT & TIMELINE AUDITING)
-- ------------------------------------------------------------------------------
CREATE INDEX idx_submissions_challenge_id ON submissions(challenge_id);
CREATE INDEX idx_submissions_team_id ON submissions(team_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX idx_submissions_ip_hash ON submissions(ip_hash);
CREATE INDEX idx_submissions_correctness ON submissions(challenge_id, is_correct);

-- ------------------------------------------------------------------------------
-- 10. SOLVES INDEXES (RACE-CONDITION VERIFICATION & STATS)
-- ------------------------------------------------------------------------------
CREATE INDEX idx_solves_challenge_id ON solves(challenge_id);
CREATE INDEX idx_solves_team_id ON solves(team_id);
CREATE INDEX idx_solves_user_id ON solves(user_id);
CREATE INDEX idx_solves_first_blood ON solves(challenge_id, is_first_blood);
CREATE INDEX idx_solves_solved_at ON solves(solved_at ASC);

-- ------------------------------------------------------------------------------
-- 11. SCORE EVENTS (IMMUTABLE AUDIT LEDGER)
-- ------------------------------------------------------------------------------
CREATE INDEX idx_score_events_team_id ON score_events(team_id);
CREATE INDEX idx_score_events_challenge_id ON score_events(challenge_id);
CREATE INDEX idx_score_events_created_at ON score_events(created_at DESC);
CREATE INDEX idx_score_events_type ON score_events(event_type);

-- ------------------------------------------------------------------------------
-- 12. ANNOUNCEMENTS & AUDIT LOGS INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX idx_announcements_published_at ON announcements(is_published, published_at DESC);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
