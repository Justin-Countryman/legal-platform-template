import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
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

  it('the band above grows by EXACTLY the rise, at every preset, from the breakpoint the photo rises at', () => {
    // Phase 17C session 3 (`[R-548]`): under `lg` the split stacks as on a phone, so the photo rises from
    // `lg` (ContentSectionBlock's `lg:photo-rise`), and under it the band above keeps its own padding; a
    // growth left at `md` drew 64 px of empty ground above a photo that no longer rose (ADV-17C3-T).
    const source = readFileSync(resolve(__dirname, '../../components/sections/ContentSectionBlock.tsx'), 'utf8')
    const from = [...source.matchAll(/\b(\w+):photo-rise\b/g)].map((m) => m[1])
    expect(new Set(from)).toEqual(new Set(['lg']))
    const rise = Number(PHOTO_RISE.replace('rem', ''))
    // The padding a responsive class list sets at a breakpoint: its last step at or under it, in rem.
    const at = (classes: string, bp: '' | 'md' | 'lg') => {
      const order = ['', 'md', 'lg']
      let rem = NaN
      for (const c of classes.split(/\s+/)) {
        const prefix = c.includes(':') ? c.split(':')[0] : ''
        if (order.indexOf(prefix) <= order.indexOf(bp)) rem = Number(c.replace(/^[a-z]*:?pb-/, '')) / 4
      }
      return rem
    }
    for (const [name, steps] of [...Object.entries(SECTION_SPACING), ['tight', TIGHT_SPACING] as const]) {
      const {bottom} = steps
      const grown = steps.bottomBeforeOverlap.photo
      expect(at(grown, ''), `${name} on a phone`).toBe(at(bottom, ''))
      expect(at(grown, 'md'), `${name} on a tablet`).toBe(at(bottom, 'md'))
      expect(at(grown, 'lg') - at(bottom, 'lg'), `${name} from lg`).toBe(rise)
    }
  })

  it('names one `band-pt-*` utility per spacing preset, and nothing arbitrary', () => {
    const vars = [...Object.values(SECTION_SPACING), TIGHT_SPACING].map((s) => s.ptVar)
    expect(vars).toEqual(['band-pt-compact', 'band-pt-normal', 'band-pt-spacious', 'band-pt-tight'])
    expect(vars.filter((v) => v.includes('['))).toEqual([])
  })
})
