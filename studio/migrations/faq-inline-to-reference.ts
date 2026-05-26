// One-time migration: promotes inline `faqItem` objects to standalone faqItem
// documents and replaces the inline arrays with reference arrays.
//
// 5 host doc-type fields change shape (inline-object array → reference array):
//   practiceArea.faqItems      (faqItems[])
//   geoPracticeArea.faqItems   (faqItems[])
//   serviceAreaPage.faqItems   (faqItems[])
//   faqPage.faqItems           (faqItems[])
//   faqSection.questions       (questions[])  ← field is `questions`, not `faqItems`
//
// For each inline {question, answer} on a host doc, the script:
//   1. Allocates a unique slug from the question (counter-suffixed on collisions)
//   2. Creates a standalone `faqItem` doc with category='general' (operator
//      recategorizes post-migration per BI doctrine — flagged in CS-DESIGN-SYSTEM.md)
//   3. Replaces the inline entry on the host with a `{_type:'reference', _ref:<new id>}`
//
// Existing references in the array (if any) are preserved in original position.
//
// ── Modes ────────────────────────────────────────────────────────────────────
//
// Default (no flags):           Dry-run forward (inline → refs)
//   --apply:                    Live forward (mutates: creates docs + patches host arrays)
//   --reverse:                  Dry-run reverse (refs → inline; faqItem docs orphaned, not deleted)
//   --reverse --apply:          Live reverse (mutates back — emergency rollback)
//
// ── Safety guards ────────────────────────────────────────────────────────────
//
// Forward live mode (`--apply` without `--reverse`) refuses to run unless
//   `Clients/henningson-snoxell-ltd/audits/WS-FAQ-Migration/dry-run-report.md`
// exists. Reverse live mode (`--reverse --apply`) refuses to run unless
//   `.../audits/WS-FAQ-Migration/migration-log.md`
// exists. Same audit-folder discipline as migrate-ctaFormOverride-buttons.ts.
//
// ── Idempotency ──────────────────────────────────────────────────────────────
//
// Forward mode skips host docs whose FAQ array contains zero inline items
// (all-empty or all-refs). After a successful forward run, re-running is a
// no-op for the same dataset.
//
// Reverse mode skips host docs whose FAQ array contains zero references.
//
// ── Logging ──────────────────────────────────────────────────────────────────
//
// Per-doc output captures `_id`, `_type`, `_rev` (pre-mutation revision for
// rollback reference), the count of inline items migrated vs. existing refs
// preserved, the new faqItem doc IDs created, and the mutation status
// (`dry-run` / `applied` / `skipped` / `errored`).
//
// ── Run ──────────────────────────────────────────────────────────────────────
//
// From the studio directory:
//   Dry-run forward (default):
//     npx sanity exec migrations/faq-inline-to-reference.ts --with-user-token
//   Live forward (after dry-run-report.md exists):
//     npx sanity exec migrations/faq-inline-to-reference.ts --with-user-token -- --apply
//   Dry-run reverse:
//     npx sanity exec migrations/faq-inline-to-reference.ts --with-user-token -- --reverse
//   Live reverse (after migration-log.md exists — emergency rollback only):
//     npx sanity exec migrations/faq-inline-to-reference.ts --with-user-token -- --reverse --apply

import {getCliClient} from 'sanity/cli'
import {existsSync} from 'fs'
import {resolve} from 'path'

const client = getCliClient({apiVersion: '2024-01-01'})

// ─── Types ────────────────────────────────────────────────────────────────────

type InlineFaqItem = {
  _type: 'faqItem'
  _key: string
  question?: string | null
  answer?: unknown[] | null
}

type FaqItemRef = {
  _type: 'reference'
  _key: string
  _ref: string
}

type FaqEntry = InlineFaqItem | FaqItemRef

type HostDoc = {
  _id: string
  _type: string
  _rev: string
  faqItems?: FaqEntry[] | null
  questions?: FaqEntry[] | null
}

const FIELD_BY_TYPE: Record<string, 'faqItems' | 'questions'> = {
  practiceArea: 'faqItems',
  geoPracticeArea: 'faqItems',
  serviceAreaPage: 'faqItems',
  faqPage: 'faqItems',
  faqSection: 'questions',
}

const DEFAULT_CATEGORY = 'general' // operator recategorizes post-migration

// ─── Pure helpers (also covered by tests on the site side) ────────────────────
// Mirror of these functions lives in
//   site/lib/sanity/__tests__/faq-migration-logic.test.ts
// for vitest coverage (the studio workspace doesn't currently host vitest).
// Source of truth for live migration is THIS file; if the helpers change,
// update the mirror in lockstep.

export function slugifyQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // strip punctuation
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') // collapse multiple dashes
    .slice(0, 96)
    .replace(/-+$/, '') // trim trailing dashes after slice
}

export function isInlineFaqItem(item: unknown): item is InlineFaqItem {
  if (!item || typeof item !== 'object') return false
  const i = item as {_type?: string; _ref?: unknown}
  // Inline faqItem objects have _type='faqItem' and no _ref (refs use _type='reference').
  return i._type === 'faqItem' && typeof i._ref !== 'string'
}

export function isFaqItemRef(item: unknown): item is FaqItemRef {
  if (!item || typeof item !== 'object') return false
  const i = item as {_type?: string; _ref?: unknown}
  return i._type === 'reference' && typeof i._ref === 'string'
}

export class SlugAllocator {
  private used = new Set<string>()

  allocate(question: string, fallback: string = 'faq'): string {
    const base = slugifyQuestion(question) || fallback
    if (!this.used.has(base)) {
      this.used.add(base)
      return base
    }
    let counter = 2
    while (this.used.has(`${base}-${counter}`)) counter++
    const candidate = `${base}-${counter}`
    this.used.add(candidate)
    return candidate
  }

  // For testing
  has(slug: string): boolean {
    return this.used.has(slug)
  }
}

// ─── Args + safety guards ─────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isApply = args.includes('--apply')
const isReverse = args.includes('--reverse')
const direction: 'forward' | 'reverse' = isReverse ? 'reverse' : 'forward'

const AUDIT_DIR = resolve(process.cwd(), '../audits/WS-FAQ-Migration')
const DRY_RUN_REPORT_PATH = resolve(AUDIT_DIR, 'dry-run-report.md')
const MIGRATION_LOG_PATH = resolve(AUDIT_DIR, 'migration-log.md')

if (isApply && !isReverse) {
  if (!existsSync(DRY_RUN_REPORT_PATH)) {
    console.error('✗ Refusing to run live forward migration.')
    console.error(`  Expected dry-run report at: ${DRY_RUN_REPORT_PATH}`)
    console.error('')
    console.error('  Workflow:')
    console.error(
      '    1. npx sanity exec migrations/faq-inline-to-reference.ts --with-user-token > <audit-dir>/dry-run-report.md',
    )
    console.error('    2. Walkthrough gate review')
    console.error(
      '    3. npx sanity exec migrations/faq-inline-to-reference.ts --with-user-token -- --apply',
    )
    process.exit(2)
  }
}

if (isApply && isReverse) {
  if (!existsSync(MIGRATION_LOG_PATH)) {
    console.error('✗ Refusing to run live reverse migration.')
    console.error(`  Expected forward migration log at: ${MIGRATION_LOG_PATH}`)
    console.error("  Reverse mode rolls back a prior forward live run — without the log, there's nothing to roll back.")
    process.exit(2)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const modeLabel =
    direction === 'forward'
      ? isApply
        ? 'FORWARD APPLY (will mutate: inline faqItem → standalone docs + refs)'
        : 'FORWARD DRY RUN (no mutations)'
      : isApply
        ? 'REVERSE APPLY (will mutate: refs → inline faqItem; faqItem docs orphaned)'
        : 'REVERSE DRY RUN (no mutations)'

  // Pull every host doc that has FAQ data on either field name.
  const docs = await client.fetch<HostDoc[]>(
    `*[_type in ["practiceArea", "geoPracticeArea", "serviceAreaPage", "faqPage", "faqSection"]
      && (defined(faqItems) || defined(questions))] {
        _id,
        _type,
        _rev,
        faqItems,
        questions
      }`,
  )

  console.log(`Found ${docs.length} host doc(s) with FAQ data`)
  console.log(`Mode: ${modeLabel}`)
  console.log(`Direction: ${direction}`)
  console.log(`Apply: ${isApply}`)
  console.log()

  let mutated = 0
  let skipped = 0
  let errored = 0
  let totalInlineMigrated = 0
  let totalRefsCreated = 0
  let totalDocsCreated = 0
  const slugAllocator = new SlugAllocator()

  for (const doc of docs) {
    try {
      const fieldName = FIELD_BY_TYPE[doc._type]
      if (!fieldName) {
        skipped++
        continue
      }
      const items: FaqEntry[] = (doc[fieldName] ?? []) as FaqEntry[]
      const inlineItems = items.filter(isInlineFaqItem)
      const existingRefs = items.filter(isFaqItemRef)

      if (direction === 'forward') {
        if (inlineItems.length === 0) {
          console.log(
            `  - ${doc._id}  [_type=${doc._type}, _rev=${doc._rev}] — skipped (no inline items; ${items.length} entries, ${existingRefs.length} refs)`,
          )
          skipped++
          continue
        }

        // Build the per-inline-item migration plan: new faqItem doc + replacement ref.
        type PlanEntry = {
          inline: InlineFaqItem
          slug: string
          newDocId: string // real after create; placeholder in dry-run
        }
        const plan: PlanEntry[] = []
        for (const inline of inlineItems) {
          const question = inline.question ?? '(missing question)'
          const slug = slugAllocator.allocate(question, `faq-${doc._id.slice(-6)}`)
          let newDocId = `<dry-run:${slug}>`
          if (isApply) {
            const created = await client.create({
              _type: 'faqItem',
              question: inline.question ?? '',
              answer: inline.answer ?? [],
              category: DEFAULT_CATEGORY,
              slug: {_type: 'slug', current: slug},
            })
            newDocId = created._id
            totalDocsCreated++
          }
          plan.push({inline, slug, newDocId})
        }

        // Build the new array: preserve original order; replace each inline entry
        // with its reference; preserve existing refs in original position.
        let planIndex = 0
        const newArray: FaqEntry[] = items.map((item) => {
          if (isInlineFaqItem(item)) {
            const entry = plan[planIndex++]
            return {
              _type: 'reference',
              _key: item._key,
              _ref: entry.newDocId,
            }
          }
          return item
        })

        if (isApply) {
          await client
            .patch(doc._id)
            .set({[fieldName]: newArray})
            .commit({autoGenerateArrayKeys: false})
        }

        totalInlineMigrated += inlineItems.length
        totalRefsCreated += inlineItems.length

        console.log(`  → ${doc._id}  [_type=${doc._type}, _rev=${doc._rev}]`)
        console.log(
          `     migrated ${inlineItems.length} inline → refs; preserved ${existingRefs.length} existing refs`,
        )
        for (const p of plan) {
          const qPreview = (p.inline.question ?? '').slice(0, 60)
          console.log(`     • "${qPreview}"  →  ${p.newDocId}  (slug=${p.slug})`)
        }
        console.log(`     status: ${isApply ? 'applied' : 'dry-run'}`)
        mutated++
      } else {
        // ── Reverse ──
        if (existingRefs.length === 0) {
          console.log(
            `  - ${doc._id}  [_type=${doc._type}, _rev=${doc._rev}] — skipped (no refs; ${items.length} entries, ${inlineItems.length} inline)`,
          )
          skipped++
          continue
        }

        // Resolve each ref to fetch question + answer for inlining.
        const refIds = existingRefs.map((r) => r._ref)
        const resolved = await client.fetch<
          Array<{_id: string; question?: string; answer?: unknown[]}>
        >(`*[_id in $ids]{_id, question, answer}`, {ids: refIds})
        const byId = new Map(resolved.map((r) => [r._id, r]))

        const newArray: FaqEntry[] = items.map((item) => {
          if (isFaqItemRef(item)) {
            const src = byId.get(item._ref)
            return {
              _type: 'faqItem',
              _key: item._key,
              question: src?.question ?? '',
              answer: (src?.answer as unknown[]) ?? [],
            } as InlineFaqItem
          }
          return item
        })

        if (isApply) {
          await client
            .patch(doc._id)
            .set({[fieldName]: newArray})
            .commit({autoGenerateArrayKeys: false})
        }

        console.log(`  ← ${doc._id}  [_type=${doc._type}, _rev=${doc._rev}]`)
        console.log(
          `     reversed ${existingRefs.length} refs → inline; preserved ${inlineItems.length} existing inline`,
        )
        console.log(`     status: ${isApply ? 'applied' : 'dry-run'}`)
        console.log(`     NOTE: faqItem documents are orphaned, not deleted, in reverse mode.`)
        console.log(`     Delete them manually post-rollback if desired.`)
        mutated++
      }
    } catch (err) {
      errored++
      console.error(`  ✗ ${doc._id} — ERRORED:`, err)
    }
  }

  console.log()
  console.log('─── Summary ───────────────────────────────────────────────────')
  console.log(`  Mode: ${modeLabel}`)
  console.log(`  Direction: ${direction}`)
  console.log(`  Apply: ${isApply}`)
  console.log(`  Host docs scanned: ${docs.length}`)
  console.log(`  Host docs mutated: ${mutated}`)
  console.log(`  Host docs skipped: ${skipped}`)
  console.log(`  Host docs errored: ${errored}`)
  if (direction === 'forward') {
    console.log(`  Inline items migrated: ${totalInlineMigrated}`)
    console.log(`  References created on host docs: ${totalRefsCreated}`)
    console.log(`  faqItem documents created: ${totalDocsCreated}${isApply ? '' : ' (dry-run — no actual creates)'}`)
  }
  console.log()
  if (errored > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
