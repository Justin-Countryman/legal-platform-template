import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {getPresetById} from '../../fonts/presets'
import {matchCornerFamily} from '../corners'
import {PALETTE_PRESETS} from '../palettes'
import {HEADING_LINES} from '../headingLines'
import {
  PICK_DEFAULTS, SIGNATURE_HIGH, THEMES, THEME_DEFAULTS, THEME_FIELDS, THEME_PICKS, drawableWeight, isPlatformDefault,
  matchTheme, readPick, readThemeField, signatureDifferences, signatureOf, swappedPicks, themePatch, updatePatch,
  usesCustomFonts,
  type Theme, type ThemeDoc, type ThemeSettings,
} from '../themes'

// Themes are presets (Phase 16B, [R-469], [R-477], [R-478]): they write settings,
// and the Studio names the one whose values the stored settings equal. These tests
// hold the nine to the schema the Studio actually offers (the generated field map,
// an artifact, not the source), to the corner families, to the fonts, and to the
// matching and the patch the Studio picker runs.
//
// Phase 17B ([R-510], [R-513]): a theme here is a STYLE SET. The six page-level
// fields (the divider and its carry, the texture's ground, the ghost, the overlap,
// the gradient) are the flow layer's (`lib/flows.ts`) and are hidden in the schema
// for one pin: a style set neither writes nor is matched by them, and the tests
// below hold that too.

const fieldMap = JSON.parse(readFileSync(resolve(__dirname, '../../../studio/field-map.json'), 'utf8'))
const designRows: Array<{path: string; options?: {list?: Array<string | number>}; initialValue?: unknown; hidden?: boolean | string}> = fieldMap.types.designSettings.fields
const optionsOf = (field: string) => designRows.find((r) => r.path === field)?.options?.list

// A stored document equal to a theme's settings, the way the picker writes it.
const stored = (s: ThemeSettings): ThemeDoc => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null))

describe('the themes', () => {
  it('ships ten, Granite among them ([R-478], [R-504])', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['canyon', 'graphite', 'walnut', 'dune', 'flint', 'marble', 'linen', 'valley', 'granite', 'quartz'])
  })

  it.each(THEMES.map((t) => [t.name, t] as [string, Theme]))('%s names every field, its picks and an identity', (_, theme) => {
    expect(Object.keys(theme.settings).sort()).toEqual([...THEME_FIELDS].sort())
    expect(Object.keys(theme.picks).sort()).toEqual([...THEME_PICKS].sort())
    expect(theme.feel.length).toBeGreaterThan(10)
    expect(theme.identity.sentence.length).toBeGreaterThan(20)
    expect(theme.identity.recognizers.length).toBeGreaterThanOrEqual(2)
    expect(theme.identity.recognizers.length).toBeLessThanOrEqual(3)
  })

  // Phase 16C ([R-484], [R-485]): the heading line is a pick, so it is held to its
  // library, not to the matched settings. The divider was a pick too until Phase 17B
  // made it the theme's ([R-513]).
  it.each(THEMES.map((t) => [t.name, t] as [string, Theme]))('%s picks from the library, and the Studio offers the pick', (_, theme) => {
    const {headingRule} = theme.picks
    if (headingRule) {
      expect(HEADING_LINES).toContain(headingRule)
      expect(optionsOf('headingRule')).toContain(headingRule)
    }
  })

  // Phase 17B ([R-510]): 17 matched fields and one pick; the six page-level fields are
  // the flow layer's, hidden in the schema, and no style set names or writes them.
  it('has 17 matched fields and one pick, and names none of the six the theme layer took', () => {
    expect(THEME_FIELDS).toHaveLength(17)
    expect(THEME_PICKS).toEqual(['headingRule'])
    const moved = ['sectionJoin', 'dividerCarry', 'patternGround', 'brandGhost', 'sectionOverlap', 'sectionGradient']
    for (const field of moved) {
      expect(THEME_FIELDS).not.toContain(field)
      expect(THEME_PICKS).not.toContain(field)
      expect(designRows.find((r) => r.path === field)?.hidden, `${field} is hidden at this pin`).toBe(true)
      for (const theme of THEMES) {
        expect(theme.settings, `${theme.id}.settings`).not.toHaveProperty(field)
        expect(theme.picks, `${theme.id}.picks`).not.toHaveProperty(field)
        const {set, unset} = themePatch(theme)
        expect(set, `${theme.id} writes ${field}`).not.toHaveProperty(field)
        expect(unset, `${theme.id} clears ${field}`).not.toContain(field)
      }
    }
    // The whole patch is 18 keys (17 matched fields and the one pick), 16 on a site with
    // its own uploaded fonts.
    for (const theme of THEMES) {
      const {set, unset} = themePatch(theme)
      expect(Object.keys(set).length + unset.length, theme.id).toBe(18)
    }
  })

  // A `previous` entry that equals the current settings would name a version that is
  // not one: four became duplicates when the six left (ADV-17B-C F1) and were pruned.
  it('no earlier version of a theme equals its current settings', () => {
    for (const theme of THEMES) {
      for (const [i, version] of theme.previous.entries()) {
        const asCurrent = {...THEME_DEFAULTS, ...version.settings}
        expect(THEME_FIELDS.every((f) => asCurrent[f] === theme.settings[f]), `${theme.id} previous ${i + 1} equals current`).toBe(false)
      }
    }
  })

  it.each(THEMES.map((t) => [t.name, t] as [string, Theme]))('%s writes only values the Studio offers', (_, theme) => {
    for (const field of THEME_FIELDS) {
      const value = theme.settings[field]
      if (value === null) continue
      const list = optionsOf(field)
      expect(list, `${field} has an option list in the schema`).toBeDefined()
      expect(list, `${theme.id}.${field} = ${String(value)}`).toContain(value)
    }
  })

  it('every theme field is a Design Settings field with no seed except the eight the build has always written', () => {
    const seeded = THEME_FIELDS.filter((f) => designRows.find((r) => r.path === f)?.initialValue !== undefined)
    expect(seeded.sort()).toEqual(['buttonAnimation', 'buttonShape', 'elevationStyle', 'marketingScale', 'motionTempo', 'taglineStyle', 'tertiaryStyle', 'uiRadius'])
    for (const f of THEME_FIELDS) expect(designRows.some((r) => r.path === f), f).toBe(true)
  })

  it.each(THEMES.map((t) => [t.name, t] as [string, Theme]))('%s keeps cards and buttons in one corner family ([R-473])', (_, theme) => {
    expect(matchCornerFamily(theme.settings.uiRadius as string, theme.settings.buttonShape as string)).not.toBeNull()
  })

  it.each(THEMES.map((t) => [t.name, t] as [string, Theme]))('%s names a real pairing, and italic words only where the heading has an italic face', (_, theme) => {
    const fonts = getPresetById(Number(theme.settings.fontPairingPreset))
    expect(fonts).toBeDefined()
    if (theme.settings.headingEmphasisStyle === 'italic') expect(fonts!.heading.italic, theme.id).toBe(true)
  })

  it('suggests only palettes that exist, and never writes a color', () => {
    const ids = new Set(PALETTE_PRESETS.map((p) => p.id))
    for (const theme of THEMES) {
      for (const id of theme.suggestedPalettes) expect(ids.has(id), `${theme.id} suggests ${id}`).toBe(true)
      expect(Object.keys(theme.settings).some((k) => /color|ground$|accent|action/i.test(k))).toBe(false)
    }
  })

  // ─── Uniqueness is a test ([R-487], Phase 16C amendment 1) ──────────────────
  //
  // Measured on the MATCHED settings only, because a theme's name survives any pick
  // being swapped ([R-485]), and on what a visitor can tell apart: the heading's voice
  // (its face's class with the weight that face can draw), the case, the corner family
  // (Soft and Round are one at a glance) and the surface device, plus seven lower
  // dimensions. Two high and five in all is the closest pair that ships, so a tenth
  // theme that crowds a ninth fails here rather than shipping.
  it('every pair of themes differs in at least two of the four a visitor names first, and five in all', () => {
    for (const a of THEMES) {
      for (const b of THEMES) {
        if (a.id >= b.id) continue
        const {high, all} = signatureDifferences(a, b)
        expect(high.length, `${a.id} and ${b.id} (high: ${high.join(', ') || 'none'})`).toBeGreaterThanOrEqual(2)
        expect(all.length, `${a.id} and ${b.id} (${all.join(', ')})`).toBeGreaterThanOrEqual(5)
      }
    }
  })

  it('each theme’s recognisers belong to no other theme, and are things a visitor sees', () => {
    for (const theme of THEMES) {
      const others = THEMES.filter((t) => t !== theme)
      const sig = signatureOf(theme)
      const clash = others.find((other) => theme.identity.recognizers.every((d) => signatureOf(other)[d] === sig[d]))
      expect(clash?.id, `${theme.id} shares its recognisers with ${clash?.id}`).toBeUndefined()
      // At least one of them is a dimension a visitor names first.
      expect(theme.identity.recognizers.some((d) => (SIGNATURE_HIGH as readonly string[]).includes(d)), theme.id).toBe(true)
    }
  })

  // [R-487], amendment 24: a theme may only name a weight its heading face can draw.
  it('names a weight its pairing can actually draw, and leaves the rest to the face', () => {
    for (const theme of THEMES) {
      const wanted = String(theme.settings.headingWeight)
      const drawn = drawableWeight(theme.settings.fontPairingPreset as number, wanted)
      // A theme that NAMES a weight must have a face that draws it. A theme that leaves
      // the default takes whatever its face has: pairings 2 and 13 have no bold, and with
      // font synthesis off they render their real regular (ADV-P16C-A measured the fake).
      if (wanted !== THEME_DEFAULTS.headingWeight) expect(drawn, theme.id).toBe(wanted)
      expect(['bold', 'regular']).toContain(drawn)
    }
  })
})

describe('matching by value ([R-477])', () => {
  it('names each theme from its own stored settings', () => {
    for (const theme of THEMES) expect(matchTheme(stored(theme.settings))).toMatchObject({theme, current: true})
  })

  it('reads an absent field as its default, so a theme that leaves a field unset still matches', () => {
    const graphite = THEMES.find((t) => t.id === 'graphite')!
    const doc = {...stored(graphite.settings), cardHover: graphite.settings.cardHover}
    expect(matchTheme(doc)?.theme.id).toBe('graphite')
    const canyon = THEMES.find((t) => t.id === 'canyon')!
    expect(canyon.settings.patternTexture).toBeNull()
    expect(matchTheme({...stored(canyon.settings), patternTexture: ''})?.theme.id).toBe('canyon')
  })

  it('reads what the site reads: an unknown value is the default', () => {
    expect(readThemeField({elevationStyle: '9'}, 'elevationStyle')).toBe('0')
    expect(readThemeField({fontPairingPreset: 3}, 'fontPairingPreset')).toBeNull()
  })

  // Phase 17B: a document that still stores the six (every client built before the pin
  // does) matches its style set exactly as before; the match never reads them.
  it('ignores the six hidden fields a stored document still carries', () => {
    const graphite = THEMES.find((t) => t.id === 'graphite')!
    const legacy: ThemeDoc = {...stored(graphite.settings), ...graphite.picks, ...({sectionJoin: 'angled', dividerCarry: ['cards'], patternGround: 'dark',
      brandGhost: 'on', sectionOverlap: 'photo', sectionGradient: 'deep'} as Record<string, unknown>)}
    expect(matchTheme(legacy)).toMatchObject({theme: graphite, current: true})
    expect(swappedPicks(legacy, matchTheme(legacy)!)).toEqual([])
    expect(isPlatformDefault({fontPairingPreset: 1, ...({sectionJoin: 'peak', sectionGradient: 'deep'} as Record<string, unknown>)})).toBe(true)
  })

  it('says Custom after one change, and names nothing it is not', () => {
    const walnut = THEMES.find((t) => t.id === 'walnut')!
    expect(matchTheme({...stored(walnut.settings), motionTempo: 'snappy'})).toBeNull()
    expect(matchTheme({})).toBeNull()
  })

  it('knows what the build writes as the platform default, and that it is no theme', () => {
    const build = {fontPairingPreset: 1, marketingScale: 'default', taglineStyle: 'plain', uiRadius: 'rounded', buttonShape: 'rounded',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed'}
    expect(isPlatformDefault(build)).toBe(true)
    expect(isPlatformDefault({})).toBe(true)
    expect(matchTheme(build)).toBeNull()
    expect(isPlatformDefault({...build, headingCase: 'upper'})).toBe(false)
    // A pick is not a matched setting, so it does not make a site "Custom" ([R-485]).
    expect(isPlatformDefault({...build, headingRule: 'leadDot'})).toBe(true)
  })

  it('names an earlier version of a theme, so a retune never reads as an edit', () => {
    const walnut = THEMES.find((t) => t.id === 'walnut')!
    const retuned: Theme = {
      ...walnut,
      settings: {...walnut.settings, motionTempo: 'balanced'},
      previous: [{settings: walnut.settings, picks: walnut.picks}],
    }
    const original = [...THEMES]
    ;(THEMES as Theme[]).splice(THEMES.indexOf(walnut), 1, retuned)
    try {
      expect(matchTheme(stored(walnut.settings))).toMatchObject({theme: retuned, current: false})
    } finally {
      ;(THEMES as Theme[]).splice(0, THEMES.length, ...original)
    }
  })
})

describe('the patch the Studio picker runs', () => {
  it('sets every value a theme names and unsets every field it leaves to the default, in one patch', () => {
    for (const theme of THEMES) {
      const {set, unset} = themePatch(theme)
      // The patch covers the matched settings AND the picks: picking a theme sets its
      // defaults ([R-485]), and Python replays these same cases (presets.json).
      expect([...Object.keys(set), ...unset].sort()).toEqual([...THEME_FIELDS, ...THEME_PICKS].sort())
      for (const f of unset) {
        if ((THEME_FIELDS as readonly string[]).includes(f)) expect(theme.settings[f as keyof ThemeSettings]).toBeNull()
        else expect(theme.picks[f as keyof typeof theme.picks]).toBeNull()
      }
    }
  })

  it('a swapped heading line keeps the theme’s name, and the Studio says it was swapped ([R-485])', () => {
    const graphite = THEMES.find((t) => t.id === 'graphite')!
    const swappedDoc = {...stored(graphite.settings), ...graphite.picks, headingRule: 'hatched'}
    const match = matchTheme(swappedDoc)
    expect(match).toMatchObject({theme: graphite, current: true})
    expect(swappedPicks(swappedDoc, match!)).toEqual([{field: 'headingRule', site: 'hatched', theme: 'line'}])
    // And a site wearing exactly the theme's pick has nothing to report.
    expect(swappedPicks({...stored(graphite.settings), ...graphite.picks}, match!)).toEqual([])
  })

  it('applying a theme’s update keeps a pick the site swapped on purpose', () => {
    const linen = THEMES.find((t) => t.id === 'linen')!
    const old = linen.previous[0]
    const site = {...old.settings, ...old.picks, headingRule: 'hatched'} as ThemeDoc
    const match = matchTheme(site)!
    expect(match).toMatchObject({theme: linen, current: false})
    const {set, unset} = updatePatch(site, match)
    expect({...set, ...Object.fromEntries(unset.map((k) => [k, null]))}).toMatchObject({headingWeight: 'regular'})
    expect('headingRule' in set).toBe(false)
    expect(unset).not.toContain('headingRule')
  })

  it('reads a stored pick the way the site does: unknown and none are no pick', () => {
    expect(readPick({headingRule: 'hatched'}, 'headingRule')).toBe('hatched')
    expect(readPick({headingRule: 'none'}, 'headingRule')).toBeNull()
    expect(readPick({headingRule: 'squiggle'}, 'headingRule')).toBeNull()
    expect(readPick({}, 'headingRule')).toBeNull()
  })

  it('applied over any document, it leaves one the theme matches', () => {
    const before: ThemeDoc = {uiRadius: 'soft', buttonShape: 'stadium', elevationStyle: '2', fontPairingPreset: 2, patternTexture: 'scallop'}
    for (const theme of THEMES) {
      const {set, unset} = themePatch(theme, before)
      const after: ThemeDoc = {...before, ...set}
      for (const f of unset) delete (after as Record<string, unknown>)[f]
      expect(matchTheme(after)?.theme.id).toBe(theme.id)
    }
  })

  it('leaves the pairing alone only on a site whose own uploaded fonts are what renders', () => {
    const uploads = {customFonts: {headingFont: {regular: {asset: {_ref: 'file-x'}}}}}
    expect(usesCustomFonts(uploads)).toBe(true)
    expect(usesCustomFonts({...uploads, fontPairingPreset: 1})).toBe(false)
    const theme = THEMES[0]
    expect(Object.keys(themePatch(theme, uploads).set)).not.toContain('fontPairingPreset')
    expect(themePatch(theme, uploads).unset).not.toContain('fontPairingPreset')
    expect(themePatch(theme, {...uploads, fontPairingPreset: 1}).set.fontPairingPreset).toBe(theme.settings.fontPairingPreset)
    const {set, unset} = themePatch(theme, uploads)
    const after: ThemeDoc = {...uploads, ...set}
    for (const f of unset) delete (after as Record<string, unknown>)[f]
    expect(matchTheme(after)?.theme.id).toBe(theme.id)
  })

  it('the defaults are what each reader falls back to', () => {
    expect(THEME_DEFAULTS.uiRadius).toBe('rounded')
    expect(THEME_DEFAULTS.buttonShape).toBe('rounded')
    expect(THEME_DEFAULTS.elevationStyle).toBe('0')
    expect(THEME_DEFAULTS.motionTempo).toBe('relaxed')
    expect(THEME_DEFAULTS.attorneyCardStyle).toBe('classic')
    expect(PICK_DEFAULTS).toEqual({headingRule: null})
  })
})

// ─── Every theme at the last pin still reads as itself ───────────────────────
//
// Phase 16C designed this and built only the monorepo half: the template carried no
// frozen copy and no reference to a pin (ADV-16D-C measured it; §16.5 amendment 27).
// It cannot be `git show <sha>:studio/presets.json` in CI, because template CI clones
// one commit deep. So the pin's presets are a committed fixture, and this is what
// stops a theme change stranding every site that already wears it as "Custom".
describe('a site built at an earlier pin still matches its theme', () => {
  type Frozen = {themes: {id: string; settings: Record<string, unknown>}[]}
  const frozen = (pin: string) =>
    JSON.parse(readFileSync(resolve(__dirname, `fixtures/presets-${pin}.json`), 'utf8')) as Frozen
  // One file per pin at which a matched value moved. `bd74cdd` is Phase 16C's;
  // `22da44f` is Phase 16D's revision, frozen by 16E because it put the raised photo on
  // three themes ([R-500]); `3979e37` is 16E's, frozen by 16F because it is the first
  // pin before the roster grew — a TENTH theme is the first thing in this workstream
  // that could take another theme's name at a pin, and this is what proves none does.
  // `a164ce0` is 17A's, frozen by 17B before four matched fields and two picks left
  // the style sets ([R-510]): a frozen file carries the six, and the match ignores them.
  const PINS = ['bd74cdd', '22da44f', '3979e37', 'a164ce0'] as const

  it.each(PINS)('reads every theme at %s as that theme, current or earlier', (pin) => {
    const pinned = frozen(pin)
    // A pin holds the roster AS IT WAS, which is not today's length once a theme is
    // added. What must hold is that every theme frozen there still reads as itself.
    expect(pinned.themes.length).toBeLessThanOrEqual(THEMES.length)
    expect(new Set(pinned.themes.map((t) => t.id)).size).toBe(pinned.themes.length)
    for (const old of pinned.themes) {
      const match = matchTheme(old.settings as ThemeDoc)
      expect(match?.theme.id, `a site wearing ${old.id} at ${pin}`).toBe(old.id)
    }
  })

  // Which themes have been retuned SINCE each pin, which is not the same set at each:
  // Walnut and Marble took the drop cap in Phase 16D, so they are earlier versions as
  // of `bd74cdd` and current as of `22da44f`. Canyon, Graphite and Marble took the
  // raised photo in 16E and Canyon the gradient in 16F, but those fields left the
  // matched set in Phase 17B ([R-510]), so a site frozen before them reads as CURRENT
  // again: the retune was in a field a style set no longer owns. Measured on the four
  // frozen files when the six left (four `previous` entries became duplicates and were
  // pruned). Granite is new at `a164ce0` and cannot be retuned.
  const RETUNED_SINCE: Record<(typeof PINS)[number], Set<string>> = {
    bd74cdd: new Set(['walnut', 'marble']),
    '22da44f': new Set<string>(),
    '3979e37': new Set<string>(),
    a164ce0: new Set<string>(),
  }

  it.each(PINS)('names the themes retuned since %s as earlier versions, and the rest as current', (pin) => {
    const retuned = RETUNED_SINCE[pin]
    for (const old of frozen(pin).themes) {
      const match = matchTheme(old.settings as ThemeDoc)
      expect(match?.current, `${old.id} at ${pin}`).toBe(!retuned.has(old.id))
    }
  })
})
