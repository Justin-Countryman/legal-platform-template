import {describe, it, expect} from 'vitest'
import {parse, evaluate} from 'groq-js'
import {SIDEBAR_FRAGMENT} from '../queries'

// WS-Sidebar Phase 2.3 — GROQ projection for the context-aware AOL hierarchy.
// SIDEBAR_FRAGMENT now projects `areasOfLaw` (top-level practiceAreas with
// children + grandchildren) and `orderedAolIds` (mainNavigation ordering).
//
// Evaluates via groq-js against an in-memory dataset that mirrors the canonical sidebar
// shape: a host practiceArea page with a sidebarNav widget (referenced from
// its sidebar[] array), plus a mainNavigation with practiceAreaOrder, plus
// the AOL tree (parents, children, grandchildren).
//
// Doctrine: BI/BI-Sidebar.md §1.

const SIDEBAR_NAV_DOC = {
  _id: 'snav',
  _type: 'sidebarNav',
  _rev: '1',
  name: 'Practice Areas',
  header: 'Practice Areas',
  mode: 'practiceArea',
}

// Top-level AOLs (no parentPage)
const PA_FAMILY = {
  _id: 'pa-family',
  _type: 'practiceArea',
  _rev: '1',
  title: 'Family Law',
  slug: {current: 'family-law'},
}
const PA_CRIMINAL = {
  _id: 'pa-criminal',
  _type: 'practiceArea',
  _rev: '1',
  title: 'Criminal Defense',
  slug: {current: 'criminal-defense'},
}
const PA_ESTATE = {
  _id: 'pa-estate',
  _type: 'practiceArea',
  _rev: '1',
  title: 'Estate Planning',
  slug: {current: 'estate-planning'},
}

// Family Law children
const PA_DIVORCE = {
  _id: 'pa-divorce',
  _type: 'practiceArea',
  _rev: '1',
  title: 'Divorce',
  slug: {current: 'family-law/divorce'},
  parentPage: {_ref: 'pa-family'},
}
const PA_ADOPTION = {
  _id: 'pa-adoption',
  _type: 'practiceArea',
  _rev: '1',
  title: 'Adoption',
  slug: {current: 'family-law/adoption'},
  parentPage: {_ref: 'pa-family'},
}

// Divorce grandchildren
const PA_CONTESTED = {
  _id: 'pa-contested',
  _type: 'practiceArea',
  _rev: '1',
  title: 'Contested Divorce',
  slug: {current: 'family-law/divorce/contested'},
  parentPage: {_ref: 'pa-divorce'},
}
const PA_UNCONTESTED = {
  _id: 'pa-uncontested',
  _type: 'practiceArea',
  _rev: '1',
  title: 'Uncontested Divorce',
  slug: {current: 'family-law/divorce/uncontested'},
  parentPage: {_ref: 'pa-divorce'},
}

// Criminal Defense children (no grandchildren)
const PA_DUI = {
  _id: 'pa-dui',
  _type: 'practiceArea',
  _rev: '1',
  title: 'DUI',
  slug: {current: 'criminal-defense/dui'},
  parentPage: {_ref: 'pa-criminal'},
}

// mainNavigation — editor-ordered practiceArea refs
const MAIN_NAV = {
  _id: 'mainNav',
  _type: 'mainNavigation',
  _rev: '1',
  items: [
    {
      _type: 'navItemPracticeAreas',
      label: 'Practice Areas',
      practiceAreaOrder: [
        {_type: 'reference', _ref: 'pa-criminal'},
        {_type: 'reference', _ref: 'pa-family'},
        {_type: 'reference', _ref: 'pa-estate'},
      ],
    },
  ],
}

// Host page document with sidebar[] pointing at the sidebarNav widget.
// SIDEBAR_FRAGMENT projects sidebar[] entries — we wrap it in a host doc
// query so groq-js has somewhere to ground the projection. Host is
// intentionally `aboutPage` (not practiceArea) so it doesn't accidentally
// register as a top-level AOL in the areasOfLaw projection.
const HOST_PAGE = {
  _id: 'host',
  _type: 'aboutPage',
  _rev: '1',
  title: 'About',
  slug: {current: 'about'},
  sidebar: [{_type: 'reference', _ref: 'snav'}],
}

const DATASET = [
  HOST_PAGE,
  SIDEBAR_NAV_DOC,
  PA_FAMILY,
  PA_CRIMINAL,
  PA_ESTATE,
  PA_DIVORCE,
  PA_ADOPTION,
  PA_CONTESTED,
  PA_UNCONTESTED,
  PA_DUI,
  MAIN_NAV,
]

async function fetchSidebar() {
  const query = `*[_id == "host"][0]{${SIDEBAR_FRAGMENT}}`
  const tree = parse(query)
  const result = await evaluate(tree, {dataset: DATASET})
  const out = (await result.get()) as {sidebar: Array<Record<string, unknown>>}
  return out.sidebar[0]
}

describe('SIDEBAR_FRAGMENT — Phase 2.3 hierarchy projection', () => {
  it('projects areasOfLaw — only top-level practiceAreas (parentPage undefined)', async () => {
    const w = (await fetchSidebar()) as {
      areasOfLaw: Array<{_id: string; slug: string; title: string}>
    }
    const ids = w.areasOfLaw.map((a) => a._id).sort()
    expect(ids).toEqual(['pa-criminal', 'pa-estate', 'pa-family'])
  })

  it('projects each AOL with its direct children (alphabetical, terminal-slug-bearing)', async () => {
    const w = (await fetchSidebar()) as {
      areasOfLaw: Array<{
        _id: string
        children: Array<{_id: string; slug: string; title: string}>
      }>
    }
    const family = w.areasOfLaw.find((a) => a._id === 'pa-family')
    expect(family?.children.map((c) => c._id)).toEqual(['pa-adoption', 'pa-divorce']) // alphabetical
    expect(family?.children.map((c) => c.slug)).toEqual(['family-law/adoption', 'family-law/divorce'])
  })

  it('projects each child with its grandchildren (alphabetical)', async () => {
    const w = (await fetchSidebar()) as {
      areasOfLaw: Array<{
        _id: string
        children: Array<{
          _id: string
          grandchildren: Array<{slug: string; title: string}>
        }>
      }>
    }
    const family = w.areasOfLaw.find((a) => a._id === 'pa-family')!
    const divorce = family.children.find((c) => c._id === 'pa-divorce')
    expect(divorce?.grandchildren.map((g) => g.title)).toEqual([
      'Contested Divorce',
      'Uncontested Divorce',
    ])
  })

  it('grandchildren is an empty array when a child has none (Scenario 3 substrate)', async () => {
    const w = (await fetchSidebar()) as {
      areasOfLaw: Array<{
        _id: string
        children: Array<{_id: string; grandchildren: Array<unknown>}>
      }>
    }
    const criminal = w.areasOfLaw.find((a) => a._id === 'pa-criminal')!
    expect(criminal.children).toHaveLength(1)
    expect(criminal.children[0].grandchildren).toEqual([])
  })

  it('AOLs with no children project an empty children array', async () => {
    const w = (await fetchSidebar()) as {
      areasOfLaw: Array<{_id: string; children: Array<unknown>}>
    }
    const estate = w.areasOfLaw.find((a) => a._id === 'pa-estate')!
    expect(estate.children).toEqual([])
  })

  it('projects orderedAolIds from mainNavigation.practiceAreaOrder', async () => {
    const w = (await fetchSidebar()) as {orderedAolIds: string[]}
    expect(w.orderedAolIds).toEqual(['pa-criminal', 'pa-family', 'pa-estate'])
  })

  it('orderedAolIds is null/empty when no mainNavigation document exists', async () => {
    const query = `*[_id == "host"][0]{${SIDEBAR_FRAGMENT}}`
    const tree = parse(query)
    const datasetWithoutNav = DATASET.filter((d) => d._type !== 'mainNavigation')
    const result = await evaluate(tree, {dataset: datasetWithoutNav})
    const out = (await result.get()) as {sidebar: Array<{orderedAolIds: unknown}>}
    const w = out.sidebar[0]
    // groq-js returns null for a missing path projection — the helper applies
    // the fallback (alphabetical sort) at runtime.
    expect(w.orderedAolIds === null || w.orderedAolIds === undefined).toBe(true)
  })

  it('practiceArea documents missing slug.current are filtered out (null-leak discipline)', async () => {
    const query = `*[_id == "host"][0]{${SIDEBAR_FRAGMENT}}`
    const tree = parse(query)
    const datasetWithGhost = [
      ...DATASET,
      // A ghost top-level practiceArea with no slug — should be filtered out.
      {
        _id: 'pa-ghost',
        _type: 'practiceArea',
        _rev: '1',
        title: 'Ghost',
      },
    ]
    const result = await evaluate(tree, {dataset: datasetWithGhost})
    const out = (await result.get()) as {sidebar: Array<{areasOfLaw: Array<{_id: string}>}>}
    const w = out.sidebar[0]
    const ids = w.areasOfLaw.map((a) => a._id)
    expect(ids).not.toContain('pa-ghost')
  })
})
