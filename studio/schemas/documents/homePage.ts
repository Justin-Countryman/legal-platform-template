import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'
import {seoTitleValidation} from '../seoTitle'
import {metaDescriptionValidation} from '../metaDescription'
import {
  OG_DESCRIPTION_DESCRIPTION,
  OG_TITLE_DESCRIPTION,
  ogDescriptionValidation,
  ogTitleValidation,
} from '../socialOverrides'

// The six block types and the `sections` list are retired in release one of
// expand-then-contract (Phase 10, 2026-09-14) and deleted in Phase 15 once
// every stored member is migrated (Phase 12). The reason renders as the
// Studio's deprecation badge.
const RETIRED_BLOCK = {
  reason:
    'Retired 2026-09-14 (Phase 10): the homepage list now holds inline copies of the full sections. This block keeps rendering until Phase 12 migrates it; Phase 15 deletes the type.',
}
const RETIRED_SECTIONS = {
  reason:
    'Retired 2026-09-14 (Phase 10): the homepage composes from the Homepage Canvas. Phase 12 folds any member here into the canvas; Phase 15 removes this field.',
}

// Existing Sanity fields: metaDescription, noIndex, seoTitle, slug
// Additional fields added per the homePage spec that lived in BI-UX.md, which the
// platform repo archived to `_archive/superseded-bi/BI-UX.md` (monorepo
// OUTSTANDING item 114); the live homepage doctrine is `BI/BI-Homepage.md`.

export const homePage = defineType({
  name: 'homePage',
  title: 'Homepage',
  type: 'document',
  fieldsets: [
    {
      name: 'seo',
      title: 'SEO Settings',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'pageSettings',
      title: 'Page Settings',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'ctaSection',
      title: 'Global CTA Section',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'layout',
      title: 'Layout',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    {
      name: 'title',
      fieldset: 'pageSettings',
      title: 'Page Title',
      type: 'string',
      description: 'Internal label for this page — e.g. "Home"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'slug',
      fieldset: 'pageSettings',
      title: 'Slug',
      type: 'slug',
      description: 'Homepage slug — always / — do not change',
      readOnly: true,
      initialValue: {current: 'home'},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'navLabel',
      fieldset: 'pageSettings',
      title: 'Nav Label',
      type: 'string',
      description: 'Short label for menus, breadcrumbs, index cards and link text. Leave blank to use the Page Title.',
    },
    // ─── SEO Settings ─────────────────────────────────────────────────────────
    {
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      fieldset: 'seo',
      components: {input: TokenStringInput},
      validation: seoTitleValidation,
    },
    {
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      fieldset: 'seo',
      components: {input: TokenTextInput},
      validation: metaDescriptionValidation,
    },
    {
      name: 'ogTitle',
      title: 'Social Share Title',
      type: 'string',
      description: OG_TITLE_DESCRIPTION,
      fieldset: 'seo',
      components: {input: TokenStringInput},
      validation: ogTitleValidation,
    },
    {
      name: 'ogDescription',
      title: 'Social Share Description',
      type: 'text',
      rows: 3,
      description: OG_DESCRIPTION_DESCRIPTION,
      fieldset: 'seo',
      components: {input: TokenTextInput},
      validation: ogDescriptionValidation,
    },
    {
      name: 'ogImageOverride',
      title: 'OG Image',
      type: 'image',
      description: '1200×630 px recommended. Optional — when empty, the site generates a branded share image automatically from the firm name, logo and brand colour, so leaving this blank is a valid choice rather than a gap.',
      fieldset: 'seo',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'noIndex',
      title: 'No Index',
      type: 'boolean',
      fieldset: 'seo',
      initialValue: false,
    },
      // Ruled 2026-07-25: INDEPENDENT of No Index. Hiding a page does NOT
      // stop crawlers following its links — see BI-URL-Architecture.md,
      // Search visibility. Defaults OFF, nothing sets it on; it exists for
      // a client who one day needs it.
      {
        name: 'noFollow',
        title: 'No Follow',
        type: 'boolean',
        initialValue: false,
        fieldset: 'seo',
        description: 'Stops search engines following links on this page. Independent of No Index — a hidden page still follows its links unless this is on. Leave off unless you have a specific reason.',
      },
    {
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      fieldset: 'seo',
      description: 'Override only — the canonical URL is set automatically from the page slug. Only fill this in if you need to point to a different URL.',
    },
    // ─── Hero ───────────────────────────────────────────────────────────────
    {
      name: 'hero',
      title: 'Homepage Hero',
      type: 'homeHeroContent',
      description: 'The unique homepage hero — content only (headline, copy, buttons). Its design + layout (skeleton, backdrop, split, surface, scrim, section background, silo) are set in Hero Settings → Homepage Hero.',
    },
    // ─── Content ──────────────────────────────────────────────────────────────
    {
      name: 'reviewsEmbed',
      title: 'Reviews Embed Code (retired)',
      type: 'text',
      rows: 5,
      // Retired 2026-09-14 (Justin): no query or component ever read this field,
      // so an embed pasted here showed nowhere. The homepage list's Reviews
      // section (`reviewsSectionInline`) replaces it. Hidden while empty; a
      // homepage that holds a value keeps it visible for Phase 12 to move into a
      // Reviews section, and Phase 15 removes the field.
      deprecated: {reason: 'Retired 2026-09-14: this field never rendered. Add a Reviews section to the Homepage Canvas instead; Phase 12 moves any value here into one and Phase 15 removes this field.'},
      hidden: ({value}) => typeof value !== 'string' || value.trim() === '',
      description: 'Retired: this field was never shown on the site. Add a Reviews section to the Homepage Canvas instead.',
    },
    // ─── Homepage Canvas ──────────────────────────────────────────────────────
    // The composed mid-page: everything between the hero and the footer, as an
    // ordered list of page-owned members that belong to this homepage alone.
    //
    // RELEASE ONE OF EXPAND-THEN-CONTRACT (Phase 10, 2026-09-14; monorepo
    // WS-V1-PHASE10-DESIGN, [R-434]). The list now accepts the seven INLINE
    // SECTION OBJECTS (`<name>Inline`, one field list shared with the section
    // document each mirrors, see documents/sections/*.ts) beside the six old
    // block types, which are deprecated and render exactly as before until
    // Phase 12 migrates every stored member and Phase 15 deletes them. Nothing
    // in this list is a reference to a shared section document (ruled
    // 2026-08-08): a member here edits this page and no other.
    //
    // `deprecated` on a member is a badge the Studio shows once the member is
    // opened; the insert menu does not read it, so the retired members carry a
    // title override and sit in their own insert-menu group. Nothing downstream
    // (the extract, typegen, the field map) sees `deprecated`; the compiled
    // schema is asserted by scripts/verify-inline-sections.ts.
    //
    // `sections` BELOW stays for one more pin, deprecated, for the same reason.
    // The fifteen `of` entries are flat literals on purpose: a monorepo test
    // parses this list with a regex (test_required_beats_are_realizable.py).
    {
      name: 'canvas',
      fieldset: 'layout',
      title: 'Homepage Canvas',
      type: 'array',
      description:
        'The composed mid-page, in order. Every member belongs to this homepage only. Add sections from the Sections group; the Legacy blocks group is the old block shape, kept so existing homepages keep rendering until they are migrated, and deleted in Phase 15.',
      options: {
        insertMenu: {
          views: [{name: 'list'}],
          groups: [
            {
              name: 'sections',
              title: 'Sections',
              of: [
                'practiceAreaNavInline',
                'attorneySectionInline',
                'caseResultsSectionInline',
                'badgesSectionInline',
                'testimonialsGridInline',
                'featuredTestimonialInline',
                'videoSectionInline',
                'contentSectionInline',
                'reviewsSectionInline',
              ],
            },
            {
              name: 'legacy',
              title: 'Legacy blocks (retired; deleted in Phase 15)',
              of: [
                'narrativeBlock',
                'differentiatorBlock',
                'caseResultsBlock',
                'attorneyHighlightBlock',
                'badgesBlock',
                'siloNavBlock',
              ],
            },
          ],
        },
      },
      of: [
        {type: 'practiceAreaNavInline'},
        {type: 'attorneySectionInline'},
        {type: 'caseResultsSectionInline'},
        {type: 'badgesSectionInline'},
        {type: 'testimonialsGridInline'},
        {type: 'featuredTestimonialInline'},
        {type: 'videoSectionInline'},
        {type: 'contentSectionInline'},
        {type: 'reviewsSectionInline'},
        {type: 'narrativeBlock', title: 'Narrative (retired block)', deprecated: RETIRED_BLOCK},
        {type: 'differentiatorBlock', title: 'Differentiators (retired block)', deprecated: RETIRED_BLOCK},
        {type: 'caseResultsBlock', title: 'Case Results (retired block; use Case Results)', deprecated: RETIRED_BLOCK},
        {type: 'attorneyHighlightBlock', title: 'Attorney Highlight (retired block; use Attorney Section)', deprecated: RETIRED_BLOCK},
        {type: 'badgesBlock', title: 'Badges / Awards (retired block; use Badges Section)', deprecated: RETIRED_BLOCK},
        {type: 'siloNavBlock', title: 'Areas of Law (retired block; use Practice Area Navigation)', deprecated: RETIRED_BLOCK},
      ],
    },
    // ─── Coda (removed) ───────────────────────────────────────────────────────
    // REMOVED 2026-09-14 (Justin, monorepo [R-446]): the one-line closing
    // statement after the final CTA no longer renders; nothing sits below the
    // CTA, and a closing statement, when wanted, is a content-section band in
    // the canvas above it. The field stays, retired and hidden while empty, so a
    // stored value is not lost before Phase 15 deletes it with the other retired
    // homepage fields.
    {
      name: 'codaLine',
      title: 'Coda Line (retired)',
      type: 'string',
      deprecated: {reason: 'Removed 2026-09-14: the closing line after the final CTA no longer renders. Use a content section in the Homepage Canvas for a closing statement; Phase 15 removes this field.'},
      hidden: ({value}) => typeof value !== 'string' || value.trim() === '',
      description: 'Retired: this line no longer shows on the site. Add a content section (statement or ribbon) to the Homepage Canvas for a closing statement.',
      components: {input: TokenStringInput},
    },
    // ─── Page Sections ────────────────────────────────────────────────────────
    // DEPRECATED (Phase 10, 2026-09-14): the interior-page reference list on the
    // homepage. It still renders after the canvas until Phase 12 folds any
    // stored members into the canvas, and Phase 15 removes it. On the fixture
    // client it is empty. Do not add to it; use the canvas.
    {
      name: 'sections',
      fieldset: 'layout',
      title: 'Full Width Sections (retired)',
      // Hidden while empty (Justin, 2026-09-14): an empty retired list is only clutter.
      // A homepage that still holds members keeps the field visible until Phase 12
      // folds them into the canvas and Phase 15 removes it.
      hidden: ({value}) => !Array.isArray(value) || value.length === 0,
      type: 'array',
      deprecated: RETIRED_SECTIONS,
      description: 'Retired. Shared interior-page sections referenced from the homepage; still rendered after the canvas until Phase 12 migrates them and Phase 15 removes this field. Use the Homepage Canvas instead.',
      of: [
        {
          type: 'reference',
          to: [
            {type: 'testimonialsGrid'},
            {type: 'featuredTestimonial'},
            {type: 'ctaSection'},
            {type: 'faqSection'},
            {type: 'badgesSection'},
            {type: 'attorneySection'},
            {type: 'reviewsSection'},
            {type: 'videoSection'},
            {type: 'practiceAreaNav'},
          ],
        },
      ],
    },
    {
      name: 'hideCtaForm',
      fieldset: 'ctaSection',
      title: 'Hide Global CTA',
      type: 'boolean',
      description: 'Hide the global CTA section on this page',
      initialValue: false,
    },
    {
      name: 'ctaFormOverride',
      fieldset: 'ctaSection',
      title: 'Global CTA Override',
      type: 'ctaFormSection',
    },
  ],

  preview: {
    prepare() {
      return {title: 'Homepage'}
    },
  },
})
