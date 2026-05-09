#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# VYBEON – Production Deployment Script
# Usage: bash infra/scripts/deploy.sh [--skip-pull] [--skip-migrate]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker-compose.yml"
API_DIR="$REPO_ROOT/apps/api"
LOG_FILE="$REPO_ROOT/infra/deploy.log"

SKIP_PULL=false
SKIP_MIGRATE=false

for arg in "$@"; do
  case $arg in
    --skip-pull)    SKIP_PULL=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
  esac
done

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ $*${NC}" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠ $*${NC}" | tee -a "$LOG_FILE"; }
die()  { echo -e "${RED}[$(date '+%H:%M:%S')] ✗ $*${NC}" | tee -a "$LOG_FILE"; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo "════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "  VYBEON Deploy  –  $(date)" | tee -a "$LOG_FILE"
echo "════════════════════════════════════════════════════" | tee -a "$LOG_FILE"

command -v docker  >/dev/null 2>&1 || die "docker not found"
command -v npm     >/dev/null 2>&1 || die "npm not found"
command -v git     >/dev/null 2>&1 || die "git not found"

[ -f "$REPO_ROOT/.env" ] || die ".env file not found in $REPO_ROOT. Copy .env.example and fill it in."

cd "$REPO_ROOT"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
if [ "$SKIP_PULL" = false ]; then
  log "Pulling latest code from git…"
  git pull --ff-only || die "git pull failed. Resolve conflicts first."
  log "Code updated to: $(git log -1 --pretty='%h %s')"
else
  warn "Skipping git pull (--skip-pull)"
fi

# ── 2. Install dependencies ───────────────────────────────────────────────────
log "Installing npm dependencies…"
npm install --prefer-offline 2>&1 | tail -5 | tee -a "$LOG_FILE"

# ── 3. Run Prisma migrations ──────────────────────────────────────────────────
if [ "$SKIP_MIGRATE" = false ]; then
  log "Running database migrations…"
  (
    cd "$API_DIR"
    # Load DATABASE_URL from root .env
    set -a; source "$REPO_ROOT/.env"; set +a
    npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
  )
  log "Migrations complete"
else
  warn "Skipping migrations (--skip-migrate)"
fi

# ── 4. Build TypeScript ───────────────────────────────────────────────────────
log "Building TypeScript…"
(
  cd "$REPO_ROOT"
  npm run build 2>&1 | tail -10 | tee -a "$LOG_FILE"
)
log "Build complete"

# ── 5. Rebuild and restart Docker services ───────────────────────────────────
log "Building Docker image…"
docker compose -f "$COMPOSE_FILE" build --no-cache api 2>&1 | tail -20 | tee -a "$LOG_FILE"

log "Restarting services (zero-downtime rolling via docker compose)…"
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans 2>&1 | tee -a "$LOG_FILE"

# ── 6. Health check ───────────────────────────────────────────────────────────
log "Waiting for API to become healthy…"
MAX_TRIES=30
TRIES=0
until docker compose -f "$COMPOSE_FILE" exec -T api wget -qO- http://localhost:4000/health >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    die "Health check failed after ${MAX_TRIES} attempts. Check logs: docker compose -f $COMPOSE_FILE logs api"
  fi
  warn "  Not ready yet (attempt $TRIES/$MAX_TRIES)… retrying in 5s"
  sleep 5
done

log "API is healthy!"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy successful!${NC}"
echo -e "${GREEN}  API:    http://$(hostname -I | awk '{print $1}'):4000${NC}"
echo -e "${GREEN}  Health: http://$(hostname -I | awk '{print $1}')/health${NC}"
echo -e "${GREEN}  Logs:   docker compose -f $COMPOSE_FILE logs -f api${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
