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
// Phase 17E (`[R-573]`, `[R-577]`): the three records with the night skyline behind the hero and four photographs of the same
// city as the theme's set (`compose_from_record.py --photo-set`), and the planning record with the set and no hero photograph.
const SET_FILES = ['record-adversarial-photo-set.ndjson', 'record-planning-photo-set.ndjson', 'record-multi-practice-photo-set.ndjson']
const NO_HERO = 'record-planning-photo-set-no-hero-photo.ndjson'
const SET = ['stand-in-cincinnati-riverfront.jpg', 'stand-in-cincinnati-terminal.jpg', 'stand-in-cincinnati-aerial.jpg', 'stand-in-cincinnati-courthouse.jpg']
// SHA-256 of each stand-in as committed. Places and objects only, never a person (`[R-533]`, `[R-558]`); sources in the
// monorepo records (WS-V1-PHASE17B6-DESIGN §9.1; the bust, WS-V1-PHASE17D2-DESIGN §9).
const PINNED: Record<string, string> = {
  'stand-in-bust.png': 'fe9384ea78406f51d00c27a714ebfabb520a51da90c924ff06be1102dfcca8ef',
  'stand-in-city.jpg': 'c245c2525f45322999406b09764fec11736ad3a9cb0165ea0b140e03af021538',
  'stand-in-lake.jpg': 'baffbcb4f740e39c397e063b75e27a2f7580afdade5c5855d2f544fdfedb4ee1',
  'stand-in-courthouse.jpg': 'a54524e47cbcd84773d5e5c635558a717c25e0294618b357315e0dd1da5af543',
  'stand-in-library.jpg': 'df89263eede2f65e2f7e3a49125fdfcf1b0004c7e74759bd596206a6a547c2e7',
  // Phase 17E (`[R-577]`): Carol M. Highsmith's photographs of the city, public domain (sources in WS-V1-PHASE17E-DESIGN §9).
  'stand-in-cincinnati-riverfront.jpg': '1ffb785eaa1b8edba40813431290d13cb8d25e706ca755f8015898b42053229b',
  'stand-in-cincinnati-terminal.jpg': 'dc160b672021c07f43a6272d6d47bdb02bb83fbc71a9ce9038ee110a834780fb',
  'stand-in-cincinnati-aerial.jpg': '7abaec2e383dd4ff2d9f822fa57851f9227e81cdce8642da3260b9176081a39e',
  'stand-in-cincinnati-courthouse.jpg': '08d04c4471b46df2640fad51b2f1e6951c562fdcb34b1d7ba5ec4e8d2cfa784c',
}

type Doc = Record<string, unknown> & {_id: string; _type: string}
const present = fs.existsSync(PHOTOS) && [...FILES, ...SET_FILES, NO_HERO].every((f) => fs.existsSync(path.join(CI, f)))
const read = (f: string): Doc[] => fs.readFileSync(path.join(CI, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))

/** A PNG's pixel size, from its header. */
function pngSize(file: string): {width: number; height: number} {
  const b = fs.readFileSync(file)
  return {width: b.readUInt32BE(16), height: b.readUInt32BE(20)}
}

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

  it.each([...FILES, ...SET_FILES, NO_HERO])('%s: its documents are declared, its references resolve, and its image assets are stand-ins at their real size', (file) => {
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

  // Phase 17D session 2 (`[R-558]`): the cutout canvas, the adversarial record with a figure on a transparent ground in
  // every split band.
  // The figure canvas (the Layout theme's figure out of a panel) is the cutout canvas as a design file stores it.
  it.each(['record-adversarial-cutout.ndjson', 'record-figure-panel.ndjson'])('%s: its splits carry the stand-in cutout, a transparent PNG at its real size', (file) => {
    const docs = read(file)
    const asset = docs.find((d) => d._type === 'sanity.imageAsset')!
    expect(asset.url).toBe('/stand-ins/stand-in-bust.png')
    expect((asset.metadata as {dimensions: unknown}).dimensions).toMatchObject(pngSize(path.join(PHOTOS, 'stand-in-bust.png')))
    expect((asset.metadata as {isOpaque: boolean}).isOpaque).toBe(false)
    expect(asset._id).toBe('image-fxstandinbust-400x624-png')
    const home = docs.find((d) => d._type === 'homePage') as unknown as {canvas: Array<{layout?: string; media?: {kind: string; image: {asset: {_ref: string}}}}>}
    const splits = home.canvas.filter((m) => m.layout === 'split')
    expect(splits.length).toBeGreaterThan(0)
    for (const m of splits) expect(m.media).toMatchObject({kind: 'cutout', image: {asset: {_ref: asset._id}}})
  })

  it.each(SET_FILES)('%s: the set is the four photographs of the city, in order, none of them the hero’s, all drawn beside it', (file) => {
    const c = stubCanvas(file)!
    expect(c.heroPhoto?.src).toBe('/stand-ins/stand-in-city.jpg')
    expect(c.photoSet.map((p) => p.assetId)).toEqual(SET.map((n) => `image-fx${n.replace(/\.jpg$/, '').replace(/[^a-z0-9]/g, '')}-${jpegSize(path.join(PHOTOS, n)).width}x${jpegSize(path.join(PHOTOS, n)).height}-jpg`))
  })

  it('the set with no hero photograph: nothing of it is drawn', () => {
    const c = stubCanvas(NO_HERO)!
    expect(c.heroPhoto).toBeNull()
    expect(c.photoSet).toEqual([])
  })

  it.each([...FILES, ...SET_FILES])('%s: the hero is a photograph a page can be made of, as the page reads it', (file) => {
    const c = stubCanvas(file)!
    expect(c.hero).toBe('image')
    expect(c.heroPhoto?.src).toMatch(/^\/stand-ins\/stand-in-[a-z]+\.jpg$/)
    expect(c.heroPhoto?.assetId).toMatch(/^image-fxstandin[a-z]+-\d+x\d+-jpg$/)
  })
})

// Phase 17D (`[R-556]`, monorepo WS-V1-PHASE17D-DESIGN §10): the multi-practice record with a stand-in Card Photo on
// every practice area (`compose_from_record.py --area-photos`), so a list of photo cards is measured under every theme.
const AREA_PHOTOS = 'record-multi-practice-area-photos.ndjson'
const areaPresent = fs.existsSync(PHOTOS) && fs.existsSync(path.join(CI, AREA_PHOTOS))

describe.skipIf(!areaPresent)('scripts/ci area-photo canvas (skipped on a client tree: scripts/ci is pruned by the press)', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8')) as Array<{name: string; type: string; attributes?: Record<string, unknown>}>
  const byName = new Map(schema.map((t) => [t.name, t]))

  it('every practice area carries a declared Card Photo that is a stand-in at its real size, with no alt', () => {
    const docs = read(AREA_PHOTOS)
    const byId = new Map(docs.map((d) => [d._id, d]))
    const areas = docs.filter((d) => d._type === 'practiceArea')
    expect(areas.length).toBeGreaterThan(0)
    expect('cardImage' in (byName.get('practiceArea')?.attributes ?? {})).toBe(true)
    for (const area of areas) {
      const image = area.cardImage as {asset: {_ref: string}; alt?: string}
      expect(image, area._id).toBeTruthy()
      expect(image.alt, area._id).toBeUndefined()
      const asset = byId.get(image.asset._ref)
      expect(asset?._type, area._id).toBe('sanity.imageAsset')
      const name = String(asset?.url).replace(/^\/stand-ins\//, '')
      expect(Object.keys(PINNED)).toContain(name)
      expect((asset?.metadata as {dimensions: unknown}).dimensions).toMatchObject(jpegSize(path.join(PHOTOS, name)))
    }
    for (const ref of JSON.stringify(docs).matchAll(/"_ref":"([^"]+)"/g)) expect(byId.has(ref[1]), ref[1]).toBe(true)
  })

  it('apart from the card photos and their assets, it is the multi-practice balanced canvas', () => {
    const plain = read(AREA_PHOTOS)
      .filter((d) => d._type !== 'sanity.imageAsset')
      .map((d) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'cardImage')))
    expect(plain).toEqual(read('record-multi-practice-balanced.ndjson'))
  })
})
