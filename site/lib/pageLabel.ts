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
 * The label for a page: Nav label, else Name, else the title-cased slug leaf.
 *
 * Returns null only when the page carries none of the three, which for a routed
 * page means the document is empty.
 */
export function resolvePageLabel(page: PageLabelFields | null | undefined): string | null {
  if (!page) return null
  const navLabel = page.navLabel?.trim()
  if (navLabel) return navLabel
  const title = page.title?.trim()
  if (title) return title
  const slug = page.slug?.trim()
  if (slug) return titleCaseSlugLeaf(slug) || null
  return null
}
