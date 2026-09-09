#!/usr/bin/env bash
# ==============================================================================
# Cyber Crew CTF Platform — Production Rollback Script
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

TARGET_COMMIT="${1:-}"

if [ -z "$TARGET_COMMIT" ]; then
  log_error "No rollback commit SHA provided."
  echo "Usage: $0 <git_commit_sha>"
  exit 1
fi

log_warn "Initiating platform rollback to commit SHA: [$TARGET_COMMIT]..."

# 1. Verify target commit exists in git history
if ! git cat-file -e "${TARGET_COMMIT}^{commit}" 2>/dev/null; then
  log_error "Git commit SHA [$TARGET_COMMIT] does not exist in repository history."
  exit 1
fi

# 2. Safely checkout previous commit
log_info "Checking out Git commit [$TARGET_COMMIT]..."
git checkout "$TARGET_COMMIT"

# 3. Rebuild and restart Docker containers
log_info "Rebuilding and restarting Docker containers..."
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d --remove-orphans

# 4. Wait briefly for services to stabilize
log_info "Waiting 10 seconds for containers to stabilize..."
sleep 10

# 5. Run health checks on rolled-back environment
log_info "Executing post-rollback health checks..."
if bash deploy/health-check.sh; then
  log_success "Rollback to commit [$TARGET_COMMIT] completed successfully!"
  exit 0
else
  log_error "CRITICAL: Post-rollback health checks FAILED. Manual intervention required."
  exit 1
fi
