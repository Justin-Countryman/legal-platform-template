import {describe, expect, it} from 'vitest'
import sharp from 'sharp'
import {cropTrim, factsFromPixels, logoFacts, withLogoFacts} from '../logoFacts'
import {rmSync} from 'node:fs'
import {join} from 'node:path'

// WHAT A LOGO'S OWN FILE HOLDS AROUND ITS INK (Phase 18 session B, items 3 and 4; monorepo `[R-603]`, and the challenge
// ADV-18B-B, whose test logos these follow). Drawn here by `sharp`, so no image is committed.

type Rect = {x: number; y: number; w: number; h: number; color: string}
async function logo(size: {w: number; h: number}, ground: string | null, rects: Rect[], opts: {jpeg?: boolean} = {}) {
  const base = sharp({create: {width: size.w, height: size.h, channels: 4, background: ground ?? {r: 0, g: 0, b: 0, alpha: 0}}})
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}">${rects.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.color}"/>`).join('')}</svg>`
  let img = base.composite([{input: Buffer.from(svg)}])
  if (opts.jpeg) img = sharp(await img.jpeg({quality: 60}).toBuffer())
  const {data, info} = await img.ensureAlpha().raw().toBuffer({resolveWithObject: true})
  return factsFromPixels(data, info.width, info.height)
}
const close = (a: number, b: number) => Math.abs(a - b) < 0.01

describe('the box around a logo', () => {
  it('a stacked mark on its own white box, its ink half its height (the throwaway’s shape): white, trimmed to the ink', async () => {
    const f = await logo({w: 438, h: 434}, '#ffffff', [{x: 18, y: 103, w: 398, h: 134, color: '#1c348c'}, {x: 60, y: 245, w: 318, h: 88, color: '#1c348c'}])
    expect(f.box).toBe('white')
    expect(f.trim && close(f.trim.top, 103 / 434) && close(f.trim.height, 230 / 434) && close(f.trim.left, 18 / 438)).toBe(true)
  })

  it('a transparent file: clear, trimmed to what is drawn, a faint shadow included', async () => {
    const f = await logo({w: 400, h: 200}, null, [{x: 100, y: 50, w: 200, h: 100, color: '#1c348c'}, {x: 90, y: 150, w: 220, h: 10, color: 'rgba(0,0,0,0.07)'}])
    expect(f.box).toBe('clear')
    expect(f.trim && close(f.trim.top, 50 / 200) && close(f.trim.height, 110 / 200) && close(f.trim.left, 90 / 400)).toBe(true)
  })

  it('white words on a black box: black, trimmed', async () => {
    const f = await logo({w: 300, h: 300}, '#000000', [{x: 60, y: 120, w: 180, h: 60, color: '#ffffff'}])
    expect(f.box).toBe('black')
    expect(f.trim).not.toBeNull()
  })

  it('a logo that is a colored box: its color, never trimmed to the words inside it', async () => {
    const f = await logo({w: 300, h: 300}, '#1c348c', [{x: 60, y: 120, w: 180, h: 60, color: '#ffffff'}])
    expect(f.box).toBe('#1c348c')
    expect(f.trim).toBeNull()
  })

  it('a thin frame at the edge is the logo: not trimmed', async () => {
    const f = await logo({w: 300, h: 150}, '#000000', [{x: 2, y: 2, w: 296, h: 146, color: '#ffffff'}, {x: 60, y: 50, w: 180, h: 50, color: '#000000'}])
    expect(f.trim).toBeNull()
  })

  it('ink that reaches the edge leaves no one color around it: no box, no trim', async () => {
    const f = await logo({w: 300, h: 150}, '#ffffff', [{x: 0, y: 0, w: 150, h: 150, color: '#1c348c'}])
    expect(f).toEqual({box: null, trim: null})
  })

  it('a near-white box is its color, not white (one of Justin’s own sites paints its header #f4f4f4 to match #f5f5f5)', async () => {
    const f = await logo({w: 300, h: 150}, '#f5f5f5', [{x: 60, y: 50, w: 180, h: 50, color: '#222222'}])
    expect(f.box).toBe('#f5f5f5')
    expect(f.trim).toBeNull()
  })

  it('a white box saved as a JPEG at quality 60 still reads white and trims close to the ink', async () => {
    const f = await logo({w: 400, h: 400}, '#ffffff', [{x: 40, y: 120, w: 320, h: 160, color: '#1c348c'}], {jpeg: true})
    expect(f.box).toBe('white')
    expect(f.trim && Math.abs(f.trim.top - 0.3) < 0.03 && Math.abs(f.trim.height - 0.4) < 0.05).toBe(true)
  })

  it('a logo with no margin to speak of is not trimmed', async () => {
    const f = await logo({w: 400, h: 100}, '#ffffff', [{x: 4, y: 2, w: 392, h: 96, color: '#1c348c'}])
    expect(f.box).toBe('white')
    expect(f.trim).toBeNull()
  })
})

describe('a crop set in the Studio', () => {
  it('wins over the trim the pixels give, and cutting nothing is no crop', async () => {
    const t = cropTrim({top: 0.2, bottom: 0.25, left: 0.05, right: 0.05})!
    expect([t.left, t.top, t.width, t.height].map((v) => Math.round(v * 1000) / 1000)).toEqual([0.05, 0.2, 0.9, 0.55])
    expect(cropTrim({top: 0, bottom: 0, left: 0, right: 0})).toBeNull()
    expect(cropTrim(null)).toBeNull()
    // A file the site cannot read keeps the Studio's crop; the chrome's other logos are left as they came.
    const chrome = await withLogoFacts({header: {designSettings: {logoOnLight: {src: '/no-such-file.png', width: 400, height: 400, crop: {top: 0.25, bottom: 0.25, left: 0, right: 0}}, logoOnDark: null}}})
    expect(chrome.header.designSettings.logoOnLight).toMatchObject({facts: {box: null, trim: {left: 0, top: 0.25, width: 1, height: 0.5}}})
    expect(chrome.header.designSettings.logoOnDark).toBeNull()
  })
})

describe('a file that cannot be read yet', () => {
  it('is read again on the next render, not remembered as unreadable (the pre-report break pass)', async () => {
    const name = `/zz-logo-retry-${process.pid}.png`
    const file = join(process.cwd(), 'public', name)
    try {
      expect(await logoFacts(name)).toBeNull()
      await sharp({create: {width: 200, height: 100, channels: 4, background: '#ffffff'}}).composite([{input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect x="40" y="30" width="120" height="40" fill="#1c348c"/></svg>')}]).png().toFile(file)
      expect(await logoFacts(name)).toMatchObject({box: 'white'})
    } finally {
      rmSync(file, {force: true})
    }
  })
})
