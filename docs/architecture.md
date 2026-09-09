# Cyber Crew CTF - System Architecture Specification

## 1. Executive Summary
Cyber Crew CTF is a high-performance, modular Capture The Flag competition platform engineered for Cyber Crew Club. The system operates on a zero-trust frontend paradigm, delegating all scoring, flag verification, rate limiting, and access control to a backend NestJS API integrated with Supabase PostgreSQL and sandboxed Docker runtimes.

---

## 2. High-Level Architecture Topology

```text
                               INTERNET
                                  |
                                  v
                    https://ctf.cybercrew.online
                                  |
                                  v
                      Caddy Edge Reverse Proxy
                      (TLS Termination & CSP)
                                  |
                 +----------------+----------------+
                 |                                 |
                 v                                 v
          React Frontend SPA                 NestJS API (/api/v1)
          (Vite, Tailwind, TanStack)          (REST, OpenAPI Docs)
                                                   |
                             +---------------------+---------------------+
                             |                     |                     |
                             v                     v                     v
                        Supabase Auth       Supabase PostgreSQL        Redis
                        (JWT Tokens)        (Tables, Ledger, RLS)     (Rate Limit)
                                                   |
                                                   v
                                            Supabase Storage
                                            (Private Buckets)

  =============================================================================
               ISOLATED CHALLENGE NETWORK BOUNDARY (No Shared Socket)
  =============================================================================
                                  |
                      Isolated Docker Bridge Host
                     (cybercrew-isolated-challenge-net)
                                  |
                 +----------------+----------------+
                 |                |                |
                 v                v                v
             Web Labs         Pwn Labs        Linux Labs
             (Port 8081)     (Port 1337)      (Port 2222)
```

---

## 3. Core Subsystems

### 3.1 Frontend Single Page Application (`frontend/`)
- **Technology**: React 18, Vite 6, Tailwind CSS 3, TanStack React Query 5, React Router 6, Lucide React.
- **Role**: Render operative and administrative interfaces. Acts strictly as an untrusted client. Does not store flags, calculate points, or enforce authorization gates autonomously.
- **Realtime Layer**: Hooks into Supabase Realtime WebSocket postgres_changes on `solves`, `score_events`, and `announcements` to invalidate query caches automatically.

### 3.2 Backend Core API (`backend/`)
- **Technology**: NestJS 10, TypeScript 5, Express, Helmet, Throttler.
- **Role**: Authoritative competition orchestrator. Verifies JWT sessions, runs timing-safe HMAC-SHA256 flag checks, enforces challenge schedules, administers the immutable score ledger, and logs security audits.

### 3.3 Database & Storage Layer (`infrastructure/supabase/`)
- **Technology**: Supabase PostgreSQL 15, Supabase Storage.
- **Security**: 18 normalized tables with Row Level Security (RLS). `challenge_flags` is completely inaccessible to clients, restricting reads and writes exclusively to the backend service role key.

### 3.4 Challenge Infrastructure (`challenges/` & `infrastructure/docker/`)
- **Technology**: Docker & Docker Compose.
- **Isolation**: Challenges run on `cybercrew-isolated-challenge-net`. Public backend does not mount `/var/run/docker.sock`. Containers execute as unprivileged user `ctf`, drop all capabilities (`cap_drop: [ALL]`), enforce strict cgroups quotas (0.5 CPU, 256MB RAM, 100 PIDs), and run with read-only root filesystems.
