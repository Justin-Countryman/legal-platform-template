import {describe, it, expect} from 'vitest'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {render, screen} from '@testing-library/react'
import {formatHourForDisplay, OfficeHours} from '../shared'

// Monorepo BI/OUTSTANDING.md item 254 — a law firm's contact details read
// "08:00 – 17:00" in the footer of every page, on every client, since before
// the platform had a scraper.
//
// The trap in the item is that ONE stored field feeds TWO consumers that want
// different things from it. The CRM parses it and `openingHoursSpecification`
// requires 24-hour ISO, so the STORED format is correct and settled; only the
// footer is wrong. These tests pin both halves: the footer converts, and the
// JSON-LD does not.

describe('formatHourForDisplay — 24-hour storage → 12-hour display', () => {
  it('converts the stored zero-padded 24-hour values the scraper writes', () => {
    expect(formatHourForDisplay('08:00')).toBe('8:00 AM')
    expect(formatHourForDisplay('17:00')).toBe('5:00 PM')
    expect(formatHourForDisplay('09:00')).toBe('9:00 AM')
    expect(formatHourForDisplay('23:00')).toBe('11:00 PM')
  })

  // The two values a 12-hour clock gets wrong if it just does `h % 12`.
  it('noon is 12:00 PM, not 0:00 PM', () => {
    expect(formatHourForDisplay('12:00')).toBe('12:00 PM')
    expect(formatHourForDisplay('12:30')).toBe('12:30 PM')
    expect(formatHourForDisplay('12:59')).toBe('12:59 PM')
  })

  it('midnight is 12:00 AM, not 0:00 AM', () => {
    expect(formatHourForDisplay('00:00')).toBe('12:00 AM')
    expect(formatHourForDisplay('00:30')).toBe('12:30 AM')
  })

  it('carries the minutes through unrounded', () => {
    expect(formatHourForDisplay('08:30')).toBe('8:30 AM')
    expect(formatHourForDisplay('17:45')).toBe('5:45 PM')
    expect(formatHourForDisplay('13:05')).toBe('1:05 PM')
  })

  it('accepts an unpadded hour, since only the scraper guarantees padding', () => {
    expect(formatHourForDisplay('8:00')).toBe('8:00 AM')
    expect(formatHourForDisplay('9:15')).toBe('9:15 AM')
  })

  it('trims surrounding whitespace before parsing', () => {
    expect(formatHourForDisplay(' 08:00 ')).toBe('8:00 AM')
  })

  // The footer was originally written to print whatever it was handed, and that
  // has to survive. A legacy record holding arbitrary text must render as the
  // operator wrote it — NOT as "NaN:00 AM" and NOT as an empty cell.
  it('returns a non-HH:MM value untouched rather than mangling it', () => {
    // The template's own design-studio fixture, DesignStudioClient.tsx:2117.
    expect(formatHourForDisplay('8:30am')).toBe('8:30am')
    expect(formatHourForDisplay('5:30pm')).toBe('5:30pm')
    expect(formatHourForDisplay('8:00 AM')).toBe('8:00 AM')
    expect(formatHourForDisplay('By appointment')).toBe('By appointment')
    expect(formatHourForDisplay('9-5')).toBe('9-5')
    expect(formatHourForDisplay('0800')).toBe('0800')
    expect(formatHourForDisplay('08:00:00')).toBe('08:00:00')
  })

  it('leaves an out-of-range clock value alone instead of wrapping it', () => {
    // 24:00 and 25:00 are not times this can render; printing "12:00 PM" for
    // 24:00 would invent a fact about the firm's hours.
    expect(formatHourForDisplay('24:00')).toBe('24:00')
    expect(formatHourForDisplay('25:30')).toBe('25:30')
    expect(formatHourForDisplay('08:60')).toBe('08:60')
  })

  it('renders an empty string for an absent value, as the old code did', () => {
    expect(formatHourForDisplay(null)).toBe('')
    expect(formatHourForDisplay(undefined)).toBe('')
    expect(formatHourForDisplay('')).toBe('')
  })
})

// buildHoursRows is not exported, so the grouping contract is asserted through
// the component that is — which is also the one all six footers render.
const NINE_TO_FIVE = {
  mondayStatus: 'Open', mondayOpen: '08:00', mondayClose: '17:00',
  tuesdayStatus: 'Open', tuesdayOpen: '08:00', tuesdayClose: '17:00',
  wednesdayStatus: 'Open', wednesdayOpen: '08:00', wednesdayClose: '17:00',
  thursdayStatus: 'Open', thursdayOpen: '08:00', thursdayClose: '17:00',
  fridayStatus: 'Open', fridayOpen: '08:00', fridayClose: '17:00',
  saturdayStatus: 'Closed', sundayStatus: 'Closed',
}

describe('OfficeHours — the rendered footer block', () => {
  it('renders 12-hour times, which is the defect in item 254', () => {
    render(<OfficeHours hours={NINE_TO_FIVE} />)
    expect(screen.getByText('8:00 AM – 5:00 PM')).toBeTruthy()
    expect(screen.queryByText('08:00 – 17:00')).toBeNull()
  })

  // Consecutive days with identical hours collapse to one row. Changing the
  // string is exactly the kind of edit that breaks this, because the collapse
  // is driven by comparing the built strings.
  it('still collapses consecutive identical days into a range', () => {
    render(<OfficeHours hours={NINE_TO_FIVE} />)
    expect(screen.getByText('Mon–Fri')).toBeTruthy()
    expect(screen.getByText('Sat–Sun')).toBeTruthy()
    expect(screen.queryByText('Tue')).toBeNull()
  })

  it('does not collapse days whose hours actually differ', () => {
    render(
      <OfficeHours
        hours={{
          ...NINE_TO_FIVE,
          wednesdayOpen: '08:00', wednesdayClose: '12:00',
        }}
      />,
    )
    expect(screen.getByText('Mon–Tue')).toBeTruthy()
    expect(screen.getByText('Wed')).toBeTruthy()
    expect(screen.getByText('8:00 AM – 12:00 PM')).toBeTruthy()
    expect(screen.getByText('Thu–Fri')).toBeTruthy()
  })

  it('prints an unparseable legacy value as written', () => {
    render(
      <OfficeHours
        hours={{
          mondayStatus: 'Open', mondayOpen: '8:30am', mondayClose: '5:30pm',
          tuesdayStatus: 'Closed', wednesdayStatus: 'Closed',
          thursdayStatus: 'Closed', fridayStatus: 'Closed',
          saturdayStatus: 'Closed', sundayStatus: 'Closed',
        }}
      />,
    )
    expect(screen.getByText('8:30am – 5:30pm')).toBeTruthy()
  })

  it('renders Closed days as Closed', () => {
    render(<OfficeHours hours={NINE_TO_FIVE} />)
    expect(screen.getByText('Closed')).toBeTruthy()
  })
})

// ─── The regression that matters ──────────────────────────────────────────────
//
// schema.org requires 24-hour ISO in opens/closes. If someone later "makes the
// structured data match the footer", every client emits invalid LocalBusiness
// hours and nothing visibly breaks. This asserts against the shipped source
// because buildOpeningHours is module-private to a server component that cannot
// be imported here.
describe('buildOpeningHours keeps passing the RAW stored value (item 254)', () => {
  const pagePath = path.resolve(__dirname, '../../../../app/(site)/[...slug]/page.tsx')
  const source = readFileSync(pagePath, 'utf-8')

  it('emits opens/closes straight from the record, unformatted', () => {
    expect(source).toContain('opens: d.open,')
    expect(source).toContain('closes: d.close,')
  })

  it('does not reach into the footer module for a display formatter', () => {
    expect(source).not.toContain('formatHourForDisplay')
    expect(source).not.toContain('footers/shared')
  })
})
