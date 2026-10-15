import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {render, screen, fireEvent, act} from '@testing-library/react'
// The app router's pathname, controllable: a page reached inside the app changes it without a load.
let pathname = '/'
vi.mock('next/navigation', () => ({usePathname: () => pathname}))

import {ConsentBanner} from '../ConsentBanner'
import {ConsentSettingsButton} from '../ConsentSettingsButton'
import {CONSENT_STORAGE_KEY, DEFAULT_BANNER_TEXT, DEFAULT_BANNER_TEXT_ADS, serializeChoices} from '@/lib/consent'
import {META_SCRIPT, GTAG_SCRIPT, UET_SCRIPT} from '@/lib/adPixels'

// The banner as a visitor meets it (monorepo LEGAL rules; WS-CONSENT-AND-LEGAL-PAGES-DESIGN-2026-10-15 §4.1, §8).
// jsdom never executes a script, so "loaded" is read as the pasted <script> element being in the document, and
// Consent Mode as what reached `window.dataLayer` before it. The layout's before-paint script does not run under
// render(), so each test also proves the banner decides for itself when it did not.

const PROBE = '/__consent-probe.js'
const SNIPPET = `<script async src="${PROBE}"></script><script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-FIXTURE1');</script>`

const probes = () => document.querySelectorAll(`script[src="${PROBE}"]`).length
const entries = () => window.dataLayer ?? []
const commands = () => entries().map((a) => Array.from(a as ArrayLike<unknown>))
const nowSeconds = () => Math.floor(Date.now() / 1000)
const consentAttr = () => document.documentElement.getAttribute('data-consent')

function setGpc(on: boolean) {
  Object.defineProperty(navigator, 'globalPrivacyControl', {configurable: true, value: on})
}

function banner(props: Partial<{text: string | null; privacyPolicyUrl: string | null}> = {}) {
  return <ConsentBanner scripts={SNIPPET} text={props.text ?? 'x'} privacyPolicyUrl={props.privacyPolicyUrl ?? null} />
}

// The site's own cookie route (app/api/consent): every choice is posted to it.
const sent = vi.fn(async () => new Response(null, {status: 204}))

beforeEach(() => {
  sent.mockClear()
  vi.stubGlobal('fetch', sent)
  localStorage.clear()
  delete window.dataLayer
  delete window.__lpConsentLoaded
  delete window.__lpConsentDefault
  for (const k of ['fbq', '_fbq', 'uetq', 'lintrk', '_linkedin_partner_id', '_linkedin_data_partner_ids', '__lpAdsLoaded']) delete (window as unknown as Record<string, unknown>)[k]
  document.head.querySelectorAll('script').forEach((s) => s.remove())
  window.history.replaceState(null, '', '/')
  pathname = '/'
  sessionStorage.clear()
  delete (window as unknown as Record<string, unknown>)['ga-disable-G-FIXTURE1']
  setGpc(false)
  document.documentElement.removeAttribute('data-consent')
  document.documentElement.style.removeProperty('--consent-banner-h')
})

afterEach(() => {
  document.querySelectorAll(`script[src="${PROBE}"]`).forEach((s) => s.remove())
  document.cookie = '_ga=; Max-Age=0; path=/'
  document.cookie = 'lp-consent=; Max-Age=0; path=/'
  vi.unstubAllGlobals()
})

describe('where the choice is kept (monorepo [R-751])', () => {
  it('posts every choice to the site’s own route, which answers with the cookie Safari keeps', () => {
    render(banner())
    fireEvent.click(screen.getByRole('button', {name: 'Accept'}))
    expect(sent).toHaveBeenCalledTimes(1)
    const [url, init] = sent.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/consent')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(localStorage.getItem(CONSENT_STORAGE_KEY))
  })

  it('a returning visitor whose browser storage Safari deleted is read from the cookie, and not asked again', () => {
    // Written here by the test; on the site only the server's Set-Cookie writes it.
    document.cookie = `lp-consent=${encodeURIComponent(serializeChoices({analytics: 'granted'}, nowSeconds()))}; path=/`
    render(banner())
    expect(screen.queryByRole('region')).toBeNull()
    expect(probes()).toBe(1)
  })

  it('the browser-storage entry wins over the cookie: it is the newer when both are there', () => {
    document.cookie = `lp-consent=${encodeURIComponent(serializeChoices({analytics: 'granted'}, nowSeconds()))}; path=/`
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'denied'}, nowSeconds()))
    render(banner())
    expect(screen.queryByRole('region')).toBeNull()
    expect(probes()).toBe(0)
  })
})

describe('with no consent script, nothing at all', () => {
  it('renders no banner, no status line and loads nothing', () => {
    const {container} = render(<ConsentBanner scripts={null} text={null} privacyPolicyUrl="/privacy-policy/" />)
    expect(container.innerHTML).toBe('')
  })

  it('treats a blank field as no script', () => {
    const {container} = render(<ConsentBanner scripts={'   '} text={null} privacyPolicyUrl={null} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('a first visit', () => {
  it('asks, and holds the pasted script back until the visitor accepts', () => {
    render(banner({text: 'Our own words.'}))
    const region = screen.getByRole('region', {name: 'Cookie choices'})
    expect(region.textContent).toContain('Our own words.')
    expect(consentAttr()).toBe('ask')
    expect(probes()).toBe(0)
    expect(entries()).toEqual([])
  })

  it('falls back to the default text when Cookie Banner Text is empty', () => {
    render(banner({text: ''}))
    expect(screen.getByRole('region', {name: 'Cookie choices'}).textContent).toContain(DEFAULT_BANNER_TEXT)
  })

  it('links the privacy policy when the site has one', () => {
    render(banner({privacyPolicyUrl: '/privacy-policy/'}))
    expect(screen.getByRole('link', {name: 'Privacy Policy'}).getAttribute('href')).toBe('/privacy-policy')
  })

  it('offers Accept and Decline as equals: same element, same classes', () => {
    render(banner())
    const accept = screen.getByRole('button', {name: 'Accept'})
    const decline = screen.getByRole('button', {name: 'Decline'})
    expect(accept.tagName).toBe(decline.tagName)
    expect(accept.className).toBe(decline.className)
  })

  it('never takes focus on load and traps nothing (a region, not a dialog)', () => {
    render(banner())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(document.body)
  })

  it('reserves its height for scrolling while open', () => {
    render(banner())
    expect(document.documentElement.style.getPropertyValue('--consent-banner-h')).not.toBe('')
  })
})

describe('accepting', () => {
  it('runs Consent Mode default-denied, then grants analytics, as arguments objects, then loads the script, and remembers', () => {
    render(banner())
    fireEvent.click(screen.getByRole('button', {name: 'Accept'}))
    expect(commands()).toEqual([
      ['consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied'}],
      ['consent', 'update', {analytics_storage: 'granted'}],
      ['set', {allow_google_signals: false, allow_ad_personalization_signals: false}],
    ])
    for (const e of entries()) expect(Object.prototype.toString.call(e)).toBe('[object Arguments]')
    expect(probes()).toBe(1)
    expect(screen.queryByRole('region')).toBeNull()
    expect(consentAttr()).toBe('granted')
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}').analytics).toBe('granted')
    expect(document.documentElement.style.getPropertyValue('--consent-banner-h')).toBe('')
  })

  it('says so in a status line, and moves focus to the main content when it was in the banner', () => {
    render(<>{banner()}<main id="main-content" tabIndex={-1} /></>)
    const accept = screen.getByRole('button', {name: 'Accept'})
    accept.focus()
    fireEvent.click(accept)
    expect(screen.getByRole('status').textContent).toContain('accepted')
    expect(document.activeElement?.id).toBe('main-content')
  })

  it('a returning visitor who accepted is not asked, and the script loads', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'granted'}, nowSeconds()))
    render(banner())
    expect(screen.queryByRole('region')).toBeNull()
    expect(probes()).toBe(1)
  })

  it('never mounts the script twice in one page view, however often the banner reopens', () => {
    render(<>{banner()}<ConsentSettingsButton /></>)
    fireEvent.click(screen.getByRole('button', {name: 'Accept'}))
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Cookie settings'})) })
    fireEvent.click(screen.getByRole('button', {name: 'Accept'}))
    expect(probes()).toBe(1)
  })
})

describe('declining', () => {
  it('loads nothing, sends Google nothing, and remembers', () => {
    render(banner())
    fireEvent.click(screen.getByRole('button', {name: 'Decline'}))
    expect(probes()).toBe(0)
    expect(entries()).toEqual([])
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('declined')
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}').analytics).toBe('denied')
  })

  it('a returning visitor who declined is not asked again, and old analytics cookies are cleared', () => {
    document.cookie = '_ga=GA1.1.1; path=/'
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'denied'}, nowSeconds()))
    render(banner())
    expect(screen.queryByRole('region')).toBeNull()
    expect(probes()).toBe(0)
    expect(document.cookie).not.toContain('_ga=')
  })

  it('after an accept, a decline neuters the loaded tag without a reload', () => {
    render(<>{banner()}<ConsentSettingsButton /></>)
    fireEvent.click(screen.getByRole('button', {name: 'Accept'}))
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Cookie settings'})) })
    fireEvent.click(screen.getByRole('button', {name: 'Decline'}))
    expect(commands().at(-1)).toEqual(['consent', 'update', {analytics_storage: 'denied'}])
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-FIXTURE1']).toBe(true)
  })

  it('a browser sending Global Privacy Control is a decline without a banner, and nothing is stored', () => {
    setGpc(true)
    render(banner())
    expect(screen.queryByRole('region')).toBeNull()
    expect(probes()).toBe(0)
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
  })
})

describe('changing the choice later', () => {
  it('the footer button reopens the banner and moves focus into it, then gives focus back', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'denied'}, nowSeconds()))
    render(<>{banner()}<ConsentSettingsButton className="underline" /></>)
    const opener = screen.getByRole('button', {name: 'Cookie settings'})
    opener.focus()
    act(() => { fireEvent.click(opener) })
    const region = screen.getByRole('region', {name: 'Cookie choices'})
    expect(region.contains(document.activeElement)).toBe(true)
    fireEvent.click(screen.getByRole('button', {name: 'Decline'}))
    expect(screen.queryByRole('region')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('a Global Privacy Control browser can still opt in from the footer', () => {
    setGpc(true)
    render(<>{banner()}<ConsentSettingsButton /></>)
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Cookie settings'})) })
    fireEvent.click(screen.getByRole('button', {name: 'Accept'}))
    expect(probes()).toBe(1)
  })
})

describe("the operator's preview", () => {
  it('never shows the banner or loads the script once the preview marks the page off, whatever is stored', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'granted'}, nowSeconds()))
    document.documentElement.setAttribute('data-consent', 'off')
    render(<>{banner()}<ConsentSettingsButton /></>)
    expect(consentAttr()).toBe('off')
    expect(screen.queryByRole('region')).toBeNull()
    expect(probes()).toBe(0)
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Cookie settings'})) })
    expect(screen.queryByRole('region')).toBeNull()
  })
})

// Advertising, the second purpose (monorepo WS-AD-PIXELS-DESIGN-2026-10-15 §2 and §6; Justin 2026-10-15: "build a
// place for standard pixels and connect to this functionality"). jsdom's host is localhost, so `site` names it to stand
// for the firm's own address.
const ADS = {metaPixelId: '123456789012345', googleAdsId: 'AW-1234567890', microsoftUetId: '12345678'}
const adBanner = (o: {scripts?: string | null; site?: string} = {}) =>
  <ConsentBanner scripts={o.scripts === undefined ? SNIPPET : o.scripts} text={null} privacyPolicyUrl={null} adIds={ADS}
    site={o.site ?? 'localhost'} />
const headScripts = () => [...document.head.querySelectorAll('script')].map((s) => s.getAttribute('src'))

describe('with an advertising ID set', () => {
  it('offers Accept all and Decline all as equals, and Choose', () => {
    render(adBanner())
    const accept = screen.getByRole('button', {name: 'Accept all'})
    const decline = screen.getByRole('button', {name: 'Decline all'})
    expect(accept.className).toBe(decline.className)
    expect(screen.getByRole('button', {name: 'Choose'}).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('region', {name: 'Cookie choices'}).textContent).toContain(DEFAULT_BANNER_TEXT_ADS)
  })

  it('loads no advertising tag before an accept', () => {
    render(adBanner())
    expect(headScripts()).toEqual([])
    expect(entries()).toEqual([])
  })

  it('Accept all loads analytics and every set tag behind Consent Mode, with Google signals off for analytics', () => {
    render(adBanner())
    fireEvent.click(screen.getByRole('button', {name: 'Accept all'}))
    expect(probes()).toBe(1)
    expect(headScripts()).toEqual([META_SCRIPT, `${GTAG_SCRIPT}?id=AW-1234567890`, UET_SCRIPT])
    expect(commands().slice(0, 4)).toEqual([
      ['consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied'}],
      ['consent', 'update', {analytics_storage: 'granted'}],
      ['set', {allow_google_signals: false, allow_ad_personalization_signals: false}],
      ['consent', 'update', {ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted'}],
    ])
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({v: 2, analytics: 'granted', ads: 'granted'})
  })

  it("loads no advertising tag anywhere but the firm's own address", () => {
    render(adBanner({site: 'www.firm.example'}))
    fireEvent.click(screen.getByRole('button', {name: 'Accept all'}))
    expect(probes()).toBe(1)
    expect(headScripts()).toEqual([])
  })

  it('loads no advertising tag on an address carrying something a visitor typed', () => {
    window.history.replaceState(null, '', '/blog?q=custody')
    render(adBanner())
    fireEvent.click(screen.getByRole('button', {name: 'Accept all'}))
    expect(headScripts()).toEqual([])
  })

  it('Choose opens two plain checkboxes, both off, focus staying on Choose; saving them as they are declines both', () => {
    render(adBanner())
    const chooseButton = screen.getByRole('button', {name: 'Choose'})
    chooseButton.focus()
    act(() => { fireEvent.click(chooseButton) })
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes.map((b) => b.checked)).toEqual([false, false])
    expect(boxes[0].getAttribute('aria-describedby')).toBe('lp-consent-analytics-about')
    expect(document.activeElement).toBe(chooseButton)
    expect(chooseButton.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByRole('button', {name: 'Save choices'}))
    expect(probes()).toBe(0)
    expect(headScripts()).toEqual([])
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({analytics: 'denied', ads: 'denied'})
  })

  it('Analytics only: the analytics script and no advertising tag', () => {
    render(adBanner())
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Choose'})) })
    fireEvent.click(screen.getByRole('checkbox', {name: 'Analytics'}))
    fireEvent.click(screen.getByRole('button', {name: 'Save choices'}))
    expect(probes()).toBe(1)
    expect(headScripts()).toEqual([])
  })

  it('Advertising only: the advertising tags and no analytics script', () => {
    render(adBanner())
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Choose'})) })
    fireEvent.click(screen.getByRole('checkbox', {name: 'Advertising'}))
    fireEvent.click(screen.getByRole('button', {name: 'Save choices'}))
    expect(probes()).toBe(0)
    expect(headScripts()).toEqual([META_SCRIPT, `${GTAG_SCRIPT}?id=AW-1234567890`, UET_SCRIPT])
  })

  it('asks again a visitor who chose before advertising existed', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'granted'}, nowSeconds()))
    render(adBanner())
    expect(screen.getByRole('region', {name: 'Cookie choices'})).toBeTruthy()
    expect(probes()).toBe(1)
  })

  it('Global Privacy Control declines both, unasked, and overrides an advertising accept made without it', () => {
    setGpc(true)
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'granted', ads: 'granted'}, nowSeconds()))
    render(adBanner())
    expect(screen.queryByRole('region')).toBeNull()
    expect(probes()).toBe(1)
    expect(headScripts()).toEqual([])
  })

  it('withdrawing advertising after its tags loaded switches them off, clears them, and reloads with the status carried', () => {
    render(<>{adBanner()}<ConsentSettingsButton /></>)
    fireEvent.click(screen.getByRole('button', {name: 'Accept all'}))
    document.cookie = '_fbp=fb.1.1; path=/'
    localStorage.setItem('_gcl_ls', 'x')
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Cookie settings'})) })
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Choose'})) })
    const ads = screen.getByRole('checkbox', {name: 'Advertising'}) as HTMLInputElement
    expect(ads.checked).toBe(true)
    fireEvent.click(ads)
    fireEvent.click(screen.getByRole('button', {name: 'Save choices'}))
    expect((window as unknown as {fbq: {queue: unknown[][]}}).fbq.queue.at(-1)).toEqual(['consent', 'revoke'])
    expect(document.cookie).not.toContain('_fbp=')
    expect(localStorage.getItem('_gcl_ls')).toBeNull()
    expect(sessionStorage.getItem('lp-consent-status')).toContain('Advertising cookies declined')
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({analytics: 'granted', ads: 'denied'})
  })

  it('says the carried status once after the reload', () => {
    sessionStorage.setItem('lp-consent-status', 'Advertising cookies declined.')
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'granted', ads: 'denied'}, nowSeconds()))
    render(adBanner())
    expect(screen.getByRole('status').textContent).toBe('Advertising cookies declined.')
    expect(sessionStorage.getItem('lp-consent-status')).toBeNull()
  })

  it('a page reached inside the app sends each tag its page view, and none for an address carrying something typed', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'granted', ads: 'granted'}, nowSeconds()))
    const {rerender} = render(adBanner())
    expect(headScripts()).toEqual([META_SCRIPT, `${GTAG_SCRIPT}?id=AW-1234567890`, UET_SCRIPT])
    const metaViews = () => (window as unknown as {fbq: {queue: unknown[][]}}).fbq.queue.filter((c) => c[1] === 'PageView').length
    expect(metaViews()).toBe(1)
    window.history.replaceState(null, '', '/attorneys')
    pathname = '/attorneys'
    rerender(adBanner())
    expect(metaViews()).toBe(2)
    expect(commands()).toContainEqual(['event', 'page_view', {send_to: 'AW-1234567890'}])
    window.history.replaceState(null, '', '/contact?name=Pat')
    pathname = '/contact'
    rerender(adBanner())
    expect(metaViews()).toBe(2)
  })

  it('a page view whose own address held something typed loads the tags on the first address they may see', () => {
    window.history.replaceState(null, '', '/blog?q=custody')
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices({analytics: 'granted', ads: 'granted'}, nowSeconds()))
    const {rerender} = render(adBanner())
    expect(headScripts()).toEqual([])
    window.history.replaceState(null, '', '/blog/fixture-post')
    pathname = '/blog/fixture-post'
    rerender(adBanner())
    expect(headScripts()).toEqual([META_SCRIPT, `${GTAG_SCRIPT}?id=AW-1234567890`, UET_SCRIPT])
  })

  it('with advertising alone (no analytics script), the banner asks about advertising only', () => {
    render(adBanner({scripts: null}))
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Choose'})) })
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })
})
