#!/usr/bin/env bash
# dev.sh — start the full Miam Share stack locally and expose it to your local network.
#
# What it does:
#   1. Detects your LAN IP so your phone can reach the API
#   2. Creates .env.local (PGlite by default + optional Gemini key) on first run
#   3. Writes EXPO_PUBLIC_API_URL into .env so the app hits your machine
#   4. Starts the TypeScript API server (scripts/api-server.ts)
#   5. Seeds the database with fake recipes if it is empty
#   6. Launches Expo in --lan mode so your phone can scan the QR code
#
# Usage:
#   bash dev.sh            # normal start (seed if empty)
#   bash dev.sh --no-seed  # skip seeding step
#
# Requirements: Node >= 20, npx, curl

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colours ──────────────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[1;34m'; N='\033[0m'
log()  { echo -e "${G}${1}${N}"; }
info() { echo -e "${B}${1}${N}"; }
warn() { echo -e "${Y}${1}${N}"; }
die()  { echo -e "${R}${1}${N}" >&2; exit 1; }

# ── Parse flags ───────────────────────────────────────────────────────────────
SKIP_SEED=false
for arg in "$@"; do [[ $arg == "--no-seed" ]] && SKIP_SEED=true; done

command -v npx >/dev/null 2>&1 || die "❌ npx not found. Install Node.js and npm first."
command -v curl >/dev/null 2>&1 || die "❌ curl not found. Please install curl."
command -v node >/dev/null 2>&1 || die "❌ node not found. Install Node.js first."

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [[ "${NODE_MAJOR}" -lt 20 ]]; then
  die "❌ Node.js 20+ is required (current: $(node -v)). Expo SDK 54 needs a newer runtime."
fi

# ── 1. Detect LAN IP ─────────────────────────────────────────────────────────
# Try multiple methods in order of preference, works on Linux + macOS.
LAN_IP=$(python3 -c "import socket; s=socket.socket(); s.connect(('1.1.1.1',80)); print(s.getsockname()[0])" 2>/dev/null || true)
[[ -z "$LAN_IP" ]] && LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || true)
[[ -z "$LAN_IP" ]] && LAN_IP=$(ifconfig 2>/dev/null | awk '/inet / && !/127\.0\.0\.1/{print $2; exit}' || true)
[[ -z "$LAN_IP" ]] && LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
[[ -z "$LAN_IP" ]] && die "❌ Could not detect LAN IP. Set EXPO_PUBLIC_API_URL manually."
log "🔍 LAN IP: ${LAN_IP}"

# ── 2. Create .env.local on first run ────────────────────────────────────────
if [ ! -f .env.local ]; then
  cat > .env.local << 'ENVEOF'
# Force embedded database for local dev (no Docker/Postgres required).
DB_BACKEND=pglite

# POSTGRES_URL is intentionally left unset so the app uses the embedded PGlite
# database stored in ./dev-db (created automatically, no Docker needed).
# Uncomment and fill the line below ONLY if you want to use an external Postgres:
# POSTGRES_URL=postgresql://user:pass@localhost:5432/miamshare
GEMINI_API_KEY=
ENVEOF
  warn "⚠️  Created .env.local — set GEMINI_API_KEY to enable AI features"
fi

# Load local env vars so api-server and seed scripts inherit them from this shell.
set -a
# shellcheck disable=SC1091
source .env.local
set +a

# Keep local setup deterministic even if host env has POSTGRES_URL.
export DB_BACKEND="${DB_BACKEND:-pglite}"

# ── 3. Write EXPO_PUBLIC_API_URL into .env ────────────────────────────────────
# Pick a free local API port (starting at 3000) to avoid collisions.
API_PORT="${API_PORT:-}"
if [[ -z "${API_PORT}" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    API_PORT=$(python3 - <<'PY'
import socket
for port in range(3000, 3021):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('127.0.0.1', port))
        print(port)
        break
    except OSError:
        pass
    finally:
        s.close()
else:
    print(3000)
PY
)
  else
    API_PORT=3000
  fi
fi

# Overwrites any existing EXPO_PUBLIC_API_URL; preserves other lines.
touch .env
if grep -q '^EXPO_PUBLIC_API_URL=' .env 2>/dev/null; then
  sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://${LAN_IP}:${API_PORT}|" .env
else
  echo "EXPO_PUBLIC_API_URL=http://${LAN_IP}:${API_PORT}" >> .env
fi
log "✅ EXPO_PUBLIC_API_URL=http://${LAN_IP}:${API_PORT}"

# ── 4. Start the TypeScript API server in the background ─────────────────────
log "🚀 Starting API server on :${API_PORT}..."
npx tsx scripts/api-server.ts --port "${API_PORT}" > .dev-api.log 2>&1 &
API_PID=$!
echo "$API_PID" > .api-server.pid

echo -n "⏳ Waiting for API"
API_READY=false
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${API_PORT}/api/recipes" >/dev/null 2>&1; then
    API_READY=true
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    break
  fi
  echo -n "."
  sleep 1
done
echo ""

if [[ "$API_READY" != true ]]; then
  warn "⚠️  API failed to become healthy. Last logs:"
  tail -n 80 .dev-api.log || true
  die "❌ Local API failed to start. Check .dev-api.log"
fi

log "✅ API is up  →  http://127.0.0.1:${API_PORT}"

# ── 5. Seed the database if it is empty ──────────────────────────────────────
if [[ $SKIP_SEED == false ]]; then
  npx tsx scripts/seed.ts
fi

# ── Cleanup on exit (Ctrl-C or shell exit) ────────────────────────────────────
cleanup() {
  echo ""
  warn "🛑 Shutting down..."
  kill "$API_PID" 2>/dev/null || true
  rm -f .api-server.pid
  warn "   Done. DB data is preserved in ./dev-db"
}
trap cleanup EXIT

# ── 6. Start Expo in LAN mode ─────────────────────────────────────────────────
echo ""
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "  📱 API  → http://${LAN_IP}:${API_PORT}"
info "  📱 Scan the Expo QR code from your phone"
info "  ℹ️  Phone must be on the same WiFi network"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx expo start --lan
