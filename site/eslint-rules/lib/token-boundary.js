// Token-system boundary files.
//
// A short, closed list of files that are DEFINITIONALLY OUTSIDE the design-token
// pipeline. Raw color and font values in these files are correct, not deferred
// violations, so the raw-value rules scope themselves out of them structurally
// rather than the files carrying inline disables.
//
// That distinction matters. `BI-FOUNDATIONS.md → escape hatches` permits an
// inline `eslint-disable` only when there is no behavioral alternative AND the
// disable cites a tracked item — i.e. for a deferral. None of these is a
// deferral. Each one is a place where the token system ends and a raw value is
// the only thing that can be written, so a disable would misdescribe it as a sin
// awaiting a fix. This is the same posture `no-arbitrary-color` already takes by
// scoping itself to `className` rather than to every string in the codebase.
//
// KNOWN LIMIT, stated rather than discovered later: this is FILE-level, so a
// genuinely wrong raw value added to one of these files in future is not caught.
// The list is deliberately tiny for that reason. Adding to it is a posture
// decision, not a convenience, and each entry states what it backs.

'use strict'

const BOUNDARY_FILES = [
  {
    // The color derivation engine. Hex is its input and its output: every role
    // token every client ships is derived here. A rule banning raw color values
    // in this file would ban the file's entire purpose.
    suffix: 'lib/designTokens.ts',
    reason: 'the color derivation engine — raw hex is its input and output',
  },
  {
    // OG images render through Satori, which rasterizes JSX to PNG outside the
    // browser. CSS custom properties do not exist in that renderer, so a token
    // reference resolves to nothing and the image ships with missing colors.
    suffix: 'app/api/og/route.tsx',
    reason: 'Satori renders outside the browser; CSS variables do not resolve there',
  },
  {
    // `COLOR_BASE.black` implements the editor-selectable "Black (neutral
    // darken)" scrim option (homeHeroDesign.scrimColor, three options: auto /
    // action / black). The option exists precisely to give a palette-INDEPENDENT
    // darken, so tokenizing it would make the Black option not black and would
    // silently change every hero using it. Verified 2026-07-20 against the
    // schema radio, HeroBackdrop's pass-through, and the constant itself.
    suffix: 'components/layout/HeroScrim.tsx',
    reason: 'implements the palette-independent "Black" scrim option; a token would make Black not black',
  },
  {
    // The Design Studio is the font-pairing CATALOG. It renders each preset in
    // its own family so an operator can compare them, which requires naming the
    // families literally. A token would render every preview in the active
    // font and defeat the surface.
    suffix: 'app/(site)/design-studio/DesignStudioClient.tsx',
    reason: 'the font/color catalog surface — previews must name families literally to be previews',
  },
]

// Test files are the other structural boundary, and for a different reason: a
// test ASSERTS on values. `designTokens.test.ts` alone carries ~187 hex
// fixtures, because the thing under test is the function that turns hex into
// tokens, and an eslint rule's own test fixtures must contain the violating
// code they exist to detect. A hex in a test is the subject of the test, never
// a theming decision that could reach a client's page.
const TEST_PATH_RE = /(?:^|\/)__tests__\/|\.(?:test|spec)\.[jt]sx?$/

/**
 * True when `filename` sits outside the design-token pipeline: a boundary file
 * above, or any test file.
 */
function isTokenBoundaryFile(filename) {
  if (!filename) return false
  const normalized = filename.split('\\').join('/')
  if (TEST_PATH_RE.test(normalized)) return true
  return BOUNDARY_FILES.some((f) => normalized.endsWith(f.suffix))
}

module.exports = {BOUNDARY_FILES, TEST_PATH_RE, isTokenBoundaryFile}
