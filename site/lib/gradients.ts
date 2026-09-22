// ─── The gradient on a dark band (Phase 16F) ──────────────────────────────────
// A dark band's ground fades from `--color-brand-dark` into a deeper shade that
// carries the accent's hue. PER BAND, restarting at each one: that is what every
// site in the study that draws a gradient does ("repeat on every band" on all
// three premium ones), and live it is 63 one-band gradients to 1 spanning.
export const SECTION_GRADIENTS = ['none', 'deep'] as const
export type SectionGradient = (typeof SECTION_GRADIENTS)[number]
export function readGradient(value: unknown): SectionGradient {
  return value === 'deep' ? 'deep' : 'none'
}
export function fadesDark(value: unknown): boolean {
  return readGradient(value) === 'deep'
}
