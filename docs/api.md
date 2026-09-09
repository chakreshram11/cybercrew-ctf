# REST API Specification

All endpoints are prefixed with `/api/v1` (with the exception of `/health` which is root-mounted for container orchestrators).

---

## 1. Response Format Standards (Section 70)

### 1.1 Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-09-08T22:00:00.000Z"
}
```

### 1.2 Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FLAG",
    "message": "Incorrect flag."
  },
  "timestamp": "2026-09-08T22:00:00.000Z",
  "path": "/api/v1/challenges/22222222-2222-2222-2222-222222222201/submit"
}
```

---

## 2. API Endpoints Catalog

### Health Check
- `GET /health` [Public]: Service health probe and uptime telemetry.

### Authentication & Profiles
- `POST /api/v1/auth/sync` [Bearer]: Synchronize authenticated Supabase session with local operative profile.
- `GET /api/v1/users/me` [Bearer]: Retrieve authenticated operative dossier, squad affiliation, and permissions.
- `PATCH /api/v1/users/me` [Bearer]: Update display name and avatar URL.
- `GET /api/v1/users/:id` [Public]: View sanitized public operative profile.

### Squads (Teams)
- `GET /api/v1/teams` [Public]: Directory of all competition squads.
- `POST /api/v1/teams` [Bearer]: Establish a new squad (creator becomes Captain).
- `POST /api/v1/teams/join` [Bearer]: Enlist into squad using cryptographic invite code.
- `GET /api/v1/teams/:slug` [Public]: Retrieve squad profile (invite code masked for non-members).
- `POST /api/v1/teams/:id/regenerate-code` [Bearer - Captain/Admin]: Rotate invitation code.
- `POST /api/v1/teams/:id/transfer-captain` [Bearer - Captain/Admin]: Transfer squad leadership.
- `POST /api/v1/teams/:id/leave` [Bearer]: Leave squad (captains must transfer first).
- `GET /api/v1/teams/:slug/score-history` [Public]: Retrieve squad score ledger events.
- `GET /api/v1/teams/:slug/solves` [Public]: Retrieve squad confirmed solves.

### Categories & Challenges
- `GET /api/v1/categories` [Public]: List active challenge disciplines.
- `GET /api/v1/challenges` [Public]: Catalog of published scenarios (zero flags exposed).
- `GET /api/v1/challenges/:slug` [Public]: Challenge briefing, targets, files, and masked hints.
- `POST /api/v1/challenges/:challengeId/submit` [Bearer]: Submit captured flag.
- `POST /api/v1/challenges/:challengeId/hints/:hintId/unlock` [Bearer]: Unlock hint with atomic point deduction.
- `GET /api/v1/challenges/:challengeId/files` [Public]: List challenge attachments.
- `GET /api/v1/challenges/files/:fileId/download` [Public/Bearer]: Generate signed download URL.

### Scoreboard & Announcements
- `GET /api/v1/scoreboard` [Public]: Official real-time leaderboard (respects freeze rules).
- `GET /api/v1/announcements` [Public]: Public broadcast announcements.
- `GET /api/v1/badges` [Public]: Catalog of achievement badges.
- `GET /api/v1/teams/:teamId/badges` [Public]: Badges earned by a squad.

### Administrative Console (Roles: ADMIN, SUPER_ADMIN)
- `GET /api/v1/admin/stats`: Aggregate command center metrics.
- `GET /api/v1/admin/challenges/:id/analytics`: Scenario submission ratios and solve timeline.
- `GET /api/v1/admin/audit-logs`: Chronological security audit log trail.
- `GET /api/v1/admin/settings`: Competition parameters and state switches.
- `PATCH /api/v1/admin/settings`: Update competition parameters.
- `GET /api/v1/admin/users`: Operative directory with role and status management.
- `PATCH /api/v1/admin/users/:id`: Suspend or reactivate operative account.
- `PATCH /api/v1/admin/users/:id/role`: Reassign security role.
- `GET /api/v1/admin/teams`: Squad management overview.
- `POST /api/v1/admin/teams/:id/adjust-score`: Arbitrate and adjust squad score.
- `GET /api/v1/admin/submissions`: Submission audit log stream.
- `POST /api/v1/admin/challenges`: Create challenge scenario.
- `PATCH /api/v1/admin/challenges/:id`: Update challenge scenario.
- `POST /api/v1/admin/challenges/:id/duplicate`: Clone challenge into DRAFT.
- `DELETE /api/v1/admin/challenges/:id`: Permanently delete challenge scenario.
