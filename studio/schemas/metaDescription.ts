import type {Rule} from 'sanity'

/**
 * The Meta Description field's validation, in one place for all 22 document
 * types that have one. Doctrine: `BI/rules/page-naming.md` § Meta descriptions,
 * ruled by Justin 2026-07-28 and unlabelled by that ruling's own note.
 *
 * TWO RULINGS ARE ENCODED HERE.
 *
 * 0. THE FIELD IS OPTIONAL (operator, 2026-08-09, `OUTSTANDING.md` item 128's
 *    sibling finding). `required()` was an `.error()` on all 22 documents until
 *    that day, so Studio REFUSED TO SAVE a blank Meta Description while doctrine
 *    ruled a blank cell the case where the page renders no meta description at
 *    all. The doctrine is explicit that there is no formula, no fallback rung
 *    and no composition on any page type: **the operator supplies it or the page
 *    ships without one.** An error on `required()` therefore made the ruled
 *    outcome unreachable from Studio.
 *
 *    THIS IS THE WEAKER CASE OF THE TWO, AND SAYING SO IS THE POINT. Item 128
 *    dropped the identical error from `seoTitle`, where blank means a composed
 *    formula runs; here blank means nothing renders. That is why the two were
 *    put up as separate rulings rather than treated as one call, and why this
 *    binding exists as its own file rather than sharing `seoTitle.ts`.
 *
 * 1. THE LENGTH HALF WARNS (operator, 2026-09-11, `[R-162]`: no validation
 *    rule may block Publish on any page). It was an `.error()` until that day,
 *    and `sanity documents validate` on the Yanowitz dataset showed why that
 *    could not stand: the build writes the sitemap's Meta Description cell
 *    verbatim, 19 documents were over 160 characters, and every one of them
 *    was unpublishable from creation with nothing at the gate saying so.
 *
 * WHAT IT CANNOT CATCH, on the same terms as `seoTitle.ts`: anything written
 * through the API. Sanity validation runs in Studio only, so every document
 * Site-Prep and Site-Build write bypasses this entirely — which is also why the
 * blank branch has always been reachable by tool and never by hand.
 */

export const META_DESCRIPTION_MAX = 160

/**
 * `validation` for every `metaDescription` field.
 *
 * ONE RULE, NOT TWO. There is no `required()` here, by the 2026-08-09 ruling
 * recorded above. **Do not add one back.**
 * `scripts/verify-meta-description-validation.ts` runs Sanity's real validator
 * against both blank shapes to keep it out.
 */
export const metaDescriptionValidation = (rule: Rule) =>
  rule.max(META_DESCRIPTION_MAX).warning()
