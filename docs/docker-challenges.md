# Docker Challenge Sandbox & Deployment (Sections 74, 75, 76)

## 1. Container Sandbox Rules
1. **Unprivileged Execution**: Never run challenge processes as `root`. Create a `ctf` user in the Dockerfile with `UID 1000`.
2. **Read-Only Root Filesystems**: Configure `read_only: true` in compose to prevent participants from leaving backdoors or modifying core system binaries.
3. **Restricted Tmpfs**: Mount `/tmp` as `rw,noexec,nosuid,size=32m` to prevent executing binary payloads directly out of temporary storage.
4. **Stripped Capabilities**: Specify `cap_drop: [ALL]` to eliminate kernel exploitation vectors.

---

## 2. Docker Compose Deployment Pattern
```yaml
services:
  challenge-web:
    build: .
    ports:
      - "8081:8080"
    networks:
      - ctf-challenge-net
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 256m
    cpus: 0.5
    pids_limit: 100
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=32m

networks:
  ctf-challenge-net:
    name: cybercrew-isolated-challenge-net
    driver: bridge
```

---

## 3. Challenge Lifecycle & Health Checks
- Live challenges must include health check directives (`HEALTHCHECK CMD curl -f http://localhost:8080/ || exit 1`).
- Crashed or killed containers must be isolated to prevent cascading failures across the competition host.
