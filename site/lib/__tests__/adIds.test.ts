import {describe, it, expect} from 'vitest'
import {AD_ID_SHAPES, CLICK_IDS, adSafeAddress, adVendors, isLiveHost, usableAdIds} from '@/lib/adIds'

// The advertising IDs Site Settings holds (monorepo WS-AD-PIXELS-DESIGN-2026-10-15 §2): only an ID of the right shape
// is ever used, the shapes and click IDs come from the vendor list, and tags load only on the firm's own address and
// on an address that carries nothing a visitor typed.

describe('usableAdIds', () => {
  it('keeps each ID of the right shape, trimmed', () => {
    expect(usableAdIds({metaPixelId: ' 123456789012345 ', googleAdsId: 'AW-1234567890', microsoftUetId: '12345678',
      linkedInPartnerId: '1234567'})).toEqual({
      metaPixelId: '123456789012345', googleAdsId: 'AW-1234567890', microsoftUetId: '12345678', linkedInPartnerId: '1234567'})
  })

  it('drops an ID of the wrong shape, and anything that is not an ID', () => {
    expect(usableAdIds({metaPixelId: '12345', googleAdsId: 'G-ABC1234', microsoftUetId: 'abc', linkedInPartnerId: ''})).toEqual({})
    expect(usableAdIds({metaPixelId: '<script>1</script>', doNotSellLink: true})).toEqual({})
    expect(usableAdIds(null)).toEqual({})
  })

  it('reads every shape and click ID from the vendor list', () => {
    expect(Object.keys(AD_ID_SHAPES).sort()).toEqual(['googleAdsId', 'linkedInPartnerId', 'metaPixelId', 'microsoftUetId'])
    expect(CLICK_IDS).toEqual(['fbclid', 'gclid', 'gbraid', 'wbraid', 'msclkid', 'li_fat_id'])
  })
})

describe('adVendors', () => {
  it('names the vendors the site would load, in a fixed order', () => {
    expect(adVendors({linkedInPartnerId: '1234567', metaPixelId: '123456789012345'})).toEqual(['meta', 'linkedin'])
    expect(adVendors({})).toEqual([])
  })
})

describe('where advertising tags may load', () => {
  it("only on the firm's own address", () => {
    expect(isLiveHost('www.firm.example', 'www.firm.example')).toBe(true)
    expect(isLiveHost('WWW.FIRM.EXAMPLE', 'www.firm.example')).toBe(true)
    expect(isLiveHost('staging-preview.firm.test', 'www.firm.example')).toBe(false)
    expect(isLiveHost('localhost', '')).toBe(false)
  })

  it('only on an address that carries click IDs and campaign tags, nothing a visitor typed', () => {
    expect(adSafeAddress('')).toBe(true)
    expect(adSafeAddress('?gclid=abc&utm_source=google&utm_campaign=dui')).toBe(true)
    expect(adSafeAddress('?fbclid=x&msclkid=y&li_fat_id=z&gbraid=w')).toBe(true)
    expect(adSafeAddress('?q=custody')).toBe(false)
    expect(adSafeAddress('?gclid=abc&name=Pat')).toBe(false)
  })
})
