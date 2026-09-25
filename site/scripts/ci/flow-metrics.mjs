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
//
// THE STYLE-SET MATRIX (Phase 17C session 2b, `[R-536]`; monorepo WS-V1-PHASE17C2B-DESIGN
// §2.8). The rows above measure every theme under Graphite, so a style set in capitals was
// never measured and Flint wrapped a section heading to six lines on a phone. A second
// matrix measures EVERY style set, the offered and the retired (a live site may wear one),
// on the three record canvases under Cut blocks balanced and Navy & Brass at both widths,
// keyed `<canvas> / cutBlocks.balanced / <width> / <styleSet>`, and holds the line rule
// both ways: no heading past THREE lines at 1440 or FOUR at 390. Each row also records the
// tallest heading's computed weight and size (the light rule, `[R-534]`), the hero's voice
// (face, weight, width per em, ink) and the font bytes the page fetched (a budget of
// FONT_BUDGET per page, counted at a fresh context so nothing is cached). The offered
// style sets' voices are written to `__snapshots__/hero-voice.json`, which
// `lib/__tests__/heroVoice.test.ts` reads for the pair test.
//
// Lines are counted as distinct line tops of a Range over the heading's contents: a box
// height over the line height counted the heading's `::after` rule as a line (ADV-17C2B).

import {createHmac} from 'node:crypto'
import {spawn} from 'node:child_process'
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs'
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
// The style-set matrix: the three record canvases, one theme, every style set.
const STYLE_SET_FLOW = 'cutBlocks.balanced'
const STYLE_SET_CANVASES = ['adversarial-mostly-dark', 'planning-mostly-light', 'multi-practice-balanced']
const FONT_BUDGET = 150_000
const HERO_VOICE = resolve('scripts/ci/__snapshots__/hero-voice.json')
const HERO_VOICE_CANVAS = 'multi-practice-balanced'

const CANVASES = [
  ['stub', 'scripts/ci/fixture.ndjson'],
  ['adversarial-mostly-dark', 'scripts/ci/record-adversarial-mostly-dark.ndjson'],
  ['planning-mostly-light', 'scripts/ci/record-planning-mostly-light.ndjson'],
  ['multi-practice-balanced', 'scripts/ci/record-multi-practice-balanced.ndjson'],
  // Phase 17B session 5: two ribbons bracketing a light page, where Ribbon rhythm can be itself.
  ['ribbons-mostly-light', 'scripts/ci/record-ribbons-mostly-light.ndjson'],
  // Phase 17B session 6: the three record canvases with a stand-in photograph behind the hero and in
  // every split band, where Photo scrims can be itself.
  ['adversarial-photo-hero', 'scripts/ci/record-adversarial-photo-hero.ndjson'],
  ['planning-photo-hero', 'scripts/ci/record-planning-photo-hero.ndjson'],
  ['multi-practice-photo-hero', 'scripts/ci/record-multi-practice-photo-hero.ndjson'],
]
// The stand-in photographs (Phase 17B session 6), served from disk to the browser: the hero's own
// optimizer address (`/_next/image?url=/stand-ins/...`) and the image CDN's address for a band's photo
// (`cdn.sanity.io/images/.../fx<name>-<w>x<h>.jpg`). The template never lets its optimizer fetch a
// local host, so the optimizer is bypassed here; its bytes are measured once and recorded (monorepo
// WS-V1-PHASE17B6-DESIGN §2.11).
const PHOTOS = resolve('scripts/ci/photos')
const STAND_INS = existsSync(PHOTOS) ? readdirSync(PHOTOS).filter((f) => f.endsWith('.jpg')) : []
const compact = (f) => 'fx' + f.replace(/\.jpg$/, '').replace(/[^a-z0-9]/g, '')
async function servePhotos(context) {
  if (!STAND_INS.length) return
  await context.route('**/_next/image?**', (route) => {
    const src = new URL(route.request().url()).searchParams.get('url') ?? ''
    const file = src.startsWith('/stand-ins/') ? src.slice('/stand-ins/'.length) : null
    return file && STAND_INS.includes(file)
      ? route.fulfill({path: resolve(PHOTOS, file), contentType: 'image/jpeg'})
      : route.continue()
  })
  await context.route('https://cdn.sanity.io/images/**', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    const file = STAND_INS.find((f) => name.startsWith(compact(f) + '-'))
    return file ? route.fulfill({path: resolve(PHOTOS, file), contentType: 'image/jpeg'}) : route.abort()
  })
}
const WIDTHS = [
  ['1440', {viewport: {width: 1440, height: 900}}],
  ['390', {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}],
]
const presets = JSON.parse(readFileSync('../studio/presets.json', 'utf8'))
const FLOWS = presets.flows.map((f) => f.id)
const OFFERED = presets.styleSets.map((s) => s.id)
const RETIRED = (presets.retiredStyleSets ?? []).map((s) => s.id)
const STYLE_SETS = [...OFFERED, ...RETIRED]

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
  // Serialized whole into the page by `page.evaluate`, so the hero probe is defined inside.
  // The hero's voice (Phase 17C session 2b): the face and weight the h1 computes, its rendered
  // size, and, drawn on a canvas at 100 px in that face and weight, the width of "Counsel you
  // can call" per em and the mean darkness of its box (0 to 1). The section case is what the
  // first section heading computes. Two style sets within 5% of width and 0.03 of ink with the
  // same case and hero size are one voice (`lib/__tests__/heroVoice.test.ts`).
  function heroVoice(main) {
    const h1 = main.querySelector('h1')
    if (!h1) return null
    const cs = getComputedStyle(h1)
    const face = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()
    const weight = Number(cs.fontWeight)
    const size = Math.round(parseFloat(cs.fontSize) * 10) / 10
    const section = main.querySelector('.section-heading')
    const sectionCase = section ? getComputedStyle(section).textTransform : 'none'
    const text = 'Counsel you can call'
    const c = document.createElement('canvas')
    c.width = 1400
    c.height = 160
    const ctx = c.getContext('2d')
    ctx.font = `${weight} 100px "${face}"`
    const w = ctx.measureText(text).width
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.fillStyle = '#000'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(text, 10, 120)
    const box = ctx.getImageData(10, 20, Math.min(Math.ceil(w), c.width - 10), 130).data
    let dark = 0
    for (let i = 0; i < box.length; i += 4) dark += 255 - box[i]
    const ink = dark / (255 * (box.length / 4))
    return {face, weight, heroPx: size, widthPerEm: Math.round((w / 100) * 100) / 100, ink: Math.round(ink * 1000) / 1000, sectionCase}
  }

  const bands = [...main.querySelectorAll('section')].filter((s) => !s.parentElement.closest('section'))
  const origin = bands[0] ? bands[0].getBoundingClientRect().top : 0
  const px = (v) => Math.round(parseFloat(v) || 0)
  const keep = (cls) => /^(divider-|hairline-top$|hairline-accent$|band-gradient$|grad-[in]-|bg-)/.test(cls)
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
      let headingWeight = null
      let headingSize = null
      if (heading) {
        const h = getComputedStyle(heading)
        // Distinct line tops of the heading's contents: the `::after` rule is not in the range.
        const range = document.createRange()
        range.selectNodeContents(heading)
        lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size
        headingWeight = Number(h.fontWeight)
        headingSize = Math.round(parseFloat(h.fontSize) * 10) / 10
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
        // Phase 17B session 6: the window of the hero's photograph, recorded only where a band shows one.
        ...(s.querySelector('[data-photo-window]') ? {window: s.querySelector('[data-photo-window]').getAttribute('data-photo-window')} : {}),
        top: Math.round(r.top - origin),
        height: Math.round(r.height),
        pt: px(cs.paddingTop),
        pb: px(cs.paddingBottom),
        headingLines: lines,
        headingWeight,
        headingSize,
      }
    }),
    hero: heroVoice(main),
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
      await servePhotos(context)
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
        // The hero reaches the switcher (Phase 17B session 5, ADV-17B5-2 F2b): a theme that wants a
        // dark hero names the need exactly where this canvas's hero is not dark.
        if (flow === 'typeOnBlack.allDark') {
          const note = await page.evaluate(() => document.querySelector('.sw')?.textContent ?? '')
          const docs = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
          const design = docs.find((d) => d._type === 'heroSettings')?.homepageHero
          // A photograph behind the hero forces it dark (Phase 17B session 6's photo canvases).
          const heroDark = !!docs.find((d) => d._type === 'homePage')?.hero?.heading
            && (design?.schemeOverride === 'dark' || design?.backdrop === 'image')
          if (note.includes('a dark or photo hero') === heroDark) fail(`${key}: the switcher ${heroDark ? 'names' : 'does not name'} the dark-hero need under a ${heroDark ? 'dark' : 'light'} hero`)
        }
        await page.evaluate(() => document.fonts.ready)
        // The switcher is the operator's bar, not the page: hidden for the measure and the eye.
        await page.addStyleTag({content: '.sw{display:none !important}'})
        // Reveal-on-scroll wrappers: sweep the page once so every band has entered view.
        await page.evaluate(async () => {
          const h = document.documentElement.scrollHeight
          for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) }
          window.scrollTo(0, 0)
          // Every photograph decoded before the measure and the capture (Phase 17B session 6).
          await Promise.all([...document.images].map((i) => i.decode().catch(() => {})))
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
    if (!STYLE_SET_CANVASES.includes(canvas)) continue
    for (const [width, device] of WIDTHS) {
      for (const styleSet of STYLE_SETS) {
        // A fresh context per page: the font bytes are what one visitor's first page fetches.
        const context = await browser.newContext({...device, reducedMotion: 'reduce', colorScheme: 'light'})
        await context.addCookies([{name: 'lp-preview', value: operator, url: `${BASE}/site-preview`}])
        await servePhotos(context)
        const page = await context.newPage()
        let fontBytes = 0
        const fontFiles = []
        page.on('response', async (r) => {
          if (!r.url().includes('/fonts/files/')) return
          try { const b = await r.body(); fontBytes += b.length; fontFiles.push(r.url().split('/').pop()) } catch {}
        })
        const key = `${canvas} / ${STYLE_SET_FLOW} / ${width} / ${styleSet}`
        const url = `${BASE}/site-preview/${styleSet}/${PALETTE}/${STYLE_SET_FLOW}/design`
        let res = null
        for (let attempt = 0; attempt < 2 && !res; attempt++) {
          try { res = await page.goto(url, {waitUntil: 'load', timeout: 60_000}) } catch (e) { if (attempt === 1) throw e }
        }
        if (!res || res.status() !== 200) { fail(`${key}: ${url} answered ${res?.status()}`); await context.close(); continue }
        if (page.url() !== url) { fail(`${key}: landed on ${page.url()}, not ${url}`); await context.close(); continue }
        await page.evaluate(() => document.fonts.ready)
        await page.addStyleTag({content: '.sw{display:none !important}'})
        await page.evaluate(async () => {
          const h = document.documentElement.scrollHeight
          for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) }
          window.scrollTo(0, 0)
          await Promise.all([...document.images].map((i) => i.decode().catch(() => {})))
          await new Promise((r) => setTimeout(r, 400))
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        })
        const m = await page.evaluate(measure)
        m.fontBytes = fontBytes
        m.fontFiles = fontFiles.sort()
        results[key] = m
        if (m.innerWidth !== device.viewport.width) fail(`${key}: innerWidth is ${m.innerWidth}, not ${device.viewport.width}`)
        if (m.scrollWidth > m.clientWidth) fail(`${key}: horizontal scroll: scrollWidth ${m.scrollWidth} over ${m.clientWidth}`)
        const limit = width === '390' ? 4 : 3
        for (const b of m.bands) if (b.headingLines > limit) fail(`${key}: band ${b.i} heading wraps to ${b.headingLines} lines at ${width} (the rule is ${limit}): ${b.heading}`)
        if (fontBytes > FONT_BUDGET) fail(`${key}: ${fontBytes} font bytes over the budget of ${FONT_BUDGET}: ${fontFiles.join(', ')}`)
        await page.screenshot({path: resolve(OUT, `${canvas}--${STYLE_SET_FLOW}--${width}--${styleSet}.jpg`), fullPage: true, type: 'jpeg', quality: 60})
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
  stop()
}

// ─── Compare, or update ───────────────────────────────────────────────────────
const TOLERANCE = (a, b) => Math.abs(a - b) <= Math.max(6, 0.02 * Math.max(Math.abs(a), Math.abs(b)))
const heroVoices = () => Object.fromEntries(OFFERED.map((id) => {
  const m = results[`${HERO_VOICE_CANVAS} / ${STYLE_SET_FLOW} / 1440 / ${id}`]
  return [id, m?.hero ?? null]
}).filter(([, v]) => v))
if (UPDATE) {
  mkdirSync(resolve('scripts/ci/__snapshots__'), {recursive: true})
  writeFileSync(GOLDEN, JSON.stringify(results, null, 2) + '\n')
  writeFileSync(HERO_VOICE, JSON.stringify({method: 'the hero of the multi-practice canvas at 1440 under Cut blocks balanced, Navy & Brass; the face and weight the h1 computes; "Counsel you can call" drawn at 100 px on a canvas: width per em and the mean darkness of its box', styleSets: heroVoices()}, null, 2) + '\n')
  console.log(`flow-metrics: wrote ${GOLDEN} (${Object.keys(results).length} pages) and ${HERO_VOICE}; captures in ${OUT}`)
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
      for (const f of ['heading', 'ring', 'scrim', 'bg', 'ink', 'texture', 'ghost', 'window', 'pt', 'pb']) {
        if (JSON.stringify(b[f]) !== JSON.stringify(gb[f])) fail(`${key}: band ${i} (${b.heading}) ${f} ${JSON.stringify(b[f])} vs golden ${JSON.stringify(gb[f])}`)
      }
      if (JSON.stringify(b.classes) !== JSON.stringify(gb.classes)) fail(`${key}: band ${i} classes ${b.classes.join(' ')} vs golden ${gb.classes.join(' ')}`)
      for (const f of ['top', 'height']) if (!TOLERANCE(b[f], gb[f])) fail(`${key}: band ${i} ${f} ${b[f]} vs golden ${gb[f]} (past the tolerance)`)
      if (b.headingLines !== gb.headingLines) fail(`${key}: band ${i} heading lines ${b.headingLines} vs golden ${gb.headingLines}`)
      for (const f of ['headingWeight', 'headingSize']) if (JSON.stringify(b[f]) !== JSON.stringify(gb[f])) fail(`${key}: band ${i} ${f} ${b[f]} vs golden ${gb[f]}`)
    })
    if (m.fontBytes !== undefined && m.fontBytes !== g.fontBytes) fail(`${key}: font bytes ${m.fontBytes} vs golden ${g.fontBytes}`)
    if (JSON.stringify(m.hero && [m.hero.face, m.hero.weight, m.hero.heroPx, m.hero.sectionCase]) !== JSON.stringify(g.hero && [g.hero.face, g.hero.weight, g.hero.heroPx, g.hero.sectionCase])) fail(`${key}: hero voice ${JSON.stringify(m.hero)} vs golden ${JSON.stringify(g.hero)}`)
    // Text rasterizes a little differently across operating systems: the width and the ink within a tolerance.
    if (m.hero && g.hero && (Math.abs(m.hero.widthPerEm - g.hero.widthPerEm) > 0.03 || Math.abs(m.hero.ink - g.hero.ink) > 0.02)) fail(`${key}: hero voice width ${m.hero.widthPerEm} / ink ${m.hero.ink} vs golden ${g.hero.widthPerEm} / ${g.hero.ink}`)
  }
  if (existsSync(HERO_VOICE)) {
    const committed = JSON.parse(readFileSync(HERO_VOICE, 'utf8')).styleSets
    const now = heroVoices()
    if (JSON.stringify(Object.keys(committed)) !== JSON.stringify(Object.keys(now))) fail(`hero-voice.json names ${Object.keys(committed).join(', ')}; the run measured ${Object.keys(now).join(', ')}: run with --update on purpose`)
  } else if (OFFERED.length) fail(`no ${HERO_VOICE}: run with --update on purpose`)
  console.log(`flow-metrics: ${Object.keys(results).length} pages compared to the golden; captures in ${OUT}`)
}
if (failures.length) {
  for (const f of failures) console.log(`::error::${f}`)
  process.exit(1)
}
console.log('flow-metrics: every theme on every canvas at 1440 and 390 is what the golden says.')
