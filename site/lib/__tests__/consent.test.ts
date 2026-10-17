import {afterEach, describe, it, expect} from 'vitest'
import {
  CONSENT_KEEP_SECONDS,
  CONSENT_STORAGE_KEY,
  DEFAULT_BANNER_TEXT,
  analyticsCookieNames,
  bootConsent,
  choiceCookieHeader,
  consentCommands,
  consentState,
  cookieDomains,
  measurementIds,
  parseChoices,
  readStoredRaw,
  resolveChoices,
  serializeChoices,
} from '@/lib/consent'
import {CONSENT_BOOT_JS, PREVIEW_OFF_JS} from '@/lib/inlineScripts'

// The banner's rules as functions (monorepo LEGAL rules; WS-CONSENT-AND-LEGAL-PAGES-DESIGN-2026-10-15 §4.1, and the
// second purpose, advertising, WS-AD-PIXELS-DESIGN-2026-10-15 §2.2; Justin 2026-10-15: "build a place for standard
// pixels and connect to this functionality").

const NOW = 1_800_000_000

/** Runs one of the layout's fixed inline scripts (lib/inlineScripts.ts) as the page would: its own element, with its
 *  attributes, is `document.currentScript`. */
function runInline(js: string, attrs: Record<string, string> = {}) {
  const el = document.createElement('script')
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  Object.defineProperty(document, 'currentScript', {configurable: true, get: () => el})
  try {
    new Function(js)()
  } finally {
    delete (document as unknown as Record<string, unknown>).currentScript
  }
}
const runBoot = (purposes: string[]) => runInline(CONSENT_BOOT_JS, {'data-purposes': JSON.stringify(purposes)})
const v1 = (choice: string, at: number) => JSON.stringify({v: 1, choice, at})

describe('the stored choices', () => {
  it('live under one browser-storage key, never a cookie the site sets', () => {
    expect(CONSENT_STORAGE_KEY).toBe('lp-consent')
  })

  it('round-trip each purpose on its own', () => {
    const raw = serializeChoices({analytics: 'granted', ads: 'denied'}, NOW)
    expect(JSON.parse(raw)).toEqual({v: 2, analytics: 'granted', ads: 'denied', at: NOW})
    expect(parseChoices(raw, NOW)).toEqual({analytics: 'granted', ads: 'denied'})
    expect(parseChoices(serializeChoices({analytics: 'denied'}, NOW), NOW)).toEqual({analytics: 'denied'})
  })

  it('read a version 1 entry (from before advertising) as an analytics choice alone', () => {
    expect(parseChoices(v1('granted', NOW), NOW)).toEqual({analytics: 'granted'})
    expect(parseChoices(v1('maybe', NOW), NOW)).toBeNull()
  })

  it('are kept twelve months, then asked again (monorepo [R-751])', () => {
    expect(CONSENT_KEEP_SECONDS).toBe(365 * 24 * 60 * 60)
    const raw = serializeChoices({analytics: 'denied', ads: 'granted'}, NOW)
    expect(parseChoices(raw, NOW + CONSENT_KEEP_SECONDS - 1)).toEqual({analytics: 'denied', ads: 'granted'})
    expect(parseChoices(raw, NOW + CONSENT_KEEP_SECONDS)).toBeNull()
  })

  it('read anything they did not write, or dated ahead of now, as no choice', () => {
    for (const raw of [null, '', 'granted', '{}', 'not json', '[1]', '{"v":2,"at":1800000000}',
      '{"v":2,"ads":"maybe","at":1800000000}', '{"v":3,"analytics":"granted","at":1800000000}',
      '{"v":2,"analytics":"granted"}', serializeChoices({analytics: 'granted'}, NOW + 3600)]) {
      expect(parseChoices(raw, NOW)).toBeNull()
    }
  })
})

describe('what the page acts on', () => {
  it('asks while any purpose the site has is unchosen', () => {
    expect(resolveChoices(null, false, ['analytics'])).toEqual({ask: true})
    expect(resolveChoices({analytics: 'granted'}, false, ['analytics', 'ads'])).toEqual({ask: true, analytics: 'granted'})
    expect(resolveChoices({analytics: 'granted', ads: 'denied'}, false, ['analytics', 'ads']))
      .toEqual({ask: false, analytics: 'granted', ads: 'denied'})
  })

  it('ignores a stored purpose the site no longer has', () => {
    expect(resolveChoices({analytics: 'denied', ads: 'granted'}, false, ['analytics'])).toEqual({ask: false, analytics: 'denied'})
  })

  it('lets Global Privacy Control decline every unchosen purpose, and never an analytics choice the visitor made', () => {
    expect(resolveChoices(null, true, ['analytics', 'ads'])).toEqual({ask: false, analytics: 'denied', ads: 'denied'})
    expect(resolveChoices({analytics: 'granted'}, true, ['analytics', 'ads'])).toEqual({ask: false, analytics: 'granted', ads: 'denied'})
  })

  it('names the state html[data-consent] carries', () => {
    expect(consentState({ask: true})).toBe('ask')
    expect(consentState({ask: false, analytics: 'granted', ads: 'granted'})).toBe('granted')
    expect(consentState({ask: false, analytics: 'denied'})).toBe('denied')
    expect(consentState({ask: false, analytics: 'granted', ads: 'denied'})).toBe('mixed')
  })
})

describe('Consent Mode (Google basic mode)', () => {
  const DENIED = {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied'}

  it('sets every key denied first, so nothing runs on an assumed yes', () => {
    expect(consentCommands({analytics: 'denied', ads: 'denied'})).toEqual([['consent', 'default', DENIED]])
  })

  it('grants analytics alone for analytics, and the three ad keys only for advertising', () => {
    expect(consentCommands({analytics: 'granted'})[1]).toEqual(['consent', 'update', {analytics_storage: 'granted'}])
    expect(consentCommands({analytics: 'denied', ads: 'granted'})[1])
      .toEqual(['consent', 'update', {ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted'}])
    expect(consentCommands({analytics: 'granted', ads: 'granted'})[1][2]).toEqual(
      {analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted'})
  })
})

describe('bootConsent, the before-paint decision', () => {
  const run = (raw: string | null, gpc: boolean, purposes: string[]) => {
    localStorage.clear()
    if (raw !== null) localStorage.setItem(CONSENT_STORAGE_KEY, raw)
    Object.defineProperty(navigator, 'globalPrivacyControl', {configurable: true, value: gpc})
    return bootConsent(document, window, CONSENT_STORAGE_KEY, CONSENT_KEEP_SECONDS, purposes)
  }

  it('agrees with parseChoices, resolveChoices and consentState on every case, and sets html[data-consent]', () => {
    const now = Math.floor(Date.now() / 1000)
    const table: Array<string | null> = [null, '', 'x', '{}', v1('granted', now), v1('denied', now),
      serializeChoices({analytics: 'granted', ads: 'denied'}, now), serializeChoices({ads: 'granted'}, now),
      serializeChoices({analytics: 'granted', ads: 'granted'}, now - CONSENT_KEEP_SECONDS),
      serializeChoices({analytics: 'denied'}, now + 3600), '{"v":3,"analytics":"granted","at":1}',
      serializeChoices({analytics: 'granted', ads: 'granted'}, now), serializeChoices({ads: 'granted', gpc: true}, now)]
    for (const raw of table) {
      for (const gpc of [false, true]) {
        for (const purposes of [['analytics'], ['analytics', 'ads'], ['ads']]) {
          const expected = consentState(resolveChoices(parseChoices(raw, now), gpc, purposes))
          expect(run(raw, gpc, purposes)).toBe(expected)
          expect(document.documentElement.getAttribute('data-consent')).toBe(expected)
        }
      }
    }
  })

  it("is off on the operator's preview, which marks the page itself after the root layout's script", () => {
    run(serializeChoices({analytics: 'granted'}, Math.floor(Date.now() / 1000)), false, ['analytics'])
    runInline(PREVIEW_OFF_JS)
    expect(document.documentElement.getAttribute('data-consent')).toBe('off')
  })

  it('the inline script runs on its own, for the purposes on its element', () => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-consent')
    runBoot(['analytics', 'ads'])
    expect(document.documentElement.getAttribute('data-consent')).toBe('ask')
  })
})

describe('the pasted snippet and the cookies it leaves', () => {
  it('reads the GA4 ids', () => {
    expect(measurementIds('<script>gtag("config","G-ABC1234");gtag("config","G-ABC1234")</script>')).toEqual(['G-ABC1234'])
    expect(measurementIds(null)).toEqual([])
  })

  it('finds Google Analytics cookies by name and nothing else', () => {
    const jar = '_ga=GA1.1.1; _ga_ABC123XYZ=GS1.1; other=1; _gid=GA1; _gat_UA-1=1; lp-preview=x; _gac_x=1'
    expect(analyticsCookieNames(jar).sort()).toEqual(['_ga', '_ga_ABC123XYZ', '_gac_x', '_gat_UA-1', '_gid'])
    expect(analyticsCookieNames('')).toEqual([])
  })

  it('names the host and every parent domain', () => {
    expect(cookieDomains('www.firm.example')).toEqual(['', 'www.firm.example', 'firm.example'])
    expect(cookieDomains('localhost')).toEqual([''])
  })
})

describe('the banner text', () => {
  it('has a default that says what is asked and that it stays off until accepted', () => {
    expect(DEFAULT_BANNER_TEXT.toLowerCase()).toContain('analytics')
    expect(DEFAULT_BANNER_TEXT.toLowerCase()).toContain('cookies')
    expect(DEFAULT_BANNER_TEXT.toLowerCase()).toContain('accept')
  })
})

describe('Global Privacy Control after an advertising accept (11 CCR §7025(c)(3))', () => {
  it('overrides an accept made without it, for advertising only', () => {
    expect(resolveChoices({analytics: 'granted', ads: 'granted'}, true, ['analytics', 'ads']))
      .toEqual({ask: false, analytics: 'granted', ads: 'denied'})
  })

  it('leaves an accept made while the signal was on (the footer opt-in)', () => {
    const raw = serializeChoices({ads: 'granted', gpc: true}, NOW)
    expect(parseChoices(raw, NOW)).toEqual({ads: 'granted', gpc: true})
    expect(resolveChoices(parseChoices(raw, NOW), true, ['ads'])).toEqual({ask: false, ads: 'granted'})
  })
})

describe("the thank-you page's address", () => {
  it('loses its query string before paint, keeping the history entry and its fragment', () => {
    window.history.replaceState({kept: 1}, '', '/thank-you?name=Pat&email=pat%40mail.example#top')
    runBoot(['analytics'])
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/thank-you#top')
    expect(window.history.state).toEqual({kept: 1})
    window.history.replaceState(null, '', '/practice?x=1')
    runBoot(['analytics'])
    expect(window.location.search).toBe('?x=1')
  })
})

describe('the cookie the site’s server sets (monorepo [R-751])', () => {
  afterEach(() => {
    document.cookie = 'lp-consent=; Max-Age=0; path=/'
    localStorage.clear()
  })

  it('the before-paint script reads it when browser storage is empty, as Safari leaves it after seven days', () => {
    localStorage.clear()
    document.cookie = `lp-consent=${encodeURIComponent(serializeChoices({analytics: 'denied'}, Math.floor(Date.now() / 1000)))}; path=/`
    runBoot(['analytics'])
    expect(document.documentElement.getAttribute('data-consent')).toBe('denied')
    expect(readStoredRaw(document, window)).toContain('"analytics":"denied"')
  })

  it('the cookie lives as long as the choice, from a choice made now, a device clock up to two days off allowed', () => {
    const now = 2_000_000_000
    const day = 24 * 60 * 60
    expect(choiceCookieHeader(serializeChoices({ads: 'denied'}, now), now, true)).toContain(`Max-Age=${CONSENT_KEEP_SECONDS};`)
    expect(choiceCookieHeader(serializeChoices({ads: 'denied'}, now - day), now, true)).toContain(`Max-Age=${CONSENT_KEEP_SECONDS - day};`)
    expect(choiceCookieHeader(serializeChoices({ads: 'denied'}, now + day), now, true)).toContain(`Max-Age=${CONSENT_KEEP_SECONDS};`)
    expect(choiceCookieHeader(serializeChoices({ads: 'denied'}, now - 30 * day), now, true)).toBeNull()
    expect(choiceCookieHeader(serializeChoices({ads: 'denied'}, now + 3 * day), now, true)).toBeNull()
  })
})
