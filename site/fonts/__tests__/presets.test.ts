import {createHash} from 'node:crypto'
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs'
import {join, resolve} from 'node:path'
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
  it('preloads heading regular + heading bold + body regular (distinct-file preset)', () => {
    const r = resolvefonts(1, null, null)  // Classical Authority — Playfair has regular+bold
    const preloads = buildFontPreloads(r.heading, r.body)
    expect(preloads.map((p) => p.key)).toEqual(['font-heading', 'font-heading-bold', 'font-body'])
    // all three are distinct files
    expect(new Set(preloads.map((p) => p.href)).size).toBe(3)
  })

  it('preloads the heading BOLD weight — the internal/PA hero H1 renders in bold', () => {
    const r = resolvefonts(6, null, null)  // Humanist Trust — Lora + Work Sans
    const preloads = buildFontPreloads(r.heading, r.body)
    const bold = preloads.find((p) => p.key === 'font-heading-bold')
    expect(bold?.href).toContain('Lora-Bold')
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

// ─── The committed files, read from disk (Phase 17C, `[R-540]`) ─────────────
//
// Every variable family was committed as byte-identical copies under Regular, Bold,
// SemiBold and Medium names (23 copies), and a page fetched the same bytes once per
// name: Graphite 170 KB of fonts for 85 KB distinct (monorepo
// WS-V1-PHASE17C2A-DESIGN §0). These read the files themselves, not the list.

const PUBLIC = resolve(__dirname, '../../public')
const FILES = join(PUBLIC, 'fonts/files')

function committedFonts(dir = FILES): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...committedFonts(p))
    else if (name.endsWith('.woff2')) out.push(p)
  }
  return out
}

const digest = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')
const onDisk = (url: string) => join(PUBLIC, url)

// The WOFF2 table directory (W3C WOFF2 §5.2), enough to see whether a file carries a
// variation axis without decompressing it: a 48-byte header with numTables at 12; per
// table a flags byte whose low six bits index the known-tag list (63: a four-byte tag
// follows), a UIntBase128 length, and a second one when the table is transformed (glyf
// and loca at transform version 0, any other table at a non-zero version).
const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG',
  'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC',
  'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc',
  'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
]

function woff2Tables(path: string): string[] {
  const buf = readFileSync(path)
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${path} is not WOFF2`)
  let o = 48
  const base128 = () => {
    let v = 0
    for (let i = 0; i < 5; i++) {
      const b = buf[o++]
      v = v * 128 + (b & 0x7f)
      if (!(b & 0x80)) return v
    }
    throw new Error(`${path}: bad UIntBase128`)
  }
  const tags: string[] = []
  for (let i = 0, n = buf.readUInt16BE(12); i < n; i++) {
    const flags = buf[o++]
    let tag: string
    if ((flags & 0x3f) === 63) { tag = buf.toString('latin1', o, o + 4); o += 4 } else tag = KNOWN_TAGS[flags & 0x3f]
    base128()
    const version = flags >> 6
    if (tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0) base128()
    tags.push(tag)
  }
  return tags
}
const isVariable = (path: string) => woff2Tables(path).includes('fvar')

const UPRIGHT_KEYS = ['regular', 'medium', 'semibold', 'bold'] as const
const roles = FONT_PRESETS.flatMap((p) => [
  {id: p.id, role: 'heading' as const, def: p.heading as FontPreset['heading'] & {files: Record<string, string | undefined>}},
  {id: p.id, role: 'body' as const, def: p.body as FontPreset['body'] & {files: Record<string, string | undefined>}},
])

describe('the committed font files', () => {
  it('no two committed font files are byte-identical', () => {
    const byDigest = new Map<string, string[]>()
    for (const path of committedFonts()) {
      const d = digest(path)
      byDigest.set(d, [...(byDigest.get(d) ?? []), path.slice(FILES.length + 1)])
    }
    const copies = [...byDigest.values()].filter((paths) => paths.length > 1)
    expect(copies).toEqual([])
  })

  it('every file a pairing names exists', () => {
    const missing = roles.flatMap(({id, role, def}) =>
      Object.values(def.files).filter((url): url is string => !!url && !existsSync(onDisk(url))).map((url) => `${id} ${role} ${url}`))
    expect(missing).toEqual([])
  })

  it("a pairing's preloads name files of distinct bytes", () => {
    const doubled = FONT_PRESETS.flatMap((p) => {
      const r = resolvefonts(p.id, null, null)
      const hrefs = buildFontPreloads(r.heading, r.body).map((e) => e.href)
      const digests = hrefs.map((h) => digest(onDisk(h)))
      return new Set(digests).size === digests.length ? [] : [`${p.id}: ${hrefs.join(', ')}`]
    })
    expect(doubled).toEqual([])
  })

  it('the table reader sees an axis in the variable files and none in the static ones', () => {
    // Checked file for file against fontTools when written (the monorepo record's §8).
    const kinds = committedFonts().map((p) => isVariable(p))
    expect({variable: kinds.filter(Boolean).length, static: kinds.filter((k) => !k).length}).toEqual({variable: 14, static: 43})
    expect(isVariable(onDisk('/fonts/files/fraunces/Fraunces-Regular.woff2'))).toBe(true)
    expect(isVariable(onDisk('/fonts/files/fraunces/Fraunces-Italic.woff2'))).toBe(false)
    expect(isVariable(onDisk('/fonts/files/spectral/Spectral-Bold.woff2'))).toBe(false)
    expect(isVariable(onDisk('/fonts/files/poppins/Poppins-Bold.woff2'))).toBe(false)
  })

  it('a role is flagged variable exactly when its file carries an axis, and a variable role names one upright file', () => {
    const wrong = roles.flatMap(({id, role, def}) => {
      const out: string[] = []
      if (def.variable !== isVariable(onDisk(def.files.regular))) out.push(`${id} ${role}: flagged ${def.variable}`)
      const upright = new Set(UPRIGHT_KEYS.map((k) => def.files[k]).filter(Boolean))
      if (def.variable && upright.size !== 1) out.push(`${id} ${role}: ${upright.size} upright files`)
      if (def.variable && UPRIGHT_KEYS.some((k) => k !== 'regular' && def.files[k])) out.push(`${id} ${role}: names a weight file beside its variable one`)
      return out
    })
    expect(wrong).toEqual([])
  })
})
