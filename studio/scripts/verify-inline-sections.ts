/**
 * verify-inline-sections — the homepage list's inline section objects, checked
 * on the COMPILED schema (Phase 10, 2026-09-14; monorepo WS-V1-PHASE10-DESIGN §4).
 *
 * Run: npm run verify:inline-sections   (from studio/, via `sanity exec` because
 * the schema imports .tsx inputs)
 *
 * What it pins, and why nothing else can:
 *
 *   1. Two names per shared section: the document under its bare name and an
 *      object under `<name>Inline`, both compiled, no duplicate type name, one
 *      field list (`fields({inline})`) so the two cannot drift except where the
 *      inline copy deliberately narrows (`name` and the practice-area mode).
 *   2. `homePage.canvas.of` lists the seven inline objects and the six retired
 *      block types, the six carrying `deprecated`. The Studio renders that
 *      badge; the extract, typegen and the field map all drop it, so the
 *      compiled schema is the only artifact that can be asserted.
 *   3. Every `hidden` and `validation` callback in a shared list reads
 *      `parent`, never `document`: called with a DECOY root document that says
 *      the opposite of the parent, the callback must follow the parent. Inside
 *      an array member `document` is the root `homePage`, so a `document`-scoped
 *      callback hides and warns wrongly there; this is the failure ADV-H found.
 *   4. `attorneySectionInline.mode` offers `all` and `manual` only, defaulting
 *      to `all`; `practiceAreaNavInline.mode` defaults to `allTopLevel`.
 *   5. `caseResultsSection`, the document that is exported but not registered
 *      in this release, still compiles when added, so the pair is real.
 *   6. `practiceAreaNavItem.featured` is reachable on the homepage (the inline
 *      practice-area section lives there) and on the section document.
 *
 * Exits non-zero on any failure. Detected by: itself (CI studio-build job).
 */

;(globalThis as never as {window: unknown}).window ??= {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (h: never) => clearTimeout(h),
}

import {createSchema, validateDocument, type ArraySchemaType, type ObjectSchemaType, type SanityDocument} from 'sanity'
import {schemaTypes} from '../schemas/index.ts'
import {caseResultsSection} from '../schemas/documents/sections/caseResultsSection.ts'

let failures = 0
function fail(msg: string): void {
  failures++
  console.log(`FAIL  ${msg}`)
}
function ok(msg: string): void {
  console.log(`ok    ${msg}`)
}

const PAIRS: Array<[doc: string, inline: string]> = [
  ['practiceAreaNav', 'practiceAreaNavInline'],
  ['attorneySection', 'attorneySectionInline'],
  ['badgesSection', 'badgesSectionInline'],
  ['testimonialsGrid', 'testimonialsGridInline'],
  ['featuredTestimonial', 'featuredTestimonialInline'],
  ['videoSection', 'videoSectionInline'],
]
const INLINE_ONLY = ['caseResultsSectionInline']
const RETIRED = ['narrativeBlock', 'differentiatorBlock', 'caseResultsBlock', 'attorneyHighlightBlock', 'badgesBlock', 'siloNavBlock']

// ─── 1. The schema compiles with two names per section and no duplicates ──────
const names = schemaTypes.map((t) => (t as {name: string}).name)
const dupes = names.filter((n, i) => names.indexOf(n) !== i)
if (dupes.length) fail(`duplicate type names in schemas/index.ts: ${dupes.join(', ')}`)
else ok(`${names.length} registered types, no duplicate name`)

const schema = createSchema({name: 'verify', types: schemaTypes as never})
const problems = schema._validation?.filter((g) => g.problems.some((p) => p.severity === 'error')) ?? []
if (problems.length) {
  for (const g of problems) fail(`schema problem at ${g.path.map((p) => p.name ?? p.kind).join('.')}: ${g.problems.map((p) => p.message).join('; ')}`)
} else ok('createSchema reports no error')

for (const [doc, inline] of PAIRS) {
  const d = schema.get(doc) as ObjectSchemaType | undefined
  const i = schema.get(inline) as ObjectSchemaType | undefined
  if (!d || d.jsonType !== 'object' || (d as {type?: {name?: string}}).type?.name !== 'document') fail(`${doc} is not a compiled document type`)
  if (!i || i.jsonType !== 'object' || (i as {type?: {name?: string}}).type?.name !== 'object') fail(`${inline} is not a compiled object type`)
  if (!d || !i) continue
  const docFields = new Set(d.fields.map((f) => f.name))
  const inlineFields = i.fields.map((f) => f.name)
  if (inlineFields.includes('name')) fail(`${inline} carries \`name\`, a document-only field`)
  const extra = inlineFields.filter((f) => !docFields.has(f))
  if (extra.length) fail(`${inline} carries fields the document lacks: ${extra.join(', ')}`)
  const missing = [...docFields].filter((f) => f !== 'name' && f !== 'practiceAreaPage' && !inlineFields.includes(f))
  if (missing.length) fail(`${inline} lacks document fields: ${missing.join(', ')}`)
  const previewFields = Object.values((i.preview?.select ?? {}) as Record<string, string>)
  if (previewFields.some((p) => p === 'name')) fail(`${inline} preview selects \`name\``)
  if (!previewFields.some((p) => p === 'heading' || p === 'layout')) fail(`${inline} preview selects neither heading nor layout`)
}
for (const inline of INLINE_ONLY) {
  const i = schema.get(inline) as ObjectSchemaType | undefined
  if (!i || i.jsonType !== 'object') fail(`${inline} is not a compiled object type`)
  else if (i.fields.some((f) => f.name === 'name')) fail(`${inline} carries \`name\``)
}
ok('six pairs and caseResultsSectionInline compile with the expected field sets')

// ─── 2. homePage.canvas.of: seven inline objects, six retired blocks with `deprecated`
const homePage = schema.get('homePage') as ObjectSchemaType
const canvas = homePage.fields.find((f) => f.name === 'canvas')?.type as ArraySchemaType | undefined
if (!canvas) fail('homePage.canvas missing')
else {
  const members = canvas.of.map((m) => ({name: m.name, deprecated: (m as {deprecated?: {reason: string}}).deprecated}))
  const expected = [...PAIRS.map(([, i]) => i), ...INLINE_ONLY, ...RETIRED].sort()
  const actual = members.map((m) => m.name).sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`canvas.of is ${actual.join(', ')}`)
  else ok(`canvas.of holds the thirteen members`)
  for (const m of members) {
    const retired = RETIRED.includes(m.name)
    if (retired && !m.deprecated?.reason?.includes('Phase 15')) fail(`${m.name} is not deprecated with a reason naming Phase 15`)
    if (!retired && m.deprecated) fail(`${m.name} is deprecated and must not be`)
  }
  ok('the six retired blocks carry `deprecated` naming Phase 15; the inline objects do not')
  const sections = homePage.fields.find((f) => f.name === 'sections')?.type as {deprecated?: {reason: string}} | undefined
  if (!sections?.deprecated?.reason?.includes('Phase 15')) fail('homePage.sections is not deprecated with a reason naming Phase 15')
  else ok('homePage.sections is deprecated')
}

// ─── 3. Callbacks follow `parent`, not `document` ─────────────────────────────
type HiddenFn = (ctx: {document: unknown; parent: unknown; value: unknown; currentUser: null}) => boolean
function hiddenOf(typeName: string, field: string): HiddenFn | undefined {
  const t = schema.get(typeName) as ObjectSchemaType
  const f = t.fields.find((x) => x.name === field)
  return f?.type.hidden as HiddenFn | undefined
}
const DECOY = {_id: 'homePage-home', _type: 'homePage', mode: 'manual', surface: 'light'}
const cases: Array<[type: string, field: string, parent: Record<string, unknown>, expectHidden: boolean]> = [
  ['practiceAreaNavInline', 'items', {mode: 'allTopLevel'}, true],
  ['practiceAreaNavInline', 'items', {mode: 'manual'}, false],
  ['practiceAreaNav', 'items', {mode: 'allTopLevel'}, true],
  ['attorneySectionInline', 'attorneys', {mode: 'all'}, true],
  ['attorneySectionInline', 'attorneys', {mode: 'manual'}, false],
  ['attorneySection', 'attorneys', {mode: 'all'}, true],
  ['attorneySection', 'practiceAreaPage', {mode: 'all'}, true],
  ['attorneySection', 'practiceAreaPage', {mode: 'practiceArea'}, false],
  ['practiceAreaNavInline', 'sectionBackgroundImage', {surface: 'image'}, false],
  ['practiceAreaNavInline', 'sectionBackgroundImage', {surface: 'dark'}, true],
  ['attorneySectionInline', 'sectionBackgroundImage', {surface: 'image'}, false],
  ['testimonialsGridInline', 'sectionBackgroundImage', {surface: 'image'}, false],
  ['featuredTestimonialInline', 'sectionBackgroundImage', {surface: 'image'}, false],
  ['caseResultsSectionInline', 'sectionBackgroundImage', {surface: 'image'}, false],
]
for (const [type, field, parent, expectHidden] of cases) {
  const fn = hiddenOf(type, field)
  if (!fn) { fail(`${type}.${field} has no hidden callback`); continue }
  // The decoy document says the opposite of the parent on every key it carries.
  const decoy = {...DECOY, ...Object.fromEntries(Object.entries(parent).map(([k, v]) => [k, v === 'manual' ? 'all' : v === 'image' ? 'light' : 'manual']))}
  const got = fn({document: decoy, parent, value: undefined, currentUser: null})
  if (got !== expectHidden) fail(`${type}.${field}.hidden read the document: parent ${JSON.stringify(parent)} gave ${got}`)
}
ok(`${cases.length} hidden callbacks follow parent under a decoy document`)

// Validation: a manual-mode inline member with no items warns; an allTopLevel
// one does not, whatever the root document says.
async function validationCases(): Promise<void> {
  const base = {_id: 'homePage-home', _type: 'homePage', _rev: 'r', _createdAt: '2026-01-01T00:00:00Z', _updatedAt: '2026-01-01T00:00:00Z', mode: 'allTopLevel'}
  const doc = (member: Record<string, unknown>): SanityDocument =>
    ({...base, canvas: [{_key: 'm', ...member}]}) as unknown as SanityDocument
  // The workspace shape extract-field-map.ts uses: schema, an identity i18n
  // and a client that answers nothing. The validator asks for the client up
  // front; no reference is resolved here, so `fetch` returning null is inert.
  // The placeholder project id is the one the template's scrub guard allows.
  const fakeClient = {fetch: async () => null, withConfig: () => fakeClient, config: () => ({projectId: 'offline-schema-extract', dataset: 'production'})} as never
  const getClient = () => fakeClient
  const workspace = {
    schema,
    i18n: {t: (k: string) => k, loadNamespaces: async () => undefined},
    getClient,
  } as never
  const run = (member: Record<string, unknown>) =>
    validateDocument({document: doc(member), workspace, getClient} as never) as Promise<Array<{path?: unknown[]; message?: string}>>
  const warnsOn = (markers: Array<{path?: unknown[]; message?: string}>, field: string) =>
    markers.some((m) => JSON.stringify(m.path ?? []).includes(`"${field}"`))
  const a = await run({_type: 'practiceAreaNavInline', mode: 'manual'})
  if (!warnsOn(a, 'items')) fail('practiceAreaNavInline in manual mode with no items did not warn')
  const b = await run({_type: 'practiceAreaNavInline', mode: 'allTopLevel'})
  if (warnsOn(b, 'items')) fail('practiceAreaNavInline in allTopLevel mode warned on items (read the document?)')
  const c = await run({_type: 'attorneySectionInline', mode: 'manual'})
  if (!warnsOn(c, 'attorneys')) fail('attorneySectionInline in manual mode with no attorneys did not warn')
  const d = await run({_type: 'attorneySectionInline', mode: 'all'})
  if (warnsOn(d, 'attorneys')) fail('attorneySectionInline in all mode warned on attorneys (read the document?)')
  ok('validation callbacks follow the member, not the root document')
}

// ─── 4. Inline defaults and option lists ──────────────────────────────────────
function optionValues(typeName: string, field: string): string[] {
  const t = schema.get(typeName) as ObjectSchemaType
  const f = t.fields.find((x) => x.name === field)
  const list = (f?.type.options as {list?: Array<{value: string}>} | undefined)?.list ?? []
  return list.map((o) => o.value)
}
function initial(typeName: string, field: string): unknown {
  const t = schema.get(typeName) as ObjectSchemaType
  return (t.fields.find((x) => x.name === field)?.type as {initialValue?: unknown} | undefined)?.initialValue
}
if (optionValues('attorneySectionInline', 'mode').includes('practiceArea')) fail('attorneySectionInline.mode offers practiceArea')
if (!optionValues('attorneySection', 'mode').includes('practiceArea')) fail('attorneySection.mode lost practiceArea')
if (initial('attorneySectionInline', 'mode') !== 'all') fail(`attorneySectionInline.mode initial is ${String(initial('attorneySectionInline', 'mode'))}`)
if (initial('attorneySection', 'mode') !== 'practiceArea') fail('attorneySection.mode initial moved')
if (initial('practiceAreaNavInline', 'mode') !== 'allTopLevel') fail('practiceAreaNavInline.mode initial is not allTopLevel')
if (initial('practiceAreaNav', 'mode') !== 'manual') fail('practiceAreaNav.mode initial moved')
ok('inline mode defaults and option lists are as specified; the documents are unchanged')

// ─── 5. The unregistered caseResultsSection document compiles ─────────────────
const withDoc = createSchema({name: 'verify-doc', types: [...schemaTypes, caseResultsSection] as never})
const docProblems = withDoc._validation?.filter((g) => g.problems.some((p) => p.severity === 'error')) ?? []
if (docProblems.length) fail(`caseResultsSection document does not compile: ${docProblems.map((g) => g.problems.map((p) => p.message).join('; ')).join(' | ')}`)
else if (!(withDoc.get('caseResultsSection') as ObjectSchemaType).fields.some((f) => f.name === 'name')) fail('caseResultsSection document lacks `name`')
else ok('caseResultsSection (document, unregistered this release) compiles with `name`')

// ─── 6. `featured` is reachable where a practice-area list lives ──────────────
const featured = hiddenOf('practiceAreaNavItem', 'featured')
if (!featured) fail('practiceAreaNavItem.featured has no hidden callback')
else {
  for (const [type, expectHidden] of [['practiceAreaNav', false], ['homePage', false], ['landingPage', true]] as const) {
    const got = featured({document: {_type: type}, parent: {}, value: undefined, currentUser: null})
    if (got !== expectHidden) fail(`practiceAreaNavItem.featured hidden on ${type} = ${got}`)
  }
  ok('practiceAreaNavItem.featured shows on the section document and the homepage')
}

validationCases().then(() => {
  if (failures) {
    console.log(`\n${failures} failure(s)`)
    process.exit(1)
  }
  console.log('\nAll expectations met.')
  process.exit(0)
})
