import {describe, it, expect} from 'vitest'
import {
  derivePrimaryAolSlug,
  deriveCurrentChildSlug,
  sortAolsByNavOrder,
} from '../sidebarHierarchy'

// WS-Sidebar Phase 2.3 — pure helpers powering the 4-scenario context-aware
// hierarchy logic. Doctrine: BI/BI-Sidebar.md §1.
//
// Each helper is a pure function; tests run as plain TypeScript without any
// DOM / Sanity client / pathname-provider scaffolding.

// ─── derivePrimaryAolSlug ─────────────────────────────────────────────────────

describe('derivePrimaryAolSlug', () => {
  const AOLS = ['family-law', 'criminal-defense', 'estate-planning'] as const

  it('returns the matching slug when the first URL segment is an AOL', () => {
    expect(derivePrimaryAolSlug('/family-law/', AOLS)).toBe('family-law')
  })

  it('matches at any depth — first segment is what counts', () => {
    expect(derivePrimaryAolSlug('/family-law/divorce/', AOLS)).toBe('family-law')
    expect(derivePrimaryAolSlug('/family-law/divorce/contested/', AOLS)).toBe('family-law')
  })

  it('returns null when the first segment is not in the AOL list (Scenario 4)', () => {
    expect(derivePrimaryAolSlug('/about/', AOLS)).toBeNull()
    expect(derivePrimaryAolSlug('/blog/some-post/', AOLS)).toBeNull()
  })

  it('returns null for the homepage / empty pathname', () => {
    expect(derivePrimaryAolSlug('/', AOLS)).toBeNull()
    expect(derivePrimaryAolSlug('', AOLS)).toBeNull()
  })

  it('returns null when pathname is null or undefined', () => {
    expect(derivePrimaryAolSlug(null, AOLS)).toBeNull()
    expect(derivePrimaryAolSlug(undefined, AOLS)).toBeNull()
  })

  it('returns null when the AOL list is empty', () => {
    expect(derivePrimaryAolSlug('/family-law/', [])).toBeNull()
  })

  it('tolerates pathnames without a leading slash', () => {
    expect(derivePrimaryAolSlug('family-law/divorce', AOLS)).toBe('family-law')
  })

  it('tolerates pathnames with a query string or hash', () => {
    expect(derivePrimaryAolSlug('/family-law/?utm=x', AOLS)).toBe('family-law')
    expect(derivePrimaryAolSlug('/family-law/#section', AOLS)).toBe('family-law')
  })

  it('does NOT match prefix collisions ("/family-law-extra/" is not /family-law/)', () => {
    expect(derivePrimaryAolSlug('/family-law-extra/', AOLS)).toBeNull()
  })
})

// ─── deriveCurrentChildSlug ───────────────────────────────────────────────────

describe('deriveCurrentChildSlug', () => {
  const CHILDREN = ['family-law/divorce', 'family-law/adoption', 'family-law/custody'] as const

  it('returns the matching child slug when the visitor is on a direct child', () => {
    expect(deriveCurrentChildSlug('/family-law/divorce/', 'family-law', CHILDREN)).toBe(
      'family-law/divorce',
    )
  })

  it('returns null when the visitor is on the AOL parent page (no 2nd segment)', () => {
    expect(deriveCurrentChildSlug('/family-law/', 'family-law', CHILDREN)).toBeNull()
  })

  it('returns null when the visitor is on a non-matching AOL', () => {
    expect(deriveCurrentChildSlug('/criminal-defense/dui/', 'family-law', CHILDREN)).toBeNull()
  })

  it('matches the child by terminal segment regardless of grandchild depth in URL', () => {
    // Visitor on a grandchild page: /family-law/divorce/contested/. Still
    // identifies 'divorce' as the current child.
    expect(
      deriveCurrentChildSlug('/family-law/divorce/contested/', 'family-law', CHILDREN),
    ).toBe('family-law/divorce')
  })

  it('returns null when the 2nd segment is not in the child list', () => {
    expect(
      deriveCurrentChildSlug('/family-law/mediation/', 'family-law', CHILDREN),
    ).toBeNull()
  })

  it('returns null when pathname is null / empty', () => {
    expect(deriveCurrentChildSlug(null, 'family-law', CHILDREN)).toBeNull()
    expect(deriveCurrentChildSlug('', 'family-law', CHILDREN)).toBeNull()
  })

  it('returns null when the child list is empty', () => {
    expect(deriveCurrentChildSlug('/family-law/divorce/', 'family-law', [])).toBeNull()
  })
})

// ─── sortAolsByNavOrder ───────────────────────────────────────────────────────

describe('sortAolsByNavOrder', () => {
  const A = {_id: 'a', title: 'Family Law'}
  const B = {_id: 'b', title: 'Criminal Defense'}
  const C = {_id: 'c', title: 'Estate Planning'}
  const D = {_id: 'd', title: 'Business Law'}

  it('sorts by orderedAolIds positions when all AOLs are listed', () => {
    const out = sortAolsByNavOrder([A, B, C], ['c', 'a', 'b'])
    expect(out.map((x) => x._id)).toEqual(['c', 'a', 'b'])
  })

  it('appends unlisted AOLs alphabetically after the ordered ones', () => {
    // A and C are ordered; B and D are unlisted → B (Criminal Defense) before
    // D (Business Law)? No — alphabetical by title: B = 'Criminal Defense',
    // D = 'Business Law' → D first.
    const out = sortAolsByNavOrder([A, B, C, D], ['c', 'a'])
    expect(out.map((x) => x._id)).toEqual(['c', 'a', 'd', 'b'])
  })

  it('returns alphabetical order when orderedAolIds is empty', () => {
    const out = sortAolsByNavOrder([A, B, C, D], [])
    // Titles alphabetical: Business Law (D), Criminal Defense (B),
    // Estate Planning (C), Family Law (A).
    expect(out.map((x) => x._id)).toEqual(['d', 'b', 'c', 'a'])
  })

  it('returns [] for an empty AOL list', () => {
    expect(sortAolsByNavOrder([], ['a', 'b'])).toEqual([])
  })

  it('ignores orderedAolIds entries that do not match any AOL (stale refs)', () => {
    const out = sortAolsByNavOrder([A, B], ['stale-id', 'b', 'a'])
    expect(out.map((x) => x._id)).toEqual(['b', 'a'])
  })

  it('does not mutate the input array', () => {
    const input = [A, B, C]
    const before = [...input]
    sortAolsByNavOrder(input, ['c', 'a', 'b'])
    expect(input).toEqual(before)
  })
})
