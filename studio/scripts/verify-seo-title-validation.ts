/**
 * Outcome check for the SEO Title validation ruling (operator, 2026-07-26):
 * LENGTH WARNS AND NEVER BLOCKS, and the 60 measures the RENDERED title.
 *
 * Run: npm run verify:seo-title   (from studio/)
 *
 * This is not a diff check. It mounts the REAL `seoTitleValidation` on a
 * document type and runs Sanity's REAL `validateDocument`, then asserts on the
 * markers that come back — the same code path Studio uses to decide whether a
 * save is allowed. Nothing about the rule is re-implemented here.
 *
 * WHAT "the right thing" MEANS CHANGED ON 2026-07-26, and this script changed
 * with it. For a few hours the field was a FRAGMENT and the browser appended
 * ` - <firm name>`, so the rule fetched the firm name and measured the sum —
 * and this script asserted a 40-character field warned at 63. TITLE-1 then made
 * a stored value the COMPLETE title with nothing appended, so a 40-character
 * field is a 40-character title and must NOT warn. The first case below is that
 * exact inversion, kept because it is the one most likely to be "fixed" back.
 *
 * Exits non-zero on any failed expectation, so it can be wired into CI.
 *
 * Detected by: this script. It is the only check that exercises the Studio
 * half; the tool half is covered by `_shared/__tests__/test_seo_title.py` in
 * the platform repo.
 */

// Sanity's validator uses a requestIdleCallback shim that reaches for
// `window`. Supplying the two timer methods it actually calls is enough to
// run the real validator in node; nothing about validation is stubbed.
;(globalThis as never as {window: unknown}).window = {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (h: never) => clearTimeout(h),
}

import {createSchema, validateDocument} from 'sanity'
import {seoTitleValidation} from '../schemas/seoTitle.ts'

const schema = createSchema({
  name: 'probe',
  types: [{
    name: 'probePage',
    type: 'document',
    fields: [{name: 'seoTitle', type: 'string', validation: seoTitleValidation}],
  }] as never,
})

// The validator no longer reads the dataset at all (TITLE-1: nothing is
// appended, so there is no firm name to fetch). The client stub stays only
// because `validateDocument` requires one.
const fakeClient = {fetch: async () => null, withConfig: () => fakeClient} as never
const getClient = () => fakeClient

type Marker = {level?: string; item?: {message?: string}}

async function markersFor(seoTitle: string | undefined): Promise<Marker[]> {
  const doc = {
    _id: 'probe-1', _type: 'probePage',
    _createdAt: '2026-07-26T00:00:00Z', _updatedAt: '2026-07-26T00:00:00Z', _rev: 'x',
    ...(seoTitle === undefined ? {} : {seoTitle}),
  }
  const workspace = {
    schema,
    i18n: {t: (k: string) => k, loadNamespaces: async () => undefined},
    getClient,
  } as never
  return (await validateDocument({document: doc as never, workspace, getClient} as never)) as Marker[]
}

let failures = 0

async function expectLevels(
  label: string,
  seoTitle: string | undefined,
  want: {errors: number; warnings: number},
) {
  const markers = await markersFor(seoTitle)
  const errors = markers.filter((m) => m.level === 'error')
  const warnings = markers.filter((m) => m.level === 'warning')
  const ok = errors.length === want.errors && warnings.length === want.warnings
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  console.log(`      title=${seoTitle?.length ?? 0} chars ` +
              `errors=${errors.length} (want ${want.errors}) ` +
              `warnings=${warnings.length} (want ${want.warnings})`)
  for (const m of markers) console.log(`      ${m.level}: ${m.item?.message ?? ''}`)
}

// 40 characters IS the whole title under TITLE-1. Nothing is appended, so
// nothing to warn about — even though this same value warned earlier today.
await expectLevels(
  'field 40 — the whole title, under the limit, silent',
  'Minnesota Appellate Litigation Attorneys',
  {errors: 0, warnings: 0},
)

// 82-char field. The old rule REFUSED THE SAVE. It must not any more.
await expectLevels(
  'title 82 — warns, and no longer blocks the save',
  'Minnesota Appellate and Post-Conviction Litigation Attorneys Serving Ramsey County',
  {errors: 0, warnings: 1},
)

await expectLevels('short title — no markers at all', 'Appeals', {errors: 0, warnings: 0})

// THE OPTIONAL-NESS PIN (item 128, ruled 2026-08-07, landed 2026-08-09).
// This case asserted `{errors: 1}` until that day, and it is the assertion the
// ruling left behind: `required()` was an error, so Studio refused to save a
// blank SEO Title while TITLE-1 called a blank one the case where the composed
// formula runs. The ruling was that STUDIO GIVES. Run against the edited schema
// before this line changed, the old assertion went red here — which is what
// proves the drop reached Sanity's real validator rather than only the source.
//
// TWO SHAPES, because they are different states and only the second fails if
// `required()` ever comes back: a field absent from the document, and a field
// explicitly saved as an empty string. An operator clearing the input in Studio
// produces the second.
await expectLevels('empty — optional, no error and no warning', undefined, {errors: 0, warnings: 0})
await expectLevels('cleared to an empty string — same, still no error', '', {errors: 0, warnings: 0})

console.log(failures === 0 ? '\nAll expectations met.' : `\n${failures} expectation(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
