// ─── Font Loader ──────────────────────────────────────────────────────────────
// Resolves the active font pair from one of two sources:
//   1. Preset   — fontPairingPreset is set; use committed woff2 files from /fonts/files/
//   2. Custom   — headingFont / bodyFont objects uploaded in Sanity Design Settings
//
// Returns a FontData shape compatible with buildFontCSS() in lib/designTokens.ts.
// Always returns a defined heading + body pair; never returns null for both.

import {getPresetById, type FontPreset} from './presets'

export interface ResolvedFontData {
  heading: {
    name: string
    regular: string
    bold?: string
    italic?: string
  } | null
  body: {
    name: string
    regular: string
    medium?: string
    semibold?: string
    bold?: string
    italic?: string
    boldItalic?: string
  } | null
}

type SanityFontUpload = {
  name?: string | null
  regular?: string | null
  semibold?: string | null
  bold?: string | null
  italic?: string | null
  boldItalic?: string | null
} | null

function presetToFontData(preset: FontPreset): ResolvedFontData {
  return {
    heading: {
      name:    preset.heading.family,
      regular: preset.heading.files.regular,
      bold:    preset.heading.files.bold,
      italic:  preset.heading.files.italic,
    },
    body: {
      name:       preset.body.family,
      regular:    preset.body.files.regular,
      medium:     preset.body.files.medium,
      semibold:   preset.body.files.semibold,
      bold:       preset.body.files.bold,
      italic:     preset.body.files.italic,
      boldItalic: preset.body.files.boldItalic,
    },
  }
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

  // Custom uploads — both can be independently set or left null
  const heading =
    headingFont?.name && headingFont.regular
      ? {
          name:    headingFont.name,
          regular: headingFont.regular,
          bold:    headingFont.bold    ?? undefined,
          italic:  headingFont.italic  ?? undefined,
        }
      : null

  const body =
    bodyFont?.name && bodyFont.regular
      ? {
          name:       bodyFont.name,
          regular:    bodyFont.regular,
          semibold:   bodyFont.semibold   ?? undefined,
          bold:       bodyFont.bold       ?? undefined,
          italic:     bodyFont.italic     ?? undefined,
          boldItalic: bodyFont.boldItalic ?? undefined,
        }
      : null

  return {heading, body}
}
