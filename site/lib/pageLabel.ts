/**
 * THE ONE RESOLVER. Every surface that names a page reads it through here.
 *
 * Doctrine: `BI-Workflow.md` NAME-3, ruled by Justin 2026-07-29. NAME-1 gives
 * every page four naming fields; NAME-2 rules that an empty field uses Name.
 *
 * WHY THIS FILE EXISTS. Four separate things resolved a label before 2026-07-29
 * and they disagreed: this function's ancestor inside `Breadcrumbs.tsx` (called
 * from exactly one route), eight GROQ projections that put `hero.heading` ahead
 * of the naming fields, and hardcoded literals in route files. Dudley's `/staff`
 * was the proof — H1 `Staff` from a projection, breadcrumb `Our Team` from a
 * literal, neither one a stored name. NAME-1 and NAME-2 are unenforceable while
 * four code paths answer the question independently, so they collapse to this.
 *
 * THE HEADING IS NOT A SOURCE. `hero.heading` and `h1` are deliberately absent
 * from the signature, not merely unread: a resolver that cannot see a heading
 * cannot fall back to one. The rung was removed from the page-name ladder on
 * 2026-07-20 (ruling 5, the Kenneth/Dudley bug) for a recorded reason — an SEO
 * heading like `Minnesota Litigation Attorneys` surfacing as a nav label — and
 * NAME-2 says it does not return. This is that rule made structural.
 *
 * THE SLUG IS THE LAST RESORT, and it stays. A page with no stored name at all
 * still needs something to render, and a title-cased slug leaf is a plainer
 * wrong answer than a blank breadcrumb.
 */

export type PageLabelFields = {
  navLabel?: string | null
  title?: string | null
  slug?: string | null
}

/**
 * NAME-4's five index-page names, the last resort for a document the build never
 * wrote a `title` onto — one made by hand in Studio, or one predating the field.
 *
 * MIRROR of `_shared/page_name.py::STANDARD_PAGE_PRESETS`. Python cannot be
 * imported here, so the values exist twice; same cost as `areaOfLawPhrases.ts`
 * and `seoTitle.ts` and recorded for the same reason. **Change both together.**
 *
 * IT EXISTS SO THE LITERALS ARE IN ONE PLACE. Before NAME-3 each of these
 * strings sat in a GROQ projection AND in a route file, and two of them
 * disagreed: `staffIndex` read `Our Team` in three places in `staff/page.tsx`
 * while doctrine had superseded it to `Our Staff`. A table cannot disagree with
 * itself.
 */
export const INDEX_PAGE_PRESETS: Record<string, string> = {
  blogIndex: 'Blog',
  attorneyIndex: 'Our Attorneys',
  staffIndex: 'Our Staff',
  eventIndex: 'Events',
  videoIndex: 'Video Library',
  // Not in NAME-4's table; the slug leaf already gives these their ruled name,
  // and they are here only so no route has to carry a literal.
  serviceAreaIndex: 'Service Area',
  testimonialsPage: 'Testimonials',
  // NAME-4 gives this one a fixed word. It was a literal in BOTH the route and
  // CONTACT_PAGE_QUERY's projection until 2026-07-29 — two copies of one name,
  // agreeing, which is the shape that let `Our Team` outlive its supersession.
  contactPage: 'Contact',
}

/** Title Case from a kebab slug leaf, mirroring `_shared/page_name.py`. */
const MINOR_WORDS = new Set([
  'and', 'or', 'of', 'the', 'in', 'for', 'to', 'a', 'an', 'with', 'on', 'at',
])

export function titleCaseSlugLeaf(slug: string): string {
  const leaf = slug.replace(/\/+$/, '').split('/').filter(Boolean).pop() ?? ''
  return leaf
    .split('-')
    .filter(Boolean)
    .map((word, i) =>
      i > 0 && MINOR_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ')
}

/**
 * The label for a page: Nav label, else Name, else a per-type preset, else the
 * title-cased slug leaf.
 *
 * `docType` is optional and only matters for the index singletons — pass it and
 * a document with no stored name still gets NAME-4's ruled string instead of
 * whatever its URL happens to be (`attorneys` would give `Attorneys`, not
 * `Our Attorneys`).
 *
 * Returns null only when the page carries none of them, which for a routed page
 * means the document is empty.
 */
export function resolvePageLabel(
  page: PageLabelFields | null | undefined,
  docType?: string,
): string | null {
  const navLabel = page?.navLabel?.trim()
  if (navLabel) return navLabel
  const title = page?.title?.trim()
  if (title) return title
  // THE PRESET IS REACHED EVEN WITH NO DOCUMENT (fixed 2026-07-29). This used to
  // `return null` on a null page before any rung ran, so a client without a
  // `videoIndex` document got NO label at all — and the route feeds the same
  // value to its H1, so `/videos` and `/testimonials` rendered an EMPTY H1 on
  // Dudley. A preset is keyed on the TYPE; a missing document does not change
  // what the type is called. NAME-4 names `videoIndex` `Video Library` whether or
  // not anyone has created one.
  const preset = docType ? INDEX_PAGE_PRESETS[docType] : undefined
  if (preset) return preset
  if (!page) return null
  const slug = page.slug?.trim()
  if (slug) return titleCaseSlugLeaf(slug) || null
  return null
}
