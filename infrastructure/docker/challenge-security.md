# Docker Challenge Isolation & Security Specification

> **Critical Guideline from Prompt Section 74 & 75:**  
> The public web application and vulnerable challenge containers must NOT share an unrestricted trust boundary.  
> Under NO circumstances should the public backend be given unrestricted Docker socket access (`/var/run/docker.sock`).

---

## 1. Network Segmentation Architecture

```text
       INTERNET
          |
          v
   Reverse Proxy (443)
          |
  [ctf-platform-net]
          |
   +------+------+
   |             |
Frontend      Backend
                 |
          Supabase DB / Auth
          (Private Network)

  ======================================================
  ISOLATION BOUNDARY (No Shared Socket / Isolated Bridge)
  ======================================================

  [ctf-challenge-net]
          |
   +------+------+------+
   |             |      |
 Web-01        Pwn-01 Linux-01
 (Port 8081)  (1337)  (2222)
```

1. **Dedicated Network**: All challenge containers attach exclusively to `cybercrew-isolated-challenge-net` (`bridge` driver).
2. **Platform Separation**: Challenge containers CANNOT resolve or communicate with internal backend API containers (`backend:4000`), Supabase databases, or Redis caches.
3. **No Direct Daemon Socket**: Public web platform containers never mount `/var/run/docker.sock`. Live challenges run as independent isolated services.

---

## 2. Kernel Containment & Resource Limits

Every challenge container in `docker-compose.challenges.yml` enforces strict cgroups controls:

| Security Control | Parameter | Purpose |
| :--- | :--- | :--- |
| **CPU Quota** | `cpus: 0.5` | Prevents CPU starvation and crypto-mining |
| **Memory Limit** | `mem_limit: 256m` | Prevents kernel OOM crashes from heap exploits |
| **Swap Limit** | `memswap_limit: 256m` | Disallows excessive disk swap abuse |
| **Process Capping** | `pids_limit: 100` | Defends against fork-bomb attacks (`:(){ :|:& };:`) |
| **Capability Dropping** | `cap_drop: [ALL]` | Strips raw sockets, sys_admin, ptrace, and chown |
| **Privilege Escalation** | `no-new-privileges:true` | Blocks SUID binary privilege escalation inside containers |
| **Read-Only Root FS** | `read_only: true` | Prevents rootkit persistence and defacement |
| **Isolated Temp FS** | `tmpfs: /tmp:rw,noexec,nosuid` | Disallows running binary payloads directly out of `/tmp` |

---

## 3. Non-Root Execution Rules

1. All challenge Dockerfiles must create and execute as an unprivileged user:
   ```dockerfile
   RUN addgroup -S ctf && adduser -S ctf -G ctf
   USER ctf
   ```
2. Binaries must never run as `UID 0` unless the specific challenge explicitly tests kernel capability inheritance (e.g. `linux-privesc-01`).

---

## 4. Flag Placement Standards

1. Flags in containers are placed in `/flag.txt` or `/flag`:
   ```bash
   chmod 444 /flag.txt
   chown root:root /flag.txt
   ```
2. Challenge flags deployed into local containers must use clearly marked development strings (`CCCTF{development_only_example_*}`).
3. Production flags are provisioned via environment variables or volume injection at deployment time, strictly isolated from public Git repositories.
