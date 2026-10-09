import type {FlowRules, Host} from './flows'

// ─── Layouts: how things sit in and across the sections ───────────────────────
//
// The Layout theme, one of the six design layers (`lib/layers.ts`; monorepo WS-V1-LAYOUT-OPTIONS-DESIGN, its challenge ADV-LO taken whole; `[R-631]`,
// `[R-655]`: "build the options for the fourth design layer that we paused so that is part of our system"). A PALETTE owns
// the colors, a STYLE SET what each element looks like, a THEME (`lib/flows.ts`) which grounds go where down the page, a
// BACKGROUND (`lib/backgrounds.ts`) what sits on those grounds. A LAYOUT owns how a band sits on the page and what crosses
// its edges: a full band or a panel, and a photograph rising across a seam.
//
// ONE STORED ID, `designSettings.pageLayout`. ABSENT RENDERS THE THEME'S OWN, BYTE FOR BYTE: every theme already says how
// its bands sit (`dark.sit`, `light.sit`) and whether a photograph rises (`overlap`), and those words stay where they are
// (an overlay, not a move: the fourteen theme steps, `presets.json`'s flows and the compat bridge are untouched).
// `layoutOf` reads the theme's own layout out of them, for the tests and the readers that want it as one thing. A stored id
// REPLACES the theme's own whole, the Background theme's precedent, and `effectiveFlow` stays the one place the layers meet.
//
// A STORED LAYOUT APPLIES TO WHAT THE VISITOR SEES (ADV-LO amendment 1). The theme's ground pass fills only bands that store
// no surface, and a designed page stores one on every band, so a layout read inside that pass would draw nothing on a
// designed page. The walk runs the theme's ground pass without the theme's own layout, then a precedence pass applies the
// stored layout to every band's visible ground, stored or painted, before adoption (`sectionFrame.ts`, `applyLayout`). A
// band's own `surface` is the Flow theme's and never blocks a layout; a stored `inset` or `overlapPrevious` stays the
// operator's override on its band.
//
// THE ROSTER LISTS ONLY WHAT IS BUILT (amendment 3). Edge to edge (the bleed), Overlap (the strip and the float) and the
// figure out of a panel wait for their slices; Floating is the Floating panels theme and left v1 (amendment 11).
//
// NO `passed` FLAG. His sign-off on a firm's own page is his eye (`[R-656]`), so the draft writes the judged pair with no
// gate on a roster flag, and a flag no reader gates on would only drift from the truth.

/** How a dark band sits: a full band; the dark ground as a panel on the page's light ground (`floating`, the Floating panels
 *  theme's); or the full dark band with its content on a raised panel inside it (`onPanel`, Panels; named apart from the
 *  light side's `panel`, ADV-LO amendment 14). */
export const LAYOUT_DARK_SITS = ['band', 'floating', 'onPanel'] as const
/** How a light band sits: a full band; inside a dark run, an inset panel that adopts the run (`panel`); or a panel on the
 *  dark ground wherever it sits (`floating`). The theme's own words, unchanged. */
export const LAYOUT_LIGHT_SITS = ['band', 'panel', 'floating'] as const
/** What may cross a seam: a split's photograph rising into the band above it. The strip and the figure are later slices. */
export const CROSS_KINDS = ['photo'] as const
/** Crossings a page at most (ADV-LO amendment 9, the premium study's "one or two crossings per page, never every band"). */
export const MAX_CROSSINGS = 2

export type LayoutRules = {
  dark: {sit: (typeof LAYOUT_DARK_SITS)[number]}
  light: {sit: (typeof LAYOUT_LIGHT_SITS)[number]}
  /** What crosses a seam, where, and how many a page: nearest the middle of the page, at a change of ground. */
  cross: {kinds: readonly (typeof CROSS_KINDS)[number][]; at: 'middle'; max: 0 | 1 | 2}
}

export type Layout = {
  /** The stored value. */
  id: string
  name: string
  /** What the operator will see, in plain words. */
  sentence: string
  rules: LayoutRules
}

/** The bands whose content may sit on a panel: the text-led ones, the code's one meaning of the word (`PHOTO_HOSTS`): never
 *  a ribbon, a stat row, a grid of practice areas, attorneys or results, which the references leave on the band. */
export const PANEL_HOSTS: readonly Host[] = ['narrative', 'split', 'testimonials', 'differentiators', 'statement']

const NO_CROSSING: LayoutRules['cross'] = {kinds: [], at: 'middle', max: 0}

export const LAYOUTS: readonly Layout[] = [
  {
    id: 'contained', name: 'Contained',
    sentence: 'Every section full width, its content in the column, and nothing crossing from one section into the next.',
    // Replaces even a theme's own raised photograph and panels: the baseline every other layout is told from.
    rules: {dark: {sit: 'band'}, light: {sit: 'band'}, cross: NO_CROSSING},
  },
  {
    id: 'panels', name: 'Panels',
    sentence: 'Every dark section of words keeps its color and sets them on a raised panel, lit in one corner where the colors have room; a photograph may rise across up to two section edges.',
    // The references (monorepo WS-V1-LAYOUT-P1-EYE-2026-10-09): two panels a page on a dark run, each on the run's own color
    // a step lighter (Lewin) or the same (Calesaric), a light in one top corner, a hairline in the accent, as wide as the
    // column (86 to 90 percent of a 1440 screen). Where the palette has no room for the light, the panel is the light island.
    rules: {dark: {sit: 'onPanel'}, light: {sit: 'band'}, cross: {kinds: ['photo'], at: 'middle', max: 2}},
  },
]

export function layoutById(id: unknown): Layout | null {
  return typeof id === 'string' ? LAYOUTS.find((l) => l.id === id) ?? null : null
}

/** The theme's own layout, read out of the words the theme already carries: how its dark and light bands sit, and its
 *  one raised photograph nearest the middle where it raises one (`overlap: 'photo'`). What an absent `pageLayout` renders. */
export function layoutOf(flow: Pick<FlowRules, 'dark' | 'light' | 'overlap'>): LayoutRules {
  return {
    dark: {sit: flow.dark.sit},
    light: {sit: flow.light.sit},
    cross: flow.overlap === 'photo' ? {kinds: ['photo'], at: 'middle', max: 1} : NO_CROSSING,
  }
}

/** The layout a page renders under: the stored one, else the theme's own. */
export function layoutRulesOf(flow: Pick<FlowRules, 'dark' | 'light' | 'overlap' | 'layout'>): LayoutRules {
  return flow.layout?.rules ?? layoutOf(flow)
}

/** The layout sets dark bands' content on panels, so the palette emits the panel's surface (`darkPanel`, `designTokens.ts`). */
export function asksForPanels(flow: Pick<FlowRules, 'layout'> | null | undefined): boolean {
  return flow?.layout?.rules.dark.sit === 'onPanel'
}

/** The layout each theme family's sites draw (monorepo WS-V1-LAYOUT-OPTIONS-DESIGN §2): a suggestion the draft and the
 *  preview may mark, never a default. Only built layouts are named. */
export const LAYOUT_SUGGESTED_WITH: Readonly<Record<string, string>> = {
  quiet: 'contained',
  alternating: 'contained',
  typeOnBlack: 'panels',
  gradientBloom: 'panels',
}
