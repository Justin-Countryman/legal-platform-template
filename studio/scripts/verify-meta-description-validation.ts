/**
 * Outcome check for the Meta Description validation ruling (operator,
 * 2026-08-09): THE FIELD IS OPTIONAL, and the 160-character cap still blocks.
 *
 * Run: npm run verify:meta-description   (from studio/)
 *
 * This is not a diff check. It mounts the REAL `metaDescriptionValidation` on a
 * document type and runs Sanity's REAL `validateDocument`, then asserts on the
 * markers that come back — the same code path Studio uses to decide whether a
 * save is allowed. Nothing about the rule is re-implemented here.
 *
 * Sibling of `verify-seo-title-validation.ts` and deliberately NOT a copy of it:
 * that field's length half warns (TITLE-3, 2026-07-26) and this one errors,
 * because no ruling has moved it. The cases below assert the difference rather
 * than assuming the two fields match.
 *
 * Exits non-zero on any failed expectation, so it can be wired into CI.
 *
 * Detected by: this script. It is the only check that exercises the Studio half
 * of this field; nothing on the tool side writes it at all.
 */

// Sanity's validator uses a requestIdleCallback shim that reaches for
// `window`. Supplying the two timer methods it actually calls is enough to
// run the real validator in node; nothing about validation is stubbed.
;(globalThis as never as {window: unknown}).window = {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (h: never) => clearTimeout(h),
}

import {createSchema, validateDocument} from 'sanity'
import {META_DESCRIPTION_MAX, metaDescriptionValidation} from '../schemas/metaDescription.ts'

const schema = createSchema({
  name: 'probe',
  types: [{
    name: 'probePage',
    type: 'document',
    fields: [{name: 'metaDescription', type: 'text', rows: 3, validation: metaDescriptionValidation}],
  }] as never,
})

// `validateDocument` requires a client even when no rule reads the dataset,
// and none of these do.
const fakeClient = {fetch: async () => null, withConfig: () => fakeClient} as never
const getClient = () => fakeClient

type Marker = {level?: string; item?: {message?: string}}

async function markersFor(metaDescription: string | undefined): Promise<Marker[]> {
  const doc = {
    _id: 'probe-1', _type: 'probePage',
    _createdAt: '2026-08-09T00:00:00Z', _updatedAt: '2026-08-09T00:00:00Z', _rev: 'x',
    ...(metaDescription === undefined ? {} : {metaDescription}),
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
  metaDescription: string | undefined,
  want: {errors: number; warnings: number},
) {
  const markers = await markersFor(metaDescription)
  const errors = markers.filter((m) => m.level === 'error')
  const warnings = markers.filter((m) => m.level === 'warning')
  const ok = errors.length === want.errors && warnings.length === want.warnings
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  console.log(`      description=${metaDescription?.length ?? 0} chars ` +
              `errors=${errors.length} (want ${want.errors}) ` +
              `warnings=${warnings.length} (want ${want.warnings})`)
  for (const m of markers) console.log(`      ${m.level}: ${m.item?.message ?? ''}`)
}

// THE OPTIONAL-NESS PIN (ruled 2026-08-09). Doctrine — `BI/rules/page-naming.md`
// § Meta descriptions — says a blank cell renders no meta description at all,
// with no formula and no fallback rung on any page type. Studio refused to save
// that ruled outcome until this day.
//
// TWO SHAPES, because they are different states in Sanity and only the second
// fails if `required()` ever comes back: a field ABSENT from the document, and a
// field explicitly stored as an empty string. An operator clearing the input in
// Studio produces the second.
await expectLevels('empty — optional, no error and no warning', undefined, {errors: 0, warnings: 0})
await expectLevels('cleared to an empty string — same, still no error', '', {errors: 0, warnings: 0})

await expectLevels(
  'an ordinary description — no markers at all',
  'Saint Paul appellate attorneys handling post-conviction relief and civil appeals across Minnesota.',
  {errors: 0, warnings: 0},
)

// THE LENGTH HALF, PINNED AS AN ERROR ON PURPOSE. `seoTitle` warns here and this
// field does not, and nothing in the 2026-08-09 ruling changed that. If this case
// ever wants to be `{errors: 0, warnings: 1}`, that is a ruling and not a fix.
await expectLevels(
  `over ${META_DESCRIPTION_MAX} — still blocks the save, unlike the SEO Title`,
  'x'.repeat(META_DESCRIPTION_MAX + 1),
  {errors: 1, warnings: 0},
)

console.log(failures === 0 ? '\nAll expectations met.' : `\n${failures} expectation(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
