import {getPresetById} from '../fonts/presets'
import {
  BUTTON_SHAPE_MAP, ELEVATION_STYLE_MAP, HEADING_CASES, HEADING_EMPHASIS_STYLES, HEADING_RULES, MARKETING_SCALE_MAP,
  MOTION_TEMPO_MAP, SECTION_TEXTURES, TAGLINE_STYLE_MAP, TERTIARY_STYLE_MAP, UI_RADIUS_MAP,
} from './designTokens'

// ─── Themes (Phase 16B) ───────────────────────────────────────────────────────
//
// A theme is the site's signature and its UI system, applied everywhere
// automatically; the colors (the palette) and the story (which sections, in what
// order) stay separate (Justin, 2026-09-18). It works exactly like a palette
// (lib/palettes.ts) and a corner family (lib/corners.ts): choosing one in the
// Studio WRITES the design settings below, the settings are the truth after that,
// and the active theme is DERIVED by matching the stored values. Nothing stores
// which theme a site wears and the site never reads a theme, so a theme retuned
// later changes no built site until someone applies it again (Justin: exact match
// only, an earlier version of the same theme included).
//
// Every theme names every field. `null` means the theme leaves the field unset,
// which renders the field's default. No theme writes a color, so any theme wears
// any palette the same way, and no theme touches a section: a look set on one
// section on purpose stays as it was set.
//
// Provenance. Each theme is drawn from the sample sites of the homepage field
// study that the monorepo's decisions log names for it (ruling 10). The records,
// by domain, are cited in the monorepo's Phase 16 design record, because the
// template carries no firm identity. Values are provisional until the Phase 18
// eye pass. The tenth theme of that roster, corporate navy, returns when its
// drawn devices exist (Phase 16C).

export const THEME_FIELDS = [
  // The UI system
  'fontPairingPreset',
  'marketingScale',
  'taglineStyle',
  'uiRadius',
  'buttonShape',
  'buttonAnimation',
  'tertiaryStyle',
  'elevationStyle',
  'motionTempo',
  'cardHover',
  'attorneyCardStyle',
  // The signature
  'headingEmphasisStyle',
  'headingRule',
  'headingCase',
  'imageFrame',
  'sectionJoin',
  'patternTexture',
  'patternGround',
] as const

export type ThemeField = (typeof THEME_FIELDS)[number]
export type ThemeValue = string | number | null
export type ThemeSettings = Record<ThemeField, ThemeValue>

export type Theme = {
  id: string
  name: string
  /** A few words shown under the name in the Studio. */
  feel: string
  settings: ThemeSettings
  /** The theme's earlier settings, oldest first. Append only: when a theme is
   *  retuned, its old settings move here, so a site that still wears them reads
   *  "(earlier version)" instead of "Custom". */
  previous: readonly ThemeSettings[]
  /** Palettes that suit it (lib/palettes.ts ids). Never written: a theme sets no color. */
  suggestedPalettes: readonly string[]
  /** The study's words for it. */
  evidence: readonly string[]
}

// The values each theme-owned field can take. The schema's option lists hold the
// same values (lib/__tests__/themes.test.ts reads them from studio/field-map.json).
export const CARD_HOVERS = ['imageZoom', 'lift', 'glow', 'accentBorder', 'accentUnderline', 'none'] as const
export const ATTORNEY_CARD_STYLES = ['classic', 'portrait', 'avatar', 'minimal', 'spotlight'] as const
export const IMAGE_FRAMES = ['plain', 'framed', 'slab'] as const
export const SECTION_JOINS = ['straight', 'angled'] as const
export const PATTERN_GROUNDS = ['light', 'dark'] as const
export const BUTTON_ANIMATIONS = ['none', 'sweep', 'fill-center', 'inset', 'lift'] as const

const OPTIONS: Record<Exclude<ThemeField, 'fontPairingPreset'>, readonly string[]> = {
  marketingScale: ['default', ...Object.keys(MARKETING_SCALE_MAP)],
  taglineStyle: Object.keys(TAGLINE_STYLE_MAP),
  uiRadius: Object.keys(UI_RADIUS_MAP),
  buttonShape: Object.keys(BUTTON_SHAPE_MAP),
  buttonAnimation: BUTTON_ANIMATIONS,
  tertiaryStyle: Object.keys(TERTIARY_STYLE_MAP),
  elevationStyle: Object.keys(ELEVATION_STYLE_MAP),
  motionTempo: Object.keys(MOTION_TEMPO_MAP),
  cardHover: CARD_HOVERS,
  attorneyCardStyle: ATTORNEY_CARD_STYLES,
  headingEmphasisStyle: HEADING_EMPHASIS_STYLES,
  headingRule: HEADING_RULES,
  headingCase: HEADING_CASES,
  imageFrame: IMAGE_FRAMES,
  sectionJoin: SECTION_JOINS,
  patternTexture: SECTION_TEXTURES,
  patternGround: PATTERN_GROUNDS,
}

/** What an ABSENT field renders: the default each reader falls back to. */
export const THEME_DEFAULTS: ThemeSettings = {
  fontPairingPreset: null,
  marketingScale: 'default',
  taglineStyle: 'plain',
  uiRadius: 'rounded',
  buttonShape: 'rounded',
  buttonAnimation: 'none',
  tertiaryStyle: 'plain',
  elevationStyle: '0',
  motionTempo: 'relaxed',
  cardHover: null,
  attorneyCardStyle: 'classic',
  headingEmphasisStyle: 'color',
  headingRule: 'none',
  headingCase: 'normal',
  imageFrame: 'plain',
  sectionJoin: 'straight',
  patternTexture: null,
  patternGround: 'light',
}

/** Studio labels for the fields, used where a difference is named. */
export const THEME_FIELD_LABELS: Record<ThemeField, string> = {
  fontPairingPreset: 'Fonts',
  marketingScale: 'Heading size',
  taglineStyle: 'Line above headings',
  uiRadius: 'Card corners',
  buttonShape: 'Button shape',
  buttonAnimation: 'Button hover',
  tertiaryStyle: 'Text links',
  elevationStyle: 'Card shadow',
  motionTempo: 'Motion',
  cardHover: 'Card hover',
  attorneyCardStyle: 'Attorney cards',
  headingEmphasisStyle: 'Highlighted words',
  headingRule: 'Line under headings',
  headingCase: 'Heading capitals',
  imageFrame: 'Photo frame',
  sectionJoin: 'Section edge',
  patternTexture: 'Texture',
  patternGround: 'Texture ground',
}

const t = (s: Partial<ThemeSettings>): ThemeSettings => ({...THEME_DEFAULTS, ...s})

export const THEMES: readonly Theme[] = [
  {
    id: 'canyon', name: 'Canyon', feel: 'deep and immersive: display serif, italic accents, dark bands',
    settings: t({
      fontPairingPreset: 2, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'subtle', buttonShape: 'square',
      buttonAnimation: 'sweep', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'imageZoom', attorneyCardStyle: 'portrait',
      headingEmphasisStyle: 'italic', headingRule: 'line', headingCase: 'normal', imageFrame: 'plain', sectionJoin: 'straight',
    }),
    previous: [],
    suggestedPalettes: ['black-gold', 'burgundy-gold', 'teal-mint'],
    evidence: ['kicker above and a short rule below every heading', 'italic accent phrase', 'cutout portraits in rounded panels'],
  },
  {
    id: 'graphite', name: 'Graphite', feel: 'editorial and exact: sharp corners, framed photos, angled edges',
    settings: t({
      fontPairingPreset: 4, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'sharp', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'balanced',
      cardHover: 'accentBorder', attorneyCardStyle: 'minimal',
      headingEmphasisStyle: 'italic', headingRule: 'line', headingCase: 'normal', imageFrame: 'framed', sectionJoin: 'angled',
      patternTexture: 'diagonalHatch', patternGround: 'dark',
    }),
    previous: [],
    suggestedPalettes: ['black-gold', 'ink-lavender', 'black-crimson'],
    evidence: ['two-line heading unit with a short rule', 'thin-framed boxes', 'diagonal cuts', 'textured bands'],
  },
  {
    id: 'walnut', name: 'Walnut', feel: 'heritage: old-style serif, italic last words, framed photos',
    settings: t({
      fontPairingPreset: 13, marketingScale: 'sm', taglineStyle: 'titlecase', uiRadius: 'subtle', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'lift', attorneyCardStyle: 'classic',
      headingEmphasisStyle: 'italic', headingRule: 'line', headingCase: 'normal', imageFrame: 'framed', sectionJoin: 'straight',
    }),
    previous: [],
    suggestedPalettes: ['navy-brass', 'navy-ice', 'black-gold', 'burgundy-gold'],
    evidence: ['serif headline with its last words in italic', 'thin outline buttons', 'ochre rule'],
  },
  {
    id: 'dune', name: 'Dune', feel: 'soft and warm: rounded everything, pill buttons, a scallop texture',
    settings: t({
      fontPairingPreset: 6, marketingScale: 'sm', taglineStyle: 'plain', uiRadius: 'soft', buttonShape: 'pill',
      buttonAnimation: 'lift', tertiaryStyle: 'plain', elevationStyle: '1', motionTempo: 'relaxed',
      cardHover: 'lift', attorneyCardStyle: 'portrait',
      headingEmphasisStyle: 'italic', headingRule: 'line', headingCase: 'normal', imageFrame: 'plain', sectionJoin: 'straight',
      patternTexture: 'scallop', patternGround: 'light',
    }),
    previous: [],
    suggestedPalettes: ['green-coral', 'green-sage', 'navy-rose'],
    evidence: ['italic accent phrase', 'pill buttons and rounded photo corners', 'inset rounded panels on a textured ground'],
  },
  {
    id: 'flint', name: 'Flint', feel: 'bold two-tone: heavy capitals, one phrase in the accent, angled edges',
    settings: t({
      fontPairingPreset: 7, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'rounded', buttonShape: 'rounded',
      buttonAnimation: 'fill-center', tertiaryStyle: 'tracked', elevationStyle: '2', motionTempo: 'snappy',
      cardHover: 'imageZoom', attorneyCardStyle: 'spotlight',
      headingEmphasisStyle: 'color', headingRule: 'none', headingCase: 'upper', imageFrame: 'plain', sectionJoin: 'angled',
    }),
    previous: [],
    suggestedPalettes: ['navy-orange', 'black-crimson', 'navy-rose'],
    evidence: ['bold sans with one phrase in a second color', 'uppercase headings', 'angled panels'],
  },
  {
    id: 'marble', name: 'Marble', feel: 'civic statement: capitals, a rule before every kicker, a fine lattice',
    settings: t({
      fontPairingPreset: 1, marketingScale: 'md', taglineStyle: 'lined', uiRadius: 'sharp', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'accentUnderline', attorneyCardStyle: 'classic',
      headingEmphasisStyle: 'italic', headingRule: 'none', headingCase: 'upper', imageFrame: 'plain', sectionJoin: 'angled',
      patternTexture: 'diamondLattice', patternGround: 'light',
    }),
    previous: [],
    suggestedPalettes: ['forest-brass', 'charcoal-coral', 'navy-orange'],
    evidence: ['a short gold rule then a spaced-caps kicker above every heading', 'square filled buttons', 'a damask ground'],
  },
  {
    id: 'linen', name: 'Linen', feel: 'stationery: a quiet serif, offset photo slabs, a pinstripe',
    settings: t({
      fontPairingPreset: 15, marketingScale: 'default', taglineStyle: 'titlecase', uiRadius: 'sharp', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'none', attorneyCardStyle: 'minimal',
      headingEmphasisStyle: 'italic', headingRule: 'line', headingCase: 'normal', imageFrame: 'slab', sectionJoin: 'straight',
      patternTexture: 'pinstripe', patternGround: 'light',
    }),
    previous: [],
    suggestedPalettes: ['navy-brass', 'burgundy-gold', 'black-crimson', 'slate-cream'],
    evidence: ['a gold italic second line over a short dash', 'photos offset on flat slabs', 'pinstripe and diamond textures'],
  },
  {
    id: 'valley', name: 'Valley', feel: 'place-led: an open serif, soft corners, rounded photos',
    settings: t({
      fontPairingPreset: 9, marketingScale: 'sm', taglineStyle: 'titlecase', uiRadius: 'soft', buttonShape: 'stadium',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '1', motionTempo: 'relaxed',
      cardHover: 'imageZoom', attorneyCardStyle: 'portrait',
      headingEmphasisStyle: 'color', headingRule: 'line', headingCase: 'normal', imageFrame: 'plain', sectionJoin: 'straight',
    }),
    previous: [],
    suggestedPalettes: ['navy-brass', 'navy-ice', 'forest-brass'],
    evidence: ['headlines over a short mustard rule', 'rounded inset panels', 'local photography'],
  },
  {
    id: 'quartz', name: 'Quartz', feel: 'modern clean: geometric capitals, pills, a scallop texture',
    settings: t({
      fontPairingPreset: 14, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'soft', buttonShape: 'pill',
      buttonAnimation: 'sweep', tertiaryStyle: 'plain', elevationStyle: '1', motionTempo: 'balanced',
      cardHover: 'lift', attorneyCardStyle: 'avatar',
      headingEmphasisStyle: 'color', headingRule: 'line', headingCase: 'upper', imageFrame: 'plain', sectionJoin: 'straight',
      patternTexture: 'scallop', patternGround: 'light',
    }),
    previous: [],
    suggestedPalettes: ['teal-mint', 'slate-cream', 'navy-rose'],
    evidence: ['a heavy caps line whose last words turn to the accent', 'a short rule beneath', 'everything a pill'],
  },
]

// ─── Reading a stored document ────────────────────────────────────────────────

/** The stored Design Settings, as far as a theme is concerned. */
export type ThemeDoc = Partial<Record<ThemeField, unknown>> & {
  customFonts?: {
    headingFont?: {regular?: {asset?: unknown} | null} | null
    bodyFont?: {regular?: {asset?: unknown} | null} | null
  } | null
}

/** True when the site's own uploaded fonts are what renders: uploads exist and no
 *  valid pairing is set (a set pairing wins over uploads, and the build writes one on
 *  every client). A theme then leaves the pairing alone, and matching ignores it. */
export function usesCustomFonts(doc: ThemeDoc): boolean {
  const uploads = Boolean(doc.customFonts?.headingFont?.regular?.asset || doc.customFonts?.bodyFont?.regular?.asset)
  return uploads && !getPresetById(Number(doc.fontPairingPreset))
}

/** A stored value read the way the site reads it: absent, empty or unknown is the
 *  default it renders; a dark texture ground with no texture reads as light. */
export function readThemeField(doc: ThemeDoc, field: ThemeField): ThemeValue {
  const v = doc[field]
  if (field === 'fontPairingPreset') return getPresetById(Number(v)) ? Number(v) : null
  if (field === 'patternGround' && readThemeField(doc, 'patternTexture') === null) return THEME_DEFAULTS.patternGround
  return typeof v === 'string' && OPTIONS[field].includes(v) ? v : THEME_DEFAULTS[field]
}

function fieldsFor(doc: ThemeDoc): readonly ThemeField[] {
  return usesCustomFonts(doc) ? THEME_FIELDS.filter((f) => f !== 'fontPairingPreset') : THEME_FIELDS
}

function equals(doc: ThemeDoc, settings: ThemeSettings): boolean {
  const asDoc = settings as ThemeDoc
  return fieldsFor(doc).every((f) => readThemeField(doc, f) === readThemeField(asDoc, f))
}

export type ThemeMatch = {theme: Theme; current: boolean}

/** The theme whose values the stored settings equal, now or in an earlier
 *  version, or null ("Custom"). */
export function matchTheme(doc: ThemeDoc): ThemeMatch | null {
  for (const theme of THEMES) if (equals(doc, theme.settings)) return {theme, current: true}
  for (const theme of THEMES) if (theme.previous.some((p) => equals(doc, p))) return {theme, current: false}
  return null
}

/** True when the settings are what the build writes and nobody has chosen a
 *  theme: every field at its default, with the build's pairing or none. */
export function isPlatformDefault(doc: ThemeDoc): boolean {
  return fieldsFor(doc).every((f) =>
    f === 'fontPairingPreset' ? [null, 1].includes(readThemeField(doc, f) as number | null) : readThemeField(doc, f) === THEME_DEFAULTS[f],
  )
}

/** The one patch that applies a theme: set every value it names, unset every
 *  field it leaves to the default, never touch a color or a section, and leave
 *  the pairing alone on a site that uses its own fonts. */
export function themePatch(theme: Theme, doc: ThemeDoc = {}): {set: Record<string, string | number>; unset: string[]} {
  const set: Record<string, string | number> = {}
  const unset: string[] = []
  for (const field of fieldsFor(doc)) {
    const value = theme.settings[field]
    if (value === null) unset.push(field)
    else set[field] = value
  }
  return {set, unset}
}
