// Title-tag constants for the site package. Doctrine: `BI-Content.md` §
// Title tags.
//
// THREE COPIES OF THE SEPARATOR EXIST, DELIBERATELY, AND THIS IS ONE OF THEM.
// The other two are `studio/schemas/seoTitle.ts` and `BE/_shared/seo_title.py`.
// They cannot be collapsed:
//   - studio cannot import from site. That cross-package import is the exact
//     mechanism behind OUTSTANDING item 22 failure 1 — Node resolves from the
//     importing file, so `site/lib/*` resolves against `site/node_modules`,
//     which CI never installs for studio. One such import already blocks
//     typegen; adding another would widen a known break.
//   - the tools are Python and live in a different repository.
// So the cost is three literals instead of one. It is written down in all
// three places rather than discovered later as drift, because drift here is
// silent: a mismatched separator still renders a plausible title. The last
// time it drifted, `_SEO_TITLE_TEMPLATE_JOIN` said `" | "` for three days
// after the layout moved to `" - "`, and nothing caught it.

/** The root layout's title template separator. `<fragment>` + this + firm name. */
export const TITLE_SEPARATOR = ' - '

/**
 * The rendered-title length ceiling. WARNS, NEVER BLOCKS (operator ruling,
 * 2026-07-26). It measures the RENDERED title — the fragment plus the
 * separator plus the firm name — not the stored field, because the field is
 * not what search results truncate.
 */
export const RENDERED_TITLE_MAX = 60

/** Next's `title.template` value for the root layout. */
export function titleTemplate(firmName: string): string {
  return `%s${TITLE_SEPARATOR}${firmName}`
}

/**
 * What the browser will show for a page whose fragment is `fragment`.
 * An empty fragment renders the firm name alone (Next falls to
 * `title.default`), which is why this returns the bare firm name rather than
 * a string starting with the separator.
 */
export function renderedTitle(fragment: string | null | undefined, firmName: string): string {
  const f = (fragment ?? '').trim()
  if (!f) return firmName
  if (!firmName) return f
  return `${f}${TITLE_SEPARATOR}${firmName}`
}

/**
 * The title every route that is about to call `notFound()` reports, so the
 * 404 page carries a real title instead of inheriting `title.default` (the
 * bare firm name).
 *
 * This is a ROUTE-level fragment, not a document. `not-found.tsx` is a UI
 * boundary with no metadata of its own, and the `404page` CS-SITEMAP type
 * deliberately creates no Sanity document in either tool, so there is nothing
 * to read a title off. The metadata for a 404 therefore has to come from the
 * route that decided to 404 — which is every route below, and the catch-all
 * for any URL that matches no route at all.
 */
export const NOT_FOUND_TITLE = 'Page Not Found'
