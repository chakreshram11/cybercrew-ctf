# Platform Security Architecture

## 1. Zero-Trust Frontend Boundary
The frontend application is treated as a completely untrusted public client. The browser interface:
- Never receives plaintext flags or cryptographic flag hashes.
- Never performs local score calculation or awards points.
- Never decides whether an operative is authorized to view hints without backend confirmation.
- Stores only short-lived session tokens in browser storage.

---

## 2. Cryptographic Flag Protection (Section 21)
All flags stored in `challenge_flags` are transformed using keyed **HMAC-SHA256**:
```typescript
const hash = crypto.createHmac('sha256', process.env.FLAG_SECRET_SALT)
  .update(submittedFlag.trim())
  .digest('hex');
```

When validating flags, the backend uses `crypto.timingSafeEqual` over fixed-length binary buffers. This completely eliminates side-channel timing attacks that could otherwise leak flag lengths or characters.

---

## 3. Anti-Cheat & Forensic Telemetry (Section 64)
To ensure fair competition without invasive participant tracking:
- Every submission records a one-way SHA-256 hash of the client IP address and User-Agent header.
- Submissions track timestamps to analyze rapid automated bursts and brute-force attempts.
- Suspicious clusters of submissions across different teams with identical IP hashes are flagged for review in the administrative audit log.

---

## 4. Rate Limiting & Cooldown Protection (Section 65)
The platform enforces multiple defensive tiers:
1. **Global Throttling**: Managed via NestJS `ThrottlerModule` (default: 60 requests per minute).
2. **Flag Submission Cooldowns**: Challenges can configure `submission_cooldown_seconds` (e.g. 5–30s) enforcing a mandatory pause between attempts.
3. **Attempt Limiting**: Challenges can enforce `max_attempts` (e.g. 10 attempts), after which subsequent submissions are permanently blocked.

---

## 5. Secret Protection Guidelines (Section 7)
- `SUPABASE_SERVICE_ROLE_KEY`, database connection strings, and `FLAG_SECRET_SALT` must only ever exist in backend server environment variables.
- Client-side Vite environment variables are restricted to `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and public API endpoints.
- Error filters strip all internal database errors and stack traces before responding to clients.
