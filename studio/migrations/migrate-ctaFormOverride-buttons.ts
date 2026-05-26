// One-time migration: consolidates the per-page `ctaFormOverride` object's
// `primaryButton` and `secondaryButton` named slots into a single `buttons`
// array, mirroring the WS2 GlobalCta migration.
//
//   ctaFormOverride.primaryButton   → ctaFormOverride.buttons[0]
//   ctaFormOverride.secondaryButton → ctaFormOverride.buttons[1]
//
// `ctaFormOverride` is a per-document field of type `ctaFormSection` (an object)
// on 19 document types (aboutPage, attorneyIndex, attorneyPage, blogCategory,
// blogIndex, blogPost, eventIndex, eventPage, faqPage, generalPage,
// geoPracticeArea, homePage, locationPage, practiceArea, serviceAreaIndex,
// serviceAreaPage, staffIndex, staffPage, testimonialsPage). A single
// `*[defined(ctaFormOverride)]` query catches all of them.
//
// ── Modes ────────────────────────────────────────────────────────────────────
//
// Default (no flags):           Dry-run forward (named-slot → buttons[])
//   --apply:                    Live forward (mutates)
//   --reverse:                  Dry-run reverse (buttons[] → named-slot)
//   --reverse --apply:          Live reverse (mutates back — emergency rollback)
//
// ── Safety guards ────────────────────────────────────────────────────────────
//
// Forward live mode (`--apply` without `--reverse`) refuses to run unless
//   `Clients/henningson-snoxell-ltd/audits/WS-Outstanding-Phase-4/dry-run-report.md`
// exists relative to the project root. This enforces the workflow:
//   1. Run dry-run, capture output to audit folder
//   2. Walkthrough gate #2 review
//   3. Run live forward
//
// Reverse live mode (`--reverse --apply`) refuses to run unless
//   `.../audits/WS-Outstanding-Phase-4/migration-log.md`
// exists (proving the forward live migration was executed — otherwise reverse
// has nothing to roll back).
//
// ── Idempotency ──────────────────────────────────────────────────────────────
//
// Forward mode skips docs where neither `primaryButton` nor `secondaryButton`
// is populated. After a successful forward run, re-running is a no-op (those
// slots are unset, so the skip-criterion fires for every doc).
//
// Reverse mode skips docs where `buttons` is empty/absent. After a successful
// reverse run, re-running is a no-op.
//
// ── Logging ──────────────────────────────────────────────────────────────────
//
// Per-doc output captures `_id`, `_type`, `_rev` (pre-mutation revision for
// rollback reference), before/after JSON of the affected fields, and the
// mutation status (`dry-run` / `applied` / `skipped` / `errored`).
//
// ── Validation ───────────────────────────────────────────────────────────────
//
// Forward mode validates each computed buttons[] before patch:
//   - buttons.length <= 2 (matches the post-migration schema's Rule.max(2))
//   - each button has title OR url (matches toCtaItems consumer filter)
// Any validation failure is reported but the script does NOT halt — failures
// are flagged for walkthrough resolution.
//
// ── Run ──────────────────────────────────────────────────────────────────────
//
// From the studio directory:
//   Dry-run forward (default):
//     npx sanity exec migrations/migrate-ctaFormOverride-buttons.ts --with-user-token
//   Live forward (after dry-run-report.md exists):
//     npx sanity exec migrations/migrate-ctaFormOverride-buttons.ts --with-user-token -- --apply
//   Dry-run reverse:
//     npx sanity exec migrations/migrate-ctaFormOverride-buttons.ts --with-user-token -- --reverse
//   Live reverse (after migration-log.md exists — emergency rollback only):
//     npx sanity exec migrations/migrate-ctaFormOverride-buttons.ts --with-user-token -- --reverse --apply
//
// The `-- --apply` separator is required because `sanity exec` swallows its
// own flags otherwise; everything after `--` is forwarded to the script.

import {getCliClient} from 'sanity/cli'
import {existsSync} from 'fs'
import {resolve} from 'path'

const client = getCliClient({apiVersion: '2024-01-01'})

type CtaButton = {
  title?: string | null
  url?: string | null
  variant?: string | null
}

type CtaFormOverride = {
  primaryButton?: CtaButton | null
  secondaryButton?: CtaButton | null
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
const isReverse = args.includes('--reverse')
const direction: 'forward' | 'reverse' = isReverse ? 'reverse' : 'forward'

// ── Safety guards ─────────────────────────────────────────────────────────────

// Compute audit-folder path relative to cwd (typically studio/ when invoked
// via `npx sanity exec`). The studio dir sits at
//   Clients/henningson-snoxell-ltd/studio/
// and the audit folder at
//   Clients/henningson-snoxell-ltd/audits/WS-Outstanding-Phase-4/
const AUDIT_DIR = resolve(process.cwd(), '../audits/WS-Outstanding-Phase-4')
const DRY_RUN_REPORT_PATH = resolve(AUDIT_DIR, 'dry-run-report.md')
const MIGRATION_LOG_PATH = resolve(AUDIT_DIR, 'migration-log.md')

if (isApply && !isReverse) {
  if (!existsSync(DRY_RUN_REPORT_PATH)) {
    console.error('✗ Refusing to run live forward migration.')
    console.error(`  Expected dry-run report at: ${DRY_RUN_REPORT_PATH}`)
    console.error('  Run the dry-run first, capture output to that path, then re-run --apply.')
    console.error('')
    console.error('  Workflow:')
    console.error('    1. npx sanity exec migrations/migrate-ctaFormOverride-buttons.ts --with-user-token > <audit-dir>/dry-run-report.md')
    console.error('    2. Walkthrough gate #2 review')
    console.error('    3. npx sanity exec migrations/migrate-ctaFormOverride-buttons.ts --with-user-token -- --apply')
    process.exit(2)
  }
}

if (isApply && isReverse) {
  if (!existsSync(MIGRATION_LOG_PATH)) {
    console.error('✗ Refusing to run live reverse migration.')
    console.error(`  Expected forward migration log at: ${MIGRATION_LOG_PATH}`)
    console.error('  Reverse mode rolls back a prior forward live run — without the log, there\'s nothing to roll back.')
    process.exit(2)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPopulatedButton(btn: CtaButton | null | undefined): btn is CtaButton {
  if (!btn) return false
  return Boolean(btn.title || btn.url || btn.variant)
}

function normalizeButton(btn: CtaButton): CtaButton {
  // Defensive: strip extras Sanity might surface; keep only the contract fields
  return {
    title: btn.title ?? null,
    url: btn.url ?? null,
    variant: btn.variant ?? null,
  }
}

function validateButtons(buttons: CtaButton[]): {ok: boolean; issues: string[]} {
  const issues: string[] = []
  if (buttons.length > 2) {
    issues.push(`buttons.length=${buttons.length} exceeds Rule.max(2)`)
  }
  for (const [i, b] of buttons.entries()) {
    if (!b.title && !b.url) {
      issues.push(`buttons[${i}] has neither title nor url`)
    }
  }
  return {ok: issues.length === 0, issues}
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const modeLabel =
    direction === 'forward'
      ? isApply
        ? 'FORWARD APPLY (will mutate: named-slot → buttons[])'
        : 'FORWARD DRY RUN (no mutations)'
      : isApply
        ? 'REVERSE APPLY (will mutate: buttons[] → named-slot)'
        : 'REVERSE DRY RUN (no mutations)'

  // Pull every doc with a defined ctaFormOverride. Single GROQ catches all 19
  // document types in one pass; draft IDs (drafts.<id>) share the same _type
  // filter behavior, so drafts are included automatically.
  const docs = await client.fetch<DocWithOverride[]>(
    `*[defined(ctaFormOverride)]{
      _id,
      _type,
      _rev,
      ctaFormOverride{
        primaryButton{title, url, variant},
        secondaryButton{title, url, variant},
        buttons[]{title, url, variant}
      }
    }`,
  )

  console.log(`Found ${docs.length} document(s) with ctaFormOverride defined`)
  console.log(`Mode: ${modeLabel}`)
  console.log(`Direction: ${direction}`)
  console.log(`Apply: ${isApply}`)
  console.log()

  let mutated = 0
  let skipped = 0
  let errored = 0
  let validationFlags = 0

  for (const doc of docs) {
    try {
      const override = doc.ctaFormOverride ?? {}
      const hasPrimary = isPopulatedButton(override.primaryButton)
      const hasSecondary = isPopulatedButton(override.secondaryButton)
      const existingButtons = Array.isArray(override.buttons) ? override.buttons : []
      const hasButtons = existingButtons.length > 0

      if (direction === 'forward') {
        // Forward idempotency: skip if neither named slot is populated.
        if (!hasPrimary && !hasSecondary) {
          console.log(
            `  - ${doc._id}  [_type=${doc._type}, _rev=${doc._rev}] — skipped (no named slots; buttons.length=${existingButtons.length})`,
          )
          skipped++
          continue
        }

        const newButtons: CtaButton[] = []
        if (hasPrimary) newButtons.push(normalizeButton(override.primaryButton!))
        if (hasSecondary) newButtons.push(normalizeButton(override.secondaryButton!))

        const validation = validateButtons(newButtons)
        if (!validation.ok) {
          validationFlags++
          console.log(`  ⚠ ${doc._id}  [_type=${doc._type}] — VALIDATION FLAGS:`)
          for (const issue of validation.issues) {
            console.log(`      • ${issue}`)
          }
        }

        console.log(`  → ${doc._id}  [_type=${doc._type}, _rev=${doc._rev}]`)
        console.log(`     primaryButton:   ${JSON.stringify(override.primaryButton ?? null)}`)
        console.log(`     secondaryButton: ${JSON.stringify(override.secondaryButton ?? null)}`)
        console.log(`     buttons[] (new): ${JSON.stringify(newButtons)}`)

        if (isApply) {
          await client
            .patch(doc._id)
            .set({'ctaFormOverride.buttons': newButtons})
            .unset(['ctaFormOverride.primaryButton', 'ctaFormOverride.secondaryButton'])
            .commit()
          console.log(`     ✓ applied`)
        } else {
          console.log(`     (dry-run — no mutation)`)
        }
        mutated++
      } else {
        // direction === 'reverse'
        // Reverse idempotency: skip if buttons[] is empty.
        if (!hasButtons) {
          console.log(
            `  - ${doc._id}  [_type=${doc._type}, _rev=${doc._rev}] — skipped (no buttons[] entries)`,
          )
          skipped++
          continue
        }

        const newPrimary = existingButtons[0] ? normalizeButton(existingButtons[0]) : null
        const newSecondary = existingButtons[1] ? normalizeButton(existingButtons[1]) : null

        console.log(`  ← ${doc._id}  [_type=${doc._type}, _rev=${doc._rev}]`)
        console.log(`     buttons[]:                  ${JSON.stringify(existingButtons)}`)
        console.log(`     primaryButton (restored):   ${JSON.stringify(newPrimary)}`)
        console.log(`     secondaryButton (restored): ${JSON.stringify(newSecondary)}`)

        if (isApply) {
          // Build the patch — only set fields that have data to restore.
          let patch = client.patch(doc._id).unset(['ctaFormOverride.buttons'])
          if (newPrimary) patch = patch.set({'ctaFormOverride.primaryButton': newPrimary})
          if (newSecondary) patch = patch.set({'ctaFormOverride.secondaryButton': newSecondary})
          await patch.commit()
          console.log(`     ✓ reverted`)
        } else {
          console.log(`     (dry-run — no mutation)`)
        }
        mutated++
      }
    } catch (err) {
      errored++
      console.error(`  ✗ ${doc._id}  [_type=${doc._type}] — ERROR:`, err)
    }
  }

  console.log()
  console.log(`Summary:`)
  console.log(`  Total processed:    ${docs.length}`)
  console.log(`  ${direction === 'forward' ? 'Migrated' : 'Reverted'}:           ${mutated}${isApply ? '' : ' (would mutate)'}`)
  console.log(`  Skipped:            ${skipped}`)
  console.log(`  Errored:            ${errored}`)
  console.log(`  Validation flags:   ${validationFlags}`)
  if (!isApply && mutated > 0) {
    console.log()
    console.log(`This was a DRY RUN (${direction}). Re-run with -- ${isReverse ? '--reverse --apply' : '--apply'} to commit mutations.`)
  }
  if (validationFlags > 0) {
    console.log()
    console.log(`⚠ ${validationFlags} document(s) flagged with validation issues. Review before applying.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
