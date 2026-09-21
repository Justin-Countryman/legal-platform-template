import {getPresetById, type HeadingVoice} from '../fonts/presets'
import {matchCornerFamily} from './corners'
import {DIVIDERS, CARRY_PIECES, type CarryPiece} from './dividers'
import {HEADING_LINES} from './headingLines'
import {
  BUTTON_SHAPE_MAP, ELEVATION_STYLE_MAP, HEADING_CASES, HEADING_EMPHASIS_STYLES, HEADING_WEIGHTS, MARKETING_SCALE_MAP,
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
// drawn devices exist (Phase 16D).
//
// ─── Phase 16C: three parts, and what makes a theme its own ───────────────────
//
// A theme is now three things:
//   settings — the fields it writes and is MATCHED by (`THEME_FIELDS`);
//   picks    — the libraries it only suggests: the divider, the pieces that repeat
//              its shape, and the line under section headings. They sit OUTSIDE the
//              match, like the palette, so a site that swaps one keeps the theme's
//              name (`[R-485]`);
//   identity — a sentence and the two or three things a visitor recognises.
//
// UNIQUENESS IS A TEST, not a promise (`[R-487]`; `__tests__/themes.test.ts`). It is
// measured on the SETTINGS only, because a theme's name survives any pick being
// swapped, and on what a visitor can actually tell apart: the heading's VOICE (its
// face's class, not its family: two Fraunces pairings are one voice) with the weight
// that face can draw, the heading case, the corner family (Soft and Round count as
// one at a glance), and the surface device — four "high" dimensions — plus seven
// lower ones. Every pair of themes differs in at least two high and five in all, and
// each theme's recognisers belong to no other theme. A tenth theme that crowds a
// ninth fails the test rather than shipping.

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
  'headingWeight',
  'headingCase',
  'imageFrame',
  'patternTexture',
  'patternGround',
  // Phase 16D, the drawn elements a theme turns on. Plain string fields, not one
  // array: a matched array reads as its default in both `readThemeField` and
  // `presets.py:read`, which both gate on `typeof value === 'string'`, so a site
  // that changed one would still match the theme and `themePatch` would write an
  // empty array into the dataset (measured, ADV-16D-A F12 and ADV-16D-C).
  'brandGhost',
  'dropCap',
  'quoteMark',
] as const

export type ThemeField = (typeof THEME_FIELDS)[number]

/** What a visitor can tell apart at rest, derived from the settings (`[R-487]`). The
 *  first four are the ones a visitor names first, and a pair of themes must differ in at
 *  least two of them. */
export const SIGNATURE_HIGH = ['typeVoice', 'headingCase', 'cornerFamily', 'surfaceDevice', 'ghost'] as const
export const SIGNATURE_LOW = ['emphasis', 'kicker', 'frame', 'attorneyCards', 'texture', 'shadow', 'scale', 'ornaments'] as const
export const SIGNATURE = [...SIGNATURE_HIGH, ...SIGNATURE_LOW] as const
export type SignatureDimension = (typeof SIGNATURE)[number]

/** The libraries a theme suggests but is not matched by (`[R-485]`): picking a theme
 *  sets them, swapping one keeps the theme's name, and the Studio says which was
 *  swapped. Stored beside the settings, and never compared. */
export const THEME_PICKS = ['sectionJoin', 'dividerCarry', 'headingRule'] as const
export type ThemePickField = (typeof THEME_PICKS)[number]
export type ThemePicks = {
  /** The divider's shape (`lib/dividers.ts`); `null` leaves it straight. */
  sectionJoin: string | null
  /** Which small places repeat that shape; empty carries none. */
  dividerCarry: readonly CarryPiece[]
  /** The line under section headings (`lib/headingLines.ts`); `null` draws none. */
  headingRule: string | null
}
export const PICK_DEFAULTS: ThemePicks = {sectionJoin: null, dividerCarry: [], headingRule: null}
export type ThemeValue = string | number | null
export type ThemeSettings = Record<ThemeField, ThemeValue>

export type Theme = {
  id: string
  name: string
  /** A few words shown under the name in the Studio. */
  feel: string
  /** What a visitor recognises: one sentence, and two or three signature dimensions
   *  whose values together no other theme holds (`[R-487]`). */
  identity: {sentence: string; recognizers: readonly SignatureDimension[]}
  settings: ThemeSettings
  picks: ThemePicks
  /** The theme's earlier settings and picks, oldest first. Append only: when a theme is
   *  retuned, its old values move here, so a site that still wears them reads
   *  "(earlier version)" instead of "Custom", and the Studio compares a swapped pick
   *  against the version the site actually matches. */
  previous: readonly {settings: Partial<ThemeSettings>; picks: ThemePicks}[]
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
export const PATTERN_GROUNDS = ['light', 'dark'] as const
export const BUTTON_ANIMATIONS = ['none', 'sweep', 'fill-center', 'inset', 'lift'] as const
/** Phase 16D: each drawn element is off or on. Absent is off. */
export const DRAWN_ELEMENT_STATES = ['none', 'on'] as const

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
  headingWeight: HEADING_WEIGHTS,
  headingCase: HEADING_CASES,
  imageFrame: IMAGE_FRAMES,
  patternTexture: SECTION_TEXTURES,
  patternGround: PATTERN_GROUNDS,
  brandGhost: DRAWN_ELEMENT_STATES,
  dropCap: DRAWN_ELEMENT_STATES,
  quoteMark: DRAWN_ELEMENT_STATES,
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
  headingWeight: 'bold',
  headingCase: 'normal',
  imageFrame: 'plain',
  patternTexture: null,
  patternGround: 'light',
  brandGhost: 'none',
  dropCap: 'none',
  quoteMark: 'none',
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
  headingWeight: 'Heading weight',
  headingCase: 'Heading capitals',
  imageFrame: 'Photo frame',
  patternTexture: 'Texture',
  patternGround: 'Texture ground',
  brandGhost: 'Ghosted initials',
  dropCap: 'Drop cap',
  quoteMark: 'Quote mark',
}

/** Studio labels for the picks. */
export const THEME_PICK_LABELS: Record<ThemePickField, string> = {
  sectionJoin: 'Divider',
  dividerCarry: 'Carried through',
  headingRule: 'Heading line',
}

const t = (s: Partial<ThemeSettings>): ThemeSettings => ({...THEME_DEFAULTS, ...s})
const p = (s: Partial<ThemePicks>): ThemePicks => ({...PICK_DEFAULTS, ...s})

export const THEMES: readonly Theme[] = [
  {
    id: 'canyon', name: 'Canyon', feel: 'deep and immersive: display serif, italic accents, dark bands',
    identity: {
      sentence: "Deep and immersive: a display serif at its own weight, italic accents, dark bands.",
      recognizers: ['typeVoice', 'cornerFamily', 'emphasis'],
    },
    settings: t({
      fontPairingPreset: 2, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'subtle', buttonShape: 'square',
      buttonAnimation: 'sweep', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'imageZoom', attorneyCardStyle: 'portrait',
      headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'plain',
      quoteMark: 'on',
    }),
    picks: p({headingRule: 'line'}),
    previous: [{settings: {fontPairingPreset: 2, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'subtle', buttonShape: 'square', buttonAnimation: 'sweep', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'relaxed', cardHover: 'imageZoom', attorneyCardStyle: 'portrait', headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'plain'}, picks: p({headingRule: 'line'})}],
    suggestedPalettes: ['black-gold', 'burgundy-gold', 'teal-mint'],
    evidence: ['kicker above and a short rule below every heading', 'italic accent phrase', 'cutout portraits in rounded panels'],
  },
  {
    id: 'graphite', name: 'Graphite', feel: 'editorial and exact: sharp corners, framed photos, angled edges',
    identity: {
      sentence: "Editorial and exact: sharp corners, framed photos, a textured dark band, angled dividers.",
      recognizers: ['typeVoice', 'cornerFamily', 'surfaceDevice'],
    },
    settings: t({
      fontPairingPreset: 4, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'sharp', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'balanced',
      cardHover: 'accentBorder', attorneyCardStyle: 'minimal',
      headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'framed',
      patternTexture: 'diagonalHatch', patternGround: 'dark',
      brandGhost: 'on',
      quoteMark: 'on',
    }),
    picks: p({sectionJoin: 'angled', dividerCarry: ['cards'], headingRule: 'line'}),
    previous: [{settings: {fontPairingPreset: 4, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'sharp', buttonShape: 'square', buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'balanced', cardHover: 'accentBorder', attorneyCardStyle: 'minimal', headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'framed', patternTexture: 'diagonalHatch', patternGround: 'dark'}, picks: p({sectionJoin: 'angled', dividerCarry: ['cards'], headingRule: 'line'})}],
    suggestedPalettes: ['black-gold', 'ink-lavender', 'black-crimson'],
    evidence: ['two-line heading unit with a short rule', 'thin-framed boxes', 'diagonal cuts', 'textured bands'],
  },
  {
    id: 'walnut', name: 'Walnut', feel: 'heritage: old-style serif, italic last words, framed photos',
    identity: {
      sentence: "Heritage: an old-style serif, italic last words, framed photos, a diamond under each heading.",
      recognizers: ['typeVoice', 'frame', 'kicker'],
    },
    settings: t({
      fontPairingPreset: 13, marketingScale: 'sm', taglineStyle: 'titlecase', uiRadius: 'subtle', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'lift', attorneyCardStyle: 'classic',
      headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'framed',
      brandGhost: 'on',
      dropCap: 'on',
    }),
    picks: p({headingRule: 'leadDiamond'}),
    previous: [{settings: {fontPairingPreset: 13, marketingScale: 'sm', taglineStyle: 'titlecase', uiRadius: 'subtle', buttonShape: 'square', buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed', cardHover: 'lift', attorneyCardStyle: 'classic', headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'framed'}, picks: p({headingRule: 'leadDiamond'})}],
    suggestedPalettes: ['navy-brass', 'navy-ice', 'black-gold', 'burgundy-gold'],
    evidence: ['serif headline with its last words in italic', 'thin outline buttons', 'ochre rule'],
  },
  {
    id: 'dune', name: 'Dune', feel: 'soft and warm: rounded everything, pill buttons, a scallop texture',
    identity: {
      sentence: "Soft and warm: rounded everything, pill buttons, a scallop texture, dotted lines.",
      recognizers: ['cornerFamily', 'surfaceDevice', 'typeVoice'],
    },
    settings: t({
      fontPairingPreset: 6, marketingScale: 'sm', taglineStyle: 'plain', uiRadius: 'soft', buttonShape: 'pill',
      buttonAnimation: 'lift', tertiaryStyle: 'plain', elevationStyle: '1', motionTempo: 'relaxed',
      cardHover: 'lift', attorneyCardStyle: 'portrait',
      headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'plain',
      patternTexture: 'scallop', patternGround: 'light',
    }),
    picks: p({headingRule: 'dotted'}),
    previous: [],
    suggestedPalettes: ['green-coral', 'green-sage', 'navy-rose'],
    evidence: ['italic accent phrase', 'pill buttons and rounded photo corners', 'inset rounded panels on a textured ground'],
  },
  {
    id: 'flint', name: 'Flint', feel: 'bold two-tone: heavy capitals, one phrase in the accent, angled edges',
    identity: {
      sentence: "Bold two-tone: heavy capitals, one phrase in the accent, a slab under each heading.",
      recognizers: ['headingCase', 'cornerFamily', 'attorneyCards'],
    },
    settings: t({
      fontPairingPreset: 7, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'rounded', buttonShape: 'rounded',
      buttonAnimation: 'fill-center', tertiaryStyle: 'tracked', elevationStyle: '2', motionTempo: 'snappy',
      cardHover: 'imageZoom', attorneyCardStyle: 'spotlight',
      headingEmphasisStyle: 'color', headingCase: 'upper', imageFrame: 'plain',
    }),
    picks: p({headingRule: 'slab'}),
    previous: [],
    suggestedPalettes: ['navy-orange', 'black-crimson', 'navy-rose'],
    evidence: ['bold sans with one phrase in a second color', 'uppercase headings', 'angled panels'],
  },
  {
    id: 'marble', name: 'Marble', feel: 'civic statement: capitals, a rule before every kicker, a fine lattice',
    identity: {
      sentence: "Civic statement: capitals, a rule before every kicker, a fine lattice, a peak under the hero.",
      recognizers: ['headingCase', 'kicker', 'surfaceDevice'],
    },
    settings: t({
      fontPairingPreset: 1, marketingScale: 'md', taglineStyle: 'lined', uiRadius: 'sharp', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'accentUnderline', attorneyCardStyle: 'classic',
      headingEmphasisStyle: 'italic', headingCase: 'upper', imageFrame: 'plain',
      patternTexture: 'diamondLattice', patternGround: 'light',
      dropCap: 'on',
    }),
    picks: p({sectionJoin: 'peak', dividerCarry: ['cards']}),
    previous: [{settings: {fontPairingPreset: 1, marketingScale: 'md', taglineStyle: 'lined', uiRadius: 'sharp', buttonShape: 'square', buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'relaxed', cardHover: 'accentUnderline', attorneyCardStyle: 'classic', headingEmphasisStyle: 'italic', headingCase: 'upper', imageFrame: 'plain', patternTexture: 'diamondLattice', patternGround: 'light'}, picks: p({sectionJoin: 'peak', dividerCarry: ['cards']})}],
    suggestedPalettes: ['forest-brass', 'charcoal-coral', 'navy-orange'],
    evidence: ['a short gold rule then a spaced-caps kicker above every heading', 'square filled buttons', 'a damask ground'],
  },
  {
    id: 'linen', name: 'Linen', feel: 'stationery: a quiet serif, offset photo slabs, a pinstripe',
    identity: {
      sentence: "Stationery: a quiet serif at regular weight, photos on offset slabs, a pinstripe.",
      recognizers: ['frame', 'surfaceDevice', 'scale'],
    },
    settings: t({
      fontPairingPreset: 15, marketingScale: 'default', taglineStyle: 'titlecase', uiRadius: 'sharp', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'none', attorneyCardStyle: 'minimal',
      headingWeight: 'regular', headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'slab',
      patternTexture: 'pinstripe', patternGround: 'light',
    }),
    picks: p({headingRule: 'line'}),
    previous: [{settings: {fontPairingPreset: 15, marketingScale: "default", taglineStyle: "titlecase", uiRadius: "sharp", buttonShape: "square", buttonAnimation: "none", tertiaryStyle: "plain", elevationStyle: "0", motionTempo: "relaxed", cardHover: "none", attorneyCardStyle: "minimal", headingEmphasisStyle: "italic", headingCase: "normal", imageFrame: "slab", patternTexture: "pinstripe", patternGround: "light"}, picks: p({sectionJoin: null, headingRule: "line"})}],
    suggestedPalettes: ['navy-brass', 'burgundy-gold', 'black-crimson', 'slate-cream'],
    evidence: ['a gold italic second line over a short dash', 'photos offset on flat slabs', 'pinstripe and diamond textures'],
  },
  {
    id: 'valley', name: 'Valley', feel: 'place-led: an open serif, soft corners, rounded photos',
    identity: {
      sentence: "Place-led: an open serif at regular weight, soft corners, rounded photos.",
      recognizers: ['typeVoice', 'cornerFamily', 'emphasis'],
    },
    settings: t({
      fontPairingPreset: 9, marketingScale: 'sm', taglineStyle: 'titlecase', uiRadius: 'soft', buttonShape: 'stadium',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '1', motionTempo: 'relaxed',
      cardHover: 'imageZoom', attorneyCardStyle: 'portrait',
      headingWeight: 'regular', headingEmphasisStyle: 'color', headingCase: 'normal', imageFrame: 'plain',
    }),
    picks: p({headingRule: 'line'}),
    previous: [{settings: {fontPairingPreset: 9, marketingScale: "sm", taglineStyle: "titlecase", uiRadius: "soft", buttonShape: "stadium", buttonAnimation: "none", tertiaryStyle: "plain", elevationStyle: "1", motionTempo: "relaxed", cardHover: "imageZoom", attorneyCardStyle: "portrait", headingEmphasisStyle: "color", headingCase: "normal", imageFrame: "plain", patternTexture: null, patternGround: "light"}, picks: p({sectionJoin: null, headingRule: "line"})}],
    suggestedPalettes: ['navy-brass', 'navy-ice', 'forest-brass'],
    evidence: ['headlines over a short mustard rule', 'rounded inset panels', 'local photography'],
  },
  {
    id: 'quartz', name: 'Quartz', feel: 'modern clean: geometric capitals, pills, a scallop texture',
    identity: {
      sentence: "Modern clean: geometric capitals, pills, a scallop texture, a lead dot under each heading.",
      recognizers: ['headingCase', 'cornerFamily', 'attorneyCards'],
    },
    settings: t({
      fontPairingPreset: 14, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'soft', buttonShape: 'pill',
      buttonAnimation: 'sweep', tertiaryStyle: 'plain', elevationStyle: '1', motionTempo: 'balanced',
      cardHover: 'lift', attorneyCardStyle: 'avatar',
      headingEmphasisStyle: 'color', headingCase: 'upper', imageFrame: 'plain',
      patternTexture: 'scallop', patternGround: 'light',
    }),
    picks: p({sectionJoin: 'notch', headingRule: 'leadDot'}),
    previous: [],
    suggestedPalettes: ['teal-mint', 'slate-cream', 'navy-rose'],
    evidence: ['a heavy caps line whose last words turn to the accent', 'a short rule beneath', 'everything a pill'],
  },
]

// ─── Reading a stored document ────────────────────────────────────────────────

/** The stored Design Settings, as far as a theme is concerned: the fields it is matched
 *  by, and the picks it sets but is not matched by (Phase 16C). */
export type ThemeDoc = Partial<Record<ThemeField | ThemePickField, unknown>> & {
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
 *  default it renders; a dark texture ground with no texture reads as light; and a
 *  weight the heading face cannot draw reads as the one it does (Phase 16C: with font
 *  synthesis off, "bold" on a 400-only pairing renders regular, so a site that never
 *  chose a weight still matches a theme that names the real one). */
export function readThemeField(doc: ThemeDoc, field: ThemeField): ThemeValue {
  const v = doc[field]
  if (field === 'fontPairingPreset') return getPresetById(Number(v)) ? Number(v) : null
  if (field === 'patternGround' && readThemeField(doc, 'patternTexture') === null) return THEME_DEFAULTS.patternGround
  const value = typeof v === 'string' && OPTIONS[field].includes(v) ? v : THEME_DEFAULTS[field]
  if (field === 'headingWeight') return drawableWeight(readThemeField(doc, 'fontPairingPreset') as number | null, value as string)
  return value
}

/** The weight a pairing's heading face can actually draw. A face with no 700 renders
 *  regular whatever is asked for (`font-synthesis-weight: none`), and a face with only a
 *  bold renders bold. */
export function drawableWeight(pairing: number | null, wanted: string): string {
  const weights = getPresetById(Number(pairing))?.heading.weights
  if (!weights) return wanted
  const hasBold = weights.some((w) => Number(w) >= 600)
  const hasRegular = weights.some((w) => Number(w) < 600)
  if (wanted === 'bold' && !hasBold) return 'regular'
  if (wanted === 'regular' && !hasRegular) return 'bold'
  return wanted
}

/** The values a visitor can tell apart, for the uniqueness test and the Studio's
 *  recogniser labels. */
export function signatureOf(theme: Theme): Record<SignatureDimension, string> {
  const s = theme.settings
  const preset = getPresetById(Number(s.fontPairingPreset))
  const voice: HeadingVoice | 'system' = preset?.heading.voice ?? 'system'
  const weight = drawableWeight(s.fontPairingPreset as number | null, String(s.headingWeight))
  const family = matchCornerFamily(String(s.uiRadius), String(s.buttonShape))?.id ?? 'custom'
  const texture = s.patternTexture ? `${s.patternTexture}/${s.patternGround}` : 'none'
  return {
    typeVoice: `${voice}/${weight}`,
    headingCase: String(s.headingCase),
    // Soft and Round are one family at a glance: a stadium and a pill read the same.
    cornerFamily: family === 'round' ? 'soft' : family,
    surfaceDevice: s.patternTexture ? texture : `frame/${s.imageFrame}`,
    // Phase 16D. The ghost is its own HIGH dimension, appended, never folded into
    // `surfaceDevice`: folded in, a theme that has both a texture and a ghost hid its
    // ghost from the test while a theme with only a ghost had it counted, which is
    // incoherent, and it produced a "measurement" that did not reproduce (§16.5
    // amendments 7 and 20). The two ornaments are one LOW dimension together.
    ghost: String(s.brandGhost),
    ornaments: [s.dropCap === 'on' ? 'dropCap' : '', s.quoteMark === 'on' ? 'quoteMark' : ''].filter(Boolean).join('+') || 'none',
    emphasis: String(s.headingEmphasisStyle),
    kicker: String(s.taglineStyle),
    frame: String(s.imageFrame),
    attorneyCards: String(s.attorneyCardStyle),
    texture,
    shadow: String(s.elevationStyle),
    scale: String(s.marketingScale),
  }
}

/** The dimensions on which two themes differ, split as the test reads them. */
export function signatureDifferences(a: Theme, b: Theme): {high: SignatureDimension[]; all: SignatureDimension[]} {
  const sa = signatureOf(a)
  const sb = signatureOf(b)
  const all = SIGNATURE.filter((d) => sa[d] !== sb[d])
  return {high: all.filter((d) => (SIGNATURE_HIGH as readonly string[]).includes(d)), all: [...all]}
}

// A site rendering its own uploaded fonts is matched without the pairing — and without
// the weight, which is read as the face can draw it and that face is the site's own
// (Phase 16C).
function fieldsFor(doc: ThemeDoc): readonly ThemeField[] {
  return usesCustomFonts(doc) ? THEME_FIELDS.filter((f) => f !== 'fontPairingPreset' && f !== 'headingWeight') : THEME_FIELDS
}

function equals(doc: ThemeDoc, settings: ThemeSettings): boolean {
  const asDoc = settings as ThemeDoc
  return fieldsFor(doc).every((f) => readThemeField(doc, f) === readThemeField(asDoc, f))
}

export type ThemeMatch = {theme: Theme; current: boolean; version?: Theme['previous'][number]}

/** The theme whose values the stored settings equal, now or in an earlier
 *  version, or null ("Custom"). */
export function matchTheme(doc: ThemeDoc): ThemeMatch | null {
  for (const theme of THEMES) if (equals(doc, theme.settings)) return {theme, current: true}
  for (const theme of THEMES) {
    const version = theme.previous.find((v) => equals(doc, {...THEME_DEFAULTS, ...v.settings}))
    if (version) return {theme, current: false, version}
  }
  return null
}

/** The picks the site wears that its matched version does not, for the Studio's line
 *  ("Divider · Arc (Graphite's is Angled)"). A site matches a version, so a swap is
 *  named against THAT version's picks, not against the current ones (`[R-485]`). */
export function swappedPicks(doc: ThemeDoc, match: ThemeMatch): {field: ThemePickField; site: unknown; theme: unknown}[] {
  const theirs = match.version?.picks ?? match.theme.picks
  const out: {field: ThemePickField; site: unknown; theme: unknown}[] = []
  for (const field of THEME_PICKS) {
    const site = readPick(doc, field)
    const mine = theirs[field]
    const same = field === 'dividerCarry'
      ? (site as string[]).join() === (mine as readonly string[]).join()
      : (site ?? null) === (mine ?? null)
    if (!same) out.push({field, site, theme: mine})
  }
  return out
}

/** A stored pick, read the way the site reads it: unknown values, `straight` and `none`
 *  all read as "none picked". */
export function readPick(doc: ThemeDoc, field: ThemePickField): string | null | readonly CarryPiece[] {
  const v = (doc as Record<string, unknown>)[field]
  if (field === 'dividerCarry') return Array.isArray(v) ? CARRY_PIECES.filter((piece) => (v as unknown[]).includes(piece)) : []
  const options: readonly string[] = field === 'sectionJoin' ? DIVIDERS : HEADING_LINES
  return typeof v === 'string' && options.includes(v) && v !== 'straight' && v !== 'none' ? v : null
}

/** True when the settings are what the build writes and nobody has chosen a
 *  theme: every field at its default, with the build's pairing or none. */
export function isPlatformDefault(doc: ThemeDoc): boolean {
  return fieldsFor(doc).every((f) =>
    f === 'fontPairingPreset' ? [null, 1].includes(readThemeField(doc, f) as number | null) : readThemeField(doc, f) === THEME_DEFAULTS[f],
  )
}

/** The one patch that applies a theme: set every value it names, unset every field it
 *  leaves to the default, never touch a color or a section, and leave the pairing alone
 *  on a site that uses its own fonts. Choosing a theme also sets its picks (`[R-485]`:
 *  picking a theme sets its defaults); `keepPicks` is for "Apply the current X", where a
 *  pick the site swapped on purpose survives the update. */
export function themePatch(
  theme: Theme,
  doc: ThemeDoc = {},
  keepPicks: readonly ThemePickField[] = [],
): {set: Record<string, string | number | string[]>; unset: string[]} {
  const set: Record<string, string | number | string[]> = {}
  const unset: string[] = []
  for (const field of fieldsFor(doc)) {
    const value = theme.settings[field]
    if (value === null) unset.push(field)
    else set[field] = value
  }
  for (const field of THEME_PICKS) {
    if (keepPicks.includes(field)) continue
    const value: string | null | readonly CarryPiece[] = theme.picks[field]
    if (value === null || (Array.isArray(value) && value.length === 0)) unset.push(field)
    else set[field] = Array.isArray(value) ? [...value] : (value as string)
  }
  return {set, unset}
}

/** Applying a theme's update: the settings and any pick the site had NOT swapped away
 *  from the version it matched. A deliberate swap survives (ADV-P16C-A). */
export function updatePatch(doc: ThemeDoc, match: ThemeMatch) {
  const swapped = swappedPicks(doc, match).map((s) => s.field)
  return themePatch(match.theme, doc, swapped)
}
