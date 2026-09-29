#!/usr/bin/env bash
# Retired URLs answer 410; an unknown URL keeps 404 (lib/retired.ts, monorepo
# [R-562], TECH-11). Served from the build build-against-stub.sh just made, whose
# stub CS/retired.csv listed /retired-stub-page, /Contact and /blog/fixture-post:
# the first answers 410 with the plain page, the route and the fixture page it
# must not hide keep answering 200, and a path nobody listed stays 404.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

STUB_PORT="${STUB_PORT:-4012}"
APP_PORT="${APP_PORT:-3118}"
SERVER_LOG="$(mktemp)"

PORT="$STUB_PORT" MOCK_DATASET_NDJSON=scripts/ci/fixture.ndjson \
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

SANITY_API_HOST_OVERRIDE="http://127.0.0.1:$STUB_PORT" \
NEXT_PUBLIC_SANITY_PROJECT_ID=TEMPLATE_SANITY_PROJECT_ID \
NEXT_PUBLIC_SANITY_DATASET=production \
NEXT_PUBLIC_SITE_DOMAIN=example.com \
NEXT_TELEMETRY_DISABLED=1 \
  node_modules/.bin/next start -p "$APP_PORT" > "$SERVER_LOG" 2>&1 &
APP_PID=$!
for _ in $(seq 1 100); do
  curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT/" 2>/dev/null && break
  sleep 0.2
done

FAILED=0
expect() {
  local path="$1" want="$2" got
  got="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$APP_PORT$path")"
  if [ "$got" = "$want" ]; then echo "$path -> $got"; else echo "::error::$path answered $got, not $want"; FAILED=1; fi
}
expect /retired-stub-page 410
expect /RETIRED-STUB-PAGE 410
expect /contact 200
expect /blog/fixture-post 200
expect /no-such-page-anywhere 404
# A slashed retired URL takes the proxy's one slash-stripping 308, then the 410.
got="$(curl -s -o /dev/null -L -w '%{http_code} %{num_redirects}' "http://127.0.0.1:$APP_PORT/retired-stub-page/")"
if [ "$got" = "410 1" ]; then echo "/retired-stub-page/ -> 308 -> 410"; else echo "::error::/retired-stub-page/ gave '$got', not '410 1'"; FAILED=1; fi
body="$(curl -s "http://127.0.0.1:$APP_PORT/retired-stub-page")"
case "$body" in
  *'This page has been removed'*'<a href="/">Go to the homepage</a>'*) echo "the 410 page links home" ;;
  *) echo "::error::the 410 page is not the plain removed page"; FAILED=1 ;;
esac

if [ "$FAILED" -ne 0 ]; then
  echo "--- next start, last 40 lines ---"; tail -40 "$SERVER_LOG"
  exit 1
fi
echo "retired URLs answer 410, and nothing else changed"
