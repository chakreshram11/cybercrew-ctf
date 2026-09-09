# CYBER CREW CTF PLATFORM — QA & SECURITY AUDIT PLAN

**Target Platform**: Cyber Crew CTF Platform (`https://ctf.cybercrew.online`)  
**Audit Date**: September 2026  
**Auditor Lead**: Cyber Crew Club DevSecOps & QA Engineering Team  
**Scope**: Full-Stack Architecture, REST API, Database Integrity, CTF Engine, Realtime WebSockets, Container Sandboxing, and Security Controls  

---

## 1. Executive Testing Scope

This document details the comprehensive, multi-phase Quality Assurance (QA), Performance, and Cybersecurity audit plan for the Cyber Crew CTF platform. The objective is to validate real-world readiness, eliminate security flaws, prevent race conditions, guarantee score ledger immutability, and ensure responsive accessibility across all competitor and administrator touchpoints.

### Scope Matrix
1. **Frontend Application**: React 18 SPA, Vite, Tailwind CSS, TanStack Query, React Hook Form, Lucide React.
2. **Backend Engine**: NestJS 10, TypeScript 5, Express, Helmet, Throttler, Global Guards & Filters.
3. **Database Layer**: Supabase PostgreSQL 15, Row Level Security (RLS), 18 Normalized Tables, Constraints & Indexes.
4. **Authentication & Identity**: Supabase Auth (GoTrue), Session JWTs, Server-Side RBAC (6 Roles).
5. **CTF Game Logic**: Flag verification (HMAC-SHA256, `timingSafeEqual`), Dynamic Point Decay, First Blood race protection, Atomic Hint deductions, Score Ledger.
6. **Object Storage**: Supabase Storage (`challenge-files`, `avatars`), Signed URL authorization, MIME & extension allowlists.
7. **Realtime Engine**: Supabase Realtime WebSocket changes on `solves`, `score_events`, `announcements`.
8. **Container Sandboxing**: Docker Compose challenge blueprints, bridge network isolation, cgroups quotas, capability drops.

---

## 2. Target Environments & Test Infrastructure

| Component | Target URL / Address | Host / Port | Environment |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | `http://localhost:5173` | Localhost:5173 | Development / Staging |
| **Backend REST API** | `http://localhost:4000/api/v1` | Localhost:4000 | Development / Staging |
| **API Documentation**| `http://localhost:4000/docs` | Localhost:4000 | Development (Swagger) |
| **Health Probe** | `http://localhost:4000/health` | Localhost:4000 | Operational Probe |
| **PostgreSQL DB** | `aws-0-ap-south-1.pooler.supabase.com` | Port 6543 / 5432 | Supabase Managed Postgres |
| **Supabase Auth** | `https://jwkmwvtvhyptfagdwcus.supabase.co` | HTTPS | Supabase Auth Managed |
| **Challenge Labs** | `http://localhost:8081` (Web), `localhost:1337` (Pwn) | Bridge Net | Sandboxed Docker Runtimes |

---

## 3. Test Personas & Accounts Matrix

| Role | Email Identifier | Callsign | Default Password | Verification Scope |
| :--- | :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | `chakreshram11@gmail.com` | `chakresh` | `Chakreshram@152852` | Global administrative control, role assignment, score arbitration |
| **`ADMIN`** | `test_admin@cybercrew.online` | `test_adm` | `TestPass123!` | Challenge authoring, submissions auditing, team management |
| **`CHALLENGE_AUTHOR`**| `test_author@cybercrew.online`| `test_auth`| `TestPass123!` | Scenario publishing, hint creation, file attachment |
| **`MODERATOR`** | `test_moderator@cybercrew.online` | `test_mod`| `TestPass123!` | Read-only submissions telemetry, participant audit |
| **`TEAM_CAPTAIN`** | `chakreshram05@gmail.com` | `gagnesh` | `Chakreshram@152852` | Squad roster management, invite rotation, captain transfer |
| **`PARTICIPANT`** | `test_participant@cybercrew.online` | `test_part`| `TestPass123!` | Standard competition competitor, flag submission, hint unlock |

---

## 4. Test Data & Challenge Catalog

### Active Scenarios for Testing
1. **Caesars Secret** (`caesars-secret`): Cryptography (Easy, 500 Base, 100 Min, 50 First Blood)
   - Flag: `CCCTF{caesar_cipher}`
2. **Broken RSA** (`broken-rsa`): Cryptography (Medium, 500 Base, 150 Min, 50 First Blood)
   - Flag: `CCCTF{development_only_example_rsa}`
   - Artifact: `rsa_public_key.pem`
3. **SQL Nightmare** (`sql-nightmare`): Web Exploitation (Easy, 500 Base, 100 Min, 50 First Blood)
   - Flag: `CCCTF{development_only_example_sql}`
   - Target: `https://web01.ctf.cybercrew.online`
4. **Buffer Overflow 101** (`bof-101`): Binary Exploitation (Medium, 500 Base, 150 Min, 50 First Blood)
   - Flag: `CCCTF{development_only_example_bof}`
   - Target: `nc pwn01.ctf.cybercrew.online 1337`
5. **Memory Breach** (`memory-breach`): Forensics (Hard, 500 Base, 200 Min, 50 First Blood)
   - Flag: `CCCTF{development_only_example_memory}`

---

## 5. Multi-Disciplinary Test Strategies

### 5.1 UI/UX & Responsive Testing Strategy
- **Public Surface**: Navigation, Hero landing, Rules, Announcements, Leaderboard, Challenge Arena, Profile, Auth.
- **Admin Surface**: Dashboard telemetry, Scenario editor, User RBAC directory, Squad arbitration, Submissions log.
- **Breakpoints**: 320px (Mobile S), 375px (iPhone SE), 390px (iPhone 13), 768px (iPad), 1024px (Laptop), 1440px (Desktop), 1920px (Full HD).
- **Accessibility**: Keyboard focus rings, Tab navigation, Semantic ARIA labels, Contrast ratios, Screen-reader friendliness.

### 5.2 Functional & CTF Logic Testing Strategy
- End-to-end participant journey: Enrollment -> Login -> Squad creation -> Challenge detail -> Hint unlock -> Flag submission -> Scoreboard reflection.
- Anti-cheat logic: Duplicate solve rejection, Submission cooldown enforcement, Max attempts enforcement, Attempt rate limiting.
- Math validation: Logarithmic/parabolic solve count decay curve, Minimum point clamping, Exact single-recipient First Blood bonus.

### 5.3 API Security & Penetration Testing Strategy
- **Authentication**: JWT validation, token tampering, expired token rejection, session persistence, account suspension enforcement.
- **Authorization & RBAC**: Privilege escalation verification, Participant access to `/admin/*` rejection, Horizontal privilege escalation (IDOR on `/teams/:id`, `/submissions`, `/hints`).
- **Flag Secrecy**: Zero-leakage verification across API payloads, HTML, frontend state, network requests, and database RLS.
- **Input Validation & Injection**: Parameter pollution, XSS in challenge briefings/announcements/callsigns, SQL injection defenses, Malformed JSON envelopes.
- **Atomic Concurrency & Race Safety**: Concurrent submissions from same squad, Simultaneous First Blood attempts across competing squads, Concurrent hint unlocks.

### 5.4 File Storage & Upload Security Strategy
- Challenge artifact download authorization and time-limited signed URL expiration.
- Malicious file upload defenses: Extension allowlist enforcement (`.zip`, `.pcap`, `.pem`, etc.), MIME sniffing defenses, 50MB file size limits, Path traversal sanitization.

### 5.5 Performance & Load Testing Strategy
- High-concurrency benchmark scenarios:
  - Scenario A: 100 concurrent competitors browsing challenges.
  - Scenario B: 100 concurrent competitors viewing live scoreboard.
  - Scenario C: 50 concurrent flag submissions under competition stress.
  - Scenario D: Concurrent hint unlocks.
- Metrics measured: Throughput (RPS), Latency (p50, p90, p95, p99), Error rate (%), CPU / Memory utilization.

---

## 6. Severity Classification Matrix

| Severity | Criteria | Resolution Requirement |
| :--- | :--- | :--- |
| **`CRITICAL`** | Flag leakage, privilege escalation to Super Admin, score ledger forgery, arbitrary code execution, server crash | **Must fix immediately** before continuing |
| **`HIGH`** | Double-scoring race conditions, broken RBAC boundaries, XSS vulnerability, rate limit bypass | **Must fix** prior to declaring audit complete |
| **`MEDIUM`** | Unhandled edge cases, UI data formatting errors, missing input trims, performance degradation under load | Fix if practical; otherwise document clearly |
| **`LOW`** | Cosmetic visual glitches, minor spacing issues, non-breaking console warnings | Fix if trivial; otherwise document |
| **`INFO`** | Architecture observations, operational recommendations, future scalability notes | Document in report |

---

## 7. Acceptance Criteria for Production Readiness
1. Zero CRITICAL and zero unresolved HIGH severity vulnerabilities.
2. 100% automated regression and unit test pass rate across frontend and backend workspaces.
3. Strict TypeScript compilation passes with zero errors on both workspaces (`strict: true`).
4. Production builds compile cleanly for both frontend (`dist/`) and backend (`dist/`).
5. All 14 audit dimensions executed, documented, and verified with real evidence.
