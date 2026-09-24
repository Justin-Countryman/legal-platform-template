// The photo canvases and their stand-in photographs (Phase 17B session 6, monorepo
// WS-V1-PHASE17B6-DESIGN §2.11): the three record canvases again, composed by the monorepo's
// `compose_from_record.py --hero-photo --feature-photo`, with an openly licensed photograph of a
// place behind the hero and in every split band, so Photo scrims can be judged on real
// photographs. The photographs are pinned here by hash, so a changed file is a visible change; the
// canvases' image assets must name them, at their real sizes. Read only if present: the press
// prunes `scripts/ci` from a client tree, so on one this suite skips by name ([R-175]).
import {createHash} from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {stubCanvas} from '@/components/sections/__tests__/stubCanvases'

const CI = path.resolve(__dirname, '..')
const PHOTOS = path.join(CI, 'photos')
const SCHEMA = path.resolve(__dirname, '../../../../studio/schema.json')
const FILES = ['record-adversarial-photo-hero.ndjson', 'record-planning-photo-hero.ndjson', 'record-multi-practice-photo-hero.ndjson']
// SHA-256 of each stand-in as committed. Places only; sources in the monorepo record, §9.1.
const PINNED: Record<string, string> = {
  'stand-in-city.jpg': 'c245c2525f45322999406b09764fec11736ad3a9cb0165ea0b140e03af021538',
  'stand-in-lake.jpg': 'baffbcb4f740e39c397e063b75e27a2f7580afdade5c5855d2f544fdfedb4ee1',
  'stand-in-courthouse.jpg': 'a54524e47cbcd84773d5e5c635558a717c25e0294618b357315e0dd1da5af543',
  'stand-in-library.jpg': 'df89263eede2f65e2f7e3a49125fdfcf1b0004c7e74759bd596206a6a547c2e7',
}

type Doc = Record<string, unknown> & {_id: string; _type: string}
const present = fs.existsSync(PHOTOS) && FILES.every((f) => fs.existsSync(path.join(CI, f)))
const read = (f: string): Doc[] => fs.readFileSync(path.join(CI, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))

/** A baseline or progressive JPEG's pixel size, from its frame header. */
function jpegSize(file: string): {width: number; height: number} {
  const b = fs.readFileSync(file)
  let i = 2
  while (i < b.length) {
    const marker = b[i + 1]
    const len = b.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7)}
    }
    i += 2 + len
  }
  throw new Error(`${file}: no frame header`)
}

describe.skipIf(!present)('scripts/ci photo canvases and stand-in photographs (skipped on a client tree: scripts/ci is pruned by the press)', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8')) as Array<{name: string; type: string}>
  const documentTypes = new Set(schema.filter((t) => t.type === 'document').map((t) => t.name))

  it('the stand-ins are exactly the pinned photographs, and nothing else sits beside them', () => {
    expect(fs.readdirSync(PHOTOS).sort()).toEqual(Object.keys(PINNED).sort())
    for (const [file, sha] of Object.entries(PINNED)) {
      expect(createHash('sha256').update(fs.readFileSync(path.join(PHOTOS, file))).digest('hex'), file).toBe(sha)
    }
  })

  it.each(FILES)('%s: its documents are declared, its references resolve, and its image assets are stand-ins at their real size', (file) => {
    const docs = read(file)
    const byId = new Map(docs.map((d) => [d._id, d]))
    for (const doc of docs) {
      if (doc._type === 'sanity.imageAsset') {
        const name = String(doc.url).replace(/^\/stand-ins\//, '')
        expect(Object.keys(PINNED), doc._id).toContain(name)
        const {width, height} = jpegSize(path.join(PHOTOS, name))
        expect((doc.metadata as {dimensions: unknown}).dimensions).toMatchObject({width, height})
        expect((doc.metadata as {isOpaque: boolean}).isOpaque).toBe(true)
        expect(doc._id).toBe(`image-fx${name.replace(/\.jpg$/, '').replace(/[^a-z0-9]/g, '')}-${width}x${height}-jpg`)
      } else {
        expect(doc._id.startsWith('fx-'), doc._id).toBe(true)
        expect(documentTypes.has(doc._type), `${doc._id}: ${doc._type}`).toBe(true)
      }
    }
    for (const ref of JSON.stringify(docs).matchAll(/"_ref":"([^"]+)"/g)) expect(byId.has(ref[1]), ref[1]).toBe(true)
  })

  it.each(FILES)('%s: the hero is a photograph a page can be made of, as the page reads it', (file) => {
    const c = stubCanvas(file)!
    expect(c.hero).toBe('image')
    expect(c.heroPhoto?.src).toMatch(/^\/stand-ins\/stand-in-[a-z]+\.jpg$/)
    expect(c.heroPhoto?.assetId).toMatch(/^image-fxstandin[a-z]+-\d+x\d+-jpg$/)
  })
})
