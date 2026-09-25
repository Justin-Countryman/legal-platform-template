#!/usr/bin/env node
// texture-pixels — the darkest pixel of every section texture, as a browser draws it.
//
//   node scripts/ci/texture-pixels.mjs       # run from site/; no build needed
//
// Phase 17C session 3 (`[R-538]`; monorepo WS-V1-PHASE17C3-DESIGN §2.3, amended by ADV-17C3-B).
// `validateWcag` holds every text tier to 4.5:1 on the texture's blend as modelled: its ink at the swept
// opacity over the ground. A browser does not draw the model exactly: a linear tile draws a level of 255
// toward its ink in both raster paths, and a two-layer tile another in the headless shell's software
// raster (measured, record §7.2), which put text a hair under AA on near-threshold palettes. So a texture
// renders under the sweep (its render scale), and this script holds what that buys: for every tile at
// every strength, on the light ground and on a dark ground whose ink is lighter than it (the one case where
// a darker-drawn line moves toward the text; a black ink only moves away), over the presets and the
// near-threshold palettes, in the headless shell, in full Chromium and in WebKit, at DPR 1 and 3, the pixel furthest
// from the ground toward the ink is no further than the swept blend, and every text tier holds 4.5:1 on
// it. The cases come from the engine (`scripts/ci/__snapshots__/texture-cases.json`, written by
// `lib/__tests__/textureCases.test.ts`), so this script needs no TypeScript.

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {chromium, webkit} from '@playwright/test'
import sharp from 'sharp'
import {converter, formatHex, wcagContrast} from 'culori'

const data = JSON.parse(readFileSync(resolve('scripts/ci/__snapshots__/texture-cases.json'), 'utf8'))
const toRgb = converter('rgb')
const LUT = Array.from({length: 256}, (_, i) => { const v = i / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
const lum = (hex) => { const c = toRgb(hex); const f = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) }
const blend = (g0, k0, a) => { const g = toRgb(g0), k = toRgb(k0); const m = (x, y) => x * (1 - a) + y * a; return formatHex({mode: 'rgb', r: m(g.r, k.r), g: m(g.g, k.g), b: m(g.b, k.b)}) }
const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

// One cell per tile, strength, palette and ground: the ground, and the layer at the opacity it renders at.
const cells = []
for (const p of data.palettes) {
  for (const t of data.tiles) {
    cells.push({p, t, ground: 'light', bg: p.light.ground, ink: p.light.ink, swept: p.light.opacity, opacity: p.light.opacity * t.render.light, tiers: p.light.tiers})
    // A lighter ink renders at its render scale and never above the cushion (whole alpha steps in WebKit).
    if (p.dark.lighterInk) cells.push({p, t, ground: 'dark', bg: p.dark.ground, ink: p.dark.ink, swept: p.dark.opacity, opacity: Math.min(p.dark.opacity * t.render.dark, p.dark.cushion), tiers: p.dark.tiers})
  }
}

const CELL = 32, COLS = 30, PER = 600
const failures = []
// Three engines: Chromium's software raster (the headless shell), full Chromium, and WebKit (Safari's
// engine), which rounds a layer's opacity to whole steps of 1/255 (ADV-17C3-PRB).
for (const path of ['headless shell', 'full Chromium', 'WebKit']) {
  const browser = path === 'WebKit' ? await webkit.launch() : await chromium.launch(path === 'full Chromium' ? {channel: 'chromium'} : {})
  for (const dpr of [1, 3]) {
    const context = await browser.newContext({viewport: {width: COLS * CELL, height: 800}, deviceScaleFactor: dpr})
    const page = await context.newPage()
    let lowest = Infinity
    let past = 0
    for (let b = 0; b < cells.length; b += PER) {
      const batch = cells.slice(b, b + PER)
      // A doctype: without one, quirks mode stretches the grid's rows and every cell is misread (record §7.2).
      await page.setContent(`<!doctype html><html><body style="margin:0;display:grid;align-content:start;grid-template-columns:repeat(${COLS},${CELL}px)">` +
        batch.map((x) => `<div style="position:relative;isolation:isolate;width:${CELL}px;height:${CELL}px;background:${x.bg};overflow:hidden">` +
          `<div style="position:absolute;inset:0;z-index:-1;color:${x.ink};opacity:${x.opacity.toFixed(5)};background-image:${x.t.image};background-size:${x.t.size}"></div></div>`).join('') +
        '</body></html>')
      const png = await page.screenshot({clip: {x: 0, y: 0, width: COLS * CELL, height: Math.ceil(batch.length / COLS) * CELL}, animations: 'disabled'})
      const {data: px, info} = await sharp(png).raw().toBuffer({resolveWithObject: true})
      batch.forEach((x, i) => {
        const cx = (i % COLS) * CELL * dpr
        const cy = Math.floor(i / COLS) * CELL * dpr
        const groundL = lum(x.bg)
        let far = x.bg
        let farD = 0
        // The cell's edge pixels are left out: the cells abut, and a neighbour's ground may bleed in.
        for (let y = cy + 1; y < cy + CELL * dpr - 1; y++) {
          for (let xx = cx + 1; xx < cx + CELL * dpr - 1; xx++) {
            const o = (y * info.width + xx) * info.channels
            const d = Math.abs(0.2126 * LUT[px[o]] + 0.7152 * LUT[px[o + 1]] + 0.0722 * LUT[px[o + 2]] - groundL)
            if (d > farD) { farD = d; far = hex(px[o], px[o + 1], px[o + 2]) }
          }
        }
        const model = blend(x.bg, x.ink, x.swept)
        const where = `${path}, DPR ${dpr}: ${x.p.label}, ${x.t.family} ${x.t.strength} on the ${x.ground} ground`
        if (farD > Math.abs(lum(model) - groundL) + 1e-9) { past++; failures.push(`${where}: drew ${far}, past the swept blend ${model}`) }
        const min = Math.min(...x.tiers.map((t) => wcagContrast(t, far)))
        lowest = Math.min(lowest, min)
        if (min < 4.5) failures.push(`${where}: a text tier at ${min.toFixed(3)}:1 on ${far}`)
      })
    }
    console.log(`texture-pixels: ${path}, DPR ${dpr}: ${cells.length} cells, ${past} past the swept blend, the lowest text contrast ${lowest.toFixed(3)}:1`)
    await context.close()
  }
  await browser.close()
}
if (failures.length) {
  for (const f of failures.slice(0, 80)) console.log(`::error::${f}`)
  console.log(`texture-pixels: ${failures.length} failure(s)${failures.length > 80 ? ' (the first 80 printed)' : ''}`)
  process.exit(1)
}
console.log('texture-pixels: every tile at every strength, and the ghost, draws no further toward its ink than the blend validateWcag sweeps, in the headless shell, full Chromium and WebKit.')
