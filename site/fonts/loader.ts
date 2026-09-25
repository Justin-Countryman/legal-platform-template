// ─── Font Loader ──────────────────────────────────────────────────────────────
// Resolves the active font pair from one of two sources:
//   1. Preset   — fontPairingPreset is set; use committed woff2 files from /fonts/files/
//   2. Custom   — headingFont / bodyFont objects uploaded in Sanity Design Settings
//
// Returns the roles `buildFontFaces` declares (below) and `buildFontCSS()` in
// lib/designTokens.ts wraps. Both roles may be null.

import {getPresetById, type FontPreset} from './presets'

/** One role's files, as the page declares them. */
export interface ResolvedFontRole {
  name: string
  regular: string
  medium?: string
  semibold?: string
  bold?: string
  italic?: string
  boldItalic?: string
  /** `regular` is a variable font: ONE face spans these weights (lowest, highest), so a weight
   *  between draws as itself and one outside clamps to the nearer end. The weight files are
   *  then not declared (Phase 17C, `[R-540]`, `[R-541]`). */
  span?: [number, number]
  /** A static `regular` that is not a 400: a one-weight role's file, declared at its own
   *  weight (pairing 14's heading is `Poppins-Bold`, at 700). */
  regularWeight?: number
}

export interface ResolvedFontData {
  heading: ResolvedFontRole | null
  body: ResolvedFontRole | null
}

type SanityFontUpload = {
  name?: string | null
  regular?: string | null
  semibold?: string | null
  bold?: string | null
  italic?: string | null
  boldItalic?: string | null
  /** The operator's "Variable font" box: the Regular file carries every weight. */
  variable?: boolean | null
} | null

const spanOf = (weights: readonly string[]): [number, number] => {
  const n = weights.map(Number)
  return [Math.min(...n), Math.max(...n)]
}

// The page matches faces by FAMILY NAME, not by role: where heading and body share a name
// (pairings 14, 17, 18), the body's faces serve the heading too. So a variable family shared
// by both roles is declared once, across the union of their weights (ADV-17C2A-2).
function roleOf(role: FontPreset['heading'] | FontPreset['body'], familyWeights: readonly string[]): ResolvedFontRole {
  const files = role.files as FontPreset['body']['files']
  if (role.variable) {
    return {name: role.family, regular: files.regular, italic: files.italic, span: spanOf(familyWeights)}
  }
  const single = role.weights.length === 1 ? Number(role.weights[0]) : 400
  return {
    name:          role.family,
    regular:       files.regular,
    medium:        files.medium,
    semibold:      files.semibold,
    bold:          files.bold,
    italic:        files.italic,
    boldItalic:    files.boldItalic,
    regularWeight: single !== 400 ? single : undefined,
  }
}

function presetToFontData(preset: FontPreset): ResolvedFontData {
  const shared = preset.heading.family === preset.body.family && preset.heading.variable && preset.body.variable
  const both = [...preset.heading.weights, ...preset.body.weights]
  return {
    heading: roleOf(preset.heading, shared ? both : preset.heading.weights),
    body:    roleOf(preset.body, shared ? both : preset.body.weights),
  }
}

/** The `@font-face` rules for one role, in order: the upright face or faces, then the
 *  italics. `name` renames the family (the Design Studio's catalog keeps each pairing's
 *  faces apart). One builder for the page and the catalog, so the catalog draws what a
 *  page draws. */
export function buildFontFaces(role: ResolvedFontRole | null | undefined, name = role?.name): string[] {
  if (!role?.regular || !name) return []
  const face = (url: string, weight: string, style = 'normal') =>
    `@font-face{font-family:'${name}';src:url('${url}') format('woff2');font-weight:${weight};font-style:${style};font-display:swap;}`
  const out: string[] = []
  if (role.span) {
    const [low, high] = role.span
    out.push(face(role.regular, low === high ? `${low}` : `${low} ${high}`))
  } else {
    out.push(face(role.regular, String(role.regularWeight ?? 400)))
    if (role.medium)   out.push(face(role.medium, '500'))
    if (role.semibold) out.push(face(role.semibold, '600'))
    if (role.bold)     out.push(face(role.bold, '700'))
  }
  if (role.italic)     out.push(face(role.italic, '400', 'italic'))
  if (role.boldItalic) out.push(face(role.boldItalic, '700', 'italic'))
  return out
}

// Build the <link rel="preload"> manifest for the active heading + body fonts.
//
// Preloads the weights that paint ABOVE THE FOLD: heading regular + heading
// BOLD, and body regular. The internal/practice-area hero renders its H1 in the
// heading family's BOLD weight, so preloading heading-regular only meant the H1
// font was discovered late (after the inline @font-face <style> parses) — it
// landed on the LCP critical path and its late swap drove measurable CLS
// (platform perf QA found Lora-Bold flagged as both a render-blocking critical
// request AND a layout-shift culprit). Preloading the bold weight pulls it
// forward so the swap happens at/near first paint.
//
// Still bounded on purpose: italic, medium, semibold, and body-bold continue to
// swap in via font-display:swap — preloading every weight would re-inflate the
// critical path. Duplicate hrefs are skipped (mono-pair presets, or a family
// whose bold === regular URL).
//
// Consumers render each entry as
//   <link rel="preload" href={href} as="font" type="font/woff2"
//         crossOrigin="anonymous" />
// crossOrigin="anonymous" is required for woff2 per the CORS-for-fonts spec,
// regardless of same-origin vs cross-origin source.
export interface FontPreloadEntry {
  key: string
  href: string
}

export function buildFontPreloads(
  heading: ResolvedFontData['heading'],
  body: ResolvedFontData['body'],
): FontPreloadEntry[] {
  const entries: FontPreloadEntry[] = []
  const seen = new Set<string>()
  const push = (key: string, href: string | undefined | null) => {
    if (href && !seen.has(href)) {
      seen.add(href)
      entries.push({key, href})
    }
  }
  push('font-heading', heading?.regular)
  push('font-heading-bold', heading?.bold) // H1 weight on internal/PA heroes
  push('font-body', body?.regular)
  return entries
}

export function resolvefonts(
  fontPairingPreset: number | null | undefined,
  headingFont: SanityFontUpload,
  bodyFont: SanityFontUpload,
): ResolvedFontData {
  // Preset takes precedence when set
  if (fontPairingPreset) {
    const preset = getPresetById(fontPairingPreset)
    if (preset) return presetToFontData(preset)
  }

  // Custom uploads — both can be independently set or left null. A Regular marked variable
  // spans every weight, and the Bold and Semibold files are then neither declared nor
  // preloaded (the Studio warns when the box and the file disagree).
  const upload = (font: NonNullable<SanityFontUpload>): ResolvedFontRole => font.variable
    ? {name: font.name!, regular: font.regular!, italic: font.italic ?? undefined, boldItalic: font.boldItalic ?? undefined, span: [100, 900]}
    : {
        name:       font.name!,
        regular:    font.regular!,
        semibold:   font.semibold ?? undefined,
        bold:       font.bold ?? undefined,
        italic:     font.italic ?? undefined,
        boldItalic: font.boldItalic ?? undefined,
      }

  const heading = headingFont?.name && headingFont.regular ? upload(headingFont) : null
  const body = bodyFont?.name && bodyFont.regular ? upload(bodyFont) : null

  return {heading, body}
}
