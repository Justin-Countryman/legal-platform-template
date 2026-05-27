// One-shot cleanup: unsets `ctaFormOverride` on documents that carry an empty
// override block — buttons[] entries where every entry has neither `title` nor
// `url`. Pre-existing data quality issue surfaced by the Phase 4 named-slot →
// buttons[] migration (BI/OUTSTANDING.md "Empty ctaFormOverride blocks on 3
// docs"): 3 H&S documents (eventPage 8548a4b0-…6bc1 / staffIndex
// drafts.20b8f151-…7b26 / staffPage e30b1239-…4108) carried empty button
// objects that already clobbered globalCtaData.buttons in the consumer-side
// spread, leaving those pages with no rendered CTA buttons. Migration
// preserved the bad shape; this cleanup removes it.
//
// Match criterion (a doc is in scope when ALL of these hold):
//   - ctaFormOverride is defined
//   - ctaFormOverride.buttons is an array (defined, possibly empty)
//   - every buttons[] entry has neither title nor url (variant alone doesn't
//     count — a "variant=primary, title=null, url=null" entry is empty)
//
// Action: `unset(['ctaFormOverride'])` — drops the whole override so the page
// falls through to globalCtaData defaults. (Setting `buttons: []` would leave
// the override defined and still spread an empty buttons[] over the global
// CTA — same bug shape.)
//
// ── Modes ────────────────────────────────────────────────────────────────────
//
// Default (no flags):   Dry-run (no mutation)
//   --apply:            Live (mutates)
//
// No --reverse mode: this cleanup drops malformed data with no information
// content. There is nothing to restore.
//
// ── Idempotency ──────────────────────────────────────────────────────────────
//
// After a successful run, matched docs have no ctaFormOverride defined; the
// match criterion no longer fires for them; re-running is a no-op.
//
// ── Logging ──────────────────────────────────────────────────────────────────
//
// Per-doc output captures `_id`, `_type`, `_rev` (pre-mutation revision for
// rollback reference), and the buttons[] payload that motivated the cleanup.
//
// ── Run ──────────────────────────────────────────────────────────────────────
//
// From the studio directory:
//   Dry-run (default):
//     npx sanity exec migrations/cleanup-empty-ctaFormOverride.ts --with-user-token
//   Live (after dry-run confirms expected scope):
//     npx sanity exec migrations/cleanup-empty-ctaFormOverride.ts --with-user-token -- --apply
//
// The `-- --apply` separator is required because `sanity exec` swallows its
// own flags otherwise; everything after `--` is forwarded to the script.

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

type CtaButton = {
  title?: string | null
  url?: string | null
  variant?: string | null
}

type CtaFormOverride = {
  buttons?: CtaButton[] | null
}

type DocWithOverride = {
  _id: string
  _type: string
  _rev: string
  ctaFormOverride?: CtaFormOverride | null
}

const args = process.argv.slice(2)
const isApply = args.includes('--apply')

function isEmptyButton(btn: CtaButton | null | undefined): boolean {
  if (!btn) return true
  return !btn.title && !btn.url
}

function isEmptyOverride(override: CtaFormOverride | null | undefined): boolean {
  if (!override) return false
  const buttons = override.buttons
  if (!Array.isArray(buttons)) return false
  // Empty array OR every entry empty (title=null AND url=null) → empty override.
  return buttons.length === 0 || buttons.every(isEmptyButton)
}

async function main() {
  const modeLabel = isApply
    ? 'APPLY (will unset ctaFormOverride on matched docs)'
    : 'DRY RUN (no mutations)'

  // Pull every doc with ctaFormOverride defined; filter to the empty-buttons
  // shape in-process. Single GROQ catches all document types that carry
  // ctaFormOverride (19 doc types per the Phase 4 migration scope).
  const docs = await client.fetch<DocWithOverride[]>(
    `*[defined(ctaFormOverride)]{
      _id,
      _type,
      _rev,
      ctaFormOverride{
        buttons[]{title, url, variant}
      }
    }`,
  )

  const matches = docs.filter((d) => isEmptyOverride(d.ctaFormOverride))

  console.log(`Found ${docs.length} document(s) with ctaFormOverride defined`)
  console.log(`Matched ${matches.length} with empty buttons[] shape`)
  console.log(`Mode: ${modeLabel}`)
  console.log()

  let mutated = 0
  let errored = 0

  for (const doc of matches) {
    try {
      console.log(`  → ${doc._id}  [_type=${doc._type}, _rev=${doc._rev}]`)
      console.log(`     buttons[]: ${JSON.stringify(doc.ctaFormOverride?.buttons ?? null)}`)

      if (isApply) {
        await client.patch(doc._id).unset(['ctaFormOverride']).commit()
        console.log(`     ✓ unset ctaFormOverride`)
      } else {
        console.log(`     (dry-run — would unset ctaFormOverride)`)
      }
      mutated++
    } catch (err) {
      errored++
      console.error(`  ✗ ${doc._id}  [_type=${doc._type}] — ERROR:`, err)
    }
  }

  console.log()
  console.log(`Summary:`)
  console.log(`  Total scanned:      ${docs.length}`)
  console.log(`  Matched:            ${matches.length}`)
  console.log(`  ${isApply ? 'Cleaned' : 'Would clean'}:           ${mutated}`)
  console.log(`  Errored:            ${errored}`)

  if (!isApply && mutated > 0) {
    console.log()
    console.log(`This was a DRY RUN. Re-run with -- --apply to commit mutations.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
