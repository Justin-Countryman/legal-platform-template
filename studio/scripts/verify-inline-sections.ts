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
 *   2. `homePage.canvas.of` lists the nine inline objects and nothing else, all
 *      offered in Add item; the six block types retired in Phase 10 and the
 *      retired homepage and color fields are gone from the compiled schema
 *      (deleted in Phase 15, monorepo WS-V1-PHASE15-DESIGN §7 amendment 1).
 *   3. Every `hidden` and `validation` callback in a shared list reads
 *      `parent`, never `document`: called with a DECOY root document that says
 *      the opposite of the parent, the callback must follow the parent. Inside
 *      an array member `document` is the root `homePage`, so a `document`-scoped
 *      callback hides and warns wrongly there; this is the failure ADV-H found.
 *   4. `attorneySectionInline.mode` offers `all` and `manual` only, defaulting
 *      to `all`; `practiceAreaNavInline.mode` defaults to `allTopLevel`.
 *   5. The two documents Phase 11 registered, `caseResultsSection` and
 *      `contentSection`, are offered by every interior `sections` list that
 *      offers `ctaSection`, so neither is a type that renders nowhere.
 *   6. `practiceAreaNavItem.featured` is reachable on the homepage (the inline
 *      practice-area section lives there) and on the section document.
 *   7. The content section (Phase 11): its layout-scoped `hidden` callbacks,
 *      its heading warning (statement, ribbon and two-column text only) and
 *      its emphasis, proof and button warnings follow the member under a decoy
 *      root, and `imageTreatment` carries no `initialValue` (a theme axis:
 *      absent means inherit, and a seed would be folded into composed members).
 *
 * Exits non-zero on any failure. Detected by: itself (CI studio-build job).
 */

;(globalThis as never as {window: unknown}).window ??= {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (h: never) => clearTimeout(h),
}

import {createSchema, validateDocument, type ArraySchemaType, type ObjectSchemaType, type SanityDocument} from 'sanity'
import {schemaTypes} from '../schemas/index.ts'

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
  ['caseResultsSection', 'caseResultsSectionInline'],
  ['contentSection', 'contentSectionInline'],
  ['reviewsSection', 'reviewsSectionInline'],
]
const INLINE_ONLY: string[] = []
// Deleted in Phase 15. Kept by name so a type or field that comes back is caught.
const DELETED_TYPES = ['narrativeBlock', 'differentiatorBlock', 'caseResultsBlock', 'attorneyHighlightBlock', 'badgesBlock', 'siloNavBlock']
const DELETED_FIELDS: Array<[type: string, field: string]> = [
  ['homePage', 'sections'],
  ['homePage', 'reviewsEmbed'],
  ['homePage', 'codaLine'],
  ['designSettings', 'colorApproach'],
  ['designSettings', 'primaryColor'],
  ['designSettings', 'actionColor'],
  ['designSettings', 'accent1Color'],
  ['designSettings', 'accent2Color'],
]

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
ok(`${PAIRS.length} pairs compile with the expected field sets`)

// ─── 2. homePage.canvas.of: the nine inline objects, all offered; the retired gone
const homePage = schema.get('homePage') as ObjectSchemaType
const canvas = homePage.fields.find((f) => f.name === 'canvas')?.type as ArraySchemaType | undefined
if (!canvas) fail('homePage.canvas missing')
else {
  const members = canvas.of.map((m) => ({name: m.name, deprecated: (m as {deprecated?: {reason: string}}).deprecated}))
  const expected = [...PAIRS.map(([, i]) => i), ...INLINE_ONLY].sort()
  const actual = members.map((m) => m.name).sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`canvas.of is ${actual.join(', ')}`)
  else ok(`canvas.of holds the ${expected.length} inline objects and nothing else`)
  for (const m of members) if (m.deprecated) fail(`${m.name} is deprecated and must not be`)
  const groups = (canvas.options as {insertMenu?: {groups?: Array<{of?: string[]}>}} | undefined)?.insertMenu?.groups ?? []
  const grouped = groups.flatMap((g) => g.of ?? []).sort()
  if (JSON.stringify(grouped) !== JSON.stringify(expected)) fail(`the Add item groups offer ${grouped.join(', ')}`)
  else ok('every canvas member is offered in Add item')
}
for (const name of DELETED_TYPES) {
  if (schema.get(name)) fail(`${name} is registered again; it was deleted in Phase 15`)
}
for (const [type, field] of DELETED_FIELDS) {
  if ((schema.get(type) as ObjectSchemaType | undefined)?.fields?.some((f) => f.name === field)) fail(`${type}.${field} is declared again; it was deleted in Phase 15`)
}
ok(`the ${DELETED_TYPES.length} retired block types and ${DELETED_FIELDS.length} retired fields stay deleted`)

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
  ['contentSectionInline', 'sectionBackgroundImage', {surface: 'image'}, false],
  ['contentSectionInline', 'mediaSide', {layout: 'split'}, false],
  ['contentSectionInline', 'mediaSide', {layout: 'ribbon'}, true],
  ['contentSection', 'mediaSide', {layout: 'ribbon'}, true],
  ['contentSectionInline', 'marquee', {layout: 'ribbon'}, false],
  ['contentSectionInline', 'marquee', {layout: 'split'}, true],
  ['contentSectionInline', 'body', {layout: 'ribbon'}, true],
  ['contentSectionInline', 'items', {layout: 'statRow'}, false],
  ['contentSectionInline', 'proof', {layout: 'statRow'}, true],
  ['contentSectionInline', 'media', {layout: 'split'}, false],
  ['contentSectionInline', 'imageTreatment', {layout: 'statement'}, true],
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

// The media slot's own fields follow the media object, not the root.
const mediaField = (schema.get('contentSectionInline') as ObjectSchemaType).fields.find((f) => f.name === 'media')
const mediaFields = (mediaField?.type as ObjectSchemaType | undefined)?.fields ?? []
for (const [field, kind, expectHidden] of [['image', 'video', true], ['image', 'photo', false], ['video', 'video', false], ['video', 'photo', true]] as const) {
  const fn = mediaFields.find((f) => f.name === field)?.type.hidden as HiddenFn | undefined
  if (!fn) { fail(`contentSectionInline.media.${field} has no hidden callback`); continue }
  const got = fn({document: {...DECOY, kind: kind === 'video' ? 'photo' : 'video'}, parent: {kind}, value: undefined, currentUser: null})
  if (got !== expectHidden) fail(`contentSectionInline.media.${field}.hidden read the document: kind ${kind} gave ${got}`)
}
ok('the content section media fields follow the media object')

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
  // The content section: the emphasis must occur in the MEMBER's heading, and
  // the proof warning reads the member's badges, whatever the root carries.
  const badge = {_key: 'b', _type: 'reference'}
  const decoyRoot = {heading: 'Acme Acme', headingEmphasis: 'Acme', badges: [badge]}
  const runWithRoot = (member: Record<string, unknown>) =>
    validateDocument({document: {...doc(member), ...decoyRoot} as unknown as SanityDocument, workspace, getClient} as never) as Promise<Array<{path?: unknown[]; message?: string}>>
  const content = {_type: 'contentSectionInline', layout: 'statement'}
  if (warnsOn(await runWithRoot({...content, heading: 'Why Acme', headingEmphasis: 'Acme'}), 'headingEmphasis')) fail('contentSectionInline warned on an emphasis its own heading contains (read the document?)')
  if (!warnsOn(await runWithRoot({...content, heading: 'Why us', headingEmphasis: 'Acme'}), 'headingEmphasis')) fail('contentSectionInline did not warn on an emphasis its heading lacks')
  if (warnsOn(await runWithRoot({...content, heading: 'x', proof: {number: '$1M'}}), 'proof')) fail('contentSectionInline warned on a proof number with no badges of its own (read the document?)')
  if (!warnsOn(await runWithRoot({...content, heading: 'x', proof: {number: '$1M'}, badges: [badge]}), 'proof')) fail('contentSectionInline did not warn on a proof number beside its own badges')
  const three = [1, 2, 3].map((n) => ({_key: `k${n}`, _type: 'ctaButton', title: 't', url: '/'}))
  if (!warnsOn(await runWithRoot({...content, heading: 'x', buttons: three}), 'buttons')) fail('contentSectionInline did not warn on three buttons')
  // The heading is needed only where the layout needs it. The root claims the
  // opposite layout each time, so a document-scoped rule would answer wrongly.
  for (const [layout, expectWarn] of [['statement', true], ['ribbon', true], ['twoColumnText', true], ['split', false], ['statRow', false]] as const) {
    const root = {...decoyRoot, layout: expectWarn ? 'split' : 'statement'}
    const markers = (await validateDocument({document: {...doc({_type: 'contentSectionInline', layout}), ...root} as unknown as SanityDocument, workspace, getClient} as never)) as Array<{path?: unknown[]; message?: string}>
    if (warnsOn(markers, 'heading') !== expectWarn) fail(`contentSectionInline ${layout} with no heading ${expectWarn ? 'did not warn' : 'warned'} on heading`)
  }
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
// ─── The no-seed table (Phase 13, generalised from Phase 11's one field) ─────
// `compose_canvas` folds member `initialValue`s into every band it writes
// (`fold_member_defaults` writes a schema default into any empty key), and the
// canvas keeps no per-field origin, so a seeded value can never be told from an
// operator's choice (item 308, [R-450]). Nothing on the Python side guards this:
// with seeds planted, `test_homepage_member_table`, `test_member_defaults`,
// `test_schema_defaults` and `verify:field-map` all pass. THIS IS THE ONLY GUARD
// IN THE REPO, and it was hard-coded to one field until Phase 13.
//
// A boolean belongs here as much as a string: `initialValue: false` is folded
// too, because `_is_empty(False)` is False. Measured in the Phase 13 challenge.
const NO_SEED: Array<[type: string, field: string, why: string]> = [
  ['contentSection', 'imageTreatment', 'a theme axis (Phase 16)'],
  ['contentSectionInline', 'imageTreatment', 'a theme axis (Phase 16)'],
  ['attorneySection', 'imageTreatment', 'a theme axis (Phase 16)'],
  ['attorneySectionInline', 'imageTreatment', 'a theme axis (Phase 16)'],
]
// Every section carrying the shared appearance fieldset leaves every appearance
// field unseeded, on the document and on its inline copy alike: the three frame
// fields since Phase 13, and `surface` and `spacing` since Phase 16A, which
// removed the seed the original six sections carried (item 308).
for (const [doc, inline] of PAIRS) {
  for (const field of ['surface', 'spacing', 'inset', 'edgeBottom', 'overlapPrevious']) {
    NO_SEED.push([doc, field, 'an appearance field (item 308)'], [inline, field, 'an appearance field (item 308)'])
  }
}
for (const doc of ['ctaSection', 'faqSection']) {
  for (const field of ['surface', 'spacing']) NO_SEED.push([doc, field, 'an appearance field (item 308)'])
}
// Phase 16B: the per-section looks a theme reaches when the section sets none
// ([R-468]'s continuity rule), and item 341's four practice-area layout fields,
// which the composer folded into every build.
for (const [doc, inline] of [['attorneySection', 'attorneySectionInline'], ['practiceAreaNav', 'practiceAreaNavInline']]) {
  for (const field of ['cardStyle', 'hoverEffects', 'gridMode', 'sectionLayout', 'iconPosition', 'showArrow']) {
    NO_SEED.push([doc, field, 'a look that follows the theme, or item 341'], [inline, field, 'a look that follows the theme, or item 341'])
  }
}
// The theme's own new Design Settings fields: a seed would be written to every
// client by the build and read as a choice (Phase 16B).
for (const field of ['patternGround', 'headingEmphasisStyle', 'headingRule', 'headingCase', 'imageFrame', 'sectionJoin', 'cardHover', 'attorneyCardStyle', 'patternTexture']) {
  NO_SEED.push(['designSettings', field, 'a theme field (Phase 16B)'])
}
for (const [type, field, why] of NO_SEED) {
  if (!schema.get(type)) continue
  if (initial(type, field) !== undefined) {
    fail(`${type}.${field} carries an initialValue; it is ${why} and must not be seeded (item 308)`)
  }
}
ok(`no seed on ${String(NO_SEED.length)} field(s) that the composer would fold`)
// No color field is seeded either (Phase 14, item 308). Derived from the
// fieldset rather than listed, so a color field added later is covered the day it
// lands; the length check stops the read going vacuous if the fieldset is renamed.
const colorFields = ((schema.get('designSettings') as ObjectSchemaType).fields ?? []).filter((f) => (f as {fieldset?: string}).fieldset === 'colors')
if (colorFields.length < 5) fail(`designSettings has only ${String(colorFields.length)} color field(s); the fieldset read is vacuous`)
for (const f of colorFields) {
  if ((f.type as {initialValue?: unknown}).initialValue !== undefined) fail(`designSettings.${f.name} carries an initialValue; no color field is seeded (item 308)`)
}
ok(`no seed on ${String(colorFields.length)} designSettings color field(s)`)
if (initial('contentSectionInline', 'layout') !== 'split' || initial('contentSection', 'layout') !== 'split') fail('contentSection layout initial is not split')
// ─── The saturated surface (Phase 15, §7 amendment 17) ──────────────────────
// Offered on the content section ONLY, document and inline alike: it is the one
// section that passes its own button context, and the others draw controls in the
// action color, which an operator may leave equal to the accent that fills the
// band. The label must not start with "Accent" either: a band stored with the
// retired `accent` value renders a light step, not a fill, and a hand flip from
// one to the other would repaint a live band.
const SATURATED_ALLOWED = new Set(['contentSection', 'contentSectionInline'])
for (const type of [...PAIRS.flat(), ...INLINE_ONLY]) {
  if (!schema.get(type)) continue
  const offered = optionValues(type, 'surface').includes('saturated')
  if (offered !== SATURATED_ALLOWED.has(type)) {
    fail(offered ? `${type} offers the saturated surface and may not` : `${type} lost the saturated surface`)
  }
}
{
  const options = ((schema.get('contentSection') as ObjectSchemaType).fields.find((f) => f.name === 'surface')?.type as {options?: {list?: Array<{title?: string; value?: string}>}} | undefined)?.options?.list ?? []
  const saturated = options.find((o) => o.value === 'saturated')
  if (!saturated?.title?.startsWith('Saturated')) fail(`the saturated option's title is ${String(saturated?.title)}`)
}
ok(`the saturated surface is offered on ${String(SATURATED_ALLOWED.size)} type(s) and nowhere else`)
ok('inline mode defaults and option lists are as specified; the documents are unchanged')

// ─── 5. The registered documents render somewhere ─────────────────────────────
// A document no page can reference appears under "Create new" and renders
// nowhere. Every interior `sections` list that offers ctaSection must offer the
// two documents Phase 11 registered.
let listsChecked = 0
for (const t of schemaTypes as Array<{name: string}>) {
  if (t.name === 'homePage') continue
  const sectionsField = (schema.get(t.name) as ObjectSchemaType | undefined)?.fields?.find((f) => f.name === 'sections')
  const refs = ((sectionsField?.type as ArraySchemaType | undefined)?.of ?? []).flatMap((m) => ((m as {to?: Array<{name: string}>}).to ?? []).map((x) => x.name))
  if (!refs.includes('ctaSection')) continue
  listsChecked++
  for (const wanted of ['caseResultsSection', 'contentSection']) {
    if (!refs.includes(wanted)) fail(`${t.name}.sections offers ctaSection but not ${wanted}`)
  }
}
if (listsChecked < 17) fail(`only ${listsChecked} interior sections lists offer ctaSection; expected 17`)
else ok(`${listsChecked} interior sections lists offer caseResultsSection and contentSection`)

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
