import type {Rule, ValidationContext} from 'sanity'

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
 * 2. THE 60 MEASURES THE RENDERED TITLE, NOT THE FIELD. The field is a
 *    fragment; the browser shows the fragment plus ` - ` plus the firm name.
 *    A 58-character fragment at a firm with a 20-character name passed the old
 *    cap and shipped a 79-character title, so the cap did not measure the thing
 *    it exists to limit (OUTSTANDING item 32 defect c).
 *
 * WHERE THE MEASUREMENT CAN HONESTLY HAPPEN, AND WHY IT IS HERE.
 * The obvious objection is that Studio validation cannot know the firm name.
 * It can: `firmName` is on the `siteSettings` singleton in the same dataset,
 * and a validation rule gets a client via `context.getClient()`. So this rule
 * reads it and measures the real rendered string.
 *
 * WHAT IT CANNOT CATCH, stated rather than left to be discovered:
 *   - Anything written through the API. Sanity validation runs in Studio only,
 *     so every document Site-Prep and Site-Build write bypasses this entirely.
 *     That gap is covered separately by `BE/_shared/seo_title.py`, called from
 *     Site-Build's write funnel. Neither half covers the other's writes; both
 *     are needed and neither is redundant.
 *   - A firm name changed AFTER a title was authored. Nothing re-validates
 *     stored documents on a `siteSettings` edit, so renaming the firm can push
 *     existing titles over 60 silently.
 *   - The fallback case. When the field is empty the page renders its page
 *     name instead, and this rule has no value to measure. The tool-side check
 *     does measure that rung.
 *   - An unreachable dataset. The rule then measures the FIELD alone and says
 *     so in the message, because a validation rule that throws would block the
 *     save — the exact behaviour ruling 1 removes.
 */

/** Mirrors the site's root layout template. See the note in site/lib/seoTitle.ts. */
export const TITLE_SEPARATOR = ' - '

export const RENDERED_TITLE_MAX = 60

/** What the browser shows once the root layout appends the firm name. */
export function renderedTitle(fragment: string, firmName: string): string {
  const f = (fragment ?? '').trim()
  if (!f) return firmName
  if (!firmName) return f
  return `${f}${TITLE_SEPARATOR}${firmName}`
}

async function firmName(context: ValidationContext): Promise<string | null> {
  try {
    const client = context.getClient({apiVersion: '2024-01-01'})
    const name = await client.fetch<string | null>(
      `*[_type == "siteSettings"][0].firmName`,
    )
    return typeof name === 'string' && name.trim() ? name.trim() : null
  } catch {
    // Never let a failed lookup become a failed save.
    return null
  }
}

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
    .custom(async (value: unknown, context: ValidationContext) => {
      if (typeof value !== 'string' || !value.trim()) return true
      const firm = await firmName(context)
      const rendered = renderedTitle(value, firm ?? '')
      if (rendered.length <= RENDERED_TITLE_MAX) return true
      const basis = firm
        ? `with "${TITLE_SEPARATOR.trim()} ${firm}" appended by the site`
        : 'measuring this field alone — the firm name could not be read, so the real title is LONGER than this'
      return (
        `Renders as ${rendered.length} characters ${basis}, over the ` +
        `${RENDERED_TITLE_MAX}-character guideline. Saving is fine and nothing ` +
        `is truncated; Google may rewrite the tail in search results.`
      )
    })
    .warning(),
]
