// ─── Overlap (Phase 16E, `[R-499]`) ───────────────────────────────────────────
//
// What crosses the seam between two homepage sections, picked once for the site and
// placed by one rule rather than section by section — the shape `[R-481]` gave the
// divider. Justin, 2026-09-18: "overlap is a very modern design approach these days
// and should have multiple options in themes."
//
// THE LIBRARY HAS ONE ENTRY TODAY, AND THAT IS A MEASUREMENT, NOT A LIMIT. The field
// study's 50 overlapping bands were first read as twelve rising panels against
// seventeen rising photos, which made the two look like peers. They are not: that
// twelve came from a band's own surface code (`panel-contained` means "this band's
// content sits in a panel", not "a panel rides up"), and read against each site's own
// description there is ONE unambiguous rising panel in sixty-five homepages, on a
// non-premium site, and it is a final call to action. A photo or a figure rises on
// eighteen sites and on six of the eleven premium ones; live, across 228 agency-built
// law-firm homepages, a photo rises on thirteen and a panel on four.
//
// So the whole-panel overlap stays what it already was — a switch on one section
// (`overlapPrevious`, inset panels only, `[R-475]`) — and the site-wide setting names
// the one device the evidence supports. A second entry is one value here plus one
// predicate in the walk when something earns it.
//
// The devices the phase measured and did not build, so the next reader does not
// re-derive them: a strip riding into the hero (6 study sites, 0 premium); the footer
// riding over the last band (site chrome, which would appear on every interior page,
// against `[R-472]`); and a shape behind a cutout figure (1 site of 65, 0 of 228 live).

export const OVERLAPS = ['none', 'photo'] as const
export type SectionOverlap = (typeof OVERLAPS)[number]

/** How far a raised element crosses the seam. Read by `globals.css`'s `photo-rise`
 *  utility through `--photo-rise`; the band above grows its bottom padding by the same
 *  rem number (`SECTION_SPACING[*].bottomBeforeOverlap.photo`), which is what makes
 *  `[R-475]` a construction guarantee rather than a hope. 4rem sits inside the live
 *  interquartile range (39 to 85px, median 55) and clears `ScrollReveal`'s own 24px
 *  offset, below which the device is invisible for most of its life. */
export const PHOTO_RISE = '4rem'

/** A stored value read the way the site reads it: anything unknown is `none`. */
export function readOverlap(value: unknown): SectionOverlap {
  return value === 'photo' ? 'photo' : 'none'
}

/** True when the site raises a feature photo. */
export function raisesPhotos(value: unknown): boolean {
  return readOverlap(value) === 'photo'
}
