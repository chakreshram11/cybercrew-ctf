# Cyber Crew CTF Platform

> End-to-End Professional Capture The Flag Competition Platform  
> Developed for **Cyber Crew Club** • Production Target Domain: `ctf.cybercrew.online`

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Features](#2-features)
- [3. Architecture](#3-architecture)
- [4. Repository Structure](#4-repository-structure)
- [5. Prerequisites](#5-prerequisites)
- [6. Clone the Repository](#6-clone-the-repository)
- [7. Environment Configuration](#7-environment-configuration)
- [8. Local Development](#8-local-development)
- [9. Docker Development](#9-docker-development)
- [10. Production Deployment — Linux VM](#10-production-deployment--linux-vm)
- [11. Linux VM Initial Setup](#11-linux-vm-initial-setup)
- [12. Clone to Production VM](#12-clone-to-production-vm)
- [13. Configure Production Environment](#13-configure-production-environment)
- [14. Initial Production Deployment](#14-initial-production-deployment)
- [15. Verify Deployment](#15-verify-deployment)
- [16. Production Update Workflow](#16-production-update-workflow)
- [17. Rollback](#17-rollback)
- [18. Backup](#18-backup)
- [19. Tunnel Configuration](#19-tunnel-configuration)
- [20. DNS Configuration](#20-dns-configuration)
- [21. Challenge Deployment](#21-challenge-deployment)
- [22. Security](#22-security)
- [23. Troubleshooting](#23-troubleshooting)
- [24. Production Checklist](#24-production-checklist)
- [25. Development Workflow](#25-development-workflow)
- [26. Important Production Notes](#26-important-production-notes)
- [27. License](#27-license)

---

## 1. Overview

**Cyber Crew CTF** is a modern, modular, production-ready Capture The Flag (CTF) competition platform engineered for cybersecurity competitions, hackathons, and defense drills.

Built with a **zero-trust frontend architecture**, it features dynamic scoring, first-blood bonuses, cryptographically hashed flag verification, atomic hint transactions, comprehensive team management, Docker challenge orchestration blueprints, and an administrative panel.

---

## 2. Features

- **Authentication & RBAC:** Supabase Auth integration supporting `PARTICIPANT`, `TEAM_CAPTAIN`, `ADMIN`, and `SUPER_ADMIN` roles.
- **Team Management:** Squad creation, invitation code generation, captain transfers, member enlistment, and roster management.
- **Challenge Directory:** Multi-category challenges (`web`, `crypto`, `forensics`, `pwn`, `reverse`, `osint`, `linux`, `windows`, `mobile`, `cloud`, `ai-security`, `misc`).
- **Cryptographic Flag Verification:** Server-side HMAC-SHA256 blind hashing for flags to prevent flag leakage if database is exposed.
- **Dynamic & Static Scoring:** Solves-decay dynamic point calculation and fixed static scoring strategies.
- **First Blood Bonuses:** Automated extra points awarded to the first solver of each challenge.
- **Atomic Score Ledger:** Immutable transaction ledger (`score_events`) ensuring zero race conditions or double-scoring.
- **Atomic Hint Purchases:** Deduct points and unlock hints safely through atomic backend transactions.
- **Administrative Command Center:** Dashboard stats, challenge CRUD, user role management, announcement broadcasting, hint creation, and audit logging.
- **Docker Challenge Infrastructure:** Blueprints and Docker Compose configurations for running isolated challenge target containers.
- **Distributed Rate Limiting:** Redis-backed Throttler guards protecting authentication and flag submission endpoints.

---

## 3. Architecture

```text
                               INTERNET
                                  |
                                  v
                       ctf.cybercrew.online
                                  |
                                  v
                       Reverse Proxy (Caddy / TLS)
                                  |
                 +----------------+----------------+
                 |                                 |
                 v                                 v
          React Frontend                     NestJS Backend
          (Nginx Container)                  (Node.js / Express)
                                                   |
                             +---------------------+---------------------+
                             |                     |                     |
                             v                     v                     v
                        Supabase Auth      Supabase PostgreSQL         Redis
                             |                     |                  (Cache &
                             v                     v                   Rate Limit)
                       Supabase Storage     Score Ledger
                             |
                             v
                 Isolated Challenge Network
                 (cybercrew-challenge-net)
```

### Distinction Between Core Platform and Challenge Infrastructure:
- **CORE PLATFORM:** `frontend`, `backend`, `caddy`, and `redis` run inside the primary platform network (`cybercrew-ctf-net`).
- **INTENTIONALLY VULNERABLE CHALLENGE CONTAINERS:** Run inside an isolated docker network (`cybercrew-challenge-net`). Challenge containers have **no access** to Supabase credentials, backend secrets, Redis, or host Docker sockets.

---

## 4. Repository Structure

```text
cybercrew-ctf/
├── frontend/                  # React 18 + TypeScript + Vite + Tailwind CSS SPA
│   ├── src/
│   ├── Dockerfile             # Multi-stage production Nginx image
│   └── nginx.conf             # Production Nginx SPA routing & security headers
├── backend/                   # NestJS API, Supabase Engine, Score Ledger, Swagger
│   ├── src/
│   └── Dockerfile             # Multi-stage Node 20 non-root runner image
├── challenges/                # Challenge definitions, categories, & Dockerfiles
│   ├── web/
│   ├── crypto/
│   ├── forensics/
│   ├── pwn/
│   └── ...
├── deploy/                    # Production Linux VM Deployment System
│   ├── docker-compose.yml     # Server Docker Compose definition
│   ├── deploy.sh              # Zero-downtime deployment script with automated rollback
│   ├── rollback.sh            # Git commit-based application rollback script
│   └── health-check.sh        # Container status & health API verification script
├── infrastructure/            # Reverse proxy & challenge network blueprints
│   ├── caddy/Caddyfile        # Caddy TLS & reverse-proxy routing configuration
│   ├── docker/                # Isolated challenge docker compose configurations
│   └── supabase/migrations/   # Database DDL migrations (001 to 006)
├── docs/                      # Technical, API, security & deployment documentation
├── scripts/                   # Migration, database seeding, backup, & admin scripts
├── tests/                     # Integration, E2E, and security verification tests
├── docker-compose.yml         # Main Docker Compose orchestration
├── docker-compose.dev.yml     # Local developer dependencies (Redis)
├── .env.example               # Safe environment variable configuration template
├── .gitignore                 # Git exclusion rules (prevents secret leaks)
└── README.md                  # Project documentation & deployment guide
```

---

## 5. Prerequisites

### Local Development
- **Git:** `>= 2.30`
- **Node.js:** `>= 20.x` LTS
- **npm:** `>= 10.x`
- **Docker & Docker Compose:** Required if running local Redis or testing container builds.

### Linux VM Deployment
- **Operating System:** Ubuntu 22.04 LTS or Ubuntu 24.04 LTS recommended.
- **System Packages:** `git`, `curl`, `ufw`, `jq`, `ca-certificates`.
- **Docker Engine:** `docker-ce` `>= 24.0`.
- **Docker Compose Plugin:** `docker-compose-plugin` (`docker compose` CLI plugin).
- **Access:** SSH root/sudo access to the Linux host VM.

---

## 6. Clone the Repository

### Local Workstation
```bash
git clone https://github.com/chakreshram11/cybercrew-ctf.git
cd cybercrew-ctf
```

To verify branch state and remote URL:
```bash
git branch
# Output: * main
git remote -v
# Output: origin https://github.com/chakreshram11/cybercrew-ctf.git (fetch & push)
```

### Production Linux VM
On the destination Linux server, clone into `/opt/cybercrew-ctf` (the target path expected by deployment tools):
```bash
cd /opt
sudo git clone https://github.com/chakreshram11/cybercrew-ctf.git
sudo chown -R $USER:$USER /opt/cybercrew-ctf
cd /opt/cybercrew-ctf
```

---

## 7. Environment Configuration

Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
chmod 600 .env
```

> ⚠️ **SECURITY WARNING:** `.env.example` is safe to commit. The `.env` file contains sensitive production keys and **must NEVER be committed** to version control.

### Backend-Only Secrets (Server Side — Never Expose to Frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Administrative Supabase key used for user management and secure RPC.
- `DATABASE_URL`: PostgreSQL connection string (PgBouncer pooler).
- `DIRECT_URL`: Direct PostgreSQL connection string (migration runner).
- `SUPABASE_JWT_SECRET`: Secret key used for authenticating Supabase JWT sessions.
- `FLAG_SECRET_SALT`: Keyed salt for HMAC-SHA256 blind flag hashing (min 32 characters).
- `REDIS_PASSWORD`: Password for production Redis instance.

### Frontend Public Configuration (Bundled into Client Build)
- `VITE_SUPABASE_URL`: Public URL of Supabase project.
- `VITE_SUPABASE_ANON_KEY`: Public anonymous Supabase key (safe for browser).
- `VITE_API_URL`: Backend API endpoint (`/api/v1` in production behind Caddy/Nginx).
- `VITE_APP_NAME`: Application title (`"Cyber Crew CTF"`).
- `VITE_APP_DOMAIN`: Public domain (`https://ctf.cybercrew.online`).

> ⚠️ `VITE_*` variables are embedded into the client JavaScript bundle at build time and **must NEVER contain backend secrets or service-role keys**.

---

## 8. Local Development

### 1. Install Workspace Dependencies
```bash
npm install
```

### 2. Start Local Redis (Optional)
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 3. Start Frontend & Backend Concurrently
```bash
npm run dev
```
- **Frontend URL:** `http://localhost:5173`
- **Backend API URL:** `http://localhost:4000/api/v1`
- **Swagger API Docs:** `http://localhost:4000/docs`

### 4. Run TypeScript Typechecks
```bash
npm run typecheck
```

### 5. Run Unit & Security Test Suites
```bash
# Run NestJS backend unit tests
npm run test --workspace=backend

# Run standalone security & IDOR test suite
node tests/security/invite-code-auth.js
```

### 6. Build Production Bundles Locally
```bash
# Build both frontend and backend
npm run build
```

---

## 9. Docker Development

Validate Docker Compose syntax:
```bash
docker compose config
```

Build and run application services locally:
```bash
docker compose build
docker compose up -d
```

Inspect running container status and logs:
```bash
# View active container status
docker compose ps

# View aggregate container logs
docker compose logs -f

# View backend logs specifically
docker compose logs -f backend
```

Stop and remove local container instances:
```bash
docker compose down
```

---

## 10. Production Deployment — Linux VM

### Workflow Overview
```text
Developer Machine ──> git push origin main ──> GitHub Repository ──> Linux Host VM (deploy/deploy.sh) ──> Docker Compose ──> Health Check ──> Production
```

Deployment is executed directly on the Linux host server via `deploy/deploy.sh`, which manages repository pulling, container image building, atomic container swapping, and automated rollback upon health check failure.

---

## 11. Linux VM Initial Setup

### Step 1 — SSH into Linux Server
```bash
ssh <username>@<VM_PUBLIC_IP>
```

### Step 2 — Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw jq ca-certificates gnupg
```

### Step 3 — Install Docker Engine & Compose Plugin
```bash
# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker daemon and grant user permissions
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Verify installation:
```bash
docker --version
docker compose version
```

### Step 4 — Configure UFW Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
# Allow CTF Challenge Target Ports (e.g. 8001 to 8010 for direct netcat/TCP challenges)
sudo ufw allow 8001:8010/tcp comment 'CTF Challenge Targets'
sudo ufw enable
```

#### Firewall Port Classification:
- **`80/tcp`, `443/tcp`:** Public web traffic routed to Caddy reverse proxy.
- **`22/tcp`:** Secure SSH administration.
- **`8001:8010/tcp`:** Intentionally exposed target ports for CTF web/pwn challenges requiring direct TCP host access.

---

## 12. Clone to Production VM

```bash
cd /opt
sudo git clone https://github.com/chakreshram11/cybercrew-ctf.git
sudo chown -R $USER:$USER /opt/cybercrew-ctf
cd /opt/cybercrew-ctf
```

---

## 13. Configure Production Environment

Create production `.env` and set strict file permissions:
```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Ensure real production values are configured:
```ini
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://ctf.cybercrew.online
CORS_ORIGIN=https://ctf.cybercrew.online

SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-production-service-role-key>
SUPABASE_JWT_SECRET=<your-production-jwt-secret>
DATABASE_URL=postgresql://postgres.<project-id>:<password>@<host>:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-id>:<password>@<host>:5432/postgres

FLAG_SECRET_SALT=<high-entropy-random-salt-min-32-chars>
REDIS_PASSWORD=<high-entropy-redis-password>

VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-production-anon-key>
VITE_API_URL=/api/v1
VITE_APP_NAME="Cyber Crew CTF"
VITE_APP_DOMAIN=https://ctf.cybercrew.online
```

---

## 14. Initial Production Deployment

Run the automated deployment script specifying the target branch:
```bash
bash deploy/deploy.sh main
```

### What `deploy/deploy.sh` Executes:
1. **Pre-flight Checks:** Verifies `git`, `docker`, `docker compose`, and `.env` presence.
2. **Git Update:** Captures current commit SHA (`PREV_COMMIT`) and pulls latest code from `main`.
3. **Container Build:** Builds multi-stage Docker images (`cybercrew-ctf-frontend`, `cybercrew-ctf-backend`).
4. **Service Startup:** Executes `docker compose -f deploy/docker-compose.yml up -d --remove-orphans`.
5. **Stabilization & Health Check:** Pauses 10 seconds and calls `bash deploy/health-check.sh`.
6. **Automated Rollback:** If health checks fail, automatically executes `bash deploy/rollback.sh $PREV_COMMIT` and exits with code 1.

---

## 15. Verify Deployment

Execute the health check script manually:
```bash
bash deploy/health-check.sh
```

Inspect container statuses:
```bash
docker compose -f deploy/docker-compose.yml ps
```

Expected output:
- `cybercrew-ctf-caddy`: Running (Ports `80`, `443`)
- `cybercrew-ctf-backend`: Running (Port `4000` internal)
- `cybercrew-ctf-frontend`: Running (Port `80` internal)
- `cybercrew-ctf-redis`: Running (Port `6379` internal)

> ℹ️ Application deployment and public DNS/tunnel configuration are separate infrastructure steps.

---

## 16. Production Update Workflow

When pushing updates to production:

### 1. Developer Workstation
```bash
git status
git add .
git commit -m "feat: enhance scoreboard responsiveness"
git push origin main
```

### 2. Production Linux VM
```bash
cd /opt/cybercrew-ctf
bash deploy/deploy.sh main
```

---

## 17. Rollback

To revert the application to any previous known-good Git commit:
```bash
# Find target commit SHA
git log --oneline -n 5

# Execute rollback script
bash deploy/rollback.sh <git_commit_sha>
```

### Rollback Characteristics:
- **Application Code:** Reverts container builds to the exact codebase state at `<git_commit_sha>`.
- **Database Safety:** **Does NOT reset or delete Supabase PostgreSQL data**. External database state is safely preserved.

---

## 18. Backup

Create a pre-deployment configuration and state snapshot:
```bash
bash scripts/backup.sh
```

### Backup Contents:
- Timestamped directory in `backups/backup_YYYYMMDD_HHMMSS/`.
- Copy of `.env` configuration (`.env.backup`).
- Copy of Caddy proxy configuration (`caddy_config/`).
- Active Git commit SHA (`commit_sha.txt`).

---

## 19. Tunnel Configuration

Tunneling (e.g. Cloudflare Tunnel, WireGuard) provides secure public ingress without exposing direct IP addresses.

- **Infrastructure Layer:** Configured separately on the Linux VM (outside application Git repository).
- **Target Connection:** Route inbound domain traffic (`ctf.cybercrew.online`) to `http://localhost:80` or `https://localhost:443`.
- **Security Rule:** Never commit tunnel private keys, tokens, or Cloudflare API credentials to GitHub.

---

## 20. DNS Configuration

- **Target Domain:** `ctf.cybercrew.online`
- **DNS Record Setup:**
  ```text
  Type:   A
  Name:   ctf
  Value:  <VM_PUBLIC_IP>
  TTL:    300 (or Auto)
  ```
*(If using Cloudflare Tunnel, configure a CNAME record pointing `ctf` to your Cloudflare Tunnel UUID endpoint).*

---

## 21. Challenge Deployment

CTF challenges run in isolated Docker containers separate from the main platform:

```bash
# Build and launch live challenge targets
docker compose -f infrastructure/docker/docker-compose.challenges.yml up -d
```

### Challenge Container Isolation Rules:
1. **Network Isolation:** Challenge containers must use `cybercrew-challenge-net`.
2. **Zero Secrets:** Challenge containers must **NEVER** receive Supabase credentials, backend keys, or Redis passwords.
3. **No Docker Socket Access:** Never mount `/var/run/docker.sock` into challenge containers.
4. **Resource Constraints:** Enforce CPU (`0.5`) and memory limits (`256M`).

---

## 22. Security

- **Untrusted Client Model:** All flag submissions, score awards, and role enforcement occur strictly backend-side.
- **Service-Role Key Protection:** `SUPABASE_SERVICE_ROLE_KEY` is restricted strictly to backend environment variables.
- **HMAC Flag Verification:** Flags are verified via blind HMAC-SHA256 hashing.
- **Non-Root Containers:** Backend runs under unprivileged `USER node`.
- **Exclusion of Secrets:** `.gitignore` strictly excludes `.env`, `.env.*`, keys, certs, and backups.

---

## 23. Troubleshooting

| Symptom / Problem | Check / Action | Command |
| :--- | :--- | :--- |
| **Docker Daemon Inactive** | Check systemd docker service status | `sudo systemctl status docker` |
| **Containers Not Starting** | Check active container status | `docker compose -f deploy/docker-compose.yml ps` |
| **Backend API Unhealthy** | Inspect NestJS backend logs | `docker compose -f deploy/docker-compose.yml logs backend` |
| **Frontend Not Loading** | Check Caddy & Nginx logs | `docker compose -f deploy/docker-compose.yml logs reverse-proxy` |
| **Database Connection Fail** | Verify Supabase URL & database URL | `cat .env \| grep SUPABASE_URL` |
| **Redis Connection Fail** | Verify Redis container status & logs | `docker compose -f deploy/docker-compose.yml logs redis` |
| **Failed Deployment** | Run health check & rollback | `bash deploy/health-check.sh` / `bash deploy/rollback.sh <sha>` |
| **Challenge Unreachable** | Verify challenge container & UFW ports | `docker ps` / `sudo ufw status` |

---

## 24. Production Checklist

### Before Deployment
- [ ] Linux host VM running Ubuntu 22.04 / 24.04 LTS
- [ ] Docker Engine & Docker Compose plugin installed
- [ ] UFW firewall enabled (`22`, `80`, `443`, `8001:8010`)
- [ ] Repository cloned to `/opt/cybercrew-ctf`
- [ ] Production `.env` created from `.env.example`
- [ ] File permissions set (`chmod 600 .env`)
- [ ] Docker Compose syntax validated (`docker compose -f deploy/docker-compose.yml config`)

### Deployment & Verification
- [ ] `bash deploy/deploy.sh main` executed successfully
- [ ] All containers running (`reverse-proxy`, `backend`, `frontend`, `redis`)
- [ ] `bash deploy/health-check.sh` returns HTTP 200 / ALL PASSED
- [ ] Backend `/api/v1/health` responds cleanly

### Ingress & Challenges
- [ ] Tunnel / Reverse Proxy connected to `localhost:80`
- [ ] DNS A record configured for `ctf.cybercrew.online`
- [ ] HTTPS Let's Encrypt certificate active
- [ ] Isolated challenge containers running (`infrastructure/docker/docker-compose.challenges.yml`)

---

## 25. Development Workflow

```text
Local Developer Workstation
   ↓
git add . && git commit -m "..."
   ↓
git push origin main
   ↓
GitHub Repository (https://github.com/chakreshram11/cybercrew-ctf.git)
   ↓
Linux Production VM
   ↓
bash deploy/deploy.sh main
   ↓
Docker Compose Build & Health Check
```

---

## 26. Important Production Notes

> ⚠️ **CRITICAL SECURITY WARNING:** This platform hosts intentionally vulnerable CTF challenge environments. Never run untrusted challenge containers without network isolation (`cybercrew-challenge-net`). Do not expose host Docker sockets (`/var/run/docker.sock`) or production Supabase credentials to challenge containers.

- **Git Rollback vs. Database State:** Rolling back application code via `deploy/rollback.sh` affects container images only; it does **not** delete or reset external Supabase PostgreSQL data.
- **Infrastructure Separation:** Application deployment (`deploy.sh`) and public ingress (Tunnel / DNS) are independent infrastructure layers.
- **Environment Confidentiality:** Production `.env` must remain strictly confidential and never be checked into Git.

---

## 27. License

Confidential & Proprietary to **Cyber Crew Club**.
