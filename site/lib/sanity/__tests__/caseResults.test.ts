import {describe, expect, it} from 'vitest'
import {parse, evaluate} from 'groq-js'
import {CANVAS_FRAGMENT, CASE_RESULT_HAS_PAGE, CASE_RESULT_SHOWN, CATCH_ALL_PAGE_QUERY, SECTIONS_FRAGMENT} from '../queries'
import {isShownResult, scopeCaseResults, visibleResults} from '@/components/sections/CaseResultsSection'

// ─── The case results CMS's queries (monorepo backlog 454) ────────────────────
//
// WS-CASE-RESULTS-DESIGN-2026-10-13.md §11, ruled by Justin 2026-10-14: a
// Featured Case Results section shows what is featured ("the ability to select
// specific case results for them to be featured"), any area on the homepage and
// only the page's area of law on a practice page ("only displaying the correct
// case results in the practice area silo"). Evaluated under groq-js on a fixture,
// the queries the pages send, then the same TS the pages run.

const ref = (id: string) => ({_type: 'reference', _ref: id})
const result = (id: string, fields: Record<string, unknown>) => ({_id: id, _type: 'caseResult', _rev: '1', _createdAt: '2026-01-01T00:00:00Z', ...fields})

const DATASET = [
  // A practice tree five pages deep: an area of law and four levels under it, and a second area.
  {_id: 'fam', _type: 'practiceArea', _rev: '1', title: 'Family Law', slug: {current: 'family-law'}},
  {_id: 'div', _type: 'practiceArea', _rev: '1', title: 'Divorce', slug: {current: 'family-law/divorce'}, parentPage: ref('fam')},
  {_id: 'd3', _type: 'practiceArea', _rev: '1', title: 'High Asset Divorce', slug: {current: 'family-law/divorce/high-asset'}, parentPage: ref('div')},
  {_id: 'd4', _type: 'practiceArea', _rev: '1', title: 'Business Owners', slug: {current: 'family-law/divorce/high-asset/business'}, parentPage: ref('d3')},
  {_id: 'd5', _type: 'practiceArea', _rev: '1', title: 'Valuation', slug: {current: 'family-law/divorce/high-asset/business/valuation'}, parentPage: ref('d4')},
  {_id: 'pi', _type: 'practiceArea', _rev: '1', title: 'Personal Injury', slug: {current: 'personal-injury'}},
  {_id: 'geo', _type: 'geoPracticeArea', _rev: '1', title: 'Minneapolis Divorce Lawyer', slug: {current: 'minneapolis-divorce-lawyer'}},
  {_id: 'about', _type: 'aboutPage', _rev: '1', title: 'About', slug: {current: 'about'}},

  // The results. A yearless one, an unfeatured one, a blank one, a draft and two pages, one of them mis-addressed.
  result('r-pi-2024', {featured: true, amount: '$1.5 Million Settlement', caseType: 'Truck Accident', year: 2024, areaOfLaw: ref('pi')}),
  result('r-fam-2025', {featured: true, amount: 'Sole Custody Awarded', caseType: 'Child Custody', year: 2025, areaOfLaw: ref('fam'),
    hasPage: true, slug: {current: 'case-results/custody-modification-dakota-county'}}),
  result('r-fam-noyear', {featured: true, amount: 'Spousal Maintenance Denied', caseType: 'Divorce', areaOfLaw: ref('fam'), _createdAt: '2026-03-01T00:00:00Z'}),
  result('r-fam-unfeatured', {featured: false, amount: 'Charges Dismissed', caseType: 'Divorce', year: 2026, areaOfLaw: ref('fam')}),
  result('r-fam-blank', {featured: true, amount: '   ', caption: '', year: 2026, areaOfLaw: ref('fam')}),
  result('drafts.r-pi-draft', {featured: true, amount: 'Draft', caseType: 'Draft', year: 2026, areaOfLaw: ref('pi')}),
  result('r-pi-badaddress', {featured: true, amount: '$90,000 Settlement', caseType: 'Dog Bite', year: 2020, areaOfLaw: ref('pi'),
    hasPage: true, slug: {current: 'case-results/a/b'}}),
  result('r-pi-pageoff', {featured: true, amount: '$40,000 Settlement', caseType: 'Slip and Fall', year: 2019, areaOfLaw: ref('pi'),
    hasPage: false, slug: {current: 'case-results/slip-and-fall'}}),

  // The homepage carries two sections: one for every area, one naming Personal Injury.
  {_id: 'homePage-home', _type: 'homePage', _rev: '1', canvas: [
    {_key: 'every', _type: 'caseResultsSectionInline', heading: 'Featured results'},
    {_key: 'pi-only', _type: 'caseResultsSectionInline', heading: 'Injury results', areaOfLaw: ref('pi')},
  ]},
  {_id: 'sec-every', _type: 'caseResultsSection', _rev: '1', name: 'Featured', heading: 'Featured results'},
]

async function run(query: string, params: Record<string, unknown> = {}) {
  return (await evaluate(parse(query), {dataset: DATASET, params})).get()
}
type Card = {_id: string; href: string | null; areaOfLaw: string | null}
const ids = (list: Card[] | null | undefined) => (list ?? []).map((r) => r._id)

describe('the Featured Case Results section reads what is featured', () => {
  it('on the homepage, every area: featured, published and shown, newest year first, a yearless one last', async () => {
    const canvas = (await run(`*[_id == "homePage-home"][0].canvas ${CANVAS_FRAGMENT}`)) as Array<{caseResults: Card[]}>
    expect(ids(canvas[0].caseResults)).toEqual(['r-fam-2025', 'r-pi-2024', 'r-pi-badaddress', 'r-pi-pageoff', 'r-fam-noyear'])
  })

  it('a section naming an area of law shows only that area’s', async () => {
    const canvas = (await run(`*[_id == "homePage-home"][0].canvas ${CANVAS_FRAGMENT}`)) as Array<{caseResults: Card[]; areaOfLaw: string | null}>
    expect(ids(canvas[1].caseResults)).toEqual(['r-pi-2024', 'r-pi-badaddress', 'r-pi-pageoff'])
    expect(canvas[1].areaOfLaw).toBe('pi')
    expect(canvas[0].areaOfLaw).toBeNull()
  })

  it('a card links only to its own page, and only when the switch is on and the address is case-results/ and one name', async () => {
    const canvas = (await run(`*[_id == "homePage-home"][0].canvas ${CANVAS_FRAGMENT}`)) as Array<{caseResults: Card[]}>
    const hrefs = Object.fromEntries(canvas[0].caseResults.map((r) => [r._id, r.href]))
    expect(hrefs).toEqual({
      'r-fam-2025': '/case-results/custody-modification-dakota-county',
      'r-pi-2024': null,
      'r-pi-badaddress': null,
      'r-pi-pageoff': null,
      'r-fam-noyear': null,
    })
  })

  it('the referenced section document reads the same list as the canvas member', async () => {
    const host = [{_id: 'host', _type: 'generalPage', _rev: '1', sections: [{_key: 's', ...ref('sec-every')}]}]
    const sections = (await (await evaluate(parse(`*[_id == "host"][0].sections ${SECTIONS_FRAGMENT}`), {dataset: [...DATASET, ...host]})).get()) as Array<{caseResults: Card[]}>
    expect(ids(sections[0].caseResults)).toEqual(['r-fam-2025', 'r-pi-2024', 'r-pi-badaddress', 'r-pi-pageoff', 'r-fam-noyear'])
  })
})

describe('a practice page shows only its own area of law', () => {
  const scopeOf = async (slug: string) =>
    ((await run(CATCH_ALL_PAGE_QUERY, {slug})) as {caseResultsScope: {areaOfLaw: string | null} | null}).caseResultsScope

  it('the scope is the top ancestor, at every depth the breadcrumb reads', async () => {
    expect(await scopeOf('family-law')).toEqual({areaOfLaw: 'fam'})
    expect(await scopeOf('family-law/divorce')).toEqual({areaOfLaw: 'fam'})
    expect(await scopeOf('family-law/divorce/high-asset')).toEqual({areaOfLaw: 'fam'})
    expect(await scopeOf('family-law/divorce/high-asset/business')).toEqual({areaOfLaw: 'fam'})
    expect(await scopeOf('family-law/divorce/high-asset/business/valuation')).toEqual({areaOfLaw: 'fam'})
    expect(await scopeOf('personal-injury')).toEqual({areaOfLaw: 'pi'})
  })

  it('a geo practice page has no area of law to read; any other page has no scope', async () => {
    expect(await scopeOf('minneapolis-divorce-lawyer')).toEqual({areaOfLaw: null})
    expect(await scopeOf('about')).toBeNull()
  })

  it('the scope narrows a section with no area of its own, then the cap applies', async () => {
    const canvas = (await run(`*[_id == "homePage-home"][0].canvas ${CANVAS_FRAGMENT}`)) as Array<{_type: string; caseResults: Card[]}>
    const sections = canvas.map((m) => ({...m, _type: 'caseResultsSection'}))
    const [divorce, pageScopedPi] = scopeCaseResults(sections, await scopeOf('family-law/divorce'))
    expect(ids(divorce.caseResults)).toEqual(['r-fam-2025', 'r-fam-noyear'])
    // A section that names its own area keeps it on any page.
    expect(ids(pageScopedPi.caseResults)).toEqual(['r-pi-2024', 'r-pi-badaddress', 'r-pi-pageoff'])
    // A geo page: nothing, unless the section names an area.
    const [geoEvery, geoPi] = scopeCaseResults(sections, await scopeOf('minneapolis-divorce-lawyer'))
    expect(geoEvery.caseResults).toEqual([])
    expect(ids(geoPi.caseResults)).toEqual(['r-pi-2024', 'r-pi-badaddress', 'r-pi-pageoff'])
    // Any other page: unchanged, every area.
    const [aboutEvery] = scopeCaseResults(sections, await scopeOf('about'))
    expect(ids(aboutEvery.caseResults)).toEqual(['r-fam-2025', 'r-pi-2024', 'r-pi-badaddress', 'r-pi-pageoff', 'r-fam-noyear'])
    // A draft's id in a preview names the published area.
    const [draftScoped] = scopeCaseResults(sections, {areaOfLaw: 'drafts.pi'})
    expect(ids(draftScoped.caseResults)).toEqual(['r-pi-2024', 'r-pi-badaddress', 'r-pi-pageoff'])
  })

  it('the cap is six, eight at four across, and counts after the scope', () => {
    const many = Array.from({length: 10}, (_, i) => ({_id: `x${i}`, amount: `Result ${i}`, areaOfLaw: i < 2 ? 'pi' : 'fam'}))
    expect(visibleResults({caseResults: many} as never)).toHaveLength(6)
    expect(visibleResults({caseResults: many, across: 'four'} as never)).toHaveLength(8)
    // The two Personal Injury results are not pushed out by eight newer family ones.
    const [scoped] = scopeCaseResults([{_type: 'caseResultsSection', caseResults: many}], {areaOfLaw: 'pi'})
    expect(visibleResults(scoped as never).map((r) => r._id)).toEqual(['x0', 'x1'])
  })
})

describe('one "has something to show" test, in GROQ and in TS', () => {
  it('agree on every shape a Result and a Summary can take', async () => {
    const values = [undefined, null, '', ' ', '   ', 'x', ' x ', 'Charges Dismissed']
    const rows = values.flatMap((amount) => values.map((caption) => ({amount, caption})))
    const docs = rows.map((r, i) => ({_id: `s${i}`, _type: 'caseResult', ...(r.amount == null ? {} : {amount: r.amount}), ...(r.caption == null ? {} : {caption: r.caption})}))
    const shown = (await (await evaluate(parse(`*[_type == "caseResult" && ${CASE_RESULT_SHOWN}]._id`), {dataset: docs})).get()) as string[]
    rows.forEach((r, i) => expect(shown.includes(`s${i}`), JSON.stringify(r)).toBe(isShownResult(r)))
  })

  it('the page test is one string, the one the card link reads', () => {
    expect(CASE_RESULT_HAS_PAGE).toContain('hasPage == true')
    expect(CASE_RESULT_HAS_PAGE).toContain('string::startsWith(slug.current, "case-results/")')
  })
})
