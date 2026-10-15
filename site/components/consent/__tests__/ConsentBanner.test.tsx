import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {render, screen, fireEvent, act} from '@testing-library/react'
import {ConsentBanner} from '../ConsentBanner'
import {ConsentSettingsButton} from '../ConsentSettingsButton'
import {CONSENT_STORAGE_KEY, DEFAULT_BANNER_TEXT, serializeChoice} from '@/lib/consent'

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

beforeEach(() => {
  localStorage.clear()
  delete window.dataLayer
  delete window.__lpConsentLoaded
  delete (window as unknown as Record<string, unknown>)['ga-disable-G-FIXTURE1']
  setGpc(false)
  document.documentElement.removeAttribute('data-consent')
  document.documentElement.style.removeProperty('--consent-banner-h')
})

afterEach(() => {
  document.querySelectorAll(`script[src="${PROBE}"]`).forEach((s) => s.remove())
  document.cookie = '_ga=; Max-Age=0; path=/'
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
    ])
    for (const e of entries()) expect(Object.prototype.toString.call(e)).toBe('[object Arguments]')
    expect(probes()).toBe(1)
    expect(screen.queryByRole('region')).toBeNull()
    expect(consentAttr()).toBe('granted')
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}').choice).toBe('granted')
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
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoice('granted', nowSeconds()))
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
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}').choice).toBe('denied')
  })

  it('a returning visitor who declined is not asked again, and old analytics cookies are cleared', () => {
    document.cookie = '_ga=GA1.1.1; path=/'
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoice('denied', nowSeconds()))
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
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoice('denied', nowSeconds()))
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
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoice('granted', nowSeconds()))
    document.documentElement.setAttribute('data-consent', 'off')
    render(<>{banner()}<ConsentSettingsButton /></>)
    expect(consentAttr()).toBe('off')
    expect(screen.queryByRole('region')).toBeNull()
    expect(probes()).toBe(0)
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Cookie settings'})) })
    expect(screen.queryByRole('region')).toBeNull()
  })
})
