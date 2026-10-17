import {describe, expect, it} from 'vitest'
import {openingHoursSpecification, streetAddress} from '../structuredData'

// Monorepo backlog 517, read 2026-10-16: schema.org's dayOfWeek expects a DayOfWeek, and Google's LocalBusiness
// guidance lists https://schema.org/Monday and the like ("Mo" is no DayOfWeek); its PostalAddress example carries the
// suite in streetAddress, which the footer prints and the firm's Organization dropped.

describe('openingHoursSpecification', () => {
  it('names each open day as a schema.org DayOfWeek', () => {
    const specs = openingHoursSpecification({
      mondayStatus: 'Open', mondayOpen: '08:30', mondayClose: '17:00',
      saturdayStatus: 'Closed', saturdayOpen: '', saturdayClose: '',
      sundayStatus: 'Open', sundayOpen: '10:00', sundayClose: '',
    })
    expect(specs).toEqual([
      {'@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Monday', opens: '08:30', closes: '17:00'},
    ])
    expect(openingHoursSpecification(null)).toBeUndefined()
  })
})

describe('streetAddress', () => {
  it('keeps the suite and leaves the building name off', () => {
    expect(streetAddress({address1: '1 Main St', address2: 'Suite 200'})).toBe('1 Main St, Suite 200')
    expect(streetAddress({address1: '1 Main St', address2: null})).toBe('1 Main St')
    expect(streetAddress({address1: '', address2: ''})).toBe('')
  })
})
