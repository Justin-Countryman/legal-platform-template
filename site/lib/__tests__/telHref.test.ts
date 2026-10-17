import {describe, it, expect} from 'vitest'
import {formatPhone, isPhoneToken, telHref} from '@/lib/tokens'

// Monorepo backlog 519: a phone a page's text holds is a tap-to-call link. Its href is in RFC 3966's global form
// (§5.1: "All phone numbers MUST use the global form unless they cannot be represented as such"), read 2026-10-16,
// written compact as the platform's call button already writes it (`phone_button`, monorepo [R-608]). Challenged by
// ADV-519: a link that dials the wrong number is worse than text, so anything it cannot read stays text.

describe('telHref', () => {
  it('writes a North American number in the global form, whatever shape it is stored in', () => {
    for (const raw of ['612-555-0100', '(612) 555-0100', '6125550100', '+16125550100', '1-612-555-0100', '+1 612.555.0100']) {
      expect(telHref(raw)).toBe('tel:+16125550100')
    }
  })

  it('takes the first number, leaving an extension or a second number off', () => {
    expect(telHref('612-555-0100 ext. 12')).toBe('tel:+16125550100')
    expect(telHref('(612) 555-0100 x12')).toBe('tel:+16125550100')
    expect(telHref('612-555-0100 or 612-555-0101')).toBe('tel:+16125550100')
  })

  it('keeps an international number global', () => {
    expect(telHref('+44 20 7946 0958')).toBe('tel:+442079460958')
    expect(telHref('+65 6123 4567')).toBe('tel:+6561234567')
  })

  it('leaves as text what it cannot dial for certain', () => {
    for (const raw of ['', null, 'call us', '1-800-LAWYERS', '555-0100', '+1 612 555 010']) {
      expect(telHref(raw)).toBe('')
    }
  })
})

describe('formatPhone', () => {
  it('formats a North American number and passes any other international one through', () => {
    expect(formatPhone('+16125550100')).toBe('612-555-0100')
    expect(formatPhone('+65 6123 4567')).toBe('+65 6123 4567')
    expect(formatPhone('+64 9 123 4567')).toBe('+64 9 123 4567')
  })
})

describe('isPhoneToken', () => {
  it('names the phone tokens, and never a fax', () => {
    for (const key of ['primaryPhone', 'primaryTollFree', 'office.phone', 'office.emergency',
      'location.loc-1.phone', 'location.loc-1.emergency']) {
      expect(isPhoneToken(key)).toBe(true)
    }
    for (const key of ['office.fax', 'location.loc-1.fax', 'firmName', 'office.emergencyLabel', 'office.city', '']) {
      expect(isPhoneToken(key)).toBe(false)
    }
  })
})
