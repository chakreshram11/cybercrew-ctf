# Role-Based Access Control (RBAC) & Authorization

## 1. Operative Roles Hierarchy (Section 8 & 62)

```text
SUPER_ADMIN
    │ (Bypasses all authorization boundaries; global administrative access)
    ▼
  ADMIN
    │ (Manages users, teams, challenges, categories, scoring, announcements)
    ▼
CHALLENGE_AUTHOR / MODERATOR
    │ (Authors and manages assigned challenges, hints, and file attachments)
    ▼
TEAM_CAPTAIN
    │ (Manages squad roster, regenerates invite codes, transfers captaincy)
    ▼
PARTICIPANT
      (Standard competition competitor; solves challenges, unlocks hints)
```

---

## 2. Server-Side Enforcement (Section 6)
Authorization gates are strictly enforced at the API controller and service layers via NestJS guards:
1. `JwtAuthGuard`: Establishes verified operative identity and rejects suspended (`is_active = false`) accounts.
2. `RolesGuard`: Inspects the `@Roles(...)` metadata on route handlers. If the operative's role is not within the specified list (and is not `SUPER_ADMIN`), the request is rejected with HTTP 403 Forbidden.

---

## 3. Privilege Escalation Prevention (Section 54)
- An `ADMIN` cannot assign the `SUPER_ADMIN` role to themselves or any other operative. Only an existing `SUPER_ADMIN` can grant `SUPER_ADMIN`.
- Administrators cannot suspend their own active accounts.
- Operatives cannot alter their own roles via `PATCH /users/me`.
