# Cyber Crew CTF Platform — Linux VM Production Deployment Guide

This guide provides step-by-step instructions for deploying the **Cyber Crew CTF** platform to an Ubuntu / Debian Linux virtual machine (VM).

---

## 1. Architecture Overview

```
Internet / External Traffic
          ↓
  Linux Host VM (Ubuntu 22.04 / 24.04 LTS)
          ↓
[ Reverse Proxy: Caddy / Nginx ]  (Ports 80 / 443)
    ├── /api/*  ──> [ ctf-backend:4000 ]  (Internal ctf-network)
    │                  └── Supabase (External Cloud PostgreSQL & Auth)
    │                  └── Redis (Internal ctf-network:6379)
    └── /*      ──> [ ctf-frontend:80 ]   (Internal ctf-network)

Isolated CTF Challenge Network (cybercrew-challenge-net)
    ├── Web Challenge 1  (Host Port 8001 -> Container Port 80)
    ├── Web Challenge 2  (Host Port 8002 -> Container Port 80)
    └── Crypto / PWN     (Host Port 9001 -> Container Port)
```

---

## 2. Linux VM Initial Setup

### Step 1: Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw jq ca-certificates gnupg
```

### Step 2: Install Docker & Docker Compose
```bash
# Add Docker's official GPG key & repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker service
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```
*(Note: Log out and log back in to apply docker group membership).*

### Step 3: Configure Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
# Allow Web Challenge Port Range (e.g. 8001-8010)
sudo ufw allow 8001:8010/tcp comment 'CTF Web Challenges'
sudo ufw enable
```

---

## 3. Clone Repository & Environment Setup

### Step 1: Clone Repository
```bash
cd /opt
sudo git clone https://github.com/chakreshram11/cybercrew-ctf.git
sudo chown -R $USER:$USER /opt/cybercrew-ctf
cd /opt/cybercrew-ctf
```

### Step 2: Configure Production Environment Variables
```bash
cp .env.example .env
nano .env
```
Fill in all production values for Supabase, JWT secret, database URLs, flag salt, and frontend URL. Ensure file permissions are restricted:
```bash
chmod 600 .env
```

---

## 4. Platform Deployment

### Automated One-Command Deployment
```bash
bash deploy/deploy.sh main
```

The script will automatically:
1. Validate system dependencies (`git`, `docker`, `docker compose`).
2. Pull latest code from `main` branch.
3. Build production multi-stage Docker images (`ctf-frontend`, `ctf-backend`).
4. Start container services via Docker Compose.
5. Run automated health checks (`bash deploy/health-check.sh`).
6. Perform automated rollback to previous commit if health checks fail.

---

## 5. Health Checks & Manual Operations

### Run Health Check
```bash
bash deploy/health-check.sh
```

### Manual Rollback (to specific Git commit)
```bash
bash deploy/rollback.sh <previous_git_commit_sha>
```

### Create System Backup
```bash
bash scripts/backup.sh
```

---

## 6. Challenge Container Architecture & Isolation

CTF challenges run in isolated containers separate from the core platform to prevent compromised challenge containers from accessing the database or main infrastructure.

### Rules for Challenge Containers:
1. **Network Isolation:** Challenge containers must use `cybercrew-challenge-net`.
2. **No Docker Socket Access:** Never mount `/var/run/docker.sock` into challenge containers.
3. **No Database Access:** Challenge containers must never receive Supabase or database credentials.
4. **Resource Constraints:** Apply CPU and memory limits (`cpus: '0.5'`, `memory: 256M`).

### Deploy Challenge Containers
```bash
docker compose -f infrastructure/docker/docker-compose.challenges.yml up -d
```

---

## 7. Tunnel & Domain Integration (Cloudflare Tunnel / Custom Reverse Proxy)

Tunneling and DNS configuration are kept separate from the application deployment lifecycle.

- **Domain Target:** `ctf.cybercrew.online`
- **Reverse Proxy Routing:** Caddy listens on port 80/443 and routes:
  - `/api/*` -> `ctf-backend:4000`
  - `/*` -> `ctf-frontend:80`
- **Cloudflare Tunnel / Tunnel Service:** Route traffic to `localhost:80` or `localhost:443` on the Linux host VM.
