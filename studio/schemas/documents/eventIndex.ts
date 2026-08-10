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

// Singleton — events index page at /events
// Layout A — Full Width Content Shell

export const eventIndex = defineType({
  name: 'eventIndex',
  title: 'Events Index',
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
    // ─── Page Settings ────────────────────────────────────────────────────────
    {
      name: 'title',
      fieldset: 'pageSettings',
      title: 'Page Title',
      type: 'string',
      description: 'Internal label for this page — e.g. "Events"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'slug',
      fieldset: 'pageSettings',
      title: 'Slug',
      type: 'slug',
      description: 'Always events — do not change',
      readOnly: true,
      initialValue: {current: 'events'},
      validation: (Rule) => Rule.required().error(),
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
    // ─── Content ──────────────────────────────────────────────────────────────
    {
      name: 'hero',
      title: 'Internal Hero',
      type: 'internalHero',
      description: 'The heading inside the hero is the H1 for this page',
    },
    // ─── Page Sections ────────────────────────────────────────────────────────
    {
      name: 'sections',
      fieldset: 'layout',
      title: 'Full Width Sections',
      type: 'array',
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
          ],
        },
      ],
    },
    // ─── CTA Section ──────────────────────────────────────────────────────────
    {
      name: 'hideCtaForm',
      fieldset: 'ctaSection',
      title: 'Hide Global CTA',
      type: 'boolean',
      description: 'Hide the global CTA section on this page',
      initialValue: true,
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
      return {title: 'Events Index', subtitle: '/events'}
    },
  },
})
