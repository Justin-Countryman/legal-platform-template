// The advertising IDs Site Settings holds, the shape each must have, and the address parameters an advertising tag may
// see (monorepo WS-AD-PIXELS-DESIGN-2026-10-15 §2; Justin 2026-10-15: "build a place for standard pixels and connect to
// this functionality"). One table, `outsideVendors.json`, so the site, Studio's help and the platform's go-live check
// read the same shapes. An ID of the wrong shape is never used (the go-live check refuses one that is set).

import vendors from '@/lib/outsideVendors.json'

export type AdVendor = 'meta' | 'google-ads' | 'microsoft-ads' | 'linkedin'
export type AdIds = {
  metaPixelId?: string
  googleAdsId?: string
  microsoftUetId?: string
  linkedInPartnerId?: string
}

type VendorEntry = {id: string; ids?: Record<string, string>; clickIds?: string[]}
const ENTRIES = (vendors as {vendors: VendorEntry[]}).vendors

const MAIN_ID: Record<AdVendor, keyof AdIds> = {meta: 'metaPixelId', 'google-ads': 'googleAdsId', 'microsoft-ads': 'microsoftUetId', linkedin: 'linkedInPartnerId'}

export const AD_ID_SHAPES = Object.fromEntries(
  ENTRIES.flatMap((v) => Object.entries(v.ids ?? {}).map(([field, shape]) => [field, new RegExp(shape)])),
) as Record<keyof AdIds, RegExp>

/** The networks' click IDs: the address parameters each tag reads on the page a visitor lands on from an ad. */
export const CLICK_IDS: readonly string[] = ENTRIES.flatMap((v) => v.clickIds ?? [])

/** Only the IDs of the right shape, trimmed. */
export function usableAdIds(raw: Record<string, unknown> | null | undefined): AdIds {
  const out: AdIds = {}
  for (const key of Object.keys(AD_ID_SHAPES) as (keyof AdIds)[]) {
    const v = typeof raw?.[key] === 'string' ? (raw[key] as string).trim() : ''
    if (v && AD_ID_SHAPES[key].test(v)) out[key] = v
  }
  return out
}

/** Which vendors the site would load, in a fixed order: the advertising purpose exists when this is not empty. */
export function adVendors(ids: AdIds): AdVendor[] {
  return (['meta', 'google-ads', 'microsoft-ads', 'linkedin'] as AdVendor[]).filter((v) => !!ids[MAIN_ID[v]])
}

/** Advertising tags load only on the firm's own address (`siteHost()`): never on the hidden staging site the firm
 *  reviews, a preview, CI or a developer's machine, so the firm's ad accounts see real visitors only. */
export function isLiveHost(hostname: string, site: string): boolean {
  return !!site && hostname.toLowerCase() === site.toLowerCase()
}

/** The address parameters an advertising tag may see: the networks' click IDs and campaign tags. Anything else (a
 *  search term, a form's answers) means no advertising tag loads, and no page view is sent, for that address. */
export function adSafeAddress(search: string): boolean {
  const allowed = new Set(CLICK_IDS)
  for (const key of new URLSearchParams(search).keys()) {
    if (!allowed.has(key) && !/^utm_[a-z_]+$/.test(key)) return false
  }
  return true
}
