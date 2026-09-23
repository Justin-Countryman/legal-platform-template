import {converter, differenceCiede2000} from 'culori'
import {DIVIDERS, type Divider, type CarryPiece, dividerShape, readCarry} from './dividers'
import {readOverlap, type SectionOverlap} from './overlaps'
import {parseHexInput, resolvePalette, type ColorInputs} from './designTokens'

// ─── Themes: the flow of the page (Phase 17B) ─────────────────────────────────
//
// Justin, 2026-09-22 (`[R-505]`, `[R-506]`, `[R-509]`): the design layer is three
// named things. A STYLE SET (`lib/themes.ts`, which still calls itself a theme in
// code) owns what repeats inside every section; a PALETTE owns color; a THEME owns
// the flow down the page: how dark it is and which sections go dark, where the
// backgrounds merge and break, the shape of the breaks, what sits on the
// backgrounds, and where the one repeated device lands.
//
// A THEME IS RULES OVER ANY CANVAS, NEVER A LAYOUT. Every client's homepage has a
// different number of sections, so a theme cannot say "band four is navy"; it says
// "a third of the bands go dark, the ribbon and the testimonials first, never three
// in a row". The rules are DATA in a closed vocabulary, interpreted by one engine:
// the ground pass in `components/sections/sectionFrame.ts`, which runs on the server
// before the walk's adoption pass and fills every band that stores no surface. A
// stored per-band value always wins on its own band, and the theme reacts to it
// downstream (`[R-501]`'s adoption stays a law). Nothing runs in the visitor's
// browser: the engine's output is the classes and custom properties the shell
// already emits, plus one hairline rule.
//
// ONE STORED ID, `designSettings.flow`, of the form `<family>.<step>`. A style set
// and a palette write values and are matched back by value (`[R-469]`, `[R-477]`); a
// theme writes no value, so there is nothing to match it against, and it is the one
// stored design choice the site reads by name. Absent renders `DEFAULT_FLOW` on every
// client, built or propagated, which is item 308's one meaning of "nobody chose".
//
// FAMILIES AND STEPS. The darkness dial (mostly light, balanced, mostly dark, all
// dark) is a property of a theme FAMILY, and a family ships only the steps the eye
// has passed on real canvases through the switcher (`[R-509]`); it is never a fourth
// click. The roster below is generated from the families, so nothing is duplicated
// by hand and the step is never buried in a label. Three families ship here; the
// rest of the twelve in the vision's §3 arrive at the eye's pace, a few a session.
//
// THE VOCABULARY IS CLOSED. A rule it cannot say is a new word plus one engine clause,
// never a special case in a theme: that is the discipline the divider library set.
// `flows.test.ts` holds every generated theme to every word.
//
// The word `theme` in the code around this file means the style set until item 357
// is ruled; this layer is named `flow` in code and "Theme" in the Studio (`[R-514]`).

export const DARKNESS = ['mostlyLight', 'balanced', 'mostlyDark', 'allDark'] as const
export type Darkness = (typeof DARKNESS)[number]
export const DARKNESS_LABELS: Record<Darkness, string> = {
  mostlyLight: 'Mostly light', balanced: 'Balanced', mostlyDark: 'Mostly dark', allDark: 'All dark',
}

/** Which bands may go dark, named by the composer's role where the band carries one
 *  (its stable `_key`, `hp-<role>Block`) and otherwise by the member type and the content
 *  section's layout. The differentiators and the narrative are both a two-column content
 *  section, so only the key can tell them apart (ADV-17B-A F4, -B F4). */
export const HOSTS = [
  'ribbon', 'testimonials', 'attorneys', 'caseResults', 'areas', 'split', 'narrative',
  'differentiators', 'statement', 'statRow', 'badges', 'video', 'reviews',
] as const
export type Host = (typeof HOSTS)[number]

export const DARK_BUDGETS = ['none', 'third', 'threeQuarters', 'all'] as const
export const DARK_RHYTHMS = ['alternate', 'pairs', 'runs', 'bookends'] as const
export const DARK_PAINTS = ['plain', 'pattern', 'gradient', 'gradientPerBand', 'photo', 'saturated'] as const
export const CLOSES = ['dark', 'saturated', 'muted'] as const
export const LIGHT_PAINTS = ['plain', 'washes', 'pattern', 'panel'] as const
export const DIVIDER_ATS = ['intoDark', 'everyChange', 'none'] as const
export const HAIRLINES = ['none', 'atChange', 'everyBand'] as const
export const GHOSTS = ['none', 'once'] as const
export const NEEDS = ['photos', 'texture', 'initials', ...HOSTS] as const
export type Need = (typeof NEEDS)[number]

export type FlowRules = {
  /** `<family>.<step>`; the stored value. */
  id: string
  name: string
  sentence: string
  family: string
  step: Darkness
  dark: {
    /** The mid-page dark budget: none; a third of the survivors; three quarters; all. */
    budget: (typeof DARK_BUDGETS)[number]
    /** The bands that may go dark, in this theme's order of preference. Absent hosts stay light. */
    hosts: readonly Host[]
    /** How the dark bands sit: never two in a row; runs of at most two; gathered into runs;
     *  none mid-page. The hero is never a neighbour, so a band directly under a dark hero
     *  may join it under every rhythm (25 of 45 dark heroes are followed by a dark band). */
    rhythm: (typeof DARK_RHYTHMS)[number]
    /** What a dark band paints: the dark ground; the dark ground with the style set's texture;
     *  the ramp (one per run, sliced); the ramp restarted on every band; a photo where the band
     *  has one, else the dark ground; the accent fill where the palette and the band allow it,
     *  else the dark ground. */
    paint: (typeof DARK_PAINTS)[number]
    /** The closing call to action's ground. */
    close: (typeof CLOSES)[number]
  }
  light: {
    /** Light bands: one ground; light and tint alternating; textured; or, inside a dark run,
     *  an inset panel that adopts the run (`[R-501]`) where the band stores no `inset`. */
    paint: (typeof LIGHT_PAINTS)[number]
  }
  divider: {
    /** `lib/dividers.ts`; `straight` draws none. */
    shape: Divider
    /** `intoDark` is `[R-481]`'s rule: under the hero and at every entry into a strong ground. */
    at: (typeof DIVIDER_ATS)[number]
    /** Site-wide, interior pages included (`[R-483]`; 16C amendment 18). */
    carry: readonly CarryPiece[]
    /** A decorative 1px line at a join: never; at every change of ground; at every join. */
    hairline: (typeof HAIRLINES)[number]
  }
  /** Placement as before: once, the first dark band, else the first eligible (`[R-492]`). */
  ghost: (typeof GHOSTS)[number]
  /** Placement as before: once, nearest the middle, at a change of visible ground (`[R-499]`). */
  overlap: SectionOverlap
  /** What the canvas and the site must hold for the theme to look like itself. The switcher
   *  names an unmet need; the build's picker never picks a theme whose needs are unmet. */
  needs: readonly Need[]
}

export type FlowFamily = {
  id: string
  name: string
  sentence: string
  /** The steps the eye has passed; one for Quiet, Type on black, Soft wash, Editorial. */
  steps: readonly Darkness[]
  defaultStep: Darkness
  /** One rule family, parameterised by the step. */
  rules: (step: Darkness) => Omit<FlowRules, 'id' | 'name' | 'sentence' | 'family' | 'step'>
}

// ─── The darkness dial's rule, from the evidence (record §2.5) ────────────────
//
// Per step: the budget, the hosts in the evidence order and the rhythm, computed by
// ADV-17B-B over the 65-site study by what the walk can see. The table is the
// starting order a family may reorder, not a law: Photo scrims will rank the bands
// that carry photos first, Ribbon rhythm the ribbon and the statement only.

export const STEP_BUDGET: Record<Darkness, FlowRules['dark']['budget']> = {
  mostlyLight: 'none', balanced: 'third', mostlyDark: 'threeQuarters', allDark: 'all',
}
export const STEP_RHYTHM: Record<Darkness, FlowRules['dark']['rhythm']> = {
  mostlyLight: 'bookends', balanced: 'pairs', mostlyDark: 'runs', allDark: 'runs',
}
export const STEP_HOSTS: Record<Darkness, readonly Host[]> = {
  mostlyLight: [],
  // balanced pages: ribbon 64%, testimonials 55%, attorneys 50%, areas 32%, split 25%,
  // narrative 20%; statement 6% and outside the list.
  balanced: ['ribbon', 'testimonials', 'attorneys', 'caseResults', 'areas', 'split', 'narrative'],
  // mostly-dark pages: areas 73%; what stays light is a split or a contained panel.
  mostlyDark: ['ribbon', 'narrative', 'areas', 'testimonials', 'statement', 'attorneys', 'caseResults', 'split', 'badges'],
  allDark: HOSTS,
}

/** The dark budget as a count of the survivors: `third` is `ceil(n/3)`, which sits on
 *  the balanced median (0.33 with the close excluded); `threeQuarters` is `n - ceil(n/4)`,
 *  against the mostly-dark median of 0.71 to 0.78 ("every host" simulated to 0.89). */
export function darkBudget(budget: FlowRules['dark']['budget'], n: number): number {
  switch (budget) {
    case 'none': return 0
    case 'third': return Math.ceil(n / 3)
    // Never below the balanced budget: on a one-band page `n - ceil(n/4)` is 0 while a
    // third is 1, and a darker step must not darken less (ADV-17B-2 F10).
    case 'threeQuarters': return Math.max(Math.ceil(n / 3), n - Math.ceil(n / 4))
    case 'all': return n
  }
}

const NO_DIVIDER: FlowRules['divider'] = {shape: 'straight', at: 'none', carry: [], hairline: 'none'}

// ─── The families ─────────────────────────────────────────────────────────────
//
// Values are provisional until each step passes the arm's-length test through the
// switcher on three canvases at 1440 and 390 (`[R-506]`; Phase 17B sessions 4 and
// after). A step that fails is not shipped.

export const FAMILIES: readonly FlowFamily[] = [
  {
    id: 'quiet', name: 'Quiet',
    sentence: 'A dark hero, then light all the way down, and one dark band to close.',
    steps: ['mostlyLight'], defaultStep: 'mostlyLight',
    rules: (step) => ({
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: STEP_RHYTHM[step], paint: 'plain', close: 'dark'},
      light: {paint: 'plain'},
      divider: NO_DIVIDER,
      ghost: 'none', overlap: 'none', needs: [],
    }),
  },
  {
    id: 'alternating', name: 'Alternating',
    sentence: 'Dark, light, dark, light, with hard edges: the classic law site.',
    // The study shows it at three steps (light 7, balanced 4, dark 2 sites); at mostly
    // light it would be Quiet, so the family ships balanced and mostly dark. Its rhythm
    // is `pairs` at both steps: the family's name is the alternation, and `runs` at
    // mostly dark gathered four dark bands in a row on the composer's six roles
    // (ADV-17B-2 F12). The step table's `runs` is the starting rhythm, not a law.
    steps: ['balanced', 'mostlyDark'], defaultStep: 'balanced',
    rules: (step) => ({
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: 'pairs', paint: 'plain', close: 'dark'},
      light: {paint: 'plain'},
      divider: NO_DIVIDER,
      ghost: 'none', overlap: 'none', needs: [],
    }),
  },
  {
    id: 'cutBlocks', name: 'Cut blocks',
    sentence: 'Navy blocks cut into the page with a peak, each carrying the texture.',
    // The study: dark 5, balanced 2.
    steps: ['balanced', 'mostlyDark'], defaultStep: 'balanced',
    rules: (step) => ({
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: STEP_RHYTHM[step], paint: 'pattern', close: 'dark'},
      light: {paint: 'plain'},
      divider: {shape: 'peak', at: 'intoDark', carry: ['cards'], hairline: 'none'},
      ghost: 'none', overlap: 'photo', needs: ['texture'],
    }),
  },
]

export function flowId(family: string, step: Darkness): string {
  return `${family}.${step}`
}

/** The roster: one theme per family per shipped step. `presets.json` carries it into Python. */
export const FLOWS: readonly FlowRules[] = FAMILIES.flatMap((f) =>
  f.steps.map((step) => ({
    ...f.rules(step),
    id: flowId(f.id, step),
    name: f.steps.length > 1 ? `${f.name}, ${DARKNESS_LABELS[step].toLowerCase()}` : f.name,
    sentence: f.sentence,
    family: f.id,
    step,
  })),
)

/** What an absent `flow` renders, on every client. Pinned equal to `presets.json`'s
 *  `defaultFlow` by both suites. */
export const DEFAULT_FLOW = flowId('quiet', 'mostlyLight')

export function flowById(id: unknown): FlowRules | null {
  return typeof id === 'string' ? FLOWS.find((f) => f.id === id) ?? null : null
}

// ─── The compat bridge, for one pin (record §2.3, amendment 10) ───────────────
//
// The six fields a style set used to write are hidden in the schema and read by
// nothing but this. A client that stores no `flow` and still stores any of them (every
// client built before this pin does) renders a theme synthesized from them, which
// reproduces its page byte for byte until Apply writes `flow` and clears them: that
// is what "propagation changes nothing" means, and `flowReproduction.test.tsx` holds
// it. The bridge dies with the fields at the deletion pin.
//
// It fires on the fields being PRESENT, not on their naming a device: a document
// written by a style set at an earlier pin carries `brandGhost: 'none'` and the like,
// and a fresh build never writes them, so presence is the mark of a stored client.
//
// `patternGround` maps to the plain dark paint, not the textured one. Today the field
// affects a stored `pattern` band only (it flipped it onto the dark ground), and never
// a stored `dark` band; a theme's `pattern` paint textures every dark band, which would
// change a stored client's page. A stored `pattern` band keeps its one meaning (the
// light ground with the texture) under every theme (amendment 5).
//
// THREE STORED SHAPES THE BRIDGE DOES NOT REPRODUCE, named so nobody reads them as a
// regression (ADV-17B-2 F2). None is on a live client; the reproduction goldens cover
// the live client's shape. (a) A stored `pattern` band under `patternGround: 'dark'`
// with a texture rendered on the dark ground at a164ce0 and renders on the light
// ground now, which is amendment 5. (b) Nine or more bands on one ground under
// `sectionGradient: 'deep'` repeated the last slice from the ninth band on; the ninth
// starts a new run now (record §2.3). (c) An unknown `sectionJoin` value emitted the
// divider classes with empty geometry at a164ce0 and draws nothing now, which is what
// it always looked like.

export const HIDDEN_FIELDS = ['sectionJoin', 'dividerCarry', 'patternGround', 'brandGhost', 'sectionOverlap', 'sectionGradient'] as const

export function storesHiddenFields(d: Record<string, unknown> | null | undefined): boolean {
  return !!d && HIDDEN_FIELDS.some((f) => d[f] !== undefined && d[f] !== null)
}

export function bridgeOf(d: Record<string, unknown>): FlowRules {
  const shape = dividerShape(d.sectionJoin as string) ? (d.sectionJoin as Divider) : 'straight'
  return {
    id: 'stored.bridge', name: 'As stored', family: 'stored', step: 'mostlyLight',
    sentence: 'The page as the six retired fields stored it, until Apply writes a theme.',
    dark: {budget: 'none', hosts: [], rhythm: 'bookends', paint: d.sectionGradient === 'deep' ? 'gradient' : 'plain', close: 'muted'},
    light: {paint: 'plain'},
    divider: {shape, at: 'intoDark', carry: readCarry(d.dividerCarry), hairline: 'none'},
    ghost: d.brandGhost === 'on' ? 'once' : 'none',
    overlap: readOverlap(d.sectionOverlap),
    needs: [],
  }
}

/** The theme a stored Design Settings document renders: the stored `flow`; else the
 *  bridge where the six hidden fields are stored; else the platform default. */
export function flowOf(d: Record<string, unknown> | null | undefined): FlowRules {
  const stored = flowById(d?.flow)
  if (stored) return stored
  if (storesHiddenFields(d)) return bridgeOf(d as Record<string, unknown>)
  return flowById(DEFAULT_FLOW)!
}

// ─── Hosts ────────────────────────────────────────────────────────────────────

const ROLE_HOSTS: Record<string, Host> = {
  differentiator: 'differentiators', caseResults: 'caseResults', siloNav: 'areas',
  narrative: 'narrative', attorneyHighlight: 'attorneys', badges: 'badges',
}
const TYPE_HOSTS: Record<string, Host> = {
  practiceAreaNavInline: 'areas', practiceAreaNav: 'areas',
  attorneySectionInline: 'attorneys', attorneySection: 'attorneys',
  badgesSectionInline: 'badges', badgesSection: 'badges',
  testimonialsGridInline: 'testimonials', testimonialsGrid: 'testimonials',
  featuredTestimonialInline: 'testimonials', featuredTestimonial: 'testimonials',
  videoSectionInline: 'video', videoSection: 'video',
  caseResultsSectionInline: 'caseResults', caseResultsSection: 'caseResults',
  reviewsSectionInline: 'reviews', reviewsSection: 'reviews',
}
const LAYOUT_HOSTS: Record<string, Host> = {
  split: 'split', twoColumnText: 'narrative', statement: 'statement', ribbon: 'ribbon', statRow: 'statRow',
}

/** A band's host: the composer's role from its stable key, else its type, else, for a
 *  content section, its layout (`split` when none is stored, as the component reads it). */
export function hostOf(member: {_type?: string; _key?: string; layout?: string | null} | null | undefined): Host | null {
  if (!member) return null
  const role = /^hp-(\w+)Block$/.exec(member._key ?? '')?.[1]
  if (role && ROLE_HOSTS[role]) return ROLE_HOSTS[role]
  const byType = TYPE_HOSTS[member._type ?? '']
  if (byType) return byType
  if (member._type === 'contentSectionInline' || member._type === 'contentSection') {
    return LAYOUT_HOSTS[member.layout ?? ''] ?? 'split'
  }
  return null
}

// ─── Needs ────────────────────────────────────────────────────────────────────

export type CanvasFacts = {
  /** The hosts the canvas carries. */
  hosts: readonly Host[]
  /** Bands that carry their own background photo. */
  photos: number
  /** The style set names a texture. */
  texture: boolean
  /** The firm's name yields initials for the ghost. */
  initials: boolean
}

/** The needs a theme's own rules imply, for the test that holds `needs` to them. */
export function impliedNeeds(rules: Pick<FlowRules, 'dark' | 'light' | 'ghost'>): Need[] {
  const out: Need[] = []
  if (rules.dark.paint === 'pattern' || rules.light.paint === 'pattern') out.push('texture')
  if (rules.dark.paint === 'photo') out.push('photos')
  if (rules.ghost === 'once') out.push('initials')
  return out
}

/** The needs a canvas and site leave unmet. A photo theme needs two photo bands to be
 *  itself; a host need is one band of that host. */
export function unmetNeeds(flow: FlowRules, facts: CanvasFacts): Need[] {
  return flow.needs.filter((need) => {
    if (need === 'photos') return facts.photos < 2
    if (need === 'texture') return !facts.texture
    if (need === 'initials') return !facts.initials
    return !facts.hosts.includes(need)
  })
}

// ─── The paints' gates ────────────────────────────────────────────────────────

/** A dark band's ground fades under this theme. */
export function fadesUnder(flow: FlowRules | null | undefined): boolean {
  return flow?.dark.paint === 'gradient' || flow?.dark.paint === 'gradientPerBand'
}

const toOklch = converter('oklch')
const deltaE = differenceCiede2000()

/** The saturated fill reads as a fill on this palette: the accent has chroma of at least
 *  0.05 and stands at least dE2000 20 from both grounds (ADV-P15's measured rule; every
 *  shipped preset passes, the grey placeholder does not). Read on the RESOLVED palette,
 *  because acceptance may re-tone the accent. */
export function saturatedFillOk(inputs: ColorInputs | Record<string, unknown> | null | undefined): boolean {
  const raw = (inputs ?? {}) as Record<string, unknown>
  const t = resolvePalette({
    darkGround: parseHexInput(raw.darkGround), lightGround: parseHexInput(raw.lightGround),
    accent: parseHexInput(raw.accent), action: parseHexInput(raw.action),
  }).tokens
  const fill = t['--color-accent']
  const chroma = toOklch(fill)?.c ?? 0
  return chroma >= 0.05 && deltaE(fill, t['--color-brand-dark']) >= 20 && deltaE(fill, t['--color-background']) >= 20
}

/** The closing call to action's ground under a theme, with the saturated gate applied. */
export function closeSurface(flow: FlowRules | null | undefined, saturatedOk: boolean): 'dark' | 'saturated' | 'muted' {
  const close = flow?.dark.close ?? 'muted'
  return close === 'saturated' && !saturatedOk ? 'dark' : close
}

/** Every shape a theme may name, for the tests and the Studio. */
export const FLOW_DIVIDERS = DIVIDERS
