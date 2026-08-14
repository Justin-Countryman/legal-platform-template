/**
 * Outcome check for the hero alt-text ruling (operator, 2026-08-13):
 * ALT TEXT IS REQUIRED ONLY WHEN AN IMAGE ASSET EXISTS.
 *
 * Run: npm run verify:hero-alt   (from studio/)
 *
 * This is not a diff check. It mounts the REAL `heroAltField` on a document
 * type and runs Sanity's REAL `validateDocument`, then asserts on the markers
 * that come back — the same code path Studio uses to decide whether a publish
 * is allowed. Nothing about the rule is re-implemented here.
 *
 * WHY THIS EXISTS. The rule was `Rule.required().error(...)` with no condition,
 * and it blocked publish on a hero with no image at all — which is EVERY hero
 * out of the box, because `heroFitField` carries `initialValue: 'cover'` and
 * Sanity materialises the image object the moment the document exists. So the
 * schema created an empty image object and then refused to publish until
 * somebody described the image that was not there. **Not touching the field was
 * what created it.** An operator hit this on a live client, filled four alt
 * fields with "test" to get past it, and was still blocked by a fifth.
 *
 * THE FIRST CASE BELOW IS THE ONE THAT MATTERS and the one most likely to be
 * "fixed" back, because `Rule.required()` reads as obviously correct for alt
 * text. It is correct — on an image. On an empty object it is a demand to
 * describe nothing, and the only way past it is to type something, which
 * teaches the operator that alt text is a box to fill rather than a description.
 * The next alt text they write on a REAL image is likelier to be junk, and that
 * one reaches screen readers.
 *
 * Exits non-zero on any failed expectation, so it can be wired into CI.
 *
 * Detected by: this script.
 */

// Sanity's validator uses a requestIdleCallback shim that reaches for
// `window`. Supplying the two timer methods it actually calls is enough to
// run the real validator in node; nothing about validation is stubbed.
;(globalThis as never as {window: unknown}).window = {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (h: never) => clearTimeout(h),
}

import {createSchema, validateDocument} from 'sanity'
import {heroAltField} from '../schemas/objects/heroSurfaceFields.ts'

const schema = createSchema({
  name: 'probe',
  types: [
    {
      name: 'probeHero',
      type: 'document',
      fields: [
        {
          name: 'backgroundImage',
          type: 'image',
          fields: [heroAltField('hero background image')],
        },
      ],
    },
  ] as never,
})

const fakeClient = {fetch: async () => null, withConfig: () => fakeClient} as never
const getClient = () => fakeClient

type Marker = {level?: string; item?: {message?: string}}

async function markersFor(image: Record<string, unknown> | undefined): Promise<Marker[]> {
  const doc = {
    _id: 'probe-1',
    _type: 'probeHero',
    _createdAt: '2026-08-13T00:00:00Z',
    _updatedAt: '2026-08-13T00:00:00Z',
    _rev: 'x',
    ...(image === undefined ? {} : {backgroundImage: image}),
  }
  const workspace = {
    schema,
    i18n: {t: (k: string) => k, loadNamespaces: async () => undefined},
    getClient,
  } as never
  return (await validateDocument({document: doc as never, workspace, getClient} as never)) as Marker[]
}

let failures = 0

/**
 * Count ONLY the alt rule's own errors.
 *
 * Sanity's built-in asset-REFERENCE validator also runs here and fails with
 * "Cannot read properties of undefined (reading 'request')", because resolving a
 * reference needs a real client and this harness supplies a stub. That is an
 * artifact of the harness, not a schema defect, and it appears on every case
 * that carries an asset — so counting all errors would make the asset cases
 * un-assertable. The rule under test is the alt rule; the reference machinery
 * is not.
 */
const ALT_MESSAGE = 'Alt text is required for the'

async function expectErrors(
  label: string,
  image: Record<string, unknown> | undefined,
  want: number,
) {
  const markers = await markersFor(image)
  const altErrors = markers.filter(
    (m) => m.level === 'error' && (m.item?.message ?? '').includes(ALT_MESSAGE),
  )
  const ok = altErrors.length === want
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  console.log(`      alt errors=${altErrors.length} (want ${want})`)
  for (const m of altErrors) console.log(`      error: ${m.item?.message ?? ''}`)
}

const ASSET = {_type: 'reference', _ref: 'image-abc123-1200x800-jpg'}

// ── The regression this file exists for ──────────────────────────────────────
// An image object with `fit` but no asset. This is what the schema creates BY
// DEFAULT, via heroFitField's initialValue, before the operator touches
// anything. It must not block.
await expectErrors('empty image object (fit only, no asset) — must NOT demand alt', {fit: 'cover'}, 0)

// The same, with no fit either.
await expectErrors('empty image object ({}) — must NOT demand alt', {}, 0)

// The field absent entirely.
await expectErrors('no image field at all — must NOT demand alt', undefined, 0)

// ── The half that must keep working ──────────────────────────────────────────
await expectErrors('real asset, alt missing — MUST demand alt', {asset: ASSET, fit: 'cover'}, 1)
await expectErrors('real asset, alt empty string — MUST demand alt', {asset: ASSET, alt: ''}, 1)
await expectErrors('real asset, alt whitespace only — MUST demand alt', {asset: ASSET, alt: '   '}, 1)
await expectErrors('real asset, alt present — must pass', {asset: ASSET, alt: 'Firm lobby'}, 0)

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
