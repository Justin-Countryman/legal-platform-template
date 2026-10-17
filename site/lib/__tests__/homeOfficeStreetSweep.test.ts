import {describe, it, expect} from 'vitest'
import {evaluate, parse} from 'groq-js'
import * as Q from '../sanity/queries'

// Monorepo backlog 529 (D9, location-type privacy): a Home, Virtual or untyped office's street and zip are never
// public. ADV-529's sweep found the gate missing from three queries (the attorney's, the staff member's and the NAP
// tokens every page carries); this runs EVERY exported query against a Home office with a street, so a new query
// that projects it raw fails here. Google Business Profile Help, read 2026-10-16: a business without a storefront
// where it receives customers "must hide your business address".

const STREET = '12 Elm Ct'
const ZIP = '62701'
const office = {_id: 'loc-home', _type: 'location', locationType: 'Home', locationStatus: 'Active', displayOnWebsite: true,
  city: 'Springfield', state: 'IL', address1: STREET, address2: 'Unit 4', address3: 'Elm House', zip: ZIP,
  officePhone: '2175550100'}
const ref = {_type: 'reference', _ref: 'loc-home'}
const dataset = [
  office,
  {_id: 'siteSettings', _type: 'siteSettings', firmName: 'Example Firm', primaryLocation: ref},
  {_id: 'a1', _type: 'attorneyPage', slug: {current: 'attorneys/jane-doe'}, firstName: 'Jane', lastName: 'Doe', location: ref},
  {_id: 's1', _type: 'staffPage', slug: {current: 'staff/pat-lee'}, firstName: 'Pat', lastName: 'Lee', location: ref},
  {_id: 'l1', _type: 'locationPage', slug: {current: 'springfield-law-firm'}, title: 'Springfield', locationRef: ref},
  {_id: 'r1', _type: 'reviewPage', slug: {current: 'review-springfield'}, location: ref},
]
const params = {slug: 'attorneys/jane-doe', slugs: ['springfield-law-firm'], id: 'a1', ids: ['a1']}

describe("no query hands a Home office's street to a page", () => {
  const queries = Object.entries(Q).filter(([, v]) => typeof v === 'string' && v.includes('*['))

  it('every exported query leaves the street and zip out', async () => {
    const leaked: string[] = []
    let read = 0
    for (const [name, query] of queries) {
      for (const slug of ['attorneys/jane-doe', 'staff/pat-lee', 'springfield-law-firm', 'review-springfield']) {
        let value: unknown
        try {
          value = await (await evaluate(parse(query as string), {dataset, params: {...params, slug}})).get()
        } catch {
          continue
        }
        read += 1
        const json = JSON.stringify(value) ?? ''
        if (json.includes(STREET) || json.includes(`"${ZIP}"`)) leaked.push(`${name} (${slug})`)
      }
    }
    expect(read).toBeGreaterThan(100)
    expect([...new Set(leaked)]).toEqual([])
  })
})
