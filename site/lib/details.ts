// ─── The details: design choices kept outside the style sets (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2, `[R-641]`) ──────
//
// The premium package adds choices a firm's look is built from that no style set carries: which role a heading, a color
// band or the accent on dark draws from, and how a button sits on a dark section. They are kept outside the style-set
// match (`STYLE_SET_FIELDS`, `lib/styleSets.ts`) and its picks, so a style set applied in the preview never writes or
// clears one and a site that sets one keeps its style set's name. Blank renders exactly what the site always drew.
//
// Two kinds. A PALETTE detail points at a color role, so a palette choice that changes a role clears it (the preview's
// plan, `COLOR_DETAILS`; Apply clears it and never sets it). An ELEMENT detail is how an element looks, kept by every
// style set and palette. Every detail is claimed by its layer in `lib/layers.ts`; this table names them once for the
// Studio's style-set picker, the switcher's details line and the tests.

export type DetailKind = 'palette' | 'element'

export type Detail = {
  field: string
  kind: DetailKind
  /** What the Studio and the switcher call the choice. */
  label: string
  /** The stored values, with the words each is shown in. */
  values: Readonly<Record<string, string>>
}

export const DETAILS: readonly Detail[] = [
  {field: 'headingInk', kind: 'palette', label: 'Heading color', values: {action: 'the button color'}},
  {field: 'saturatedFrom', kind: 'palette', label: 'Color band', values: {action: 'the button color'}},
  {field: 'accentOnDark', kind: 'palette', label: 'Accent on dark sections', values: {raw: 'as chosen'}},
  {field: 'buttonOnDark', kind: 'element', label: 'Buttons on dark sections', values: {accent: 'accent', action: 'button color', outline: 'accent outline'}},
  {field: 'heroHeadingWeight', kind: 'element', label: 'Homepage headline', values: {bold: 'bold'}},
  {field: 'leadIn', kind: 'element', label: 'Lead-in line', values: {lead: 'lead', kicker: 'kicker'}},
  {field: 'labelStyle', kind: 'element', label: 'Labels', values: {tracked: 'tracked capitals'}},
]

/** The palette details: cleared, never set, when a palette choice changes a color role. */
export const COLOR_DETAILS: readonly string[] = DETAILS.filter((d) => d.kind === 'palette').map((d) => d.field)

/** The details a stored document sets, in words, for the switcher's and the picker's details line. A value the table
 *  does not name reads as unset, as the site reads it. */
export function detailsOf(doc: Record<string, unknown> | null | undefined): {field: string; label: string; value: string}[] {
  const out: {field: string; label: string; value: string}[] = []
  for (const d of DETAILS) {
    const v = doc?.[d.field]
    if (typeof v === 'string' && d.values[v]) out.push({field: d.field, label: d.label, value: d.values[v]})
  }
  return out
}

/** A stored value as the site reads it: one the table names, else null. */
export function detailValue(doc: Record<string, unknown> | null | undefined, field: string): string | null {
  const d = DETAILS.find((x) => x.field === field)
  const v = doc?.[field]
  return d && typeof v === 'string' && d.values[v] ? v : null
}
