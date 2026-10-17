import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {CONSENT_BOOT_JS, INLINE_SCRIPTS, PREVIEW_OFF_JS, RELAY_JS} from '../inlineScripts'
import {startRelay, type RelayWindow} from '../relay'
import {
  CONSENT_KEEP_SECONDS,
  CONSENT_STORAGE_KEY,
  bootConsent,
  cleanThankYou,
  serializeChoices,
} from '../consent'

// The fixed inline scripts the Content Security Policy names by hash (monorepo [R-785], WS-CSP-DESIGN-2026-10-16 §3).
// The relay is exercised the way the browser drives it, on an inert document (one with no window, so nothing in it
// ever runs and only the relay acts): script elements are inserted, and their text grown, as the parser would, the
// observer's microtasks are let run, and what reached `self.__next_f` is read. Whether a real browser runs the relay
// before it prepares each script is `scripts/ci/csp-served.mjs`'s question, on a served build in Chromium.

type NextF = unknown[] & {push: (...a: unknown[]) => number}
const tick = () => new Promise((r) => setTimeout(r, 0))

let doc: Document
let w: {__next_f?: NextF; __nfRelay?: number}

/** An inert page still being parsed, as the relay meets it. */
function loadingPage(): Document {
  const d = document.implementation.createHTMLDocument('page')
  Object.defineProperty(d, 'readyState', {configurable: true, value: 'loading'})
  return d
}

// The two copies of the relay: the layout's inline text, and lib/relay.ts, which Next's client bundle runs.
const RELAYS: Array<[string, (d: Document, g: typeof w) => void]> = [
  // The relay's own text ends `})(document,self)`: here those two names are the inert page and its stand-in global.
  ['the inline relay', (d, g) => new Function('document', 'self', RELAY_JS)(d, g)],
  ['lib/relay.ts', (d, g) => void startRelay(d, g as RelayWindow, false)],
]

/** Inserts an inline script as the parser would, with no `type`, and returns it. */
function parsed(text: string, attrs: Record<string, string> = {}): HTMLScriptElement {
  const s = doc.createElement('script')
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v)
  if (text) s.appendChild(doc.createTextNode(text))
  doc.body.appendChild(s)
  return s
}

const domContentLoaded = () => doc.dispatchEvent(new Event('DOMContentLoaded'))

describe.each(RELAYS)('%s: Next’s inline page data, handed over as data', (_name, start) => {
  beforeEach(() => {
    doc = loadingPage()
    w = {}
    start(doc, w)
  })
  afterEach(() => domContentLoaded())

  it('takes both of Next’s shapes, in document order, so none can run', async () => {
    const a = parsed('(self.__next_f=self.__next_f||[]).push([0])')
    const b = parsed('self.__next_f.push([1,"0:{\\"P\\":null}\\n"])')
    const c = parsed('self.__next_f.push([3,"AAEC"])')
    await tick()
    for (const s of [a, b, c]) expect(s.type).toBe('text/x-next-f')
    expect([...(w.__next_f ?? [])]).toEqual([[0], [1, '0:{"P":null}\n'], [3, 'AAEC']])
  })

  it('touches no other script: the consent script, JSON-LD, a src script, a look-alike', async () => {
    const others = [
      parsed(CONSENT_BOOT_JS, {'data-purposes': '["analytics"]'}),
      parsed('{"@context":"https://schema.org"}', {type: 'application/ld+json'}),
      parsed('', {src: '/_next/static/chunks/main.js', async: ''}),
      parsed('self.__next_fx.push([1,"a"])'),
      parsed('window.self.__next_f.push([1,"a"])'),
    ]
    await tick()
    domContentLoaded()
    expect(others.map((s) => s.getAttribute('type'))).toEqual([null, 'application/ld+json', null, null, null])
    expect(w.__next_f ?? []).toEqual([])
  })

  it('waits for a script whose text is still arriving, and keeps the order behind it', async () => {
    const first = parsed('self.__next_f.pu')
    await tick()
    expect(first.type).toBe('')
    ;(first.firstChild as Text).appendData('sh([1,"ab')
    await tick()
    expect(first.type).toBe('text/x-next-f')
    const second = parsed('self.__next_f.push([1,"cd"])')
    await tick()
    expect(second.type).toBe('text/x-next-f')
    expect(w.__next_f ?? []).toEqual([])
    ;(first.firstChild as Text).appendData('"])')
    await tick()
    expect([...(w.__next_f ?? [])]).toEqual([[1, 'ab'], [1, 'cd']])
  })

  it('sends each value once, whatever the observer sees twice', async () => {
    const s = parsed('self.__next_f.push([1,"once"])')
    await tick()
    doc.body.appendChild(s)
    await tick()
    domContentLoaded()
    expect([...(w.__next_f ?? [])]).toEqual([[1, 'once']])
  })

  it('marks a script whose text never parses, and still sends the ones after it', async () => {
    const bad = parsed('self.__next_f.push([1,"unterminated)')
    parsed('self.__next_f.push([1,"after"])')
    await tick()
    domContentLoaded()
    expect(bad.getAttribute('data-relay')).toBe('failed')
    expect([...(w.__next_f ?? [])]).toEqual([[1, 'after']])
  })

  it('stops at DOMContentLoaded: a data-shaped script added later is never relayed', async () => {
    domContentLoaded()
    const late = parsed('self.__next_f.push([1,"injected"])')
    await tick()
    expect(late.type).toBe('')
    expect(w.__next_f ?? []).toEqual([])
  })

  it('pushes through Next’s own reader once Next has replaced push', async () => {
    const seen: unknown[] = []
    w.__next_f = [] as unknown as NextF
    w.__next_f.push = (v: unknown) => seen.push(v)
    parsed('self.__next_f.push([1,"x"])')
    await tick()
    expect(seen).toEqual([[1, 'x']])
  })
})

describe('the second copy, for Next’s bare 404 document', () => {
  it('hands over the data scripts the policy already refused, in order, then the rest', async () => {
    doc = loadingPage()
    w = {}
    const refused = [parsed('(self.__next_f=self.__next_f||[]).push([0])'), parsed('self.__next_f.push([1,"a"])')]
    expect(startRelay(doc, w as RelayWindow, true)).toBe(true)
    parsed('self.__next_f.push([1,"b"])')
    await tick()
    domContentLoaded()
    expect(refused.map((s) => s.type)).toEqual(['text/x-next-f', 'text/x-next-f'])
    expect([...(w.__next_f ?? [])]).toEqual([[0], [1, 'a'], [1, 'b']])
  })

  it('on a page already parsed, hands everything over at once', () => {
    doc = document.implementation.createHTMLDocument('page')
    Object.defineProperty(doc, 'readyState', {configurable: true, value: 'complete'})
    w = {}
    parsed('(self.__next_f=self.__next_f||[]).push([0])')
    parsed('self.__next_f.push([1,"a"])')
    startRelay(doc, w as RelayWindow, true)
    expect([...(w.__next_f ?? [])]).toEqual([[0], [1, 'a']])
  })

  it('leaves a page alone whose data scripts ran (no policy refused them), or that the inline relay took', () => {
    doc = document.implementation.createHTMLDocument('page')
    parsed('self.__next_f.push([1,"ran"])')
    w = {__next_f: [[1, 'ran']] as unknown as NextF}
    expect(startRelay(doc, w as RelayWindow, true)).toBe(false)
    expect([...(w.__next_f ?? [])]).toEqual([[1, 'ran']])
    w = {}
    new Function('document', 'self', RELAY_JS)(loadingPage(), w)
    expect(w.__nfRelay).toBe(1)
    expect(startRelay(doc, w as RelayWindow, true)).toBe(false)
  })

  it('takes a page where something set an empty self.__next_f before Next’s first script could run', () => {
    doc = document.implementation.createHTMLDocument('page')
    Object.defineProperty(doc, 'readyState', {configurable: true, value: 'complete'})
    parsed('self.__next_f.push([1,"refused"])')
    w = {__next_f: [] as unknown as NextF}
    expect(startRelay(doc, w as RelayWindow, true)).toBe(true)
    expect([...(w.__next_f ?? [])]).toEqual([[1, 'refused']])
  })

  it('the inline relay stands down when the second copy ran first', async () => {
    doc = loadingPage()
    w = {}
    startRelay(doc, w as RelayWindow, false)
    new Function('document', 'self', RELAY_JS)(doc, w)
    parsed('self.__next_f.push([1,"once"])')
    await tick()
    domContentLoaded()
    expect([...(w.__next_f ?? [])]).toEqual([[1, 'once']])
  })
})

describe('the fixed scripts are safe as raw text in a <script> and in a header', () => {
  it.each(Object.entries(INLINE_SCRIPTS))('%s holds nothing that ends or comments out a script', (_name, js) => {
    expect(js.toLowerCase()).not.toContain('</script')
    expect(js).not.toContain('<!--')
    expect(js).not.toMatch(/[^\x20-\x7e]/)
    expect(() => new Function(js)).not.toThrow()
  })
})

describe('the consent script is bootConsent, as fixed text', () => {
  function runInline(js: string, attrs: Record<string, string>) {
    const el = document.createElement('script')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    Object.defineProperty(document, 'currentScript', {configurable: true, get: () => el})
    try {
      new Function(js)()
    } finally {
      delete (document as unknown as Record<string, unknown>).currentScript
    }
  }

  it('decides as bootConsent does on every stored value, signal and set of purposes', () => {
    const now = Math.floor(Date.now() / 1000)
    const v1 = (choice: string, at: number) => JSON.stringify({v: 1, choice, at})
    const table: Array<string | null> = [null, '', 'x', '{}', '[]', v1('granted', now), v1('denied', now), v1('maybe', now),
      serializeChoices({analytics: 'granted', ads: 'denied'}, now), serializeChoices({ads: 'granted'}, now),
      serializeChoices({analytics: 'granted', ads: 'granted'}, now - CONSENT_KEEP_SECONDS),
      serializeChoices({analytics: 'denied'}, now + 3600), '{"v":3,"analytics":"granted","at":1}',
      serializeChoices({analytics: 'granted', ads: 'granted'}, now), serializeChoices({ads: 'granted', gpc: true}, now)]
    let cases = 0
    for (const raw of table) {
      for (const where of ['storage', 'cookie'] as const) {
        for (const gpc of [false, true]) {
          for (const purposes of [['analytics'], ['analytics', 'ads'], ['ads']]) {
            const arrange = () => {
              localStorage.clear()
              document.cookie = `${CONSENT_STORAGE_KEY}=; Max-Age=0; path=/`
              if (raw !== null && where === 'storage') localStorage.setItem(CONSENT_STORAGE_KEY, raw)
              if (raw !== null && where === 'cookie') document.cookie = `${CONSENT_STORAGE_KEY}=${encodeURIComponent(raw)}; path=/`
              Object.defineProperty(navigator, 'globalPrivacyControl', {configurable: true, value: gpc})
              document.documentElement.removeAttribute('data-consent')
            }
            arrange()
            const expected = bootConsent(document, window, CONSENT_STORAGE_KEY, CONSENT_KEEP_SECONDS, purposes)
            arrange()
            runInline(CONSENT_BOOT_JS, {'data-purposes': JSON.stringify(purposes)})
            expect(document.documentElement.getAttribute('data-consent')).toBe(expected)
            cases++
          }
        }
      }
    }
    expect(cases).toBe(table.length * 12)
    document.cookie = `${CONSENT_STORAGE_KEY}=; Max-Age=0; path=/`
    localStorage.clear()
  })

  it('cleans the thank-you address as cleanThankYou does, and nothing else', () => {
    for (const url of ['/thank-you?name=Pat#top', '/thank-you', '/thank-you#x', '/practice?x=1', '/thank-you/?q=1']) {
      window.history.replaceState({kept: 1}, '', url)
      cleanThankYou(window, '/thank-you')
      const expected = window.location.pathname + window.location.search + window.location.hash
      window.history.replaceState({kept: 1}, '', url)
      runInline(CONSENT_BOOT_JS, {'data-purposes': '["analytics"]'})
      expect(window.location.pathname + window.location.search + window.location.hash).toBe(expected)
      expect(window.history.state).toEqual({kept: 1})
    }
    window.history.replaceState(null, '', '/')
  })

  it('reads no purposes from a missing or broken attribute, and still runs', () => {
    document.documentElement.removeAttribute('data-consent')
    runInline(CONSENT_BOOT_JS, {'data-purposes': 'not json'})
    expect(document.documentElement.getAttribute('data-consent')).toBe('denied')
    expect(PREVIEW_OFF_JS).toContain('data-ga-off')
  })
})
