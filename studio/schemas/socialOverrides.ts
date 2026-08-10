import type {Rule} from 'sanity'

/**
 * The two per-page social-share overrides, in one place for all 22 document
 * types that carry an SEO fieldset. Doctrine: `BI/rules/page-naming.md` NAME-1.
 *
 * WHY THEY EXIST. NAME-1 rules that the social share title IS the Search title.
 * That is the right default and it is not always right: a share card is read in
 * a feed, out of context, by someone who has not chosen to visit, and the
 * phrasing that serves a search result is not always the phrasing that serves
 * that. Before these fields there was no way to say so — the only lever was to
 * change the Search title, which changes the search result too.
 * `OUTSTANDING.md` item 91, ruled by Justin 2026-08-07.
 *
 * OPTIONAL, AND EMPTY IS THE NORMAL STATE. No tool writes either field, ever —
 * not Site-Prep, not Site-Build, not a patch script. That is asserted, not
 * assumed: `BE/_shared/__tests__/test_og_fields_are_never_written.py` in the
 * platform repo fails if any tool starts writing one. So a blank field is not a
 * gap to be filled; it is the ruled default, and the render falls back to the
 * Search title and the meta description respectively.
 *
 * THE 60 IS GUIDANCE AND WARNS ONLY, on the same reasoning TITLE-3 gave for the
 * Search title: a cap that forces a truncated fragment is worse than a long
 * title, and every platform truncates differently anyway. Saving is always
 * fine.
 *
 * WHAT THEY ARE NOT. Not a second title tag — nothing here reaches `<title>` or
 * a search result. Not an image; that is `ogImageOverride`, one field down.
 */

/** Guidance only. The number matches the Search title's for one reason: an
 *  operator who has internalised one ceiling should not have to hold a second. */
export const SOCIAL_TITLE_MAX = 60

/** Roughly what a card body shows before it clips. Warns, never blocks. */
export const SOCIAL_DESCRIPTION_MAX = 160

export const ogTitleValidation = (rule: Rule) => [
  rule
    .max(SOCIAL_TITLE_MAX)
    .warning(
      `Over ${SOCIAL_TITLE_MAX} characters. Share cards clip long titles, and ` +
      `every platform clips at a different point. Saving is fine and nothing ` +
      `is truncated here.`,
    ),
]

export const ogDescriptionValidation = (rule: Rule) => [
  rule
    .max(SOCIAL_DESCRIPTION_MAX)
    .warning(
      `Over ${SOCIAL_DESCRIPTION_MAX} characters. Share cards clip long ` +
      `descriptions. Saving is fine and nothing is truncated here.`,
    ),
]

export const OG_TITLE_DESCRIPTION =
  'Optional. The title on Facebook, LinkedIn and X share cards. Leave blank ' +
  'and the SEO Title is used, which is the normal case — fill this in only ' +
  'when the card wants different words from the search result. Aim for about ' +
  `${SOCIAL_TITLE_MAX} characters.`

export const OG_DESCRIPTION_DESCRIPTION =
  'Optional. The description on share cards. Leave blank and the Meta ' +
  'Description is used, which is the normal case. Aim for about ' +
  `${SOCIAL_DESCRIPTION_MAX} characters.`
