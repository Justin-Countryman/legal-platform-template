#!/usr/bin/env bash
# build-against-stub — `next build` with no Sanity project, the way CI runs it.
#
# Run from `site/`. Starts the content-lake stub on a local port with the
# slug-only fixture, builds with the sentinel project id pointed at it, stops the
# stub, and then asserts two things a green exit alone does not prove:
#
#   1. the build exercised the data path — the stub answered at least
#      MIN_QUERIES queries (34 measured on 2026-09-11; a build that asks nothing
#      has not touched `generateStaticParams`, the layouts, the sitemap or
#      robots, and would be green for the wrong reason);
#   2. the six per-slug templates rendered — every fixture slug appears in
#      Next's route table.
#
# The sentinel id is used as-is: with `useProjectHostname: false` the client
# sends it as a header and never validates its format, so no placeholder id has
# to be allowed by `scripts/check-template-is-blank.mjs`.
#
# Monorepo OUTSTANDING item 255 is the reason this file exists. It is also the
# local artifact: what CI runs is this script, so a developer can run the same
# gate before pushing.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

PORT="${STUB_PORT:-4010}"
MIN_QUERIES="${MIN_QUERIES:-30}"
COUNT_FILE="$(mktemp)"
FIXTURE="scripts/ci/fixture.ndjson"

PORT="$PORT" MOCK_DATASET_NDJSON="$FIXTURE" STUB_COUNT_FILE="$COUNT_FILE" \
  node scripts/ci/content-lake-stub.mjs &
STUB_PID=$!
trap 'kill "$STUB_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  if curl -fsS "http://127.0.0.1:$PORT/v2024-01-01/data/query/production?query=count(*)" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

set +e
SANITY_API_HOST_OVERRIDE="http://127.0.0.1:$PORT" \
NEXT_PUBLIC_SANITY_PROJECT_ID=TEMPLATE_SANITY_PROJECT_ID \
NEXT_PUBLIC_SANITY_DATASET=production \
NEXT_PUBLIC_SITE_DOMAIN=example.com \
NEXT_TELEMETRY_DISABLED=1 \
  npm run build 2>&1 | tee build-against-stub.log
BUILD_STATUS=${PIPESTATUS[0]}
set -e

kill "$STUB_PID" 2>/dev/null || true
wait "$STUB_PID" 2>/dev/null || true

if [ "$BUILD_STATUS" -ne 0 ]; then
  echo "::error::next build failed against the stub Content Lake (exit $BUILD_STATUS)."
  exit "$BUILD_STATUS"
fi

# The X-Robots-Tag read (`lib/searchVisibility.ts`, `fetchSiteHiddenAtBuild`)
# is fail-closed: a read it cannot make ships noindex on every response. Since
# 2026-09-13 it says so on stderr with this prefix; a green build that carries
# the line hid the site by accident, not by the operator's hand, and CI must not
# call that green. The stub answers the field as null, which is the designed
# fresh-client state and logs nothing.
if grep -qF '[searchVisibility]' build-against-stub.log; then
  echo "::error::The build could not read siteSettings.hideFromSearch and shipped noindex fail-closed. The line above names why; this is not a green build."
  exit 1
fi

QUERIES=$(cat "$COUNT_FILE" 2>/dev/null || echo 0)
echo "content-lake-stub answered $QUERIES queries during the build."
if [ "$QUERIES" -lt "$MIN_QUERIES" ]; then
  echo "::error::The build asked the stub only $QUERIES queries (floor $MIN_QUERIES). The data path was not exercised; this green is not evidence."
  exit 1
fi

MISSING=0
while IFS= read -r line; do
  slug=$(printf '%s' "$line" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s);process.stdout.write(d.slug.current)})')
  case "$slug" in
    attorneys/*|staff/*|blog/*|events/*) route="/$slug" ;;
    *) route="/review/$slug" ;;
  esac
  if ! grep -qF "$route" build-against-stub.log; then
    echo "::error::Fixture route $route is missing from the build's route table; its template did not render."
    MISSING=1
  fi
done < "$FIXTURE"
rm -f build-against-stub.log "$COUNT_FILE"
[ "$MISSING" -eq 0 ] || exit 1

# One hop for a legacy URL ([R-185], 2026-09-11): the built route table must
# carry NO framework slash-stripping redirect ahead of the map. This is the
# artifact Vercel consumes, so it is asserted here rather than in the source.
if node -e "
  const m = require('./.next/routes-manifest.json');
  const internal = (m.redirects || []).filter((r) => r.internal);
  if (internal.length) { console.error('internal redirect(s) present:', JSON.stringify(internal)); process.exit(1); }
  console.log('routes-manifest carries no framework slash redirect (' + (m.redirects || []).length + ' redirect rule(s))');
"; then :; else echo "the framework's trailing-slash redirect is back in the manifest" >&2; exit 1; fi
echo "next build is green against the stub Content Lake: $QUERIES queries, every fixture template rendered."
