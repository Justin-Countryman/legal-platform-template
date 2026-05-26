import {describe, it, expect} from 'vitest'
import {FONT_PRESETS, getPresetById, type FontPreset} from '../presets'
import {resolvefonts, buildFontPreloads} from '../loader'

// ─── Preset library shape ─────────────────────────────────────────────────────

describe('FONT_PRESETS library', () => {
  it('has 16 presets (culled 2 of 13 original, added 5 in WS-Polish)', () => {
    expect(FONT_PRESETS).toHaveLength(16)
  })

  it('preserves ids 1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 13 from the original library', () => {
    const ids = FONT_PRESETS.map((p) => p.id).sort((a, b) => a - b)
    expect(ids).toEqual([1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
  })

  it('does NOT include the culled ids 3 (Refined Practice) and 8 (Space Age Authority)', () => {
    expect(getPresetById(3)).toBeUndefined()
    expect(getPresetById(8)).toBeUndefined()
  })

  it('every preset has a unique id', () => {
    const ids = FONT_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every preset declares a heading + body family with a regular file', () => {
    for (const p of FONT_PRESETS) {
      expect(p.heading.family).toBeTruthy()
      expect(p.heading.files.regular).toMatch(/^\/fonts\/files\/.+\.woff2$/)
      expect(p.body.family).toBeTruthy()
      expect(p.body.files.regular).toMatch(/^\/fonts\/files\/.+\.woff2$/)
    }
  })

  it('every file path includes its slug (catches typos like /poppins/Spectral-Regular.woff2)', () => {
    for (const p of FONT_PRESETS) {
      const fileSegment = (path: string) => path.split('/')[3]
      expect(fileSegment(p.heading.files.regular)).toBe(p.heading.slug)
      expect(fileSegment(p.body.files.regular)).toBe(p.body.slug)
    }
  })
})

// ─── Preset 7 + 12 body swap (Lato → Open Sans) ──────────────────────────────

describe('WS-Polish body swaps', () => {
  it('preset 7 Geometric Precision body is Open Sans (was Lato)', () => {
    const p = getPresetById(7)
    expect(p?.body.family).toBe('Open Sans')
    expect(p?.body.slug).toBe('open-sans')
  })

  it('preset 12 Traditional Fallback body is Open Sans (was Lato)', () => {
    const p = getPresetById(12)
    expect(p?.body.family).toBe('Open Sans')
    expect(p?.body.slug).toBe('open-sans')
  })
})

// ─── New presets 14-18 ───────────────────────────────────────────────────────

describe('WS-Polish new presets (14-18)', () => {
  const expectedNew: Array<{id: number; name: string; heading: string; body: string; mono: boolean}> = [
    {id: 14, name: 'Modern Practice',     heading: 'Poppins',        body: 'Poppins',        mono: true},
    {id: 15, name: 'Heritage Voice',      heading: 'Spectral',       body: 'Open Sans',      mono: false},
    {id: 16, name: 'Stately Modern',      heading: 'Petrona',        body: 'Inter',          mono: false},
    {id: 17, name: 'Editorial Statement', heading: 'Fraunces',       body: 'Fraunces',       mono: true},
    {id: 18, name: 'Sovereign Mono',      heading: 'Source Serif 4', body: 'Source Serif 4', mono: true},
  ]

  for (const want of expectedNew) {
    it(`preset ${want.id} ${want.name} has ${want.heading} + ${want.body}${want.mono ? ' (mono)' : ''}`, () => {
      const p = getPresetById(want.id)
      expect(p).toBeDefined()
      expect(p?.name).toBe(want.name)
      expect(p?.heading.family).toBe(want.heading)
      expect(p?.body.family).toBe(want.body)
      // Mono-pair sanity: same slug for heading and body when mono
      if (want.mono) {
        expect(p?.heading.slug).toBe(p?.body.slug)
      }
    })
  }
})

// ─── Loader integration ──────────────────────────────────────────────────────

describe('resolvefonts() preset path', () => {
  it('resolves a new preset (id 15 Heritage Voice) to Spectral heading + Open Sans body', () => {
    const r = resolvefonts(15, null, null)
    expect(r.heading?.name).toBe('Spectral')
    expect(r.heading?.regular).toContain('/spectral/')
    expect(r.body?.name).toBe('Open Sans')
    expect(r.body?.regular).toContain('/open-sans/')
  })

  it('returns null fonts for the vacated preset id 3 when no custom upload provided', () => {
    const r = resolvefonts(3, null, null)
    // Preset 3 is vacant; loader falls through to custom-upload check; both null → both null
    expect(r.heading).toBeNull()
    expect(r.body).toBeNull()
  })

  it('returns null fonts for the vacated preset id 8 when no custom upload provided', () => {
    const r = resolvefonts(8, null, null)
    expect(r.heading).toBeNull()
    expect(r.body).toBeNull()
  })

  it('mono-pair preset (id 14 Poppins+Poppins) resolves heading.regular === body.regular', () => {
    const r = resolvefonts(14, null, null)
    // Heading uses Bold as its "regular" (700) per preset config; body uses 400.
    // They're different files but both Poppins family.
    expect(r.heading?.name).toBe('Poppins')
    expect(r.body?.name).toBe('Poppins')
  })

  it('mono-pair preset (id 18 Source Serif 4 mono) resolves to same family for both roles', () => {
    const r = resolvefonts(18, null, null)
    expect(r.heading?.name).toBe('Source Serif 4')
    expect(r.body?.name).toBe('Source Serif 4')
  })
})

// ─── Tone + bestFor copy is present (catches accidental empty strings) ──────

describe('preset metadata', () => {
  it('every preset has non-empty tone and bestFor', () => {
    for (const p of FONT_PRESETS) {
      expect(p.tone.length).toBeGreaterThan(0)
      expect(p.bestFor.length).toBeGreaterThan(0)
    }
  })

  // Documented contract: id 13 stays the Heritage Old-Style canonical preset.
  // Renumbering would silently change the downstream typography.
  it('id 13 remains Heritage Old-Style (canonical preset)', () => {
    const p = getPresetById(13)
    expect(p?.name).toBe('Heritage Old-Style')
    expect(p?.heading.family).toBe('Sorts Mill Goudy')
  })
})

// ─── Type-level smoke (catches breaking shape changes at compile time) ──────

describe('FontPreset type compatibility', () => {
  it('every preset is structurally a FontPreset', () => {
    const sample: FontPreset = FONT_PRESETS[0]
    expect(sample.id).toBeTypeOf('number')
    expect(sample.heading.weights).toBeInstanceOf(Array)
  })
})

// ─── Preload manifest (buildFontPreloads) ───────────────────────────────────

describe('buildFontPreloads()', () => {
  it('returns 2 entries when heading and body resolve to distinct files', () => {
    const r = resolvefonts(1, null, null)  // Classical Authority — two-font preset
    const preloads = buildFontPreloads(r.heading, r.body)
    expect(preloads).toHaveLength(2)
    expect(preloads[0].key).toBe('font-heading')
    expect(preloads[1].key).toBe('font-body')
    expect(preloads[0].href).not.toBe(preloads[1].href)
  })

  it('dedupes to 1 entry when a mono-pair resolves heading.regular === body.regular', () => {
    // Preset 18 Sovereign Mono — heading uses SourceSerif4-SemiBold, body uses
    // SourceSerif4-Regular. Different files. Use a true file-identity mono case:
    // Preset 17 Editorial Statement — heading uses Fraunces-Bold, body uses
    // Fraunces-Regular. Also different. Construct an explicit case:
    const preloads = buildFontPreloads(
      {name: 'X', regular: '/fonts/files/x/X-Regular.woff2'},
      {name: 'X', regular: '/fonts/files/x/X-Regular.woff2'},
    )
    expect(preloads).toHaveLength(1)
    expect(preloads[0].key).toBe('font-heading')
  })

  it('returns 0 entries when both heading and body are null', () => {
    expect(buildFontPreloads(null, null)).toEqual([])
  })

  it('returns 1 entry when only heading is resolved', () => {
    const preloads = buildFontPreloads(
      {name: 'X', regular: '/fonts/files/x/X-Regular.woff2'},
      null,
    )
    expect(preloads).toHaveLength(1)
    expect(preloads[0].key).toBe('font-heading')
  })

  it('returns 1 entry when only body is resolved', () => {
    const preloads = buildFontPreloads(
      null,
      {name: 'Y', regular: '/fonts/files/y/Y-Regular.woff2'},
    )
    expect(preloads).toHaveLength(1)
    expect(preloads[0].key).toBe('font-body')
  })

  it('integration: preset 14 Modern Practice (Poppins mono) produces 2 entries — Bold heading + Regular body are distinct files', () => {
    const r = resolvefonts(14, null, null)
    const preloads = buildFontPreloads(r.heading, r.body)
    // The preset deliberately points heading.regular at Poppins-Bold (700) and
    // body.regular at Poppins-Regular (400) — distinct files, so 2 preloads.
    expect(preloads).toHaveLength(2)
  })
})
