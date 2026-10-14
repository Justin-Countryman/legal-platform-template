/**
 * verify-case-results — the case results CMS's schema, by outcome.
 *
 * Run: npm run verify:case-results   (from studio/, via `sanity exec` because the
 * schema imports .tsx inputs)
 *
 * Monorepo backlog 454 (WS-CASE-RESULTS-DESIGN-2026-10-13.md §11, ruled by Justin
 * 2026-10-14): a case result is a card, and a page only when its switch is on. This
 * mounts the REAL compiled schema and runs Sanity's REAL `validateDocument` and the
 * fields' own `hidden` callbacks, the code paths Studio uses, and asserts:
 *
 *   1. nothing blocks Publish: no error-level marker on any document here, however
 *      empty (monorepo [R-162]);
 *   2. a card needs its Result, Case Type and Area of Law (warnings), never a
 *      summary or a year;
 *   3. the page's fields show only while the switch is on, and are asked for only
 *      then;
 *   4. a result in the Headline, SEO title or meta description is flagged
 *      ([R-702] rule 7), the case named without it is not;
 *   5. the address is `case-results/` and one name;
 *   6. the index page document exists, publishes empty, and its address is fixed.
 *
 * Exits non-zero on any failed expectation. Detected by: itself (CI studio job).
 */

;(globalThis as never as {window: unknown}).window = {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (h: never) => clearTimeout(h),
}

import {createSchema, validateDocument, type ObjectSchemaType} from 'sanity'
import {schemaTypes} from '../schemas/index.ts'
import {resultClaimIn} from '../schemas/documents/caseResult.ts'
import {INDEX_SINGLETON_IDS} from '../singletons.ts'

const schema = createSchema({name: 'verify', types: schemaTypes as never})
const fakeClient = {fetch: async () => null, withConfig: () => fakeClient} as never
const getClient = () => fakeClient
type Marker = {level?: string; path?: unknown[]; item?: {message?: string}}

let failures = 0
function check(ok: boolean, label: string, detail = ''): void {
  if (!ok) failures++
  console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}${detail && !ok ? `\n      ${detail}` : ''}`)
}

async function markers(doc: Record<string, unknown>): Promise<Marker[]> {
  const document = {_id: 'probe', _createdAt: '2026-10-14T00:00:00Z', _updatedAt: '2026-10-14T00:00:00Z', _rev: 'x', ...doc}
  const workspace = {schema, i18n: {t: (k: string) => k, loadNamespaces: async () => undefined}, getClient} as never
  const all = (await validateDocument({document: document as never, workspace, getClient} as never)) as Marker[]
  // Two markers this harness makes, never the schema: a slug's uniqueness check and a reference's existence
  // check both ask a real client, and the stub here answers nothing (verify-hero-alt-validation.ts says the same).
  return all.filter((m) => (m as {code?: string}).code !== 'slug.not-unique' && !(m.item?.message ?? '').includes("reading 'request'"))
}
const fieldOf = (m: Marker) => String((m.path ?? [])[0] ?? '')
const errors = (ms: Marker[]) => ms.filter((m) => m.level === 'error')
const warnedFields = (ms: Marker[]) => [...new Set(ms.filter((m) => m.level === 'warning').map(fieldOf))].sort()

const AREA = {_type: 'reference', _ref: 'practiceArea-family-law'}
const CARD = {_type: 'caseResult', amount: 'Sole Custody Awarded', caseType: 'Child Custody', areaOfLaw: AREA}
const BODY = [{_type: 'block', _key: 'b', style: 'normal', markDefs: [], children: [{_type: 'span', _key: 's', text: 'The facts.', marks: []}]}]
const PAGE = {...CARD, hasPage: true, title: 'Custody Modification, Dakota County', slug: {_type: 'slug', current: 'case-results/custody-modification-dakota-county'}, body: BODY}

// ── 1 and 2: the card ────────────────────────────────────────────────────────
{
  const empty = await markers({_type: 'caseResult'})
  check(errors(empty).length === 0, 'an empty case result has no error: nothing blocks Publish', JSON.stringify(errors(empty)))
  check(JSON.stringify(warnedFields(empty)) === JSON.stringify(['amount', 'areaOfLaw', 'caseType']),
    'an empty card is asked for its Result, Case Type and Area of Law, and nothing else', warnedFields(empty).join(', '))
  const card = await markers(CARD)
  check(card.length === 0, 'a card with a Result, a Case Type and an Area of Law, and no page, is complete', JSON.stringify(card))
}

// ── 3: the page's fields, by the switch ──────────────────────────────────────
{
  const on = await markers({...CARD, hasPage: true})
  check(errors(on).length === 0, 'a page switched on with nothing filled has no error', JSON.stringify(errors(on)))
  check(JSON.stringify(warnedFields(on)) === JSON.stringify(['body', 'slug', 'title']),
    'a page switched on is asked for its Headline, address and write-up', warnedFields(on).join(', '))
  const page = await markers(PAGE)
  check(page.length === 0, 'a page with its Headline, address and write-up is complete', JSON.stringify(page))

  const type = schema.get('caseResult') as ObjectSchemaType
  const pageFields = ['title', 'slug', 'navLabel', 'body', 'seoTitle', 'metaDescription', 'ogTitle', 'ogDescription',
    'ogImageOverride', 'noIndex', 'noFollow', 'canonicalUrl']
  const hiddenWith = (field: string, parent: Record<string, unknown>) => {
    const hidden = type.fields.find((f) => f.name === field)?.type.hidden
    return typeof hidden === 'function' ? hidden({document: parent, parent, value: undefined, currentUser: null} as never) : hidden
  }
  for (const f of pageFields) {
    check(hiddenWith(f, {...CARD}) === true && hiddenWith(f, {...CARD, hasPage: true}) === false,
      `${f} shows only while the page is switched on`)
  }
  for (const f of ['amount', 'caseType', 'caption', 'year', 'areaOfLaw', 'practiceArea', 'featured', 'hasPage']) {
    check(!hiddenWith(f, {...CARD}) && !hiddenWith(f, {...CARD, hasPage: true}), `${f} always shows`)
  }
}

// ── 4: no result in a headline, a search title or a description ──────────────
{
  for (const [text, claim] of [
    ['$1.5 Million Settlement for a Missed Diagnosis', '$1.5 Million'],
    ['Charges Dismissed in Hennepin County', 'Dismissed'],
    ['Client Found Not Guilty', 'Not Guilty'],
    ['Asylum Granted Within 30 Days', 'Granted'],
    ['$250,000 for a Rear-End Collision', '$250,000'],
  ] as const) {
    check(resultClaimIn(text)?.toLowerCase() === claim.toLowerCase(), `"${text}" is flagged as a result (${claim})`, String(resultClaimIn(text)))
  }
  for (const text of ['Missed Cancer Diagnosis, Hennepin County', 'Felony DWI, Anoka County', 'Chapter 7 Bankruptcy', 'A $500 Fine']) {
    check(resultClaimIn(text) === null, `"${text}" is not flagged`, String(resultClaimIn(text)))
  }
  const flagged = await markers({...PAGE, title: '$1.5 Million Settlement', seoTitle: 'Charges Dismissed', metaDescription: 'Not guilty on all counts.'})
  check(errors(flagged).length === 0, 'a result in the page’s headline fields never blocks Publish')
  check(JSON.stringify(warnedFields(flagged)) === JSON.stringify(['metaDescription', 'seoTitle', 'title']),
    'a result in the Headline, SEO title and meta description is a warning on each', warnedFields(flagged).join(', '))
}

// ── 5: the address ───────────────────────────────────────────────────────────
{
  for (const [current, ok] of [
    ['case-results/custody-modification-dakota-county', true],
    ['case-results/a/b', false],
    ['results/custody', false],
    ['case-results/Custody', false],
  ] as const) {
    const ms = await markers({...PAGE, slug: {_type: 'slug', current}})
    check((warnedFields(ms).length === 0) === ok, `the address ${current} is ${ok ? 'accepted' : 'flagged'}`, warnedFields(ms).join(', '))
  }
}

// ── 6: the index page ────────────────────────────────────────────────────────
{
  const index = schema.get('caseResultIndex') as ObjectSchemaType | undefined
  check(Boolean(index), 'the caseResultIndex document type exists')
  check((INDEX_SINGLETON_IDS as Record<string, string>).caseResultIndex === 'caseResultIndex-case-results',
    'the index page is one document, caseResultIndex-case-results (studio/singletons.ts)')
  if (index) {
    // As the Studio makes it: the pinned pane creates the document with its fixed address filled.
    const empty = await markers({_type: 'caseResultIndex', slug: {_type: 'slug', current: 'case-results'}})
    check(errors(empty).length === 0, 'a new index page has no error', JSON.stringify(errors(empty)))
    const slug = index.fields.find((f) => f.name === 'slug')
    check((slug?.type as {readOnly?: unknown}).readOnly === true &&
      JSON.stringify((slug?.type as {initialValue?: unknown}).initialValue) === JSON.stringify({current: 'case-results'}),
      'the index page’s address is fixed at case-results')
  }
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
