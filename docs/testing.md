# Testing & Quality Assurance Guide (Sections 88 & 89)

## 1. Unit Testing
Unit tests reside alongside source code in `*.spec.ts` files. Run the unit test suite:
```bash
npm run test:backend
```

### Tested Capabilities:
- **Flag Verification**: HMAC-SHA256 blind hashing, timingSafeEqual comparison, collision avoidance.
- **Scoring Formulas**: Static score consistency, logarithmic/parabolic solve count decay, and minimum point clamping.
- **Invite Code Generation**: High-entropy hexadecimal token generation.
- **Anti-Cheat IP Hashing**: One-way deterministic SHA-256 IP anonymization.

---

## 2. Integration & E2E Testing
E2E tests reside in `backend/test/`. Run E2E suites:
```bash
npm run test:e2e
```

---

## 3. Load Testing Strategy (Section 89)
To validate the platform under competition peak conditions (500+ registered operatives, thousands of simultaneous submissions):
- Run load scenarios using k6 or Artillery against `POST /api/v1/challenges/:id/submit` and `GET /api/v1/scoreboard`.
- Target throughput: 100 concurrent requests/sec with `< 200ms` response times.
- Ensure database connection poolers (`pgbouncer`) on port `6543` are configured for high-concurrency connections.
