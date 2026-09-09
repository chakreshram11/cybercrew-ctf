-- ==============================================================================
-- Cyber Crew CTF - Migration 004: Development Seed Data
-- Populates initial categories, default competition settings, badges, and demo challenges.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COMPETITION SETTINGS (SINGLETON ROW)
-- ------------------------------------------------------------------------------
INSERT INTO competition_settings (
    id,
    ctf_name,
    description,
    start_date,
    end_date,
    timezone,
    state,
    registration_open,
    max_team_size,
    min_team_size,
    allow_negative_scores,
    dynamic_scoring_enabled,
    first_blood_enabled,
    hints_enabled,
    scoreboard_frozen,
    submission_rate_limit,
    maintenance_mode
) VALUES (
    1,
    'Cyber Crew CTF 2026',
    'Official Capture The Flag Competition Platform for Cyber Crew Club.',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '14 days',
    'UTC',
    'LIVE',
    TRUE,
    4,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    10,
    FALSE
) ON CONFLICT (id) DO UPDATE SET
    state = EXCLUDED.state,
    ctf_name = EXCLUDED.ctf_name;

-- ------------------------------------------------------------------------------
-- 2. CATEGORIES (ALL 13 OFFICIAL DISCIPLINES)
-- ------------------------------------------------------------------------------
INSERT INTO categories (id, name, slug, description, display_order, is_active) VALUES
('11111111-1111-1111-1111-111111111101', 'Web Exploitation', 'web', 'SQLi, XSS, CSRF, SSRF, IDOR, deserialization, auth bypass and web protocol exploitation.', 1, TRUE),
('11111111-1111-1111-1111-111111111102', 'Cryptography', 'crypto', 'Classical ciphers, RSA, elliptic curves, discrete logs, side-channel analysis and lattice reductions.', 2, TRUE),
('11111111-1111-1111-1111-111111111103', 'Forensics', 'forensics', 'PCAP network analysis, memory dumps, disk artifacts, file carving, steganography and logs.', 3, TRUE),
('11111111-1111-1111-1111-111111111104', 'OSINT', 'osint', 'Open-source intelligence, satellite imagery analysis, metadata inspection, and reconnaissance.', 4, TRUE),
('11111111-1111-1111-1111-111111111105', 'Networking', 'networking', 'BGP hijacking, packet injection, routing protocol manipulation, and raw sockets.', 5, TRUE),
('11111111-1111-1111-1111-111111111106', 'Linux Internals', 'linux', 'Kernel privileges, capability abuse, systemd exploitation, and container breakouts.', 6, TRUE),
('11111111-1111-1111-1111-111111111107', 'Windows Internals', 'windows', 'Active Directory, DPAPI, Kerberoasting, token manipulation, and registry forensics.', 7, TRUE),
('11111111-1111-1111-1111-111111111108', 'Reverse Engineering', 'reverse', 'ELF & PE disassembly, Ghidra decompilation, malware analysis, and unpackers.', 8, TRUE),
('11111111-1111-1111-1111-111111111109', 'Binary Exploitation (Pwn)', 'pwn', 'Buffer overflows, ROP chains, format strings, heap spraying, and shellcoding.', 9, TRUE),
('11111111-1111-1111-1111-111111111110', 'Mobile Security', 'mobile', 'Android APK decompilation, Frida hooking, iOS secure enclaves, and deeplinks.', 10, TRUE),
('11111111-1111-1111-1111-111111111111', 'Cloud Security', 'cloud', 'AWS IAM privilege escalation, S3 exfiltration, GCP metadata abuse, and Azure PIM.', 11, TRUE),
('11111111-1111-1111-1111-111111111112', 'AI & LLM Security', 'ai-security', 'Prompt injection, indirect poisoning, model extraction, and jailbreak engineering.', 12, TRUE),
('11111111-1111-1111-1111-111111111113', 'Miscellaneous', 'misc', 'Esoteric programming languages, hardware hacking, puzzle solving, and radio frequencies.', 13, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. BADGES
-- ------------------------------------------------------------------------------
INSERT INTO badges (name, description, icon_name, criteria_type, criteria_value) VALUES
('First Blood', 'Awarded to the pioneer squad that scores the very first solve on any challenge.', 'Flame', 'FIRST_BLOOD', '{"count": 1}'),
('Web Hunter', 'Solved 3 or more Web Exploitation challenges.', 'Globe', 'CATEGORY_SOLVES', '{"category": "web", "count": 3}'),
('Crypto Master', 'Decrypted 3 or more Cryptography challenges.', 'Lock', 'CATEGORY_SOLVES', '{"category": "crypto", "count": 3}'),
('Forensics Expert', 'Carved artifacts from 3 or more Forensics challenges.', 'Search', 'CATEGORY_SOLVES', '{"category": "forensics", "count": 3}'),
('Binary Destroyer', 'Exploited 3 or more Pwn or Reverse Engineering challenges.', 'Cpu', 'CATEGORY_SOLVES', '{"category": "pwn", "count": 3}'),
('Top 10 Operatives', 'Achieved a top 10 ranking on the official scoreboard.', 'Award', 'SCOREBOARD_RANK', '{"max_rank": 10}'),
('Challenge Crusher', 'Solved at least 10 challenges across all disciplines.', 'Trophy', 'TOTAL_SOLVES', '{"count": 10}')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. DEMO CHALLENGES (DEVELOPMENT ONLY - CLEARLY LABELED DEV FLAGS)
-- ------------------------------------------------------------------------------
-- Challenge 1: SQL Nightmare (Web)
INSERT INTO challenges (
    id,
    category_id,
    name,
    slug,
    description,
    difficulty,
    challenge_type,
    base_points,
    current_points,
    minimum_points,
    first_blood_bonus,
    status,
    is_published,
    is_active
) VALUES (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'SQL Nightmare',
    'sql-nightmare',
    E'Our intelligence division intercepted an internal military database query portal.\n\nThe developers claim prepared statements were implemented, but unusual authentication bypasses have been detected in the authentication gateway.\n\nExtract the administrative security token from the database.\n\nTarget URL: `https://web01.ctf.cybercrew.online`',
    'EASY',
    'WEB',
    500,
    500,
    100,
    50,
    'ACTIVE',
    TRUE,
    TRUE
) ON CONFLICT (slug) DO NOTHING;

-- Flag for Challenge 1 (CCCTF{development_only_example_sql})
-- HMAC-SHA256 using default dev salt 'cybercrew-default-salt-value-for-dev-32chars'
INSERT INTO challenge_flags (challenge_id, flag_hash, is_case_sensitive) VALUES (
    '22222222-2222-2222-2222-222222222201',
    encode(hmac('CCCTF{development_only_example_sql}', 'cybercrew-default-salt-value-for-dev-32chars', 'sha256'), 'hex'),
    TRUE
) ON CONFLICT DO NOTHING;

-- Hints for Challenge 1
INSERT INTO challenge_hints (challenge_id, title, content, cost, display_order, is_active) VALUES
('22222222-2222-2222-2222-222222222201', 'Start Here', 'Inspect the HTTP request headers sent by the login form. Is there a custom header being passed to the query?', 25, 1, TRUE),
('22222222-2222-2222-2222-222222222201', 'Think About Input', 'The search query parameter is concatenated directly into an ORDER BY clause. How can you extract data with boolean-based inference?', 50, 2, TRUE),
('22222222-2222-2222-2222-222222222201', 'Vulnerability', 'Use a conditional sleep or error expression: `(CASE WHEN (SELECT 1)=1 THEN pg_sleep(2) ELSE pg_sleep(0) END)`.', 100, 3, TRUE)
ON CONFLICT DO NOTHING;

-- Live target for Challenge 1
INSERT INTO challenge_targets (challenge_id, target_url, protocol) VALUES (
    '22222222-2222-2222-2222-222222222201',
    'https://web01.ctf.cybercrew.online',
    'HTTPS'
) ON CONFLICT (challenge_id) DO NOTHING;

-- Challenge 2: Broken RSA (Crypto)
INSERT INTO challenges (
    id,
    category_id,
    name,
    slug,
    description,
    difficulty,
    challenge_type,
    base_points,
    current_points,
    minimum_points,
    first_blood_bonus,
    status,
    is_published,
    is_active
) VALUES (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111102',
    'Broken RSA',
    'broken-rsa',
    E'A rookie operative generated RSA keys with very close primes p and q to save entropy.\n\nGiven the public modulus N and encryption exponent e = 65537, factorize N and decrypt the flag.\n\nAttached Artifact: `rsa_public_key.pem`',
    'MEDIUM',
    'CRYPTO',
    500,
    500,
    150,
    50,
    'ACTIVE',
    TRUE,
    TRUE
) ON CONFLICT (slug) DO NOTHING;

-- Flag for Challenge 2 (CCCTF{development_only_example_rsa})
INSERT INTO challenge_flags (challenge_id, flag_hash, is_case_sensitive) VALUES (
    '22222222-2222-2222-2222-222222222202',
    encode(hmac('CCCTF{development_only_example_rsa}', 'cybercrew-default-salt-value-for-dev-32chars', 'sha256'), 'hex'),
    TRUE
) ON CONFLICT DO NOTHING;

-- Hints for Challenge 2
INSERT INTO challenge_hints (challenge_id, title, content, cost, display_order, is_active) VALUES
('22222222-2222-2222-2222-222222222202', 'Factorization Technique', 'When prime factors p and q are close to each other, Fermat''s factorization method can factorize N in near instantaneous time.', 50, 1, TRUE)
ON CONFLICT DO NOTHING;

-- Challenge 3: Memory Breach (Forensics)
INSERT INTO challenges (
    id,
    category_id,
    name,
    slug,
    description,
    difficulty,
    challenge_type,
    base_points,
    current_points,
    minimum_points,
    first_blood_bonus,
    status,
    is_published,
    is_active
) VALUES (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'Memory Breach',
    'memory-breach',
    E'We captured a memory dump from a compromised workstation suspected of running an in-memory Cobalt Strike beacon.\n\nIdentify the process ID of the hollowed process and locate the injected C2 payload configuration string.',
    'HARD',
    'FORENSICS',
    500,
    500,
    200,
    50,
    'ACTIVE',
    TRUE,
    TRUE
) ON CONFLICT (slug) DO NOTHING;

-- Flag for Challenge 3 (CCCTF{development_only_example_memory})
INSERT INTO challenge_flags (challenge_id, flag_hash, is_case_sensitive) VALUES (
    '22222222-2222-2222-2222-222222222203',
    encode(hmac('CCCTF{development_only_example_memory}', 'cybercrew-default-salt-value-for-dev-32chars', 'sha256'), 'hex'),
    TRUE
) ON CONFLICT DO NOTHING;

-- Challenge 4: Buffer Overflow 101 (Pwn)
INSERT INTO challenges (
    id,
    category_id,
    name,
    slug,
    description,
    difficulty,
    challenge_type,
    base_points,
    current_points,
    minimum_points,
    first_blood_bonus,
    status,
    is_published,
    is_active
) VALUES (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111109',
    'Buffer Overflow 101',
    'bof-101',
    E'A classic 64-bit Linux ELF binary with disabled stack canaries and an executable stack.\n\nConnect to the challenge target, overwrite the instruction pointer, and spawn a remote interactive shell.\n\nConnect: `nc pwn01.ctf.cybercrew.online 1337`',
    'MEDIUM',
    'PWN',
    500,
    500,
    150,
    50,
    'ACTIVE',
    TRUE,
    TRUE
) ON CONFLICT (slug) DO NOTHING;

-- Flag for Challenge 4 (CCCTF{development_only_example_bof})
INSERT INTO challenge_flags (challenge_id, flag_hash, is_case_sensitive) VALUES (
    '22222222-2222-2222-2222-222222222204',
    encode(hmac('CCCTF{development_only_example_bof}', 'cybercrew-default-salt-value-for-dev-32chars', 'sha256'), 'hex'),
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO challenge_targets (challenge_id, target_host, target_port, protocol) VALUES (
    '22222222-2222-2222-2222-222222222204',
    'pwn01.ctf.cybercrew.online',
    1337,
    'TCP'
) ON CONFLICT (challenge_id) DO NOTHING;
