import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {getPresetById} from '../../fonts/presets'
import {matchCornerFamily} from '../corners'
import {PALETTE_PRESETS} from '../palettes'
import {
  THEMES, THEME_DEFAULTS, THEME_FIELDS, isPlatformDefault, matchTheme, readThemeField, themePatch, usesCustomFonts,
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
  it('ships nine, Granite held for Phase 16C ([R-478])', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['canyon', 'graphite', 'walnut', 'dune', 'flint', 'marble', 'linen', 'valley', 'quartz'])
  })

  it.each(THEMES.map((t) => [t.name, t] as [string, Theme]))('%s names every field, and nothing else', (_, theme) => {
    expect(Object.keys(theme.settings).sort()).toEqual([...THEME_FIELDS].sort())
    expect(theme.feel.length).toBeGreaterThan(10)
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

  it('no two themes are the same, and each differs from every other in at least four things', () => {
    for (const a of THEMES) {
      for (const b of THEMES) {
        if (a === b) continue
        const differences = THEME_FIELDS.filter((f) => a.settings[f] !== b.settings[f]).length
        expect(differences, `${a.id} and ${b.id}`).toBeGreaterThanOrEqual(4)
      }
    }
  })
})

describe('matching by value ([R-477])', () => {
  it('names each theme from its own stored settings', () => {
    for (const theme of THEMES) expect(matchTheme(stored(theme.settings))).toEqual({theme, current: true})
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
    expect(isPlatformDefault({...build, headingRule: 'line'})).toBe(false)
  })

  it('names an earlier version of a theme, so a retune never reads as an edit', () => {
    const walnut = THEMES.find((t) => t.id === 'walnut')!
    const retuned: Theme = {...walnut, settings: {...walnut.settings, motionTempo: 'balanced'}, previous: [walnut.settings]}
    const original = [...THEMES]
    ;(THEMES as Theme[]).splice(THEMES.indexOf(walnut), 1, retuned)
    try {
      expect(matchTheme(stored(walnut.settings))).toEqual({theme: retuned, current: false})
    } finally {
      ;(THEMES as Theme[]).splice(0, THEMES.length, ...original)
    }
  })
})

describe('the patch the Studio picker runs', () => {
  it('sets every value a theme names and unsets every field it leaves to the default, in one patch', () => {
    for (const theme of THEMES) {
      const {set, unset} = themePatch(theme)
      expect([...Object.keys(set), ...unset].sort()).toEqual([...THEME_FIELDS].sort())
      for (const f of unset) expect(theme.settings[f as keyof ThemeSettings]).toBeNull()
    }
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
    expect(THEME_DEFAULTS.sectionJoin).toBe('straight')
  })
})
