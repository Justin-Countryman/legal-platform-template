#!/usr/bin/env node
// heading-advances — the character widths a section heading's fit reads, measured from the committed faces.
//
//   node scripts/ci/heading-advances.mjs [--update]     # run from site/
//
// Phase 17C session 3 (`[R-536]`, `[R-544]`; monorepo WS-V1-PHASE17C3-DESIGN §2.1). A section heading is
// set smaller only when its words would take more lines than the rule allows in its column, and only as
// much as they need. The server works out how wide the words are in the face the page wears
// (`lib/headingFit.ts`), from `fonts/heading-advances.json`: for every pairing's heading, at every weight it
// can draw, the advance of each printable ASCII character in em. This script measures them in Chromium
// from the faces exactly as the page declares them (`presets.json` `fontPairings[].headingFaces`, written
// by `lib/__tests__/presets.test.ts` from the font loader), with `--update` writes the table, and without
// it fails on any difference, so a font file that changes cannot leave the table behind.

import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'

const UPDATE = process.argv.includes('--update')
const TABLE = resolve('fonts/heading-advances.json')
const PUBLIC = resolve('public')
// Measured at 1000 px, so a platform that hints advances to whole pixels moves them by 0.001 em at most;
// the tolerance is 0.6% of an average character, well inside the fit's 2% slack.
const PX = 1000
const TOLERANCE = 0.003
const presets = JSON.parse(readFileSync('../studio/presets.json', 'utf8'))
const CHARS = Array.from({length: 95}, (_, i) => String.fromCharCode(32 + i))

const faces = presets.fontPairings.flatMap((p) => (p.headingFaces ?? []).map((rule) =>
  rule.replace(`font-family:'heading'`, `font-family:'p${p.id}'`).replace(/url\('\/fonts\//g, `url('file://${PUBLIC}/fonts/`)))
const html = `<!doctype html><html><head><style>${faces.join('')}</style></head><body></body></html>`
const page0 = resolve(process.env.TMPDIR ?? '/tmp', `heading-advances-${process.pid}.html`)
writeFileSync(page0, html)

const browser = await chromium.launch({channel: 'chromium'})
const page = await browser.newPage()
await page.goto(`file://${page0}`)
const measured = {}
for (const p of presets.fontPairings) {
  measured[p.id] = await page.evaluate(async ({id, weights, CHARS, PX}) => {
    const out = {}
    for (const w of weights) {
      await document.fonts.load(`${w} ${PX}px 'p${id}'`)
      if (!document.fonts.check(`${w} ${PX}px 'p${id}'`)) throw new Error(`pairing ${id} at ${w} did not load`)
      const ctx = document.createElement('canvas').getContext('2d')
      ctx.font = `${w} ${PX}px 'p${id}'`
      out[w] = CHARS.map((c) => Math.round((ctx.measureText(c).width / PX) * 10000) / 10000)
    }
    return out
  }, {id: p.id, weights: p.headingWeights, CHARS, PX})
}
await browser.close()

const table = {
  method: 'the advance of each printable ASCII character (32 to 126, in order) in em, measured in Chromium with canvas measureText at 1000 px, per pairing (fontPairings[].id) and per weight the heading can draw, from the faces presets.json declares',
  pairings: measured,
}
if (UPDATE) {
  writeFileSync(TABLE, JSON.stringify(table) + '\n')
  console.log(`heading-advances: wrote ${TABLE} (${Object.keys(measured).length} pairings)`)
} else {
  const committed = JSON.parse(readFileSync(TABLE, 'utf8')).pairings
  const failures = []
  for (const [id, byWeight] of Object.entries(measured)) {
    for (const [w, row] of Object.entries(byWeight)) {
      const was = committed[id]?.[w]
      if (!was) { failures.push(`pairing ${id} at ${w}: not in the table`); continue }
      row.forEach((v, i) => { if (Math.abs(v - was[i]) > TOLERANCE) failures.push(`pairing ${id} at ${w}: '${CHARS[i]}' measures ${v}, the table says ${was[i]}`) })
    }
  }
  for (const id of Object.keys(committed)) if (!(id in measured)) failures.push(`pairing ${id}: in the table, not a pairing`)
  if (failures.length) {
    for (const f of failures.slice(0, 40)) console.log(`::error::${f}`)
    console.log(`heading-advances: ${failures.length} difference(s); run with --update on purpose`)
    process.exit(1)
  }
  console.log('heading-advances: every pairing measures what the table says.')
}
