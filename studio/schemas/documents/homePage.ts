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
    // ─── Homepage Canvas ──────────────────────────────────────────────────────
    // The composed mid-page: everything between the hero and the footer, as an
    // ordered list of page-owned members that belong to this homepage alone.
    //
    // The list holds the nine INLINE SECTION OBJECTS (`<name>Inline`, one field
    // list shared with the section document each mirrors, see
    // documents/sections/*.ts; monorepo [R-434]). Nothing in it is a reference to
    // a shared section document (ruled 2026-08-08): a member here edits this page
    // and no other. The six retired block types that shared this list from Phase
    // 10 were deleted in Phase 15, as were the retired `sections`, `reviewsEmbed`
    // and `codaLine` fields; a stored member of a deleted type renders nothing, and
    // the monorepo's homepage build step reports it. The compiled schema is
    // asserted by scripts/verify-inline-sections.ts.
    //
    // The nine `of` entries are flat literals on purpose: a monorepo test parses
    // this list with a regex (test_required_beats_are_realizable.py).
    {
      name: 'canvas',
      fieldset: 'layout',
      title: 'Homepage Canvas',
      type: 'array',
      description:
        'The composed mid-page, in order. Every member belongs to this homepage only.',
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
