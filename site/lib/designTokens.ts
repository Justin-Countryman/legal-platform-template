import { converter, formatHex, wcagContrast, parse, clampChroma } from 'culori'
import {DIVIDER_DEPTH, MOTIF_PIECES, dividerPolygon, dividerShape} from './dividers'
import {HEADING_LINES, headingLineVars} from './headingLines'

// ─── Shadow RGB helper ────────────────────────────────────────────────────────
// Converts a hex color to a space-separated R G B triplet string ("28 19 20").
// Used for --shadow-rgb so shadows can use rgb(var(--shadow-rgb) / alpha) syntax.

function hexToRgbTriplet(hex: string): string {
  const toRgb = converter('rgb')
  const c = toRgb(hex)
  if (!c) return '0 0 0'
  return [
    Math.round(Number(c.r ?? 0) * 255),
    Math.round(Number(c.g ?? 0) * 255),
    Math.round(Number(c.b ?? 0) * 255),
  ].join(' ')
}

export { hexToRgbTriplet }

// ─── OKLCH helpers ────────────────────────────────────────────────────────────

const toOklch = converter('oklch')
const toRgb = converter('rgb')

type OklchColor = {mode: 'oklch'; l: number; c: number; h: number}

function parseOklch(hex: string): OklchColor {
  const c = toOklch(hex)
  if (!c) throw new Error(`Invalid color: ${hex}`)
  return {mode: 'oklch', l: (c.l as number) ?? 0.5, c: (c.c as number) ?? 0, h: (c.h as number) ?? 0}
}

function toHex(l: number, c: number, h: number): string {
  return formatHex({mode: 'oklch', l, c, h}) ?? '#000000'
}

// Normalize any hex to lowercase canonical form — prevents case mismatches in CSS output
function normHex(hex: string): string {
  return formatHex(parse(hex)) ?? hex
}

// ─── Chroma floors ────────────────────────────────────────────────────────────
// Several derivations floor chroma so a branded palette survives hex round-trip
// precision loss and keeps its identity in tints, shades and brightened taglines.
// A floor must never manufacture a hue from nothing: a neutral primary has
// chroma 0 and an undefined hue that parseOklch collapses to 0 — and OKLCH hue 0
// is red. Applied unconditionally, every floor below turned the platform's
// black/white/grey defaults pink (bg-muted #ffeff4, brand-dark #0e0507,
// tagline-on-dark #e1d4d7).
//
// So the floor applies only to input that actually carries chroma. Achromatic
// input stays achromatic, and the runtime converges on the same neutral values
// globals.css already ships as static fallbacks.
//
// The threshold sits an order of magnitude above hex round-trip noise (#fafaf9
// measures 0.0013) and two orders below the least saturated realistic brand
// color (#2c3e50 slate measures 0.039), so no client palette can cross it.
const ACHROMATIC_CHROMA = 0.002

function chromaFloor(sourceChroma: number, scaledChroma: number, floor: number): number {
  return sourceChroma <= ACHROMATIC_CHROMA ? 0 : Math.max(scaledChroma, floor)
}

// ─── Color by role (Phase 14) ────────────────────────────────────────────────
//
// Four inputs, each a role, replacing the three approaches and the "primary hue
// that surfaces derive from" (decisions-log ruling 7, [R-439]):
//
//   darkGround   dark bands, the footer, dark header and hero schemes
//   lightGround  the page; the tint and muted steps derive from it
//   accent       kickers, heading emphasis, rules, icons, the accent strip
//   action       buttons; the accent when unset
//
// Every value a component reads is derived from those four, and every
// foreground/background pair the template renders meets WCAG 2.2 AA for ANY
// valid hex in ANY role (Justin, 2026-09-16: "we need to ensure the colors are
// 100% a11y"). That is a tested claim, not a promise:
// lib/__tests__/colorGuarantee.test.ts sweeps a grid of inputs in every role
// plus a seeded random sample and every preset. Where a chosen color cannot
// carry its pair, the engine moves the RENDERED value the smallest step that
// passes and reports it; the stored hex is never rewritten.
//
// The design record is WS-V1-PHASE14-DESIGN.md §7 (amendments 1 to 24).

export type ColorInputs = {
  darkGround?:  string | null
  lightGround?: string | null
  accent?:      string | null
  action?:      string | null
}

// The code defaults ARE the render every Site-Build client already has: it
// stores analogous-accent + #333333 + #666666, which rendered brand-dark #141414
// and accent #666666. A fresh build now stores no color at all and lands on the
// same render. Black, white and greys (Justin, 2026-08-14).
export const COLOR_DEFAULTS = {
  darkGround:  '#141414',
  lightGround: '#ffffff',
  accent:      '#666666',
} as const

// Only a literal six-digit hex is a color. culori would also parse 'navy' or a
// five-digit typo's neighbour, and the Studio's own rule accepts neither, so an
// input the Studio would flag must not reach the page as something else. An
// unparsable value is absent: a mistyped hex can never take the layout down.
const HEX_INPUT = /^#[0-9a-fA-F]{6}$/
export function parseHexInput(value: unknown): string | null {
  return typeof value === 'string' && HEX_INPUT.test(value) ? value.toLowerCase() : null
}

const round6 = (x: number) => Math.round(x * 1e6) / 1e6

// Gamut-map by reducing chroma at a fixed lightness and hue. CSS Color 4's own
// algorithms aim at the same thing within one JND; clampChroma is the
// deterministic one, and it runs at EVERY step, because a stepped value leaves
// the sRGB gamut (teal #008080 did at 8 of 8 steps).
function mapped(l: number, c: number, h: number): string {
  const L = Math.min(1, Math.max(0, l))
  return formatHex(clampChroma({mode: 'oklch', l: L, c, h}, 'oklch')) ?? '#000000'
}

const contrast = (a: string, b: string) => (wcagContrast(a, b) as number | undefined) ?? 1
const passesOn = (fg: string, bgs: string[], min: number) => bgs.every((bg) => contrast(fg, bg) >= min)

// ─── Neutrals — hue and a trace of chroma from the dark ground ────────────────
// Neutrals carry a very small amount of the dark ground's chroma and hue, so a
// navy site's greys lean navy. Chroma caps keep a saturated input from tinting
// them. The hue comes from the UNCLAMPED input, so acceptance never moves it.

export function deriveNeutrals(darkGroundHex: string) {
  const o = parseOklch(darkGroundHex)
  return {
    'color-foreground-on-light':        toHex(0.20, Math.min(o.c * 0.10, 0.015), o.h),
    'color-foreground-muted-on-light':  toHex(0.45, Math.min(o.c * 0.08, 0.012), o.h),
    'color-foreground-subtle-on-light': toHex(0.65, Math.min(o.c * 0.06, 0.010), o.h),
    'color-border-light':               toHex(0.92, Math.min(o.c * 0.10, 0.015), o.h),
  }
}

export function deriveInverseNeutrals(darkGroundHex: string) {
  const o = parseOklch(darkGroundHex)
  return {
    'color-foreground-on-dark':        toHex(0.95, Math.min(o.c * 0.10, 0.015), o.h),
    'color-foreground-muted-on-dark':  toHex(0.88, Math.min(o.c * 0.08, 0.012), o.h),
    'color-foreground-subtle-on-dark': toHex(0.78, Math.min(o.c * 0.06, 0.010), o.h),
    'color-border-on-dark':            toHex(0.38, Math.min(o.c * 0.50, 0.08), o.h),
  }
}

/** A neutral at lightness L on the dark ground's hue, with its chroma rule. */
function neutralAt(darkGroundHex: string, l: number, scale: number, cap: number): string {
  const o = parseOklch(darkGroundHex)
  return toHex(l, Math.min(o.c * scale, cap), o.h)
}

// ─── Acceptance ───────────────────────────────────────────────────────────────

export type Acceptance = {
  /** The stored (or default) value. */
  input: string
  /** What renders. */
  hex: string
  adjusted: boolean
  /** Lightness steps taken; the Studio shows it so a mis-typed color is obvious. */
  steps: number
}

const unchanged = (hex: string): Acceptance => ({input: hex, hex, adjusted: false, steps: 0})

// The dark ground is accepted by measured contrast, not by a lightness ceiling
// (design §7 amendment 13, as the Phase 14 challenge amended it): chroma is
// capped at 0.10, then lightness steps down 0.02 until white reaches 7:1 and the
// lightest text tier on dark reaches 4.5:1. The accent is deliberately NOT part
// of the rule: it never decided an outcome across 22 inputs and 4 accents, and it
// would make the ground depend on the accent. An ordinary navy (#000080) trips
// the chroma cap; that is expected and the Studio shows it.
export function acceptDarkGround(input: string): Acceptance {
  const o = parseOklch(input)
  const c = Math.min(o.c, 0.10)
  const subtle = deriveInverseNeutrals(input)['color-foreground-subtle-on-dark']
  let l = o.l
  let steps = 0
  let hex = mapped(l, c, o.h)
  while (!(contrast('#ffffff', hex) >= 7 && contrast(subtle, hex) >= 4.5)) {
    l = round6(l - 0.02)
    steps++
    if (l <= 0) { hex = '#000000'; break }
    hex = mapped(l, c, o.h)
  }
  return {input, hex, adjusted: hex !== normHex(input), steps}
}

const lightStep = (ground: string, dl: number) => {
  const o = parseOklch(ground)
  return mapped(o.l - dl, Math.min(o.c, 0.03), o.h)
}
/** The card and alternation step: the ground at L −0.03, its own hue, chroma ≤0.03. */
export const mutedOf = (ground: string) => lightStep(ground, 0.03)
/** The tint band step: L −0.015 on the same rule. */
export const heroTintOf = (ground: string) => lightStep(ground, 0.015)

// The lightest text tier must be able to sit at 4.5:1 on the ground's own muted
// step. A neutral at L 0.50 is the floor that keeps foreground-subtle visibly
// apart from foreground-muted (at 0.45 the two collapsed on 495 of 513 grounds).
const LIGHT_GROUND_PROBE_L = 0.50

// An operator can type a mid or dark color as the light ground. It is accepted
// when the probe passes on its muted step; otherwise lightness steps UP 0.02 at
// the input's own hue and chroma. White and every preset pass unchanged.
export function acceptLightGround(input: string, darkGroundHex: string): Acceptance {
  const probe = neutralAt(darkGroundHex, LIGHT_GROUND_PROBE_L, 0.06, 0.010)
  const carries = (ground: string) => contrast(probe, mutedOf(ground)) >= 4.5
  if (carries(input)) return unchanged(normHex(input))
  const o = parseOklch(input)
  let l = o.l
  let steps = 0
  let hex = input
  do {
    l = round6(l + 0.02)
    steps++
    hex = l >= 1 ? '#ffffff' : mapped(l, o.c, o.h)
  } while (!carries(hex) && l < 1)
  return {input: normHex(input), hex, adjusted: true, steps}
}

/** The first lightness from `from`, stepping `dir` by 0.02 at fixed hue and chroma, that satisfies `test`. */
function stepLightness(from: {l: number; c: number; h: number}, dir: 1 | -1, test: (hex: string) => boolean): string | null {
  for (let l = round6(from.l + dir * 0.02); dir > 0 ? l <= 1.0000001 : l > 0; l = round6(l + dir * 0.02)) {
    const candidate = mapped(l, from.c, from.h)
    if (test(candidate)) return candidate
  }
  return dir > 0 && test('#ffffff') ? '#ffffff' : null
}

// A text color ON a fill: white when it reaches 4.5:1, else a near-black in the
// fill's own hue.
const darkTextFor = (fill: string) => neutralAt(fill, 0.20, 0.10, 0.015)
const textOn = (fill: string) => (contrast('#ffffff', fill) >= 4.5 ? '#ffffff' : darkTextFor(fill))

// A mid-luminance fill (a brand red such as #E53935) fails with white AND with
// dark text. The rendered fill moves to the nearest lightness, 0.02 at a time in
// either direction, at which one of them passes; in practice one step, ΔE00 at
// most 2.8, and only for inputs at OKLCH L 0.56 to 0.62.
export function retoneFill(input: string): Acceptance {
  const carries = (fill: string) => contrast('#ffffff', fill) >= 4.5 || contrast(darkTextFor(fill), fill) >= 4.5
  if (carries(input)) return unchanged(normHex(input))
  const o = parseOklch(input)
  for (let k = 1; k <= 50; k++) {
    const darker = mapped(o.l - 0.02 * k, o.c, o.h)
    if (contrast('#ffffff', darker) >= 4.5) return {input: normHex(input), hex: darker, adjusted: true, steps: k}
    const lighter = mapped(o.l + 0.02 * k, o.c, o.h)
    if (contrast(darkTextFor(lighter), lighter) >= 4.5) return {input: normHex(input), hex: lighter, adjusted: true, steps: k}
  }
  return {input: normHex(input), hex: '#000000', adjusted: true, steps: 50}
}

// Brightened accent for dark grounds: L 0.88, chroma at 70%. It reaches 4.5:1 on
// every accepted dark ground (lowest measured 5.31), and a test holds that.
function accentOnDarkOf(accent: string): string {
  const t = parseOklch(accent)
  return toHex(0.88, chromaFloor(t.c, t.c * 0.70, 0.015), t.h)
}

// Button hover: today's direction rule, unchanged where it already passes.
function actionHoverOf(action: string, fg: string): string {
  const a = parseOklch(action)
  const lightText = parseOklch(fg).l > 0.5
  const hover = lightText
    ? toHex(a.l * 0.60, chromaFloor(a.c, a.c, 0.02), a.h)
    : toHex(Math.min(a.l + 0.07, 0.97), a.c, a.h)
  if (contrast(fg, hover) >= 4.5) return hover
  const from = {l: lightText ? a.l * 0.60 : Math.min(a.l + 0.07, 0.97), c: a.c, h: a.h}
  return stepLightness(from, lightText ? -1 : 1, (h) => contrast(fg, h) >= 4.5) ?? (lightText ? '#000000' : '#ffffff')
}

// ─── The resolved palette ─────────────────────────────────────────────────────

export type ResolvedPalette = {
  /** The four inputs after parsing and defaults, before any acceptance. */
  inputs: {darkGround: string; lightGround: string; accent: string; action: string}
  acceptance: {darkGround: Acceptance; lightGround: Acceptance; accent: Acceptance; action: Acceptance}
  /** Every color token by its CSS custom property name. */
  tokens: Record<string, string>
}

export function resolvePalette(raw: ColorInputs = {}): ResolvedPalette {
  const darkIn   = parseHexInput(raw.darkGround)  ?? COLOR_DEFAULTS.darkGround
  const lightIn  = parseHexInput(raw.lightGround) ?? COLOR_DEFAULTS.lightGround
  const accentIn = parseHexInput(raw.accent)      ?? COLOR_DEFAULTS.accent
  const actionIn = parseHexInput(raw.action)      ?? accentIn

  const darkA   = acceptDarkGround(darkIn)
  const lightA  = acceptLightGround(lightIn, darkIn)
  const accentA = retoneFill(accentIn)
  const actionA = retoneFill(actionIn)

  const brandDark  = darkA.hex
  const background = lightA.hex
  const muted      = mutedOf(background)
  const heroTint   = heroTintOf(background)
  const lightGrounds = [background, heroTint, muted]
  const accent = accentA.hex
  const action = actionA.hex

  const neutrals = deriveNeutrals(darkIn)
  const inverse  = deriveInverseNeutrals(darkIn)

  // Light text tiers by target ratio: each keeps its lightness where it already
  // passes 4.5:1 on every light ground, else steps down 0.005. Only
  // foreground-subtle ever moves (#8f8f8f measured 3.23:1 on white).
  const byRatio = (today: string, ceiling: number, scale: number, cap: number) => {
    if (passesOn(today, lightGrounds, 4.5)) return today
    for (let l = round6(ceiling - 0.005); l >= 0; l = round6(l - 0.005)) {
      const candidate = neutralAt(darkIn, l, scale, cap)
      if (passesOn(candidate, lightGrounds, 4.5)) return candidate
    }
    return '#000000'
  }
  const foreground       = byRatio(neutrals['color-foreground-on-light'],        0.20, 0.10, 0.015)
  const foregroundMuted  = byRatio(neutrals['color-foreground-muted-on-light'],  0.45, 0.08, 0.012)
  const foregroundSubtle = byRatio(neutrals['color-foreground-subtle-on-light'], 0.65, 0.06, 0.010)

  // Accent forms. accent-text is the accent AS TEXT: the accent itself where it
  // reaches 4.5:1 on every light ground, else the accent stepped darker at a
  // fixed hue (gold #C9A227 renders #846700; Justin chose fixed hue over a
  // rotation toward orange, 2026-09-16). brand-dark only if stepping bottoms out,
  // which the guarantee test shows never happens on an accepted light ground.
  const accentOnDark = accentOnDarkOf(accent)
  const accentText = passesOn(accent, lightGrounds, 4.5)
    ? accent
    : stepLightness(parseOklch(accent), -1, (h) => passesOn(h, lightGrounds, 4.5)) ?? brandDark
  const accentFg = textOn(accent)

  // Action forms.
  const actionFg    = textOn(action)
  const actionHover = actionHoverOf(action, actionFg)
  // Outlined and tertiary button text on light grounds: the action where it
  // passes, else brand-dark (a passing pair on every accepted ground).
  const actionText  = passesOn(action, lightGrounds, 4.5) ? action : brandDark
  // On dark grounds: the action where it reaches 4.5:1, else the action stepped
  // LIGHTER at its own hue (white ends the loop, because an accepted dark ground
  // gives white ≥7:1). The raw action measured 3.21:1 on every built client.
  const actionTextOnDark = contrast(action, brandDark) >= 4.5
    ? action
    : stepLightness(parseOklch(action), 1, (h) => contrast(h, brandDark) >= 4.5) ?? '#ffffff'

  // A text link's hover color (prose links). It was the button hover fill used as
  // text, which is not cascade-aware: inside a dark band it measured 1.38:1, and a
  // gold palette's lighter hover fails on white. On light grounds it keeps the
  // button hover where that passes 4.5:1 (every built client: #2f2f2f), else the
  // resting link color; on dark grounds it is the on-dark body text.
  const actionTextHover = passesOn(actionHover, lightGrounds, 4.5) ? actionHover : actionText
  const actionTextHoverOnDark = inverse['color-foreground-on-dark']

  // A selected pill or tab is shown by an action-colored fill, and WCAG 1.4.11
  // asks 3:1 between that state indicator and the ground beside it. Where the
  // action already clears 3:1 the cue is transparent, so nothing is drawn and no
  // built client changes; where it does not (a gold action on white measures about
  // 2.3:1) the selected control gains a 1px ring in the action text color.
  const actionStateCue = passesOn(action, lightGrounds, 3) ? 'transparent' : actionText
  const actionStateCueOnDark = contrast(action, brandDark) >= 3 ? 'transparent' : actionTextOnDark

  // Focus rings, WCAG 1.4.11 3:1: the action where it clears every light ground
  // and the white ring offset, else brand-dark; on dark, the action where it
  // clears brand-dark, else the brightened accent.
  const ringFocus       = passesOn(action, [...lightGrounds, '#ffffff'], 3) ? action : brandDark
  const ringFocusOnDark = contrast(action, brandDark) >= 3 ? action : accentOnDark

  // Stars (`[R-474]`, Justin 2026-09-18): one fixed gold on every site, not tied to
  // the palette, because gold reads as "rating" and a star in a navy or green
  // button color reads as a mistake. Item 13's outline stands ("accessibility wins
  // over convention"): it only materialises where the gold cannot carry the
  // star's shape at 3:1, darkened at the gold's own hue.
  let starOutline = brandDark
  if (passesOn(STAR_GOLD, lightGrounds, 3)) starOutline = STAR_GOLD
  else {
    const f = parseOklch(STAR_GOLD)
    for (let l = f.l - 0.08; l >= 0.12; l -= 0.02) {
      const candidate = toHex(l, f.c, f.h)
      if (passesOn(candidate, lightGrounds, 3)) { starOutline = candidate; break }
    }
  }
  const starOutlineOnDark = contrast(STAR_GOLD, brandDark) >= 3 ? STAR_GOLD : accentOnDark

  // The boundary of a control whose only visible edge is its border (form
  // fields, inactive carousel dots, empty stars), WCAG 1.4.11 3:1. The divider
  // color (--color-border) is decorative and stays as it was.
  let borderControl = '#000000'
  for (let l = 0.92; l >= 0; l = round6(l - 0.005)) {
    const candidate = neutralAt(darkIn, l, 0.06, 0.010)
    if (passesOn(candidate, lightGrounds, 3)) { borderControl = candidate; break }
  }
  let borderControlOnDark = '#ffffff'
  for (let l = 0.38; l <= 1; l = round6(l + 0.005)) {
    const candidate = neutralAt(darkIn, l, 0.06, 0.010)
    if (contrast(candidate, brandDark) >= 3) { borderControlOnDark = candidate; break }
  }

  // The image-band and glass-dark scrim: brand-dark capped at L 0.20. At 80%
  // over the worst photo pixel (white) that is the lightest scrim under which
  // every dark text tier holds. #141414 is L 0.191, so no built client moves.
  const bd = parseOklch(brandDark)
  const scrim = bd.l > 0.20 ? mapped(0.20, bd.c, bd.h) : brandDark

  const tokens: Record<string, string> = {
    '--color-background':               background,
    '--color-muted':                    muted,
    '--color-hero-tint':                heroTint,
    '--color-brand-dark':               brandDark,
    '--color-scrim':                    scrim,
    '--shadow-rgb':                     hexToRgbTriplet(foreground),
    // Cascade-aware light values, and their static on-light twins for light
    // islands inside dark containers ([data-ring-context="light"]).
    '--color-foreground':               foreground,
    '--color-foreground-on-light':      foreground,
    '--color-foreground-muted':         foregroundMuted,
    '--color-foreground-muted-on-light': foregroundMuted,
    '--color-foreground-subtle':        foregroundSubtle,
    '--color-foreground-subtle-on-light': foregroundSubtle,
    '--color-border':                   neutrals['color-border-light'],
    '--color-border-on-light':          neutrals['color-border-light'],
    '--color-border-control':           borderControl,
    '--color-border-control-on-light':  borderControl,
    // Dark targets the cascade swaps to.
    '--color-foreground-on-dark':        inverse['color-foreground-on-dark'],
    '--color-foreground-muted-on-dark':  inverse['color-foreground-muted-on-dark'],
    '--color-foreground-subtle-on-dark': inverse['color-foreground-subtle-on-dark'],
    '--color-border-on-dark':            inverse['color-border-on-dark'],
    '--color-border-control-on-dark':    borderControlOnDark,
    // Accent.
    '--color-accent':                   accent,
    '--color-accent-on-light':          accent,
    '--color-accent-fg':                accentFg,
    '--color-accent-on-dark':           accentOnDark,
    '--color-accent-text':              accentText,
    '--color-accent-text-on-light':     accentText,
    // Action.
    '--color-action':                   action,
    '--color-action-fg':                actionFg,
    '--color-action-hover':             actionHover,
    '--color-action-text':              actionText,
    '--color-action-text-on-light':     actionText,
    '--color-action-text-on-dark':      actionTextOnDark,
    '--color-action-state-cue':         actionStateCue,
    '--color-action-state-cue-on-light': actionStateCue,
    '--color-action-state-cue-on-dark': actionStateCueOnDark,
    '--color-action-text-hover':        actionTextHover,
    '--color-action-text-hover-on-light': actionTextHover,
    '--color-action-text-hover-on-dark': actionTextHoverOnDark,
    // Hover washes are CSS expressions that retune through --shadow-rgb.
    '--color-hover-wash':               'rgb(var(--shadow-rgb) / 0.06)',
    '--color-hover-wash-on-dark':       'color-mix(in oklch, var(--color-foreground-on-dark) 8%, transparent)',
    // Focus and stars.
    '--color-ring-focus':               ringFocus,
    '--color-ring-focus-on-light':      ringFocus,
    '--color-ring-focus-on-dark':       ringFocusOnDark,
    // The offset slab behind a photo (the `slab` frame): the dark ground on a light
    // band. The cascade blocks swap it, so a slab on a dark band is not the band's
    // own color (Phase 16B amendment 13).
    '--color-slab':                     brandDark,
    '--color-star-fill':                STAR_GOLD,
    '--color-star-outline':             starOutline,
    '--color-star-outline-on-light':    starOutline,
    '--color-star-outline-on-dark':     starOutlineOnDark,
  }

  // The texture on a dark band (Phase 16B): its ink and opacity, derived from this
  // palette so the dark texture reads as faintly as the light one does.
  const texture = textureOnDark(brandDark, background, [
    tokens['--color-foreground-on-dark'], tokens['--color-foreground-muted-on-dark'],
    tokens['--color-foreground-subtle-on-dark'], tokens['--color-accent-on-dark'], tokens['--color-action-text-on-dark'],
  ])
  tokens['--color-texture-ink-on-dark'] = texture.ink
  tokens['--section-texture-opacity-on-dark'] = String(texture.opacity)

  return {
    inputs: {darkGround: darkIn, lightGround: lightIn, accent: accentIn, action: actionIn},
    acceptance: {darkGround: darkA, lightGround: lightA, accent: accentA, action: actionA},
    tokens,
  }
}

// ─── The texture on a dark band (Phase 16B, `[R-479]`) ────────────────────────
//
// A theme may put its texture on the dark ground. The ink is drawn AWAY from the
// text: text on a dark band is light, so lines darker than the ground can only
// raise its contrast, never lower it. How dark, and how strong, is derived per
// palette so the texture reads the same on every palette: the opacity is solved
// so the lines move CIE L* by exactly what the light texture (the dark ground at
// 0.04 over the light ground) moves it on the same palette. A fixed opacity would
// be nearly invisible on a near-black ground and three times stronger on teal
// (ADV-P16B-B). Where the ground is too dark to go darker by that much, the ink
// is the on-dark body text color instead, at the solved opacity, lowered until
// every on-dark text tier still meets AA on the blend; `validateWcag` holds it.
// Measured on the placeholder and the fifteen presets: black on all sixteen,
// opacity 0.084 to 0.676, every on-dark pair raised.
const toLab = converter('lab')
const lightness = (hex: string) => (toLab(hex) as unknown as {l: number}).l

export function textureOnDark(dark: string, lightGround: string, onDarkText: string[]): {ink: string; opacity: number} {
  const target = lightness(lightGround) - lightness(blendOver(lightGround, dark, SECTION_TEXTURE_OPACITY))
  // The opacity at which `ink` over `dark` moves L* by `target`, found by bisection;
  // `dir` is -1 for an ink darker than the ground, +1 for a lighter one.
  const solve = (ink: string, dir: 1 | -1) => {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (dir * (lightness(blendOver(dark, ink, mid)) - lightness(dark)) < target) lo = mid
      else hi = mid
    }
    return Math.round(hi * 1000) / 1000
  }
  if (lightness(dark) - lightness('#000000') >= target) return {ink: '#000000', opacity: solve('#000000', -1)}
  const ink = onDarkText[0]
  let opacity = solve(ink, 1)
  while (opacity > 0 && onDarkText.some((c) => contrast(c, blendOver(dark, ink, opacity)) < 4.5)) {
    opacity = Math.round((opacity - 0.005) * 1000) / 1000
  }
  return {ink, opacity: Math.max(0, opacity)}
}

/** The one rating gold every site's stars are filled with (`[R-474]`). */
export const STAR_GOLD = '#f5b301'

// ─── WCAG validation ──────────────────────────────────────────────────────────

export type WcagResult = {
  pair: string
  ratio: number
  /** The threshold this pair must meet: 4.5 text, 3 non-text or a warning bar. */
  min: number
  passes: boolean
  /** True for a WCAG 2.2 AA requirement the engine guarantees; false for a design warning. */
  blocking: boolean
}

/** `ink` at `alpha` over `ground`, composited per channel in gamma-encoded sRGB, as
 *  the browser composites an element's opacity. */
function blendOver(ground: string, ink: string, alpha: number): string {
  type Rgb = {r: number; g: number; b: number}
  const g = toRgb(ground) as unknown as Rgb
  const k = toRgb(ink) as unknown as Rgb
  const mix = (a: number, b: number) => a * (1 - alpha) + b * alpha
  return formatHex({mode: 'rgb', r: mix(g.r, k.r), g: mix(g.g, k.g), b: mix(g.b, k.b)})
}

// The token-level pairs every rendered surface relies on. The component-level
// pairings (a light card inside a dark band, and so on) are held by component
// tests; this list is what an operator's color choice can move.
export function validateWcag(palette: ResolvedPalette): WcagResult[] {
  const t = palette.tokens
  const results: WcagResult[] = []
  const check = (pair: string, fg: string, bg: string, min: number, blocking = true) => {
    const ratio = Math.round(contrast(fg, bg) * 100) / 100
    results.push({pair, ratio, min, passes: contrast(fg, bg) >= min, blocking})
  }
  const lightGrounds: Array<[string, string]> = [
    ['background', t['--color-background']],
    ['hero-tint', t['--color-hero-tint']],
    ['muted', t['--color-muted']],
    // A Pattern band's darkest pixel: its ink line at the texture's opacity over the
    // light ground. WCAG measures text against the lowest-contrast part of what is
    // behind it (F83), so every light tier must hold here too (Phase 16A).
    ['section-texture', blendOver(t['--color-background'], t['--color-brand-dark'], SECTION_TEXTURE_OPACITY)],
  ]
  for (const [name, ground] of lightGrounds) {
    check(`foreground on ${name}`,        t['--color-foreground'],        ground, 4.5)
    check(`foreground-muted on ${name}`,  t['--color-foreground-muted'],  ground, 4.5)
    check(`foreground-subtle on ${name}`, t['--color-foreground-subtle'], ground, 4.5)
    check(`accent-text on ${name}`,       t['--color-accent-text'],       ground, 4.5)
    check(`action-text on ${name}`,       t['--color-action-text'],       ground, 4.5)
    check(`action-text-hover on ${name}`, t['--color-action-text-hover'], ground, 4.5)
    check(`ring-focus on ${name}`,        t['--color-ring-focus'],        ground, 3)
    check(`star-outline on ${name}`,      t['--color-star-outline'],      ground, 3)
    check(`border-control on ${name}`,    t['--color-border-control'],    ground, 3)
  }
  const dark = t['--color-brand-dark']
  // A dark Pattern band's texture blend: every on-dark text tier must hold there too
  // (Phase 16B). Where the ink is darker than the ground this cannot fail; where it
  // is lighter, the engine lowered the opacity until it holds, and this says so.
  const darkTexture = blendOver(dark, t['--color-texture-ink-on-dark'], Number(t['--section-texture-opacity-on-dark']))
  check('foreground-on-dark on section-texture-dark',        t['--color-foreground-on-dark'],        darkTexture, 4.5)
  check('foreground-muted-on-dark on section-texture-dark',  t['--color-foreground-muted-on-dark'],  darkTexture, 4.5)
  check('foreground-subtle-on-dark on section-texture-dark', t['--color-foreground-subtle-on-dark'], darkTexture, 4.5)
  check('accent-on-dark on section-texture-dark',            t['--color-accent-on-dark'],            darkTexture, 4.5)
  check('action-text-on-dark on section-texture-dark',       t['--color-action-text-on-dark'],       darkTexture, 4.5)
  check('white on brand-dark',                    '#ffffff',                           dark, 7)
  check('foreground-on-dark on brand-dark',       t['--color-foreground-on-dark'],     dark, 4.5)
  check('foreground-muted-on-dark on brand-dark', t['--color-foreground-muted-on-dark'], dark, 4.5)
  check('foreground-subtle-on-dark on brand-dark', t['--color-foreground-subtle-on-dark'], dark, 4.5)
  check('accent-on-dark on brand-dark',           t['--color-accent-on-dark'],         dark, 4.5)
  check('action-text-on-dark on brand-dark',      t['--color-action-text-on-dark'],    dark, 4.5)
  check('action-text-hover-on-dark on brand-dark', t['--color-action-text-hover-on-dark'], dark, 4.5)
  check('ring-focus-on-dark on brand-dark',       t['--color-ring-focus-on-dark'],     dark, 3)
  check('star-outline-on-dark on brand-dark',     t['--color-star-outline-on-dark'],   dark, 3)
  check('border-control-on-dark on brand-dark',   t['--color-border-control-on-dark'], dark, 3)
  check('brand-dark on foreground-on-dark',       dark, t['--color-foreground-on-dark'], 4.5)
  check('action-fg on action',                    t['--color-action-fg'], t['--color-action'],       4.5)
  check('action-fg on action-hover',              t['--color-action-fg'], t['--color-action-hover'], 4.5)
  // The accent strip and the saturated band paint `bg-accent-fill` (the anchored
  // accent) with `accent-fg` text, and the saturated band's inverse primary button
  // is the same pair reversed, which has the same ratio (Phase 15).
  check('accent-fg on accent-fill',               t['--color-accent-fg'], t['--color-accent'],       4.5)
  // Warnings: design signals, not WCAG requirements. An accent icon beside its
  // own text is exempt from 1.4.11, so the raw accent on the page is a warning;
  // heading emphasis that reads too close to the heading's own color is a design
  // warning (coral on cream measured 2.94).
  check('accent on background (graphics beside text)', t['--color-accent'], t['--color-background'], 3, false)
  check('accent-text against foreground (emphasis distinctness)', t['--color-accent-text'], t['--color-foreground'], 3, false)
  return results
}

// ─── Font CSS ─────────────────────────────────────────────────────────────────

type FontData = {
  name?:       string | null
  regular?:    string | null
  medium?:     string | null
  semibold?:   string | null
  bold?:       string | null
  italic?:     string | null
  boldItalic?: string | null
} | null

function fontFace(name: string, url: string, weight: string, style = 'normal'): string {
  return `@font-face{font-family:'${name}';src:url('${url}') format('woff2');font-weight:${weight};font-style:${style};font-display:swap;}`
}

export function buildFontCSS(heading: FontData, body: FontData): string {
  let css = ''
  if (heading?.name && heading.regular) {
    css += fontFace(heading.name, heading.regular, '400')
    if (heading.bold)   css += fontFace(heading.name, heading.bold,   '700')
    if (heading.italic) css += fontFace(heading.name, heading.italic, '400', 'italic')
    css += `:root{--dynamic-font-heading:'${heading.name}',Georgia,serif;}`
  }
  if (body?.name && body.regular) {
    css += fontFace(body.name, body.regular, '400')
    if (body.medium)     css += fontFace(body.name, body.medium,    '500')
    if (body.semibold)   css += fontFace(body.name, body.semibold,  '600')
    if (body.bold)       css += fontFace(body.name, body.bold,      '700')
    if (body.italic)     css += fontFace(body.name, body.italic,    '400', 'italic')
    if (body.boldItalic) css += fontFace(body.name, body.boldItalic,'700', 'italic')
    css += `:root{--dynamic-font-body:'${body.name}',system-ui,sans-serif;}`
  }
  return css
}

// ─── UI token CSS (radius, button shape, tertiary style, elevation) ──────────

// Exported so the Studio can render a catalog of all options sourced from the
// canonical map (per BI-FOUNDATIONS.md → "Design Studio = visual contract" →
// Catalog mode vs active mode). buildDesignTokenCSS reads the same maps.
export const UI_RADIUS_MAP: Record<string, string> = {
  sharp:   '0px',
  subtle:  '4px',
  rounded: '8px',
  soft:    '16px',
}

export const BUTTON_SHAPE_MAP: Record<string, string> = {
  square:  '0px',
  rounded: '6px',
  stadium: '12px',
  pill:    '9999px',
}

type TertiaryTokens = {textTransform: string; letterSpacing: string; arrowDx: string}

export const TERTIARY_STYLE_MAP: Record<string, TertiaryTokens> = {
  plain:   {textTransform: 'none',       letterSpacing: '0em',    arrowDx: '0.125rem'},
  tracked: {textTransform: 'capitalize', letterSpacing: '0.04em', arrowDx: '0.125rem'},
}

// Tagline style — drives the Tagline primitive via CSS variables. Three presets:
//   plain     — uppercase + tracked, no rule, no underline
//   lined     — uppercase + tracked, leading horizontal rule (--tagline-rule-display)
//   titlecase — capitalize each word, no rule, no underline, tight tracking
// Mirrors TERTIARY_STYLE_MAP shape. Consumed by buildDesignTokenCSS.

export const TAGLINE_STYLE_MAP = {
  plain: {
    '--tagline-text-transform':       'uppercase',
    '--tagline-letter-spacing':       '0.1em',
    '--tagline-text-decoration':      'none',
    '--tagline-text-underline-offset':'auto',
    '--tagline-rule-display':         'none',
  },
  lined: {
    '--tagline-text-transform':       'uppercase',
    '--tagline-letter-spacing':       '0.1em',
    '--tagline-text-decoration':      'none',
    '--tagline-text-underline-offset':'auto',
    '--tagline-rule-display':         'inline-block',
  },
  titlecase: {
    '--tagline-text-transform':       'capitalize',
    '--tagline-letter-spacing':       '0',
    '--tagline-text-decoration':      'none',
    '--tagline-text-underline-offset':'auto',
    '--tagline-rule-display':         'none',
  },
} as const

export type TaglineStyle = keyof typeof TAGLINE_STYLE_MAP

// Card elevation presets. Shadow values reference --shadow-rgb (injected by
// buildColorCSS) so shadows automatically retune to each client's brand palette.
// Numeric scale: 0 (flat) | 1 (whisper) | 2 (soft) | 4 (standard) | 6 (elevated).
// Gaps at 3 and 5 leave room for future intermediate levels without renumbering.

const SR = 'var(--shadow-rgb)'  // shorthand used inside template literals below

export type ElevationTokens = {rest: string; hover: string; transform: string}

// Exported so the Studio can render the 5 levels as a catalog sourced from
// the canonical map (per BI-FOUNDATIONS.md → "Design Studio = visual
// contract" → Catalog mode). buildDesignTokenCSS reads the same map.
export const ELEVATION_STYLE_MAP: Record<string, ElevationTokens> = {
  '0': {
    rest:      'none',
    hover:     'none',
    transform: '0px',
  },
  '1': {
    rest:      `0 1px 1px rgb(${SR} / 0.015),0 1px 3px rgb(${SR} / 0.02)`,
    hover:     `0 1px 2px rgb(${SR} / 0.02),0 2px 5px rgb(${SR} / 0.028)`,
    transform: '0px',
  },
  '2': {
    rest:      `0 1px 2px rgb(${SR} / 0.02),0 2px 6px rgb(${SR} / 0.03)`,
    hover:     `0 1px 3px rgb(${SR} / 0.03),0 3px 9px rgb(${SR} / 0.045)`,
    transform: '-1px',
  },
  '4': {
    rest:      `0 1px 2px rgb(${SR} / 0.03),0 4px 12px rgb(${SR} / 0.04),0 10px 28px rgb(${SR} / 0.025)`,
    hover:     `0 1px 3px rgb(${SR} / 0.04),0 6px 16px rgb(${SR} / 0.05),0 14px 36px rgb(${SR} / 0.03)`,
    transform: '-2px',
  },
  '6': {
    rest:      `0 2px 4px rgb(${SR} / 0.05),0 8px 20px rgb(${SR} / 0.06),0 20px 48px rgb(${SR} / 0.04)`,
    hover:     `0 3px 6px rgb(${SR} / 0.06),0 12px 28px rgb(${SR} / 0.08),0 28px 64px rgb(${SR} / 0.05)`,
    transform: '-3px',
  },
}

// ─── Motion tokens ────────────────────────────────────────────────────────────

type MotionTempoTokens = {
  uiFast: string
  uiBase: string
  uiSlow: string
}

export const MOTION_TEMPO_MAP: Record<string, MotionTempoTokens> = {
  snappy:   {uiFast: '150ms', uiBase: '250ms', uiSlow: '400ms'},
  balanced: {uiFast: '200ms', uiBase: '325ms', uiSlow: '500ms'},
  relaxed:  {uiFast: '250ms', uiBase: '400ms', uiSlow: '600ms'},
}

// Structural tokens are intentionally fixed — tuned for premium floating UI.
// Exported so the Studio can render the same values it emits at runtime, per
// BI-FOUNDATIONS.md → "Design Studio = visual contract" → Catalog mode.
export const STRUCTURAL_DURATIONS = {
  fast: '150ms',
  base: '250ms',
  slow: '400ms',
} as const

const STRUCTURAL_FAST  = STRUCTURAL_DURATIONS.fast
const STRUCTURAL_BASE  = STRUCTURAL_DURATIONS.base
const STRUCTURAL_SLOW  = STRUCTURAL_DURATIONS.slow

// ─── Marketing type scale ─────────────────────────────────────────────────────
// Controls headline size on homePage and landingPage only — internal pages always
// use standard Tailwind sizing regardless of this setting. Values are desktop
// ceilings; @utility classes (marketing-h1..h4) clamp from a locked mobile floor
// up to these ceilings, scaling fluidly with viewport.
//
// Math: base = 16px body. Step depths: H4 = ratio², H3 = ratio³, H2 = ratio⁴, H1 = ratio⁵.
// Step 5 for H1 keeps the smallest preset (sm) above the platform's internal H1
// ceiling of 56px (.text-page-h1 lg breakpoint).
//
// 'default' is the absence of a preset — buildDesignTokenCSS skips emission and
// the marketing-* utilities fall back to standard sizing matching internal pages.
//
// lg H1 is capped at 8rem (128px) rather than the raw ratio⁵ value of 11.09rem
// (177px) — past 128px crosses from "dramatic" into "looks broken on wide displays".

export type MarketingScaleTokens = {h1: string; h2: string; h3: string; h4: string}

// Exported so the Studio can render a catalog of all options sourced from the
// canonical map (per BI-FOUNDATIONS.md → "Design Studio = visual contract" →
// Catalog mode vs active mode). buildDesignTokenCSS reads the same map from
// the unexported lookup below.
export const MARKETING_SCALE_MAP: Record<string, MarketingScaleTokens> = {
  // Perfect Fourth (1.333) — restrained but clearly marketing
  sm: {h1: '4.214rem', h2: '3.161rem', h3: '2.371rem', h4: '1.778rem'},
  // Augmented Fourth (1.414) — classic bold marketing
  md: {h1: '5.657rem', h2: '4rem',     h3: '2.828rem', h4: '2rem'},
  // Golden Ratio (1.618) — dramatic, hero-driven (H1 capped at 8rem; raw value 11.09rem felt broken at large viewports)
  lg: {h1: '8rem',     h2: '6.854rem', h3: '4.236rem', h4: '2.618rem'},
}

// ─── The heading signature (Phase 16B) ────────────────────────────────────────
// How highlighted words in a heading are marked, the short rule under section
// headings, and whether section headings are set in capitals: three settings a
// theme writes (lib/themes.ts). The emphasis and the case are custom properties
// the `heading-emphasis` and `section-heading` utilities read; the rule's kind is
// a data attribute on the layout's wrapper (`data-heading-rule`), because its paint
// must resolve on the heading, where a dark or saturated band has redeclared the
// accent (globals.css).
//
// `italic` is the pairing's real italic face at 400: an italic phrase inside a
// 700 heading would otherwise be a synthesised bold italic (Phase 16B amendment
// 10), and `.heading-emphasis` turns synthesis off. There is no `bold`: no theme
// chose it, and it re-weighted every section heading on the site.
export const HEADING_EMPHASIS_STYLES = ['color', 'italic'] as const
/** The heading line, widened to the library of Phase 16C (`[R-484]`, `[R-489]`); `line` is the Bar. */
export const HEADING_RULES = HEADING_LINES
/** A theme may set the display headings regular where its pairing has both faces (`[R-487]`). */
export const HEADING_WEIGHTS = ['bold', 'regular'] as const
export const HEADING_CASES = ['normal', 'upper'] as const

export const HEADING_EMPHASIS_MAP: Record<string, {style: string; weight: string}> = {
  color:  {style: 'normal', weight: 'inherit'},
  italic: {style: 'italic', weight: '400'},
}

// Capitals take wider tracking than mixed case (0.05 to 0.12em is the published
// range, Phase 16B amendment 12). Section headings only: hero and page titles run
// to a line or more, where capitals read slowly.
export const HEADING_CASE_MAP: Record<string, {transform: string; tracking: string}> = {
  normal: {transform: 'none',      tracking: 'normal'},
  upper:  {transform: 'uppercase', tracking: '0.06em'},
}

// ─── The section texture ──────────────────────────────────────────────────────
// What a band set to the Pattern surface wears (Phase 16A, `[R-472]`: no
// site-wide background; a texture only on a homepage section someone set to
// Pattern). The choice is a site value, `designSettings.patternTexture`, so it is
// emitted as two custom properties that one `section-texture` utility reads: no
// prop threads through the section dispatchers, and a theme sets it like any other
// axis. The four units are the ones the study's textured sites wear (Phase 13).
//
// Gradients, not SVG, drawn in `currentColor`, so the layer that wears them sets the
// ink with a text color resolved on that element: the dark ground on a light band,
// the derived dark-band ink on a dark one (Phase 16B, `textureOnDark`). A custom
// property holding `var(--color-brand-dark)` would be substituted at `:root` and
// could not change per band. Scallop is the one that needs a tile size.
//
// THE STRENGTH IS NOT HERE. On a light band the layer renders at `opacity-4` (0.04)
// in `SectionShell`, the most at which every light text tier still meets AA on the
// darkest pixel of the blend for any palette (measured over 11,172 palettes in the
// Phase 16A challenge: 0 failures at 0.04, 2,679 at 0.05). On a dark band the ink
// and its opacity come from `textureOnDark`. `validateWcag` holds both blends as
// grounds of their own, so the claim is tested, not remembered.
export const SECTION_TEXTURES = ['pinstripe', 'diagonalHatch', 'diamondLattice', 'scallop'] as const
export type SectionTexture = (typeof SECTION_TEXTURES)[number]

export const SECTION_TEXTURE_MAP: Record<SectionTexture, {image: string; size: string}> = {
  pinstripe:      {image: 'repeating-linear-gradient(90deg,currentColor 0 1px,transparent 1px 10px)', size: 'auto'},
  diagonalHatch:  {image: 'repeating-linear-gradient(45deg,currentColor 0 1px,transparent 1px 8px)', size: 'auto'},
  diamondLattice: {
    image: 'repeating-linear-gradient(45deg,currentColor 0 1px,transparent 1px 14px),repeating-linear-gradient(-45deg,currentColor 0 1px,transparent 1px 14px)',
    size: 'auto',
  },
  scallop:        {image: 'radial-gradient(circle at 50% 100%,transparent 0 7px,currentColor 7px 8px,transparent 8px)', size: '16px 16px'},
}

/** The opacity the section texture renders at, and the one `validateWcag` blends. */
export const SECTION_TEXTURE_OPACITY = 0.04

/** Every design setting the token CSS reads. Absent or unknown means the default. */
export type DesignTokenSettings = {
  uiRadius?:             string | null
  buttonShape?:          string | null
  tertiaryStyle?:        string | null
  elevationStyle?:       string | null
  motionTempo?:          string | null
  marketingScale?:       string | null
  taglineStyle?:         string | null
  patternTexture?:       string | null
  headingEmphasisStyle?: string | null
  headingCase?:          string | null
  sectionJoin?:          string | null
  headingRule?:          string | null
}

/** The divider's shape and depth, and the motif its carried pieces repeat (Phase 16C).
 *  A straight or unknown divider emits nothing, and nothing is drawn: every rule that
 *  draws one reads these properties. Geometry, never color. */
export function dividerVars(sectionJoin: string | null | undefined): string {
  const shape = dividerShape(sectionJoin)
  if (!shape) return ''
  const m = MOTIF_PIECES[shape.motif]
  return (
    `--divider-above:${dividerPolygon(shape, 'above')};--divider-below:${dividerPolygon(shape, 'below')};` +
    `--divider-depth:${DIVIDER_DEPTH[shape.depth]};` +
    `--carry-corner:${m.corner};--carry-photo:${m.photo};--carry-mark:${m.mark};--carry-mark-w:${m.markWidth};`
  )
}

export function buildDesignTokenCSS({
  uiRadius, buttonShape, tertiaryStyle, elevationStyle, motionTempo, marketingScale, taglineStyle, patternTexture,
  headingEmphasisStyle, headingCase, sectionJoin, headingRule,
}: DesignTokenSettings = {}): string {
  const radius    = UI_RADIUS_MAP[uiRadius ?? '']            ?? UI_RADIUS_MAP.rounded
  const btn       = BUTTON_SHAPE_MAP[buttonShape ?? '']      ?? BUTTON_SHAPE_MAP.rounded
  const tertiary  = TERTIARY_STYLE_MAP[tertiaryStyle ?? '']  ?? TERTIARY_STYLE_MAP.plain
  const elev      = ELEVATION_STYLE_MAP[elevationStyle ?? ''] ?? ELEVATION_STYLE_MAP['0']
  const motion    = MOTION_TEMPO_MAP[motionTempo ?? '']      ?? MOTION_TEMPO_MAP.relaxed
  const tagline   = TAGLINE_STYLE_MAP[(taglineStyle ?? '') as TaglineStyle] ?? TAGLINE_STYLE_MAP.plain
  // Marketing scale is opt-in: emit tokens only when a real preset is selected.
  // 'default' / null / unrecognized values produce no --marketing-* vars,
  // letting marketing-h*. utility classes fall back to standard internal sizing.
  const marketing = MARKETING_SCALE_MAP[marketingScale ?? '']
  const marketingVars = marketing
    ? `--marketing-h1:${marketing.h1};--marketing-h2:${marketing.h2};--marketing-h3:${marketing.h3};--marketing-h4:${marketing.h4};`
    : ''
  const taglineVars = Object.entries(tagline).map(([k, v]) => `${k}:${v};`).join('')
  const texture = SECTION_TEXTURE_MAP[(patternTexture ?? '') as SectionTexture]
  const textureVars = `--section-texture-image:${texture?.image ?? 'none'};--section-texture-size:${texture?.size ?? 'auto'};`
  const emphasis = HEADING_EMPHASIS_MAP[headingEmphasisStyle ?? ''] ?? HEADING_EMPHASIS_MAP.color
  const hcase    = HEADING_CASE_MAP[headingCase ?? '']          ?? HEADING_CASE_MAP.normal
  const headingVars =
    `--heading-emphasis-style:${emphasis.style};--heading-emphasis-weight:${emphasis.weight};` +
    `--heading-case:${hcase.transform};--heading-tracking:${hcase.tracking};`
  return (
    `:root{` +
    `--radius-ui:${radius};` +
    `--radius-btn:${btn};` +
    `--tertiary-text-transform:${tertiary.textTransform};` +
    `--tertiary-letter-spacing:${tertiary.letterSpacing};` +
    `--tertiary-arrow-dx:${tertiary.arrowDx};` +
    `--shadow-card-rest:${elev.rest};` +
    `--shadow-card-hover:${elev.hover};` +
    `--transform-card-hover:${elev.transform};` +
    `--motion-ui-fast:${motion.uiFast};` +
    `--motion-ui-base:${motion.uiBase};` +
    `--motion-ui-slow:${motion.uiSlow};` +
    `--motion-structural-fast:${STRUCTURAL_FAST};` +
    `--motion-structural-base:${STRUCTURAL_BASE};` +
    `--motion-structural-slow:${STRUCTURAL_SLOW};` +
    taglineVars +
    textureVars +
    headingVars +
    dividerVars(sectionJoin) +
    headingLineVars(headingRule) +
    marketingVars +
    `}`
  )
}
// ─── Color CSS — main entry point ─────────────────────────────────────────────
// One :root block of every color token, from the four role inputs. Absent or
// unparsable inputs fall to COLOR_DEFAULTS, which is the render every built
// client already has, so a site with no brand color renders as it always did
// except where a pair failed WCAG 2.2 AA (§7 amendment 19).

export function buildColorCSS(inputs: ColorInputs = {}): string {
  const {tokens} = resolvePalette(inputs)
  return `:root{${Object.entries(tokens).map(([k, v]) => `${k}:${v}`).join(';')}}`
}

// ─── Sidebar design settings (WS-Sidebar Phase 2.1) ───────────────────────────
//
// Three site-level design settings governing sidebar nav chrome. Schema lives
// on the designSettings document (uiElements fieldset) and is projected via
// DESIGN_TOKENS_QUERY in lib/sanity/queries.ts. Doctrine: BI/BI-Sidebar.md §4–5.
//
// Phase 2.1 ships the typed shape, defaults, and resolver. Phase 2.5 wires
// these into the Sidebar component's render output (icon style, header
// underline, item separators including the Edwards pattern).

export type SidebarNavIconStyle = 'arrows' | 'chevrons' | 'none'

// Source-of-truth ordering for any catalog (DesignStudio enumeration, schema
// option list, etc.). Default appears first so resolver fallback aligns with
// editor-facing UI ordering.
export const SIDEBAR_NAV_ICON_STYLES: readonly SidebarNavIconStyle[] = [
  'chevrons',
  'arrows',
  'none',
] as const

export const DEFAULT_SIDEBAR_NAV_ICON_STYLE: SidebarNavIconStyle = 'chevrons'
export const DEFAULT_SIDEBAR_WIDGET_HEADER_LINE = true
export const DEFAULT_SIDEBAR_ITEM_SEPARATORS = true

// Raw GROQ-projected shape (every field is optional / nullable because Sanity
// may legitimately return undefined for an unset field, or null when the
// resolver writes one explicitly).
export type SidebarDesignSettingsInput = {
  sidebarNavIconStyle?: string | null
  sidebarWidgetHeaderLine?: boolean | null
  sidebarItemSeparators?: boolean | null
}

// Normalized shape consumed by Sidebar.tsx. Defaults applied; enum clamped
// to the allowlist (unrecognized strings fall back to the default rather
// than rendering an unsupported icon style).
export type SidebarDesignSettings = {
  sidebarNavIconStyle: SidebarNavIconStyle
  sidebarWidgetHeaderLine: boolean
  sidebarItemSeparators: boolean
}

export function resolveSidebarDesignSettings(
  input?: SidebarDesignSettingsInput | null,
): SidebarDesignSettings {
  const rawIcon = input?.sidebarNavIconStyle ?? ''
  const iconStyle: SidebarNavIconStyle = (SIDEBAR_NAV_ICON_STYLES as readonly string[]).includes(
    rawIcon,
  )
    ? (rawIcon as SidebarNavIconStyle)
    : DEFAULT_SIDEBAR_NAV_ICON_STYLE
  return {
    sidebarNavIconStyle: iconStyle,
    sidebarWidgetHeaderLine: input?.sidebarWidgetHeaderLine ?? DEFAULT_SIDEBAR_WIDGET_HEADER_LINE,
    sidebarItemSeparators: input?.sidebarItemSeparators ?? DEFAULT_SIDEBAR_ITEM_SEPARATORS,
  }
}
