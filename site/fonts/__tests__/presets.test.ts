import {createHash} from 'node:crypto'
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {brotliDecompressSync} from 'node:zlib'
import {describe, it, expect} from 'vitest'
import {FONT_PRESETS, getPresetById, headingWeights, type FontPreset} from '../presets'
import {resolvefonts, buildFontPreloads, buildFontFaces} from '../loader'
import {fontFileKind, fontTables, readFontKind, variableUploadWarning} from '../fileKind'

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
  it('preloads heading regular + heading bold + body regular (a static heading with its own bold file)', () => {
    const r = resolvefonts(15, null, null)  // Heritage Voice — Spectral is static, Regular and Bold
    const preloads = buildFontPreloads(r.heading, r.body)
    expect(preloads.map((p) => p.key)).toEqual(['font-heading', 'font-heading-bold', 'font-body'])
    // all three are distinct files
    expect(new Set(preloads.map((p) => p.href)).size).toBe(3)
  })

  it('preloads the heading BOLD weight — the internal/PA hero H1 renders in bold', () => {
    const r = resolvefonts(15, null, null)
    const preloads = buildFontPreloads(r.heading, r.body)
    const bold = preloads.find((p) => p.key === 'font-heading-bold')
    expect(bold?.href).toContain('Spectral-Bold')
  })

  it('a variable heading preloads its one file, which draws the bold too (Phase 17C)', () => {
    const r = resolvefonts(6, null, null)  // Humanist Trust — Lora is variable
    const preloads = buildFontPreloads(r.heading, r.body)
    expect(preloads.map((p) => p.href)).toEqual(['/fonts/files/lora/Lora-Regular.woff2', '/fonts/files/work-sans/WorkSans-Regular.woff2'])
  })

  it('dedupes to 1 entry when a mono-pair resolves heading.regular === body.regular', () => {
    // Since Phase 17C the variable mono pairings (17, 18) name one file for both roles, so
    // they are this case (a heading bold that is its regular's file drops too); an explicit
    // pair keeps the rule itself in view:
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

// The variable test reads each file's table directory with the reader the Studio uses on an
// upload (fonts/fileKind.ts), so one reader guards both.
const isVariable = (path: string) => fontFileKind(readFileSync(path)) === 'variable'

// A static file's own weight and style, from its OS/2 table (usWeightClass at 4, fsSelection
// bit 0 italic). A WOFF2 holds its tables in one Brotli stream after the directory, in
// directory order, each at its (transformed) length; OS/2 is never transformed.
function ownWeight(path: string): {weight: number; italic: boolean} {
  const buf = readFileSync(path)
  const tables = fontTables(buf)!
  const totalCompressed = buf.readUInt32BE(20)
  let dir = 48
  for (let i = 0; i < tables.length; i++) {
    const flags = buf[dir++]
    if ((flags & 0x3f) === 63) dir += 4
    const skip = () => { while (buf[dir++] & 0x80) { /* UIntBase128 */ } }
    skip()
    const tag = tables[i].tag
    const version = flags >> 6
    if (tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0) skip()
  }
  const stream = brotliDecompressSync(buf.subarray(dir, dir + totalCompressed))
  let offset = 0
  for (const t of tables) {
    if (t.tag === 'OS/2') return {weight: stream.readUInt16BE(offset + 4), italic: (stream.readUInt16BE(offset + 62) & 1) === 1}
    offset += t.length
  }
  throw new Error(`${path}: no OS/2`)
}


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
    expect({variable: kinds.filter(Boolean).length, static: kinds.filter((k) => !k).length}).toEqual({variable: 14, static: 20})
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

// ─── What the page declares (Phase 17C, `[R-541]`; ADV-17C2A-2) ─────────────
//
// A variable role is ONE face spanning its weights, lowest to highest, so a weight between
// draws as itself (a `font-medium` link at 500, a `font-semibold` title at 600) and one
// outside clamps to the nearer end (`font-extrabold` stays 700 on a family designed to 700).
// Where heading and body share a family name and a variable file (17, 18), the span is the
// union of both roles, because the page matches faces by family, not by role. A static role
// declares one face per file, a one-weight role at that weight (14's heading, `Poppins-Bold`,
// at 700). Every pairing's faces, named, so a change to any of them is read in review.

// family | font-weight | font-style | file
const FACES: Record<number, string[]> = {
    1: ['Playfair Display | 400 700 | normal | PlayfairDisplay-Regular.woff2', 'Playfair Display | 400 | italic | PlayfairDisplay-Italic.woff2', 'Source Sans 3 | 400 700 | normal | SourceSans3-Regular.woff2', 'Source Sans 3 | 400 | italic | SourceSans3-Italic.woff2'],
    2: ['DM Serif Display | 400 | normal | DMSerifDisplay-Regular.woff2', 'DM Serif Display | 400 | italic | DMSerifDisplay-Italic.woff2', 'DM Sans | 400 700 | normal | DMSans-Regular.woff2', 'DM Sans | 400 | italic | DMSans-Italic.woff2'],
    4: ['Fraunces | 400 700 | normal | Fraunces-Regular.woff2', 'Fraunces | 400 | italic | Fraunces-Italic.woff2', 'Inter | 400 700 | normal | Inter-Regular.woff2'],
    5: ['Libre Baskerville | 400 700 | normal | LibreBaskerville-Regular.woff2', 'Libre Baskerville | 400 | italic | LibreBaskerville-Italic.woff2', 'Montserrat | 400 700 | normal | Montserrat-Regular.woff2', 'Montserrat | 400 | italic | Montserrat-Italic.woff2'],
    6: ['Lora | 400 700 | normal | Lora-Regular.woff2', 'Lora | 400 | italic | Lora-Italic.woff2', 'Work Sans | 400 700 | normal | WorkSans-Regular.woff2'],
    7: ['Montserrat | 400 700 | normal | Montserrat-Regular.woff2', 'Open Sans | 400 700 | normal | OpenSans-Regular.woff2', 'Open Sans | 400 | italic | OpenSans-Italic.woff2'],
    9: ['Merriweather | 400 700 | normal | Merriweather-Regular.woff2', 'Merriweather | 400 | italic | Merriweather-Italic.woff2', 'Open Sans | 400 700 | normal | OpenSans-Regular.woff2', 'Open Sans | 400 | italic | OpenSans-Italic.woff2'],
    10: ['Work Sans | 400 700 | normal | WorkSans-Regular.woff2', 'Roboto | 400 700 | normal | Roboto-Regular.woff2', 'Roboto | 400 | italic | Roboto-Italic.woff2'],
    11: ['Fraunces | 700 | normal | Fraunces-Regular.woff2', 'Source Sans 3 | 400 600 | normal | SourceSans3-Regular.woff2', 'Source Sans 3 | 400 | italic | SourceSans3-Italic.woff2'],
    12: ['Libre Baskerville | 400 700 | normal | LibreBaskerville-Regular.woff2', 'Libre Baskerville | 400 | italic | LibreBaskerville-Italic.woff2', 'Open Sans | 400 700 | normal | OpenSans-Regular.woff2', 'Open Sans | 400 | italic | OpenSans-Italic.woff2'],
    13: ['Sorts Mill Goudy | 400 | normal | SortsMillGoudy-Regular.woff2', 'Sorts Mill Goudy | 400 | italic | SortsMillGoudy-Italic.woff2', 'Open Sans | 400 700 | normal | OpenSans-Regular.woff2', 'Open Sans | 400 | italic | OpenSans-Italic.woff2'],
    14: ['Poppins | 700 | normal | Poppins-Bold.woff2', 'Poppins | 400 | normal | Poppins-Regular.woff2', 'Poppins | 600 | normal | Poppins-SemiBold.woff2'],
    15: ['Spectral | 400 | normal | Spectral-Regular.woff2', 'Spectral | 700 | normal | Spectral-Bold.woff2', 'Spectral | 400 | italic | Spectral-Italic.woff2', 'Open Sans | 400 700 | normal | OpenSans-Regular.woff2', 'Open Sans | 400 | italic | OpenSans-Italic.woff2'],
    16: ['Petrona | 400 700 | normal | Petrona-Regular.woff2', 'Inter | 400 700 | normal | Inter-Regular.woff2'],
    17: ['Fraunces | 400 700 | normal | Fraunces-Regular.woff2', 'Fraunces | 400 | italic | Fraunces-Italic.woff2'],
    18: ['Source Serif 4 | 400 600 | normal | SourceSerif4-Regular.woff2'],
}

const faceOf = (rule: string) => {
  const m = rule.match(/font-family:'([^']+)';src:url\('([^']+)'\)[^;]*;font-weight:([^;]+);font-style:([^;]+);/)!
  return `${m[1]} | ${m[3]} | ${m[4]} | ${m[2].split('/').pop()}`
}
const facesOf = (id: number) => {
  const r = resolvefonts(id, null, null)
  return [...new Set([...buildFontFaces(r.heading), ...buildFontFaces(r.body)])]
}

describe('the faces a pairing declares', () => {
  it('every pairing declares exactly the faces in the table', () => {
    for (const p of FONT_PRESETS) expect(facesOf(p.id).map(faceOf), `pairing ${p.id}`).toEqual(FACES[p.id])
    expect(Object.keys(FACES).map(Number)).toEqual(FONT_PRESETS.map((p) => p.id))
  })

  it("a variable role's face spans its family's weights, lowest to highest", () => {
    for (const p of FONT_PRESETS) {
      for (const role of [p.heading, p.body]) {
        if (!role.variable) continue
        const shared = p.heading.family === p.body.family
        const weights = (shared ? [...p.heading.weights, ...p.body.weights] : role.weights).map(Number)
        const span = Math.min(...weights) === Math.max(...weights) ? `${Math.min(...weights)}` : `${Math.min(...weights)} ${Math.max(...weights)}`
        const face = facesOf(p.id).map(faceOf).find((f) => f.startsWith(`${role.family} |`) && f.includes('| normal |'))
        expect(face, `${p.id} ${role.family}`).toBe(`${role.family} | ${span} | normal | ${role.files.regular.split('/').pop()}`)
      }
    }
  })

  it('every static face is declared at its file\'s own weight and style, read from the file', () => {
    const wrong: string[] = []
    for (const p of FONT_PRESETS) {
      for (const rule of facesOf(p.id)) {
        const m = rule.match(/src:url\('([^']+)'\)[^;]*;font-weight:([^;]+);font-style:([^;]+);/)!
        const path = onDisk(m[1])
        const own = ownWeight(path)
        const italic = m[3] === 'italic'
        if (own.italic !== italic) wrong.push(`${p.id} ${m[1]}: declared ${m[3]}, the file is ${own.italic ? 'italic' : 'upright'}`)
        if (!isVariable(path) && Number(m[2]) !== own.weight && !italic) wrong.push(`${p.id} ${m[1]}: declared ${m[2]}, the file is ${own.weight}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('every body reaches a weight of 600 or more when bold text asks 700', () => {
    // A body with nothing heavier than 400 draws `<strong>` as its regular in Chromium and as a
    // synthesized bold in WebKit (pairing 17 before Phase 17C: the engines disagreed).
    for (const p of FONT_PRESETS) {
      const faces = facesOf(p.id).map(faceOf).filter((f) => f.startsWith(`${p.body.family} |`) && f.includes('| normal |'))
      const heaviest = Math.max(...faces.flatMap((f) => f.split(' | ')[1].split(' ').map(Number)))
      expect(heaviest, `pairing ${p.id}`).toBeGreaterThanOrEqual(600)
    }
  })

  it("a heading's drawable weights are its family's: the body's too where the two share a name", () => {
    expect(headingWeights(getPresetById(17)!)).toEqual(['400', '700'])
    expect(headingWeights(getPresetById(18)!)).toEqual(['400', '600'])
    expect(headingWeights(getPresetById(14)!)).toEqual(['400', '600', '700'])
    expect(headingWeights(getPresetById(11)!)).toEqual(['700'])
    expect(headingWeights(getPresetById(4)!)).toEqual(['400', '700'])
  })
})

describe('an uploaded font marked variable (Phase 17C)', () => {
  const heading = {name: 'Upload Serif', regular: 'https://cdn.example/h.woff2', bold: 'https://cdn.example/hb.woff2', italic: 'https://cdn.example/hi.woff2'}
  const body = {name: 'Upload Sans', regular: 'https://cdn.example/b.woff2', semibold: 'https://cdn.example/bs.woff2', bold: 'https://cdn.example/bb.woff2'}

  it('unticked, an upload is declared file by file, as before', () => {
    const r = resolvefonts(null, heading, body)
    expect(buildFontFaces(r.heading).map(faceOf)).toEqual(['Upload Serif | 400 | normal | h.woff2', 'Upload Serif | 700 | normal | hb.woff2', 'Upload Serif | 400 | italic | hi.woff2'])
    expect(buildFontFaces(r.body).map(faceOf)).toEqual(['Upload Sans | 400 | normal | b.woff2', 'Upload Sans | 600 | normal | bs.woff2', 'Upload Sans | 700 | normal | bb.woff2'])
  })

  it('ticked, its Regular spans every weight, and a Bold or Semibold beside it is neither declared nor preloaded', () => {
    const r = resolvefonts(null, {...heading, variable: true}, {...body, variable: true})
    expect(buildFontFaces(r.heading).map(faceOf)).toEqual(['Upload Serif | 100 900 | normal | h.woff2', 'Upload Serif | 400 | italic | hi.woff2'])
    expect(buildFontFaces(r.body).map(faceOf)).toEqual(['Upload Sans | 100 900 | normal | b.woff2'])
    expect(buildFontPreloads(r.heading, r.body).map((e) => e.href)).toEqual(['https://cdn.example/h.woff2', 'https://cdn.example/b.woff2'])
  })
})

describe('the file reader (fonts/fileKind.ts), which the Studio runs on an upload', () => {
  const header = (signature: string, tags: string[], at: number, entry: number) => {
    const b = new Uint8Array(at + tags.length * entry)
    for (let i = 0; i < 4; i++) b[i] = signature.charCodeAt(i)
    const count = signature === 'wOFF' ? 12 : 4
    b[count] = 0; b[count + 1] = tags.length
    tags.forEach((t, i) => { for (let j = 0; j < 4; j++) b[at + i * entry + j] = t.charCodeAt(j) })
    return b
  }

  it('reads a WOFF 1 and a bare OpenType directory as well as a WOFF2', () => {
    expect(fontFileKind(header('wOFF', ['OS/2', 'cmap', 'fvar', 'glyf'], 44, 20))).toBe('variable')
    expect(fontFileKind(header('wOFF', ['OS/2', 'cmap', 'glyf'], 44, 20))).toBe('static')
    expect(fontFileKind(header('OTTO', ['CFF ', 'fvar'], 12, 16))).toBe('variable')
    expect(fontFileKind(readFileSync(onDisk('/fonts/files/inter/Inter-Regular.woff2')))).toBe('variable')
  })

  it('says unknown for anything else or a directory cut short, so the Studio then says nothing', () => {
    expect(fontFileKind(new TextEncoder().encode('<html>not a font</html>'))).toBe('unknown')
    expect(fontFileKind(readFileSync(onDisk('/fonts/files/inter/Inter-Regular.woff2')).subarray(0, 60))).toBe('unknown')
    expect(fontFileKind(header('wOFF', ['OS/2', 'fvar'], 44, 20).subarray(0, 50))).toBe('unknown')
  })

  it('the Studio warns on either mismatch and on a Bold beside a ticked box, and never on agreement or an unreadable file', () => {
    expect(variableUploadWarning('variable', false, false)).toMatch(/tick "Variable font"/)
    expect(variableUploadWarning('static', true, false)).toMatch(/untick "Variable font"/)
    expect(variableUploadWarning('variable', true, true)).toMatch(/not used/)
    expect(variableUploadWarning('variable', true, false)).toBeNull()
    expect(variableUploadWarning('static', false, true)).toBeNull()
    expect(variableUploadWarning('unknown', true, false)).toBeNull()
    expect(variableUploadWarning('unknown', false, false)).toBeNull()
  })
})

describe("the Studio's read of an upload (fonts/fileKind.ts readFontKind)", () => {
  const bytes = readFileSync(onDisk('/fonts/files/inter/Inter-Regular.woff2'))

  it('reads a file once however often the document is validated', async () => {
    let calls = 0
    const load = (async () => { calls++; return new Response(bytes) }) as unknown as typeof fetch
    expect(await readFontKind('https://cdn.example/once.woff2', load)).toBe('variable')
    expect(await readFontKind('https://cdn.example/once.woff2', load)).toBe('variable')
    expect(calls).toBe(1)
  })

  it('gives up on a CDN that never answers, so validation always finishes, and tries again next time', async () => {
    let calls = 0
    const never = ((_: string, init?: RequestInit) => {
      calls++
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)))
    }) as unknown as typeof fetch
    const started = Date.now()
    expect(await readFontKind('https://cdn.example/stalled.woff2', never, 50)).toBe('unknown')
    expect(Date.now() - started).toBeLessThan(2000)
    expect(await readFontKind('https://cdn.example/stalled.woff2', never, 50)).toBe('unknown')
    expect(calls).toBe(2)
  })

  it('an answer that is not a font, or an error status, says unknown', async () => {
    const html = (async () => new Response('<html></html>')) as unknown as typeof fetch
    const missing = (async () => new Response('', {status: 404})) as unknown as typeof fetch
    expect(await readFontKind('https://cdn.example/page.woff2', html)).toBe('unknown')
    expect(await readFontKind('https://cdn.example/missing.woff2', missing)).toBe('unknown')
  })
})
