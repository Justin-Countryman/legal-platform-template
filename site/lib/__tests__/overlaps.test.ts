import {describe, expect, it} from 'vitest'
import fieldMap from '../../../studio/field-map.json'
import {OVERLAPS, PHOTO_RISE, readOverlap, raisesPhotos} from '../overlaps'
import {SECTION_SPACING, TIGHT_SPACING} from '../sectionSurface'

// ─── Overlap (Phase 16E, `[R-499]`) ───────────────────────────────────────────
//
// The library, and the one arithmetic property that makes `[R-475]` a construction
// guarantee rather than a hope: the band above grows its bottom padding by exactly
// the rem number the photo rises. The cancellation of the band's own top padding and
// its divider happens in CSS (`photo-rise`), because a divider's depth is a `clamp()`
// no fixed step can follow — the design's first shape used fixed steps and drew an
// overlap of MINUS 32 to MINUS 3 pixels at every width from 768 to 1920.

const designRows = (fieldMap as {types: Record<string, {fields: {path: string; options?: {list?: unknown[]}}[]}>})
  .types.designSettings.fields

describe('the overlap library', () => {
  it('offers exactly what the schema offers', () => {
    const row = designRows.find((f) => f.path === 'sectionOverlap')
    expect(row, 'designSettings.sectionOverlap').toBeTruthy()
    const schema = (row?.options?.list ?? []).map((o) => (typeof o === 'string' ? o : (o as {value: string}).value))
    expect([...schema].sort()).toEqual([...OVERLAPS].sort())
  })

  it('carries no initialValue: a seed could never be told from a choice (item 308)', () => {
    expect(designRows.find((f) => f.path === 'sectionOverlap')).not.toHaveProperty('initialValue')
  })

  it('reads a stored value the way the site does', () => {
    expect(readOverlap('photo')).toBe('photo')
    for (const v of ['panel', 'both', 'on', 'yes', '', null, undefined, 0, 1, [], {}]) {
      expect(readOverlap(v), String(v)).toBe('none')
    }
    expect(raisesPhotos('photo')).toBe(true)
    expect(raisesPhotos('panel')).toBe(false)
  })

  it('the band above grows by EXACTLY the rise, at every preset and every breakpoint', () => {
    const rem = (c: string) => Number(c.replace(/^[a-z]*:?pb-/, '')) / 4
    const rise = Number(PHOTO_RISE.replace('rem', ''))
    for (const [name, steps] of [...Object.entries(SECTION_SPACING), ['tight', TIGHT_SPACING] as const]) {
      const bottom = steps.bottom.split(/\s+/)
      const grown = steps.bottomBeforeOverlap.photo.split(/\s+/)
      expect(grown.length, name).toBe(bottom.length)
      grown.forEach((c, i) => {
        const prefix = (s: string) => (s.includes(':') ? s.split(':')[0] : '')
        expect(prefix(c), `${name} breakpoint`).toBe(prefix(bottom[i]))
        // Phones stack flat, so the phone step is unchanged; every step from `md` grows
        // by the rise and by nothing else.
        expect(rem(c) - rem(bottom[i]), `${name} ${c}`).toBe(prefix(c) === '' ? 0 : rise)
      })
    }
  })

  it('names one `band-pt-*` utility per spacing preset, and nothing arbitrary', () => {
    const vars = [...Object.values(SECTION_SPACING), TIGHT_SPACING].map((s) => s.ptVar)
    expect(vars).toEqual(['band-pt-compact', 'band-pt-normal', 'band-pt-spacious', 'band-pt-tight'])
    expect(vars.filter((v) => v.includes('['))).toEqual([])
  })
})
