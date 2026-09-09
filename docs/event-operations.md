# Event Operations Runbook (Sections 97, 98, 99)

## 1. Pre-Event Operations Checklist (T-48h to T-0)
- [ ] **Infrastructure Health**: Verify `/health` probe returns 200 OK.
- [ ] **Database Connection Pool**: Verify Supabase transaction poolers are responding with low latency.
- [ ] **Challenge Runtimes**: Launch sandboxed challenge containers (`docker compose -f infrastructure/docker/docker-compose.challenges.yml up -d`).
- [ ] **Challenge Verification**: Ensure author solve scripts verify all deployed challenge flags.
- [ ] **Rate Limiting**: Confirm global and submission throttlers are active.
- [ ] **Registration State**: Set `state = 'REGISTRATION_OPEN'` in `/admin/settings`.
- [ ] **Announcements**: Dispatch welcome briefing on `/admin/announcements`.

---

## 2. Live Competition Operations (T-0 to T+48h)
- **Commence Competition**: Set `state = 'LIVE'` via `/admin/settings`.
- **Real-Time Monitoring**:
  - Monitor submission failure rates in `/admin/submissions`.
  - Check error logs via `docker compose logs -f backend`.
  - Watch for sudden spikes in identical IP hashes across squads.
- **Scoreboard Management**:
  - If a scoreboard freeze is configured (e.g. final 2 hours of CTF), enable `scoreboard_frozen = true` in `/admin/settings`.
  - Administrators will continue seeing un-frozen live scores; public users see scores frozen at the freeze timestamp.

---

## 3. Post-Event Operations (T+48h onwards)
1. **Halt Submissions**: Set `state = 'ENDED'` in `/admin/settings`. This permanently blocks flag submissions and hint unlocks for participants.
2. **Unfreeze Scoreboard**: Reveal final validated podium standings.
3. **Audit Disputed Solves**: Review flagged submissions or score arbitration events in `/admin/audit-logs`.
4. **Database Backup**:
   ```bash
   pg_dump "$DATABASE_URL" -F c -b -v -f "backups/cybercrew_ctf_final_$(date +%F).dump"
   ```
5. **Archive Event**: Set `state = 'ARCHIVED'`.
