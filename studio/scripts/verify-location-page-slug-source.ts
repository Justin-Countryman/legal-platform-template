/**
 * Outcome check for the `locationPage` Generate button.
 *
 * Run: npm run verify:location-slug   (from studio/)
 *
 * SLUG-1 (`BI/rules/urls.md`) and TITLE-11 (`BI/rules/page-titles.md`) rule the
 * slug `{city}-law-firm` while NAME-4 rules the Name `{city} Law Office`. The
 * field carried `options: {source: 'title'}` until 2026-08-10, so the button
 * produced `{city}-law-office`: an operator who followed the field's own
 * instruction got a URL contradicting three rules and `location_page.py`, and
 * the row's detector cell reads `nothing`, so nothing on the platform noticed.
 *
 * This runs the REAL source function, and it also asserts that the schema field
 * still WIRES it — a revert to `source: 'title'` would otherwise leave this file
 * green while testing a function nothing calls.
 *
 * THE BUILD PATH IS NOT COVERED HERE AND DOES NOT NEED TO BE. Site-Build's
 * `page_creation.py` and Site-Prep's shell writer both take the address from the
 * `CS-SITEMAP.csv` cell and derive nothing from a title, checked 2026-08-10.
 * This defect was Studio-only.
 *
 * Exits non-zero on any failed expectation, so it can be wired into CI.
 *
 * Detected by: this script.
 */

import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

import {locationPageSlugSource} from '../schemas/locationPageSlug.ts'

const failures: string[] = []

function expect(label: string, actual: unknown, wanted: unknown) {
  const ok = actual === wanted
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}: ${JSON.stringify(actual)}`)
  if (!ok) failures.push(`${label}: wanted ${JSON.stringify(wanted)}, got ${JSON.stringify(actual)}`)
}

const stubbedCity = (city: unknown) => ({getClient: () => ({fetch: async () => city})})
const ref = {locationRef: {_ref: 'location-1'}}

expect('a one-word city', await locationPageSlugSource(ref, stubbedCity('Woodbury')), 'woodbury-law-firm')
expect('a two-word city', await locationPageSlugSource(ref, stubbedCity('Mendota Heights')), 'mendota-heights-law-firm')
expect('a city with punctuation', await locationPageSlugSource(ref, stubbedCity("O'Fallon")), 'ofallon-law-firm')

// The absent-value cases. An empty answer leaves the slug field empty, which its
// own `required().error()` then blocks — the posture `BI-FOUNDATIONS.md` gives a
// tool that cannot know: leave it absent rather than derive a placeholder that
// create-only would make permanent.
expect('no location record set', await locationPageSlugSource({}, stubbedCity('Woodbury')), '')
expect('a record with no city', await locationPageSlugSource(ref, stubbedCity('')), '')
expect('a record that does not resolve', await locationPageSlugSource(ref, stubbedCity(null)), '')

// The ruled divergence, asserted from the other side so a future reader does not
// "align" the two fields.
expect(
  'slugifying the Page Title does NOT produce the slug',
  'Woodbury Law Office'.toLowerCase().replace(/\s+/g, '-') === 'woodbury-law-firm',
  false,
)

// The wiring. Read as text rather than imported, because the document schema
// pulls in a `.tsx` input component that node cannot resolve.
const here = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(here, '../schemas/documents/locationPage.ts'), 'utf8')
// Comments stripped first: this file's own account of the defect quotes the old
// `source: 'title'`, and a naive scan would read the history as the code.
const code = schema.split('\n').filter((l) => !l.trimStart().startsWith('//')).join('\n')
expect('the schema wires the function', code.includes('source: locationPageSlugSource'), true)
expect('the schema does not slugify a field name', /source:\s*'/.test(code), false)

if (failures.length) {
  console.error(`\n${failures.length} failed:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('\nlocationPage slug source: all cases pass')
