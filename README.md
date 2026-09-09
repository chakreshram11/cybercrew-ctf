# Cyber Crew CTF Platform

> **End-to-End Professional Capture The Flag Competition Platform**  
> Developed for **Cyber Crew Club** • Production Target: `https://ctf.cybercrew.online`

---

## 🚀 Overview

**Cyber Crew CTF** is a modern, modular, production-ready Capture The Flag (CTF) competition platform engineered from the ground up for cybersecurity competitions, hackathons, and defense drills.

Built with a **zero-trust frontend architecture**, it features dynamic scoring, first-blood bonuses, cryptographically hashed flag verification, atomic hint transactions, comprehensive team management, Docker challenge orchestration blueprints, and an administrative panel.

---

## 🏗 System Architecture

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

---

## 📂 Repository Structure

```text
cybercrew-ctf/
├── frontend/                  # React 18 + TypeScript + Vite + Tailwind CSS SPA
├── backend/                   # NestJS API, Supabase Engine, Score Ledger, Swagger
├── challenges/                # Challenge definitions, categories, Dockerfiles
│   ├── web/
│   ├── crypto/
│   ├── forensics/
│   ├── osint/
│   ├── networking/
│   ├── linux/
│   ├── windows/
│   ├── reverse/
│   ├── pwn/
│   ├── mobile/
│   ├── cloud/
│   ├── ai-security/
│   └── misc/
├── deploy/                    # Linux VM production deployment tools
│   ├── docker-compose.yml     # Production compose definition
│   ├── deploy.sh              # Automated zero-downtime deployment script
│   ├── rollback.sh            # Safe rollback script to previous Git commit
│   └── health-check.sh        # Platform container & API health check script
├── infrastructure/            # Caddy, Nginx, Docker compose & challenge network configs
├── docs/                      # Technical, API, security & deployment documentation
├── scripts/                   # Migration, database seeding, backup, & admin scripts
├── tests/                     # Integration, E2E, and security verification tests
├── docker-compose.yml         # Development & production orchestration
└── .env.example               # Safe environment variable configuration template
```

---

## 🛠 Production Deployment Workflow (Linux VM)

Developer PC  ➡️ `git push origin main` ➡️ GitHub Repository ➡️ Linux VM (`deploy/deploy.sh`) ➡️ Docker Compose ➡️ Health Checks ➡️ `https://ctf.cybercrew.online`

### 1. One-Command Automated Deployment (Linux VM)
```bash
# SSH into Linux VM
cd /opt/cybercrew-ctf

# Run automated deployment script
bash deploy/deploy.sh main
```

### 2. Manual Operational Commands
- **Health Check:** `bash deploy/health-check.sh`
- **Safe Rollback:** `bash deploy/rollback.sh <git_commit_sha>`
- **Backup System State:** `bash scripts/backup.sh`

For full VM initial setup, firewall rules, and Cloudflare Tunnel instructions, see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## 🔒 Core Security & Isolation Principles

1. **Untrusted Frontend:** All flag validations, point awards, hint purchases, and role permissions are strictly verified on the NestJS backend.
2. **Zero Flag Leakage:** Real flags are never transmitted to clients. Stored flags are cryptographically hashed using keyed HMAC-SHA256.
3. **Atomic Score Ledger:** Team scores are backed by an immutable ledger of transactions (`score_events`), preventing race conditions and double-scoring.
4. **Isolated Challenge Runtimes:** Live target containers run on isolated networks (`cybercrew-challenge-net`) with non-root privileges, resource limits, and no access to host Docker sockets or production secrets.

---

## 📜 License
Confidential & Proprietary to Cyber Crew Club.
