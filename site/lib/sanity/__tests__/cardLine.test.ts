/**
 * A practice area's card line (Phase 18 session B, item 7; monorepo [R-603]).
 *
 * The tiles printed each page's meta description, written for search and clamped at one or two lines, and in the mode
 * the build writes (`allTopLevel`) nothing could override it (the monorepo's Phase 18 ledger, 2026-09-30 F; Justin:
 * "1, change them", each tile one line on what the client gets). A practice area's Card Line is read first; the meta
 * description stays the fallback. The projection guards both `defined` and empty: in GROQ `null != ""` is true, so a
 * bare `cardLine != ""` answers null for every area with no card line (ADV-18B-C, measured on groq-js). GROQ cannot trim,
 * so a line of spaces passes through; the tile draws nothing for it and the Studio warns (`silo/parts.tsx`).
 */
import {describe, expect, it} from 'vitest'
import {evaluate, parse} from 'groq-js'
import {HOME_QUERY} from '../queries'

const PAGES = [
  {_id: 'pa-family', _type: 'practiceArea', title: 'Family Law', slug: {current: 'family-law'}, metaDescription: 'Family law attorneys serving the county.', cardLine: 'Custody and support worked out with you, not for you.'},
  {_id: 'pa-estate', _type: 'practiceArea', title: 'Estate Planning', slug: {current: 'estate-planning'}, metaDescription: 'Estate planning attorneys serving the county.'},
  {_id: 'pa-probate', _type: 'practiceArea', title: 'Probate', slug: {current: 'probate'}, metaDescription: 'Probate attorneys serving the county.', cardLine: ''},
  {_id: 'pa-trusts', _type: 'practiceArea', title: 'Trusts', slug: {current: 'trusts'}, metaDescription: 'Trust attorneys serving the county.', cardLine: '   '},
  {_id: 'geo-1', _type: 'geoPracticeArea', title: 'Family Law in Woodbury', slug: {current: 'woodbury-family-law'}, metaDescription: 'A geo page.'},
]
const SITE = {_id: 'siteSettings', _type: 'siteSettings', firmName: 'Fixture'}

async function items(section: Record<string, unknown>) {
  const home = {_id: 'homePage-home', _type: 'homePage', canvas: [{_key: 's', ...section}]}
  const result = await evaluate(parse(HOME_QUERY), {dataset: [...PAGES, home, SITE]})
  const data = await result.get()
  return data.canvas[0].items as Array<{label: string; description: string | null}>
}
const byLabel = (list: Array<{label: string; description: string | null}>) => Object.fromEntries(list.map((i) => [i.label, i.description]))

describe('a practice area’s card line reaches its card', () => {
  it('the build’s list reads the card line first, the meta description where there is none or it is empty', async () => {
    expect(byLabel(await items({_type: 'practiceAreaNavInline', mode: 'allTopLevel'}))).toEqual({
      'Estate Planning': 'Estate planning attorneys serving the county.',
      'Family Law': 'Custody and support worked out with you, not for you.',
      Probate: 'Probate attorneys serving the county.',
      Trusts: '   ',
    })
  })

  it('a hand-picked item’s own line wins; an empty one falls to the card line, then the meta description', async () => {
    const pick = (ref: string, description?: string) => ({_key: ref, page: {_type: 'reference', _ref: ref}, ...(description === undefined ? {} : {description})})
    const list = await items({_type: 'practiceAreaNavInline', items: [pick('pa-family', 'Our own words.'), pick('pa-family', ''), pick('pa-estate'), pick('geo-1')]})
    expect(list.map((i) => i.description)).toEqual([
      'Our own words.',
      'Custody and support worked out with you, not for you.',
      'Estate planning attorneys serving the county.',
      'A geo page.',
    ])
  })
})
