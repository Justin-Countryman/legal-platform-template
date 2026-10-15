// The four standard advertising tags, written by the site from Site Settings' IDs, never pasted (monorepo
// WS-AD-PIXELS-DESIGN-2026-10-15 §2 and §8; Justin 2026-10-15: "build a place for standard pixels and connect to this
// functionality", and on counting leads: "That is the role of pixel for google ads etc. we don't need that"). Each ID set
// loads its vendor's own base tag on every page. The cookie banner calls `loadAdPixels` only after a visitor accepts
// Advertising, only on the firm's own address, and only on an address that carries nothing but click IDs and campaign
// tags (`lib/adIds.ts`). The site counts nothing itself: what a firm counts is set in each vendor's own dashboard.
//
// Each tag is the vendor's own base code, configured from the vendor's own documentation (the record's §1.1):
// - Meta: `autoConfig` false before `init` (no button clicks or page metadata sent automatically); the page view the
//   base code sends, and one per page reached inside the app, sent here rather than by Meta's own history listener.
// - Google Ads: the same gtag and Consent Mode as Google Analytics; never `user_data` or `url_passthrough`.
// - Microsoft UET: Consent Mode's default (denied) and then the grant, `enableAutoConsent: false` so it reads only ours;
//   the page view per page reached inside the app sent here, not by UET's own tracking.
// - LinkedIn: the Insight Tag, which has no consent API, so it never loads without an accept. It reads clicks and form
//   submits on the page and cannot be told not to.
// No tag is given a form value: the site's forms are Fillout embeds in Fillout's own frame, which a tag on the page
// cannot read, and the form-reading switches in each vendor's dashboard stay off (Studio's help text names them).

import type {AdIds} from '@/lib/adIds'

type Gtag = (...args: unknown[]) => void
type AdWindow = Window & {
  fbq?: ((...args: unknown[]) => void) & {queue?: unknown[]; callMethod?: (...a: unknown[]) => void; loaded?: boolean; version?: string; push?: unknown; disablePushState?: boolean}
  _fbq?: unknown
  uetq?: unknown[] & {push: (...args: unknown[]) => unknown}
  UET?: new (o: Record<string, unknown>) => unknown
  _linkedin_partner_id?: string
  _linkedin_data_partner_ids?: string[]
  lintrk?: ((a: unknown, b?: unknown) => void) & {q?: unknown[]}
  __lpAdsLoaded?: boolean
}

export const META_SCRIPT = 'https://connect.facebook.net/en_US/fbevents.js'
export const GTAG_SCRIPT = 'https://www.googletagmanager.com/gtag/js'
export const UET_SCRIPT = 'https://bat.bing.com/bat.js'
export const LINKEDIN_SCRIPT = 'https://snap.licdn.com/li.lms-analytics/insight.min.js'

function addScript(src: string, onload?: () => void) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  if (onload) s.onload = onload
  document.head.appendChild(s)
}

/** Load each set vendor's base tag, once per document, with its page view. `gtag` is the shared Google queue the
 *  banner primed with Consent Mode's commands. */
export function loadAdPixels(ids: AdIds, gtag: Gtag): void {
  const w = window as AdWindow
  if (w.__lpAdsLoaded) return
  w.__lpAdsLoaded = true

  if (ids.metaPixelId) {
    if (!w.fbq) {
      const n = function (...args: unknown[]) {
        if (n.callMethod) n.callMethod(...args)
        else (n.queue as unknown[]).push(args)
      } as NonNullable<AdWindow['fbq']>
      n.push = n
      n.loaded = true
      n.version = '2.0'
      n.queue = []
      // No page view from Meta's own history listener: `adPageView` sends one, for an address a tag may see.
      n.disablePushState = true
      w.fbq = n
      if (!w._fbq) w._fbq = n
      addScript(META_SCRIPT)
    }
    w.fbq('set', 'autoConfig', false, ids.metaPixelId)
    w.fbq('init', ids.metaPixelId)
    w.fbq('track', 'PageView')
  }

  if (ids.googleAdsId) {
    if (!document.querySelector(`script[src^="${GTAG_SCRIPT}"]`)) {
      addScript(`${GTAG_SCRIPT}?id=${encodeURIComponent(ids.googleAdsId)}`)
      gtag('js', new Date())
    }
    // The analytics script's `set` turned ad personalization off for every Google tag, so Google Analytics never feeds
    // ads; the advertising tag, accepted for advertising, takes Google's own default back for itself.
    gtag('config', ids.googleAdsId, {allow_ad_personalization_signals: true})
  }

  if (ids.microsoftUetId) {
    const q = (w.uetq = w.uetq || ([] as unknown as NonNullable<AdWindow['uetq']>))
    q.push('consent', 'default', {ad_storage: 'denied'})
    q.push('consent', 'update', {ad_storage: 'granted'})
    const ti = ids.microsoftUetId
    addScript(UET_SCRIPT, () => {
      if (!w.UET) return
      w.uetq = new w.UET({ti, enableAutoSpaTracking: false, enableAutoConsent: false, q: w.uetq}) as NonNullable<AdWindow['uetq']>
      w.uetq.push('pageLoad')
    })
  }

  if (ids.linkedInPartnerId) {
    w._linkedin_partner_id = ids.linkedInPartnerId
    w._linkedin_data_partner_ids = w._linkedin_data_partner_ids || []
    w._linkedin_data_partner_ids.push(ids.linkedInPartnerId)
    if (!w.lintrk) {
      const l = function (a: unknown, b?: unknown) {
        ;(l.q as unknown[]).push([a, b])
      } as NonNullable<AdWindow['lintrk']>
      l.q = []
      w.lintrk = l
    }
    addScript(LINKEDIN_SCRIPT)
  }
}

/** A page reached inside the app (a link, not a load): the page view each base tag sends on a load. LinkedIn's tag
 *  follows the address itself. */
export function adPageView(ids: AdIds, gtag: Gtag): void {
  const w = window as AdWindow
  if (!w.__lpAdsLoaded) return
  if (ids.metaPixelId && w.fbq) w.fbq('track', 'PageView')
  if (ids.googleAdsId) gtag('event', 'page_view', {send_to: ids.googleAdsId})
  if (ids.microsoftUetId && w.uetq) w.uetq.push('event', 'page_view', {page_path: window.location.pathname})
}

/** The vendors' own switches, before the banner reloads the page after a withdrawal (a loaded tag cannot be unloaded;
 *  the reload is what stops LinkedIn and every listener). */
export function revokeAdPixels(gtag: Gtag): void {
  const w = window as AdWindow
  if (!w.__lpAdsLoaded) return
  if (typeof w.fbq === 'function') w.fbq('consent', 'revoke')
  gtag('consent', 'update', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'})
  if (w.uetq) w.uetq.push('consent', 'update', {ad_storage: 'denied'})
}

/** Whether the advertising tags loaded in this page view. */
export function adPixelsLoaded(): boolean {
  return !!(window as AdWindow).__lpAdsLoaded
}

const AD_COOKIES = /^(_fbp|_fbc|_gcl_(au|aw|gb|gs|ag|dc)|_uetsid|_uetvid|_uetmsclkid|_uetsid_exp|_uetvid_exp|li_fat_id|li_giant|li_adsid|oribili_user_guid|ln_or|oribi_cookie_test)$/

/** The advertising tags' own first-party cookies in a `document.cookie` string, to expire on a decline. */
export function adCookieNames(cookieString: string): string[] {
  return cookieString
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter((name) => AD_COOKIES.test(name))
}

/** The tags' own entries in the browser's local storage, cleared with their cookies. */
export const AD_STORAGE_KEYS = ['_gcl_ls', '_uetsid', '_uetvid', '_uetsid_exp', '_uetvid_exp']
