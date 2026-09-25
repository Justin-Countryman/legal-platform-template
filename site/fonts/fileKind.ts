// ─── Is a font file variable? ─────────────────────────────────────────────────
// Read from the file's own table directory, without decompressing it: a variable font
// carries an `fvar` table. Used by the committed-file tests (fonts/__tests__/presets.test.ts)
// and by the Studio's check on an uploaded font (studio/schemas/documents/designSettings.ts),
// so the check that guards the committed files is the one that guards an upload. Browser-safe:
// bytes in, no Node API (Phase 17C, monorepo WS-V1-PHASE17C2A-DESIGN §7.6 amendment 4).

export type FontFileKind = 'variable' | 'static' | 'unknown'

// WOFF2 (W3C WOFF2 §5.2): a 48-byte header with numTables at 12; per table a flags byte whose
// low six bits index this list (63: a four-byte tag follows), a UIntBase128 length, and a
// second one when the table is transformed (glyf and loca at transform version 0, any other
// table at a non-zero version).
const WOFF2_KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG',
  'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC',
  'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc',
  'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
]

const ascii = (b: Uint8Array, at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3])
const u16 = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1]

/** One entry of a font's table directory: its tag, and for WOFF2 the length it takes in the
 *  decompressed stream (the transformed length where the table is transformed). */
export type FontTable = {tag: string; length: number}

/** The table directory of a WOFF2, WOFF or bare OpenType file, or null when the bytes are
 *  none of them or end before the directory does. */
export function fontTables(bytes: Uint8Array): FontTable[] | null {
  try {
    const signature = ascii(bytes, 0)
    if (signature === 'wOF2') {
      let o = 48
      const base128 = () => {
        let v = 0
        for (let i = 0; i < 5; i++) {
          const b = bytes[o++]
          if (b === undefined) throw new Error('short')
          v = v * 128 + (b & 0x7f)
          if (!(b & 0x80)) return v
        }
        throw new Error('bad UIntBase128')
      }
      const tables: FontTable[] = []
      for (let i = 0, n = u16(bytes, 12); i < n; i++) {
        const flags = bytes[o++]
        let tag: string
        if ((flags & 0x3f) === 63) { tag = ascii(bytes, o); o += 4 } else tag = WOFF2_KNOWN_TAGS[flags & 0x3f]
        let length = base128()
        const version = flags >> 6
        if (tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0) length = base128()
        tables.push({tag, length})
      }
      return tables
    }
    // WOFF 1: a 44-byte header, numTables at 12, 20-byte entries. Bare OpenType: numTables
    // at 4, 16-byte entries from 12.
    const woff = signature === 'wOFF'
    const opentype = signature === 'OTTO' || signature === 'true' || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)
    if (!woff && !opentype) return null
    const n = u16(bytes, woff ? 12 : 4)
    const start = woff ? 44 : 12
    const size = woff ? 20 : 16
    if (bytes.length < start + n * size) return null
    return Array.from({length: n}, (_, i) => ({tag: ascii(bytes, start + i * size), length: 0}))
  } catch {
    return null
  }
}

export function fontFileKind(bytes: Uint8Array): FontFileKind {
  const tables = fontTables(bytes)
  if (!tables) return 'unknown'
  return tables.some((t) => t.tag === 'fvar') ? 'variable' : 'static'
}

// The Studio's read of an uploaded file: its first bytes, from the asset CDN. Sanity
// re-validates the whole document on every edit and Publish waits for validation to finish,
// so the read is cached per URL (an asset's URL never changes its bytes) and gives up after
// four seconds: a slow or unreachable CDN costs one wait and never holds Publish. A failed
// read is forgotten, so the next validation tries again.
const kinds = new Map<string, Promise<FontFileKind>>()

export function readFontKind(url: string, load: typeof fetch = fetch, timeoutMs = 4000): Promise<FontFileKind> {
  const known = kinds.get(url)
  if (known) return known
  const read = load(url, {headers: {Range: 'bytes=0-8191'}, signal: AbortSignal.timeout(timeoutMs)})
    .then(async (res): Promise<FontFileKind> => (res.ok ? fontFileKind(new Uint8Array(await res.arrayBuffer())) : 'unknown'))
    .catch((): FontFileKind => {
      kinds.delete(url)
      return 'unknown'
    })
  kinds.set(url, read)
  return read
}

/** What the Studio says about an upload's "Variable font" box against the file itself, or
 *  null when they agree. Never blocks Publish (`[R-162]`); an unreadable file says nothing. */
export function variableUploadWarning(kind: FontFileKind, ticked: boolean, heavierUploaded: boolean): string | null {
  if (kind === 'variable' && !ticked) {
    return 'This Regular file is a variable font: tick "Variable font" so every weight draws from it. Left off, it draws at regular weight only.'
  }
  if (kind === 'static' && ticked) {
    return 'This Regular file is not a variable font, so it cannot draw other weights: untick "Variable font" and upload the weights as separate files.'
  }
  if (ticked && heavierUploaded) {
    return 'While "Variable font" is ticked, the Bold and Semibold files are not used: the variable Regular file draws every weight.'
  }
  return null
}
