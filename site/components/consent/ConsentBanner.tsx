'use client'

import {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react'
import {usePathname} from 'next/navigation'
import Link from 'next/link'
import {Button} from '@/components/ui/Button'
import {adSafeAddress, adVendors, isLiveHost, type AdIds} from '@/lib/adIds'
import {AD_STORAGE_KEYS, adCookieNames, adPageView, adPixelsLoaded, loadAdPixels, revokeAdPixels} from '@/lib/adPixels'
import {
  CONSENT_KEEP_SECONDS,
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  DEFAULT_BANNER_TEXT,
  DEFAULT_BANNER_TEXT_ADS,
  analyticsCookieNames,
  bootConsent,
  consentCommands,
  consentState,
  cookieDomains,
  measurementIds,
  parseChoices,
  resolveChoices,
  serializeChoices,
  type Choices,
  type ConsentState,
  type Purpose,
} from '@/lib/consent'

// The cookie banner (monorepo `BI/rules/legal-pages.md`; WS-CONSENT-AND-LEGAL-PAGES-DESIGN-2026-10-15 §4.1 and §8; the
// advertising purpose WS-AD-PIXELS-DESIGN-2026-10-15 §2.2). The rules are `lib/consent.ts`; this is the visitor's side.
//
// - In the server's HTML from the start, first in the body after the skip link, so a keyboard or a screen reader meets
//   it where it is. The layout's inline script (`bootScript`) decides before paint and sets `html[data-consent]`;
//   globals.css shows the banner only under `ask`, so there is no late paint and no layout shift. Without JavaScript it
//   never shows, which is right: nothing it holds back would load anyway.
// - Purposes: Analytics when Site Settings → Scripts — Require Consent holds a script; Advertising when Site Settings
//   holds an advertising ID. With analytics alone the banner is Accept and Decline. With advertising it is Accept all
//   and Decline all, as equals, and Choose, which opens a switch per purpose, both off. Each purpose is stored on its own.
// - Analytics: the pasted script mounts once per page view, after an accept, behind Consent Mode's default-denied
//   commands, with Google signals and ad personalization off. Advertising: each vendor's base tag (`lib/adPixels.ts`) on
//   every page, only on the firm's own address and only on an address carrying nothing but click IDs and campaign
//   tags; a page reached inside the app sends each tag's page view under the same rule. A decline expires the tags'
//   cookies and storage on every page while declined; withdrawing a purpose whose tags loaded in this page view reloads
//   the page, because a loaded tag cannot be unloaded, and a status line after the reload says the choice is saved.
// - A labelled region, not a dialog: it never takes focus on load and traps nothing. While open it publishes its
//   height as --consent-banner-h for scroll padding, body padding and Back to Top (WCAG 2.4.11, C43); on a viewport
//   under 30rem tall it sits in the page's flow (C34).

type Props = {
  /** Site Settings → Scripts — Require Consent. */
  scripts: string | null | undefined
  /** Site Settings → Cookie Banner Text. */
  text: string | null | undefined
  privacyPolicyUrl: string | null | undefined
  /** Site Settings' advertising IDs, already shape-checked (`lib/adIds.ts` `usableAdIds`). */
  adIds?: AdIds
  /** The firm's own host (`siteHost()`): advertising tags load nowhere else. */
  site?: string
}

type View = 'unknown' | ConsentState

declare global {
  interface Window {
    dataLayer?: unknown[]
    /** Set once the analytics script is mounted in this page view. */
    __lpConsentLoaded?: boolean
    /** Set once Consent Mode's default has been pushed in this page view. */
    __lpConsentDefault?: boolean
    /** The GA4 ids the analytics script configures, so Web Vitals reports reach Google Analytics alone. */
    __lpGaIds?: string[]
  }
}

const STATUS_KEY = 'lp-consent-status'

const nowSeconds = () => Math.floor(Date.now() / 1000)

// Google's own shim: gtag.js reads the arguments object, never an array.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: unknown[]) {
  window.dataLayer = window.dataLayer || []
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments)
}

// The page's consent state lives in one place, `html[data-consent]`, which the before-paint script sets first. The
// banner reads it as an external store: the server's snapshot is `unknown`, so hydration matches the HTML, and every
// change goes through `setConsentState`, which tells the readers.
const listeners = new Set<() => void>()
function setConsentState(state: ConsentState) {
  document.documentElement.setAttribute('data-consent', state)
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const readState = () => (document.documentElement.getAttribute('data-consent') ?? 'unknown') as View
const serverState = () => 'unknown' as View

/** Consent Mode: the default (every key denied) once per page view, then an update for what is granted. */
function grantGoogle(choices: Choices) {
  const [defaults, update] = consentCommands(choices)
  if (!window.__lpConsentDefault) {
    window.__lpConsentDefault = true
    gtag(...defaults)
  }
  if (update) gtag(...update)
}

function expire(names: string[]) {
  const domains = cookieDomains(window.location.hostname)
  for (const name of names) {
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=.${domain}` : ''}`
  }
}

function loadAnalytics(html: string, host: HTMLElement | null) {
  if (window.__lpConsentLoaded) return
  window.__lpConsentLoaded = true
  window.__lpGaIds = measurementIds(html)
  // Google Analytics never feeds advertising: no Google signals, no ad personalization (whatever the property says).
  gtag('set', {allow_google_signals: false, allow_ad_personalization_signals: false})
  ;(host ?? document.body).appendChild(document.createRange().createContextualFragment(html))
}

function declineAnalytics(html: string) {
  if (window.__lpConsentLoaded) gtag('consent', 'update', {analytics_storage: 'denied'})
  for (const id of measurementIds(html)) (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = true
  expire(analyticsCookieNames(document.cookie))
}

function declineAds() {
  revokeAdPixels(gtag)
  expire(adCookieNames(document.cookie))
  try {
    for (const key of AD_STORAGE_KEYS) window.localStorage.removeItem(key)
  } catch {
    // Storage refused: nothing of the tags' can be there either.
  }
}

function readStored(): Choices | null {
  try {
    return parseChoices(window.localStorage.getItem(CONSENT_STORAGE_KEY), nowSeconds())
  } catch {
    return null
  }
}

function store(choices: Choices) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoices(choices, nowSeconds()))
  } catch {
    // Storage refused (a private window, a full quota): the choice holds for this page view only.
  }
}

export function ConsentBanner({scripts, text, privacyPolicyUrl, adIds = {}, site = ''}: Props) {
  const html = scripts && scripts.trim() ? scripts : null
  const hasAds = adVendors(adIds).length > 0
  const purposes: Purpose[] = [...(html ? ['analytics' as const] : []), ...(hasAds ? ['ads' as const] : [])]
  const purposeKey = purposes.join(',')
  const view = useSyncExternalStore(subscribe, readState, serverState)
  const [status, setStatus] = useState('')
  const [choosing, setChoosing] = useState(false)
  const [picks, setPicks] = useState<Record<Purpose, boolean>>({analytics: false, ads: false})
  const opener = useRef<HTMLElement | null>(null)
  const focusOnOpen = useRef(false)
  const regionRef = useRef<HTMLElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Apply what the visitor's choices say: load what is granted, switch off and clear what is not.
  const apply = (choices: Choices) => {
    if (html && choices.analytics === 'granted') {
      grantGoogle({analytics: 'granted'})
      loadAnalytics(html, hostRef.current)
    } else if (html && choices.analytics === 'denied') declineAnalytics(html)
    if (hasAds && choices.ads === 'granted') {
      if (isLiveHost(window.location.hostname, site) && adSafeAddress(window.location.search)) {
        grantGoogle({ads: 'granted'})
        loadAdPixels(adIds, gtag)
      }
    } else if (hasAds && choices.ads === 'denied') declineAds()
  }

  // The decision the inline script made before paint (or this page's own, when it did not run).
  useEffect(() => {
    if (!purposes.length) return
    // The status a withdrawal's reload carried over, said once.
    try {
      const carried = window.sessionStorage.getItem(STATUS_KEY)
      if (carried) {
        window.sessionStorage.removeItem(STATUS_KEY)
        setStatus(carried)
      }
    } catch {
      // Session storage refused: the reload says nothing, and the choice is still saved.
    }
    const root = document.documentElement
    const decided = (root.getAttribute('data-consent') ||
      bootConsent(document, window, CONSENT_STORAGE_KEY, CONSENT_KEEP_SECONDS, purposes)) as ConsentState
    setConsentState(decided)
    if (decided === 'off') return
    const gpc = (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl === true
    apply(resolveChoices(readStored(), gpc, purposes))
    // The purposes are the dependency, by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purposeKey])

  // A page reached inside the app (a link, not a load): the page view each tag sends on a load, for an address a tag may
  // see; on the first such address of a page view whose own address held something typed, the tags load there.
  const firstPath = useRef(pathname)
  useEffect(() => {
    if (!hasAds || pathname === firstPath.current) return
    firstPath.current = pathname
    if (document.documentElement.getAttribute('data-consent') === 'off') return
    const gpc = (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl === true
    if (resolveChoices(readStored(), gpc, purposes).ads !== 'granted') return
    if (!isLiveHost(window.location.hostname, site) || !adSafeAddress(window.location.search)) return
    if (adPixelsLoaded()) adPageView(adIds, gtag)
    else apply({ads: 'granted'})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // The footer's Cookie settings button.
  useEffect(() => {
    if (!purposes.length) return
    const onOpen = (e: Event) => {
      if (document.documentElement.getAttribute('data-consent') === 'off') return
      const detail = (e as CustomEvent<{opener?: HTMLElement}>).detail
      opener.current = detail?.opener ?? (document.activeElement as HTMLElement | null)
      focusOnOpen.current = true
      setStatus('')
      setChoosing(false)
      setConsentState('ask')
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purposeKey])

  // Reserve the banner's height while it is open; move focus in when the visitor asked for it.
  useLayoutEffect(() => {
    if (!purposes.length || view !== 'ask') return
    const root = document.documentElement
    const el = regionRef.current
    if (!el) return
    const publish = () => root.style.setProperty('--consent-banner-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    publish()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    observer?.observe(el)
    if (focusOnOpen.current) {
      focusOnOpen.current = false
      el.focus({preventScroll: true})
    }
    return () => {
      observer?.disconnect()
      root.style.removeProperty('--consent-banner-h')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purposeKey, view])

  if (!purposes.length) return null

  const choose = (choices: Choices) => {
    const hadFocus = !!regionRef.current?.contains(document.activeElement)
    const gpc = (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl === true
    const merged: Choices = {...(readStored() ?? {}), ...choices, gpc}
    store(merged)
    const said = purposes.map((p) => `${p === 'ads' ? 'Advertising' : 'Analytics'} cookies ${merged[p] === 'granted' ? 'accepted' : 'declined'}`)
    const message = `${said.join('; ')}. Change this with Cookie settings at the bottom of the page.`
    // A purpose withdrawn after its tags loaded in this page view: switch them off, clear, and start the page again.
    const withdrawn = (choices.analytics === 'denied' && window.__lpConsentLoaded) || (choices.ads === 'denied' && adPixelsLoaded())
    apply(choices)
    if (withdrawn) {
      try {
        window.sessionStorage.setItem(STATUS_KEY, message)
      } catch {
        // Session storage refused: the reload says nothing.
      }
      window.location.reload()
      return
    }
    setConsentState(consentState(resolveChoices(merged, false, purposes)))
    setChoosing(false)
    setStatus(message)
    const back = opener.current
    opener.current = null
    if (back && back.isConnected) back.focus({preventScroll: true})
    else if (hadFocus) document.getElementById('main-content')?.focus({preventScroll: true})
  }
  const all = (c: 'granted' | 'denied') => Object.fromEntries(purposes.map((p) => [p, c])) as Choices
  const openChoose = () => {
    const stored = readStored() ?? {}
    setPicks({analytics: stored.analytics === 'granted', ads: stored.ads === 'granted'})
    setChoosing(true)
  }
  const fallback = hasAds ? DEFAULT_BANNER_TEXT_ADS : DEFAULT_BANNER_TEXT
  const shown = text && text.trim() && !(hasAds && text.trim() === DEFAULT_BANNER_TEXT) ? text : fallback
  const linkClass = 'underline transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus'

  return (
    <>
      <section
        ref={regionRef}
        id="lp-consent"
        aria-labelledby="lp-consent-heading"
        tabIndex={-1}
        data-consent-banner=""
        hidden={view !== 'unknown' && view !== 'ask'}
        className="fixed inset-x-0 bottom-0 z-40 max-h-[50vh] overflow-y-auto border-t border-border bg-background text-foreground shadow-elevation-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus [@media(max-height:30rem)]:static [@media(max-height:30rem)]:max-h-none"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-[5%] py-4 md:flex-row md:items-center md:justify-between md:gap-8">
          <div>
            <h2 id="lp-consent-heading" className="sr-only">Cookie choices</h2>
            <p className="text-sm text-foreground-muted">
              {shown}
              {privacyPolicyUrl ? (
                <>
                  {' '}
                  <Link href={privacyPolicyUrl} className={linkClass}>Privacy Policy</Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Button variant="secondary" size="compact" onClick={() => choose(all('granted'))}>{hasAds ? 'Accept all' : 'Accept'}</Button>
            <Button variant="secondary" size="compact" onClick={() => choose(all('denied'))}>{hasAds ? 'Decline all' : 'Decline'}</Button>
            {hasAds ? (
              <button type="button" aria-expanded={choosing} aria-controls="lp-consent-choose" onClick={() => (choosing ? setChoosing(false) : openChoose())} className={`min-h-6 text-sm text-foreground-muted ${linkClass}`}>
                Choose
              </button>
            ) : null}
          </div>
        </div>
        {hasAds && choosing ? (
          <div id="lp-consent-choose" className="mx-auto max-w-7xl border-t border-border px-[5%] py-4">
            <fieldset>
              <legend className="sr-only">Choose which cookies to allow</legend>
              <ul className="flex flex-col gap-3">
                {purposes.map((p) => (
                  <li key={p}>
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        aria-labelledby={`lp-consent-${p}-name`}
                        aria-describedby={`lp-consent-${p}-about`}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-action)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                        checked={picks[p]}
                        onChange={(e) => setPicks((cur) => ({...cur, [p]: e.target.checked}))}
                      />
                      <span>
                        <span id={`lp-consent-${p}-name`} className="font-semibold text-foreground">{p === 'ads' ? 'Advertising' : 'Analytics'}</span>
                        <span id={`lp-consent-${p}-about`} className="block text-foreground-muted">
                          {p === 'ads'
                            ? 'Lets advertising companies measure our ads and show them to people who visited this website.'
                            : 'Lets Google Analytics count visits and pages, so we can see how the website is used.'}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <div className="mt-4">
              <Button variant="secondary" size="compact" onClick={() => choose(Object.fromEntries(purposes.map((p) => [p, picks[p] ? 'granted' : 'denied'])) as Choices)}>
                Save choices
              </Button>
            </div>
          </div>
        ) : null}
      </section>
      <p role="status" className="sr-only">{status}</p>
      <div ref={hostRef} hidden data-consent-scripts="" />
    </>
  )
}
