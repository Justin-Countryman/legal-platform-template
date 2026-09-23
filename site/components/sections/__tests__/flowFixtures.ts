import {flowById, type FlowRules} from '@/lib/flows'
import {type SiteLook} from '../sectionFrame'

// Test fixtures for the walk under a theme (Phase 17B). Not a test file: vitest does
// not collect it, and both the walk's tests and the look's tests import it.

/** Quiet: no budget, no hosts, no divider, no device. */
export const QUIET: FlowRules = flowById('quiet.mostlyLight')!

/** A theme built from Quiet with the rules under test changed, so the ground pass fills
 *  every unstored band light and a case reads as it always did. */
export function themed(over: {
  divider?: Partial<FlowRules['divider']>
  ghost?: FlowRules['ghost']
  overlap?: FlowRules['overlap']
  dark?: Partial<FlowRules['dark']>
  light?: Partial<FlowRules['light']>
}): FlowRules {
  return {
    ...QUIET,
    divider: {...QUIET.divider, ...over.divider},
    ghost: over.ghost ?? QUIET.ghost,
    overlap: over.overlap ?? QUIET.overlap,
    dark: {...QUIET.dark, ...over.dark},
    light: {...QUIET.light, ...over.light},
  }
}

/** The site look under Quiet, with nothing else set. */
export const LOOK: SiteLook = {imageFrame: null, cardHover: null, attorneyCardStyle: null, flow: QUIET, patternTexture: null, saturated: false, ghost: null}
