/**
 * The `/service-area/` index card shows the city ALONE.
 *
 * Doctrine: `BI/BI-Workflow.md` → "SERVICE AREA PAGES: the four surfaces",
 * ruled by Justin 2026-07-28.
 *
 * What shipped before it: the card projected `coalesce(hero.heading, title)`,
 * and `hero.heading` carried the FIRM'S primary office city, so nine live
 * Dudley cards read "Mendota Heights Blaine Law Firm" and the like. The index
 * also buckets its A-Z filter and runs its search on the card label, so all
 * nine cities sat under M and filtering by B returned nothing.
 *
 * The A-Z assertions below are the reason this file tests more than one
 * function: bucketing was never a separate defect, and pinning that it falls
 * out of the label is what stops someone "fixing" it separately later.
 */

import {describe, expect, it} from 'vitest'
import {cityFromServiceAreaSlug, SERVICE_AREA_SLUG_SUFFIX} from '../serviceAreaCity'

// Dudley's nine, as stored. Real slugs, not invented ones.
const DUDLEY = [
  'service-area/blaine-law-firm',
  'service-area/bloomington-law-firm',
  'service-area/burnsville-law-firm',
  'service-area/eagan-law-firm',
  'service-area/eden-prairie-law-firm',
  'service-area/roseville-law-firm',
  'service-area/st-paul-law-firm',
  'service-area/white-bear-lake-law-firm',
  'service-area/woodbury-law-firm',
]

describe('cityFromServiceAreaSlug', () => {
  it('returns the city alone, with no "Law Firm" and no "Law Office"', () => {
    expect(cityFromServiceAreaSlug('service-area/blaine-law-firm')).toBe('Blaine')
    expect(cityFromServiceAreaSlug('service-area/woodbury-law-firm')).toBe('Woodbury')
  })

  it('never carries the firm office city that used to prefix the label', () => {
    for (const slug of DUDLEY) {
      expect(cityFromServiceAreaSlug(slug)).not.toContain('Mendota Heights')
      expect(cityFromServiceAreaSlug(slug)).not.toMatch(/Law (Firm|Office)/)
    }
  })

  it('title-cases a multi-word city the way the stored page name does', () => {
    expect(cityFromServiceAreaSlug('service-area/white-bear-lake-law-firm')).toBe(
      'White Bear Lake',
    )
    expect(cityFromServiceAreaSlug('service-area/eden-prairie-law-firm')).toBe(
      'Eden Prairie',
    )
  })

  it('reads a bare leaf, a trailing slash and mixed case', () => {
    expect(cityFromServiceAreaSlug('blaine-law-firm')).toBe('Blaine')
    expect(cityFromServiceAreaSlug('/Service-Area/Eagan-Law-Firm/')).toBe('Eagan')
  })

  it('returns empty rather than guessing when the ruled suffix is absent', () => {
    // Empty is what makes the route fall back to the stored page name. A wrong
    // place name on a live card is worse than a plain one.
    for (const slug of ['service-area/blaine', 'about-us', '', '/', 'law-firm']) {
      expect(cityFromServiceAreaSlug(slug)).toBe('')
    }
    expect(cityFromServiceAreaSlug(`service-area/${SERVICE_AREA_SLUG_SUFFIX}`)).toBe('')
  })

  it('handles null and undefined without throwing', () => {
    expect(cityFromServiceAreaSlug(null)).toBe('')
    expect(cityFromServiceAreaSlug(undefined)).toBe('')
  })
})

describe('the A-Z filter follows from the label', () => {
  // The index computes `new Set(pages.map(p => p.displayName.charAt(0)))` and
  // filters on the same expression. These assertions are about that expression
  // applied to the new label, which is why no change to the component was
  // needed and why none should be added.
  const buckets = (labels: string[]) =>
    new Set(labels.map((l) => l.charAt(0).toUpperCase()))

  it('buckets each city under its own letter', () => {
    const labels = DUDLEY.map(cityFromServiceAreaSlug)
    expect(buckets(labels)).toEqual(new Set(['B', 'E', 'R', 'S', 'W']))
  })

  it('reproduces the old collapse, so the assertion above can fail', () => {
    // The literal strings the site served on 2026-07-28.
    const old = DUDLEY.map((s) => `Mendota Heights ${cityFromServiceAreaSlug(s)} Law Firm`)
    expect(buckets(old)).toEqual(new Set(['M']))
  })

  it('finds Blaine when a visitor searches for it', () => {
    const labels = DUDLEY.map(cityFromServiceAreaSlug)
    const hits = labels.filter((l) => l.toLowerCase().includes('blaine'))
    expect(hits).toEqual(['Blaine'])
  })
})
