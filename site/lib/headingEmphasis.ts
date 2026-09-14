// ─── Heading emphasis ─────────────────────────────────────────────────────────
//
// A heading is a string and its emphasis is a second string that occurs in it
// (monorepo WS-Homepage-UX-UI-DESIGN §7 amendment 9; WS-V1-PHASE11-DESIGN §7).
// This is the one pure seam the renderers share: `HeadingUnit` uses it now, and
// `SectionHeader` joins it when Phase 16 routes that component through the unit.
// Pass RESOLVED strings: tokens resolve before the split, so an emphasis written
// as `{{firmName}}` meets the firm name the heading resolved to.

/**
 * Split `heading` at the FIRST occurrence of `emphasis`. Null when there is
 * nothing to emphasise: no emphasis, an emphasis that resolved to '' (an unset
 * token; `'x'.indexOf('')` is 0, which would put an empty `<em>` first), or an
 * emphasis the heading lacks.
 */
export function splitEmphasis(
  heading: string | null | undefined,
  emphasis: string | null | undefined,
): [before: string, emphasis: string, after: string] | null {
  if (!heading || !emphasis) return null
  const i = heading.indexOf(emphasis)
  if (i < 0) return null
  return [heading.slice(0, i), emphasis, heading.slice(i + emphasis.length)]
}
