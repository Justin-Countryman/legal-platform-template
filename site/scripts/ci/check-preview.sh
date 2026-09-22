#!/usr/bin/env bash
# check-preview — serve the stub build and prove the preview reaches no visitor.
#
# Run from `site/` AFTER `scripts/ci/build-against-stub.sh`. Starts the stub Content
# Lake and `next start` with a throwaway SITE_PREVIEW_SECRET, runs
# `check-preview-not-shipped.mjs` on the built output and against the served site,
# and stops both. Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §4).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

STUB_PORT="${STUB_PORT:-4011}"
APP_PORT="${APP_PORT:-3117}"
COUNT_FILE="$(mktemp)"
SERVER_LOG="$(mktemp)"
echo 0 > "$COUNT_FILE"

PORT="$STUB_PORT" MOCK_DATASET_NDJSON=scripts/ci/fixture.ndjson STUB_COUNT_FILE="$COUNT_FILE" \
  node scripts/ci/content-lake-stub.mjs &
STUB_PID=$!
APP_PID=""
cleanup() {
  [ -n "$APP_PID" ] && kill "$APP_PID" 2>/dev/null || true
  kill "$STUB_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 50); do
  curl -fsS "http://127.0.0.1:$STUB_PORT/v2024-01-01/data/query/production?query=count(*)" >/dev/null 2>&1 && break
  sleep 0.1
done

SITE_PREVIEW_SECRET=ci-preview-secret \
SANITY_API_HOST_OVERRIDE="http://127.0.0.1:$STUB_PORT" \
NEXT_PUBLIC_SANITY_PROJECT_ID=TEMPLATE_SANITY_PROJECT_ID \
NEXT_PUBLIC_SANITY_DATASET=production \
NEXT_PUBLIC_SITE_DOMAIN=example.com \
NEXT_TELEMETRY_DISABLED=1 \
  npx next start -p "$APP_PORT" > "$SERVER_LOG" 2>&1 &
APP_PID=$!

for _ in $(seq 1 100); do
  curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT/" 2>/dev/null && break
  sleep 0.2
done

if ! node scripts/ci/check-preview-not-shipped.mjs \
  --served "http://127.0.0.1:$APP_PORT" --secret ci-preview-secret --count-file "$COUNT_FILE"; then
  echo "--- next start, last 40 lines ---"
  tail -40 "$SERVER_LOG"
  exit 1
fi
