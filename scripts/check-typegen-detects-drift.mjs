#!/usr/bin/env node
//
// check-typegen-detects-drift — prove the typegen freshness job can fail.
//
// ─── Why this exists ─────────────────────────────────────────────────────────
//
// The `typegen-freshness` job diffs the committed studio/schema.json and
// site/types/sanity.types.ts against a fresh regeneration. For four months it
// could not fail on the schema half, and nobody could tell, because the way it
// failed was by REPORTING SUCCESS.
//
// The chain (monorepo BI/OUTSTANDING.md item 165, confirmed by observation
// 2026-08-10): resolving the studio config built an auth store whose
// getCurrentUser bootstrap ran before the schema was touched; against the
// placeholder project it threw CorsOriginError; `schema extract` exited
// non-zero having written nothing; `|| true` swallowed that; the guard-the-
// guard step then read the STALE COMMITTED FILE, which was valid JSON and
// passed; and `git diff --exit-code studio/schema.json` compared an untouched
// file against itself. Green by construction. It was hiding real drift while it
// did so — ogTitle and ogDescription had landed on 22 document types and
// neither generated artifact had been regenerated.
//
// The extraction path is fixed (studio/sanity.config.ts now supplies an offline
// auth store, so nothing is reached over the network and no exit code is
// tolerated). THIS FILE IS THE PART THAT KEEPS IT FIXED. A guard that only ever
// reports zero is indistinguishable from a guard that does nothing, so this one
// plants a schema field that is not in the committed schema, regenerates, and
// REQUIRES the drift to show up. Then it restores and requires the restoration
// to be byte-exact, because a self-test that dirties the tree would fail the
// very diff it is protecting.
//
// The same shape as site/scripts/__tests__/check-unknown-utility-classes.test.ts,
// and for the same reason: an invisible failure mode needs a check that runs
// somewhere nobody has to remember it.
//
// Detected by: itself. This file IS the detector for the vacuous-guard failure.

import {execFileSync} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STUDIO = path.join(ROOT, 'studio')
const SCHEMA_JSON = path.join(STUDIO, 'schema.json')

// The file the probe is planted into. Any document schema would do; naming one
// keeps the check readable. If it is ever renamed this fails loudly, which is
// the right direction — a probe that silently finds nothing to plant into is
// the failure this file exists to stop.
const TARGET = path.join(STUDIO, 'schemas', 'documents', 'generalPage.ts')

// A field name that must not exist in the committed schema. Checked, not assumed.
const PROBE = 'typegenDriftProbe'
const PROBE_FIELD = `    {name: '${PROBE}', title: 'Typegen Drift Probe', type: 'string'},\n`
const FIELDS_ANCHOR = '\n  fields: [\n'

// THROWS rather than exits, deliberately. `process.exit()` does not unwind the
// stack, so a `process.exit` inside the try below would skip the finally that
// puts the planted file back — a self-test that leaves the tree dirty on the one
// path it exists to take. Caught by running it: the first draft did exactly that.
class CheckFailure extends Error {}

function fail(message) {
  throw new CheckFailure(message)
}

function report(err) {
  console.error(`::error::${err.message}`)
  console.error(err.message)
  process.exitCode = 1
}

function extract() {
  execFileSync('npm', ['run', 'schema:extract'], {
    cwd: STUDIO,
    stdio: 'pipe',
    env: {...process.env, SANITY_STUDIO_OFFLINE_SCHEMA_EXTRACT: '1'},
  })
}

function main() {
  if (!fs.existsSync(TARGET)) {
    fail(`Cannot plant a drift probe: ${path.relative(ROOT, TARGET)} does not exist. Point TARGET at a document schema that does.`)
  }

  const baseline = fs.readFileSync(SCHEMA_JSON, 'utf8')
  if (baseline.includes(PROBE)) {
    fail(`The committed schema already contains "${PROBE}". The probe proves nothing while that is true — rename PROBE.`)
  }

  const original = fs.readFileSync(TARGET, 'utf8')
  if (!original.includes(FIELDS_ANCHOR)) {
    fail(`Cannot plant a drift probe: no top-level "fields: [" in ${path.relative(ROOT, TARGET)}.`)
  }

  let planted = false
  try {
    fs.writeFileSync(TARGET, original.replace(FIELDS_ANCHOR, FIELDS_ANCHOR + PROBE_FIELD))
    planted = true

    extract()

    const withProbe = fs.readFileSync(SCHEMA_JSON, 'utf8')
    if (!withProbe.includes(PROBE)) {
      fail(
        'THE FRESHNESS GUARD IS VACUOUS. A field was added to ' +
          `${path.relative(ROOT, TARGET)} and the regenerated schema.json does not ` +
          'contain it, so the extraction is not reading the schema source and the ' +
          'freshness diff is comparing the committed file against itself. This is ' +
          'monorepo OUTSTANDING item 165 regressed. Do not tolerate a green diff.',
      )
    }
  } finally {
    if (planted) fs.writeFileSync(TARGET, original)
  }

  // The restore has to be proven, not assumed: this script runs immediately
  // after a `git diff --exit-code` over the very file it rewrote.
  extract()
  const restored = fs.readFileSync(SCHEMA_JSON, 'utf8')
  if (restored !== baseline) {
    fail(
      'The drift probe was planted and the regenerated schema did not come back ' +
        `byte-identical after restoring ${path.relative(ROOT, TARGET)}. The working ` +
        'tree is dirty and the freshness diff cannot be trusted on this run.',
    )
  }

  console.log(`Freshness guard proven able to fail: planting "${PROBE}" in ${path.relative(ROOT, TARGET)} shows up in schema.json, and the restore is byte-exact.`)
}

try {
  main()
} catch (err) {
  if (!(err instanceof CheckFailure)) throw err
  report(err)
}
