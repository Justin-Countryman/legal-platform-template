import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import sharp from 'sharp'

// ─── What a logo's own file holds around it (Phase 18 session B, items 3 and 4; monorepo `[R-603]`) ─────────────
//
// Justin, of a throwaway: "the logo in the header should be bigger", and "the header has a logo with a white bg so the
// bg of the section should be white so there is not that weird contrast". That logo was a 438 by 434 PNG on a solid white
// box whose ink filled 53% of its height: half of what the header drew was the file's own margin, and the box showed on a
// cream page. Nothing stored says so: Sanity's palette ignores a white ground (its dominant swatch was the ink), and only
// `isOpaque` says a file has a box at all. So the site reads the file once, on the server, and answers two facts:
//
// - `box`: what surrounds the ink, read from the one-pixel border (its most common color, where at least 95% of the
//   border is within 24 levels of it): `clear`, `white`, `black`, a hex, or null where the border is not one color (the
//   ink reaches the edge).
// - `trim`: the ink's rectangle, as fractions of the file, where the box is clear, white or black and some side's margin
//   is at least 3%; never where the box is a color (a navy box with white words is the logo), and never a sliver (a thin
//   frame at the edge is the logo too). A soft shadow counts as ink at any alpha above 2.
//
// Read once per file: the URL carries the asset's content hash, so an answer never goes stale. A failure answers null,
// and the logo draws as it always has.

export type LogoBox = 'clear' | 'white' | 'black' | `#${string}`
export type LogoTrim = {left: number; top: number; width: number; height: number}
export type LogoFacts = {box: LogoBox | null; trim: LogoTrim | null}

const TOLERANCE = 24
const UNIFORM = 0.95
const CLEAR_ALPHA = 2
const MIN_MARGIN = 0.03
const SAMPLE_WIDTH = 512

const hex2 = (v: number) => Math.round(v).toString(16).padStart(2, '0')

/** The facts from a decoded RGBA image. Pure: the test feeds it images `sharp` draws. */
export function factsFromPixels(data: Uint8Array, width: number, height: number): LogoFacts {
  const px = (x: number, y: number) => {
    const i = (y * width + x) * 4
    return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const
  }
  const edge: (readonly [number, number, number, number])[] = []
  for (let x = 0; x < width; x++) edge.push(px(x, 0), px(x, height - 1))
  for (let y = 1; y < height - 1; y++) edge.push(px(0, y), px(width - 1, y))

  let box: LogoBox | null
  let isInk: (p: readonly [number, number, number, number]) => boolean
  if (edge.filter((p) => p[3] <= CLEAR_ALPHA).length >= UNIFORM * edge.length) {
    box = 'clear'
    isInk = (p) => p[3] > CLEAR_ALPHA
  } else {
    const buckets = new Map<string, number[][]>()
    for (const p of edge) {
      if (p[3] < 250) continue
      const key = `${p[0] >> 4},${p[1] >> 4},${p[2] >> 4}`
      const list = buckets.get(key) ?? []
      list.push([p[0], p[1], p[2]])
      buckets.set(key, list)
    }
    const modal = [...buckets.values()].sort((a, b) => b.length - a.length)[0]
    if (!modal) return {box: null, trim: null}
    const ref = [0, 1, 2].map((c) => modal.reduce((s, p) => s + p[c], 0) / modal.length)
    const near = (p: readonly [number, number, number, number]) =>
      p[3] >= 250 && Math.max(Math.abs(p[0] - ref[0]), Math.abs(p[1] - ref[1]), Math.abs(p[2] - ref[2])) <= TOLERANCE
    if (edge.filter(near).length < UNIFORM * edge.length) return {box: null, trim: null}
    box = Math.min(...ref) >= 248 ? 'white' : Math.max(...ref) <= 7 ? 'black' : (`#${ref.map(hex2).join('')}` as LogoBox)
    isInk = (p) => !near(p)
  }
  if (box !== 'clear' && box !== 'white' && box !== 'black') return {box, trim: null}

  let x0 = width, y0 = height, x1 = -1, y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isInk(px(x, y))) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return {box, trim: null}
  const margins = [x0 / width, y0 / height, (width - 1 - x1) / width, (height - 1 - y1) / height]
  if (Math.max(...margins) < MIN_MARGIN) return {box, trim: null}
  return {box, trim: {left: x0 / width, top: y0 / height, width: (x1 - x0 + 1) / width, height: (y1 - y0 + 1) / height}}
}

async function pixelsOf(src: string): Promise<Buffer> {
  // A path under `public/` (the CI stub's stand-ins) is read from disk; anything else is the image CDN, asked for a
  // raster of a bounded width (an SVG logo comes back drawn).
  if (src.startsWith('/')) return readFile(join(process.cwd(), 'public', src))
  const url = `${src}${src.includes('?') ? '&' : '?'}w=${SAMPLE_WIDTH}&fm=png`
  const res = await fetch(url, {signal: AbortSignal.timeout(4_000)})
  if (!res.ok) throw new Error(`${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

const read = new Map<string, Promise<LogoFacts | null>>()

/** The facts of the logo at `src`, read once per file; null where the file cannot be read. */
export function logoFacts(src: string | null | undefined): Promise<LogoFacts | null> {
  if (!src) return Promise.resolve(null)
  let facts = read.get(src)
  if (!facts) {
    facts = pixelsOf(src)
      .then(async (buf) => {
        const {data, info} = await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject: true})
        return factsFromPixels(data, info.width, info.height)
      })
      .catch(() => null)
    if (read.size >= 64) read.delete(read.keys().next().value!)
    read.set(src, facts)
  }
  return facts
}

type Crop = {top?: number | null; bottom?: number | null; left?: number | null; right?: number | null} | null | undefined

/** A crop set in the Studio, as a trim: it always wins over the one read from the pixels. None where nothing is cut. */
export function cropTrim(crop: Crop): LogoTrim | null {
  const [top, bottom, left, right] = [crop?.top ?? 0, crop?.bottom ?? 0, crop?.left ?? 0, crop?.right ?? 0]
  if (!(top > 0 || bottom > 0 || left > 0 || right > 0)) return null
  const width = 1 - left - right
  const height = 1 - top - bottom
  return width > 0 && height > 0 ? {left, top, width, height} : null
}

/** The facts of one logo field: its file's, the Studio's crop winning over the file's trim. */
export async function factsOf(logo: {src?: string | null; crop?: Crop}): Promise<LogoFacts | null> {
  const facts = await logoFacts(logo.src)
  const crop = cropTrim(logo.crop)
  return crop ? {box: facts?.box ?? null, trim: crop} : facts
}

type LogoLike = {src?: string | null; crop?: Crop; facts?: LogoFacts | null} | null | undefined

/** The same object with its logos' facts laid beside them, wherever the chrome carries a logo. */
export async function withLogoFacts<T>(chrome: T): Promise<T> {
  const c = chrome as {header?: {designSettings?: Record<string, LogoLike> | null} | null; footer?: {designSettings?: Record<string, LogoLike> | null} | null} | null
  const sets = [c?.header?.designSettings, c?.footer?.designSettings].filter((s): s is Record<string, LogoLike> => !!s)
  await Promise.all(sets.flatMap((set) => Object.entries(set).map(async ([k, logo]) => {
    if (!logo || typeof logo !== 'object' || !('src' in logo) || !logo.src) return
    set[k] = {...logo, facts: await factsOf(logo)}
  })))
  return chrome
}
