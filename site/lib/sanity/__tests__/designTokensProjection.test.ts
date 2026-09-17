import {describe, it, expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {parse, evaluate} from 'groq-js'
import {DESIGN_TOKENS_QUERY, OG_DATA_QUERY} from '../queries'

// THE PHASE 13 BUG, GUARDED FOR COLOUR. The appearance projection was an explicit
// object, so three new fields passed five review agents, twelve CI checks, a merge,
// a pin and a propagation while reaching no component: nothing executable rendered
// a band through GROQ with those fields set. DESIGN_TOKENS_QUERY is explicit too,
// and site tsc cannot see a missing key (the site-chrome fetch returns any).
//
// So the EXPECTED key set is not a hand-kept list. It is derived from the
// generated studio/field-map.json, which CI regenerates and diff-checks, and a
// designSettings field added to the schema without a projection line is red here
// unless it is named below with the place that reads it. Proven red with a
// planted field and green with its projection line in the Phase 14 challenge
// (WS-V1-PHASE14-DESIGN §7 amendment 11).

const fieldMap = JSON.parse(readFileSync(resolve(__dirname, '../../../../studio/field-map.json'), 'utf8'))
type Row = {path: string; jsonType: string}
const rows: Row[] = fieldMap.types.designSettings.fields
const topLevel = rows.filter((r) => !r.path.includes('.') && !r.path.startsWith('_'))

// Every designSettings field the design-tokens projection deliberately does not
// carry, and why.
const READ_ELSEWHERE: Record<string, string> = {
  logoOnLight: 'the header and footer queries',
  logoOnDark: 'the header, footer and OG queries',
  logoMarkOnLight: 'the header query',
  logoMarkOnDark: 'the header query',
  favicon: 'the root layout metadata',
  webclipImage: 'the root layout metadata',
  colorPreview: 'nothing: the Studio palette panel, which stores no value',
  customFonts: 'the font query',
  showBackToTop: 'the footer query',
  profileLayout: 'the profile page queries',
  profileCtaLabel: 'the profile page queries',
  profileCtaUrl: 'the profile page queries',
}

const sentinel = (r: Row) =>
  r.jsonType === 'string' ? '#123456' : r.jsonType === 'number' ? 1 : r.jsonType === 'boolean' ? true : r.jsonType === 'array' ? [] : {}

async function run(query: string, doc: Record<string, unknown>) {
  return (await (await evaluate(parse(query), {dataset: [doc]})).get()) as Record<string, unknown>
}

describe('DESIGN_TOKENS_QUERY carries every designSettings field the site reads', () => {
  it('the field map reads as expected, so the check below is not vacuous', () => {
    for (const role of ['darkGround', 'lightGround', 'accent', 'action']) {
      expect(topLevel.map((r) => r.path)).toContain(role)
    }
  })

  it('the projected key set is the field map minus the fields read elsewhere', async () => {
    const doc: Record<string, unknown> = {_id: 'designSettings', _type: 'designSettings'}
    for (const r of topLevel) doc[r.path] = sentinel(r)
    const out = await run(DESIGN_TOKENS_QUERY, doc)
    const missing = topLevel.map((r) => r.path).filter((p) => !(p in out) && !(p in READ_ELSEWHERE))
    expect(missing, `designSettings fields with no projection line: ${missing.join(', ')}`).toEqual([])
    const stale = Object.keys(READ_ELSEWHERE).filter((p) => !topLevel.some((r) => r.path === p))
    expect(stale, `allow-list names fields the schema no longer has: ${stale.join(', ')}`).toEqual([])
  })

  it('the four colour roles come through with their stored values', async () => {
    const out = await run(DESIGN_TOKENS_QUERY, {
      _id: 'designSettings', _type: 'designSettings',
      darkGround: '#1c2b4a', lightGround: '#f5eedc', accent: '#b8893a', action: '#14213d',
    })
    expect(out).toMatchObject({darkGround: '#1c2b4a', lightGround: '#f5eedc', accent: '#b8893a', action: '#14213d'})
  })

  it('the OG card reads the dark ground', async () => {
    const out = await run(OG_DATA_QUERY, {_id: 'designSettings', _type: 'designSettings', darkGround: '#1c2b4a'})
    expect(out.darkGround).toBe('#1c2b4a')
    expect('primaryColor' in out).toBe(false)
  })
})
