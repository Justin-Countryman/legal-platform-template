import {flowOf, impliedNeeds, own, type BackgroundRules, type FlowRules} from './flows'

// ─── Background themes: what sits on the grounds ──────────────────────────────
//
// The fourth of the six design layers (monorepo WS-V1-DESIGN-LAYERS-DESIGN §2, `[R-632]`; the design and its challenge
// are WS-V1-BACKGROUND-THEME-DESIGN). A PALETTE owns the colors, an ELEMENT THEME (the style set) what each element
// looks like, a FLOW THEME (`lib/flows.ts`) where the color goes down the page. A BACKGROUND THEME owns what sits on
// those grounds: nothing, the style set's texture, a ramp or a glow down a dark run, a photograph faded into a band, a
// photograph behind several bands. It reads the flow's grounds and never moves one: the hero's ground, the footer's and
// the close's are the Flow theme's, so a background that cannot draw on one says so and draws nothing there.
//
// ONE STORED ID, `designSettings.background`. ABSENT RENDERS THE THEME'S OWN: every flow carries the background it
// shipped with (`flow.on`), so a site that stores none renders byte for byte what it rendered before this layer, and
// propagation changes nothing. A stored id replaces the theme's own whole, under any flow, and `effectiveFlow` is the
// one place the two meet: the page (`siteFlowOf`), the preview's plan and the switcher all read the rules through it.
//
// THE ROSTER answers Justin's seven background verdicts of 2026-10-03 (monorepo
// WS-V1-ROSTER-EYE-2026-10-03/verdicts.txt), and `SUGGESTED_WITH` names the pair that answers each. `passed` moves only
// with a verdict (`[R-517]`), and it gates the row's label alone, since no build writes a background (`[R-537]`): the
// glow's corner and centered light passed his eye on 2026-10-08 (`[R-647]`); nothing else has.
//
// NO BACKGROUND MOVES. His rule (2026-10-03): no layer but the Motion theme says how anything moves. No option here
// animates, transitions or fixes a photograph to the viewport; a photograph that holds still while the page scrolls
// over it is the Motion theme's to ask for.

export type Background = {
  /** The stored value: `<family>` or `<family>.<step>`. */
  id: string
  family: string
  name: string
  /** What the operator will see, in plain words. */
  sentence: string
  passed: boolean
  on: BackgroundRules
}

type Family = {id: string; name: string; steps: readonly {step: string | null; label: string; sentence: string; on: BackgroundRules; passed?: boolean}[]}

export const BACKGROUND_FAMILIES: readonly Family[] = [
  {id: 'plain', name: 'Plain', steps: [{step: null, label: 'Plain', sentence: 'Nothing on any section: the colors alone.', on: own({})}]},
  {
    id: 'pattern', name: 'Pattern', steps: [
      {step: 'touch', label: 'A touch', sentence: 'The style set’s pattern behind the hero and on one light section in three.', on: own({light: 'pattern', lightEvery: 'few', hero: true})},
      {step: 'light', label: 'Light sections', sentence: 'The pattern behind the hero and on every light section.', on: own({light: 'pattern', hero: true})},
      {step: 'dark', label: 'Dark sections', sentence: 'The pattern on the dark sections, quiet and strong in turn, the hero and the closing section.', on: own({dark: 'pattern', darkTexture: 'alternate', hero: true, close: 'pattern'})},
      {step: 'all', label: 'Everywhere, strong', sentence: 'The pattern at full strength on every section, hero to close.', on: own({dark: 'pattern', light: 'pattern', darkTexture: 'strong', lightTexture: 'strong', hero: true, close: 'pattern'})},
    ],
  },
  {id: 'gradient', name: 'Gradient', steps: [{step: null, label: 'Gradient', sentence: 'Each group of dark sections deepens from top to bottom, the hero and the closing section with it.', on: own({dark: 'gradient', ends: true})}]},
  {
    id: 'glow', name: 'Glow', steps: [
      {step: null, label: 'Glow', sentence: 'A soft glow down every group of dark sections, from the hero to the closing section.', on: own({dark: 'glow'})},
      // The glow as a light (monorepo WS-PREMIUM-PACKAGE-DESIGN §9.3, `[R-646]`, which retired PR 4's `glow.accent` into it):
      // both passed his eye on the fake client at 1440 and 390, 2026-10-08 (`[R-647]`).
      {step: 'corner', label: 'From a corner', sentence: 'A light in your accent color rising from a bottom corner of up to three groups of dark sections, the groups deepened around it, on the side of any cut-out figure.', on: own({dark: 'glow', glowShape: 'corner'}), passed: true},
      {step: 'center', label: 'Centered', sentence: 'A light in your accent color behind the middle of up to three groups of dark sections, the groups deepened around it.', on: own({dark: 'glow', glowShape: 'center'}), passed: true},
    ],
  },
  {id: 'fade', name: 'Faint photographs', steps: [{step: null, label: 'Faint photographs', sentence: 'Your photographs, faint: behind every group of dark sections with soft edges, and ghosted into every second light section.', on: own({dark: 'fade', light: 'fade', close: 'photo'})}]},
  {id: 'span', name: 'Photographs', steps: [{step: null, label: 'Photographs', sentence: 'A photograph behind each group of two or three dark sections and behind the closing section.', on: own({dark: 'span', close: 'photo'})}]},
  {id: 'windows', name: 'Hero photograph', steps: [{step: null, label: 'Hero photograph', sentence: 'Pieces of the hero’s own photograph behind two dark sections and the closing section.', on: own({dark: 'windows', close: 'photo'})}]},
]

export const BACKGROUNDS: readonly Background[] = BACKGROUND_FAMILIES.flatMap((f) =>
  f.steps.map((s) => ({
    id: s.step ? `${f.id}.${s.step}` : f.id,
    family: f.id,
    // A family's unnamed step keeps the family's name (`glow`, which gained steps in the premium package).
    name: f.steps.length > 1 && s.step ? `${f.name}: ${s.label.toLowerCase()}` : f.name,
    sentence: s.sentence,
    passed: s.passed ?? false,
    on: s.on,
  })),
)

export function backgroundById(id: unknown): Background | null {
  return typeof id === 'string' ? BACKGROUNDS.find((b) => b.id === id) ?? null : null
}

/** The pair that answers each of his background verdicts (2026-10-03): the theme family, and the background shown
 *  with it at the review. A suggestion the row marks, never a default: whether a theme's own background becomes its
 *  suggestion is his ruling. */
export const SUGGESTED_WITH: Readonly<Record<string, string>> = {
  quiet: 'pattern.touch',
  typeOnBlack: 'fade',
  editorial: 'pattern.light',
  photoScrims: 'span',
  softWash: 'fade',
  gradientBloom: 'glow',
}

/** The rules the page reads: the theme, with a stored or chosen background in place of its own. An unknown or absent
 *  id is the theme's own. The needs are the theme's own and what the background in force implies. */
export function effectiveFlow(flow: FlowRules, backgroundId: unknown): FlowRules {
  const background = backgroundById(backgroundId)
  if (!background) return flow
  return {...flow, on: background.on, needs: [...flow.ownNeeds, ...impliedNeeds({on: background.on, ghost: flow.ghost})]}
}

/** The theme a stored Design Settings document renders, with its stored background (`flowOf`, then `effectiveFlow`). */
export function siteFlowOf(d: Record<string, unknown> | null | undefined): FlowRules {
  return effectiveFlow(flowOf(d), d?.background)
}

/** A theme's own background in words, for the row: what an absent choice draws under this theme. */
export function describeOn(on: BackgroundRules): string {
  const parts: string[] = []
  if (on.dark === 'pattern') parts.push('the pattern on dark sections')
  if (on.light === 'pattern') parts.push(on.lightEvery === 'few' ? 'the pattern on a few light sections' : 'the pattern on light sections')
  if (on.dark === 'gradient' || on.dark === 'gradientPerBand') parts.push('a gradient down the dark sections')
  if (on.dark === 'glow') parts.push('a glow down the dark sections')
  if (on.dark === 'fade' || on.light === 'fade') parts.push('faint photographs')
  if (on.dark === 'span') parts.push('photographs behind the dark sections')
  if (on.dark === 'windows') parts.push('the hero’s photograph behind dark sections')
  if (on.dark === 'photo') parts.push('each section’s own photograph')
  if (on.close === 'photo') parts.push('a photograph behind the closing section')
  return parts.length ? parts.join(', ') : 'nothing on the sections'
}

// ─── The contract ─────────────────────────────────────────────────────────────
//
// His continuity rule (2026-10-03): every layer answers its question for every section. So each background says what it
// draws on each of the six kinds of ground the walk names, or names its fallback and why; `backgrounds.test.tsx` renders
// every cell through the walk and holds this table to what the engine does. Keyed by ground, never by section type:
// what each section type does with a device is the Layout theme's matrix.

export const GROUND_TYPES = ['light', 'wash', 'dark', 'saturated', 'hero', 'close'] as const
export type GroundType = (typeof GROUND_TYPES)[number]
export type Cell = {draws: 'texture' | 'ramp' | 'glow' | 'ghost' | 'softPhoto' | 'photo'} | {fallback: 'plain'; why: string}

const DARK_DEVICE = 'drawn on dark sections only'
const NO_PAIR = 'no color pair is proven on the accent fill'
const WASH = 'the wash is already as dark as a light section’s pattern may go'
const HERO_OWN = 'the hero keeps its own backdrop'

export const BACKGROUND_CONTRACT: Readonly<Record<string, Readonly<Record<GroundType, Cell>>>> = {
  plain: {
    light: {fallback: 'plain', why: 'plain'}, wash: {fallback: 'plain', why: 'plain'}, dark: {fallback: 'plain', why: 'plain'},
    saturated: {fallback: 'plain', why: 'plain'}, hero: {fallback: 'plain', why: 'plain'}, close: {fallback: 'plain', why: 'plain'},
  },
  pattern: {
    light: {draws: 'texture'}, wash: {fallback: 'plain', why: WASH}, dark: {draws: 'texture'},
    saturated: {fallback: 'plain', why: NO_PAIR}, hero: {draws: 'texture'}, close: {draws: 'texture'},
  },
  gradient: {
    light: {fallback: 'plain', why: DARK_DEVICE}, wash: {fallback: 'plain', why: DARK_DEVICE}, dark: {draws: 'ramp'},
    saturated: {fallback: 'plain', why: NO_PAIR}, hero: {draws: 'ramp'}, close: {draws: 'ramp'},
  },
  glow: {
    light: {fallback: 'plain', why: DARK_DEVICE}, wash: {fallback: 'plain', why: DARK_DEVICE}, dark: {draws: 'glow'},
    saturated: {fallback: 'plain', why: NO_PAIR}, hero: {draws: 'glow'}, close: {draws: 'glow'},
  },
  fade: {
    light: {draws: 'ghost'}, wash: {draws: 'ghost'}, dark: {draws: 'softPhoto'},
    saturated: {fallback: 'plain', why: NO_PAIR}, hero: {fallback: 'plain', why: HERO_OWN}, close: {draws: 'photo'},
  },
  span: {
    light: {fallback: 'plain', why: 'a photograph under its scrim is a dark section'}, wash: {fallback: 'plain', why: 'a photograph under its scrim is a dark section'},
    dark: {draws: 'photo'}, saturated: {fallback: 'plain', why: NO_PAIR}, hero: {fallback: 'plain', why: HERO_OWN}, close: {draws: 'photo'},
  },
  windows: {
    light: {fallback: 'plain', why: 'a photograph under its scrim is a dark section'}, wash: {fallback: 'plain', why: 'a photograph under its scrim is a dark section'},
    dark: {draws: 'photo'}, saturated: {fallback: 'plain', why: NO_PAIR}, hero: {fallback: 'plain', why: HERO_OWN}, close: {draws: 'photo'},
  },
}

/** What the Flow theme keeps, so a background cannot reach it: said in the row beside an option that draws only in
 *  part under the theme shown. */
export const CLOSE_NEEDS_LIGHT_FOOTER = 'this theme’s dark footer keeps the closing section plain: a photograph or a lit close never sits beside a dark footer'
export const HERO_NOT_DARK = 'the hero is not dark, so it starts below the hero'
