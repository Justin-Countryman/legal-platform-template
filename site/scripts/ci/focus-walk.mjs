// focus-walk — keyboard focus is never hidden under the sticky header (monorepo backlog 331; WCAG 2.4.11 AA and
// 2.4.12, adopted by [R-460]). Run from `site/` after `scripts/ci/build-against-stub.sh`.
//
// On the stub build served by `next start` (or a site already served: --served URL), each page is walked by keyboard at
// 1440, 1024, 768 and a 390 phone: Tab from the top to the last focusable element, then Shift+Tab back to the first.
// After every key the page is let settle (its scroll still for two frames, at most 1.5 s) and two things are read:
//   - no part of the focused element may be painted over by the sticky or fixed site header (fifteen points sampled
//     with elementFromPoint, so a skip link drawn above the header passes): a browser scrolls
//     a focused element just into view, which for one above the viewport is the top edge, under a sticky header,
//     unless the page's scroll padding reserves the header's height;
//   - nothing else may be painted over the focused element's centre (a band rising into the one above covered the
//     marquee's Pause button, monorepo backlog 330);
//   - focus moving INTO the header must not scroll the page: a scroll padding alone makes the browser scroll a sticky
//     header's own link "into view" below the padding, a jump of hundreds of pixels (measured 333 px in Chromium).
// Prints one line per page and width and every failure; exits 1 on a failure, 2 when a page or a server would not load.
//
// Usage: node scripts/ci/focus-walk.mjs [--served URL] [--paths /,/fixture-practice-area]
import {spawn} from 'node:child_process'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const STUB_PORT = Number(process.env.STUB_PORT ?? 4014)
const APP_PORT = Number(process.env.APP_PORT ?? 3120)
const served = flag('--served')
const BASE = served ? served.replace(/\/$/, '') : `http://127.0.0.1:${APP_PORT}`
const PATHS = (flag('--paths') ?? '/,/fixture-practice-area,/attorneys/fixture-attorney,/blog/fixture-post').split(',')
const MAX_STEPS = 400
const WIDTHS = [
  ['1440', {viewport: {width: 1440, height: 900}}],
  ['1024', {viewport: {width: 1024, height: 768}}],
  ['768', {viewport: {width: 768, height: 1024}, isMobile: true, hasTouch: true}],
  ['390', {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}],
]

const children = []
const stop = () => children.forEach((c) => c.kill('SIGTERM'))
process.on('exit', stop)
process.on('SIGINT', () => { stop(); process.exit(130) })

async function wait(url, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

if (!served) {
  children.push(spawn('node', ['scripts/ci/content-lake-stub.mjs'], {
    env: {...process.env, PORT: String(STUB_PORT), MOCK_DATASET_NDJSON: 'scripts/ci/fixture.ndjson'},
    stdio: ['ignore', 'ignore', 'inherit'],
  }))
  if (!(await wait(`http://127.0.0.1:${STUB_PORT}/v2024-01-01/data/query/production?query=count(*)`))) {
    console.error('::error::the content-lake stub did not start')
    process.exit(2)
  }
  children.push(spawn(resolve('node_modules/.bin/next'), ['start', '-p', String(APP_PORT)], {
    env: {
      ...process.env, SANITY_API_HOST_OVERRIDE: `http://127.0.0.1:${STUB_PORT}`,
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'TEMPLATE_SANITY_PROJECT_ID', NEXT_PUBLIC_SANITY_DATASET: 'production',
      NEXT_PUBLIC_SITE_DOMAIN: 'example.com', NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  }))
  if (!(await wait(`${BASE}/`))) {
    console.error('::error::next start did not answer')
    process.exit(2)
  }
}

// The focused element and the site header, as the page shows them after it settles. `covered` counts the points of
// the focused box (clamped to the viewport) where what is painted on top is the header, not the element: a skip link
// drawn above the header is not covered by it. A ring is not hit-tested, so the box is sampled 1 px inside its edge.
function readFocus() {
  const el = document.activeElement
  const header = document.querySelector('header.sticky, header.fixed')
  if (!el || el === document.body) return {none: true, scrollY}
  const box = el.getBoundingClientRect()
  const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
  const inHeader = !!header && header.contains(el)
  let covered = 0
  let points = 0
  if (header && !inHeader && box.width > 0 && box.height > 0) {
    const clamp = (v, max) => Math.min(Math.max(v, 0), max - 1)
    for (const fx of [0.02, 0.25, 0.5, 0.75, 0.98]) {
      for (const fy of [0, 0.5, 1]) {
        const x = clamp(box.left + 1 + fx * (box.width - 2), innerWidth)
        const y = clamp(box.top + 1 + fy * (box.height - 2), innerHeight)
        const top = document.elementFromPoint(x, y)
        points++
        if (top && header.contains(top) && !el.contains(top)) covered++
      }
    }
  }
  // Whatever else may lie over it (a band rising into the one above, monorepo backlog 330), the element's centre is
  // painted by the element itself.
  let centre = null
  if (box.width > 0 && box.height > 0) {
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
      const top = document.elementFromPoint(cx, cy)
      if (top && !el.contains(top) && !top.contains(el)) {
        centre = (top.closest('section, header, footer, nav, div')?.className || top.tagName).toString().slice(0, 60)
      }
    }
  }
  const head = header ? header.getBoundingClientRect() : null
  return {
    none: false, scrollY, label, tag: el.tagName, inHeader, covered, points, centre,
    top: box.top, headerBottom: head ? head.bottom : null, visible: box.width > 0 && box.height > 0,
  }
}

async function settle(page) {
  await page.evaluate(() => new Promise((done) => {
    let last = scrollY
    let still = 0
    const t0 = performance.now()
    const tick = () => {
      still = scrollY === last ? still + 1 : 0
      last = scrollY
      if (still >= 2 || performance.now() - t0 > 1500) done(true)
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }))
}

async function walk(page, key, failures, where) {
  let steps = 0
  let previous = await page.evaluate(readFocus)
  const seen = new Set()
  while (steps++ < MAX_STEPS) {
    await page.keyboard.press(key)
    await settle(page)
    const now = await page.evaluate(readFocus)
    if (now.none) break
    const id = `${now.tag}:${now.label}:${Math.round(now.top + now.scrollY)}`
    if (seen.has(id)) break
    seen.add(id)
    if (!now.visible) { previous = now; continue }
    if (now.centre && !now.covered) {
      failures.push(`${where} ${key}: "${now.label}" (${now.tag}) has something painted over its centre: ${now.centre}`)
    }
    if (now.covered > 0) {
      failures.push(`${where} ${key}: "${now.label}" (${now.tag}) is under the sticky header at ${now.covered} of ${now.points} points: its top ${Math.round(now.top)} px, the header's bottom ${Math.round(now.headerBottom)} px`)
    }
    if (now.inHeader && !previous.none && !previous.inHeader && Math.abs(now.scrollY - previous.scrollY) > 1) {
      failures.push(`${where} ${key}: focus entering the header on "${now.label}" scrolled the page by ${Math.round(now.scrollY - previous.scrollY)} px`)
    }
    previous = now
  }
  return steps
}

const browser = await chromium.launch()
const failures = []
let broken = false
try {
  for (const [name, options] of WIDTHS) {
    const ctx = await browser.newContext(options)
    const page = await ctx.newPage()
    for (const path of PATHS) {
      const res = await page.goto(BASE + path, {waitUntil: 'load', timeout: 60000}).catch(() => null)
      if (!res || res.status() >= 400) {
        console.error(`::error::${path} at ${name} did not load (${res ? res.status() : 'no answer'})`)
        broken = true
        continue
      }
      await page.evaluate(() => document.fonts.ready.then(() => true))
      await page.waitForFunction(() => Object.keys(document.querySelector('header') || {}).some((k) => k.startsWith('__react')), null, {timeout: 20000}).catch(() => {})
      const before = failures.length
      const forward = await walk(page, 'Tab', failures, `${path} at ${name}`)
      const back = await walk(page, 'Shift+Tab', failures, `${path} at ${name}`)
      console.log(`${failures.length === before ? 'ok  ' : 'FAIL'} ${path} at ${name}: ${forward} Tab, ${back} Shift+Tab`)
    }
    await ctx.close()
  }
} finally {
  await browser.close()
}
for (const f of failures) console.error(`::error::${f}`)
if (failures.length) console.error(`${failures.length} focus failure(s): see above (monorepo backlog 331).`)
process.exit(broken ? 2 : failures.length ? 1 : 0)
