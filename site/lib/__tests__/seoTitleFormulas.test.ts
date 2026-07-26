import {describe, expect, it} from 'vitest'
import {
  SERVICE_AREA_INDEX_PAGE_NAME,
  aboutPageTitle,
  composeTitle,
  locationPageName,
  resolveTitle,
} from '../seoTitle'

/**
 * The per-type formulas built 2026-07-26. Doctrine: `BI-Content.md` § Title
 * tags, TITLE-10, TITLE-11 and the About row of the case table.
 *
 * The rendered proof lives outside the suite (a real Next server, recorded in
 * the commit). These pin the shapes and, more importantly, the degradation
 * paths — a missing city is the case nobody renders by hand.
 */

const FIRM = 'Dudley & Smith, P.A.'

describe('TITLE-10 — service area index', () => {
  it('is a fixed page name', () => {
    expect(SERVICE_AREA_INDEX_PAGE_NAME).toBe('Areas We Serve')
  })
  it('composes with the firm name like any other page name', () => {
    expect(composeTitle(SERVICE_AREA_INDEX_PAGE_NAME, FIRM))
      .toBe('Areas We Serve - Dudley & Smith, P.A.')
  })
})

describe('TITLE-11 — location page', () => {
  it('is the city and state, then Law Office', () => {
    expect(locationPageName('Woodbury', 'MN')).toBe('Woodbury, MN Law Office')
  })
  it('drops the comma when there is no state rather than emitting one', () => {
    expect(locationPageName('Woodbury', '')).toBe('Woodbury Law Office')
  })
  it('returns empty with no city, so the caller can fall back', () => {
    // A "  , MN Law Office" title is worse than the page's own name.
    expect(locationPageName('', 'MN')).toBe('')
    expect(locationPageName(null, null)).toBe('')
  })
})

describe('the about page formula', () => {
  it('puts the firm in the middle and closes on Law Firm', () => {
    expect(aboutPageTitle(FIRM, 'Saint Paul'))
      .toBe('About Dudley & Smith, P.A. - Saint Paul Law Firm')
  })

  it('is a NAMED EXCEPTION to TITLE-2 — it does not end with the firm name', () => {
    // Recorded as an assertion because the obvious "fix" is to make it match
    // TITLE-2, and that would be wrong: the shape is what was ruled.
    expect(aboutPageTitle(FIRM, 'Saint Paul').endsWith(FIRM)).toBe(false)
  })

  it('returns empty when either half is missing', () => {
    expect(aboutPageTitle(FIRM, '')).toBe('')
    expect(aboutPageTitle('', 'Saint Paul')).toBe('')
  })
})

describe('every formula still loses to a stored cell (TITLE-1)', () => {
  const tokens = null
  it('about', () => {
    const {title} = resolveTitle('Meet Our Team | Dudley & Smith', 'About', tokens, FIRM,
      aboutPageTitle(FIRM, 'Saint Paul'))
    expect(title).toEqual({absolute: 'Meet Our Team | Dudley & Smith'})
  })
  it('location', () => {
    const {title} = resolveTitle('Our Woodbury Office', locationPageName('Woodbury', 'MN'), tokens, FIRM)
    expect(title).toEqual({absolute: 'Our Woodbury Office'})
  })
  it('and the complete-title path is used only when there is no cell', () => {
    const {title} = resolveTitle(null, 'About', tokens, FIRM, aboutPageTitle(FIRM, 'Saint Paul'))
    expect(title).toEqual({absolute: 'About Dudley & Smith, P.A. - Saint Paul Law Firm'})
  })
  it('the label stays the page name so the social card is unaffected', () => {
    const {label} = resolveTitle(null, 'About', tokens, FIRM, aboutPageTitle(FIRM, 'Saint Paul'))
    expect(label).toBe('About')
  })
})
