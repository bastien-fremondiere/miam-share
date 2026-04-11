#!/usr/bin/env bash
# dev.sh — start the full Miam Share stack locally and expose it to your local network.
#
# What it does:
#   1. Detects your LAN IP so your phone can reach the API
#   2. Creates .env.local (Postgres URL + optional Gemini key) on first run
#   3. Writes EXPO_PUBLIC_API_URL into .env so the app hits your machine
#   4. Starts a local Postgres 16 container via Docker Compose
#   5. Starts the TypeScript API server (scripts/api-server.ts) on :3000
#   6. Seeds the database with 6 fake recipes if it is empty
#   7. Launches Expo in --lan mode so your phone can scan the QR code
#
# Usage:
#   bash dev.sh            # normal start (seed if empty)
#   bash dev.sh --no-seed  # skip seeding step
#
# Requirements: Node >= 20, Docker, npx

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[1;34m'; N='\033[0m'
log()  { echo -e "${G}${1}${N}"; }
info() { echo -e "${B}${1}${N}"; }
warn() { echo -e "${Y}${1}${N}"; }
die()  { echo -e "${R}${1}${N}" >&2; exit 1; }

# ── Parse flags ───────────────────────────────────────────────────────────────
SKIP_SEED=false
for arg in "$@"; do [[ $arg == "--no-seed" ]] && SKIP_SEED=true; done

# ── 1. Detect LAN IP ─────────────────────────────────────────────────────────
LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || true)
[[ -z "$LAN_IP" ]] && LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[[ -z "$LAN_IP" ]] && die "❌ Could not detect LAN IP. Set EXPO_PUBLIC_API_URL manually."
log "🔍 LAN IP: ${LAN_IP}"

# ── 2. Create .env.local on first run ────────────────────────────────────────
if [ ! -f .env.local ]; then
  cat > .env.local << 'ENVEOF'
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/miamshare
GEMINI_API_KEY=
ENVEOF
  warn "⚠️  Created .env.local — set GEMINI_API_KEY to enable AI features"
fi

# ── 3. Write EXPO_PUBLIC_API_URL into .env ────────────────────────────────────
# Overwrites any existing EXPO_PUBLIC_API_URL; preserves other lines.
touch .env
if grep -q '^EXPO_PUBLIC_API_URL=' .env 2>/dev/null; then
  sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://${LAN_IP}:3000|" .env
else
  echo "EXPO_PUBLIC_API_URL=http://${LAN_IP}:3000" >> .env
fi
log "✅ EXPO_PUBLIC_API_URL=http://${LAN_IP}:3000"

# ── 4. Start Postgres via Docker ─────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || die "❌ Docker not found. Install Docker Engine or Docker Desktop."
log "🐘 Starting Postgres container..."
docker compose up -d postgres

echo -n "⏳ Waiting for Postgres"
until docker compose exec -T postgres pg_isready -U postgres -q 2>/dev/null; do
  echo -n "."
  sleep 1
done
echo ""
log "✅ Postgres is ready"

# ── 5. Load .env.local into the current shell so tsx scripts can read them ───
# (scripts also call dotenv themselves, but this ensures POSTGRES_URL is available
#  for any inline shell checks below)
set -a
# shellcheck disable=SC1091
source .env.local
set +a

# ── 6. Start the TypeScript API server in the background ─────────────────────
log "🚀 Starting API server on :3000..."
npx tsx scripts/api-server.ts &
API_PID=$!
echo "$API_PID" > .api-server.pid

echo -n "⏳ Waiting for API"
for i in $(seq 1 30); do
  if curl -sf "http://localhost:3000/api/recipes" >/dev/null 2>&1; then
    break
  fi
  echo -n "."
  sleep 1
done
echo ""
log "✅ API is up  →  http://localhost:3000"

# ── 7. Seed the database if it is empty ──────────────────────────────────────
if [[ $SKIP_SEED == false ]]; then
  npx tsx scripts/seed.ts
fi

# ── Cleanup on exit (Ctrl-C or shell exit) ────────────────────────────────────
cleanup() {
  echo ""
  warn "🛑 Shutting down..."
  kill "$API_PID" 2>/dev/null || true
  rm -f .api-server.pid
  docker compose stop postgres 2>/dev/null || true
  warn "   Done. Postgres data is preserved in the Docker volume."
}
trap cleanup EXIT

# ── 8. Start Expo in LAN mode ─────────────────────────────────────────────────
echo ""
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "  📱 API  → http://${LAN_IP}:3000"
info "  📱 Scan the Expo QR code from your phone"
info "  ℹ️  Phone must be on the same WiFi network"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx expo start --lan
