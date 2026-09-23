#!/usr/bin/env node
// check-preview-not-shipped — the preview address reaches no visitor.
//
//   node scripts/ci/check-preview-not-shipped.mjs                       # the built output only
//   node scripts/ci/check-preview-not-shipped.mjs --served <url> --secret <s> --count-file <f>
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §4). The preview renders the homepage
// with another style set and palette at `/site-preview/...`, for a browser holding a
// signed cookie. This proves, on the BUILT and SERVED site rather than on the source,
// that none of it reaches anyone else:
//
//   built   no preview string in the browser's files (`.next/static`) or in any
//           prerendered page (`.html`, `.rsc`); `/` is still in the prerender
//           manifest at 3600 seconds; no preview route was prerendered.
//   served  a visitor's `/` is the cached page, makes no Sanity query once warm, and
//           carries no preview string; the preview without a cookie is a 404 that
//           costs no more than any missing page and serves nothing of the preview, as
//           HTML, as a router request, and with a forged router header that skips the
//           layout; a bad, expired or forged link is a
//           404; a good link sets a cookie scoped to the preview; the operator's page
//           carries the switcher and the change, private and noindex; `/`, its
//           robots line included, ignores the cookie; a client's link is bound to its choices and shows no roster; an
//           ended session shows nothing of the site; the grey box draws no image;
//           (Phase 17B session 3) the theme in the fourth segment changes the page,
//           the three-segment address of the old pin redirects to the four-segment
//           one and reaches nobody without a session, and a client link minted at
//           the old pin (no theme in the grant) still enters.
//
// Sentinels are VALUES a visitor could only receive from preview code, never attribute
// names alone (a conditional prop can put an attribute's name in every page's flight
// payload as "$undefined", measured in the challenge, §7.1).
//
// "Cached" is judged by the stub's query count staying flat and `s-maxage`, not by
// `x-nextjs-cache`, which reads HIT on a per-request render (§7.1).

import {createHmac} from 'node:crypto'
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs'
import {join} from 'node:path'

const SENTINELS = [
  'site-preview',
  'lp-preview',
  'Theme, the flow of the page',
  'Client preview link',
  'Preview, nothing is live',
  'gb-label',
  'sw-choice',
  'ga-disable-',
]

const failures = []
const fail = (msg) => failures.push(msg)
const found = (text) => SENTINELS.filter((s) => text.includes(s))

function walk(dir, keep) {
  const out = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p, keep))
    else if (keep(p)) out.push(p)
  }
  return out
}

// ─── Built ────────────────────────────────────────────────────────────────────
const staticFiles = walk('.next/static', () => true)
if (staticFiles.length === 0) fail('.next/static is empty: run the build first')
for (const f of staticFiles) {
  const hit = found(readFileSync(f, 'utf8'))
  if (hit.length) fail(`${f} carries ${hit.join(', ')}`)
}
const pages = walk('.next/server/app', (p) => p.endsWith('.html') || p.endsWith('.rsc'))
for (const f of pages) {
  const hit = found(readFileSync(f, 'utf8'))
  if (hit.length) fail(`prerendered ${f} carries ${hit.join(', ')}`)
}
const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'))
if (manifest.routes?.['/']?.initialRevalidateSeconds !== 3600) fail('/ is not prerendered at 3600 seconds')
for (const route of Object.keys(manifest.routes ?? {})) if (route.startsWith('/site-preview')) fail(`${route} was prerendered`)
console.log(`built: ${staticFiles.length} browser file(s) and ${pages.length} prerendered page file(s) scanned for ${SENTINELS.length} sentinels`)

// ─── Served ───────────────────────────────────────────────────────────────────
const arg = (name) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}
const base = arg('--served')
if (base) {
  const secret = arg('--secret')
  const countFile = arg('--count-file')
  const queries = () => Number(readFileSync(countFile, 'utf8') || 0)
  const sign = (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`
  }
  const now = Math.floor(Date.now() / 1000)
  const operator = sign({v: 1, role: 'operator', exp: now + 3600, apply: {origin: 'http://127.0.0.1:8787', slug: 'ci-firm'}})
  const client = sign({v: 1, role: 'client', exp: now + 3600, styleSet: 'graphite', palette: 'navy-brass', flow: 'site', view: 'design'})
  // A client link minted before the theme row existed carries no `flow`.
  const oldPinClient = sign({v: 1, role: 'client', exp: now + 3600, styleSet: 'graphite', palette: 'navy-brass', view: 'grey'})
  const expired = sign({v: 1, role: 'operator', exp: now - 1})
  const forged = `${operator.split('.')[0]}.${createHmac('sha256', 'not-the-secret').update(operator.split('.')[0]).digest('base64url')}`

  const get = async (path, headers = {}) => {
    const before = queries()
    const t0 = performance.now()
    const res = await fetch(base + path, {headers, redirect: 'manual'})
    const body = await res.text()
    return {res, body, ms: Math.round(performance.now() - t0), queries: queries() - before}
  }
  const cookie = (token) => ({Cookie: `lp-preview=${token}`})
  const check = (cond, msg) => { if (!cond) fail(msg) }

  // A visitor.
  await get('/')
  const visitor = await get('/')
  check(visitor.res.status === 200, `/ answered ${visitor.res.status}`)
  check((visitor.res.headers.get('cache-control') ?? '').includes('s-maxage=3600'), `/ cache-control: ${visitor.res.headers.get('cache-control')}`)
  check(visitor.queries === 0, `a warm / made ${visitor.queries} Sanity queries`)
  check(found(visitor.body).length === 0, `/ carries ${found(visitor.body).join(', ')}`)
  // The stub is a fresh client, hidden until launch, so / is noindex by design; what
  // is checked is that its robots line never changes for a browser holding the
  // preview cookie (the preview's own noindex is the worst thing that could leak).
  const robots = (b) => (b.match(/<meta name="robots" content="[^"]*"/) ?? ['none'])[0]
  // What any page the site does not have costs, to compare a refused preview with.
  const miss = await get('/no-such-page-17a')

  // No cookie: nothing of the page, no query, however it is asked.
  const path = '/site-preview/graphite/navy-brass/site/design'
  // The router state tree in Next's own schema (`server/app-render/types.js`: a dynamic
  // segment is `[name, value, type, siblings|null]`, the fifth slot a number). ADV-17B-3 F1
  // measured the earlier shape (3-tuples, a trailing `true`) answering 500 "could not be
  // parsed" before any route code ran, so the case passed without exercising the path it
  // names; a 500 is now a failure of this proof.
  const seg = (name, value) => [name, value, 'd', null]
  const tree = encodeURIComponent(JSON.stringify(['', {children: ['(preview)', {children: ['site-preview', {children: [seg('styleSet', 'graphite'), {children: [seg('palette', 'navy-brass'), {children: [seg('flow', 'site'), {children: [seg('view', 'design'), {children: ['__PAGE__', {}]}]}]}]}]}]}]}, null, null, 1]))
  for (const [label, headers, suffix] of [
    ['as HTML', {}, ''],
    ['as a router request', {RSC: '1'}, ''],
    ['with a forged router header', {RSC: '1', 'Next-Router-State-Tree': tree}, '?x=1'],
  ]) {
    const r = await get(path + suffix, headers)
    check(r.res.status !== 500, `no cookie ${label}: the server answered 500, so this case proves nothing (the router state tree is not in Next's schema?)`)
    // The requested path itself may echo back in a 404's payload; the page's content,
    // the switcher and the grey box must not.
    const leaked = ['Fixture areas', ...SENTINELS.filter((s) => s !== 'site-preview')].filter((s) => r.body.includes(s))
    check(leaked.length === 0, `no cookie ${label}: ${r.res.status} carrying ${leaked.join(', ')}`)
    // A refused preview costs what any missing page costs (the site's not-found page
    // fetches the chrome); it never runs a preview query.
    check(r.queries <= miss.queries, `no cookie ${label}: made ${r.queries} Sanity queries, a missing page makes ${miss.queries}`)
  }

  // Links.
  for (const [label, token] of [['a malformed link', 'nope'], ['an expired link', expired], ['a forged link', forged]]) {
    const r = await get(`/site-preview/enter?t=${token}`)
    check(r.res.status === 404, `${label} answered ${r.res.status}`)
    check(!r.res.headers.get('set-cookie'), `${label} set a cookie`)
  }
  const enter = await get(`/site-preview/enter?t=${operator}`)
  check(enter.res.status === 303, `a good link answered ${enter.res.status}`)
  check(enter.res.headers.get('location')?.endsWith('/site-preview/site/site/site/design'), `a good link went to ${enter.res.headers.get('location')}`)
  const set = enter.res.headers.get('set-cookie') ?? ''
  for (const part of ['lp-preview=', 'HttpOnly', 'Secure', 'SameSite=lax', 'Path=/site-preview', 'Max-Age=']) {
    check(set.toLowerCase().includes(part.toLowerCase()), `the cookie lacks ${part}: ${set}`)
  }

  // The operator.
  const asIs = await get('/site-preview/site/site/site/design', cookie(operator))
  const op = await get(path, cookie(operator))
  check(op.res.status === 200, `the operator's preview answered ${op.res.status}`)
  check(op.body.includes('Theme, the flow of the page'), 'the operator\'s preview has no theme row')
  check(op.body.includes('Fixture areas'), 'the operator\'s preview has no homepage')
  check(op.body.includes('data-image-frame="framed"') && !asIs.body.includes('data-image-frame="framed"'), 'Graphite\'s photo frame did not reach the preview')
  const rootCss = (b) => (b.match(/:root\{[^<]*/) ?? [''])[0]
  check(rootCss(op.body) !== rootCss(asIs.body), 'the palette did not change the preview\'s colors')
  check((op.res.headers.get('cache-control') ?? '').includes('no-store'), `the preview's cache-control: ${op.res.headers.get('cache-control')}`)
  check(/<meta name="robots" content="noindex/.test(op.body), 'the preview carries no noindex')
  check(op.body.includes('/#/design?t='), 'the operator\'s preview has no Apply link')
  const again = await get('/', cookie(operator))
  check(found(again.body).length === 0 && again.queries === 0, '/ changed for a browser holding the preview cookie')
  check(robots(again.body) === robots(visitor.body), `/'s robots line changed with the preview cookie: ${robots(again.body)}`)

  // A switch, as the browser makes it (a router request for the next address).
  const switched = await get('/site-preview/marble/black-gold/site/design', {...cookie(operator), RSC: '1'})
  check(switched.res.status === 200, `a switch answered ${switched.res.status}`)
  console.log(`served: a switch took ${switched.ms} ms and ${switched.queries} Sanity queries (local stub)`)

  // The theme (Phase 17B session 3): the fourth segment changes the page. On the stub's
  // three bands Alternating at balanced darkens the ribbon (budget 1, the strongest
  // host) and Quiet darkens nothing, so the dark ground appears under one and not the
  // other; the Apply link then carries the theme.
  const quiet = await get('/site-preview/site/site/quiet.mostlyLight/design', cookie(operator))
  const alternating = await get('/site-preview/site/site/alternating.balanced/design', cookie(operator))
  const darkBands = (b) => (b.match(/<section[^>]*bg-brand-dark/g) ?? []).length
  check(quiet.res.status === 200 && alternating.res.status === 200, `a theme address answered ${quiet.res.status} and ${alternating.res.status}`)
  check(darkBands(alternating.body) > darkBands(quiet.body), `Alternating at balanced drew ${darkBands(alternating.body)} dark band(s) against Quiet's ${darkBands(quiet.body)}`)
  check(alternating.body.includes('/#/design?t='), 'a theme choice offers no Apply link')
  check(alternating.body.includes('not yet judged') || alternating.body.includes('Step: Alternating'), 'the theme row shows no step line for a two-step family')
  const unknownTheme = await get('/site-preview/site/site/no-such-theme/design', cookie(operator))
  check(unknownTheme.res.status === 404, `an unknown theme answered ${unknownTheme.res.status}`)

  // The three-segment address of the old pin: sent to the four-segment one inside a
  // session, and a 404 without one.
  const three = await get('/site-preview/graphite/navy-brass/design', cookie(operator))
  check([307, 308].includes(three.res.status) && three.res.headers.get('location')?.endsWith('/site-preview/graphite/navy-brass/site/design'), `the three-segment address answered ${three.res.status} to ${three.res.headers.get('location')}`)
  const threeNoCookie = await get('/site-preview/graphite/navy-brass/design')
  check(threeNoCookie.res.status === 404 && !threeNoCookie.res.headers.get('location'), `the three-segment address without a session answered ${threeNoCookie.res.status}`)

  // A client link minted at the old pin enters, as the site is for the theme.
  const oldEnter = await get(`/site-preview/enter?t=${oldPinClient}`)
  check(oldEnter.res.status === 303 && oldEnter.res.headers.get('location')?.endsWith('/site-preview/graphite/navy-brass/site/grey'), `an old-pin client link answered ${oldEnter.res.status} to ${oldEnter.res.headers.get('location')}`)

  // The grey box.
  const grey = await get('/site-preview/site/site/site/grey', cookie(operator))
  check(grey.res.status === 200 && grey.body.includes('gb-label') && grey.body.includes('Fixture areas'), 'the grey box did not render the homepage')
  const greyMain = grey.body.slice(grey.body.indexOf('data-grey-box'))
  check(!/<img\b/.test(greyMain), 'the grey box draws an image')

  // A client.
  const bound = await get('/site-preview/site/site/site/design', cookie(client))
  check([303, 307, 308].includes(bound.res.status) && bound.res.headers.get('location')?.includes(path), `a client off their choices answered ${bound.res.status} to ${bound.res.headers.get('location')}`)
  const cl = await get(path, cookie(client))
  check(cl.res.status === 200 && cl.body.includes('Preview, not live yet'), 'the client view did not render')
  check(!cl.body.includes('/site-preview/marble/') && !cl.body.includes('/#/design?t=') && !cl.body.includes('Theme, the flow of the page'), 'the client view shows the roster or Apply')

  // An ended session.
  const ended = await get(path, cookie(expired))
  check(ended.body.includes('This preview has ended') && !ended.body.includes('Fixture areas'), 'an ended session showed the site')

  console.log(`served: ${base} checked as a visitor, without a cookie three ways, with bad and good links, as the operator, the client and an ended session; the theme segment, the old pin's address and link`)
}

if (failures.length) {
  for (const f of failures) console.log(`::error::${f}`)
  process.exit(1)
}
console.log('check-preview-not-shipped: nothing of the preview reaches a visitor.')
