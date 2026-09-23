#!/usr/bin/env node
// flow-metrics — every theme on every stub canvas at 1440 and at a TRUE 390, measured.
//
//   node scripts/ci/flow-metrics.mjs [--update] [--out <dir>]     # run from site/, after the build
//
// Phase 17B session 3 (monorepo WS-V1-PHASE17B-DESIGN §2.11 point 4, amendment 18).
// Nothing in the template was tested at any width, and a headless Chrome WINDOW clamps at
// 500 pixels, so every "390" capture made with --window-size was a 500 layout cropped
// (ADV-17B-B, from Chromium's source: kMainBrowserContentsMinimumWidth). Device-metrics
// emulation has no such floor (ADV-17B-A, measured): Playwright's `viewport: 390x844,
// isMobile: true` lays the page out at 390, and this script asserts `innerWidth` is 390
// before it trusts a number.
//
// WHAT IT MEASURES. On the stub build served with `next start` and a throwaway preview
// secret, the operator's preview address for every roster theme on every stub dataset
// under scripts/ci/ (the CI fixture and the three record-composed canvases), the stub
// restarted per dataset with the same server: per band (every outermost <section> in
// <main>: the hero, the canvas bands, the close), the computed ground and ink, the ring
// context, the top (from the first band's top: the header above it is Main
// Navigation's, not the theme's, and its measured height settles after hydration), the
// height and paddings, the divider, hairline and gradient classes,
// the texture and ghost layers, and the tallest heading's line count; per page, the
// inner width, the scroll width (no horizontal scroll) and the band count. Compared to
// the committed JSON: the discrete facts exactly, the lengths within a tolerance, because
// text rasterizes a pixel or two differently across operating systems.
//
// A METRICS GOLDEN, NOT A PIXEL GOLDEN. Playwright's pixel snapshots are per platform
// and must be generated in the CI container, where text renders differently from a
// Mac; the facts above hold the same layout without an image to commit. The two
// screenshots per page are written for the eye and uploaded as CI artifacts, and never
// compared. `--update` rewrites the golden: only on purpose, with the reason in the
// commit, and read in review.
//
// The eye pass's rule (the vision, §3): nothing wraps past four lines at 390. The
// heading line count is measured here so that rule is a number the golden holds.

import {createHmac} from 'node:crypto'
import {spawn} from 'node:child_process'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null }
const UPDATE = process.argv.includes('--update')
const OUT = resolve(arg('--out') ?? 'flow-captures')
const GOLDEN = resolve('scripts/ci/__snapshots__/flow-metrics.json')
const STUB_PORT = Number(process.env.STUB_PORT ?? 4013)
const APP_PORT = Number(process.env.APP_PORT ?? 3119)
const SECRET = 'ci-preview-secret'
const BASE = `http://127.0.0.1:${APP_PORT}`

// The style set and palette every theme is measured under: Graphite names a texture,
// so Cut blocks has what it needs; the palette is fixed so only the theme moves.
const STYLE_SET = 'graphite'
const PALETTE = 'navy-brass'

const CANVASES = [
  ['stub', 'scripts/ci/fixture.ndjson'],
  ['adversarial-mostly-dark', 'scripts/ci/record-adversarial-mostly-dark.ndjson'],
  ['planning-mostly-light', 'scripts/ci/record-planning-mostly-light.ndjson'],
  ['multi-practice-balanced', 'scripts/ci/record-multi-practice-balanced.ndjson'],
]
const WIDTHS = [
  ['1440', {viewport: {width: 1440, height: 900}}],
  ['390', {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}],
]
const presets = JSON.parse(readFileSync('../studio/presets.json', 'utf8'))
const FLOWS = presets.flows.map((f) => f.id)

// ─── Servers ──────────────────────────────────────────────────────────────────
const wait = async (url, tries = 100, ms = 100) => {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok || r.status === 404) return } catch {}
    await new Promise((r) => setTimeout(r, ms))
  }
  throw new Error(`${url} did not answer`)
}
let stub = null
async function startStub(file) {
  if (stub) { stub.kill('SIGTERM'); await new Promise((r) => stub.once('exit', r)); stub = null }
  stub = spawn('node', ['scripts/ci/content-lake-stub.mjs'], {env: {...process.env, PORT: String(STUB_PORT), MOCK_DATASET_NDJSON: file}, stdio: ['ignore', 'ignore', 'inherit']})
  await wait(`http://127.0.0.1:${STUB_PORT}/v2024-01-01/data/query/production?query=count(*)`)
}
const app = spawn('npx', ['next', 'start', '-p', String(APP_PORT)], {
  env: {
    ...process.env, SITE_PREVIEW_SECRET: SECRET, SANITY_API_HOST_OVERRIDE: `http://127.0.0.1:${STUB_PORT}`,
    NEXT_PUBLIC_SANITY_PROJECT_ID: 'TEMPLATE_SANITY_PROJECT_ID', NEXT_PUBLIC_SANITY_DATASET: 'production',
    NEXT_PUBLIC_SITE_DOMAIN: 'example.com', NEXT_TELEMETRY_DISABLED: '1',
  },
  stdio: ['ignore', 'ignore', 'inherit'],
})
const stop = () => { app.kill('SIGTERM'); if (stub) stub.kill('SIGTERM') }
process.on('exit', stop)
process.on('SIGINT', () => { stop(); process.exit(130) })

const sign = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${createHmac('sha256', SECRET).update(body).digest('base64url')}`
}
const now = Math.floor(Date.now() / 1000)
const operator = sign({v: 1, role: 'operator', exp: now + 3600})

// ─── The measurement, in the page ─────────────────────────────────────────────
function measure() {
  const main = document.querySelector('main') ?? document.body
  const bands = [...main.querySelectorAll('section')].filter((s) => !s.parentElement.closest('section'))
  const origin = bands[0] ? bands[0].getBoundingClientRect().top : 0
  const px = (v) => Math.round(parseFloat(v) || 0)
  const keep = (cls) => /^(divider-|hairline-top$|band-gradient$|grad-[in]-|bg-)/.test(cls)
  // Phase 17B session 4 (`[R-518]`): the site header and footer, whose schemes the theme now
  // sets. The ground at 390 is the header's own: the mobile row shows it and paints none.
  const chromeOf = (el) => (el ? {ring: el.getAttribute('data-ring-context'), bg: getComputedStyle(el).backgroundColor} : null)
  // The mobile row, the header's first child, paints its own ground (ADV-17B4-2: the header's
  // alone did not see a change on phones).
  const header = document.querySelector('header')
  return {
    header: chromeOf(header),
    headerRow: header?.firstElementChild ? getComputedStyle(header.firstElementChild).backgroundColor : null,
    footer: chromeOf(document.querySelector('footer[aria-labelledby="footer-heading"]')),
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    bands: bands.map((s, i) => {
      const cs = getComputedStyle(s)
      const r = s.getBoundingClientRect()
      const heading = s.querySelector('h1, h2')
      let lines = 0
      if (heading) {
        const h = getComputedStyle(heading)
        const lh = parseFloat(h.lineHeight) || parseFloat(h.fontSize) * 1.2
        lines = Math.round(heading.getBoundingClientRect().height / lh)
      }
      return {
        i,
        heading: (heading?.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 48) || null,
        ring: s.getAttribute('data-ring-context'),
        scrim: s.getAttribute('data-scrim'),
        bg: cs.backgroundColor,
        ink: cs.color,
        classes: [...s.classList].filter(keep).sort(),
        texture: !!s.querySelector('[data-section-texture]'),
        ghost: !!s.querySelector('[data-decor-layer]'),
        top: Math.round(r.top - origin),
        height: Math.round(r.height),
        pt: px(cs.paddingTop),
        pb: px(cs.paddingBottom),
        headingLines: lines,
      }
    }),
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────
await wait(`${BASE}/`, 200, 200)
mkdirSync(OUT, {recursive: true})
const browser = await chromium.launch({channel: 'chromium'})
const results = {}
const failures = []
const fail = (m) => failures.push(m)
try {
  for (const [canvas, file] of CANVASES) {
    if (!existsSync(file)) { console.log(`flow-metrics: ${file} absent, skipped`); continue }
    await startStub(file)
    for (const [width, device] of WIDTHS) {
      const context = await browser.newContext({...device, reducedMotion: 'reduce', colorScheme: 'light'})
      await context.addCookies([{name: 'lp-preview', value: operator, url: `${BASE}/site-preview`}])
      const page = await context.newPage()
      for (const flow of FLOWS) {
        const key = `${canvas} / ${flow} / ${width}`
        const url = `${BASE}/site-preview/${STYLE_SET}/${PALETTE}/${flow}/design`
        // `load`, then the fonts: `networkidle` never settled on some pages (a kept-alive
        // connection is enough to hold it), and what the measure needs is the layout.
        let res = null
        for (let attempt = 0; attempt < 2 && !res; attempt++) {
          try { res = await page.goto(url, {waitUntil: 'load', timeout: 60_000}) } catch (e) { if (attempt === 1) throw e }
        }
        if (!res || res.status() !== 200) { fail(`${key}: ${url} answered ${res?.status()}`); continue }
        // `goto` reports the final status after a redirect (ADV-17B-3 F4): the page measured
        // must be the address asked for, and must say it wears the theme asked for.
        if (page.url() !== url) { fail(`${key}: landed on ${page.url()}, not ${url}`); continue }
        const flowName = presets.flows.find((f) => f.id === flow)?.name
        const bar = await page.evaluate(() => document.querySelector('.sw summary')?.textContent ?? '')
        if (!flowName || !bar.includes(flowName)) { fail(`${key}: the page's bar reads "${bar}", not the theme "${flowName}"`); continue }
        await page.evaluate(() => document.fonts.ready)
        // The switcher is the operator's bar, not the page: hidden for the measure and the eye.
        await page.addStyleTag({content: '.sw{display:none !important}'})
        // Reveal-on-scroll wrappers: sweep the page once so every band has entered view.
        await page.evaluate(async () => {
          const h = document.documentElement.scrollHeight
          for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) }
          window.scrollTo(0, 0)
          // Let the header's measured height and the last transitions settle.
          await new Promise((r) => setTimeout(r, 400))
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        })
        const m = await page.evaluate(measure)
        results[key] = m
        if (m.innerWidth !== device.viewport.width) fail(`${key}: innerWidth is ${m.innerWidth}, not ${device.viewport.width} (the layout is not at this width)`)
        if (m.scrollWidth > m.clientWidth) fail(`${key}: horizontal scroll: scrollWidth ${m.scrollWidth} over ${m.clientWidth}`)
        if (width === '390') for (const b of m.bands) if (b.headingLines > 4) fail(`${key}: band ${b.i} heading wraps to ${b.headingLines} lines at 390: ${b.heading}`)
        await page.screenshot({path: resolve(OUT, `${canvas}--${flow}--${width}.jpg`), fullPage: true, type: 'jpeg', quality: 60})
        // The header scrolled (Phase 17B session 4): prerendered HTML only ever holds the state
        // at the top, so this is the one check that sees the scrolled bar, its ground and its rule.
        m.headerScrolled = await page.evaluate(async () => {
          window.scrollTo(0, 800)
          window.dispatchEvent(new Event('scroll'))
          await new Promise((r) => setTimeout(r, 450))
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          const el = document.querySelector('header')
          const out = el ? {ring: el.getAttribute('data-ring-context'), bg: getComputedStyle(el).backgroundColor, rule: el.classList.contains('hairline-bottom'),
            row: el.firstElementChild ? getComputedStyle(el.firstElementChild).backgroundColor : null} : null
          window.scrollTo(0, 0)
          return out
        })
      }
      await context.close()
    }
  }
} finally {
  await browser.close()
  stop()
}

// ─── Compare, or update ───────────────────────────────────────────────────────
const TOLERANCE = (a, b) => Math.abs(a - b) <= Math.max(6, 0.02 * Math.max(Math.abs(a), Math.abs(b)))
if (UPDATE) {
  mkdirSync(resolve('scripts/ci/__snapshots__'), {recursive: true})
  writeFileSync(GOLDEN, JSON.stringify(results, null, 2) + '\n')
  console.log(`flow-metrics: wrote ${GOLDEN} (${Object.keys(results).length} pages); captures in ${OUT}`)
} else if (!existsSync(GOLDEN)) {
  fail(`no golden at ${GOLDEN}: run with --update on purpose`)
} else {
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'))
  for (const key of Object.keys(golden)) if (!(key in results)) fail(`${key}: in the golden, not measured`)
  for (const [key, m] of Object.entries(results)) {
    const g = golden[key]
    if (!g) { fail(`${key}: measured, not in the golden`); continue }
    for (const f of ['innerWidth', 'clientWidth']) if (m[f] !== g[f]) fail(`${key}: ${f} ${m[f]} vs golden ${g[f]}`)
    for (const f of ['header', 'headerRow', 'footer', 'headerScrolled']) {
      if (JSON.stringify(m[f]) !== JSON.stringify(g[f])) fail(`${key}: ${f} ${JSON.stringify(m[f])} vs golden ${JSON.stringify(g[f])}`)
    }
    if (m.bands.length !== g.bands.length) { fail(`${key}: ${m.bands.length} bands vs golden ${g.bands.length}`); continue }
    m.bands.forEach((b, i) => {
      const gb = g.bands[i]
      for (const f of ['heading', 'ring', 'scrim', 'bg', 'ink', 'texture', 'ghost', 'pt', 'pb']) {
        if (JSON.stringify(b[f]) !== JSON.stringify(gb[f])) fail(`${key}: band ${i} (${b.heading}) ${f} ${JSON.stringify(b[f])} vs golden ${JSON.stringify(gb[f])}`)
      }
      if (JSON.stringify(b.classes) !== JSON.stringify(gb.classes)) fail(`${key}: band ${i} classes ${b.classes.join(' ')} vs golden ${gb.classes.join(' ')}`)
      for (const f of ['top', 'height']) if (!TOLERANCE(b[f], gb[f])) fail(`${key}: band ${i} ${f} ${b[f]} vs golden ${gb[f]} (past the tolerance)`)
      if (b.headingLines !== gb.headingLines) fail(`${key}: band ${i} heading lines ${b.headingLines} vs golden ${gb.headingLines}`)
    })
  }
  console.log(`flow-metrics: ${Object.keys(results).length} pages compared to the golden; captures in ${OUT}`)
}
if (failures.length) {
  for (const f of failures) console.log(`::error::${f}`)
  process.exit(1)
}
console.log('flow-metrics: every theme on every canvas at 1440 and 390 is what the golden says.')
