import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'
import {seoTitleValidation} from '../seoTitle'

// Existing Sanity fields: metaDescription, noIndex, seoTitle, slug
// Additional fields added per BI-UX.md homePage spec

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
      name: 'slug',
      fieldset: 'pageSettings',
      title: 'Slug',
      type: 'slug',
      description: 'Homepage slug — always / — do not change',
      readOnly: true,
      initialValue: {current: 'home'},
      validation: (Rule) => Rule.required().error(),
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
      validation: (Rule) => Rule.required().max(160).error(),
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
      title: 'Reviews Embed Code',
      type: 'text',
      rows: 5,
      description: 'Homepage-specific reviews embed (optional — used as an alternative to the Reviews Section component)',
    },
    // ─── Homepage Canvas ──────────────────────────────────────────────────────
    // The composed mid-page: everything between the hero and the footer, as an
    // ordered list of BLOCKS that belong to this homepage alone.
    //
    // DELIBERATELY SEPARATE FROM `sections` BELOW, which is the interior-page
    // system. `sections` holds REFERENCES to standalone documents shared across
    // pages, so editing one changes every page that uses it. A block is an
    // INLINE object owned by this document. Two entries that look identical in
    // one list but behave differently, where one silently edits other pages, is
    // the failure this separation exists to prevent (ruled 2026-07-20).
    //
    // FOLLOW-UP, not done here: `sections` should eventually come off homePage
    // entirely, since the homepage is not meant to use the interior section
    // system at all. That removal has a wider blast radius than one block and is
    // its own decision. Until then both lists render, and an operator can still
    // add an interior section to the wrong one.
    {
      name: 'canvas',
      fieldset: 'layout',
      title: 'Homepage Canvas (Blocks)',
      type: 'array',
      description:
        'The composed mid-page, in order. These blocks belong to this homepage only. To reuse content across pages, reference an item (badges, case results, testimonials) rather than retyping it here.',
      of: [
        {type: 'narrativeBlock'},
        {type: 'differentiatorBlock'},
        {type: 'caseResultsBlock'},
        {type: 'attorneyHighlightBlock'},
        {type: 'badgesBlock'},
      ],
    },
    // ─── Coda ─────────────────────────────────────────────────────────────────
    // The closing line: one centered statement on a quiet band after the final
    // CTA and before the footer, closing the page's emotional arc. A BOOKEND,
    // not a canvas unit: fixed position, fixed shape, not composed and not
    // editable per block.
    //
    // WHY IT LIVES ON homePage AND NOT SOMEWHERE SHARED. Both obvious homes are
    // wrong. `globalCta` is a shared singleton AND an ask, where a coda closes
    // one page's arc and is a statement rather than a call to action; putting it
    // there would give every page one page's closing line. `siteSettings` is
    // site-wide for the same mismatch. The coda is written to follow THIS page's
    // narrative, so it belongs beside `hero` and `canvas`.
    //
    // KNOWN AND DELIBERATE: this does not generalize. BI-Library calls the coda
    // a platform default and it appears on most premium reference sites, so a
    // landing page may want one later. A `homePage`-only field will not serve
    // that, and that is the platform's standing one-consumer posture rather than
    // an oversight (BI-Library cites it at OUTSTANDING items 14 and 15). Adding
    // the same field to `landingPage` when a second consumer exists is additive
    // and invalidates nothing authored here. The trigger is a real landing page
    // that wants a coda.
    {
      name: 'codaLine',
      title: 'Coda Line',
      type: 'string',
      description:
        'One sentence, centered on a quiet band after the final CTA. Closes the page rather than asking for anything. Deliberately a single line: a paragraph here reads as a second CTA.',
      components: {input: TokenStringInput},
    },
    // ─── Page Sections ────────────────────────────────────────────────────────
    {
      name: 'sections',
      fieldset: 'layout',
      title: 'Full Width Sections',
      type: 'array',
      description: 'Reusable full-width sections below main content',
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
