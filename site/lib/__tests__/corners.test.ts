import {describe, expect, it} from 'vitest'
import {BUTTON_SHAPE_MAP, UI_RADIUS_MAP} from '../designTokens'
import {CORNER_FAMILIES, DEFAULT_CORNERS, cornersMismatch, matchCornerFamily} from '../corners'

// [R-473]: five corner families, cards and buttons matched; a button rounder than
// its card is a mismatch unless it is a pill.

describe('the corner families', () => {
  it('are the five Justin approved, in order', () => {
    expect(CORNER_FAMILIES.map((f) => f.name)).toEqual(['Sharp', 'Crisp', 'Balanced', 'Soft', 'Round'])
  })

  it('name only stored values the token builder knows', () => {
    for (const f of CORNER_FAMILIES) {
      expect(Object.keys(UI_RADIUS_MAP), f.name).toContain(f.uiRadius)
      expect(Object.keys(BUTTON_SHAPE_MAP), f.name).toContain(f.buttonShape)
    }
  })

  it('are all consistent by the rule, and all different', () => {
    for (const f of CORNER_FAMILIES) expect(cornersMismatch(f.uiRadius, f.buttonShape), f.name).toBe(false)
    expect(new Set(CORNER_FAMILIES.map((f) => `${f.uiRadius}/${f.buttonShape}`)).size).toBe(CORNER_FAMILIES.length)
  })

  it('the default pair, and an untouched site, is Balanced, not "Custom"', () => {
    expect(matchCornerFamily(DEFAULT_CORNERS.uiRadius, DEFAULT_CORNERS.buttonShape)?.id).toBe('balanced')
    expect(matchCornerFamily(null, undefined)?.id).toBe('balanced')
  })

  it('a button rounder than its card is a mismatch (the fixture on 2026-09-18: rounded cards, stadium buttons)', () => {
    expect(cornersMismatch('rounded', 'stadium')).toBe(true)
    expect(matchCornerFamily('rounded', 'stadium')).toBeNull()
    expect(cornersMismatch('sharp', 'rounded')).toBe(true)
  })

  it('a pill is never a mismatch, and a squarer button never is', () => {
    for (const ui of Object.keys(UI_RADIUS_MAP)) expect(cornersMismatch(ui, 'pill'), ui).toBe(false)
    expect(cornersMismatch('soft', 'square')).toBe(false)
  })
})
