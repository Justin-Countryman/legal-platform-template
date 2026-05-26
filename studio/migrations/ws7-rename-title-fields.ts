// WS7 Commit 1b — Standardize document title field name to `title`.
//
// Renames per-document title fields:
//   pageName       → title  (14 page-style document types)
//   name           → title  (blogTag, eventCategory)
//   locationName   → title  (location)
//
// Idempotent — re-running on already-migrated data finds 0 matches and
// produces 0 mutations (the `defined(<from>)` GROQ filter excludes docs
// that no longer carry the source field).
//
// Two-phase safety:
//   1. Always reports the full plan (every doc that would change) before
//      doing anything else, regardless of mode.
//   2. Default mode is dry-run — exits after the report, no writes.
//      `--apply` mode prompts for explicit `yes` confirmation before writing.
//
// Run with:
//   Dry run (default):  npx sanity exec migrations/ws7-rename-title-fields.ts --with-user-token
//   Apply (with prompt): npx sanity exec migrations/ws7-rename-title-fields.ts --with-user-token -- --apply
//
// The `-- --apply` separator is required because `sanity exec` swallows its
// own flags otherwise; everything after `--` is forwarded to the script.

import {getCliClient} from 'sanity/cli'
import readline from 'node:readline/promises'
import {stdin, stdout} from 'node:process'

const client = getCliClient({apiVersion: '2024-01-01'})

type Rename = {type: string; from: string; to: string}

const RENAMES: Rename[] = [
  // pageName → title
  {type: 'aboutPage',         from: 'pageName',     to: 'title'},
  {type: 'attorneyPage',      from: 'pageName',     to: 'title'},
  {type: 'blogCategory',      from: 'pageName',     to: 'title'},
  {type: 'contactPage',       from: 'pageName',     to: 'title'},
  {type: 'faqPage',           from: 'pageName',     to: 'title'},
  {type: 'generalPage',       from: 'pageName',     to: 'title'},
  {type: 'geoPracticeArea',   from: 'pageName',     to: 'title'},
  {type: 'landingPage',       from: 'pageName',     to: 'title'},
  {type: 'locationPage',      from: 'pageName',     to: 'title'},
  {type: 'practiceArea',      from: 'pageName',     to: 'title'},
  {type: 'reviewPage',        from: 'pageName',     to: 'title'},
  {type: 'serviceAreaIndex',  from: 'pageName',     to: 'title'},
  {type: 'serviceAreaPage',   from: 'pageName',     to: 'title'},
  {type: 'testimonialsPage',  from: 'pageName',     to: 'title'},
  // name → title
  {type: 'blogTag',           from: 'name',         to: 'title'},
  {type: 'eventCategory',     from: 'name',         to: 'title'},
  // locationName → title
  {type: 'location',          from: 'locationName', to: 'title'},
]

type PlanEntry = {
  rename: Rename
  doc: {_id: string; _oldVal: unknown; _newVal: unknown}
}

type SkipEntry = {
  rename: Rename
  doc: {_id: string; _oldVal: unknown; _newVal: unknown}
  reason: string
}

const isApply = process.argv.includes('--apply')

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({input: stdin, output: stdout})
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

async function main() {
  console.log(`Mode: ${isApply ? 'APPLY (will mutate after confirmation)' : 'DRY RUN (no mutations)'}`)
  console.log(`Renames planned: ${RENAMES.length} type/field pairs\n`)

  const plan: PlanEntry[] = []
  const skipped: SkipEntry[] = []

  // ─── Phase 1: Scan ──────────────────────────────────────────────────────────
  console.log('Scanning dataset...')

  for (const rename of RENAMES) {
    const {type, from, to} = rename
    const docs = await client.fetch<Array<{_id: string; _oldVal: unknown; _newVal: unknown}>>(
      `*[_type == "${type}" && defined(${from})]{
         _id,
         "_oldVal": ${from},
         "_newVal": ${to}
       }`,
    )

    for (const doc of docs) {
      const conflict =
        doc._newVal !== undefined &&
        doc._newVal !== null &&
        doc._newVal !== doc._oldVal
      if (conflict) {
        skipped.push({rename, doc, reason: `target '${to}' already populated with different value`})
      } else {
        plan.push({rename, doc})
      }
    }
  }

  // ─── Phase 2: Report ────────────────────────────────────────────────────────
  console.log()
  console.log(`Plan: ${plan.length} document(s) will be migrated, ${skipped.length} skipped.`)
  console.log()

  if (plan.length === 0 && skipped.length === 0) {
    console.log('Nothing to migrate. Dataset is already in target shape (or empty for these types).')
    return
  }

  if (plan.length > 0) {
    console.log('Will migrate:')
    // Group by type for readable output
    const byType = new Map<string, PlanEntry[]>()
    for (const entry of plan) {
      const key = entry.rename.type
      const arr = byType.get(key) ?? []
      arr.push(entry)
      byType.set(key, arr)
    }
    for (const [type, entries] of byType) {
      const r = entries[0].rename
      console.log(`  ${type}: ${entries.length} doc(s) — rename ${r.from} → ${r.to}`)
      for (const entry of entries) {
        console.log(`    ${entry.doc._id}: ${JSON.stringify(entry.doc._oldVal)}`)
      }
    }
  }

  if (skipped.length > 0) {
    console.log()
    console.log('Skipped (manual review needed):')
    for (const entry of skipped) {
      console.log(`  ${entry.doc._id} (${entry.rename.type}, ${entry.rename.from} → ${entry.rename.to})`)
      console.log(`    reason: ${entry.reason}`)
      console.log(`    existing ${entry.rename.from}: ${JSON.stringify(entry.doc._oldVal)}`)
      console.log(`    existing ${entry.rename.to}:   ${JSON.stringify(entry.doc._newVal)}`)
    }
  }

  // ─── Phase 3: Confirm or exit ───────────────────────────────────────────────
  if (!isApply) {
    console.log()
    console.log('DRY RUN complete. No mutations performed.')
    if (plan.length > 0) {
      console.log('Re-run with `-- --apply` to commit mutations (you will be prompted to confirm).')
    }
    return
  }

  if (plan.length === 0) {
    console.log('Nothing to apply. Exiting.')
    return
  }

  console.log()
  console.log('⚠ This will mutate the live dataset.')
  const answer = await prompt('Type "yes" to proceed, anything else to abort: ')
  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('Aborted. No mutations performed.')
    return
  }

  // ─── Phase 4: Execute ───────────────────────────────────────────────────────
  console.log()
  console.log('Applying...')
  let migrated = 0
  let errored = 0

  for (const {rename, doc} of plan) {
    try {
      process.stdout.write(`  ${doc._id} (${rename.type}): ${rename.from} → ${rename.to}... `)
      await client
        .patch(doc._id)
        .set({[rename.to]: doc._oldVal})
        .unset([rename.from])
        .commit()
      console.log('✓')
      migrated++
    } catch (err) {
      errored++
      console.log('✗')
      console.error(`    ERROR:`, err)
    }
  }

  console.log()
  console.log('Summary:')
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Errored:  ${errored}`)
  console.log(`  Skipped:  ${skipped.length}`)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
