-- ==============================================================================
-- Cyber Crew CTF - Migration 001: Initial Database Schema
-- Defines normalized PostgreSQL schema for users, teams, challenges, scoring, etc.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'PARTICIPANT',
    'TEAM_CAPTAIN',
    'CHALLENGE_AUTHOR',
    'MODERATOR',
    'ADMIN',
    'SUPER_ADMIN'
);

CREATE TYPE team_member_role AS ENUM (
    'CAPTAIN',
    'MEMBER'
);

CREATE TYPE challenge_difficulty AS ENUM (
    'EASY',
    'MEDIUM',
    'HARD',
    'EXPERT'
);

CREATE TYPE challenge_type AS ENUM (
    'STATIC',
    'WEB',
    'NETWORK',
    'PWN',
    'REVERSE',
    'CRYPTO',
    'FORENSICS',
    'OSINT',
    'LINUX',
    'WINDOWS',
    'MOBILE',
    'CLOUD',
    'AI_SECURITY',
    'MISC'
);

CREATE TYPE challenge_status AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'APPROVED',
    'PUBLISHED',
    'ACTIVE',
    'DISABLED',
    'ARCHIVED'
);

CREATE TYPE event_state AS ENUM (
    'DRAFT',
    'REGISTRATION_OPEN',
    'UPCOMING',
    'LIVE',
    'ENDED',
    'ARCHIVED'
);

CREATE TYPE score_event_type AS ENUM (
    'CHALLENGE_SOLVE',
    'HINT_PURCHASE',
    'FIRST_BLOOD',
    'ADMIN_ADJUSTMENT',
    'BONUS',
    'PENALTY'
);

CREATE TYPE announcement_severity AS ENUM (
    'INFO',
    'SUCCESS',
    'WARNING',
    'CRITICAL'
);

CREATE TYPE network_protocol AS ENUM (
    'HTTP',
    'HTTPS',
    'TCP',
    'UDP',
    'SSH'
);

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- References auth.users(id) if Supabase Auth is linked
    username VARCHAR(32) NOT NULL UNIQUE,
    display_name VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'PARTICIPANT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT chk_username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,32}$')
);

-- ------------------------------------------------------------------------------
-- 2. TEAMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    slug VARCHAR(64) NOT NULL UNIQUE,
    invite_code VARCHAR(16) NOT NULL UNIQUE,
    captain_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. TEAM MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role team_member_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_user UNIQUE (team_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 4. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    slug VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. CHALLENGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(128) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    difficulty challenge_difficulty NOT NULL DEFAULT 'MEDIUM',
    challenge_type challenge_type NOT NULL DEFAULT 'STATIC',
    base_points INTEGER NOT NULL DEFAULT 500,
    current_points INTEGER NOT NULL DEFAULT 500,
    minimum_points INTEGER NOT NULL DEFAULT 100,
    first_blood_bonus INTEGER NOT NULL DEFAULT 50,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status challenge_status NOT NULL DEFAULT 'DRAFT',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_attempts INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited
    submission_cooldown_seconds INTEGER NOT NULL DEFAULT 0,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    container_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    solves_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_points_validity CHECK (base_points >= minimum_points AND minimum_points >= 0)
);

-- ------------------------------------------------------------------------------
-- 6. CHALLENGE FLAGS (ISOLATED & HASHED - NEVER EXPOSED CLIENT-SIDE)
-- ------------------------------------------------------------------------------
CREATE TABLE challenge_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    flag_hash VARCHAR(128) NOT NULL, -- Keyed HMAC-SHA256
    is_case_sensitive BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. CHALLENGE HINTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE challenge_hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    cost INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cost_positive CHECK (cost >= 0)
);

-- ------------------------------------------------------------------------------
-- 8. HINT UNLOCKS (ATOMIC PURCHASE RECORD)
-- ------------------------------------------------------------------------------
CREATE TABLE hint_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hint_id UUID NOT NULL REFERENCES challenge_hints(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    cost INTEGER NOT NULL DEFAULT 0,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_hint UNIQUE (team_id, hint_id)
);

-- ------------------------------------------------------------------------------
-- 9. CHALLENGE FILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE challenge_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    checksum_sha256 VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. CHALLENGE TARGETS (LIVE DOCKER ENVIRONMENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE challenge_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL UNIQUE REFERENCES challenges(id) ON DELETE CASCADE,
    target_url TEXT,
    target_host VARCHAR(255),
    target_port INTEGER,
    protocol network_protocol NOT NULL DEFAULT 'HTTP',
    container_image VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. SUBMISSIONS TABLE (ANTI-CHEAT AUDIT TRAIL)
-- ------------------------------------------------------------------------------
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash VARCHAR(64) NOT NULL,
    user_agent_hash VARCHAR(64) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 12. SOLVES TABLE (CONFIRMED SOLVES WITH RACE-CONDITION SAFE UNIQUE CONSTRAINT)
-- ------------------------------------------------------------------------------
CREATE TABLE solves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    is_first_blood BOOLEAN NOT NULL DEFAULT FALSE,
    solved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_challenge_solve UNIQUE (team_id, challenge_id)
);

-- ------------------------------------------------------------------------------
-- 13. SCORE EVENTS (IMMUTABLE SCORE TRANSACTION LEDGER)
-- ------------------------------------------------------------------------------
CREATE TABLE score_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_type score_event_type NOT NULL,
    points INTEGER NOT NULL,
    challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
    hint_id UUID REFERENCES challenge_hints(id) ON DELETE SET NULL,
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------------------
-- 14. ANNOUNCEMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    severity announcement_severity NOT NULL DEFAULT 'INFO',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 15. BADGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_name VARCHAR(64) NOT NULL DEFAULT 'Award',
    criteria_type VARCHAR(64) NOT NULL,
    criteria_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 16. TEAM BADGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE team_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_badge UNIQUE (team_id, badge_id)
);

-- ------------------------------------------------------------------------------
-- 17. COMPETITION SETTINGS TABLE (SINGLETON CONFIGURATION ROW)
-- ------------------------------------------------------------------------------
CREATE TABLE competition_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    ctf_name VARCHAR(128) NOT NULL DEFAULT 'Cyber Crew CTF 2026',
    description TEXT NOT NULL DEFAULT 'Official Capture The Flag Competition Platform for Cyber Crew Club.',
    logo_url TEXT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT '2026-10-15T09:00:00Z',
    end_date TIMESTAMPTZ NOT NULL DEFAULT '2026-10-17T21:00:00Z',
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    state event_state NOT NULL DEFAULT 'LIVE',
    registration_open BOOLEAN NOT NULL DEFAULT TRUE,
    max_team_size INTEGER NOT NULL DEFAULT 4,
    min_team_size INTEGER NOT NULL DEFAULT 1,
    allow_negative_scores BOOLEAN NOT NULL DEFAULT FALSE,
    dynamic_scoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    first_blood_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    hints_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    scoreboard_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    freeze_time TIMESTAMPTZ,
    submission_rate_limit INTEGER NOT NULL DEFAULT 10,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_singleton_row CHECK (id = 1)
);

-- ------------------------------------------------------------------------------
-- 18. AUDIT LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
