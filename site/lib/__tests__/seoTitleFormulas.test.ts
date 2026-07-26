import {describe, expect, it} from 'vitest'
import {
  SERVICE_AREA_INDEX_PAGE_NAME,
  aboutPageTitle,
  areaOfLawPageName,
  composeTitle,
  geoHubPageName,
  geoSpokePageName,
  homepageTitle,
  locationPageName,
  resolveTitle,
  serviceAreaPageName,
  splitGeoHubTitle,
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

describe('TITLE-7 — the homepage built from practice scope', () => {
  it('one area of law uses that area\'s stored phrase, then the firm', () => {
    expect(homepageTitle(['Personal Injury'], FIRM, 'Saint Paul'))
      .toBe('Personal Injury Lawyer - Dudley & Smith, P.A.')
  })

  it('more than one uses the firm, then the city and a legal term', () => {
    expect(homepageTitle(['Family Law', 'Personal Injury'], FIRM, 'Saint Paul'))
      .toBe('Dudley & Smith, P.A. - Saint Paul Law Firm')
  })

  it('a LONE area with no stored phrase takes the second shape, not a guess', () => {
    // Dudley has seven such top-level areas. `Appellate Law Attorney` is the
    // derivation TITLE-4 rejected, so the firm-name shape is used instead.
    expect(homepageTitle(['Appellate Law'], FIRM, 'Saint Paul'))
      .toBe('Dudley & Smith, P.A. - Saint Paul Law Firm')
  })

  it('returns empty with no city and no single phrase, so the route falls back', () => {
    expect(homepageTitle(['Appellate Law'], FIRM, '')).toBe('')
    expect(homepageTitle([], FIRM, '')).toBe('')
  })

  it('a single phrased area does NOT need a city', () => {
    expect(homepageTitle(['Tax Law'], FIRM, '')).toBe('Tax Attorney - Dudley & Smith, P.A.')
  })
})

describe('TITLE-9 — service area page', () => {
  it('is the city then the primary phrase, when primary is unambiguous', () => {
    expect(serviceAreaPageName('Woodbury', ['Personal Injury']))
      .toBe('Woodbury Personal Injury Lawyer')
  })

  it('RETURNS EMPTY for a multi-area firm — primary is not determinable', () => {
    // Nothing in Sanity records which area of law ranks first. Guessing would
    // put a confidently wrong phrase on every service area page of every
    // multi-area client. See BI-Content.md TITLE-9.
    expect(serviceAreaPageName('Woodbury', ['Family Law', 'Personal Injury'])).toBe('')
  })

  it('returns empty when the lone area has no stored phrase', () => {
    expect(serviceAreaPageName('Woodbury', ['Appellate Law'])).toBe('')
  })

  it('returns empty with no city', () => {
    expect(serviceAreaPageName('', ['Personal Injury'])).toBe('')
  })
})

describe('a practice area page: area-of-law level versus beneath one', () => {
  it('at area-of-law level uses the stored phrase', () => {
    expect(areaOfLawPageName('Personal Injury', false)).toBe('Personal Injury Lawyer')
  })

  it('BENEATH an area of law gets nothing, so it falls back to its page name', () => {
    // Ruled 2026-07-26: no derived formula and no stored list for the 195.
    // `Car Accidents` renders `Car Accidents - <firm>` and that is accepted;
    // the operator corrects individual pages in Sanity.
    expect(areaOfLawPageName('Car Accidents', true)).toBe('')
  })

  it('BOTH conditions are required — a phrased title beneath a parent gets nothing', () => {
    // `/business-law/tax-law/` is titled `Tax Law`, which IS one of the
    // fifteen. The parent check is what stops it taking the phrase.
    expect(areaOfLawPageName('Tax Law', true)).toBe('')
    expect(areaOfLawPageName('Tax Law', false)).toBe('Tax Attorney')
  })

  it('a top-level area with no stored phrase gets nothing', () => {
    // Seven of Dudley's fourteen. `Workers Compensation` misses
    // `Workers' Compensation` by an apostrophe, which is a real client case.
    expect(areaOfLawPageName('Appellate Law', false)).toBe('')
    expect(areaOfLawPageName('Workers Compensation', false)).toBe('')
  })
})

describe('TITLE-8 — splitting a geo hub title', () => {
  it('splits city from area of law on a word boundary', () => {
    expect(splitGeoHubTitle('Woodbury Personal Injury'))
      .toEqual({city: 'Woodbury', areaOfLaw: 'Personal Injury'})
  })

  it('handles a multi-word city', () => {
    expect(splitGeoHubTitle('Saint Louis Park Family Law'))
      .toEqual({city: 'Saint Louis Park', areaOfLaw: 'Family Law'})
  })

  it('handles the apostrophe area', () => {
    expect(splitGeoHubTitle("Woodbury Workers' Compensation"))
      .toEqual({city: 'Woodbury', areaOfLaw: "Workers' Compensation"})
  })

  it('is case-insensitive on the area name', () => {
    expect(splitGeoHubTitle('woodbury personal injury').city).toBe('woodbury')
  })

  // ── The four documented failure modes. Each must land on "no split", so the
  // ── caller falls back to the page name rather than shipping a wrong city.
  it('FAILS on a practice outside the fifteen — the common case', () => {
    expect(splitGeoHubTitle('Woodbury Appellate Law')).toEqual({city: '', areaOfLaw: ''})
  })

  it('FAILS on a practice-first title', () => {
    expect(splitGeoHubTitle('Personal Injury Woodbury')).toEqual({city: '', areaOfLaw: ''})
  })

  it('FAILS when there is no city', () => {
    expect(splitGeoHubTitle('Personal Injury')).toEqual({city: '', areaOfLaw: ''})
  })

  it('requires a word boundary, so a fused word does not match', () => {
    expect(splitGeoHubTitle('XPersonal Injury')).toEqual({city: '', areaOfLaw: ''})
  })

  it('empty in, empty out', () => {
    expect(splitGeoHubTitle('')).toEqual({city: '', areaOfLaw: ''})
    expect(splitGeoHubTitle(null)).toEqual({city: '', areaOfLaw: ''})
  })
})

describe('TITLE-8 — the two geo page shapes', () => {
  it('a hub is the city then the practice phrase', () => {
    expect(geoHubPageName('Woodbury Personal Injury')).toBe('Woodbury Personal Injury Lawyer')
  })

  it('a spoke is the city from its HUB then its own page name', () => {
    expect(geoSpokePageName('Woodbury Personal Injury', 'Car Accidents'))
      .toBe('Woodbury Car Accidents')
  })

  it('a spoke name is used VERBATIM — TITLE-5 was retired, so no phrase lookup', () => {
    // `Tax Law` is one of the fifteen, but a spoke gets no phrase for it.
    expect(geoSpokePageName('Woodbury Business Law', 'Tax Law')).toBe('Woodbury Tax Law')
  })

  it('both return empty when the hub title cannot be split', () => {
    expect(geoHubPageName('Woodbury Appellate Law')).toBe('')
    expect(geoSpokePageName('Woodbury Appellate Law', 'Appeals')).toBe('')
  })

  it('a hub whose area has no stored phrase returns empty', () => {
    // Split succeeds only for the fifteen, which all have phrases — so this is
    // guarded rather than reachable today. Asserted so a future sixteenth area
    // added without a phrase cannot ship a bare city as a title.
    expect(geoHubPageName('Woodbury')).toBe('')
  })

  it('a spoke with no name returns empty', () => {
    expect(geoSpokePageName('Woodbury Personal Injury', '')).toBe('')
  })
})
