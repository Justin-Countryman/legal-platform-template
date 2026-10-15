// The cookie banner's rules, as functions (monorepo `BI/rules/legal-pages.md`, the LEGAL family;
// WS-CONSENT-AND-LEGAL-PAGES-DESIGN-2026-10-15 §4.1 and §8). The component is `components/consent/ConsentBanner.tsx`.
//
// - Site Settings → Scripts — Require Consent (Google Analytics 4's snippet) runs only after a visitor accepts.
//   Google's Consent Mode in its basic form: the tag is not loaded at all until then, and when it is, every key
//   starts denied and only `analytics_storage` is granted. The banner asks about analytics alone, so the three
//   advertising keys are never granted, which keeps the firm's privacy policy's "no sale or sharing" true.
// - The choice is one browser-storage entry, never a cookie the site sets, kept about six months (the ICO's figure
//   for asking a decliner again, and the CNIL's for both) and then asked again.
// - A browser sending Global Privacy Control, with nothing stored, is a decline without asking; a choice the visitor
//   made in the banner stands.
// - `bootConsent` decides before the page paints: the layout inlines it, serialized, ahead of the banner, and it sets
//   `html[data-consent]`, which CSS reads to show the banner. The client calls the same function when the inline
//   script did not run. `parseChoice` and `resolveChoice` state the same rule for the tests, which hold the two equal.

export type ConsentChoice = 'granted' | 'denied'
/** What the page does: ask, a stored or signalled choice, or `off` on the operator's preview. */
export type ConsentState = ConsentChoice | 'ask' | 'off'

export const CONSENT_STORAGE_KEY = 'lp-consent'
export const CONSENT_VERSION = 1
export const CONSENT_KEEP_SECONDS = 183 * 24 * 60 * 60

/** Rendered by the operator's preview layout, after the root layout's own script: the banner never shows there and
 *  nothing is held or loaded by it (the Switcher sits at the bottom, and flow-metrics measures only the preview).
 *  Set by the preview itself so no live page carries the preview's address (scripts/ci/check-preview-not-shipped). */
export const CONSENT_OFF_SCRIPT = "document.documentElement.setAttribute('data-consent','off');"

/** Shown when Site Settings → Cookie Banner Text is empty. */
export const DEFAULT_BANNER_TEXT =
  'We use analytics cookies to learn how visitors use this website. They stay off unless you accept.'

/** The window event the footer's Cookie settings button sends to reopen the banner. */
export const CONSENT_OPEN_EVENT = 'lp:consent-open'

export function serializeChoice(choice: ConsentChoice, nowSeconds: number): string {
  return JSON.stringify({v: CONSENT_VERSION, choice, at: Math.floor(nowSeconds)})
}

/** The stored choice, or null (ask) for anything absent, malformed, of another version, dated ahead of now, or
 *  older than the keep period. */
export function parseChoice(raw: string | null | undefined, nowSeconds: number): ConsentChoice | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const {v, choice, at} = value as {v?: unknown; choice?: unknown; at?: unknown}
  if (v !== CONSENT_VERSION) return null
  if (choice !== 'granted' && choice !== 'denied') return null
  if (typeof at !== 'number' || !Number.isFinite(at)) return null
  if (at > nowSeconds) return null
  if (nowSeconds - at >= CONSENT_KEEP_SECONDS) return null
  return choice
}

/** What the page acts on: the visitor's own choice first; with none, Global Privacy Control declines. */
export function resolveChoice(stored: ConsentChoice | null, gpc: boolean): ConsentChoice | null {
  if (stored) return stored
  return gpc ? 'denied' : null
}

/* eslint-disable no-var */
/** The decision, made before paint. Self-contained on purpose (no imports, no closures): the layout inlines it with
 *  `.toString()`. Sets `html[data-consent]` and returns the state. */
export function bootConsent(d: Document, w: Window, key: string, version: number, keep: number): string {
  var state = 'ask'
  var raw = null
  try {
    raw = w.localStorage.getItem(key)
  } catch {
    raw = null
  }
  var choice = null
  try {
    var v = raw ? JSON.parse(raw) : null
    var now = Math.floor(Date.now() / 1000)
    if (v && typeof v === 'object' && !Array.isArray(v) && v.v === version &&
        (v.choice === 'granted' || v.choice === 'denied') && typeof v.at === 'number' && isFinite(v.at) &&
        v.at <= now && now - v.at < keep) choice = v.choice
  } catch {
    choice = null
  }
  if (choice) state = choice
  else if ((w.navigator as unknown as {globalPrivacyControl?: boolean}).globalPrivacyControl === true) state = 'denied'
  d.documentElement.setAttribute('data-consent', state)
  return state
}
/* eslint-enable no-var */

/** The inline script the layout renders ahead of the banner. */
export function bootScript(): string {
  return `(${bootConsent.toString()})(document,window,${JSON.stringify(CONSENT_STORAGE_KEY)},${CONSENT_VERSION},` +
    `${CONSENT_KEEP_SECONDS});`
}

type ConsentCommand = ['consent', 'default' | 'update', Record<string, 'granted' | 'denied'>]

/** The Consent Mode commands, in order, run before the pasted tag loads (Google: "The order of the code here is
 *  vital"). */
export function consentCommands(choice: ConsentChoice): ConsentCommand[] {
  const commands: ConsentCommand[] = [['consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  }]]
  if (choice === 'granted') commands.push(['consent', 'update', {analytics_storage: 'granted'}])
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
