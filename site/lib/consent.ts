// The cookie banner's rules, as functions (monorepo `BI/rules/legal-pages.md`, the LEGAL family;
// WS-CONSENT-AND-LEGAL-PAGES-DESIGN-2026-10-15 §4.1 and §8). The component is `components/consent/ConsentBanner.tsx`.
//
// - Site Settings → Scripts — Require Consent (Google Analytics 4's snippet) runs only after a visitor accepts.
//   Google's Consent Mode in its basic form: the tag is not loaded at all until then, and when it is, every key
//   starts denied and only `analytics_storage` is granted; the advertising keys only with an accept of advertising.
// - The choice is kept twelve months and then asked again (monorepo [R-751]; Justin, 2026-10-15: "We should not be
//   asking twice or whatever the industry standard is"): Cookiebot's and OneTrust's default, and California's floor
//   for asking again someone who opted out of sharing (11 CCR §7026(k)). It is kept twice: a browser-storage entry the
//   page writes at once, and a first-party cookie of the same name the site's own server sets (`/api/consent`), which
//   Safari keeps (its tracking prevention deletes a site's script-written storage, and caps script-written cookies,
//   after seven days without a click on the site; WebKit, "Full Third-Party Cookie Blocking and More", 2020-03-24).
//   The page never writes the cookie itself, or Safari would cap it too. It is read storage first, then the cookie.
//   Storing the choice needs no consent of its own (the CNIL's first exempt tracker; the ICO's consent-mechanism
//   cookies).
// - A browser sending Global Privacy Control, with nothing stored, is a decline without asking; a choice the visitor
//   made in the banner stands.
// - `bootConsent` decides before the page paints: the layout inlines it, serialized, ahead of the banner, and it sets
//   `html[data-consent]`, which CSS reads to show the banner. The client calls the same function when the inline
//   script did not run. `parseChoices` and `resolveChoices` state the same rule for the tests, which hold the two equal.
// - Advertising (2026-10-15, monorepo WS-AD-PIXELS-DESIGN-2026-10-15): when Site Settings holds an advertising ID, the
//   banner asks about two purposes, each stored on its own; a stored choice that does not cover a purpose the site
//   now has is asked again.

export type ConsentChoice = 'granted' | 'denied'
/** The purposes the banner asks about: analytics (Site Settings' consent script) and, when an advertising ID is set,
 *  advertising (monorepo WS-AD-PIXELS-DESIGN-2026-10-15). */
export type Purpose = 'analytics' | 'ads'
export type Choices = Partial<Record<Purpose, ConsentChoice>> & {
  /** Global Privacy Control was on when the visitor chose: an advertising accept made with it stands. */
  gpc?: boolean
}
export type Resolution = Choices & {ask: boolean}
/** What the page does: ask, every purpose granted or denied, a mix, or `off` on the operator's preview. */
export type ConsentState = 'ask' | 'granted' | 'denied' | 'mixed' | 'off'

export const CONSENT_STORAGE_KEY = 'lp-consent'
export const CONSENT_VERSION = 2
export const CONSENT_KEEP_SECONDS = 365 * 24 * 60 * 60
/** The site's own route that sets the choice's cookie (`app/api/consent/route.ts`). */
export const CONSENT_COOKIE_ROUTE = '/api/consent'
/** How far a choice's time may sit from the server's before the cookie route refuses it (a wrong device clock). */
export const CONSENT_CLOCK_SKEW_SECONDS = 2 * 24 * 60 * 60

/** Rendered by the operator's preview layout, after the root layout's own script: the banner never shows there and
 *  nothing is held or loaded by it (the Switcher sits at the bottom, and flow-metrics measures only the preview).
 *  Set by the preview itself so no live page carries the preview's address (scripts/ci/check-preview-not-shipped). */
export const CONSENT_OFF_SCRIPT = "document.documentElement.setAttribute('data-consent','off');"

/** Shown when Site Settings → Cookie Banner Text is empty. */
export const DEFAULT_BANNER_TEXT =
  'We use analytics cookies to learn how visitors use this website. They stay off unless you accept.'

/** Shown instead when the site also holds an advertising ID and Cookie Banner Text is empty or the analytics default. */
export const DEFAULT_BANNER_TEXT_ADS =
  'We use cookies for analytics and for advertising. They stay off unless you accept, and Choose lets you allow one and not the other.'

/** The window event the footer's Cookie settings button sends to reopen the banner. */
export const CONSENT_OPEN_EVENT = 'lp:consent-open'

const isChoice = (v: unknown): v is ConsentChoice => v === 'granted' || v === 'denied'

export function serializeChoices(choices: Choices, nowSeconds: number): string {
  const out: Record<string, unknown> = {v: CONSENT_VERSION}
  if (choices.analytics) out.analytics = choices.analytics
  if (choices.ads) out.ads = choices.ads
  if (choices.gpc) out.gpc = true
  out.at = Math.floor(nowSeconds)
  return JSON.stringify(out)
}

/** The stored choices, or null (ask) for anything absent, malformed, of an unknown version, dated ahead of now, or
 *  older than the keep period. A version 1 entry (one choice, from before advertising) reads as analytics alone. */
export function parseChoices(raw: string | null | undefined, nowSeconds: number): Choices | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const {v, at, choice, analytics, ads, gpc} = value as Record<string, unknown>
  if (typeof at !== 'number' || !Number.isFinite(at) || at > nowSeconds || nowSeconds - at >= CONSENT_KEEP_SECONDS) return null
  if (v === 1) return isChoice(choice) ? {analytics: choice} : null
  if (v !== CONSENT_VERSION) return null
  if (analytics !== undefined && !isChoice(analytics)) return null
  if (ads !== undefined && !isChoice(ads)) return null
  if (!analytics && !ads) return null
  const out: Choices = {}
  if (analytics) out.analytics = analytics as ConsentChoice
  if (ads) out.ads = ads as ConsentChoice
  if (gpc === true) out.gpc = true
  return out
}

/** What the page acts on, for the purposes the site has: the visitor's own choice first; with none, Global Privacy
 *  Control declines; a purpose still unchosen means ask. For advertising, a later Global Privacy Control signal also
 *  overrides an accept made without it (11 CCR §7025(c)(3)); an accept made while the signal was on stands. */
export function resolveChoices(stored: Choices | null, gpc: boolean, purposes: readonly string[]): Resolution {
  const out: Resolution = {ask: false}
  for (const p of purposes as Purpose[]) {
    let c = stored?.[p] ?? (gpc ? 'denied' : undefined)
    if (p === 'ads' && gpc && c === 'granted' && !stored?.gpc) c = 'denied'
    if (c) out[p] = c
    else out.ask = true
  }
  return out
}

/** The state `html[data-consent]` carries. */
export function consentState(r: Resolution): ConsentState {
  if (r.ask) return 'ask'
  const values = (['analytics', 'ads'] as Purpose[]).map((p) => r[p]).filter(Boolean)
  if (values.length && values.every((c) => c === 'granted')) return 'granted'
  if (values.every((c) => c === 'denied')) return 'denied'
  return 'mixed'
}

/** The stored choice as written: the browser-storage entry, or, when Safari has deleted it, the cookie the site's
 *  server set. `bootConsent` reads the same way, inline. */
export function readStoredRaw(d: Document, w: Window, key: string = CONSENT_STORAGE_KEY): string | null {
  try {
    const raw = w.localStorage.getItem(key)
    if (raw) return raw
  } catch {
    // Storage refused: the cookie may still hold the choice.
  }
  try {
    const jar = ('; ' + d.cookie).split('; ' + key + '=')
    return jar.length > 1 ? decodeURIComponent(jar[1].split(';')[0]) : null
  } catch {
    return null
  }
}

/** The cookie's header, for the route: the entry exactly as the page stored it, its age counted from the choice. */
export function choiceCookieHeader(raw: string, nowSeconds: number, secure: boolean): string | null {
  const choices = parseChoices(raw, nowSeconds + CONSENT_CLOCK_SKEW_SECONDS)
  let at = NaN
  try {
    at = (JSON.parse(raw) as {at?: number}).at ?? NaN
  } catch {
    return null
  }
  if (!choices || !Number.isFinite(at) || Math.abs(nowSeconds - at) > CONSENT_CLOCK_SKEW_SECONDS) return null
  const value = serializeChoices(choices, at)
  const maxAge = Math.max(0, CONSENT_KEEP_SECONDS - Math.max(0, nowSeconds - at))
  return `${CONSENT_STORAGE_KEY}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`
}

/* eslint-disable no-var */
/** The decision, made before paint. Self-contained on purpose (no imports, no closures): the layout inlines it with
 *  `.toString()`. Sets `html[data-consent]` and returns the state; held equal to `consentState(resolveChoices(...))`
 *  by the tests. */
export function bootConsent(d: Document, w: Window, key: string, keep: number, purposes: string[]): string {
  var stored = null as null | Record<string, string>
  try {
    var raw = null as string | null
    try {
      raw = w.localStorage.getItem(key)
    } catch {
      raw = null
    }
    if (!raw) {
      var jar = ('; ' + d.cookie).split('; ' + key + '=')
      raw = jar.length > 1 ? decodeURIComponent(jar[1].split(';')[0]) : null
    }
    var v = raw ? JSON.parse(raw) : null
    var now = Math.floor(Date.now() / 1000)
    var ok = function (c: unknown) { return c === 'granted' || c === 'denied' }
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.at === 'number' && isFinite(v.at) &&
        v.at <= now && now - v.at < keep) {
      if (v.v === 1 && ok(v.choice)) stored = {analytics: v.choice}
      else if (v.v === 2 && (v.analytics === undefined || ok(v.analytics)) && (v.ads === undefined || ok(v.ads)) &&
               (v.analytics || v.ads)) {
        stored = {}
        if (v.analytics) stored.analytics = v.analytics
        if (v.ads) stored.ads = v.ads
        if (v.gpc === true) stored.gpc = 'yes'
      }
    }
  } catch {
    stored = null
  }
  var gpc = (w.navigator as unknown as {globalPrivacyControl?: boolean}).globalPrivacyControl === true
  var ask = false
  var granted = 0
  var denied = 0
  for (var i = 0; i < purposes.length; i++) {
    var c = (stored && stored[purposes[i]]) || (gpc ? 'denied' : '')
    if (purposes[i] === 'ads' && gpc && c === 'granted' && !(stored && stored.gpc)) c = 'denied'
    if (!c) ask = true
    else if (c === 'granted') granted++
    else denied++
  }
  var state = ask ? 'ask' : denied === 0 && granted > 0 ? 'granted' : granted === 0 ? 'denied' : 'mixed'
  d.documentElement.setAttribute('data-consent', state)
  return state
}
/* eslint-enable no-var */

/** The thank-you page's address loses any query string before Next reads it and before any tag runs: a form that
 *  redirects with answers in the address would otherwise hand them to analytics and every advertising tag. The history
 *  entry's own state is kept, so Back still works. Self-contained, inlined by `bootScript`. */
export function cleanThankYou(w: Window, path: string): void {
  if (w.location.pathname === path && w.location.search) {
    w.history.replaceState(w.history.state, '', w.location.pathname + w.location.hash)
  }
}

/** The inline script the layout renders ahead of the banner, for the purposes the site has. */
export function bootScript(purposes: readonly Purpose[]): string {
  return `(${cleanThankYou.toString()})(window,"/thank-you");` +
    `(${bootConsent.toString()})(document,window,${JSON.stringify(CONSENT_STORAGE_KEY)},` +
    `${CONSENT_KEEP_SECONDS},${JSON.stringify(purposes)});`
}

type ConsentCommand = ['consent', 'default' | 'update', Record<string, 'granted' | 'denied'>]

/** The Consent Mode commands, in order, run before any Google tag loads (Google: "The order of the code here is
 *  vital"): every key denied, then what the visitor granted. Analytics grants `analytics_storage`; advertising grants
 *  `ad_storage`, `ad_user_data` and `ad_personalization`. */
export function consentCommands(choices: Choices): ConsentCommand[] {
  const commands: ConsentCommand[] = [['consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  }]]
  const update: Record<string, 'granted' | 'denied'> = {}
  if (choices.analytics === 'granted') update.analytics_storage = 'granted'
  if (choices.ads === 'granted') Object.assign(update, {ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted'})
  if (Object.keys(update).length) commands.push(['consent', 'update', update])
  return commands
}

/** The GA4 measurement ids in the pasted snippet (read as `lib/preview/analytics.ts` reads them). */
export function measurementIds(scripts: string | null | undefined): string[] {
  return [...new Set((scripts ?? '').match(/\bG-[A-Z0-9]{4,}\b/g) ?? [])]
}

/** Google Analytics' own cookies in a `document.cookie` string, to clear when a visitor declines. */
export function analyticsCookieNames(cookieString: string): string[] {
  return cookieString
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter((name) => /^_ga($|_)|^_gid$|^_gat($|_)|^_gac_/.test(name))
}

/** The host and each parent domain a cookie could have been set on (GA's automatic domain is the parent of `www`). */
export function cookieDomains(hostname: string): string[] {
  const labels = hostname.split('.')
  return [''].concat(labels.map((_, i) => labels.slice(i).join('.')).filter((d) => d.includes('.')))
}
