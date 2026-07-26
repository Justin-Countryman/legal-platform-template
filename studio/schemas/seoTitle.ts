import type {Rule} from 'sanity'

/**
 * The SEO Title field's validation, in one place for all 22 document types
 * that have one. Doctrine: `BI-Content.md` § Title tags.
 *
 * TWO RULINGS ARE ENCODED HERE.
 *
 * 1. LENGTH WARNS, NEVER BLOCKS (operator, 2026-07-26). Every one of those 22
 *    schemas carried `Rule.required().max(60).error()`, which refuses to save
 *    in Studio. `.error()` on a length rule is the wrong instrument: a cap that
 *    forces a truncated fragment is worse than a long title, and Google
 *    rewrites over-length titles anyway. It is now `.warning()`.
 *
 * 2. THE 60 MEASURES WHAT THE BROWSER SHOWS, AND WHAT THAT MEANS CHANGED THE
 *    SAME DAY.
 *
 *    When first written, the browser showed this field PLUS ` - ` plus the firm
 *    name, because the root layout appended it — so this rule fetched the firm
 *    name through `context.getClient()` and measured the sum. TITLE-1 then
 *    removed the appending: a stored `seoTitle` is now the COMPLETE title, used
 *    exactly as written.
 *
 *    So it measures the field alone and reads the firm name nowhere. Left as it
 *    was, it would have over-counted every populated field by the separator
 *    plus the firm name — 23 characters at Dudley — and warned about titles
 *    that are perfectly short. Which also makes it a plain `.max().warning()`
 *    again, with no async work and no dataset read.
 *
 * WHAT IT CANNOT CATCH, stated rather than left to be discovered:
 *   - Anything written through the API. Sanity validation runs in Studio only,
 *     so every document Site-Prep and Site-Build write bypasses this entirely.
 *     That gap is covered separately by `BE/_shared/seo_title.py`, called from
 *     Site-Build's write funnel. Neither half covers the other's writes; both
 *     are needed and neither is redundant.
 *   - The formula case. When this field is empty the page composes a title from
 *     its page name and the firm name, and there is no value here to measure.
 *     The tool-side check measures that rung, and it is the one place the firm
 *     name still counts toward the 60.
 */

export const RENDERED_TITLE_MAX = 60

/**
 * `validation` for every `seoTitle` field.
 *
 * `required()` stays an ERROR and is deliberately untouched by the 2026-07-26
 * ruling, which was about length. Note the open tension for whoever revisits
 * it: doctrine says an empty SEO Title is a legitimate fallback to the page
 * name, "a fallback and not an error", while this still refuses to save one in
 * Studio. That is a separate decision and is not made here.
 */
export const seoTitleValidation = (rule: Rule) => [
  rule.required().error(),
  rule
    .max(RENDERED_TITLE_MAX)
    .warning(
      `Over ${RENDERED_TITLE_MAX} characters. This field is the WHOLE title — ` +
      `nothing is added to it — so this is what search results will show, and ` +
      `Google may rewrite the tail. Saving is fine and nothing is truncated.`,
    ),
]
