import type {Rule} from 'sanity'

/**
 * The SEO Title field's validation, in one place for all 22 document types
 * that have one. Doctrine: `BI/rules/page-titles.md`, TITLE-1 to TITLE-12.
 * (This line named `BI-Content.md` § Title tags until 2026-08-09; that file's
 * live title claims moved to the rule file on 2026-08-01 and the pointer went
 * stale behind them.)
 *
 * THREE RULINGS ARE ENCODED HERE.
 *
 * 0. THE FIELD IS OPTIONAL (operator, 2026-08-07, `OUTSTANDING.md` item 128,
 *    landed 2026-08-09). `required()` was an `.error()` here until that day, so
 *    Studio REFUSED TO SAVE a blank SEO Title while doctrine called a blank one
 *    a legitimate fallback. TITLE-1 is the doctrine: a stored value is the
 *    COMPLETE title, used verbatim, and a formula runs only when there is no
 *    value. An error on `required()` therefore made the formula branch
 *    unreachable from Studio — the operator could not choose the fallback the
 *    whole ruleset is built around. Item 128 put the contradiction to Justin as
 *    a ruling rather than a defect, because either side could have given; the
 *    ruling is that STUDIO GIVES. The error drops, the field is optional, and
 *    the length warning below is untouched.
 *
 *    This does NOT make a blank title harmless. It makes it the operator's
 *    choice rather than Studio's refusal, and the composed fallback is what
 *    renders. The tool-side rungs are unchanged.
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
 * ONE RULE, NOT TWO. There is no `required()` here, by the item 128 ruling
 * recorded above: blank is a legitimate value and Studio must let it save.
 * **Do not add one back.** The tension this array used to carry in a comment —
 * doctrine calling blank a fallback while Studio refused it — was resolved on
 * 2026-08-09 in doctrine's favour, and `scripts/verify-seo-title-validation.ts`
 * runs Sanity's real validator against a blank field to keep it resolved.
 */
export const seoTitleValidation = (rule: Rule) => [
  rule
    .max(RENDERED_TITLE_MAX)
    .warning(
      `Over ${RENDERED_TITLE_MAX} characters. This field is the WHOLE title — ` +
      `nothing is added to it — so this is what search results will show, and ` +
      `Google may rewrite the tail. Saving is fine and nothing is truncated.`,
    ),
]
