# Database Architecture & Entity Specifications

## 1. Relational Model Overview
The Cyber Crew CTF database is a normalized PostgreSQL database hosted via Supabase. It comprises 18 dedicated tables maintaining transactional integrity across users, squads, scenarios, submissions, and the immutable score ledger.

---

## 2. Table Catalog

| Table | Description | Primary Key | Key Constraints |
| :--- | :--- | :--- | :--- |
| `users` | Operative profile and role mapping | `id (UUID)` | `UNIQUE(username)`, `UNIQUE(email)`, `chk_username_format` |
| `teams` | Squad records and aggregated scores | `id (UUID)` | `UNIQUE(name)`, `UNIQUE(slug)`, `UNIQUE(invite_code)` |
| `team_members` | Squad roster membership | `id (UUID)` | `UNIQUE(team_id, user_id)` |
| `categories` | Challenge categories / disciplines | `id (UUID)` | `UNIQUE(name)`, `UNIQUE(slug)` |
| `challenges` | Scenario metadata and parameters | `id (UUID)` | `UNIQUE(slug)`, `chk_points_validity` |
| `challenge_flags` | Keyed HMAC-SHA256 blind flag hashes | `id (UUID)` | Foreign Key `challenges(id)` |
| `challenge_hints` | Progressive intelligence hints | `id (UUID)` | `chk_cost_positive` |
| `hint_unlocks` | Atomic squad hint unlock records | `id (UUID)` | `UNIQUE(team_id, hint_id)` |
| `challenge_files` | Artifact storage metadata | `id (UUID)` | Foreign Key `challenges(id)` |
| `challenge_targets` | Live container target endpoints | `id (UUID)` | `UNIQUE(challenge_id)` |
| `submissions` | Anti-cheat submission audit trail | `id (UUID)` | Foreign Key `challenges(id)`, `teams(id)` |
| `solves` | Confirmed challenge solves | `id (UUID)` | `UNIQUE(team_id, challenge_id)` |
| `score_events` | Immutable score transaction ledger | `id (UUID)` | Foreign Key `teams(id)` |
| `announcements` | System broadcasts and alerts | `id (UUID)` | Severity Enum Check |
| `badges` | Achievement badge criteria rules | `id (UUID)` | `UNIQUE(name)` |
| `team_badges` | Squad badge award records | `id (UUID)` | `UNIQUE(team_id, badge_id)` |
| `competition_settings`| Singleton event configuration row | `id (INT = 1)`| `chk_singleton_row` |
| `audit_logs` | Administrative audit trail | `id (UUID)` | Foreign Key `users(id)` |

---

## 3. Critical Integrity Constraints

### 3.1 Duplicate Solve Race Condition Barrier (`solves`)
```sql
CONSTRAINT uq_team_challenge_solve UNIQUE (team_id, challenge_id)
```
Prevents concurrent submissions from a team double-scoring or acquiring duplicate solve records.

### 3.2 Double-Deduction Barrier (`hint_unlocks`)
```sql
CONSTRAINT uq_team_hint UNIQUE (team_id, hint_id)
```
Guarantees that a squad is charged exactly once for a hint regardless of how many operatives access it.

---

## 4. Score Ledger (`score_events`)
Team scores are never stored as arbitrary mutable numbers alone. Every point alteration creates an immutable row in `score_events`:
- `CHALLENGE_SOLVE`: Points awarded for solving a scenario.
- `FIRST_BLOOD`: Bonus points awarded to the first solving team.
- `HINT_PURCHASE`: Negative points deducted for unlocking intelligence hints.
- `ADMIN_ADJUSTMENT`: Audited score adjustment committed by competition administrators.
- `BONUS` / `PENALTY`: Discretionary tournament awards or rule violation deductions.
