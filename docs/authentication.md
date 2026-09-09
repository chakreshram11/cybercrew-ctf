# Authentication Architecture

## 1. Overview
Cyber Crew CTF delegates core identity management to **Supabase Auth**. This provides secure credential storage, password hashing with bcrypt/argon2, session token issuance, and email confirmation workflows without storing plaintext or custom passwords in application databases.

---

## 2. Authentication Flow

```text
Operative Browser                  Supabase Auth                   NestJS API
      |                                  |                              |
      |--- 1. Login with credentials --->|                              |
      |<-- 2. JWT Session Issued --------|                              |
      |                                                                 |
      |--- 3. API Request (Bearer <JWT>) ------------------------------>|
      |                                                                 |-- 4. Verify JWT
      |                                                                 |-- 5. Query users table
      |                                                                 |-- 6. Check is_active
      |<-- 7. Verified Response ----------------------------------------|
```

1. **Enrollment / Login**: Handled directly between the React client and Supabase Auth using the public anonymous key (`VITE_SUPABASE_ANON_KEY`).
2. **Profile Sync**: Upon registration or initial login, the client calls `POST /api/v1/auth/sync`. The backend verifies the JWT and inserts a corresponding record in `users` with role `PARTICIPANT`.
3. **API Authentication**: The client includes the session token in the `Authorization: Bearer <token>` header for all authenticated requests.
4. **Backend Verification**: `JwtAuthGuard` validates the token against the Supabase Auth API and loads the operative record from `users`. If `is_active = false`, the request is immediately rejected with HTTP 401 Unauthorized.

---

## 3. Password Reset Workflow
- Self-service participant password reset emails via `supabase.auth.resetPasswordForEmail()` are disabled for heightened CTF event security.
- When an operative clicks "Forgot Password" on `/login` or visits `/forgot-password`, a professional "Contact Admin" password-reset UI is presented.
- The UI provides administrative contact details (`VITE_ADMIN_CONTACT_EMAIL`) so participants can request password recovery directly from event administrators.
