import { converter, formatHex, wcagContrast, parse } from 'culori'

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

// ─── Neutral derivation — branded neutrals from primary hue ──────────────────
// Neutrals carry a very small amount of primary's chroma and hue so every
// shade on the site is subtly integrated with the brand palette.
// Chroma caps prevent highly-saturated primaries from producing tinted grays.

export function deriveNeutrals(primaryHex: string) {
  const o = parseOklch(primaryHex)
  return {
    'color-foreground-on-light':        toHex(0.20, Math.min(o.c * 0.10, 0.015), o.h),
    'color-foreground-muted-on-light':  toHex(0.45, Math.min(o.c * 0.08, 0.012), o.h),
    'color-foreground-subtle-on-light': toHex(0.65, Math.min(o.c * 0.06, 0.010), o.h),
    'color-border-light':               toHex(0.92, Math.min(o.c * 0.10, 0.015), o.h),
  }
}

// ─── Inverse neutral derivation — for text on dark / colored backgrounds ─────
// Same primary-hue derivation. Chroma caps keep text on dark backgrounds
// feeling warm and readable rather than tinted.
// All three text levels pass AA (4.5:1) against the darkest realistic
// role-brand-dark derivation (L×0.60 of a saturated primary).

export function deriveInverseNeutrals(primaryHex: string) {
  const o = parseOklch(primaryHex)
  return {
    'color-foreground-on-dark':           toHex(0.95, Math.min(o.c * 0.10, 0.015), o.h),  // body text
    'color-foreground-muted-on-dark':     toHex(0.88, Math.min(o.c * 0.08, 0.012), o.h),  // supporting text
    'color-foreground-subtle-on-dark':    toHex(0.78, Math.min(o.c * 0.06, 0.010), o.h),  // labels/metadata
    'color-border-on-dark':               toHex(0.38, Math.min(o.c * 0.50, 0.08), o.h),  // dividers
  }
}

// ─── Variant derivation ───────────────────────────────────────────────────────
// Four variants per input color — no more, no less.

export type ColorVariants = {
  base: string   // raw input hex
  tint: string   // warm off-white section background
  dark: string   // deep shade — dark sections + hover states
  fg: string     // white or text-dark — WCAG-computed text ON this color
}

// Neutral near-white for the light internal-hero surface. Derived from the
// primary hue at L 0.985 with near-zero chroma — a soft, brand-integrated
// off-white that is NOT stark #fff and NOT the accent-derived bg-muted tint
// (which the no-bg-muted lock bans for hero bands because accent1 can be vivid,
// e.g. gold). Chroma capped at 0.006 keeps it visually neutral on every palette.
export function deriveHeroTint(primaryHex: string): string {
  const o = parseOklch(primaryHex)
  return toHex(0.985, Math.min(o.c * 0.04, 0.006), o.h)
}

export function deriveVariants(hex: string): ColorVariants {
  const o = parseOklch(hex)

  // Tint: L pinned to 0.97, chroma scaled to 25% — floor at 0.025 to survive hex round-trip precision loss
  const tint = toHex(0.97, chromaFloor(o.c, o.c * 0.25, 0.025), o.h)

  // Dark: L at 60% of input, chroma preserved — never below 0.02
  const dark = toHex(o.l * 0.60, chromaFloor(o.c, o.c, 0.02), o.h)

  // Fg: white when it passes WCAG AA (4.5:1) against the base; otherwise a branded
  // near-black derived from this color's own hue (not pure #000000).
  const textDark = toHex(0.20, Math.min(o.c * 0.10, 0.015), o.h)
  const whiteContrast = (wcagContrast(hex, '#ffffff') as number | undefined) ?? 1
  const fg = whiteContrast >= 4.5 ? '#ffffff' : textDark

  return {base: normHex(hex), tint, dark, fg}
}

// ─── Approach types ───────────────────────────────────────────────────────────

export type ColorApproach = 'monochromatic' | 'complementary' | 'analogous-accent'

export type ColorInputs = {
  primary: string
  action?:  string | null  // complementary
  accent1?: string | null  // analogous-accent tagline color
  accent2?: string | null  // analogous-accent button/CTA color (optional)
}

// ─── Role map ─────────────────────────────────────────────────────────────────

export type RoleMap = {
  'role-brand-dark':        string  // dark sections, footer, overlays
  'role-muted':             string  // warm off-white section alternation (--color-muted, anchored — does NOT cascade)
  'role-action':            string  // buttons, CTAs at rest
  'role-action-hover':      string  // buttons, CTAs on hover
  'role-action-fg':         string  // text on top of action-colored elements
  'role-action-on-light':   string  // outlined button text on white/light bg — action if AA passes, else brand-dark
  'role-tagline':           string  // tagline text on light backgrounds
  'role-tagline-on-dark':   string  // tagline text on dark backgrounds (brightened for contrast)
  'role-tagline-fg':        string  // text ON tagline-colored backgrounds (auto-paired by luminance)
  'role-divider-on-light':  string  // hairline divider on light surfaces — mirrors color-border-light
  'role-divider-on-dark':   string  // hairline divider on dark surfaces — mirrors color-border-on-dark
  'role-hover-wash-on-light': string  // CSS expression — branded subtle hover bg for light surfaces (shadow-rgb @ 0.06)
  'role-hover-wash-on-dark':  string  // CSS expression — branded subtle hover bg for dark surfaces (text-on-dark @ 8%)
}

// Brightened tagline variant for dark backgrounds.
// Boosts L to 0.88 and scales C to 70% to keep color identity while ensuring AA contrast.
function brightTagline(taglineHex: string): string {
  const t = parseOklch(taglineHex)
  return toHex(0.88, chromaFloor(t.c, t.c * 0.70, 0.015), t.h)
}

// Action button hover shade — direction is automatic based on fg luminance.
// Light fill + dark text (e.g. amber): brightens on hover to avoid muddy darkening.
// Dark fill + light text (e.g. navy, green): darkens on hover via L × 0.60.
function actionHover(actionHex: string, fgHex: string): string {
  const a = parseOklch(actionHex)
  const f = parseOklch(fgHex)
  if (f.l > 0.5) {
    // Light text on dark fill → darken
    return toHex(a.l * 0.60, chromaFloor(a.c, a.c, 0.02), a.h)
  } else {
    // Dark text on light fill → lighten
    return toHex(Math.min(a.l + 0.07, 0.97), a.c, a.h)
  }
}

// Outlined secondary button text on light/white bg — use action only if it passes WCAG AA
// on BOTH white and the actual bg-light tint; otherwise fall back to brand-dark.
// Checking bg-light catches vivid tints (e.g. purple) where action barely passes white but fails tint.
function actionOnLight(actionHex: string, darkFallback: string, bgLight: string): string {
  const onWhite   = (wcagContrast(actionHex, '#ffffff') as number | undefined) ?? 1
  const onBgLight = (wcagContrast(actionHex, bgLight)   as number | undefined) ?? 1
  return (onWhite >= 4.5 && onBgLight >= 4.5) ? normHex(actionHex) : darkFallback
}

// Focus ring color — use action if it meets 3:1 contrast on both white and bg-light;
// otherwise brand-dark which is always contrast-safe by construction.
// 3:1 is the WCAG SC 1.4.11 threshold for non-text contrast (focus indicators).
function ringFocus(actionHex: string, brandDark: string, bgLight: string): string {
  const onWhite   = (wcagContrast(actionHex, '#ffffff') as number | undefined) ?? 1
  const onBgLight = (wcagContrast(actionHex, bgLight)   as number | undefined) ?? 1
  return (onWhite >= 3.0 && onBgLight >= 3.0) ? normHex(actionHex) : brandDark
}

// Focus ring color for dark surfaces — use action if it meets 3:1 against brand-dark;
// otherwise tagline-on-dark which is brightened for dark backgrounds and passes 4.5:1
// on brand-dark by construction (validated in validateWcag). Example: a warm action
// (~7.6:1 on a dark primary) passes 3:1 directly so no fallback is needed.
function ringFocusOnDark(actionHex: string, brandDark: string, taglineOnDark: string): string {
  const onBrandDark = (wcagContrast(actionHex, brandDark) as number | undefined) ?? 1
  return onBrandDark >= 3.0 ? normHex(actionHex) : taglineOnDark
}

// Filled-star outline — WCAG SC 1.4.11 (OUTSTANDING item 13, ruled 2026-07-19
// under "Accessibility wins over convention"). The star FILL stays the raw
// action color on every surface (the stars-are-gold cultural convention); the
// OUTLINE is what carries the 3:1 non-text contrast requirement for the
// star's shape, so the convention and the requirement are both satisfied.
//
// Two tokens, one per surface family, swapped by the standard dark-surface
// cascade rule in globals.css (the ring-focus / border / accent precedent):
//
//   --color-star-outline          light surfaces (white bg-background,
//                                 bg-muted, bg-hero-tint)
//   --color-star-outline-on-dark  bg-brand-dark sections
//
// Derivation principle: the outline only MATERIALIZES where the fill alone
// cannot carry the shape. If the fill already clears 3:1 against every
// surface in the family, the outline token is the fill color itself — an
// invisible stroke, so a dark-green action star stays pure dark-green on
// white, and a gold star stays pure gold on brand-dark. Where the fill
// fails, the outline steps in:
//   - light surfaces: step the fill's OKLCH lightness down (hue and chroma
//     preserved, so it reads as "darker gold", not a foreign ring) until it
//     clears 3:1 against all three light surfaces; brand-dark fallback if
//     stepping bottoms out (brand-dark is light-surface-safe by construction).
//   - brand-dark: taglineOnDark, which is brightened to pass on brand-dark
//     by construction (validated in validateWcag) — a light rim that keeps a
//     dark fill's shape perceivable on dark sections.
function starOutline(fillHex: string, brandDark: string, lightSurfaces: string[]): string {
  const clears = (hex: string) =>
    lightSurfaces.every((bg) => ((wcagContrast(hex, bg) as number | undefined) ?? 1) >= 3.0)
  if (clears(fillHex)) return normHex(fillHex)
  const f = parseOklch(fillHex)
  for (let l = f.l - 0.08; l >= 0.12; l -= 0.02) {
    const candidate = toHex(l, f.c, f.h)
    if (clears(candidate)) return candidate
  }
  return brandDark
}

function starOutlineOnDark(fillHex: string, brandDark: string, taglineOnDark: string): string {
  const onBrandDark = (wcagContrast(fillHex, brandDark) as number | undefined) ?? 1
  return onBrandDark >= 3.0 ? normHex(fillHex) : taglineOnDark
}

// Hover-wash role tokens are CSS expressions, not hex values. They reference
// --shadow-rgb (light) and --color-foreground-on-dark (dark) — both injected by
// buildColorCSS — so the wash auto-tunes per brand. Identical across all
// three approaches (no approach-specific input drives them).
const HOVER_WASH_ON_LIGHT = 'rgb(var(--shadow-rgb) / 0.06)'
const HOVER_WASH_ON_DARK  = 'color-mix(in oklch, var(--color-foreground-on-dark) 8%, transparent)'

export function buildRoleMap(approach: ColorApproach, inputs: ColorInputs): RoleMap {
  const primary = deriveVariants(inputs.primary)
  // Divider role tokens mirror the existing branded neutral/inverse-neutral
  // pair. Computed from primary, identical across all three approaches.
  const neutrals        = deriveNeutrals(inputs.primary)
  const inverseNeutrals = deriveInverseNeutrals(inputs.primary)
  const dividerOnLight  = neutrals['color-border-light']
  const dividerOnDark   = inverseNeutrals['color-border-on-dark']

  if (approach === 'monochromatic') {
    return {
      'role-brand-dark':        primary.dark,
      'role-muted':             primary.tint,
      'role-action':            primary.base,
      'role-action-hover':      actionHover(primary.base, primary.fg),
      'role-action-fg':         primary.fg,
      'role-action-on-light':   actionOnLight(primary.base, primary.dark, primary.tint),
      'role-tagline':           primary.base,
      'role-tagline-on-dark':   brightTagline(primary.base),
      'role-tagline-fg':        primary.fg,
      'role-divider-on-light':  dividerOnLight,
      'role-divider-on-dark':   dividerOnDark,
      'role-hover-wash-on-light': HOVER_WASH_ON_LIGHT,
      'role-hover-wash-on-dark':  HOVER_WASH_ON_DARK,
    }
  }

  if (approach === 'complementary') {
    const action = deriveVariants(inputs.action ?? inputs.primary)
    return {
      'role-brand-dark':        primary.dark,
      'role-muted':             primary.tint,
      'role-action':            action.base,
      'role-action-hover':      actionHover(action.base, action.fg),
      'role-action-fg':         action.fg,
      'role-action-on-light':   actionOnLight(action.base, primary.dark, primary.tint),
      'role-tagline':           action.base,
      'role-tagline-on-dark':   brightTagline(action.base),
      'role-tagline-fg':        action.fg,
      'role-divider-on-light':  dividerOnLight,
      'role-divider-on-dark':   dividerOnDark,
      'role-hover-wash-on-light': HOVER_WASH_ON_LIGHT,
      'role-hover-wash-on-dark':  HOVER_WASH_ON_DARK,
    }
  }

  // analogous-accent: accent1 → tagline, accent2 → buttons/CTAs
  const accent1 = deriveVariants(inputs.accent1 ?? inputs.primary)
  const accent2 = inputs.accent2 ? deriveVariants(inputs.accent2) : accent1

  return {
    'role-brand-dark':        primary.dark,
    'role-muted':             accent1.tint,
    'role-action':            accent2.base,
    'role-action-hover':      actionHover(accent2.base, accent2.fg),
    'role-action-fg':         accent2.fg,
    'role-action-on-light':   actionOnLight(accent2.base, primary.dark, accent1.tint),
    'role-tagline':           accent1.base,
    'role-tagline-on-dark':   brightTagline(accent1.base),
    'role-tagline-fg':        accent1.fg,
    'role-divider-on-light':  dividerOnLight,
    'role-divider-on-dark':   dividerOnDark,
    'role-hover-wash-on-light': HOVER_WASH_ON_LIGHT,
    'role-hover-wash-on-dark':  HOVER_WASH_ON_DARK,
  }
}

// ─── WCAG validation ──────────────────────────────────────────────────────────

export type WcagResult = {
  pair: string
  ratio: number
  passes: boolean
  blocking: boolean  // true = cannot publish; false = warning only
}

// Default primaryHex matches buildColorCSS's runtime fallback per the
// fail-to-client-branded-fallback doctrine. The template ships with a neutral
// fallback (#1a1a1a); the Client Provisioning Tool rewrites both this default
// and the buildColorCSS fallback at provisioning time from CS-CLIENT-CONFIG's
// primaryColor. See BI/skills/skill-color-system/SKILL.md → "Fallback values".
export function validateWcag(roles: RoleMap, primaryHex = '#1a1a1a'): WcagResult[] {
  const neutrals = deriveNeutrals(primaryHex)
  const inverseNeutrals = deriveInverseNeutrals(primaryHex)

  const results: WcagResult[] = []
  const check = (pair: string, fg: string, bg: string, blocking: boolean) => {
    const ratio = Math.round(((wcagContrast(fg, bg) as number | undefined) ?? 1) * 100) / 100
    results.push({pair, ratio, passes: ratio >= 4.5, blocking})
  }

  check('action-fg on action',              roles['role-action-fg'],                        roles['role-action'],     true)
  check('accent-fg on accent',              roles['role-tagline-fg'],                       roles['role-tagline'],    true)
  check('foreground on muted',              neutrals['color-foreground-on-light'],          roles['role-muted'],      true)
  check('white on brand-dark',              '#ffffff',                                       roles['role-brand-dark'], true)
  check('foreground-on-dark on brand-dark', inverseNeutrals['color-foreground-on-dark'],    roles['role-brand-dark'], true)
  check('accent-on-dark on brand-dark',     roles['role-tagline-on-dark'],                  roles['role-brand-dark'], true)
  check('action-text on white',             roles['role-action-on-light'],                  '#ffffff',                true)
  check('action-text on muted',             roles['role-action-on-light'],                  roles['role-muted'],      true)
  check('action on muted',                  roles['role-action'],                           roles['role-muted'],      false)
  check('accent on muted',                  roles['role-tagline'],                          roles['role-muted'],      false)
  // accent-on-dark is brightened to L 0.88 by brightTagline() and is designed
  // to be paired with brand-dark only. Pairing it with white always fails 4.5:1
  // by construction. This pair is a documented incompatibility tripwire — kept
  // as warning-only (not blocking) so it surfaces for awareness in studio
  // without permanently red-flagging every palette.
  check('accent-on-dark on white',          roles['role-tagline-on-dark'],                  '#ffffff',                false)

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

const TERTIARY_STYLE_MAP: Record<string, TertiaryTokens> = {
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

export function buildDesignTokenCSS(
  uiRadius?:           string | null,
  buttonShape?:        string | null,
  tertiaryStyle?:      string | null,
  elevationStyle?:     string | null,
  motionTempo?:        string | null,
  marketingScale?:     string | null,
  taglineStyle?:       string | null,
): string {
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
    marketingVars +
    `}`
  )
}

// ─── Color CSS — main entry point ─────────────────────────────────────────────

export type DesignColorSettings = {
  colorApproach?: string | null
  primaryColor?:  string | null
  actionColor?:   string | null
  accent1Color?:  string | null
  accent2Color?:  string | null
}

export function buildColorCSS(settings: DesignColorSettings): string {
  const approach = (settings.colorApproach ?? 'analogous-accent') as ColorApproach

  // Fail-to-client-branded-fallback per platform doctrine. In the template the fallback
  // is a neutral gray; rewritten per-client by the Client Provisioning Tool during
  // provisioning. Production state is always branded via cascade resolution from
  // settings.primaryColor; fallback state (broken Sanity config, FOUC milliseconds,
  // missing client palette) should also look branded rather than obviously
  // broken-grey. See BI/skills/skill-color-system/SKILL.md → "Fallback values"
  // for the full doctrine + multi-client safety mechanism (per-client rewriting).
  const inputs: ColorInputs = {
    primary: settings.primaryColor ?? '#1a1a1a',
    action:  settings.actionColor ?? null,
    accent1: settings.accent1Color ?? null,
    accent2: settings.accent2Color ?? null,
  }

  const roles = buildRoleMap(approach, inputs)

  // Build the :root block
  const vars: Record<string, string> = {}

  // Role tokens — new components use these
  for (const [k, v] of Object.entries(roles)) {
    vars[`--${k}`] = v
  }

  // Neutral scale — derived from primary hue. All four light-surface keys are
  // emitted as cascade-aware aliases below (--color-foreground, -muted, -subtle,
  // --color-border). The raw on-light values are also emitted as static
  // --color-foreground-on-light etc. so components can locally reset cascade
  // (e.g. Button primary-on-dark white-flip needs the light text value back
  // inside a dark parent).
  const neutrals = deriveNeutrals(inputs.primary)
  for (const [k, v] of Object.entries(neutrals)) {
    if (k === 'color-foreground-on-light') continue
    if (k === 'color-foreground-muted-on-light') continue
    if (k === 'color-foreground-subtle-on-light') continue
    if (k === 'color-border-light') continue
    vars[`--${k}`] = v
  }

  // Shadow RGB — text-dark as R G B triplet for use in rgb(var(--shadow-rgb) / α)
  vars['--shadow-rgb'] = hexToRgbTriplet(neutrals['color-foreground-on-light'])

  // Inverse neutral scale — derived from primary hue
  for (const [k, v] of Object.entries(deriveInverseNeutrals(inputs.primary))) {
    vars[`--${k}`] = v
  }

  // Canonical color aliases — consumer-facing names that Tailwind v4
  // wires into utility classes (bg-*, text-*, etc.). These mirror role
  // tokens but live in the --color-* namespace because Tailwind utility
  // generation is namespaced to --color-*.
  vars['--color-action']             = roles['role-action']
  vars['--color-action-fg']          = roles['role-action-fg']
  vars['--color-action-hover']       = roles['role-action-hover']
  // Cascade-aware action-text — outlined-button text + tertiary-style action
  // accents. Light surface = action-on-light AA-fallback value (action color
  // OR brand-dark when action vivid); dark surface = raw action color (always
  // passes contrast against brand-dark by construction). Cascade rule swaps.
  vars['--color-action-text']         = roles['role-action-on-light']
  vars['--color-action-text-on-dark'] = roles['role-action']
  // --color-muted is the warm off-white alternation surface. Anchored to :root
  // (does NOT participate in the dark-surface cascade) — section-fill role,
  // not a surface-context-sensitive value.
  vars['--color-muted']              = roles['role-muted']
  // Neutral hero-tint surface for the light internal-hero scheme (bg-hero-tint).
  // Anchored to :root (does NOT cascade) — a surface fill, not a contextual value.
  vars['--color-hero-tint']          = deriveHeroTint(inputs.primary)
  vars['--color-brand-dark']         = roles['role-brand-dark']
  // Cascade-aware border — --color-border holds the light-surface value at :root
  // and is reassigned to var(--color-border-on-dark) inside .bg-brand-dark and
  // [data-ring-context="dark"] containers (see globals.css cascade rule).
  // (--color-border-on-dark itself is emitted via the inverseNeutrals loop above
  // as the dark-variant value the cascade rule swaps to.)
  vars['--color-border']             = roles['role-divider-on-light']
  // Cascade-aware foreground — body text. Default = on-light; cascade reassigns
  // to var(--color-foreground-on-dark) on dark surfaces.
  vars['--color-foreground']           = neutrals['color-foreground-on-light']
  // Static on-light escape hatch — same value as --color-foreground at :root,
  // but NOT swapped by the cascade rule. Used by Button primary-on-dark
  // white-flip variant (which sits inside a dark parent yet needs the light
  // text value): `[--color-foreground:var(--color-foreground-on-light)]`.
  vars['--color-foreground-on-light']  = neutrals['color-foreground-on-light']
  // Cascade-aware foreground-muted — supporting text. Default = on-light;
  // cascade reassigns to var(--color-foreground-muted-on-dark) on dark surfaces.
  vars['--color-foreground-muted']     = neutrals['color-foreground-muted-on-light']
  // Cascade-aware foreground-subtle — labels/metadata text. Default = on-light;
  // cascade reassigns to var(--color-foreground-subtle-on-dark) on dark surfaces.
  vars['--color-foreground-subtle']    = neutrals['color-foreground-subtle-on-light']
  // Cascade-aware hover wash — same cascade pattern. CSS expressions resolve
  // at use site: light = rgb(var(--shadow-rgb) / 0.06), dark = color-mix on
  // text-on-dark @ 8%. Both auto-tune per brand.
  vars['--color-hover-wash']         = roles['role-hover-wash-on-light']
  vars['--color-hover-wash-on-dark'] = roles['role-hover-wash-on-dark']
  vars['--color-ring-focus']         = ringFocus(roles['role-action'], roles['role-brand-dark'], roles['role-muted'])
  vars['--color-ring-focus-on-dark'] = ringFocusOnDark(roles['role-action'], roles['role-brand-dark'], roles['role-tagline-on-dark'])
  // Star tokens — StarRating fill + shape outline (WCAG SC 1.4.11, item 13).
  // Fill = raw action color (stars-are-gold convention; anchored, never
  // cascades — the whole point is that filled stars look the same on every
  // surface). Outline = cascade-aware pair derived to clear 3:1 on every
  // surface StarRating renders on: --color-star-outline holds the
  // light-surface value at :root and the standard dark-surface cascade rule
  // swaps it to --color-star-outline-on-dark inside .bg-brand-dark /
  // [data-ring-context="dark"] containers. See starOutline()/
  // starOutlineOnDark() for the derivation contract. Dedicated tokens rather
  // than raw `text-action` so the component needs no
  // `platform/no-text-action-raw` carve-out — the rule keeps zero exceptions.
  vars['--color-star-fill']    = roles['role-action']
  vars['--color-star-outline'] = starOutline(
    roles['role-action'],
    roles['role-brand-dark'],
    ['#ffffff', roles['role-muted'], vars['--color-hero-tint'] as string],
  )
  vars['--color-star-outline-on-dark'] = starOutlineOnDark(
    roles['role-action'],
    roles['role-brand-dark'],
    roles['role-tagline-on-dark'],
  )
  // Cascade-aware accent — --color-accent holds the light-surface value at :root
  // (= tagline color) and is reassigned to var(--color-accent-on-dark) inside
  // .bg-brand-dark and [data-ring-context="dark"] containers via the cascade rule.
  // --color-accent-fg is luminance-paired against the light-surface accent value
  // (text on tagline-colored TopBar backgrounds — light-surface only consumer).
  vars['--color-accent']             = roles['role-tagline']
  vars['--color-accent-fg']          = roles['role-tagline-fg']
  vars['--color-accent-on-dark']     = roles['role-tagline-on-dark']

  const css = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')
  return `:root{${css}}`
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
