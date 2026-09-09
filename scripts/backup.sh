#!/usr/bin/env bash
# ==============================================================================
# Cyber Crew CTF Platform — Production Backup Script
# ==============================================================================
set -euo pipefail

# Text Formatting
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/backup_${TIMESTAMP}"

log_info "Creating backup in directory [$BACKUP_DIR]..."
mkdir -p "$BACKUP_DIR"

# 1. Backup Environment Configuration
if [ -f ".env" ]; then
  cp .env "${BACKUP_DIR}/.env.backup"
  log_success "Environment config backed up to ${BACKUP_DIR}/.env.backup"
fi

# 2. Backup Caddy / Proxy Configuration
if [ -d "infrastructure/caddy" ]; then
  cp -r infrastructure/caddy "${BACKUP_DIR}/caddy_config"
  log_success "Caddy configuration backed up."
fi

# 3. Save Git state
git rev-parse HEAD > "${BACKUP_DIR}/commit_sha.txt" || true

log_success "Backup process completed successfully!"
