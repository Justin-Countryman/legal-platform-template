import {afterEach, describe, expect, it} from 'vitest'
import {ga4Snippet, mountPastedHtml} from '../pastedCode'
import {SCRIPT_HOSTS, scriptAllowed} from '../scriptHosts'

// Pasted HTML under the Content Security Policy (monorepo [R-785], WS-CSP-DESIGN-2026-10-16 §4): only a script the
// policy allows is recreated; Google's GA4 snippet runs as it always did; anything else is left out and named.
// jsdom never executes a script, so "runs" is read as a fresh script element in the document, and Google's snippet
// as what reached `window.dataLayer`.

const GOOGLE = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-ABC123XYZ');
</script>`

type GW = Window & {dataLayer?: unknown[]; gtag?: unknown}
const gw = window as GW

afterEach(() => {
  delete gw.dataLayer
  delete gw.gtag
  document.body.innerHTML = ''
})

describe('Google’s GA4 snippet is recognised exactly', () => {
  it('as Google gives it, and with two IDs or double quotes', () => {
    expect(ga4Snippet("window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-FIXTURE1');")).toEqual(['G-FIXTURE1'])
    expect(ga4Snippet('window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-A1B2C3");gtag("config","G-D4E5F6")')).toEqual(['G-A1B2C3', 'G-D4E5F6'])
  })

  it('and not with options, other calls or other code', () => {
    const base = "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date());"
    expect(ga4Snippet(`${base} gtag('config', 'G-ABC123', {debug_mode: true});`)).toBeNull()
    expect(ga4Snippet(`${base} gtag('config', 'G-ABC123'); fetch('https://x.example');`)).toBeNull()
    expect(ga4Snippet(`${base} gtag('config', 'AW-123456');`)).toBeNull()
    expect(ga4Snippet(`${base}`)).toBeNull()
    expect(ga4Snippet("alert(1)")).toBeNull()
  })
})

describe('mountPastedHtml', () => {
  it('runs Google’s snippet: its script recreated as written, then js and config through the global gtag', () => {
    const box = document.createElement('div')
    document.body.appendChild(box)
    const report = mountPastedHtml(box, GOOGLE)
    const scripts = [...box.querySelectorAll('script')]
    expect(scripts.map((s) => [s.getAttribute('src'), s.hasAttribute('async')])).toEqual([['https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ', true]])
    expect(typeof gw.gtag).toBe('function')
    const entries = (gw.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>))
    expect(entries.map((e) => e[0])).toEqual(['js', 'config'])
    expect(entries[0][1]).toBeInstanceOf(Date)
    expect(entries[1]).toEqual(['config', 'G-ABC123XYZ'])
    for (const e of gw.dataLayer ?? []) expect(Object.prototype.toString.call(e)).toBe('[object Arguments]')
    expect(report).toEqual({ran: ['https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ', 'gtag'], skipped: []})
  })

  it('runs a Fillout and an Elfsight embed as pasted, markup and all', () => {
    const box = document.createElement('div')
    const report = mountPastedHtml(box, `<div style="width:100%;height:500px;" data-fillout-id="abc123" data-fillout-embed-type="standard" data-fillout-inherit-parameters data-fillout-dynamic-resize></div><script src="https://server.fillout.com/embed/v1/"></script>
<script src="https://elfsightcdn.com/platform.js" async></script><div class="elfsight-app-0000-1111" data-elfsight-app-lazy></div>`)
    expect(box.querySelector('[data-fillout-id="abc123"]')).not.toBeNull()
    expect(box.querySelector('.elfsight-app-0000-1111')).not.toBeNull()
    expect([...box.querySelectorAll('script')].map((s) => s.getAttribute('src'))).toEqual(['https://server.fillout.com/embed/v1/', 'https://elfsightcdn.com/platform.js'])
    expect(report.skipped).toEqual([])
  })

  it('leaves out an unlisted host, plain http, and any other inline code, even nested, and names each', () => {
    const box = document.createElement('div')
    const report = mountPastedHtml(box, `<p>Reviews</p><script src="https://widgets.unlisted.example/w.js"></script>
<div><script>hbspt.forms.create({portalId: "1"})</script></div><script src="http://server.fillout.com/embed/v1/"></script>`)
    expect(box.querySelectorAll('script').length).toBe(0)
    expect(box.querySelector('p')?.textContent).toBe('Reviews')
    expect(report).toEqual({ran: [], skipped: ['https://widgets.unlisted.example/w.js', 'inline', 'http://server.fillout.com/embed/v1/']})
  })

  it('takes off what the policy would refuse when used: handlers, javascript: links, a form posting elsewhere', () => {
    const box = document.createElement('div')
    const report = mountPastedHtml(box, `<img src="/a.png" onerror="alert(1)" onload="x()"><a href=" javascript:alert(1)">x</a>
<form action="https://list.example/subscribe" method="post"><input name="e"></form><form action="/contact"></form><form></form>`)
    expect(box.querySelector('img')?.getAttributeNames().filter((n) => n.startsWith('on'))).toEqual([])
    expect(box.querySelector('a')?.hasAttribute('href')).toBe(false)
    const forms = [...box.querySelectorAll('form')]
    expect(forms.map((f) => f.getAttribute('action'))).toEqual([null, '/contact', null])
    expect(forms[0].getAttribute('data-embed-blocked')).toBe('form:list.example')
    expect(report.skipped).toEqual(['handler', 'javascript-url', 'form:list.example'])
  })

  it('keeps a data block as written, and runs the site’s own scripts', () => {
    const box = document.createElement('div')
    const report = mountPastedHtml(box, '<script type="application/ld+json">{"@type":"Review"}</script><script src="/__consent-probe.js"></script>')
    expect(box.querySelector('script[type="application/ld+json"]')?.textContent).toBe('{"@type":"Review"}')
    expect(box.querySelector('script[src="/__consent-probe.js"]')).not.toBeNull()
    expect(report).toEqual({ran: ['/__consent-probe.js'], skipped: []})
  })
})

describe('scriptAllowed reads hosts as CSP does', () => {
  const page = 'https://www.firm.example'
  it.each([
    ['/_next/static/chunks/a.js', true],
    ['https://www.firm.example/x.js', true],
    ['https://www.googletagmanager.com/gtag/js?id=G-1', true],
    ['https://region1.googletagmanager.com/x.js', false],
    ['https://googletagmanager.com/x.js', false],
    ['https://www.googletagmanager.com:8443/x.js', false],
    ['https://elfsightcdn.com/platform.js', true],
    ['https://universe-static.elfsightcdn.com/x.js', true],
    ['https://apps.elfsightcdn.com/x.js', false],
    ['https://connect.facebook.net.evil.example/x.js', false],
    ['http://connect.facebook.net/en_US/fbevents.js', false],
    ['//connect.facebook.net/en_US/fbevents.js', true],
    ['javascript:alert(1)', false],
  ])('%s → %s', (src, allowed) => {
    expect(scriptAllowed(src, page)).toBe(allowed)
  })

  it('every listed host says why it is there', () => {
    for (const h of SCRIPT_HOSTS) expect(h.why.length).toBeGreaterThan(5)
  })
})
