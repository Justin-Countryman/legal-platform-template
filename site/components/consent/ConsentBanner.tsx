'use client'

import {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react'
import Link from 'next/link'
import {Button} from '@/components/ui/Button'
import {
  CONSENT_KEEP_SECONDS,
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  DEFAULT_BANNER_TEXT,
  analyticsCookieNames,
  bootConsent,
  consentCommands,
  cookieDomains,
  measurementIds,
  serializeChoice,
  type ConsentChoice,
  type ConsentState,
} from '@/lib/consent'

// The cookie banner (monorepo `BI/rules/legal-pages.md`; WS-CONSENT-AND-LEGAL-PAGES-DESIGN-2026-10-15 §4.1 and §8).
// The rules are `lib/consent.ts`; this is the visitor's side of them.
//
// - In the server's HTML from the start, first in the body after the skip link, so a keyboard or a screen reader meets
//   it where it is. The layout's inline script (`bootScript`) decides before paint and sets `html[data-consent]`;
//   globals.css shows the banner only under `ask`, so there is no late paint and no layout shift. Without JavaScript it
//   never shows, which is right: nothing it holds back would load anyway.
// - Site Settings → Scripts — Require Consent is mounted once per page view, after an accept, behind Consent Mode's
//   default-denied commands, in a container outside the banner. Reopening Cookie settings never loads it twice.
// - A decline neuters a loaded tag (Consent Mode update, `ga-disable-<id>`) and expires Google Analytics' cookies on
//   this host and each parent domain; a stored decline clears them on every page, since a two-year `_ga` outlives the
//   six-month choice. No reload: it would lose a half-filled form.
// - A labelled region, not a dialog: it never takes focus on load and traps nothing. While open it publishes its
//   height as --consent-banner-h, which globals.css turns into scroll padding and body padding, so nothing focused or
//   scrolled to the end of a page sits under it (WCAG 2.4.11, technique C43); on a viewport under 30rem tall it sits
//   in the page's flow instead (C34). Accept and Decline are the same component, variant and size.

type Props = {
  /** Site Settings → Scripts — Require Consent. */
  scripts: string | null | undefined
  /** Site Settings → Cookie Banner Text. */
  text: string | null | undefined
  privacyPolicyUrl: string | null | undefined
}

type View = 'unknown' | ConsentState

declare global {
  interface Window {
    dataLayer?: unknown[]
    /** Set once the consent scripts are mounted in this page view. */
    __lpConsentLoaded?: boolean
  }
}

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

function loadScripts(html: string, host: HTMLElement | null) {
  if (window.__lpConsentLoaded) return
  window.__lpConsentLoaded = true
  for (const command of consentCommands('granted')) gtag(...command)
  ;(host ?? document.body).appendChild(document.createRange().createContextualFragment(html))
}

function neuter(html: string) {
  if (window.__lpConsentLoaded) gtag('consent', 'update', {analytics_storage: 'denied'})
  for (const id of measurementIds(html)) (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = true
  const domains = cookieDomains(window.location.hostname)
  for (const name of analyticsCookieNames(document.cookie)) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=.${domain}` : ''}`
    }
  }
}

function store(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeChoice(choice, nowSeconds()))
  } catch {
    // Storage refused (a private window, a full quota): the choice holds for this page view only.
  }
}

export function ConsentBanner({scripts, text, privacyPolicyUrl}: Props) {
  const html = scripts && scripts.trim() ? scripts : null
  const view = useSyncExternalStore(subscribe, readState, serverState)
  const [status, setStatus] = useState('')
  const opener = useRef<HTMLElement | null>(null)
  const focusOnOpen = useRef(false)
  const regionRef = useRef<HTMLElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  // The decision the inline script made before paint (or this page's own, when it did not run).
  useEffect(() => {
    if (!html) return
    const root = document.documentElement
    const decided = (root.getAttribute('data-consent') ||
      bootConsent(document, window, CONSENT_STORAGE_KEY, CONSENT_VERSION, CONSENT_KEEP_SECONDS)) as ConsentState
    setConsentState(decided)
    if (decided === 'granted') loadScripts(html, hostRef.current)
    if (decided === 'denied') neuter(html)
  }, [html])

  // The footer's Cookie settings button.
  useEffect(() => {
    if (!html) return
    const onOpen = (e: Event) => {
      if (document.documentElement.getAttribute('data-consent') === 'off') return
      const detail = (e as CustomEvent<{opener?: HTMLElement}>).detail
      opener.current = detail?.opener ?? (document.activeElement as HTMLElement | null)
      focusOnOpen.current = true
      setStatus('')
      setConsentState('ask')
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [html])

  // Reserve the banner's height while it is open; move focus in when the visitor asked for it.
  useLayoutEffect(() => {
    if (!html || view === 'unknown') return
    const root = document.documentElement
    const el = regionRef.current
    if (view !== 'ask' || !el) return
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
  }, [html, view])

  if (!html) return null

  const choose = (choice: ConsentChoice) => {
    const hadFocus = !!regionRef.current?.contains(document.activeElement)
    store(choice)
    if (choice === 'granted') loadScripts(html, hostRef.current)
    else neuter(html)
    setConsentState(choice)
    setStatus(choice === 'granted' ? 'Analytics cookies accepted. Change this with Cookie settings at the bottom of the page.'
      : 'Analytics cookies declined. Change this with Cookie settings at the bottom of the page.')
    const back = opener.current
    opener.current = null
    if (back && back.isConnected) back.focus({preventScroll: true})
    else if (hadFocus) document.getElementById('main-content')?.focus({preventScroll: true})
  }

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
              {text && text.trim() ? text : DEFAULT_BANNER_TEXT}
              {privacyPolicyUrl ? (
                <>
                  {' '}
                  <Link href={privacyPolicyUrl} className="underline transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
                    Privacy Policy
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button variant="secondary" size="compact" onClick={() => choose('granted')}>Accept</Button>
            <Button variant="secondary" size="compact" onClick={() => choose('denied')}>Decline</Button>
          </div>
        </div>
      </section>
      <p role="status" className="sr-only">{status}</p>
      <div ref={hostRef} hidden data-consent-scripts="" />
    </>
  )
}
