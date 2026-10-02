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
// height and paddings, the divider, hairline, ribbon-edge (Phase 17E) and gradient classes,
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
// Lines are counted as distinct line tops of the heading's TEXT NODES: a box height over the
// line height counted the heading's `::after` rule as a line (ADV-17C2B), and a range over the
// heading's contents counts the fitted span's box, whose top sits a pixel or three above the first
// glyph's (Phase 17C session 3, ADV-17C3-A). The size and weight are read from that span where the
// heading has one (`.heading-fit`), so the golden records the size drawn.
//
// THE LONG-HEADINGS CANVAS (Phase 17C session 3, `[R-536]`; monorepo WS-V1-PHASE17C3-DESIGN §2.1).
// The record canvases' headings are short, so a heading in a narrow column that wrapped to four
// lines at 1440 on real copy was never measured. `record-long-headings.ndjson` carries 42 to 89
// characters in the layouts that put a heading in a column; it runs in the style-set matrix only.
//
// THE TABLET (Phase 17C session 3, `[R-548]`, Justin 2026-09-25). Under `lg` (992 px) a layout that sets
// a section heading beside other content stacks as it does on a phone, so the heading has the band's
// width. The long-headings canvas is measured at 768 too, and there no heading passes four lines, at
// the readable floor or not (a stacked heading never needs the floor's extra line), and every heading
// column that can sit beside content (`.heading-grows`) spans its row.
//
// THE SMALL LAPTOP (`[R-549]`, Justin 2026-09-25: "the highest quality and best experience no matter what
// the screensize"). The stack reaches `xl` (1280 px); a stacked reading layout centers at the template's
// 768 px single column, its body text keeps a 34rem measure, and a stacked photo stays inside the screen.
// The canvas is measured at 1024 and 1279 (the widest stacked width) too: no heading passes three lines
// there, at the floor or not; and at 768, 1024 and 1279 nothing sits beside a heading column, none is
// wider than 768 px, no body text is wider than 34rem, and no stacked photo is taller than the cap.

import {createHmac} from 'node:crypto'
import {spawn} from 'node:child_process'
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
import {converter, differenceCiede2000, parse} from 'culori'

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null }
const UPDATE = process.argv.includes('--update')
// The motion pass alone, for local work on it; CI runs everything (the theme matrix, the style-set matrix, the pass).
const MOTION_ONLY = process.argv.includes('--motion-only')
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
// Phase 17E (`[R-576]`): the composer's canvas too, so every style set's ribbon line (capitals, tracking, weight) is counted.
const STYLE_SET_CANVASES = ['adversarial-mostly-dark', 'planning-mostly-light', 'multi-practice-balanced', 'long-headings', 'composed-ribbons']
// Canvases measured by the style-set matrix only, never by the theme matrix.
const STYLE_SET_ONLY = ['long-headings']
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
  // Phase 17C session 3: section headings of 42 to 89 characters in narrow columns.
  ['long-headings', 'scripts/ci/record-long-headings.ndjson'],
  // Phase 17D (`[R-556]`): the multi-practice record with a stand-in Card Photo on every practice area.
  ['multi-practice-area-photos', 'scripts/ci/record-multi-practice-area-photos.ndjson'],
  // Phase 17D session 2 (`[R-558]`): the adversarial record with a stand-in cutout figure in every split band.
  ['adversarial-cutout', 'scripts/ci/record-adversarial-cutout.ndjson'],
  // Phase 17E (`[R-573]`): the three records with the night skyline behind the hero and four photographs of the same city
  // as the theme's set, and the planning record with the set and no hero photograph, where the set draws nothing.
  ['adversarial-photo-set', 'scripts/ci/record-adversarial-photo-set.ndjson'],
  ['planning-photo-set', 'scripts/ci/record-planning-photo-set.ndjson'],
  ['multi-practice-photo-set', 'scripts/ci/record-multi-practice-photo-set.ndjson'],
  ['planning-photo-set-no-hero-photo', 'scripts/ci/record-planning-photo-set-no-hero-photo.ndjson'],
  // Phase 17E (`[R-575]`, `[R-576]`): the composer's own canvas for a synthetic firm, a ribbon after the hero and one before
  // the close, under every theme.
  ['composed-ribbons', 'scripts/ci/record-composed-ribbons.ndjson'],
]
// The set canvases are measured under the theme that draws the set and its dark-led neighbour only: every other theme
// draws them as it draws the photo-hero canvases, whose rows the golden already holds (Phase 17E).
const ONLY_FLOWS = {
  'adversarial-photo-set': ['photoScrims.mostlyDark', 'cutBlocks.mostlyDark'],
  'planning-photo-set': ['photoScrims.mostlyDark', 'cutBlocks.mostlyDark'],
  'multi-practice-photo-set': ['photoScrims.mostlyDark', 'cutBlocks.mostlyDark'],
  'planning-photo-set-no-hero-photo': ['photoScrims.mostlyDark'],
}
// The stand-in photographs (Phase 17B session 6), served from disk to the browser: the hero's own
// optimizer address (`/_next/image?url=/stand-ins/...`) and the image CDN's address for a band's photo
// (`cdn.sanity.io/images/.../fx<name>-<w>x<h>.jpg`). The template never lets its optimizer fetch a
// local host, so the optimizer is bypassed here; its bytes are measured once and recorded (monorepo
// WS-V1-PHASE17B6-DESIGN §2.11).
const PHOTOS = resolve('scripts/ci/photos')
// A photograph (`.jpg`) or, since Phase 17D session 2, a cutout figure on a transparent ground (`.png`).
const STAND_INS = existsSync(PHOTOS) ? readdirSync(PHOTOS).filter((f) => f.endsWith('.jpg') || f.endsWith('.png')) : []
const compact = (f) => 'fx' + f.replace(/\.(jpg|png)$/, '').replace(/[^a-z0-9]/g, '')
const typeOf = (f) => (f.endsWith('.png') ? 'image/png' : 'image/jpeg')
async function servePhotos(context) {
  if (!STAND_INS.length) return
  await context.route('**/_next/image?**', (route) => {
    const src = new URL(route.request().url()).searchParams.get('url') ?? ''
    const file = src.startsWith('/stand-ins/') ? src.slice('/stand-ins/'.length) : null
    return file && STAND_INS.includes(file)
      ? route.fulfill({path: resolve(PHOTOS, file), contentType: typeOf(file)})
      : route.continue()
  })
  await context.route('https://cdn.sanity.io/images/**', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    const file = STAND_INS.find((f) => name.startsWith(compact(f) + '-'))
    return file ? route.fulfill({path: resolve(PHOTOS, file), contentType: typeOf(file)}) : route.abort()
  })
}
const WIDTHS = [
  ['1440', {viewport: {width: 1440, height: 900}}],
  ['390', {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}],
]
const TABLET = ['768', {viewport: {width: 768, height: 1024}, isMobile: true, hasTouch: true}]
const LAPTOP = ['1024', {viewport: {width: 1024, height: 768}}]
const LAPTOP_WIDE = ['1279', {viewport: {width: 1279, height: 800}}]
// The stacked layouts' single column (`max-w-3xl`), their body measure (34rem) and photo cap (`globals.css`).
const STACKED_MAX = 768
const STACKED_MEASURE = 544
const STACKED_PHOTO = (viewportHeight) => Math.min(576, 0.75 * viewportHeight)
const presets = JSON.parse(readFileSync('../studio/presets.json', 'utf8'))
const FLOWS = presets.flows.map((f) => f.id)
const OFFERED = presets.styleSets.map((s) => s.id)
const RETIRED = (presets.retiredStyleSets ?? []).map((s) => s.id)
const STYLE_SETS = [...OFFERED, ...RETIRED]

// ─── Servers ──────────────────────────────────────────────────────────────────
const wait = async (url, tries = 100, ms = 100) => {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, {signal: AbortSignal.timeout(5_000)}); if (r.ok || r.status === 404) return } catch {}
    await new Promise((r) => setTimeout(r, ms))
  }
  throw new Error(`${url} did not answer`)
}
let stub = null
async function startStub(file) {
  // The old stub's exit is awaited for at most ten seconds, then it is killed outright (backlog 371).
  if (stub) {
    const old = stub
    old.kill('SIGTERM')
    await Promise.race([new Promise((r) => old.once('exit', r)), new Promise((r) => setTimeout(r, 10_000))])
    if (old.exitCode === null && old.signalCode === null) old.kill('SIGKILL')
    stub = null
  }
  stub = spawn('node', ['scripts/ci/content-lake-stub.mjs'], {env: {...process.env, PORT: String(STUB_PORT), MOCK_DATASET_NDJSON: file}, stdio: ['ignore', 'ignore', 'inherit']})
  await wait(`http://127.0.0.1:${STUB_PORT}/v2024-01-01/data/query/production?query=count(*)`)
}
// The server's own binary, not `npx`: `npx` runs it under `npm exec` and a shell, so killing the pid it returns
// left `next-server` running on the runner (backlog 371, measured on PR #53's logs).
const app = spawn(resolve('node_modules/.bin/next'), ['start', '-p', String(APP_PORT)], {
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

// A PAGE THAT HANGS FAILS IN MINUTES AND NAMES ITSELF (monorepo backlog 371). On PR #53 this step went
// silent for four and a half hours after 113 captures: `page.goto` is bounded, and nothing after it was
// (the fonts, the sweep, the measure, the screenshot, the scrolled header). Every page and every browser
// context runs under a watchdog: past PAGE_BUDGET it prints the page, and the phase it was in, as an
// error and exits, which stops the servers. A normal page takes one to three seconds.
const PAGE_BUDGET = 120_000
let watched = null
const watch = (key, phase = 'load') => { watched = {key, phase, since: Date.now()} }
const phase = (name) => { if (watched) watched.phase = name }
const unwatch = () => { watched = null }
setInterval(() => {
  if (!watched || Date.now() - watched.since <= PAGE_BUDGET) return
  for (const f of failures) console.log(`::error::${f}`)
  console.log(`::error::${watched.key}: did not finish in ${PAGE_BUDGET / 1000} s (hung at ${watched.phase})`)
  process.exit(1)
}, 5_000).unref()

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
  // Phase 17D session 2 (`[R-557]`): Gradient bloom's glow, its peak and its side, kept beside the gradient's own.
  const keep = (cls) => /^(divider-|hairline-top$|hairline-accent$|ribbon-edge-|band-gradient$|band-glow$|glow-from-left$|grad-[inp]-|bg-)/.test(cls)
  // Phase 17B session 4 (`[R-518]`): the site header and footer, whose schemes the theme now
  // sets. The ground at 390 is the header's own: the mobile row shows it and paints none.
  const chromeOf = (el) => (el ? {ring: el.getAttribute('data-ring-context'), bg: getComputedStyle(el).backgroundColor} : null)
  // The mobile row, the header's first child, paints its own ground (ADV-17B4-2: the header's
  // alone did not see a change on phones).
  // A card photo is the card's own fill image (an icon is not; ADV-17D-P2); one under text carries
  // `tile-photo`, a Feature or Split photo panel does not. `corner` is the carried piece's layer on the
  // first photo card, where a theme carries one (a scrim once covered it, ADV-17D-P2).
  function cardPhotos(s) {
    const cards = [...s.querySelectorAll('nav a')].filter((a) => a.getClientRects().length > 0)
    const photos = cards.filter((a) => a.querySelector(':scope img[data-nimg="fill"]'))
    if (!photos.length) return null
    const underText = photos.filter((a) => a.querySelector(':scope > img.tile-photo'))
    const after = getComputedStyle(photos[0], '::after')
    return {
      cards: cards.length,
      photos: photos.length,
      underText: underText.length,
      scrimmed: underText.filter((a) => a.querySelector('.tile-text-scrim')).length,
      darkLinks: cards.filter((a) => a.hasAttribute('data-ring-context')).length,
      corner: after.content !== 'none' && after.content !== 'normal' ? after.zIndex : null,
    }
  }
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
      // Distinct line tops of an element's text nodes: neither a heading's `::after` rule nor its fitted
      // span's own box is in them. A line is a cluster of tops within half a line of each other: an
      // emphasis in another face sits a pixel or two off its neighbours' top (ADV-17C3-PRA).
      const linesOf = (el, styled) => {
        const tops = []
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const range = document.createRange()
          range.selectNodeContents(n)
          for (const r of range.getClientRects()) if (r.width > 0) tops.push(r.top)
        }
        const lineHeight = parseFloat(styled.lineHeight) || parseFloat(styled.fontSize) * 1.2
        tops.sort((a, b) => a - b)
        return tops.reduce((count, top, k) => (k === 0 || top - tops[k - 1] > lineHeight / 2 ? count + 1 : count), 0)
      }
      let lines = 0
      let headingWeight = null
      let headingSize = null
      if (heading) {
        const h = getComputedStyle(heading.querySelector('.heading-fit') ?? heading)
        lines = linesOf(heading, h)
        headingWeight = Number(h.fontWeight)
        headingSize = Math.round(parseFloat(h.fontSize) * 10) / 10
      }
      // Phase 17E (`[R-576]`): a ribbon's line, the still one (a marquee's first copy wraps under reduced motion), held to
      // the headings' line rule; a ribbon is a paragraph, so the heading count never saw it (the pre-PR break pass).
      const ribbon = s.querySelector('p.ribbon-line')
      const ribbonStyle = ribbon ? getComputedStyle(ribbon) : null
      return {
        i,
        heading: (heading?.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 48) || null,
        ring: s.getAttribute('data-ring-context'),
        scrim: s.getAttribute('data-scrim'),
        // Phase 17D session 2 (`[R-557]`): a glowing band takes the photo band's colors; recorded only where one does.
        ...(s.getAttribute('data-glow') ? {glow: s.getAttribute('data-glow')} : {}),
        bg: cs.backgroundColor,
        ink: cs.color,
        classes: [...s.classList].filter(keep).sort(),
        // The texture's strength (Phase 17C session 3, `[R-538]`), or false where the band has none.
        texture: s.querySelector('[data-section-texture]')?.getAttribute('data-section-texture') || false,
        ghost: !!s.querySelector('[data-decor-layer]'),
        // Phase 17B session 6: the window of the hero's photograph, recorded only where a band shows one.
        ...(s.querySelector('[data-photo-window]') ? {window: s.querySelector('[data-photo-window]').getAttribute('data-photo-window')} : {}),
        // Phase 17E (`[R-573]`): the photograph of the theme's set behind the band, on its own layer or on its run's (the
        // run's index, and the wrapper's ground, which a broken wrapper would not paint), recorded only where one shows.
        ...(s.querySelector('[data-photo-set]') ? {photo: s.querySelector('[data-photo-set]').getAttribute('data-photo-set')} : {}),
        ...(s.closest('[data-photo-run]') ? {
          photo: s.closest('[data-photo-run]').querySelector(':scope > [aria-hidden] [data-photo-set]')?.getAttribute('data-photo-set') ?? null,
          run: s.closest('[data-photo-run]').getAttribute('data-photo-run'),
          runBg: getComputedStyle(s.closest('[data-photo-run]')).backgroundColor,
        } : {}),
        // Phase 17D: an inset band's panel, its own ground and ring, recorded only where a band draws one: the
        // band's own box is the gutter around it (ADV-17D-A, -B: a dark panel recorded as transparent).
        ...(s.querySelector(':scope > div.rounded-ui.overflow-hidden') ? {panel: {ring: s.querySelector(':scope > div.rounded-ui.overflow-hidden').getAttribute('data-ring-context'), bg: getComputedStyle(s.querySelector(':scope > div.rounded-ui.overflow-hidden')).backgroundColor}} : {}),
        // Phase 17D (`[R-556]`): a band's card photos, recorded only where it shows them: the visible cards, how many
        // draw a photo and hold their text over the photo scrim, and how many links carry a dark context (none may:
        // a card's focus ring is drawn outside it, on the band).
        ...(cardPhotos(s) ? {cards: cardPhotos(s)} : {}),
        top: Math.round(r.top - origin),
        height: Math.round(r.height),
        pt: px(cs.paddingTop),
        pb: px(cs.paddingBottom),
        headingLines: lines,
        headingWeight,
        headingSize,
        ...(ribbon ? {ribbonLines: linesOf(ribbon, ribbonStyle), ribbonSize: Math.round(parseFloat(ribbonStyle.fontSize) * 10) / 10} : {}),
      }
    }),
    hero: heroVoice(main),
  }
}

// A heading set at its readable floor may take ONE more line than the rule (`[R-544]`, Justin
// 2026-09-25: it stays readable): 20 px, and 32 px where it draws the light weight (`globals.css`).
// Two more lines, even at the floor, fail.
const atFloor = (b, limit) => b.headingSize !== null && b.headingSize <= (b.headingWeight === 300 ? 32 : 20) + 0.05 && b.headingLines <= limit + 1

// The section heading's ceiling (Phase 18 session D; `SECTION_HEADING_MAX_REM` in `lib/designTokens.ts`, 3.5rem): no band
// below the hero draws its heading above 56 px at any width, under any theme or style set. The sites' range, measured.
const SECTION_HEADING_MAX_PX = 56
const overCeiling = (m) => m.bands.filter((b) => b.i > 0 && b.headingSize !== null && b.headingSize > SECTION_HEADING_MAX_PX + 0.05)
// Two light grounds side by side read apart (Phase 18 session D; `TINT_DE` in `lib/designTokens.ts`): where neighbouring bands
// sit on two different light grounds, they stand at least 1.5 apart (ΔE2000, the study's measure of two light grounds), so
// a page never carries a second light ground nobody can see. The tint stood 1.0 from the page on every preset.
const LIGHT_APART = 1.5
const toLab = converter('lab65')
const deltaE = differenceCiede2000()
const lightBg = (bg) => { const c = parse(bg); return !!c && (c.alpha ?? 1) === 1 && toLab(c).l >= 85 }
const unseenLightSteps = (m) => m.bands.slice(1).flatMap((b, k) => {
  const a = m.bands[k]
  return lightBg(a.bg) && lightBg(b.bg) && a.bg !== b.bg && deltaE(a.bg, b.bg) < LIGHT_APART ? [{a, b, d: deltaE(a.bg, b.bg)}] : []
})

// ─── The motion pass (Phase 18 session F; monorepo WS-MOTION-LAYER-DESIGN.md §5) ───────────────────────
//
// Every page above is measured with reduced motion on, so nothing saw what moves for everyone else: a band's
// ground slid 24 px off its neighbour and showed the page's body between two dark bands while it waited, and a
// band taller than the screen divided by 0.15 never arrived. This pass loads a few pages in a context that does
// NOT ask for reduced motion and in one that does, and fails a page where:
//   - a band waiting to rise leaves a gap above its ground that the settled page does not have;
//   - anything is still offset after a sweep, at 1440, at 390, and on a 390 by 240 screen where bands are tall;
//   - anything inside <main> animates a property that lays the page out again (a size, a position, a margin or a
//     padding: only transform and opacity move, colors may change), read from `animationstart` and `transitionrun`
//     from document start, where a sampler misses a 10 ms animation;
//   - an animation that never ends sits in a band with no `button[aria-pressed]` (WCAG 2.2.2, monorepo `[R-617]`);
//   - the sweep shifts layout more than it does on the reduced page, or the largest paint is another element;
//   - under reduced motion, anything inside <main> starts an animation or a moving transition.
// Its findings are failures, never golden rows: motion is timing, and the golden holds layout.
const MOTION_PAGES = [
  ['stub', 'scripts/ci/fixture.ndjson', ['quiet.mostlyLight', 'cutBlocks.mostlyDark', 'typeOnBlack.allDark']],
  ['multi-practice-photo-set', 'scripts/ci/record-multi-practice-photo-set.ndjson', ['photoScrims.mostlyDark', 'cutBlocks.mostlyDark']],
]
// A property that lays the page out again when it changes.
const LAYOUT_PROP = /^(width|height|(min|max)-(width|height)|top|right|bottom|left|inset.*|margin.*|padding.*|grid-template-.*|font-size|line-height|letter-spacing|border(-[a-z]+)?-width|flex.*|gap|row-gap|column-gap)$/
const MOVING_PROPS = new Set(['transform', 'translate', 'scale', 'rotate'])
const SHORT_SCREEN = ['390x240', {viewport: {width: 390, height: 240}, isMobile: true, hasTouch: true}]
// Installed before any page script: every animation and transition that starts inside <main>, the layout
// shifts, and the largest paint's element.
function motionRecorder() {
  const m = (window.__motion = {events: [], shifts: 0, lcp: null})
  // The operator's preview bar is not the page: hidden before it paints, so it is never the largest paint.
  const bar = document.createElement('style')
  bar.textContent = '.sw{display:none !important}'
  document.documentElement.appendChild(bar)
  const record = (e, kind) => {
    const el = e.target
    if (!(el instanceof Element) || !el.closest('main')) return
    let props = [e.propertyName]
    let infinite = false
    if (kind === 'animation') {
      const a = el.getAnimations().find((x) => x.animationName === e.animationName)
      const frames = a?.effect?.getKeyframes() ?? []
      props = [...new Set(frames.flatMap((f) => Object.keys(f)).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)))]
      infinite = a?.effect?.getTiming().iterations === Infinity
    }
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/)[0]}` : ''
    m.events.push({kind, name: e.animationName || e.propertyName, props, infinite,
      paused: !!el.closest('section')?.querySelector('button[aria-pressed]'), at: el.tagName.toLowerCase() + cls})
  }
  document.addEventListener('animationstart', (e) => record(e, 'animation'), true)
  document.addEventListener('transitionrun', (e) => record(e, 'transition'), true)
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) m.shifts += e.value }).observe({type: 'layout-shift', buffered: true})
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      const el = e.element
      m.lcp = el ? `${el.tagName}:${el.getAttribute('src')?.split('?')[0].slice(-40) ?? (el.textContent ?? '').trim().slice(0, 40)}` : null
    }
  }).observe({type: 'largest-contentful-paint', buffered: true})
}
// The gap above each band's ground just as it comes into view (40 px of it showing, under either trigger), once
// the band above has finished its own rise; then the same once every band has settled.
async function bandGaps(wait) {
  const two = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const main = document.querySelector('main')
  const bands = [...(main?.querySelectorAll('section') ?? [])].filter((x) => !x.parentElement?.closest('section'))
  const out = []
  for (let i = 1; i < bands.length; i++) {
    window.scrollTo(0, bands[i].getBoundingClientRect().top + window.scrollY - window.innerHeight + 40)
    await two()
    if (wait) { await new Promise((r) => setTimeout(r, 700)); await two() }
    out.push({i, gap: Math.round(bands[i].getBoundingClientRect().top - bands[i - 1].getBoundingClientRect().bottom)})
  }
  return out
}
async function sweep() {
  const h = document.documentElement.scrollHeight
  for (let y = 0; y <= h; y += 150) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
  await new Promise((r) => setTimeout(r, 900))
  return [...document.querySelectorAll('main div[style*="translateY"], [data-reveal="offset"]')].length
}
async function motionPass() {
  for (const [canvas, file, flows] of MOTION_PAGES) {
    await startStub(file)
    for (const [width, device] of WIDTHS) {
      const seen = {}
      for (const reducedMotion of ['reduce', 'no-preference']) {
        watch(`motion / ${canvas} / ${width} / ${reducedMotion}`, 'opening a browser context')
        const context = await browser.newContext({...device, reducedMotion, colorScheme: 'light'})
        await context.addCookies([{name: 'lp-preview', value: operator, url: `${BASE}/site-preview`}])
        await servePhotos(context)
        await context.addInitScript(motionRecorder)
        const page = await context.newPage()
        for (const flow of flows) {
          const key = `motion / ${canvas} / ${flow} / ${width} / ${reducedMotion}`
          watch(key)
          const url = `${BASE}/site-preview/${STYLE_SET}/${PALETTE}/${flow}/design`
          const res = await page.goto(url, {waitUntil: 'load', timeout: 60_000})
          if (!res || res.status() !== 200 || page.url() !== url) { fail(`${key}: ${url} answered ${res?.status()} at ${page.url()}`); continue }
          phase('the fonts and the largest paint')
          await page.evaluate(() => document.fonts.ready)
          await page.addStyleTag({content: '.sw{display:none !important}'})
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 250))))
          const reduced = reducedMotion === 'reduce'
          phase('the bands as they arrive')
          const arriving = reduced ? [] : await page.evaluate(bandGaps, true)
          phase('the sweep')
          const offset = await page.evaluate(sweep)
          const settled = reduced ? [] : await page.evaluate(bandGaps, false)
          const m = await page.evaluate(() => window.__motion)
          seen[flow] = seen[flow] ?? {}
          seen[flow][reducedMotion] = m
          if (offset) fail(`${key}: ${offset} band(s) still offset after the sweep`)
          for (const a of arriving) {
            const s = settled.find((x) => x.i === a.i)
            if (s && a.gap - s.gap >= 2) fail(`${key}: band ${a.i} leaves a ${a.gap - s.gap} px gap above its ground while it waits (the page shows through)`)
          }
          for (const e of m.events) {
            const bad = e.props.filter((p) => LAYOUT_PROP.test(p))
            if (bad.length) fail(`${key}: ${e.at} animates ${bad.join(', ')} (${e.kind} ${e.name}), which lays the page out again; only transform and opacity move`)
            if (e.infinite && !e.paused) fail(`${key}: ${e.at} moves for ever (${e.name}) with no pause control in its band (WCAG 2.2.2)`)
            if (reduced && (e.kind === 'animation' || e.props.some((p) => MOVING_PROPS.has(p)))) fail(`${key}: ${e.at} moves under reduced motion (${e.kind} ${e.name})`)
          }
        }
        await context.close()
        unwatch()
      }
      for (const flow of flows) {
        const r = seen[flow]?.reduce
        const n = seen[flow]?.['no-preference']
        if (!r || !n) continue
        const key = `motion / ${canvas} / ${flow} / ${width}`
        if (n.shifts - r.shifts > 0.001) fail(`${key}: the sweep shifts layout ${n.shifts.toFixed(4)} with motion, ${r.shifts.toFixed(4)} without`)
        if (n.lcp !== r.lcp) fail(`${key}: the largest paint is ${n.lcp} with motion and ${r.lcp} without`)
      }
    }
    if (canvas !== 'multi-practice-photo-set') continue
    // A short screen, where two bands are taller than the screen divided by 0.15.
    const [width, device] = SHORT_SCREEN
    const key = `motion / ${canvas} / quiet.mostlyLight / ${width}`
    watch(key, 'opening a browser context')
    const context = await browser.newContext({...device, reducedMotion: 'no-preference', colorScheme: 'light'})
    await context.addCookies([{name: 'lp-preview', value: operator, url: `${BASE}/site-preview`}])
    await servePhotos(context)
    const page = await context.newPage()
    await page.goto(`${BASE}/site-preview/${STYLE_SET}/${PALETTE}/quiet.mostlyLight/design`, {waitUntil: 'load', timeout: 60_000})
    await page.addStyleTag({content: '.sw{display:none !important}'})
    const tall = await page.evaluate(() => [...document.querySelectorAll('main section')].filter((x) => x.getBoundingClientRect().height > window.innerHeight / 0.15).length)
    const offset = await page.evaluate(sweep)
    if (!tall) fail(`${key}: no band is taller than the screen divided by 0.15, so this page tests nothing`)
    if (offset) fail(`${key}: ${offset} band(s) still offset after the sweep (${tall} taller than the screen divided by 0.15)`)
    await context.close()
    unwatch()
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
  for (const [canvas, file] of MOTION_ONLY ? [] : CANVASES) {
    if (!existsSync(file)) { console.log(`flow-metrics: ${file} absent, skipped`); continue }
    await startStub(file)
    for (const [width, device] of STYLE_SET_ONLY.includes(canvas) ? [] : WIDTHS) {
      watch(`${canvas} / ${width}`, 'opening a browser context')
      const context = await browser.newContext({...device, reducedMotion: 'reduce', colorScheme: 'light'})
      await context.addCookies([{name: 'lp-preview', value: operator, url: `${BASE}/site-preview`}])
      await servePhotos(context)
      // Phase 17E (`[R-573]`, ADV-17E-C): what the browser takes as the page's largest paint, and whether it is a
      // photograph of the theme's set, which it must never be.
      await context.addInitScript(() => {
        window.__lcp = null
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = {tag: e.element?.tagName ?? null, set: !!e.element?.closest?.('[data-photo-set]')} })
          .observe({type: 'largest-contentful-paint', buffered: true})
      })
      const page = await context.newPage()
      for (const flow of ONLY_FLOWS[canvas] ?? FLOWS) {
        const key = `${canvas} / ${flow} / ${width}`
        watch(key)
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
        phase('reading the switcher')
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
        phase('the fonts')
        await page.evaluate(() => document.fonts.ready)
        // Read before the sweep: a scroll ends the browser's search for the largest paint.
        phase('the largest paint')
        const lcp = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(() => r(window.__lcp), 250))))
        if (lcp?.set) fail(`${key}: the largest paint is a photograph of the theme's set (${lcp.tag}); the hero's photograph or heading must be`)
        // The switcher is the operator's bar, not the page: hidden for the measure and the eye.
        await page.addStyleTag({content: '.sw{display:none !important}'})
        // Reveal-on-scroll wrappers: sweep the page once so every band has entered view.
        phase('the scroll sweep and the images')
        await page.evaluate(async () => {
          const h = document.documentElement.scrollHeight
          for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) }
          window.scrollTo(0, 0)
          // Every photograph decoded before the measure and the capture (Phase 17B session 6); only the shown
          // ones, and none waited on past 5 s: a lazy image in a hidden rendering (the phone carousel at 1440),
          // or off to the side in a carousel's scroller at 390, never loads, and its decode never settles
          // (Phase 17D, found on a card-photo canvas).
          await Promise.all([...document.images].filter((i) => i.getClientRects().length).map((i) => Promise.race([i.decode().catch(() => {}), new Promise((r) => setTimeout(r, 5000))])))
          // Let the header's measured height and the last transitions settle.
          await new Promise((r) => setTimeout(r, 400))
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        })
        phase('the measure')
        const m = await page.evaluate(measure)
        results[key] = m
        if (m.innerWidth !== device.viewport.width) fail(`${key}: innerWidth is ${m.innerWidth}, not ${device.viewport.width} (the layout is not at this width)`)
        if (m.scrollWidth > m.clientWidth) fail(`${key}: horizontal scroll: scrollWidth ${m.scrollWidth} over ${m.clientWidth}`)
        if (width === '390') for (const b of m.bands) if (b.headingLines > 4 && !atFloor(b, 4)) fail(`${key}: band ${b.i} heading wraps to ${b.headingLines} lines at 390: ${b.heading}`)
        for (const b of overCeiling(m)) fail(`${key}: band ${b.i} heading set at ${b.headingSize} px, over the ${SECTION_HEADING_MAX_PX} px ceiling: ${b.heading}`)
        for (const {a, b, d} of unseenLightSteps(m)) fail(`${key}: bands ${a.i} and ${b.i} sit on two light grounds ${d.toFixed(2)} apart (${a.bg}, ${b.bg}), under the ${LIGHT_APART} a visitor can see`)
        for (const b of m.bands) if (b.ribbonLines > (Number(width) >= 992 ? 3 : 4)) fail(`${key}: band ${b.i} ribbon wraps to ${b.ribbonLines} lines at ${width}`)
        // Card photos (`[R-556]`): all or none per list, every one under the scrim, no dark context on a link.
        for (const b of m.bands.filter((x) => x.cards)) {
          const c = b.cards
          if (c.photos !== c.cards) fail(`${key}: band ${b.i} shows ${c.photos} card photos among ${c.cards} cards (all or none)`)
          if (c.scrimmed !== c.underText) fail(`${key}: band ${b.i}: ${c.underText - c.scrimmed} card photo(s) without the scrim under their text`)
          if (c.corner !== null && c.corner !== '15') fail(`${key}: band ${b.i}: the carried piece's layer is ${c.corner} on a photo card; its scrims cover it`)
          if (c.darkLinks) fail(`${key}: band ${b.i}: ${c.darkLinks} card link(s) carry a dark context; the ring is drawn on the band`)
        }
        phase('the screenshot')
        await page.screenshot({path: resolve(OUT, `${canvas}--${flow}--${width}.jpg`), fullPage: true, type: 'jpeg', quality: 60})
        phase('the scrolled header')
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
        unwatch()
      }
      watch(`${canvas} / ${width}`, 'closing the browser context')
      await context.close()
      unwatch()
    }
    if (!STYLE_SET_CANVASES.includes(canvas)) continue
    for (const [width, device] of canvas === 'long-headings' ? [...WIDTHS, TABLET, LAPTOP, LAPTOP_WIDE] : WIDTHS) {
      for (const styleSet of STYLE_SETS) {
        // A fresh context per page: the font bytes are what one visitor's first page fetches.
        watch(`${canvas} / ${STYLE_SET_FLOW} / ${width} / ${styleSet}`, 'opening a browser context')
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
        phase('load')
        let res = null
        for (let attempt = 0; attempt < 2 && !res; attempt++) {
          try { res = await page.goto(url, {waitUntil: 'load', timeout: 60_000}) } catch (e) { if (attempt === 1) throw e }
        }
        if (!res || res.status() !== 200) { fail(`${key}: ${url} answered ${res?.status()}`); await context.close(); continue }
        if (page.url() !== url) { fail(`${key}: landed on ${page.url()}, not ${url}`); await context.close(); continue }
        phase('the fonts')
        await page.evaluate(() => document.fonts.ready)
        await page.addStyleTag({content: '.sw{display:none !important}'})
        phase('the scroll sweep and the images')
        await page.evaluate(async () => {
          const h = document.documentElement.scrollHeight
          for (let y = 0; y <= h; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) }
          window.scrollTo(0, 0)
          await Promise.all([...document.images].filter((i) => i.getClientRects().length).map((i) => Promise.race([i.decode().catch(() => {}), new Promise((r) => setTimeout(r, 5000))])))
          await new Promise((r) => setTimeout(r, 400))
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        })
        phase('the measure')
        const m = await page.evaluate(measure)
        m.fontBytes = fontBytes
        m.fontFiles = fontFiles.sort()
        results[key] = m
        if (m.innerWidth !== device.viewport.width) fail(`${key}: innerWidth is ${m.innerWidth}, not ${device.viewport.width}`)
        if (m.scrollWidth > m.clientWidth) fail(`${key}: horizontal scroll: scrollWidth ${m.scrollWidth} over ${m.clientWidth}`)
        const limit = Number(width) >= 992 ? 3 : 4
        const stacked = ['768', '1024', '1279'].includes(width)
        phase('the stacked checks')
        for (const b of m.bands) if (b.ribbonLines > limit) fail(`${key}: band ${b.i} ribbon wraps to ${b.ribbonLines} lines at ${width} (the rule is ${limit})`)
        for (const b of overCeiling(m)) fail(`${key}: band ${b.i} heading set at ${b.headingSize} px, over the ${SECTION_HEADING_MAX_PX} px ceiling: ${b.heading}`)
        for (const b of m.bands) {
          if (b.headingLines <= limit) continue
          if (!stacked && atFloor(b, limit)) console.log(`flow-metrics: ${key}: band ${b.i} at the readable floor (${b.headingSize} px) takes ${b.headingLines} lines, as [R-544] allows: ${b.heading}`)
          else fail(`${key}: band ${b.i} heading wraps to ${b.headingLines} lines at ${width} (the rule is ${limit}): ${b.heading}`)
        }
        if (stacked) {
          // Nothing sits beside a heading column (`[R-548]`, `[R-549]`): no sibling shares its rows. It is no
          // wider than the single column; the body text keeps its measure; a stacked photo stays on screen.
          const found = await page.evaluate(() => ({
            columns: [...document.querySelectorAll('.heading-grows')].map((el) => {
              const r = el.getBoundingClientRect()
              const beside = [...(el.parentElement?.children ?? [])].filter((o) => {
                if (o === el) return false
                const q = o.getBoundingClientRect()
                return q.width > 0 && q.height > 0 && q.top < r.bottom - 1 && q.bottom > r.top + 1
              }).length
              return {w: r.width, beside, text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 48)}
            }),
            measures: [...document.querySelectorAll('.stacked-measure :is(p, ul, ol, blockquote)')].map((el) => el.getBoundingClientRect().width),
            photos: [...document.querySelectorAll('.stacked-photo img, .stacked-cutout img')].map((el) => el.getBoundingClientRect().height),
            viewportHeight: window.innerHeight,
          }))
          for (const c of found.columns) {
            if (c.beside) fail(`${key}: ${c.beside} element(s) beside a heading column at ${width} (it stacks under xl): ${c.text}`)
            if (c.w > STACKED_MAX + 1) fail(`${key}: a stacked heading column ${Math.round(c.w)} px wide at ${width}, past the ${STACKED_MAX} px single column: ${c.text}`)
          }
          const wide = found.measures.filter((w) => w > STACKED_MEASURE + 1)
          if (wide.length) fail(`${key}: ${wide.length} stacked text block(s) wider than the ${STACKED_MEASURE} px measure at ${width} (widest ${Math.round(Math.max(...wide))} px)`)
          const tall = found.photos.filter((h) => h > STACKED_PHOTO(found.viewportHeight) + 1)
          if (tall.length) fail(`${key}: ${tall.length} stacked photo(s) taller than the cap at ${width} (tallest ${Math.round(Math.max(...tall))} px)`)
        }
        if (fontBytes > FONT_BUDGET) fail(`${key}: ${fontBytes} font bytes over the budget of ${FONT_BUDGET}: ${fontFiles.join(', ')}`)
        phase('the screenshot')
        await page.screenshot({path: resolve(OUT, `${canvas}--${STYLE_SET_FLOW}--${width}--${styleSet}.jpg`), fullPage: true, type: 'jpeg', quality: 60})
        phase('closing the browser context')
        await context.close()
        unwatch()
      }
    }
  }
  await motionPass()
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
if (MOTION_ONLY) {
  console.log('flow-metrics: the motion pass alone; nothing compared to the golden')
} else if (UPDATE) {
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
      for (const f of ['heading', 'ring', 'scrim', 'glow', 'bg', 'ink', 'texture', 'ghost', 'window', 'panel', 'cards', 'pt', 'pb']) {
        if (JSON.stringify(b[f]) !== JSON.stringify(gb[f])) fail(`${key}: band ${i} (${b.heading}) ${f} ${JSON.stringify(b[f])} vs golden ${JSON.stringify(gb[f])}`)
      }
      if (JSON.stringify(b.classes) !== JSON.stringify(gb.classes)) fail(`${key}: band ${i} classes ${b.classes.join(' ')} vs golden ${gb.classes.join(' ')}`)
      for (const f of ['top', 'height']) if (!TOLERANCE(b[f], gb[f])) fail(`${key}: band ${i} ${f} ${b[f]} vs golden ${gb[f]} (past the tolerance)`)
      if (b.headingLines !== gb.headingLines) fail(`${key}: band ${i} heading lines ${b.headingLines} vs golden ${gb.headingLines}`)
      for (const f of ['headingWeight', 'headingSize', 'ribbonLines', 'ribbonSize']) if (JSON.stringify(b[f]) !== JSON.stringify(gb[f])) fail(`${key}: band ${i} ${f} ${b[f]} vs golden ${gb[f]}`)
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
console.log(MOTION_ONLY ? 'flow-metrics: the motion pass is clean.' : 'flow-metrics: every theme on every canvas at 1440 and 390 is what the golden says, and the motion pass is clean.')
