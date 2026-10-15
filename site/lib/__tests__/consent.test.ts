import {describe, it, expect} from 'vitest'
import {
  CONSENT_KEEP_SECONDS,
  CONSENT_OFF_SCRIPT,
  bootConsent,
  bootScript,
  cookieDomains,
  measurementIds,
  CONSENT_STORAGE_KEY,
  DEFAULT_BANNER_TEXT,
  analyticsCookieNames,
  consentCommands,
  parseChoice,
  resolveChoice,
  serializeChoice,
} from '@/lib/consent'

// The banner's rules as pure functions (monorepo LEGAL rules, WS-CONSENT-AND-LEGAL-PAGES-DESIGN-2026-10-15 §4.1).

const NOW = 1_800_000_000

describe('the stored choice', () => {
  it('lives under one browser-storage key, never a cookie the site sets', () => {
    expect(CONSENT_STORAGE_KEY).toBe('lp-consent')
  })

  it('round-trips an accept and a decline', () => {
    expect(parseChoice(serializeChoice('granted', NOW), NOW)).toBe('granted')
    expect(parseChoice(serializeChoice('denied', NOW), NOW)).toBe('denied')
  })

  it('is kept about six months, then asked again', () => {
    expect(CONSENT_KEEP_SECONDS).toBe(183 * 24 * 60 * 60)
    const stored = serializeChoice('denied', NOW)
    expect(parseChoice(stored, NOW + CONSENT_KEEP_SECONDS - 1)).toBe('denied')
    expect(parseChoice(stored, NOW + CONSENT_KEEP_SECONDS)).toBeNull()
  })

  it('reads anything it did not write as no choice', () => {
    for (const raw of [null, '', 'granted', '{}', 'not json', '{"v":2,"choice":"granted","at":1800000000}',
      '{"v":1,"choice":"maybe","at":1800000000}', '{"v":1,"choice":"granted"}', '[1]']) {
      expect(parseChoice(raw, NOW)).toBeNull()
    }
  })

  it('reads a choice dated in the future as no choice (a clock moved back is not consent)', () => {
    expect(parseChoice(serializeChoice('granted', NOW + 3600), NOW)).toBeNull()
  })
})

describe('Global Privacy Control', () => {
  it('answers a decline when nothing is stored', () => {
    expect(resolveChoice(null, true)).toBe('denied')
    expect(resolveChoice(null, false)).toBeNull()
  })

  it('never overrides a choice the visitor made in the banner', () => {
    expect(resolveChoice('granted', true)).toBe('granted')
    expect(resolveChoice('denied', false)).toBe('denied')
  })
})

describe('Consent Mode (Google basic mode)', () => {
  it('sets every key denied first, so nothing runs on an assumed yes', () => {
    const [first] = consentCommands('denied')
    expect(first).toEqual(['consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
    }])
    expect(consentCommands('denied')).toHaveLength(1)
  })

  it('grants analytics only on accept, and never an advertising key', () => {
    const commands = consentCommands('granted')
    expect(commands).toHaveLength(2)
    expect(commands[1]).toEqual(['consent', 'update', {analytics_storage: 'granted'}])
    for (const [, , keys] of commands.slice(1)) {
      for (const k of ['ad_storage', 'ad_user_data', 'ad_personalization']) expect(keys).not.toHaveProperty(k)
    }
  })
})

describe('withdrawing', () => {
  it('finds Google Analytics cookies by name and nothing else', () => {
    const jar = '_ga=GA1.1.1; _ga_ABC123XYZ=GS1.1; other=1; _gid=GA1; _gat_UA-1=1; lp-preview=x; _gac_x=1'
    expect(analyticsCookieNames(jar).sort()).toEqual(['_ga', '_ga_ABC123XYZ', '_gac_x', '_gat_UA-1', '_gid'])
    expect(analyticsCookieNames('')).toEqual([])
  })
})

describe('the banner text', () => {
  it('has a default that says what is asked and that it stays off until accepted', () => {
    expect(DEFAULT_BANNER_TEXT.toLowerCase()).toContain('analytics')
    expect(DEFAULT_BANNER_TEXT.toLowerCase()).toContain('cookies')
    expect(DEFAULT_BANNER_TEXT.toLowerCase()).toContain('accept')
  })
})


// The decision made before paint is the same rule as the one stated above, on one table of inputs.
describe('bootConsent, the before-paint decision', () => {
  const run = (raw: string | null, gpc: boolean) => {
    localStorage.clear()
    if (raw !== null) localStorage.setItem(CONSENT_STORAGE_KEY, raw)
    Object.defineProperty(navigator, 'globalPrivacyControl', {configurable: true, value: gpc})
    return bootConsent(document, window, CONSENT_STORAGE_KEY, 1, CONSENT_KEEP_SECONDS)
  }
  const now = () => Math.floor(Date.now() / 1000)

  it('agrees with parseChoice and resolveChoice on every case, and sets html[data-consent]', () => {
    const table: Array<string | null> = [null, '', 'x', '{}', serializeChoice('granted', now()), serializeChoice('denied', now()),
      serializeChoice('granted', now() - CONSENT_KEEP_SECONDS), serializeChoice('denied', now() + 3600),
      '{"v":2,"choice":"granted","at":1}']
    for (const raw of table) {
      for (const gpc of [false, true]) {
        const expected = resolveChoice(parseChoice(raw, now()), gpc) ?? 'ask'
        expect(run(raw, gpc)).toBe(expected)
        expect(document.documentElement.getAttribute('data-consent')).toBe(expected)
      }
    }
  })

  it("is off on the operator's preview, which marks the page itself after the root layout's script", () => {
    run(serializeChoice('granted', now()), false)
    new Function(CONSENT_OFF_SCRIPT)()
    expect(document.documentElement.getAttribute('data-consent')).toBe('off')
  })

  it('serializes into a script that runs on its own', () => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    document.documentElement.removeAttribute('data-consent')
    new Function(bootScript())()
    expect(document.documentElement.getAttribute('data-consent')).toBe('ask')
  })
})

describe('the pasted snippet and the cookies it leaves', () => {
  it('reads the GA4 ids', () => {
    expect(measurementIds('<script>gtag("config","G-ABC1234");gtag("config","G-ABC1234")</script>')).toEqual(['G-ABC1234'])
    expect(measurementIds(null)).toEqual([])
  })

  it('names the host and every parent domain', () => {
    expect(cookieDomains('www.firm.example')).toEqual(['', 'www.firm.example', 'firm.example'])
    expect(cookieDomains('localhost')).toEqual([''])
  })
})
