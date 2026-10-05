import {flowById, type FlowRules} from '@/lib/flows'
import {type SiteLook} from '../sectionFrame'

// Test fixtures for the walk under a theme (Phase 17B). Not a test file: vitest does
// not collect it, and both the walk's tests and the look's tests import it.

/** Quiet, as the roster ships it. Since 2026-10-03 (Justin's roster eye, `[R-631]`) its ribbons take the accent
 *  fill, so a case that wants a theme with no device at all builds on `PLAIN`, below. */
export const QUIET: FlowRules = flowById('quiet.mostlyLight')!

/** A theme with no budget, no hosts, no divider and no device: Quiet as it was before its ribbons took the accent.
 *  The base every case builds on, so the ground pass fills every unstored band light and a case reads as it
 *  always did. Its id stays Quiet's: it is Quiet with one word changed, not a roster entry. */
export const PLAIN: FlowRules = {...QUIET, dark: {...QUIET.dark, budget: 'none', hosts: [], rhythm: 'bookends', ground: 'plain'}}

// ─── The one word a paint was ────────────────────────────────────────────────
// Until the Background theme (2026-10-05) a theme's `dark.paint` and `light.paint` each held three layers' decisions
// in one word; they are `ground` (the Flow's), `on` (the Background's) and `sit` (the Layout's) now. The walk's cases
// were written in the one word, and every one still holds: `themed` takes the word and writes the three fields it
// became, so this table is the split, and the cases below it are the proof that no rule moved.
export type DarkPaint = 'plain' | 'pattern' | 'gradient' | 'gradientPerBand' | 'photo' | 'saturated' | 'heroPhoto' | 'floating' | 'glow'
export type LightPaint = 'plain' | 'washes' | 'pattern' | 'panel' | 'floating'
type Strength = FlowRules['on']['darkTexture']
type LegacyDark = Partial<Omit<FlowRules['dark'], 'close'>> & {paint?: DarkPaint; texture?: Strength; close?: FlowRules['dark']['close'] | 'photo'}
type LegacyLight = Partial<FlowRules['light']> & {paint?: LightPaint; texture?: Strength}

const DARK_ON: Partial<Record<DarkPaint, FlowRules['on']['dark']>> = {pattern: 'pattern', gradient: 'gradient', gradientPerBand: 'gradientPerBand', photo: 'photo', heroPhoto: 'span', glow: 'glow'}

/** A theme built from the plain base with the rules under test changed. */
export function themed(over: {
  divider?: Partial<FlowRules['divider']>
  ghost?: FlowRules['ghost']
  overlap?: FlowRules['overlap']
  dark?: LegacyDark
  light?: LegacyLight
  on?: Partial<FlowRules['on']>
  spacing?: FlowRules['spacing']
}, base: FlowRules = PLAIN): FlowRules {
  const {paint: dp, texture: dt, close, ...dark} = over.dark ?? {}
  const {paint: lp, texture: lt, ...light} = over.light ?? {}
  return {
    ...base,
    divider: {...base.divider, ...over.divider},
    ghost: over.ghost ?? base.ghost,
    overlap: over.overlap ?? base.overlap,
    dark: {
      ...base.dark, ...dark,
      ...(dp ? {ground: dp === 'saturated' ? 'saturated' as const : 'plain' as const, sit: dp === 'floating' ? 'floating' as const : 'band' as const} : {}),
      ...(close ? {close: close === 'photo' ? 'dark' as const : close} : {}),
    },
    light: {
      ...base.light, ...light,
      ...(lp ? {ground: lp === 'washes' ? 'washes' as const : 'plain' as const, sit: lp === 'panel' || lp === 'floating' ? lp : 'band' as const} : {}),
    },
    on: {
      ...base.on,
      ...(dp ? {dark: DARK_ON[dp] ?? 'plain'} : {}),
      ...(lp ? {light: lp === 'pattern' ? 'pattern' as const : 'plain' as const} : {}),
      ...(dt ? {darkTexture: dt} : {}),
      ...(lt ? {lightTexture: lt} : {}),
      ...(close ? {close: close === 'photo' ? 'photo' as const : 'none' as const} : {}),
      ...over.on,
    },
    spacing: over.spacing ?? base.spacing,
  }
}

/** The site look under the plain base, with nothing else set. */
export const LOOK: SiteLook = {imageFrame: null, cardHover: null, attorneyCardStyle: null, flow: PLAIN, patternTexture: null, saturated: false, ghost: null}
