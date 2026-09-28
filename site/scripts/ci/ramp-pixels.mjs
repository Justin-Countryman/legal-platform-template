#!/usr/bin/env node
// ramp-pixels — the lightest pixel of every gradient ramp, as a browser draws it.
//
//   node scripts/ci/ramp-pixels.mjs       # run from site/; no build needed
//
// Phase 17D session 2 (`[R-553]`; monorepo WS-V1-PHASE17D2-DESIGN §2.2). `validateWcag` holds a ramp as drawn in a
// model (every level of it a level of 255 lighter in every channel) under one luminance ceiling: the lightest a dark
// ground may be drawn for every on-dark pair to hold, and no lighter than the ground. A browser draws a gradient a
// level past its model (ADV-17D-C: the control border under 3:1 on up to 141 of 432 palettes in three engines), so
// this script holds the drawing itself: every ramp in `__snapshots__/ramp-cases.json` (written by
// `lib/__tests__/rampCases.test.ts`) in the headless shell, full Chromium and WebKit, at DPR 1 and 3, each in a cell of
// its own, and no pixel lighter than its ceiling. A calibration strip prints, and does not assert, how far each engine
// draws past the model on plain ramps, so a new engine's drawing is read before it is trusted.

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {chromium, webkit} from '@playwright/test'
import sharp from 'sharp'
import {converter, formatHex} from 'culori'

const data = JSON.parse(readFileSync(resolve('scripts/ci/__snapshots__/ramp-cases.json'), 'utf8'))
const toRgb = converter('rgb')
const toOklab = converter('oklab')
const LUT = Array.from({length: 256}, (_, i) => { const v = i / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
const lum = (r, g, b) => 0.2126 * LUT[r] + 0.7152 * LUT[g] + 0.0722 * LUT[b]
const channels = (hex) => { const c = toRgb(hex); return [c.r, c.g, c.b].map((v) => Math.min(255, Math.max(0, Math.round(v * 255)))) }
const modelAt = (a0, b0, t) => { const a = toOklab(a0), b = toOklab(b0); return channels(formatHex({mode: 'oklab', l: a.l + (b.l - a.l) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t})) }

const W = 16, H = 240, COLS = 60, PER = 120
// A glow is drawn as `band-glow` draws a run of one (`globals.css`): the ground at one edge fading out by 70% of the
// width, over the ground to the glow at the middle and back; four cells wide, so the side layer spans a real width.
const imageOf = (x) => x.ramp === 'glow'
  ? `linear-gradient(to right,${x.ground} 0%,transparent 70%),linear-gradient(in oklab,${x.from} 0%,${x.to} 50%,${x.from} 100%)`
  : `linear-gradient(in oklab,${x.from} 0%,${x.to} 100%)`
const failures = []
async function drawCells(page, dpr, cells) {
  const out = []
  for (let b0 = 0; b0 < cells.length; b0 += PER) {
    const batch = cells.slice(b0, b0 + PER)
    // A doctype: without one, quirks mode stretches the grid's rows and every cell is misread (as texture-pixels.mjs found).
    await page.setContent(`<!doctype html><html><body style="margin:0;display:grid;align-content:start;grid-template-columns:repeat(${COLS},${W}px)">` +
      batch.map((x) => `<div style="width:${W * (x.ramp === 'glow' ? 4 : 1)}px;height:${H}px;grid-column:span ${x.ramp === 'glow' ? 4 : 1};background-color:${x.ground};background-image:${imageOf(x)}"></div>`).join('') +
      '</body></html>')
    const slots = batch.reduce((n, x) => { const span = x.ramp === 'glow' ? 4 : 1; if ((n % COLS) + span > COLS) n += COLS - (n % COLS); return n + span }, 0)
    const png = await page.screenshot({clip: {x: 0, y: 0, width: COLS * W, height: Math.ceil(slots / COLS) * H}, animations: 'disabled'})
    const {data: px, info} = await sharp(png).raw().toBuffer({resolveWithObject: true})
    let slot = 0
    batch.forEach((x) => {
      const span = x.ramp === 'glow' ? 4 : 1
      if ((slot % COLS) + span > COLS) slot += COLS - (slot % COLS)
      const cx = (slot % COLS) * W * dpr, cy = Math.floor(slot / COLS) * H * dpr
      slot += span
      const wide = W * span * dpr
      let max = 0, excess = 0, lumExcess = -Infinity
      // The cell's edge pixels are left out: the cells abut, and a neighbour may bleed in.
      for (let y = cy + 1; y < cy + H * dpr - 1; y++) {
        const m = modelAt(x.from, x.to, (y - cy + 0.5) / (H * dpr))
        for (let xx = cx + 1; xx < cx + wide - 1; xx++) {
          const o = (y * info.width + xx) * info.channels
          const L = lum(px[o], px[o + 1], px[o + 2])
          if (L > max) max = L
          excess = Math.max(excess, px[o] - m[0], px[o + 1] - m[1], px[o + 2] - m[2])
          lumExcess = Math.max(lumExcess, L - lum(...m))
        }
      }
      out.push({x, max, excess, lumExcess})
    })
  }
  return out
}

for (const path of ['headless shell', 'full Chromium', 'WebKit']) {
  const browser = path === 'WebKit' ? await webkit.launch() : await chromium.launch(path === 'full Chromium' ? {channel: 'chromium'} : {})
  for (const dpr of [1, 3]) {
    // Tall enough for a batch of glows, each four cells wide.
    const context = await browser.newContext({viewport: {width: COLS * W, height: Math.ceil((4 * PER) / COLS) * H}, deviceScaleFactor: dpr})
    const page = await context.newPage()
    const drawn = await drawCells(page, dpr, data.ramps)
    let past = 0
    // The lowest margin per kind of ramp: the bridge's first row, drawn a level lighter, meets its ground by
    // construction (1.0000), which would hide the glow's own slack in one number (ADV-17D2-P).
    const lowest = {bridge: Infinity, glow: Infinity}
    for (const {x, max} of drawn) {
      const margin = (x.ceiling + 0.05) / (max + 0.05)
      lowest[x.ramp] = Math.min(lowest[x.ramp], margin)
      if (max > x.ceiling + 1e-12) { past++; failures.push(`${path}, DPR ${dpr}: ${x.label} (${x.ramp}, ${x.from} to ${x.to}): drew a pixel at luminance ${max.toFixed(5)}, past its ceiling ${x.ceiling.toFixed(5)}`) }
    }
    const cal = await drawCells(page, dpr, data.calibration.map(([from, to]) => ({from, to, ground: from})))
    const calText = cal.map(({x, excess, lumExcess}) => `${x.from}->${x.to} +${excess} levels, luminance ${lumExcess >= 0 ? '+' : ''}${lumExcess.toFixed(5)}`).join('; ')
    console.log(`ramp-pixels: ${path}, DPR ${dpr}: ${drawn.length} ramps, ${past} past their ceiling, the lowest margin ${lowest.bridge.toFixed(4)} on a bridge ramp and ${lowest.glow.toFixed(4)} on a glow; calibration (drawn past the model at a row): ${calText}`)
    await context.close()
  }
  await browser.close()
}
if (failures.length) {
  for (const f of failures.slice(0, 80)) console.log(`::error::${f}`)
  console.log(`ramp-pixels: ${failures.length} failure(s)${failures.length > 80 ? ' (the first 80 printed)' : ''}`)
  process.exit(1)
}
console.log('ramp-pixels: every ramp draws no pixel past its ceiling in the headless shell, full Chromium and WebKit, at DPR 1 and 3.')
