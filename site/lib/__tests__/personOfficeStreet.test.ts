import {describe, it, expect} from 'vitest'
import {evaluate, parse} from 'groq-js'
import {ATTORNEY_PAGE_QUERY, STAFF_PAGE_QUERY} from '../sanity/queries'

// Monorepo backlog 529 (D9, location-type privacy): a Home or Virtual office's street and zip are never public, and
// an untyped office is private. Google Business Profile Help, read 2026-10-16: "If your business doesn't have a
// storefront where you receive customers, you must hide your business address." The shared street projection held
// every query but the attorney's and the staff member's, so a home office's street reached the attorney's page and
// Person JSON-LD (ADV-517's probe). The queries are run, not read.

const office = (locationType: string | null) => ({
  _id: 'loc', _type: 'location', locationType, city: 'Springfield', state: 'IL',
  address1: '12 Elm Ct', address2: 'Unit 4', address3: 'Elm House', zip: '62701', officePhone: '2175550100',
})

async function personOffice(query: string, type: string, locationType: string | null) {
  const dataset = [office(locationType), {_id: 'p', _type: type, slug: {current: 'x/p'}, firstName: 'Jane', lastName: 'Doe',
    location: {_type: 'reference', _ref: 'loc'}}]
  const doc = (await (await evaluate(parse(query), {dataset, params: {slug: 'x/p'}})).get()) as {location: Record<string, unknown>}
  return doc.location
}

describe("an attorney's and a staff member's office street follows D9", () => {
  for (const [query, type] of [[ATTORNEY_PAGE_QUERY, 'attorneyPage'], [STAFF_PAGE_QUERY, 'staffPage']] as const) {
    it(`${type}: a Home, Virtual or untyped office keeps its city and state and loses its street and zip`, async () => {
      for (const locationType of ['Home', 'Virtual', null]) {
        const loc = await personOffice(query, type, locationType)
        expect([loc.address1 ?? null, loc.address2 ?? null, loc.address3 ?? null, loc.zip ?? null]).toEqual([null, null, null, null])
        expect([loc.city, loc.state]).toEqual(['Springfield', 'IL'])
      }
    })

    it(`${type}: a Physical or Shared office keeps its street`, async () => {
      for (const locationType of ['Physical', 'Shared']) {
        const loc = await personOffice(query, type, locationType)
        expect([loc.address1, loc.zip]).toEqual(['12 Elm Ct', '62701'])
      }
    })
  }
})
