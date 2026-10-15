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
//
// Advertising (monorepo WS-AD-PIXELS-DESIGN-2026-10-15 §2 and §8): the fixture also holds an ID for each of the four
// networks, and each set ID loads its vendor's base tag on every page after an accept. Cases 1 to 6 run on 127.0.0.1, which is not the site's own
// address, so Accept there loads no advertising tag (13 says so). Cases 7 to 15 run on the site's own address, the
// build's NEXT_PUBLIC_SITE_DOMAIN, which Chromium is told is this machine. Every request to any other host is answered
// here with an empty body and recorded, so nothing reaches Meta, Google, Microsoft or LinkedIn:
//   7. a first visit from an ad: the banner offers Accept all, Decline all and Choose, and no tag is requested;
//   8. Accept all: the analytics script and every network's tag; the next page loads them again, unasked;
//   9. the thank-you page, reached with a form's answers in its address: the address is bare, so every network's tag
//      loads there (where the firm's own dashboards count a lead), and no request or referrer carries an answer;
//  10. Choose, Analytics only: the analytics script and no tag;
//  11. Choose, Advertising only: the tag and no analytics script;
//  12. Global Privacy Control, over an accept of both stored without it: no banner and no tag (it overrides the
//      advertising accept); the analytics accept, the visitor's own, stands;
//  13. the same accept on another address (a preview or staging deployment): no tag;
//  14. an address carrying something typed (a search): no tag, and the blog search tells the next page only the origin;
//  15. withdrawing advertising: the page reloads, says so, and requests no tag.
// Across 7 to 15 no outside request, nor its referrer, carries a search term or a form answer.
// Prints one line per case; exits 1 on a failure, 2 when the page or a server would not load.
//
// Usage: node scripts/ci/consent-served.mjs [--served URL] [--live URL]
// --live is the site's own address as served (default, unserved: http://example.com:APP_PORT). With --served and no
// --live, cases 7 to 15 do not run, and the line says so.
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
const SITE_DOMAIN = 'example.com'
const live = flag('--live') ?? (served ? null : `http://${SITE_DOMAIN}:${APP_PORT}`)
const LIVE = live ? live.replace(/\/$/, '') : null
const OWN_HOSTS = new Set([new URL(BASE).host, ...(LIVE ? [new URL(LIVE).host] : [])])
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
      NEXT_PUBLIC_SITE_DOMAIN: SITE_DOMAIN, NEXT_TELEMETRY_DISABLED: '1',
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

// Every request to a host that is not this site's is answered here and recorded: the advertising networks' tags, and
// anything they or the page would send.
const outside = []
async function visit(browser, contextOptions, fn, origin = BASE) {
  const ctx = await browser.newContext(contextOptions)
  const vendors = []
  await ctx.route('**/*', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (OWN_HOSTS.has(url.host)) return route.fallback()
    const seen = {url: req.url(), referer: (await req.allHeaders())['referer'] ?? '', script: req.resourceType() === 'script'}
    vendors.push(seen)
    outside.push(seen)
    if (req.resourceType() === 'script') return route.fulfill({status: 200, contentType: 'text/javascript', body: '/* outside */'})
    return route.fulfill({status: 204, body: ''})
  })
  const page = await ctx.newPage()
  const probes = []
  // The probe is answered here (a request to it would otherwise reach the catch-all route), and the commands are
  // read as they stand when it is requested: the order Consent Mode needs.
  await page.route(`**${PROBE}`, async (route) => {
    probes.push({commands: await page.evaluate(() => (window.dataLayer || []).map((a) => [Object.prototype.toString.call(a), Array.from(a)])).catch(() => null)})
    await route.fulfill({status: 200, contentType: 'text/javascript', body: '/* probe */'})
  })
  const load = async (path) => {
    const res = await page.goto(origin + path, {waitUntil: 'load', timeout: 60000}).catch(() => null)
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
    await fn({page, probes, load, vendors})
  } finally {
    await ctx.close()
  }
}

const banner = (page) => page.locator('section[data-consent-banner]:visible')

const tagsOf = (vendors) => vendors.filter((v) => v.script).map((v) => {
  const u = new URL(v.url)
  return u.host + u.pathname + (u.searchParams.get('id') ? `?id=${u.searchParams.get('id')}` : '')
})
const GOOGLE_ADS_TAG = 'www.googletagmanager.com/gtag/js?id=AW-1234567890'
const ALL_TAGS = ['connect.facebook.net/en_US/fbevents.js', GOOGLE_ADS_TAG, 'bat.bing.com/bat.js', 'snap.licdn.com/li.lms-analytics/insight.min.js']
const FROM_ADS = '?gclid=ci-g&fbclid=ci-f&msclkid=ci-m&li_fat_id=ci-l&utm_source=ci'

// Chromium is told the site's own name is this machine, so the build's NEXT_PUBLIC_SITE_DOMAIN is a reachable address.
const browser = await chromium.launch({args: LIVE ? [`--host-resolver-rules=MAP ${new URL(LIVE).hostname} 127.0.0.1`] : []})
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

  if (!LIVE) {
    console.log('skip 7 to 15: no --live address for the site\'s own host')
  } else {
    const stored = (page, choices) => page.addInitScript((c) => localStorage.setItem('lp-consent', JSON.stringify({v: 2, ...c, at: Math.floor(Date.now() / 1000)})), choices)

    const n7 = failures.length
    await visit(browser, {}, async ({page, probes, load, vendors}) => {
      if (!(await load(`/${FROM_ADS}`))) return
      for (const name of ['Accept all', 'Decline all', 'Choose']) {
        check((await page.getByRole('button', {name, exact: true}).count()) === 1, `7. the banner has no ${name} button`)
      }
      check(vendors.length === 0, `7. an outside host was asked before any choice: ${vendors.map((v) => v.url).join(' ')}`)
      check(probes.length === 0, '7. the consent script was requested before any choice')
    }, LIVE)
    console.log(`${failures.length > n7 ? 'FAIL' : 'ok  '} 7. a first visit from an ad: three equal choices, nothing requested`)

    const n8 = failures.length
    await visit(browser, {}, async ({page, probes, load, vendors}) => {
      if (!(await load('/?gclid=ci-g&utm_source=google'))) return
      await page.getByRole('button', {name: 'Accept all', exact: true}).click()
      await page.waitForTimeout(500)
      check(probes.length === 1, `8. Accept all requested the consent script ${probes.length} time(s), not once`)
      check(JSON.stringify(tagsOf(vendors)) === JSON.stringify(ALL_TAGS), `8. Accept all loaded ${JSON.stringify(tagsOf(vendors))}, not every network's tag`)
      const before = vendors.length
      if (!(await load('/fixture-practice-area'))) return
      check(JSON.stringify(tagsOf(vendors.slice(before))) === JSON.stringify(ALL_TAGS), `8. the next page loaded ${JSON.stringify(tagsOf(vendors.slice(before)))}, not every network's tag`)
      check(probes.length === 2, '8. the next page did not load the consent script for an accepted visitor')
    }, LIVE)
    console.log(`${failures.length > n8 ? 'FAIL' : 'ok  '} 8. Accept all: analytics and every tag, on the next page too`)

    const n9 = failures.length
    await visit(browser, {}, async ({page, load, vendors}) => {
      await stored(page, {analytics: 'granted', ads: 'granted'})
      if (!(await load('/thank-you?name=Pat+Doe&email=pat%40mail.example'))) return
      await page.waitForTimeout(500)
      const address = await page.evaluate(() => location.pathname + location.search + location.hash)
      check(address === '/thank-you', `9. the thank-you page kept its query string: ${address}`)
      const carried = vendors.filter((v) => /Pat|pat%40|mail\.example/i.test(v.url + ' ' + v.referer))
      check(carried.length === 0, `9. an outside request carried a form answer: ${carried.map((v) => `${v.url} (referer ${v.referer})`).join(' ')}`)
      check(JSON.stringify(tagsOf(vendors)) === JSON.stringify(ALL_TAGS), `9. the thank-you page loaded ${JSON.stringify(tagsOf(vendors))}, not every network's tag`)
      const counted = await page.evaluate(() => (window.fbq?.queue || []).filter((c) => c[0] === 'track').map((c) => c[1]))
      check(JSON.stringify(counted) === JSON.stringify(['PageView']), `9. the site sent Meta ${JSON.stringify(counted)}, not its page view alone: the site counts nothing itself`)
    }, LIVE)
    console.log(`${failures.length > n9 ? 'FAIL' : 'ok  '} 9. the thank-you page: a bare address, every tag, nothing counted by the site`)

    const pick = async (page, label) => {
      await page.getByRole('button', {name: 'Choose', exact: true}).click()
      await page.getByRole('checkbox', {name: label, exact: true}).check()
      await page.getByRole('button', {name: 'Save choices', exact: true}).click()
      await page.waitForTimeout(500)
    }
    const n10 = failures.length
    await visit(browser, {}, async ({page, probes, load, vendors}) => {
      if (!(await load(`/${FROM_ADS}`))) return
      await pick(page, 'Analytics')
      check(probes.length === 1, `10. Analytics only requested the consent script ${probes.length} time(s), not once`)
      check(tagsOf(vendors).length === 0, `10. Analytics only loaded ${JSON.stringify(tagsOf(vendors))}`)
    }, LIVE)
    console.log(`${failures.length > n10 ? 'FAIL' : 'ok  '} 10. Choose, Analytics only: the script, no tag`)

    const n11 = failures.length
    await visit(browser, {}, async ({page, probes, load, vendors}) => {
      if (!(await load(`/${FROM_ADS}`))) return
      await pick(page, 'Advertising')
      check(probes.length === 0, '11. Advertising only requested the consent script')
      check(JSON.stringify(tagsOf(vendors)) === JSON.stringify(ALL_TAGS), `11. Advertising only loaded ${JSON.stringify(tagsOf(vendors))}, not every network's tag`)
    }, LIVE)
    console.log(`${failures.length > n11 ? 'FAIL' : 'ok  '} 11. Choose, Advertising only: the tags, no script`)

    const n12 = failures.length
    await visit(browser, {}, async ({page, probes, load, vendors}) => {
      await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {get: () => true}))
      await stored(page, {analytics: 'granted', ads: 'granted'})
      if (!(await load(`/${FROM_ADS}`))) return
      check((await banner(page).count()) === 0, '12. a Global Privacy Control browser was shown the banner')
      check(probes.length === 1, `12. the visitor's own analytics accept loaded the consent script ${probes.length} time(s), not once`)
      check(vendors.length === 0, `12. an outside host was asked under Global Privacy Control: ${vendors.map((v) => v.url).join(' ')}`)
    }, LIVE)
    console.log(`${failures.length > n12 ? 'FAIL' : 'ok  '} 12. Global Privacy Control over a stored accept: no tag, the analytics accept stands`)

    const n13 = failures.length
    await visit(browser, {}, async ({page, probes, load, vendors}) => {
      if (!(await load(`/${FROM_ADS}`))) return
      await page.getByRole('button', {name: 'Accept all', exact: true}).click()
      await page.waitForTimeout(500)
      check(probes.length === 1, '13. Accept all on another address did not load the consent script')
      check(vendors.length === 0, `13. another address (a preview or staging deployment) asked an outside host: ${vendors.map((v) => v.url).join(' ')}`)
    })
    console.log(`${failures.length > n13 ? 'FAIL' : 'ok  '} 13. another address: analytics, never a tag`)

    const n14 = failures.length
    await visit(browser, {}, async ({page, load, vendors}) => {
      await stored(page, {analytics: 'granted', ads: 'granted'})
      if (!(await load('/?gclid=ci-g&q=custody'))) return
      check(tagsOf(vendors).length === 0, `14. an address carrying a search loaded ${JSON.stringify(tagsOf(vendors))}`)
      if (!(await load('/blog?q=custody'))) return
      const referrer = await page.locator('meta[name="referrer"]').getAttribute('content').catch(() => null)
      check(referrer === 'strict-origin', `14. the blog search does not limit its referrer to the origin (meta referrer: ${referrer})`)
    }, LIVE)
    console.log(`${failures.length > n14 ? 'FAIL' : 'ok  '} 14. an address carrying a search: no tag; the blog search sends the origin alone`)

    const n15 = failures.length
    await visit(browser, {}, async ({page, load, vendors}) => {
      if (!(await load('/?gclid=ci-g'))) return
      await page.getByRole('button', {name: 'Accept all', exact: true}).click()
      await page.waitForTimeout(500)
      if (!check(tagsOf(vendors).length === ALL_TAGS.length, `15. Accept all loaded ${JSON.stringify(tagsOf(vendors))}`)) return
      await page.getByRole('button', {name: 'Cookie settings'}).click()
      await page.getByRole('button', {name: 'Choose', exact: true}).click()
      await page.getByRole('checkbox', {name: 'Advertising', exact: true}).uncheck()
      const before = vendors.length
      await Promise.all([page.waitForEvent('load', {timeout: 20000}).catch(() => null), page.getByRole('button', {name: 'Save choices', exact: true}).click()])
      await page.waitForFunction(() => Object.keys(document.querySelector('header') || {}).some((k) => k.startsWith('__react')), null, {timeout: 20000}).catch(() => {})
      await page.waitForTimeout(500)
      const status = await page.getByRole('status').first().innerText().catch(() => '')
      check(/advertising/i.test(status) && /declined/i.test(status), `15. after the reload the status line reads: ${status}`)
      check(tagsOf(vendors.slice(before)).length === 0, `15. after withdrawing, the page loaded ${JSON.stringify(tagsOf(vendors.slice(before)))}`)
      const record = await page.evaluate(() => JSON.parse(localStorage.getItem('lp-consent') || '{}'))
      check(record.ads === 'denied' && record.analytics === 'granted', `15. the stored choices read ${JSON.stringify(record)}`)
    }, LIVE)
    console.log(`${failures.length > n15 ? 'FAIL' : 'ok  '} 15. withdrawing advertising: a reload, said so, no tag`)

    const leaked = outside.filter((v) => /custody|Pat|pat%40|mail\.example/i.test(v.url + ' ' + v.referer))
    check(leaked.length === 0, `7-15. an outside request carried a search term or a form answer: ${leaked.map((v) => `${v.url} (referer ${v.referer})`).join(' ')}`)
    console.log(`${leaked.length ? 'FAIL' : 'ok  '} 7-15. ${outside.length} outside request(s), none carrying what a visitor typed`)
  }
} finally {
  await browser.close()
}
for (const f of failures) console.error(`::error::${f}`)
process.exit(broken ? 2 : failures.length ? 1 : 0)
