import {describe, it, expect, beforeEach} from 'vitest'
import {
  GTAG_SCRIPT, LINKEDIN_SCRIPT, META_SCRIPT, UET_SCRIPT, adCookieNames, adPageView, adPixelsLoaded, loadAdPixels, revokeAdPixels,
} from '@/lib/adPixels'

// The four standard tags as the site writes them (monorepo WS-AD-PIXELS-DESIGN-2026-10-15 §2 and §8, the vendors'
// own docs in §1.1; Justin 2026-10-15: each set ID loads its vendor's base tag on every page, and the site counts
// nothing itself). jsdom runs no script, so a tag is read as its <script> element and the calls queued for it.

type W = Window & Record<string, unknown>
const w = window as unknown as W
const IDS = {metaPixelId: '123456789012345', googleAdsId: 'AW-1234567890', microsoftUetId: '12345678', linkedInPartnerId: '1234567'}

let calls: unknown[][]
const gtag = (...a: unknown[]) => { calls.push(a) }
const scripts = () => [...document.querySelectorAll('script')].map((s) => s.getAttribute('src'))
const metaQueue = () => (w.fbq as {queue: unknown[][]}).queue

beforeEach(() => {
  calls = []
  document.head.innerHTML = ''
  for (const k of ['fbq', '_fbq', 'uetq', 'UET', 'lintrk', '_linkedin_partner_id', '_linkedin_data_partner_ids', '__lpAdsLoaded']) delete w[k]
  window.history.replaceState(null, '', '/practice')
})

describe('the base tags', () => {
  it('loads each set vendor’s base tag once per document, with its page view', () => {
    loadAdPixels(IDS, gtag)
    loadAdPixels(IDS, gtag)
    expect(scripts()).toEqual([META_SCRIPT, `${GTAG_SCRIPT}?id=AW-1234567890`, UET_SCRIPT, LINKEDIN_SCRIPT])
    expect(adPixelsLoaded()).toBe(true)
    expect(metaQueue()).toEqual([['set', 'autoConfig', false, IDS.metaPixelId], ['init', IDS.metaPixelId], ['track', 'PageView']])
    expect((w.fbq as {disablePushState: boolean}).disablePushState).toBe(true)
    expect(calls).toContainEqual(['config', 'AW-1234567890', {allow_ad_personalization_signals: true}])
    expect(Array.from(w.uetq as unknown[])).toEqual(['consent', 'default', {ad_storage: 'denied'}, 'consent', 'update', {ad_storage: 'granted'}])
    expect(w._linkedin_data_partner_ids).toEqual(['1234567'])
  })

  it('loads only the vendors whose ID is set, and counts nothing itself', () => {
    loadAdPixels({linkedInPartnerId: '1234567'}, gtag)
    expect(scripts()).toEqual([LINKEDIN_SCRIPT])
    expect(calls).toEqual([])
    expect(w.fbq).toBeUndefined()
  })

  it('reuses a gtag Google Analytics already loaded', () => {
    const s = document.createElement('script')
    s.src = `${GTAG_SCRIPT}?id=G-ABC1234`
    document.head.appendChild(s)
    loadAdPixels({googleAdsId: IDS.googleAdsId}, gtag)
    expect(scripts().filter((x) => x?.startsWith(GTAG_SCRIPT))).toHaveLength(1)
    expect(calls).toEqual([['config', 'AW-1234567890', {allow_ad_personalization_signals: true}]])
  })
})

describe('a page reached inside the app', () => {
  it('sends each tag’s page view, and nothing before the tags load', () => {
    adPageView(IDS, gtag)
    expect(calls).toEqual([])
    loadAdPixels(IDS, gtag)
    calls = []
    window.history.replaceState(null, '', '/attorneys')
    adPageView(IDS, gtag)
    expect(metaQueue().at(-1)).toEqual(['track', 'PageView'])
    expect(calls).toEqual([['event', 'page_view', {send_to: 'AW-1234567890'}]])
    expect(Array.from(w.uetq as unknown[]).slice(-3)).toEqual(['event', 'page_view', {page_path: '/attorneys'}])
  })
})

describe('withdrawal', () => {
  it('does nothing when nothing loaded', () => {
    revokeAdPixels(gtag)
    expect(calls).toEqual([])
  })

  it("calls each vendor's switch off before the page reloads", () => {
    loadAdPixels(IDS, gtag)
    calls = []
    revokeAdPixels(gtag)
    expect(metaQueue().at(-1)).toEqual(['consent', 'revoke'])
    expect(calls).toEqual([['consent', 'update', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'}]])
    expect(Array.from(w.uetq as unknown[]).slice(-3)).toEqual(['consent', 'update', {ad_storage: 'denied'}])
  })

  it("finds the advertising tags' own cookies and nothing else", () => {
    const jar = '_fbp=fb.1.1; _fbc=fb.1.2; _gcl_au=1; _gcl_aw=2; _uetsid=a; _uetvid=b; li_fat_id=c; li_adsid=d; _ga=GA1; other=1'
    expect(adCookieNames(jar).sort()).toEqual(['_fbc', '_fbp', '_gcl_au', '_gcl_aw', '_uetsid', '_uetvid', 'li_adsid', 'li_fat_id'])
  })
})
