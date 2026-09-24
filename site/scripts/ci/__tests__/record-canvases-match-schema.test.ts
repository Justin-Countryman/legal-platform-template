// The record-composed canvases (Phase 17B session 3, monorepo WS-V1-PHASE17B-DESIGN
// §2.11): three stub datasets under `scripts/ci/`, written by the monorepo's
// `compose_from_record.py` from the 65-site study, one homepage each, on which every
// theme is judged and measured. Like `fixture.ndjson`, they cannot be allowed to rot
// against `studio/schema.json`; unlike it, they carry the documents their members
// reference, and every reference must resolve inside the file. Read only if present:
// the press prunes `scripts/ci` from a client tree, so on one this suite skips by
// name ([R-175]).
import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'

const CI = path.resolve(__dirname, '..')
const SCHEMA = path.resolve(__dirname, '../../../../studio/schema.json')
// Phase 17B session 5 adds the ribbon evidence canvas: two ribbons bracketing a light page.
const FILES = ['record-adversarial-mostly-dark.ndjson', 'record-planning-mostly-light.ndjson', 'record-multi-practice-balanced.ndjson', 'record-ribbons-mostly-light.ndjson']

type SchemaType = {name: string; type: string; attributes?: Record<string, unknown>}
type Doc = Record<string, unknown> & {_id: string; _type: string}

const present = FILES.every((f) => fs.existsSync(path.join(CI, f)))

describe.skipIf(!present)('scripts/ci/record-*.ndjson agree with studio/schema.json (skipped on a client tree: scripts/ci is pruned by the press)', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8')) as SchemaType[]
  const byName = new Map(schema.map((t) => [t.name, t]))
  const canvas = byName.get('homePage')?.attributes?.canvas as {value?: {of?: {of?: Array<{rest?: {name?: string}}>}}} | undefined
  const allowed = new Set((canvas?.value?.of?.of ?? []).map((m) => m.rest?.name).filter(Boolean))
  const read = (f: string): Doc[] => fs.readFileSync(path.join(CI, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))

  it.each(FILES)('%s: one homepage, every document a declared type with declared fields, a fixture id, and every reference resolving', (file) => {
    const docs = read(file)
    const ids = new Set(docs.map((d) => d._id))
    expect(ids.size).toBe(docs.length)
    expect(docs.filter((d) => d._type === 'homePage')).toHaveLength(1)
    for (const doc of docs) {
      expect(doc._id.startsWith('fx-'), doc._id).toBe(true)
      const type = byName.get(doc._type)
      expect(type?.type, `${doc._id}: ${doc._type}`).toBe('document')
      const attributes = type?.attributes ?? {}
      for (const field of Object.keys(doc)) {
        if (field.startsWith('_')) continue
        expect(field in attributes, `${doc._id}: ${field} is not declared on ${doc._type}`).toBe(true)
      }
    }
    for (const ref of JSON.stringify(docs).matchAll(/"_ref":"([^"]+)"/g)) expect(ids.has(ref[1]), ref[1]).toBe(true)
    const home = docs.find((d) => d._type === 'homePage') as unknown as {canvas: Array<{_type: string; _key: string}>}
    expect(home.canvas.length).toBeGreaterThanOrEqual(7)
    for (const m of home.canvas) expect(allowed.has(m._type), m._type).toBe(true)
    expect(new Set(home.canvas.map((m) => m._key)).size).toBe(home.canvas.length)
  })

  it('the canvases differ in what the eye is meant to see: the hero and the bands', () => {
    const heroes = FILES.map((f) => (read(f).find((d) => d._type === 'heroSettings') as unknown as {homepageHero: {schemeOverride: string}}).homepageHero.schemeOverride)
    expect(heroes).toEqual(['dark', 'light', 'light', 'dark'])
    // The ribbon canvas carries what the others lack: a ribbon after the hero and one before the close.
    const ribbons = (f: string) => ((read(f).find((d) => d._type === 'homePage') as unknown as {canvas: Array<{layout?: string}>}).canvas)
      .map((m, i, all) => (m.layout === 'ribbon' ? i - all.length : null)).filter((x) => x !== null)
    expect(ribbons('record-ribbons-mostly-light.ndjson')).toEqual([-7, -1])
    for (const f of FILES.slice(0, 3)) expect(ribbons(f).length, f).toBeLessThan(2)
  })
})
