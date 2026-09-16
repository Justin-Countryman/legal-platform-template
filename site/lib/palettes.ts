// ─── Palette presets (Phase 14) ───────────────────────────────────────────────
//
// Fifteen curated palettes, each the four role inputs of lib/designTokens.ts.
// Choosing one in the Studio writes its hex values into the four colour fields;
// the hex values are the truth and nothing stores which preset was chosen. The
// active preset is DERIVED by matching the stored values (matchPreset), so an
// edit to any one colour simply stops matching, and a preset retuned later never
// leaves a stale id behind. That is how Gutenberg's style variations and Shopify's
// theme presets behave (WS-V1-PHASE14-DESIGN §7 amendment 9).
//
// Fifteen, not twenty: Justin asked for "10 to 15 different high quality color
// palettes" ([R-440]) and ruled fifteen on 2026-09-16, cutting the three gold
// presets whose text colours converge on light pages and the two with the
// thinnest evidence.
//
// Provenance. Every palette's hues come from the 65-site homepage field study in
// the platform monorepo. Each preset carries the colour words its study records
// use; the records themselves, by domain, are in that repository's Phase 14
// design record, because the template carries no firm identity. The records name
// hues and never a hex. Every hex below is therefore a chosen value, validated by
// lib/__tests__/colourGuarantee.test.ts (every rendered colour pair meets WCAG
// 2.2 AA) and provisional until the Phase 18 eye pass. Justin does not pick the
// values (2026-09-16).
//
// Ids read `<dark ground>-<accent>`, as the decisions log's ruling 11 already
// writes them. A palette is chosen by its colours, so its name predicts its
// swatches; theme names stay the one-word style.

import {COLOUR_DEFAULTS, parseHexInput, type ColourInputs} from './designTokens'

export type PalettePreset = {
  id: string
  name: string
  darkGround: string
  /** Absent means white. */
  lightGround?: string
  accent: string
  /** Absent means buttons take the accent. */
  action?: string
  /** The colour words the field-study records use for this palette. The records
   *  themselves, by domain, are listed in the monorepo's Phase 14 design record:
   *  the template carries no firm identity (scripts/check-template-is-blank.mjs). */
  evidence: string[]
}

export const PALETTE_PRESETS: readonly PalettePreset[] = [
  {
    id: 'black-gold', name: 'Black & Gold',
    darkGround: '#111111', accent: '#c5a253',
    evidence: ['black', 'metallic gold'],
  },
  {
    id: 'navy-brass', name: 'Navy & Brass',
    darkGround: '#1c2b4a', lightGround: '#f5eedc', accent: '#b8893a',
    evidence: ['navy', 'brass-gold', 'ochre-gold', 'cream'],
  },
  {
    id: 'navy-ice', name: 'Navy & Ice',
    darkGround: '#0b2545', lightGround: '#f3f7fa', accent: '#2f6fd6',
    evidence: ['navy', 'ice-white', 'blue'],
  },
  {
    id: 'navy-orange', name: 'Navy & Orange',
    darkGround: '#13294b', accent: '#f57c00',
    evidence: ['navy', 'safety-orange', 'rust-orange'],
  },
  {
    id: 'burgundy-gold', name: 'Burgundy & Gold',
    darkGround: '#5a1a24', lightGround: '#f5efe3', accent: '#b89b5e',
    evidence: ['burgundy', 'aubergine', 'pale-gold', 'cream'],
  },
  {
    id: 'teal-mint', name: 'Teal & Mint',
    darkGround: '#0f4c5c', accent: '#3eb489',
    evidence: ['teal', 'mint-green'],
  },
  {
    id: 'navy-brick', name: 'Navy & Brick',
    darkGround: '#1b2a41', accent: '#a23b2a',
    evidence: ['navy', 'brick-red'],
  },
  {
    id: 'ink-lavender', name: 'Ink & Lavender',
    darkGround: '#17171f', accent: '#8e7cc3',
    evidence: ['black', 'purple', 'lavender'],
  },
  {
    id: 'black-crimson', name: 'Black & Crimson',
    darkGround: '#121212', accent: '#c8102e',
    evidence: ['black', 'crimson', 'red'],
  },
  {
    id: 'charcoal-coral', name: 'Charcoal & Coral',
    darkGround: '#2f3437', lightGround: '#f6efe6', accent: '#e4644b',
    evidence: ['charcoal', 'coral', 'cream'],
  },
  {
    id: 'green-coral', name: 'Green & Coral',
    darkGround: '#1f4d3a', lightGround: '#f8f1e6', accent: '#e8735a',
    evidence: ['green', 'coral', 'cream'],
  },
  {
    id: 'forest-brass', name: 'Forest & Brass',
    darkGround: '#1f3d2b', lightGround: '#f4efe2', accent: '#a88b3f',
    evidence: ['forest green', 'brushed gold', 'metallic gold', 'cream'],
  },
  {
    id: 'green-sage', name: 'Green & Sage',
    darkGround: '#1d3b2a', lightGround: '#f6f3ea', accent: '#467a56',
    evidence: ['a single green family', 'mint', 'cream'],
  },
  {
    id: 'slate-cream', name: 'Slate & Cream',
    darkGround: '#2c3e50', lightGround: '#f4efe4', accent: '#6a87a8',
    evidence: ['muted slate-blue', 'cream'],
  },
  {
    id: 'navy-rose', name: 'Navy & Rose',
    darkGround: '#1d2f4f', accent: '#d16d6a',
    evidence: ['navy', 'dusty rose', 'coral'],
  },
]

/** The four role inputs a preset writes. Absent roles stay absent. */
export function presetInputs(preset: PalettePreset): ColourInputs {
  return {darkGround: preset.darkGround, lightGround: preset.lightGround ?? null, accent: preset.accent, action: preset.action ?? null}
}

// Compare values as the engine reads them: case-insensitive, an absent or
// unparsable light ground is white, an absent action is absent.
function normalised(inputs: ColourInputs) {
  return {
    darkGround:  parseHexInput(inputs.darkGround),
    lightGround: parseHexInput(inputs.lightGround) ?? COLOUR_DEFAULTS.lightGround,
    accent:      parseHexInput(inputs.accent),
    action:      parseHexInput(inputs.action),
  }
}

/** The preset whose values the stored colours equal, or null ("custom"). */
export function matchPreset(inputs: ColourInputs): PalettePreset | null {
  const stored = normalised(inputs)
  return PALETTE_PRESETS.find((preset) => {
    const p = normalised(presetInputs(preset))
    return p.darkGround === stored.darkGround && p.lightGround === stored.lightGround
      && p.accent === stored.accent && p.action === stored.action
  }) ?? null
}
