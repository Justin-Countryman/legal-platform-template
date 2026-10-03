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
export const PLAIN: FlowRules = {...QUIET, dark: {...QUIET.dark, budget: 'none', hosts: [], rhythm: 'bookends', paint: 'plain'}}

/** A theme built from the plain base with the rules under test changed. */
export function themed(over: {
  divider?: Partial<FlowRules['divider']>
  ghost?: FlowRules['ghost']
  overlap?: FlowRules['overlap']
  dark?: Partial<FlowRules['dark']>
  light?: Partial<FlowRules['light']>
  spacing?: FlowRules['spacing']
}): FlowRules {
  return {
    ...PLAIN,
    divider: {...PLAIN.divider, ...over.divider},
    ghost: over.ghost ?? PLAIN.ghost,
    overlap: over.overlap ?? PLAIN.overlap,
    dark: {...PLAIN.dark, ...over.dark},
    light: {...PLAIN.light, ...over.light},
    spacing: over.spacing ?? PLAIN.spacing,
  }
}

/** The site look under the plain base, with nothing else set. */
export const LOOK: SiteLook = {imageFrame: null, cardHover: null, attorneyCardStyle: null, flow: PLAIN, patternTexture: null, saturated: false, ghost: null}
