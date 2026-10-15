// consent-served — the cookie banner holds the consent script back on the built site (monorepo BI/rules/legal-pages.md,
// the LEGAL family; WS-CONSENT-AND-LEGAL-PAGES-DESIGN-2026-10-15 §4.1). Run from `site/` after
// `scripts/ci/build-against-stub.sh`.
//
// The CI fixture's Site Settings hold a GA4-shaped snippet whose script is a same-origin probe (PROBE below), so
// nothing here reaches Google. On the stub build served by `next start` (or --served URL), in a fresh browser each time:
//   1. a first visit shows the banner with the fixture's text and never requests the probe;
//   2. Decline: no probe, the banner gone, and still no probe on the next page;
//   3. Accept: the probe is requested, and by then dataLayer holds Consent Mode's default (all four keys denied) and
//      the update granting analytics alone, in that order; the next page loads it without asking;
//   4. Global Privacy Control: no banner and no probe;
//   5. the footer's Cookie settings button reopens the banner with focus inside it.
//   6. the server's HTML holds the banner (so it paints with the page, not after hydration) and the before-paint
//      script. (The preview routes, which need a signed session, are held off by lib/__tests__/consent.test.ts.)
// Prints one line per case; exits 1 on a failure, 2 when the page or a server would not load.
//
// Usage: node scripts/ci/consent-served.mjs [--served URL]
import {spawn} from 'node:child_process'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const STUB_PORT = Number(process.env.STUB_PORT ?? 4015)
const APP_PORT = Number(process.env.APP_PORT ?? 3121)
const served = flag('--served')
const BASE = served ? served.replace(/\/$/, '') : `http://127.0.0.1:${APP_PORT}`
const PROBE = '/__consent-probe.js'
const BANNER_TEXT = 'Fixture banner: analytics stays off unless you accept.'

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

const failures = []
let broken = false
const check = (ok, what) => {
  if (!ok) failures.push(what)
  return ok
}

async function visit(browser, contextOptions, fn) {
  const ctx = await browser.newContext(contextOptions)
  const page = await ctx.newPage()
  const probes = []
  // The probe is answered here (a request to it would otherwise reach the catch-all route), and the commands are
  // read as they stand when it is requested: the order Consent Mode needs.
  await page.route(`**${PROBE}`, async (route) => {
    probes.push({commands: await page.evaluate(() => (window.dataLayer || []).map((a) => [Object.prototype.toString.call(a), Array.from(a)])).catch(() => null)})
    await route.fulfill({status: 200, contentType: 'text/javascript', body: '/* probe */'})
  })
  const load = async (path) => {
    const res = await page.goto(BASE + path, {waitUntil: 'load', timeout: 60000}).catch(() => null)
    if (!res || res.status() >= 400) {
      console.error(`::error::${path} did not load (${res ? res.status() : 'no answer'})`)
      broken = true
      return false
    }
    await page.waitForFunction(() => Object.keys(document.querySelector('header') || {}).some((k) => k.startsWith('__react')), null, {timeout: 20000}).catch(() => {})
    await page.waitForTimeout(300)
    return true
  }
  try {
    await fn({page, probes, load})
  } finally {
    await ctx.close()
  }
}

const banner = (page) => page.locator('section[data-consent-banner]:visible')

const browser = await chromium.launch()
try {
  await visit(browser, {}, async ({page, probes, load}) => {
    if (!(await load('/'))) return
    const shown = await banner(page).count()
    const text = shown ? await banner(page).innerText() : ''
    check(shown === 1, '1. a first visit shows no banner')
    check(text.includes(BANNER_TEXT), `1. the banner does not show the fixture's Cookie Banner Text (it reads: ${text.slice(0, 80)})`)
    check(probes.length === 0, '1. the consent script was requested before any choice')
    console.log(`${failures.length ? 'FAIL' : 'ok  '} 1. first visit: banner shown, script held back`)
  })

  const n2 = failures.length
  await visit(browser, {}, async ({page, probes, load}) => {
    if (!(await load('/'))) return
    await page.getByRole('button', {name: 'Decline'}).click()
    check((await banner(page).count()) === 0, '2. the banner stayed open after Decline')
    if (!(await load('/fixture-practice-area'))) return
    check((await banner(page).count()) === 0, '2. a declined visitor was asked again on the next page')
    check(probes.length === 0, '2. the consent script loaded after Decline')
  })
  console.log(`${failures.length > n2 ? 'FAIL' : 'ok  '} 2. decline: nothing loads, not asked again`)

  const n3 = failures.length
  await visit(browser, {}, async ({page, probes, load}) => {
    if (!(await load('/'))) return
    await page.getByRole('button', {name: 'Accept'}).click()
    await page.waitForTimeout(500)
    check(probes.length === 1, `3. Accept requested the consent script ${probes.length} time(s), not once`)
    const at = probes[0]?.commands || []
    const want = JSON.stringify([
      ['[object Arguments]', ['consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied'}]],
      ['[object Arguments]', ['consent', 'update', {analytics_storage: 'granted'}]],
    ])
    check(JSON.stringify(at.slice(0, 2)) === want, `3. Consent Mode was not default-denied then granted, as gtag arguments, before the script loaded: ${JSON.stringify(at).slice(0, 240)}`)
    if (!(await load('/fixture-practice-area'))) return
    check((await banner(page).count()) === 0, '3. an accepted visitor was asked again')
    check(probes.length === 2, '3. the next page did not load the consent script for an accepted visitor')
  })
  console.log(`${failures.length > n3 ? 'FAIL' : 'ok  '} 3. accept: Consent Mode, then the script, remembered`)

  const n4 = failures.length
  await visit(browser, {}, async ({page, probes, load}) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {get: () => true}))
    if (!(await load('/'))) return
    check((await banner(page).count()) === 0, '4. a Global Privacy Control browser was shown the banner')
    check(probes.length === 0, '4. the consent script loaded under Global Privacy Control')
  })
  console.log(`${failures.length > n4 ? 'FAIL' : 'ok  '} 4. Global Privacy Control: a decline, unasked`)

  const n5 = failures.length
  await visit(browser, {}, async ({page, load}) => {
    if (!(await load('/'))) return
    await page.getByRole('button', {name: 'Decline'}).click()
    const settings = page.getByRole('button', {name: 'Cookie settings'})
    if (!check((await settings.count()) === 1, '5. the footer has no Cookie settings button')) return
    await settings.focus()
    await page.keyboard.press('Enter')
    check((await banner(page).count()) === 1, '5. Cookie settings did not reopen the banner')
    const inside = await page.evaluate(() => !!document.querySelector('section[data-consent-banner]')?.contains(document.activeElement))
    check(inside, '5. focus did not move into the reopened banner')
  })
  console.log(`${failures.length > n5 ? 'FAIL' : 'ok  '} 5. Cookie settings reopens it, focus inside`)

  const n6 = failures.length
  const html = await fetch(`${BASE}/`).then((r) => r.text()).catch(() => '')
  check(/<section[^>]*data-consent-banner/.test(html), "6. the server's HTML has no banner: it would paint only after hydration")
  check(html.includes('lp-consent') && html.includes('data-consent'), "6. the server's HTML has no before-paint consent script")
  console.log(`${failures.length > n6 ? 'FAIL' : 'ok  '} 6. in the server's HTML, with its before-paint script`)
} finally {
  await browser.close()
}
for (const f of failures) console.error(`::error::${f}`)
process.exit(broken ? 2 : failures.length ? 1 : 0)
