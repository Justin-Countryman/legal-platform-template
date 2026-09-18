import {__unstable__loadDesignSystem} from '@tailwindcss/node'
import fs from 'node:fs'
import path from 'node:path'
import {beforeAll, describe, expect, it} from 'vitest'
import {findUnknown, readPlainCssClasses} from '../../../../scripts/check-unknown-utility-classes.mjs'
import {ALL_BENTO_CLASSES, bentoLayout} from '../bento'

// ─── Every bento row fills (Phase 16A) ────────────────────────────────────────
//
// Justin saw the mosaic leave the third column empty on its last rows in the
// block catalog (2026-09-18); the challenge's solver found holes at most counts,
// at two and three columns, in both grid modes. The spans are now chosen per count.
// This places the tiles the way CSS grid's default (non-dense) auto-placement does,
// row by row in reading order, and requires a fully packed grid.

type Tile = {cols: number; rows: number}

/** The span a class list gives a tile at a given column count. */
function spanAt(classes: string, columns: 1 | 2 | 3): Tile {
  const tokens = classes.split(/\s+/).filter(Boolean)
  const applies = (t: string) => {
    if (t.startsWith('@4xl:')) return columns === 3 ? t.slice(5) : null
    if (t.startsWith('@sm:')) return columns >= 2 ? t.slice(4) : null
    return t.includes(':') ? null : t
  }
  let cols = 1
  let rows = 1
  // Narrow breakpoints first so a wider one overrides, as the cascade does.
  for (const prefix of ['', '@sm:', '@4xl:']) {
    for (const t of tokens.filter((x) => (prefix ? x.startsWith(prefix) : !x.includes(':')))) {
      const u = applies(t)
      if (!u) continue
      const c = /^col-span-(\d)$/.exec(u)
      const r = /^row-span-(\d)$/.exec(u)
      if (c) cols = Number(c[1])
      if (r) rows = Number(r[1])
    }
  }
  return {cols: Math.min(cols, columns), rows}
}

/** Non-dense auto-placement: each tile goes at the first free slot at or after the
 *  previous tile's start, scanning row by row. Returns the grid's filled cells. */
function place(tiles: Tile[], columns: number): boolean[][] {
  const grid: boolean[][] = []
  const free = (r: number, c: number, t: Tile) => {
    if (c + t.cols > columns) return false
    for (let y = r; y < r + t.rows; y++) for (let x = c; x < c + t.cols; x++) if (grid[y]?.[x]) return false
    return true
  }
  let cursorR = 0
  let cursorC = 0
  for (const t of tiles) {
    let r = cursorR
    let c = cursorC
    while (!free(r, c, t)) {
      c += 1
      if (c >= columns) { c = 0; r += 1 }
    }
    for (let y = r; y < r + t.rows; y++) {
      grid[y] ??= Array(columns).fill(false)
      for (let x = c; x < c + t.cols; x++) grid[y][x] = true
    }
    cursorR = r
    cursorC = c
  }
  return grid
}

const items = (n: number) => Array.from({length: n}, (_, i) => ({_key: `k${i}`, label: `Area ${i}`, href: `/a${i}/`}))

describe('every bento row fills', () => {
  for (const mode of ['bentoLeft', 'bentoMosaic'] as const) {
    for (const columns of [1, 2, 3] as const) {
      it.each(Array.from({length: 12}, (_, i) => i + 1))(`${mode}, ${columns} column(s), %i items`, (n) => {
        const {heroSpan, cellClasses} = bentoLayout(items(n) as never, mode)
        const tiles = [spanAt(heroSpan, columns), ...cellClasses.map((c) => spanAt(c, columns))]
        const grid = place(tiles, columns)
        const holes = grid.flatMap((row, y) => row.map((cell, x) => (cell ? null : `row ${y + 1} column ${x + 1}`))).filter(Boolean)
        expect(holes).toEqual([])
      })
    }
  }
})

const SITE_ROOT = path.resolve(__dirname, '../../../..')
let designSystem: {candidatesToCss: (names: string[]) => (string | null)[]}
let plainCss: Set<string>
beforeAll(async () => {
  designSystem = await __unstable__loadDesignSystem(fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8'), {base: SITE_ROOT})
  plainCss = readPlainCssClasses(SITE_ROOT)
})

describe('the bento classes', () => {
  it('every class resolves through Tailwind (the spans live in a .ts map)', () => {
    expect(findUnknown([...ALL_BENTO_CLASSES], designSystem, plainCss)).toEqual([])
  })
})
