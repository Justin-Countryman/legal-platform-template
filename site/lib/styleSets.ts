import {drawableWeight, getPresetById, type HeadingVoice} from '../fonts/presets'
export {drawableWeight} from '../fonts/presets'
import {matchCornerFamily} from './corners'
import {HEADING_LINES} from './headingLines'
import {
  BUTTON_SHAPE_MAP, ELEVATION_STYLE_MAP, HEADING_CASES, HEADING_EMPHASIS_STYLES, HEADING_WEIGHTS, MARKETING_SCALE_MAP,
  MOTION_TEMPO_MAP, SECTION_TEXTURES, TAGLINE_STYLE_MAP, TERTIARY_STYLE_MAP, UI_RADIUS_MAP,
} from './designTokens'

// ─── Style sets (Phase 16B; named in Phase 17C) ───────────────────────────────
//
// A style set is the site's signature and its UI system, applied everywhere
// automatically; the colors (the palette) and the story (which sections, in what
// order) stay separate (Justin, 2026-09-18). It works exactly like a palette
// (lib/palettes.ts) and a corner family (lib/corners.ts): choosing one in the
// Studio WRITES the design settings below, the settings are the truth after that,
// and the active style set is DERIVED by matching the stored values. Nothing stores
// which style set a site wears and the site never reads one, so a style set retuned
// later changes no built site until someone applies it again (Justin: exact match
// only, an earlier version of the same style set included).
//
// Every style set names every field. `null` means it leaves the field unset, which
// renders the field's default. No style set writes a color, so any style set wears
// any palette the same way, and none touches a section: a look set on one section
// on purpose stays as it was set.
//
// Provenance. Each style set is drawn from the sample sites of the homepage field
// study that the monorepo's decisions log names for it (ruling 10). The records,
// by domain, are cited in the monorepo's Phase 16 design record, because the
// template carries no firm identity. Values are provisional until the Phase 18
// eye pass.
//
// ─── Phase 16C: three parts, and what makes a style set its own ───────────────
//
// A style set is three things:
//   settings — the fields it writes and is MATCHED by (`STYLE_SET_FIELDS`);
//   picks    — the libraries it only suggests: since Phase 17B the one line under
//              section headings. It sits OUTSIDE the match, like the palette, so a
//              site that swaps it keeps the style set's name (`[R-485]`);
//   identity — a sentence and the two or three things a visitor recognises.
//
// UNIQUENESS IS A TEST, not a promise (`[R-487]`; `__tests__/styleSets.test.ts`). It is
// measured on the SETTINGS only, because a style set's name survives its pick being
// swapped, and on what a visitor can actually tell apart: the heading's VOICE (its
// face's class, not its family: two Fraunces pairings are one voice) with the weight
// that face can draw, the heading case, the corner family (Soft and Round count as
// one at a glance), and the surface device — four "high" dimensions — plus seven
// lower ones. Every pair of style sets differs in at least two high and five in all,
// and each style set's recognisers belong to no other. One that crowds another fails
// the test rather than shipping.
//
// ─── Phase 17B: the page devices left the style set; Phase 17C: its name ──────
//
// Justin, 2026-09-22 (`[R-505]`, `[R-509]`, `[R-510]`): the atoms and molecules that
// repeat inside every section are a style set; a THEME is the flow of the page, and
// lives in `lib/flows.ts` as a stored id plus a rule set. The six page-level fields a
// style set used to write are the theme's now: the divider's shape and its carried
// pieces (the two picks), the texture's ground, the ghost, the overlap and the
// gradient (four matched fields). A style set has 17 matched fields and ONE pick, the
// heading line, and its patch writes 18 keys. The six stay in the schema hidden for
// one pin, read by nothing but the compat bridge (`flowOf`), and the Studio shows
// them nowhere. Phase 17C (`[R-535]`) gave the style set its name in code: this file
// was `lib/themes.ts`, and nothing in the code says theme for the style set
// (`eslint-rules/lib/style-set-names.js` holds the old names).

export const STYLE_SET_FIELDS = [
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
  // The texture KIND stays a style-set atom (moving it breaks the uniqueness floor,
  // measured 1 high and 3 in all); its GROUND is the theme's paint since Phase 17B.
  'patternTexture',
  // Phase 16D, the drawn element a style set can turn on. A plain string field, not one
  // array: a matched array reads as its default in both `readStyleSetField` and
  // `presets.py:read`, which both gate on `typeof value === 'string'`, so a site
  // that changed one would still match the style set and the patch would write an
  // empty array into the dataset (measured, ADV-16D-A F12 and ADV-16D-C).
  //
  // Justin, 2026-09-21: only the divider and the drop cap ship ON in a style set, and
  // since Phase 17B the divider is the theme's (`[R-513]`), so the drop cap is the
  // one drawn element a style set still turns on (`[R-497]`, amended by `[R-510]`).
  // The ghost (16D), the overlap (16E, `[R-499]`, `[R-500]`) and the gradient (16F,
  // `[R-502]`) are theme devices now and are matched by no style set.
  'dropCap',
] as const

export type StyleSetField = (typeof STYLE_SET_FIELDS)[number]

/** What a visitor can tell apart at rest, derived from the settings (`[R-487]`). The
 *  first four are the ones a visitor names first, and a pair of style sets must differ in at
 *  least two of them. */
export const SIGNATURE_HIGH = ['typeVoice', 'headingCase', 'cornerFamily', 'surfaceDevice'] as const
// Phase 17C session 2b (ADV-17C-B): the texture counts ONCE, as the surface device; and `scale`
// is the hero's rendered size (`sm` 67 px, `md` and `lg` both 88 px at 1440, `default` 56), not
// the stored word. Seven low dimensions.
export const SIGNATURE_LOW = ['emphasis', 'kicker', 'frame', 'attorneyCards', 'shadow', 'scale', 'ornaments'] as const
export const SIGNATURE = [...SIGNATURE_HIGH, ...SIGNATURE_LOW] as const
export type SignatureDimension = (typeof SIGNATURE)[number]

/** The library a style set suggests but is not matched by (`[R-485]`): picking a style
 *  set sets it, swapping it keeps the style set's name, and the Studio says it was swapped.
 *  Stored beside the settings, and never compared. One pick since Phase 17B: the
 *  divider and its carried pieces are the theme's (`[R-513]`). */
export const STYLE_SET_PICKS = ['headingRule'] as const
export type StyleSetPickField = (typeof STYLE_SET_PICKS)[number]
export type StyleSetPicks = {
  /** The line under section headings (`lib/headingLines.ts`); `null` draws none. */
  headingRule: string | null
}
export const PICK_DEFAULTS: StyleSetPicks = {headingRule: null}
export type StyleSetValue = string | number | null
export type StyleSetSettings = Record<StyleSetField, StyleSetValue>

export type StyleSet = {
  id: string
  name: string
  /** A few words shown under the name in the Studio. */
  feel: string
  /** What a visitor recognises: one sentence, and two or three signature dimensions
   *  whose values together no other style set holds (`[R-487]`). */
  identity: {sentence: string; recognizers: readonly SignatureDimension[]}
  settings: StyleSetSettings
  picks: StyleSetPicks
  /** The style set's earlier settings and picks, oldest first. Append only: when one is
   *  retuned, its old values move here, so a site that still wears them reads
   *  "(earlier version)" instead of "Custom", and the Studio compares a swapped pick
   *  against the version the site actually matches. */
  previous: readonly {settings: Partial<StyleSetSettings>; picks: StyleSetPicks}[]
  /** True only after an eye pass judged it at arm's length on the three record canvases at
   *  1440 and 390 and recorded the verdict with its captures (`[R-506]`; Phase 17C session 2b).
   *  Mirrored to `presets.json`; the switcher says "(not yet judged)" while false. */
  passed: boolean
  /** Palettes that suit it (lib/palettes.ts ids). Never written: a style set sets no color. */
  suggestedPalettes: readonly string[]
  /** The study's words for it. */
  evidence: readonly string[]
}

// The values each field a style set owns can take. The schema's option lists hold the
// same values (lib/__tests__/styleSets.test.ts reads them from studio/field-map.json).
export const CARD_HOVERS = ['imageZoom', 'lift', 'glow', 'accentBorder', 'accentUnderline', 'none'] as const
export const ATTORNEY_CARD_STYLES = ['classic', 'portrait', 'avatar', 'minimal', 'spotlight'] as const
export const IMAGE_FRAMES = ['plain', 'framed', 'slab'] as const
export const BUTTON_ANIMATIONS = ['none', 'sweep', 'fill-center', 'inset', 'lift'] as const
/** Phase 16D: the drawn element is off or on. Absent is off. */
export const DRAWN_ELEMENT_STATES = ['none', 'on'] as const

const OPTIONS: Record<Exclude<StyleSetField, 'fontPairingPreset'>, readonly string[]> = {
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
  dropCap: DRAWN_ELEMENT_STATES,
}

/** What an ABSENT field renders: the default each reader falls back to. */
export const STYLE_SET_DEFAULTS: StyleSetSettings = {
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
  dropCap: 'none',
}

/** Studio labels for the fields, used where a difference is named. */
export const STYLE_SET_FIELD_LABELS: Record<StyleSetField, string> = {
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
  dropCap: 'Drop cap',
}

/** Studio labels for the picks. */
export const STYLE_SET_PICK_LABELS: Record<StyleSetPickField, string> = {
  headingRule: 'Heading line',
}

const t = (s: Partial<StyleSetSettings>): StyleSetSettings => ({...STYLE_SET_DEFAULTS, ...s})
const p = (s: Partial<StyleSetPicks>): StyleSetPicks => ({...PICK_DEFAULTS, ...s})

// ─── The roster: eight that each look different (Phase 17C session 2b, `[R-534]`) ──
//
// Five kept (Graphite the fixture's, unchanged; Walnut to `md`; Marble's accent words in
// color; Dune and Flint unchanged), three new voices (Iron the condensed capitals, Birch the
// light geometric sans, Clay the bold plain sans), and five retired as copies at arm's length
// (`RETIRED_STYLE_SETS` below). `passed` is set only by an eye pass recorded with its captures
// (`[R-506]`, `[R-517]`): the eight passed on 2026-09-25, the three record canvases at 1440 and a
// true 390 under Cut blocks balanced, Editorial and Type on black, a verdict per style set and
// per pair (the monorepo's WS-V1-PHASE17C2B-DESIGN §8.3). Graphite is first, so
// `STYLE_SETS[0]` is the match cases' first patch in both languages (`presets.json`).
export const STYLE_SETS: readonly StyleSet[] = [
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
      patternTexture: 'diagonalHatch',
    }),
    picks: p({headingRule: 'line'}),
    // Phase 17B: the one earlier version differed only by the overlap; pruned.
    previous: [],
    passed: true,
    suggestedPalettes: ['black-gold', 'ink-lavender', 'black-crimson'],
    evidence: ['two-line heading unit with a short rule', 'thin-framed boxes', 'diagonal cuts', 'textured bands'],
  },
  {
    id: 'walnut', name: 'Walnut', feel: 'heritage: old-style serif at regular weight, italic last words, framed photos',
    identity: {
      sentence: "Heritage: an old-style serif, italic last words, framed photos, a diamond under each heading.",
      recognizers: ['typeVoice', 'frame', 'kicker'],
    },
    settings: t({
      fontPairingPreset: 13, marketingScale: 'md', taglineStyle: 'titlecase', uiRadius: 'subtle', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'lift', attorneyCardStyle: 'classic',
      headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'framed',
      dropCap: 'on',
    }),
    picks: p({headingRule: 'leadDiamond'}),
    // Phase 17C session 2b (`[R-534]`): scale `sm` to `md` (the audit's "under-sized"; the roster's
    // one regular-weight serif). The `69fee75` version, and 16D's before the drop cap, stand.
    previous: [
      {settings: {fontPairingPreset: 13, marketingScale: 'sm', taglineStyle: 'titlecase', uiRadius: 'subtle', buttonShape: 'square', buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed', cardHover: 'lift', attorneyCardStyle: 'classic', headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'framed'}, picks: p({headingRule: 'leadDiamond'})},
      {settings: {fontPairingPreset: 13, marketingScale: 'sm', taglineStyle: 'titlecase', uiRadius: 'subtle', buttonShape: 'square', buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed', cardHover: 'lift', attorneyCardStyle: 'classic', headingEmphasisStyle: 'italic', headingCase: 'normal', imageFrame: 'framed', dropCap: 'on'}, picks: p({headingRule: 'leadDiamond'})},
    ],
    passed: true,
    suggestedPalettes: ['navy-brass', 'navy-ice', 'black-gold', 'burgundy-gold'],
    evidence: ['serif headline with its last words in italic', 'thin outline buttons', 'ochre rule'],
  },
  {
    id: 'marble', name: 'Marble', feel: 'civic statement: a display serif at regular weight, capitals, a rule before every kicker, a fine lattice',
    identity: {
      sentence: "Civic statement: a display serif at regular weight, capitals, a rule before every kicker, a fine lattice.",
      recognizers: ['headingCase', 'kicker', 'surfaceDevice'],
    },
    settings: t({
      fontPairingPreset: 1, marketingScale: 'md', taglineStyle: 'lined', uiRadius: 'sharp', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'relaxed',
      cardHover: 'accentUnderline', attorneyCardStyle: 'classic',
      headingWeight: 'regular', headingEmphasisStyle: 'color', headingCase: 'upper', imageFrame: 'plain',
      patternTexture: 'diamondLattice',
      dropCap: 'on',
    }),
    picks: p({}),
    // Phase 17B: the second earlier version differed only by the overlap; pruned. The
    // first (before the drop cap, 16D) stands. Phase 17C session 2b (`[R-534]`): accent words in
    // color, not italic inside capitals (the audit's incoherence), and the hero at Playfair's
    // REGULAR, which the eye pass read apart from Graphite's bold Fraunces where the bold did not
    // (the session record §8.3); the `69fee75` version stands.
    previous: [
      {settings: {fontPairingPreset: 1, marketingScale: 'md', taglineStyle: 'lined', uiRadius: 'sharp', buttonShape: 'square', buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'relaxed', cardHover: 'accentUnderline', attorneyCardStyle: 'classic', headingEmphasisStyle: 'italic', headingCase: 'upper', imageFrame: 'plain', patternTexture: 'diamondLattice'}, picks: p({})},
      {settings: {fontPairingPreset: 1, marketingScale: 'md', taglineStyle: 'lined', uiRadius: 'sharp', buttonShape: 'square', buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'relaxed', cardHover: 'accentUnderline', attorneyCardStyle: 'classic', headingEmphasisStyle: 'italic', headingCase: 'upper', imageFrame: 'plain', patternTexture: 'diamondLattice', dropCap: 'on'}, picks: p({})},
    ],
    passed: true,
    suggestedPalettes: ['forest-brass', 'charcoal-coral', 'navy-orange'],
    evidence: ['a short gold rule then a spaced-caps kicker above every heading', 'square filled buttons', 'a damask ground'],
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
      patternTexture: 'scallop',
    }),
    picks: p({headingRule: 'dotted'}),
    previous: [],
    passed: true,
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
    passed: true,
    suggestedPalettes: ['navy-orange', 'black-crimson', 'navy-rose'],
    evidence: ['bold sans with one phrase in a second color', 'uppercase headings', 'angled panels'],
  },
  {
    id: 'iron', name: 'Iron', feel: 'industrial: condensed capitals, square corners, photos on a heavy slab, a grid',
    identity: {
      sentence: "Industrial: condensed capitals, square corners, photos on a heavy slab, a grid.",
      recognizers: ['typeVoice', 'headingCase', 'frame'],
    },
    settings: t({
      fontPairingPreset: 19, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'sharp', buttonShape: 'square',
      buttonAnimation: 'inset', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'snappy',
      cardHover: 'accentBorder', attorneyCardStyle: 'spotlight',
      headingEmphasisStyle: 'color', headingCase: 'upper', imageFrame: 'slab',
      patternTexture: 'grid',
    }),
    picks: p({headingRule: 'vertical'}),
    previous: [],
    passed: true,
    suggestedPalettes: ['black-crimson', 'black-gold', 'charcoal-coral'],
    evidence: ['condensed capitals in six of the study\'s notes, Oswald the one face named', 'a vertical rule beside headings', 'photos on a heavy slab', 'the audit\'s criminal voice'],
  },
  {
    id: 'birch', name: 'Birch', feel: 'light and open: thin display headings, pills, round photos, a field of dots',
    identity: {
      sentence: "Light and open: thin display headings, pill buttons, round photos, a field of dots.",
      recognizers: ['typeVoice', 'cornerFamily', 'attorneyCards'],
    },
    settings: t({
      fontPairingPreset: 20, marketingScale: 'md', taglineStyle: 'titlecase', uiRadius: 'soft', buttonShape: 'pill',
      buttonAnimation: 'lift', tertiaryStyle: 'plain', elevationStyle: '1', motionTempo: 'relaxed',
      cardHover: 'lift', attorneyCardStyle: 'avatar',
      headingWeight: 'light', headingEmphasisStyle: 'color', headingCase: 'normal', imageFrame: 'plain',
      patternTexture: 'dots',
    }),
    picks: p({headingRule: 'fade'}),
    previous: [],
    passed: true,
    suggestedPalettes: ['green-sage', 'navy-rose', 'slate-cream'],
    evidence: ['the audit\'s light-weight soft voice', 'light headings on 2 of 65 study sites', 'pills and round photos (Quartz\'s avatar cards)'],
  },
  {
    id: 'clay', name: 'Clay', feel: 'plain and direct: one bold humanist sans in mixed case, balanced corners, soft card shadows',
    identity: {
      sentence: "Plain and direct: one humanist sans in bold mixed case, balanced corners, soft card shadows.",
      recognizers: ['typeVoice', 'headingCase', 'shadow'],
    },
    settings: t({
      fontPairingPreset: 21, marketingScale: 'md', taglineStyle: 'titlecase', uiRadius: 'rounded', buttonShape: 'rounded',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '2', motionTempo: 'balanced',
      cardHover: 'lift', attorneyCardStyle: 'classic',
      headingEmphasisStyle: 'color', headingCase: 'normal', imageFrame: 'plain',
      patternTexture: 'pinstripe',
    }),
    picks: p({headingRule: 'line'}),
    previous: [],
    passed: true,
    suggestedPalettes: ['navy-ice', 'teal-mint', 'navy-orange'],
    evidence: ['the study\'s bold mixed-case sans, five sites, which no style set spoke', 'a short rule under headings', 'card shadows'],
  },
]

/** Style sets that shipped and left the offered roster, each with the values it wrote, and the
 *  entry that retired it (`[R-534]`: Canyon's hero was Graphite's, Valley one design with Dune,
 *  Linen Walnut's voice, Granite a quieter Marble, Quartz one voice with Flint). A site wearing
 *  one keeps its look: `matchStyleSet` still names it, the Studio says "no longer offered;
 *  nothing on your site changed", the switcher shows "(retired)" beside "as the site is" and
 *  never offers it, a client link naming one enters as the site is (`lib/preview/plan.ts`,
 *  `grantStyleSet`), and the build never picks it. Never edited: a retired entry is a record. */
export const RETIRED_STYLE_SETS: readonly (StyleSet & {retired: string})[] = [
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
    }),
    picks: p({headingRule: 'line'}),
    // Phase 17B: both earlier versions differed from today only by the overlap and the
    // gradient, which left the matched set; pruned, so no version equals the current.
    previous: [],
    passed: false,
    retired: '[R-534]',
    suggestedPalettes: ['black-gold', 'burgundy-gold', 'teal-mint'],
    evidence: ['kicker above and a short rule below every heading', 'italic accent phrase', 'cutout portraits in rounded panels'],
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
      patternTexture: 'pinstripe',
    }),
    picks: p({headingRule: 'line'}),
    previous: [{settings: {fontPairingPreset: 15, marketingScale: "default", taglineStyle: "titlecase", uiRadius: "sharp", buttonShape: "square", buttonAnimation: "none", tertiaryStyle: "plain", elevationStyle: "0", motionTempo: "relaxed", cardHover: "none", attorneyCardStyle: "minimal", headingEmphasisStyle: "italic", headingCase: "normal", imageFrame: "slab", patternTexture: "pinstripe"}, picks: p({headingRule: "line"})}],
    passed: false,
    retired: '[R-534]',
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
    previous: [{settings: {fontPairingPreset: 9, marketingScale: "sm", taglineStyle: "titlecase", uiRadius: "soft", buttonShape: "stadium", buttonAnimation: "none", tertiaryStyle: "plain", elevationStyle: "1", motionTempo: "relaxed", cardHover: "imageZoom", attorneyCardStyle: "portrait", headingEmphasisStyle: "color", headingCase: "normal", imageFrame: "plain", patternTexture: null}, picks: p({headingRule: "line"})}],
    passed: false,
    retired: '[R-534]',
    suggestedPalettes: ['navy-brass', 'navy-ice', 'forest-brass'],
    evidence: ['headlines over a short mustard rule', 'rounded inset panels', 'local photography'],
  },
  {
    id: 'granite', name: 'Granite', feel: 'corporate navy: uppercase sans, framed photos',
    // Phase 17B: the gradient that named Granite (`[R-504]`) is a theme device now, so
    // its recogniser and sentence lose it. Its values are unchanged; re-identifying it
    // is the roster pass's (item 354, `[R-510]`).
    identity: {
      sentence: "Corporate navy: uppercase headings with one phrase in the accent, gold hairline frames.",
      recognizers: ['headingCase', 'typeVoice', 'frame'],
    },
    settings: t({
      fontPairingPreset: 5, marketingScale: 'sm', taglineStyle: 'plain', uiRadius: 'subtle', buttonShape: 'square',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '1', motionTempo: 'balanced',
      cardHover: 'accentBorder', attorneyCardStyle: 'classic',
      headingEmphasisStyle: 'color', headingCase: 'upper', imageFrame: 'framed',
    }),
    picks: p({headingRule: 'line'}),
    previous: [],
    passed: false,
    retired: '[R-534]',
    suggestedPalettes: ['navy-brass', 'navy-ice', 'navy-orange', 'navy-brick'],
    evidence: ['navy all-caps sans headings with a gold second line', 'gold hairline boxes framing cards and photos', 'a dark-to-oxblood gradient fading between bands'],
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
      patternTexture: 'scallop',
    }),
    picks: p({headingRule: 'leadDot'}),
    previous: [],
    passed: false,
    retired: '[R-534]',
    suggestedPalettes: ['teal-mint', 'slate-cream', 'navy-rose'],
    evidence: ['a heavy caps line whose last words turn to the accent', 'a short rule beneath', 'everything a pill'],
  },
]

// ─── Reading a stored document ────────────────────────────────────────────────

/** The stored Design Settings, as far as a style set is concerned: the fields it is matched
 *  by, and the picks it sets but is not matched by (Phase 16C). */
export type StyleSetDoc = Partial<Record<StyleSetField | StyleSetPickField, unknown>> & {
  customFonts?: {
    headingFont?: {regular?: {asset?: unknown} | null} | null
    bodyFont?: {regular?: {asset?: unknown} | null} | null
  } | null
}

/** True when the site's own uploaded fonts are what renders: uploads exist and no
 *  valid pairing is set (a set pairing wins over uploads, and the build writes one on
 *  every client). A style set then leaves the pairing alone, and matching ignores it. */
export function usesCustomFonts(doc: StyleSetDoc): boolean {
  const uploads = Boolean(doc.customFonts?.headingFont?.regular?.asset || doc.customFonts?.bodyFont?.regular?.asset)
  return uploads && !getPresetById(Number(doc.fontPairingPreset))
}

/** A stored value read the way the site reads it: absent, empty or unknown is the
 *  default it renders, and a weight the heading face cannot draw reads as the one it
 *  does (Phase 16C: with font synthesis off, "bold" on a 400-only pairing renders
 *  regular, so a site that never chose a weight still matches a style set that names the
 *  real one). */
export function readStyleSetField(doc: StyleSetDoc, field: StyleSetField): StyleSetValue {
  const v = doc[field]
  if (field === 'fontPairingPreset') return getPresetById(Number(v)) ? Number(v) : null
  const value = typeof v === 'string' && OPTIONS[field].includes(v) ? v : STYLE_SET_DEFAULTS[field]
  if (field === 'headingWeight') return drawableWeight(readStyleSetField(doc, 'fontPairingPreset') as number | null, value as string)
  return value
}

/** The values a visitor can tell apart, for the uniqueness test and the Studio's
 *  recogniser labels. */
export function signatureOf(styleSet: StyleSet): Record<SignatureDimension, string> {
  const s = styleSet.settings
  const preset = getPresetById(Number(s.fontPairingPreset))
  const voice: HeadingVoice | 'system' = preset?.heading.voice ?? 'system'
  const weight = drawableWeight(s.fontPairingPreset as number | null, String(s.headingWeight))
  const family = matchCornerFamily(String(s.uiRadius), String(s.buttonShape))?.id ?? 'custom'
  // Phase 17B: the texture's kind alone; its ground is the theme's paint.
  const texture = s.patternTexture ? String(s.patternTexture) : 'none'
  // The hero's rendered size: `md` and `lg` are one at 1440 (`clamp(…, 1rem + 5vw, …)` binds
  // below about 1,700 px), so only `sm` and `default` differ from them (ADV-17C-B, measured).
  const scale = s.marketingScale === 'md' || s.marketingScale === 'lg' ? 'large' : String(s.marketingScale)
  return {
    typeVoice: `${voice}/${weight}`,
    headingCase: String(s.headingCase),
    // Soft and Round are one family at a glance: a stadium and a pill read the same.
    cornerFamily: family === 'round' ? 'soft' : family,
    surfaceDevice: s.patternTexture ? texture : `frame/${s.imageFrame}`,
    // Phase 16D: the drop cap is a LOW dimension. The ghost, the overlap and the gradient
    // were dimensions here until Phase 17B moved them to the theme layer; the floor is
    // unchanged at 2 high and 5 in all without them (measured, ADV-17B-A F18, -C F5).
    ornaments: s.dropCap === 'on' ? 'dropCap' : 'none',
    emphasis: String(s.headingEmphasisStyle),
    kicker: String(s.taglineStyle),
    frame: String(s.imageFrame),
    attorneyCards: String(s.attorneyCardStyle),
    shadow: String(s.elevationStyle),
    scale,
  }
}

/** The dimensions on which two style sets differ, split as the test reads them. */
export function signatureDifferences(a: StyleSet, b: StyleSet): {high: SignatureDimension[]; all: SignatureDimension[]} {
  const sa = signatureOf(a)
  const sb = signatureOf(b)
  const all = SIGNATURE.filter((d) => sa[d] !== sb[d])
  return {high: all.filter((d) => (SIGNATURE_HIGH as readonly string[]).includes(d)), all: [...all]}
}

// A site rendering its own uploaded fonts is matched without the pairing — and without
// the weight, which is read as the face can draw it and that face is the site's own
// (Phase 16C).
function fieldsFor(doc: StyleSetDoc): readonly StyleSetField[] {
  return usesCustomFonts(doc) ? STYLE_SET_FIELDS.filter((f) => f !== 'fontPairingPreset' && f !== 'headingWeight') : STYLE_SET_FIELDS
}

function equals(doc: StyleSetDoc, settings: StyleSetSettings): boolean {
  const asDoc = settings as StyleSetDoc
  return fieldsFor(doc).every((f) => readStyleSetField(doc, f) === readStyleSetField(asDoc, f))
}

export type StyleSetMatch = {
  styleSet: StyleSet
  current: boolean
  version?: StyleSet['previous'][number]
  /** The entry that retired it, where the match is a retired style set (`[R-534]`). */
  retired?: string
}

/** The style set whose values the stored settings equal, now or in an earlier version, the
 *  offered roster first and then the retired one, or null ("Custom"). */
export function matchStyleSet(doc: StyleSetDoc): StyleSetMatch | null {
  for (const roster of [STYLE_SETS, RETIRED_STYLE_SETS] as const) {
    for (const styleSet of roster) if (equals(doc, styleSet.settings)) return {styleSet, current: true, ...('retired' in styleSet ? {retired: styleSet.retired} : {})}
    for (const styleSet of roster) {
      const version = styleSet.previous.find((v) => equals(doc, {...STYLE_SET_DEFAULTS, ...v.settings}))
      if (version) return {styleSet, current: false, version, ...('retired' in styleSet ? {retired: styleSet.retired} : {})}
    }
  }
  return null
}

/** The picks the site wears that its matched version does not, for the Studio's line
 *  ("Divider · Arc (Graphite's is Angled)"). A site matches a version, so a swap is
 *  named against THAT version's picks, not against the current ones (`[R-485]`). */
export function swappedPicks(doc: StyleSetDoc, match: StyleSetMatch): {field: StyleSetPickField; site: unknown; styleSet: unknown}[] {
  const theirs = match.version?.picks ?? match.styleSet.picks
  const out: {field: StyleSetPickField; site: unknown; styleSet: unknown}[] = []
  for (const field of STYLE_SET_PICKS) {
    const site = readPick(doc, field)
    const mine = theirs[field]
    if ((site ?? null) !== (mine ?? null)) out.push({field, site, styleSet: mine})
  }
  return out
}

/** A stored pick, read the way the site reads it: an unknown value and `none` both
 *  read as "none picked". */
export function readPick(doc: StyleSetDoc, field: StyleSetPickField): string | null {
  const v = (doc as Record<string, unknown>)[field]
  const options: readonly string[] = HEADING_LINES
  return typeof v === 'string' && options.includes(v) && v !== 'none' ? v : null
}

/** True when the settings are what the build writes and nobody has chosen a
 *  style set: every field at its default, with the build's pairing or none. */
export function isPlatformDefault(doc: StyleSetDoc): boolean {
  return fieldsFor(doc).every((f) =>
    f === 'fontPairingPreset' ? [null, 1].includes(readStyleSetField(doc, f) as number | null) : readStyleSetField(doc, f) === STYLE_SET_DEFAULTS[f],
  )
}

/** The one patch that applies a style set: set every value it names, unset every field it
 *  leaves to the default, never touch a color or a section, and leave the pairing alone
 *  on a site that uses its own fonts. Choosing a style set also sets its picks (`[R-485]`:
 *  picking a style set sets its defaults); `keepPicks` is for "Apply the current X", where a
 *  pick the site swapped on purpose survives the update. */
export function styleSetPatch(
  styleSet: StyleSet,
  doc: StyleSetDoc = {},
  keepPicks: readonly StyleSetPickField[] = [],
): {set: Record<string, string | number | string[]>; unset: string[]} {
  const set: Record<string, string | number | string[]> = {}
  const unset: string[] = []
  for (const field of fieldsFor(doc)) {
    const value = styleSet.settings[field]
    if (value === null) unset.push(field)
    else set[field] = value
  }
  for (const field of STYLE_SET_PICKS) {
    if (keepPicks.includes(field)) continue
    const value = styleSet.picks[field]
    if (value === null) unset.push(field)
    else set[field] = value
  }
  return {set, unset}
}

/** Applying a style set's update: the settings and any pick the site had NOT swapped away
 *  from the version it matched. A deliberate swap survives (ADV-P16C-A). */
export function updatePatch(doc: StyleSetDoc, match: StyleSetMatch) {
  const swapped = swappedPicks(doc, match).map((s) => s.field)
  return styleSetPatch(match.styleSet, doc, swapped)
}
