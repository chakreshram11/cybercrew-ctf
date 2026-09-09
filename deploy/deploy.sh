#!/usr/bin/env bash
# ==============================================================================
# Cyber Crew CTF Platform — Production Deployment Script
# ==============================================================================
set -euo pipefail

# Ensure script operates from repository root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

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

BRANCH="${1:-main}"

log_info "Starting Cyber Crew CTF Production Deployment (Branch: $BRANCH)..."

# 1. Pre-flight CLI checks
for cmd in git docker; do
  if ! command -v "$cmd" &>/dev/null; then
    log_error "Required command '$cmd' is not installed or not in PATH."
    exit 1
  fi
done

# Detect Docker Compose CLI (v2 plugin vs v1 standalone binary)
if docker compose version &>/dev/null; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  log_error "Neither 'docker compose' nor 'docker-compose' could be located."
  log_warn "On Ubuntu/Debian, install the Docker Compose plugin by running:"
  log_warn "  sudo apt update && sudo apt install -y docker-compose-plugin"
  log_warn "Or install the standalone binary:"
  log_warn "  sudo apt update && sudo apt install -y docker-compose"
  exit 1
fi
log_info "Using Docker Compose command: [$COMPOSE_CMD]"

# 2. Verify production .env exists
if [ ! -f ".env" ]; then
  log_error "Production environment file '.env' not found in repository root."
  log_warn "Copy .env.example to .env and configure production credentials before deploying."
  exit 1
fi

# 3. Store current Git commit SHA for automated rollback
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
log_info "Current active commit SHA: [${PREV_COMMIT:0:8}]"

# 4. Pull latest release from repository
log_info "Fetching latest code from remote repository ($BRANCH)..."
git fetch origin "$BRANCH"

if ! git diff --quiet; then
  log_warn "Working directory contains uncommitted local changes. Stashing..."
  git stash
fi

git checkout "$BRANCH"
git pull origin "$BRANCH"

NEW_COMMIT=$(git rev-parse HEAD)
log_info "New target commit SHA: [${NEW_COMMIT:0:8}]"

# 5. Build Docker images
log_info "Building production Docker images..."
$COMPOSE_CMD --env-file .env -f deploy/docker-compose.yml build

# 6. Deploy containers
log_info "Starting container services..."
$COMPOSE_CMD --env-file .env -f deploy/docker-compose.yml up -d --remove-orphans

# 7. Post-deployment stabilization pause
log_info "Waiting 10 seconds for services to start..."
sleep 10

# 8. Run automated health checks
log_info "Running platform health checks..."
if bash deploy/health-check.sh; then
  log_success "Deployment of commit [${NEW_COMMIT:0:8}] completed SUCCESSFULLY!"
  exit 0
else
  log_error "Health checks failed following deployment of [${NEW_COMMIT:0:8}]."
  if [ -n "$PREV_COMMIT" ] && [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
    log_warn "Initiating automated rollback to previous known-good commit [${PREV_COMMIT:0:8}]..."
    bash deploy/rollback.sh "$PREV_COMMIT"
  fi
  exit 1
fi
