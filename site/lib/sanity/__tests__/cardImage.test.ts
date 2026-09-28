/**
 * A photo per practice area (Phase 17D, [R-556]).
 *
 * A practice area's Card Photo is the photo its card shows wherever the practice
 * areas are listed. The build's list (`allTopLevel`) reads it from each page; a
 * hand-picked item keeps its own photo and otherwise takes the page's. The
 * projection is a `select`, not a `coalesce`: an image object with no asset (the
 * shape an emptied Studio field leaves) would win a coalesce and hide the page's
 * photo (ADV-17D-P, measured on groq-js).
 */
import {describe, expect, it} from 'vitest'
import {evaluate, parse} from 'groq-js'
import {HOME_QUERY} from '../queries'

const photo = (ref: string) => ({_type: 'image', asset: {_type: 'reference', _ref: ref}})

const PAGES = [
  {_id: 'pa-family', _type: 'practiceArea', title: 'Family Law', slug: {current: 'family-law'}, cardImage: photo('image-family-1600x900-jpg')},
  {_id: 'pa-estate', _type: 'practiceArea', title: 'Estate Planning', slug: {current: 'estate-planning'}},
]
const SITE = {_id: 'siteSettings', _type: 'siteSettings', firmName: 'Fixture'}

async function items(section: Record<string, unknown>) {
  const home = {_id: 'homePage-home', _type: 'homePage', canvas: [{_key: 's', ...section}]}
  const result = await evaluate(parse(HOME_QUERY), {dataset: [...PAGES, home, SITE]})
  const data = await result.get()
  return data.canvas[0].items as Array<{label: string; image: {asset?: {_ref: string}} | null}>
}
const refOf = (i: {image: {asset?: {_ref: string}} | null}) => i.image?.asset?._ref ?? null

describe('[R-556] the card photo reaches a practice area card', () => {
  it('the build list reads each page’s Card Photo, null where the page has none', async () => {
    const list = await items({_type: 'practiceAreaNavInline', mode: 'allTopLevel'})
    expect(list.map((i) => [i.label, refOf(i)])).toEqual([
      ['Estate Planning', null],
      ['Family Law', 'image-family-1600x900-jpg'],
    ])
  })

  it('a hand-picked item with its own photo keeps it', async () => {
    const list = await items({
      _type: 'practiceAreaNavInline',
      items: [{_key: 'a', page: {_type: 'reference', _ref: 'pa-family'}, image: photo('image-own-1200x800-jpg')}],
    })
    expect(refOf(list[0])).toBe('image-own-1200x800-jpg')
  })

  it('a hand-picked item with no photo takes the page’s', async () => {
    const list = await items({
      _type: 'practiceAreaNavInline',
      items: [{_key: 'a', page: {_type: 'reference', _ref: 'pa-family'}}],
    })
    expect(refOf(list[0])).toBe('image-family-1600x900-jpg')
  })

  it('an emptied photo field (an image object with no asset) does not hide the page’s', async () => {
    const list = await items({
      _type: 'practiceAreaNavInline',
      items: [{_key: 'a', page: {_type: 'reference', _ref: 'pa-family'}, image: {_type: 'image'}}],
    })
    expect(refOf(list[0])).toBe('image-family-1600x900-jpg')
  })

  it('a hand-picked item whose page has no photo draws none', async () => {
    const list = await items({
      _type: 'practiceAreaNavInline',
      items: [{_key: 'a', page: {_type: 'reference', _ref: 'pa-estate'}}],
    })
    expect(list[0].image).toBeNull()
  })
})
