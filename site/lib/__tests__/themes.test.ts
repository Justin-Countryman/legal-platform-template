import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {getPresetById} from '../../fonts/presets'
import {matchCornerFamily} from '../corners'
import {PALETTE_PRESETS} from '../palettes'
import {CARRY_PIECES, DIVIDERS} from '../dividers'
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

const fieldMap = JSON.parse(readFileSync(resolve(__dirname, '../../../studio/field-map.json'), 'utf8'))
const designRows: Array<{path: string; options?: {list?: Array<string | number>}; initialValue?: unknown}> = fieldMap.types.designSettings.fields
const optionsOf = (field: string) => designRows.find((r) => r.path === field)?.options?.list

// A stored document equal to a theme's settings, the way the picker writes it.
const stored = (s: ThemeSettings): ThemeDoc => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null))

describe('the themes', () => {
  it('ships nine, Granite held for Phase 16D ([R-478])', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['canyon', 'graphite', 'walnut', 'dune', 'flint', 'marble', 'linen', 'valley', 'quartz'])
  })

  it.each(THEMES.map((t) => [t.name, t] as [string, Theme]))('%s names every field, its picks and an identity', (_, theme) => {
    expect(Object.keys(theme.settings).sort()).toEqual([...THEME_FIELDS].sort())
    expect(Object.keys(theme.picks).sort()).toEqual([...THEME_PICKS].sort())
    expect(theme.feel.length).toBeGreaterThan(10)
    expect(theme.identity.sentence.length).toBeGreaterThan(20)
    expect(theme.identity.recognizers.length).toBeGreaterThanOrEqual(2)
    expect(theme.identity.recognizers.length).toBeLessThanOrEqual(3)
  })

  // Phase 16C ([R-482], [R-484], [R-485]): the divider and the heading line are picks,
  // so they are held to their libraries, not to the matched settings.
  it.each(THEMES.map((t) => [t.name, t] as [string, Theme]))('%s picks from the libraries, and the Studio offers each pick', (_, theme) => {
    const {sectionJoin, dividerCarry, headingRule} = theme.picks
    if (sectionJoin) {
      expect(DIVIDERS).toContain(sectionJoin)
      expect(optionsOf('sectionJoin')).toContain(sectionJoin)
    }
    if (headingRule) {
      expect(HEADING_LINES).toContain(headingRule)
      expect(optionsOf('headingRule')).toContain(headingRule)
    }
    for (const piece of dividerCarry) {
      expect(CARRY_PIECES).toContain(piece)
      expect(optionsOf('dividerCarry')).toContain(piece)
    }
    // A carried piece needs a shape to carry ([R-483]).
    if (dividerCarry.length) expect(sectionJoin, `${theme.id} carries pieces with no divider`).not.toBeNull()
  })

  // [R-487]: three of the nine ship with a divider, matching what law firms do (19 of the
  // 65 sites in the study, 29%). A default set nobody ruled is not a default set.
  it('three themes ship with a divider, and the mark is off in every one ([R-487], [R-488])', () => {
    expect(THEMES.filter((t) => t.picks.sectionJoin).map((t) => t.id)).toEqual(['graphite', 'marble', 'quartz'])
    for (const theme of THEMES) expect(theme.picks.dividerCarry, theme.id).not.toContain('mark')
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
      expect(Object.keys(theme.settings).some((k) => /color|ground$|accent|action/i.test(k) && k !== 'patternGround')).toBe(false)
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

  it('reads what the site reads: an unknown value is the default, a dark ground with no texture is light', () => {
    expect(readThemeField({elevationStyle: '9'}, 'elevationStyle')).toBe('0')
    expect(readThemeField({fontPairingPreset: 3}, 'fontPairingPreset')).toBeNull()
    expect(readThemeField({patternGround: 'dark'}, 'patternGround')).toBe('light')
    expect(readThemeField({patternGround: 'dark', patternTexture: 'scallop'}, 'patternGround')).toBe('dark')
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
    expect(isPlatformDefault({...build, headingRule: 'leadDot', sectionJoin: 'arc'})).toBe(true)
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
        else expect([null, PICK_DEFAULTS.dividerCarry]).toContainEqual(theme.picks[f as keyof typeof theme.picks])
      }
    }
  })

  it('a swapped divider or heading line keeps the theme’s name, and the Studio says which was swapped ([R-485])', () => {
    const graphite = THEMES.find((t) => t.id === 'graphite')!
    const swappedDoc = {...stored(graphite.settings), ...graphite.picks, sectionJoin: 'arc'}
    const match = matchTheme(swappedDoc)
    expect(match).toMatchObject({theme: graphite, current: true})
    expect(swappedPicks(swappedDoc, match!)).toEqual([{field: 'sectionJoin', site: 'arc', theme: 'angled'}])
    // And a site wearing exactly the theme's picks has nothing to report.
    expect(swappedPicks({...stored(graphite.settings), ...graphite.picks}, match!)).toEqual([])
  })

  it('applying a theme’s update keeps a pick the site swapped on purpose', () => {
    const linen = THEMES.find((t) => t.id === 'linen')!
    const old = linen.previous[0]
    const site = {...old.settings, ...old.picks, sectionJoin: 'wave'} as ThemeDoc
    const match = matchTheme(site)!
    expect(match).toMatchObject({theme: linen, current: false})
    const {set, unset} = updatePatch(site, match)
    expect({...set, ...Object.fromEntries(unset.map((k) => [k, null]))}).toMatchObject({headingWeight: 'regular'})
    expect('sectionJoin' in set).toBe(false)
    expect(unset).not.toContain('sectionJoin')
  })

  it('reads a stored pick the way the site does: unknown, straight and none are no pick', () => {
    expect(readPick({sectionJoin: 'arc'}, 'sectionJoin')).toBe('arc')
    expect(readPick({sectionJoin: 'straight'}, 'sectionJoin')).toBeNull()
    expect(readPick({sectionJoin: 'squiggle'}, 'sectionJoin')).toBeNull()
    expect(readPick({headingRule: 'none'}, 'headingRule')).toBeNull()
    expect(readPick({dividerCarry: ['cards', 'nonsense']}, 'dividerCarry')).toEqual(['cards'])
    expect(readPick({}, 'dividerCarry')).toEqual([])
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
    expect(PICK_DEFAULTS).toEqual({sectionJoin: null, dividerCarry: [], headingRule: null})
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
  // `22da44f` is Phase 16D's revision, and Phase 16E freezes it because it put the
  // raised photo on three themes ([R-500]).
  const PINS = ['bd74cdd', '22da44f'] as const

  it.each(PINS)('reads every theme at %s as that theme, current or earlier', (pin) => {
    const pinned = frozen(pin)
    expect(pinned.themes).toHaveLength(THEMES.length)
    for (const old of pinned.themes) {
      const match = matchTheme(old.settings as ThemeDoc)
      expect(match?.theme.id, `a site wearing ${old.id} at ${pin}`).toBe(old.id)
    }
  })

  // Which themes have been retuned SINCE each pin, which is not the same set at both:
  // Walnut took the drop cap in Phase 16D, so it is an earlier version as of `bd74cdd`
  // and current as of `22da44f`; Canyon, Graphite and Marble take the raised photo in
  // Phase 16E ([R-500]), so they are earlier versions as of both. The widened test
  // found this the first time it ran, which is the reason to keep a file per pin
  // rather than one for the newest.
  const RETUNED_SINCE: Record<(typeof PINS)[number], Set<string>> = {
    bd74cdd: new Set(['walnut', 'marble', 'canyon', 'graphite']),
    '22da44f': new Set(['marble', 'canyon', 'graphite']),
  }

  it.each(PINS)('names the themes retuned since %s as earlier versions, and the rest as current', (pin) => {
    const retuned = RETUNED_SINCE[pin]
    for (const old of frozen(pin).themes) {
      const match = matchTheme(old.settings as ThemeDoc)
      expect(match?.current, `${old.id} at ${pin}`).toBe(!retuned.has(old.id))
    }
  })
})
