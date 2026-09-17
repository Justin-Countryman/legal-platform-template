/**
 * The practice-area order on every list surface ([R-201], 2026-09-12).
 *
 * The build writes the Zite ranking onto `mainNavigation.items[].practiceAreaOrder`;
 * the header, the footer's column 1 and the homepage's practice-area section read
 * it through one helper: the listed pages in that order, then every practice
 * area the order does not list, alphabetically by the RENDERED label. With no
 * order (no nav, no item, an empty array) every surface is alphabetical.
 *
 * The fixture is deliberately in NON-alphabetical dataset order and carries a
 * page whose `navLabel` sorts away from its `title`: the four sorts this
 * replaced ordered a projected object that carried no label, so they were
 * no-ops that an alphabetical fixture would have passed for the wrong reason
 * (ADV-P6b-B, measured on groq-js and on the Content Lake).
 */
import {describe, expect, it} from 'vitest'
import {evaluate, parse} from 'groq-js'
import {FOOTER_QUERY, HEADER_QUERY, HOME_QUERY} from '../queries'

const ref = (id: string) => ({_type: 'reference', _ref: id, _key: id})

const PAGES = [
  {_id: 'pa-real', _type: 'practiceArea', title: 'Real Estate', slug: {current: 'real-estate'}},
  {_id: 'pa-family', _type: 'practiceArea', title: 'Family Law', slug: {current: 'family-law'}},
  {
    _id: 'pa-child',
    _type: 'practiceArea',
    title: 'Wills',
    slug: {current: 'family-law/wills'},
    parentPage: {_type: 'reference', _ref: 'pa-family'},
  },
  // `navLabel` sorts to the end; `title` would sort to the front.
  {_id: 'pa-zed', _type: 'practiceArea', title: 'Business Law', navLabel: 'Zed Business', slug: {current: 'business-law'}},
  {_id: 'pa-appeals', _type: 'practiceArea', title: 'Appeals', slug: {current: 'appeals'}},
  {_id: 'pa-noslug', _type: 'practiceArea', title: 'No Slug'},
]

const NAV_WITH_ORDER = {
  _id: 'mainNavigation',
  _type: 'mainNavigation',
  items: [
    {_type: 'navItemStandard', _key: 'h', label: 'Home', href: '/'},
    {
      _type: 'navItemPracticeAreas',
      _key: 'p',
      label: 'Practice Areas',
      practiceAreaOrder: [
        ref('pa-family'),
        ref('pa-child'), // a child: dropped by the top-level surfaces, kept by the header
        ref('pa-gone'), // dangling
        ref('pa-real'),
      ],
    },
  ],
}

const HOME = {_id: 'homePage-home', _type: 'homePage', canvas: [{_type: 'practiceAreaNavInline', _key: 's', mode: 'allTopLevel'}]}
const SITE = {_id: 'siteSettings', _type: 'siteSettings', firmName: 'Fixture'}
const FOOTER = {_id: 'footerSettings', _type: 'footerSettings'}

async function run(query: string, dataset: unknown[]) {
  const result = await evaluate(parse(query), {dataset})
  return result.get()
}

const labelsOf = (items: Array<{label?: string}> | null | undefined) => (items ?? []).map((i) => i.label)

describe('[R-201] the practice-area order follows the nav order, then the rest alphabetically', () => {
  const withOrder = [...PAGES, NAV_WITH_ORDER, HOME, SITE, FOOTER]

  it('the homepage practice-area section lists the ordered top-level pages first, then the rest by label', async () => {
    const home = await run(HOME_QUERY, withOrder)
    const block = home.canvas[0]
    expect(labelsOf(block.items)).toEqual(['Family Law', 'Real Estate', 'Appeals', 'Zed Business'])
    expect(block.items.map((i: {href: string}) => i.href)).toEqual([
      '/family-law/', '/real-estate/', '/appeals/', '/business-law/',
    ])
  })

  it('the footer column follows the same order', async () => {
    const footer = await run(FOOTER_QUERY, withOrder)
    expect(labelsOf(footer.footerSettings?.column1)).toEqual(['Family Law', 'Real Estate', 'Appeals', 'Zed Business'])
  })

  it('the header keeps the listed pages in order, children flat with parentRef, then the unlisted', async () => {
    const header = await run(HEADER_QUERY, withOrder)
    const item = header.mainNavigation.navItems.find((i: {_type: string}) => i._type === 'navItemPracticeAreas')
    expect(item.children.map((c: {_id: string}) => c._id)).toEqual([
      'pa-family', 'pa-child', 'pa-real', 'pa-appeals', 'pa-zed',
    ])
    expect(item.children[1].parentRef).toBe('pa-family')
    // Nothing is hidden: the unlisted pages are there, after the ranked ones.
    expect(labelsOf(item.children)).toContain('Zed Business')
  })

  it('a dangling reference drops out rather than rendering a null hole', async () => {
    const home = await run(HOME_QUERY, withOrder)
    expect(home.canvas[0].items.every((i: unknown) => i !== null)).toBe(true)
  })
})

describe('[R-201] with no order every surface is alphabetical by the rendered label', () => {
  const cases: Array<[string, unknown[]]> = [
    ['no mainNavigation document', [...PAGES, HOME, SITE, FOOTER]],
    ['an empty order', [...PAGES, {...NAV_WITH_ORDER, items: [{...NAV_WITH_ORDER.items[1], practiceAreaOrder: []}]}, HOME, SITE, FOOTER]],
    ['a nav with no practice-areas item', [...PAGES, {...NAV_WITH_ORDER, items: [NAV_WITH_ORDER.items[0]]}, HOME, SITE, FOOTER]],
    ['an order listing only a child', [...PAGES, {...NAV_WITH_ORDER, items: [{...NAV_WITH_ORDER.items[1], practiceAreaOrder: [ref('pa-child')]}]}, HOME, SITE, FOOTER]],
  ]
  for (const [name, dataset] of cases) {
    it(`${name}: section, footer and header agree, Appeals first and Zed Business last`, async () => {
      const home = await run(HOME_QUERY, dataset)
      const footer = await run(FOOTER_QUERY, dataset)
      const header = await run(HEADER_QUERY, dataset)
      const expected = ['Appeals', 'Family Law', 'Real Estate', 'Zed Business']
      expect(labelsOf(home.canvas[0].items)).toEqual(expected)
      expect(labelsOf(footer.footerSettings?.column1)).toEqual(expected)
      const item = header?.mainNavigation?.navItems?.find((i: {_type: string}) => i._type === 'navItemPracticeAreas')
      if (item) {
        const top = item.children.filter((c: {parentRef?: string}) => !c.parentRef)
        expect(labelsOf(top)).toEqual(expected)
      }
    })
  }

  it('the sort is on the rendered label, not the title (the no-op sort this replaced)', async () => {
    const home = await run(HOME_QUERY, [...PAGES, HOME, SITE, FOOTER])
    // "Business Law" by title would sort first; its navLabel "Zed Business" sorts last.
    expect(labelsOf(home.canvas[0].items).at(-1)).toBe('Zed Business')
  })
})
