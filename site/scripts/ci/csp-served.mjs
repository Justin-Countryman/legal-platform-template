// csp-served — the Content Security Policy breaks nothing on the built site (monorepo [R-785], WS-CSP-DESIGN-2026-10-16
// §5). Run from `site/` after `scripts/ci/build-against-stub.sh`. A policy that blocks one script costs the page its
// hydration and a console error, which Lighthouse's Best Practices counts, so this is the check that decides whether the
// policy may ship at all.
//
//   1. The built HTML (.next/server/app): every inline <script> is one of the fixed scripts of lib/inlineScripts.ts, a
//      data block (JSON-LD), or Next's own inline page data, `self.__next_f.push(<JSON>)`, whose argument parses. A new
//      inline script, or a Next upgrade that changes that shape, is red here before any firm sees it.
//   2. Every route type, served by `next start` and opened in Chromium and WebKit: the response carries the enforced
//      policy, the page hydrates, no violation is reported, no console error is logged, every one of Next's data
//      scripts was handed over by the relay and none ran, no React streaming script ($RC and kin) is served, and what
//      the relay handed to Next equals, value for value and in order, what the server wrote. A 404 is Next's own bare
//      document, which the layout's relay is not in: there the relay's second copy (lib/relay.ts, from Next's client
//      bundle) must hand everything over and the page must draw its "not found" heading; the refusals logged before
//      that file ran are the one console output allowed, and only there.
//   2b. Page documents carry the policy and nothing else does (lib/securityHeaders.ts CSP_SOURCE, CSP_MISSING): not
//      the operator's preview, not Next's files (a policy on the render-blocking stylesheet cost a simulated round
//      trip), not the router's own data requests.
//   2c. Every host in lib/scriptHosts.ts loads a script under the real header with no violation, and a host not in it
//      is refused once: the list and the header agree as the browser reads them (outside hosts answered here).
//   3. The same, with the HTML delivered in small pieces with pauses (a proxy in front of the server), so the parser
//      yields inside script text: the case that caught a relay bug while it was designed.
//   4. Accepting the cookie banner (analytics, the fixture's GA4-shaped snippet) reports no violation either.
//
// Prints one line per case; exits 1 on a failure, 2 when a server or page would not load.
// Usage: node scripts/ci/csp-served.mjs [--served URL]
import {spawn} from 'node:child_process'
import {readFileSync, readdirSync, statSync} from 'node:fs'
import http from 'node:http'
import {join, resolve} from 'node:path'
import {chromium, webkit} from '@playwright/test'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const STUB_PORT = Number(process.env.STUB_PORT ?? 4016)
const APP_PORT = Number(process.env.APP_PORT ?? 3123)
const SLOW_PORT = Number(process.env.SLOW_PORT ?? 3124)
const served = flag('--served')
const BASE = served ? served.replace(/\/$/, '') : `http://127.0.0.1:${APP_PORT}`

// Every route type the stub fixture reaches, with the status it answers.
const ROUTES = [
  ['/', 200], ['/attorneys', 200], ['/attorneys/fixture-attorney', 200], ['/staff', 200], ['/staff/fixture-staff', 200],
  ['/blog', 200], ['/blog/fixture-post', 200], ['/blog/category/fixture-cat', 200], ['/fixture-practice-area', 200],
  ['/contact', 200], ['/events', 200], ['/events/fixture-event', 200], ['/videos', 200], ['/service-area', 200],
  ['/review/fixture-review', 200], ['/thank-you', 200],
  // Next's bare 404 document: a missing page through the catch-all, and the two pages that 404 when they are empty.
  ['/no-such-page', 404], ['/case-results', 404], ['/testimonials', 404],
]
const SLOW_ROUTES = ['/', '/blog/fixture-post', '/fixture-practice-area']
const SLOW_PIECES = [61, 509]

const DATA_A = '(self.__next_f=self.__next_f||[]).push('
const DATA_B = 'self.__next_f.push('
const INLINE = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g
const isDataBlock = (attrs) => /\btype="application\/(ld\+)?json"/.test(attrs)

/** The value a Next data script hands to `self.__next_f.push`, or undefined when its text is not that shape. */
function nextData(text) {
  const k = text.startsWith(DATA_A) ? DATA_A.length : text.startsWith(DATA_B) ? DATA_B.length : 0
  if (!k || !text.endsWith(')')) return undefined
  try {
    return JSON.parse(text.slice(k, -1))
  } catch {
    return undefined
  }
}

const failures = []
let broken = false
const check = (ok, what) => {
  if (!ok) failures.push(what)
  return ok
}

// ─── 1. The built HTML ───────────────────────────────────────────────────────
{
  const root = '.next/server/app'
  const files = []
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (p.endsWith('.html')) files.push(p)
    }
  }
  walk(root)
  const other = new Map()
  let data = 0
  for (const f of files) {
    for (const [, attrs, text] of readFileSync(f, 'utf8').matchAll(INLINE)) {
      if (isDataBlock(attrs)) continue
      if (text.startsWith(DATA_A) || text.startsWith(DATA_B)) {
        data++
        check(nextData(text) !== undefined, `${f}: a Next data script whose argument does not parse: ${text.slice(0, 60)}`)
        continue
      }
      other.set(text, [...(other.get(text) ?? []), f])
    }
  }
  // Anything else is one of lib/inlineScripts.ts's fixed scripts, the same text on every page that has it (this
  // script cannot import TypeScript, so it counts them; the unit test pins their hashes to the header): the relay and
  // the consent decision; the preview's switch-off is on no prerendered page.
  check(other.size >= 1 && other.size <= 3, `built HTML: ${other.size} distinct non-data inline scripts (expected the relay and the consent script)`)
  const relay = [...other.keys()].find((t) => t.includes('text/x-next-f'))
  check(!!relay, 'built HTML: no relay script')
  // Every page the layout renders carries the relay; Next's own bare documents (a prerendered 404 shell, the global
  // error page) carry none, and the relay's second copy covers them.
  const ours = files.filter((f) => !/<html id="__next_error__"/.test(readFileSync(f, 'utf8')) && !f.endsWith('_global-error.html'))
  if (relay) check(other.get(relay).length === ours.length, `built HTML: ${ours.length - other.get(relay).length} of the layout's pages without the relay`)
  console.log(`built HTML: ${files.length} pages, ${data} Next data scripts, ${other.size} fixed scripts`)
}

// ─── Servers ─────────────────────────────────────────────────────────────────
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

// A proxy that relays every response unchanged, but an HTML body in `pieces`-byte writes with a pause between.
let pieces = 0
const slow = http.createServer((req, res) => {
  const up = http.request(new URL(req.url, BASE), {method: req.method, headers: {...req.headers, 'accept-encoding': 'identity'}}, (r) => {
    const html = String(r.headers['content-type'] ?? '').includes('text/html')
    res.writeHead(r.statusCode ?? 502, r.headers)
    if (!html || !pieces) return r.pipe(res)
    const chunks = []
    r.on('data', (c) => chunks.push(c)).on('end', () => {
      const body = Buffer.concat(chunks)
      let at = 0
      const step = () => {
        if (at >= body.length) return res.end()
        res.write(body.subarray(at, at + pieces))
        at += pieces
        setTimeout(step, 2)
      }
      step()
    })
  })
  up.on('error', () => { res.writeHead(502); res.end() })
  req.pipe(up)
})
await new Promise((r) => slow.listen(SLOW_PORT, '127.0.0.1', r))

// ─── 2 to 4. Served ──────────────────────────────────────────────────────────
// Records what reaches Next's reader: the relay pushes into `self.__next_f`, and Next later replaces its `push`; the
// accessor keeps both, so every value handed over is seen once, in order.
const RECORD = () => {
  const seen = []
  const arr = []
  let reader = null
  Object.defineProperty(arr, 'push', {
    configurable: true,
    get: () => (v) => { seen.push(JSON.stringify(v)); return reader ? reader(v) : Array.prototype.push.call(arr, v) },
    set: (fn) => { reader = fn },
  })
  window.__next_f = arr
  window.__seen = seen
  window.__violations = []
  document.addEventListener('securitypolicyviolation', (e) => window.__violations.push(`${e.effectiveDirective} ${e.blockedURI || 'inline'}`))
}

async function open(browser, origin, path, expectStatus, label) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push(`pageerror ${String(e).slice(0, 200)}`))
  await page.addInitScript(RECORD)
  const res = await page.goto(origin + path, {waitUntil: 'load', timeout: 60000}).catch(() => null)
  if (!res) {
    console.error(`::error::${label} ${path} did not load`)
    broken = true
    await ctx.close()
    return null
  }
  await page.waitForFunction(() => document.readyState === 'complete' && Object.keys(document.querySelector('header') || document.body).some((k) => k.startsWith('__react')), null, {timeout: 20000}).catch(() => {})
  await page.waitForTimeout(400)
  const raw = await (await fetch(BASE + path)).text()
  const expected = [...raw.matchAll(INLINE)].filter(([, a, t]) => !isDataBlock(a) && (t.startsWith(DATA_A) || t.startsWith(DATA_B))).map(([, , t]) => JSON.stringify(nextData(t)))
  const state = await page.evaluate(() => ({
    notFoundShown: /not found/i.test(document.querySelector('h1')?.textContent ?? ''),
    hydrated: [...document.querySelectorAll('body *')].some((el) => Object.keys(el).some((k) => k.startsWith('__reactFiber$'))),
    violations: window.__violations,
    seen: window.__seen,
    unrelayed: [...document.scripts].filter((s) => !s.type && /^\(?self\.__next_f/.test(s.text)).length,
    failed: document.querySelectorAll('[data-relay="failed"]').length,
  }))
  const csp = res.headers()['content-security-policy'] ?? ''
  // On Next's bare 404 document alone: its own status line, and the refusals logged before the relay's second copy ran.
  const bare404 = expectStatus === 404
  const refusal = /Content Security Policy|Refused to execute/
  const consoleErrors = errors.filter((e) => !(bare404 && (/status of 404/.test(e) || refusal.test(e))))
  const ok = [
    check(res.status() === expectStatus, `${label} ${path}: status ${res.status()}, expected ${expectStatus}`),
    check(/(^|;)\s*script-src\s/.test(csp) && !/unsafe-inline|unsafe-eval/.test(csp), `${label} ${path}: no enforced policy without unsafe sources (${csp.slice(0, 80)})`),
    check(!res.headers()['content-security-policy-report-only'], `${label} ${path}: a report-only policy`),
    check(state.hydrated, `${label} ${path}: did not hydrate`),
    check(bare404 || state.violations.length === 0, `${label} ${path}: ${state.violations.length} violations: ${state.violations.slice(0, 3).join(' | ')}`),
    check(!bare404 || state.notFoundShown, `${label} ${path}: the 404 did not draw its heading`),
    check(!/<script[^>]*>\$R[A-Z]/.test(raw), `${label} ${path}: a React streaming script is served`),
    check(consoleErrors.length === 0, `${label} ${path}: console errors: ${consoleErrors.slice(0, 2).join(' | ')}`),
    check(state.unrelayed === 0 && state.failed === 0, `${label} ${path}: ${state.unrelayed} data scripts not handed over, ${state.failed} failed`),
    check(JSON.stringify(state.seen) === JSON.stringify(expected), `${label} ${path}: the relay handed over ${state.seen.length} values, the server wrote ${expected.length}, or they differ`),
  ].every(Boolean)
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(16)} ${path.padEnd(28)} ${expected.length} data scripts, ${state.violations.length} violations, ${consoleErrors.length} console errors`)
  await ctx.close()
  return page
}

// ─── 2b. The preview carries no policy; every other path does ───────────────
{
  const preview = await fetch(`${BASE}/site-preview/a/b`, {redirect: 'manual'})
  const home = await fetch(`${BASE}/`)
  const html = await home.text()
  const assets = [...new Set([...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))]
  const assetPolicies = await Promise.all(assets.map(async (a) => (await fetch(BASE + a)).headers.get('content-security-policy')))
  const rsc = await fetch(`${BASE}/contact`, {headers: {RSC: '1'}})
  const ok = [
    check(!preview.headers.get('content-security-policy'), `/site-preview: carries a policy (${preview.status})`),
    check(!!home.headers.get('content-security-policy'), '/: carries no policy'),
    check(assets.length > 3 && assetPolicies.every((p) => !p), `Next's files: ${assetPolicies.filter(Boolean).length} of ${assets.length} carry a policy`),
    check(!rsc.headers.get('content-security-policy'), "the router's data request carries a policy"),
  ].every(Boolean)
  console.log(`${ok ? 'ok  ' : 'FAIL'} the policy is on page documents only: not the preview (${preview.status}), ${assets.length} files or the router's data`)
}

// Every listed host, read from lib/scriptHosts.ts as text (this script cannot import TypeScript).
const LISTED = [...readFileSync('lib/scriptHosts.ts', 'utf8').matchAll(/source: '(https:\/\/[^']+)'/g)].map((m) => m[1])

for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch()
  for (const [path, status] of ROUTES) await open(browser, BASE, path, status, name)
  if (name === 'chromium') {
    for (const p of SLOW_PIECES) {
      pieces = p
      for (const path of SLOW_ROUTES) await open(browser, `http://127.0.0.1:${SLOW_PORT}`, path, 200, `${name} ${p}B`)
    }
    pieces = 0
    // 4. The cookie banner's accept, with the fixture's GA4-shaped snippet (its script is a same-origin probe).
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
    await page.addInitScript(RECORD)
    await page.route('**/__consent-probe.js', (route) => route.fulfill({status: 200, contentType: 'text/javascript', body: '/* probe */'}))
    await page.goto(`${BASE}/`, {waitUntil: 'load'})
    await page.waitForTimeout(400)
    await page.getByRole('button', {name: /^Accept/}).first().click().catch(() => { broken = true })
    await page.waitForTimeout(600)
    const after = await page.evaluate(() => ({
      violations: window.__violations,
      probe: !!document.querySelector('script[src="/__consent-probe.js"]'),
      config: (window.dataLayer || []).some((a) => a[0] === 'config'),
    }))
    const ok = [
      check(after.violations.length === 0, `accept: ${after.violations.length} violations: ${after.violations.join(' | ')}`),
      check(errors.length === 0, `accept: console errors: ${errors.join(' | ')}`),
      check(after.probe && after.config, `accept: the analytics script ${after.probe ? 'loaded' : 'did not load'}, config ${after.config ? 'sent' : 'not sent'}`),
    ].every(Boolean)
    console.log(`${ok ? 'ok  ' : 'FAIL'} chromium         accept analytics on /`)
    await ctx.close()
  }
  // 2c. Each listed host loads a script under the real header; an unlisted one is refused, once.
  {
    const ctx = await browser.newContext()
    await ctx.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (url.origin === new URL(BASE).origin) return route.fallback()
      return route.fulfill({status: 200, contentType: 'text/javascript', body: '/* outside */'})
    })
    const page = await ctx.newPage()
    await page.addInitScript(RECORD)
    await page.goto(`${BASE}/`, {waitUntil: 'load'})
    const urls = [...LISTED.map((h) => `${h}/csp-served-probe.js`), 'https://widgets.unlisted.example/w.js']
    const violations = await page.evaluate(async (list) => {
      for (const src of list) {
        await new Promise((done) => {
          const s = document.createElement('script')
          s.src = src
          s.onload = s.onerror = done
          document.head.appendChild(s)
        })
      }
      await new Promise((r) => setTimeout(r, 100))
      return window.__violations
    }, urls)
    const ok = [
      check(LISTED.length >= 8, `scriptHosts: only ${LISTED.length} hosts read`),
      check(violations.length === 1 && violations[0].includes('widgets.unlisted.example'), `${name} hosts: ${violations.join(' | ') || 'no refusal of the unlisted host'}`),
    ].every(Boolean)
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(16)} ${LISTED.length} listed hosts load, an unlisted one is refused`)
    await ctx.close()
  }
  await browser.close()
}
slow.close()

for (const f of failures) console.error(`::error::${f}`)
console.log(failures.length ? `${failures.length} failures` : 'the policy breaks nothing on any route')
process.exit(broken ? 2 : failures.length ? 1 : 0)
