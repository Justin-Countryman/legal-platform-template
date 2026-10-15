/**
 * An attorney's card line, never the meta description (monorepo `BI/rules/page-fields.md` FIELD-7, Group 3; backlog
 * 467; Justin, 2026-10-14, option 1).
 *
 * The attorney section's cards printed each attorney's meta description as the bio, so the description the build now
 * writes for search would have reached every card. The card reads the attorney's own Card Line; with none, or a line of
 * spaces, the card prints no line (in GROQ `null != ""` is true, so the guard splits on spaces, as a practice area's
 * card line does). All three modes of the section, on both paths (a section document and the homepage's inline copy).
 */
import {describe, expect, it} from 'vitest'
import {evaluate, parse} from 'groq-js'
import {CANVAS_FRAGMENT, SECTIONS_FRAGMENT} from '../queries'

const ATTORNEYS = [
  {_id: 'atty-line', _type: 'attorneyPage', title: 'Jane Roe', firstName: 'Jane', lastName: 'Roe', slug: {current: 'attorneys/jane-roe'},
    metaDescription: 'Jane Roe is a partner at Fixture in Duluth. Read about Jane’s background or call {{primaryPhone}}.',
    cardLine: 'Helps families through divorce and custody.'},
  {_id: 'atty-none', _type: 'attorneyPage', title: 'Sam Poe', firstName: 'Sam', lastName: 'Poe', slug: {current: 'attorneys/sam-poe'},
    metaDescription: 'Sam Poe is an associate at Fixture in Duluth.'},
  {_id: 'atty-spaces', _type: 'attorneyPage', title: 'Ana Loe', firstName: 'Ana', lastName: 'Loe', slug: {current: 'attorneys/ana-loe'},
    metaDescription: 'Ana Loe is of counsel at Fixture in Duluth.', cardLine: '   '},
]
const INDEX = {_id: 'attorneyIndex-attorneys', _type: 'attorneyIndex', orderedAttorneys: ATTORNEYS.map((a) => ({_key: a._id, _type: 'reference', _ref: a._id}))}
const SECTION = {heading: 'Our people', attorneys: ATTORNEYS.map((a) => ({_key: a._id, _type: 'reference', _ref: a._id}))}

async function bios(mode: 'all' | 'manual'): Promise<Array<Record<string, unknown>>> {
  const doc = {_id: 'sec', _type: 'attorneySection', ...SECTION, mode}
  const home = {_id: 'homePage-home', _type: 'homePage', canvas: [{_key: 'c', _type: 'attorneySectionInline', ...SECTION, mode}]}
  const host = {_id: 'host', _type: 'generalPage', sections: [{_key: 's', _type: 'reference', _ref: 'sec'}]}
  const dataset = [...ATTORNEYS, INDEX, doc, home, host]
  const run = async (q: string) => (await (await evaluate(parse(q), {dataset, params: {}})).get()) as Array<{attorneys: Array<{title: string; bio: unknown}>}>
  const sections = await run(`*[_id == "host"][0].sections ${SECTIONS_FRAGMENT}`)
  const canvas = await run(`*[_id == "homePage-home"][0].canvas ${CANVAS_FRAGMENT}`)
  return [sections[0], canvas[0]].map((s) => Object.fromEntries(s.attorneys.map((a) => [a.title, a.bio ?? null])))
}

describe('an attorney card reads its own line, never the meta description', () => {
  for (const mode of ['all', 'manual'] as const) {
    it(`mode ${mode}, a section document and the homepage's inline copy alike`, async () => {
      for (const found of await bios(mode)) {
        expect(found).toEqual({'Jane Roe': 'Helps families through divorce and custody.', 'Sam Poe': null, 'Ana Loe': null})
      }
    })
  }
})
