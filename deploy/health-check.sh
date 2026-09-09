#!/usr/bin/env bash
# ==============================================================================
# Cyber Crew CTF Platform — Production Health Check Script
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

HEALTH_FAILED=0

log_info "Initiating CTF platform health checks..."

# 1. Verify Docker containers are running
CONTAINERS=("cybercrew-ctf-backend" "cybercrew-ctf-frontend" "cybercrew-ctf-caddy" "cybercrew-ctf-redis")

for container in "${CONTAINERS[@]}"; do
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "running" ]; then
      log_success "Container [$container] is running."
    else
      log_error "Container [$container] status is '$STATUS'."
      HEALTH_FAILED=1
    fi
  else
    log_error "Container [$container] is not running or missing."
    HEALTH_FAILED=1
  fi
done

# 2. Check Backend Health API Endpoint (/health)
log_info "Testing Backend API Health Endpoint..."
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:4000/health}"

# Retry up to 5 times to give backend time to connect to DB and start API server
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_HTTP_CODE="000"

while [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; do
  HEALTH_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HEALTH_URL" || echo "000")
  if [ "$HEALTH_HTTP_CODE" = "200" ]; then
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; then
    log_warn "Backend returned HTTP [$HEALTH_HTTP_CODE]. Retrying ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 3
  fi
done

if [ "$HEALTH_HTTP_CODE" = "200" ]; then
  log_success "Backend API health check returned HTTP 200."
else
  log_error "Backend API health check failed with HTTP code [$HEALTH_HTTP_CODE]."
  HEALTH_FAILED=1
fi

# 3. Check Frontend Web Server Response
log_info "Testing Frontend Web Server Response..."
FRONTEND_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:80" || echo "000")

if [ "$FRONTEND_HTTP_CODE" = "200" ] || [ "$FRONTEND_HTTP_CODE" = "301" ] || [ "$FRONTEND_HTTP_CODE" = "302" ] || [ "$FRONTEND_HTTP_CODE" = "307" ] || [ "$FRONTEND_HTTP_CODE" = "308" ]; then
  log_success "Frontend web server returned HTTP [$FRONTEND_HTTP_CODE]."
else
  log_error "Frontend web server failed with HTTP code [$FRONTEND_HTTP_CODE]."
  HEALTH_FAILED=1
fi

# 4. Final Verdict
if [ "$HEALTH_FAILED" -eq 0 ]; then
  log_success "All platform health checks PASSED successfully!"
  exit 0
else
  log_error "Health checks FAILED. Platform is unhealthy."
  exit 1
fi
