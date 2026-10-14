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

// The Case Results page at the fixed route /case-results (monorepo backlog 454,
// WS-CASE-RESULTS-DESIGN-2026-10-13.md §11): every case result as a card, newest
// first, with the results disclaimer above and below the list. One document,
// `caseResultIndex-case-results` (studio/singletons.ts). The route serves the page
// when at least one result has something to show, reading this document for its
// name, search fields and hero when it exists and the preset name "Case Results"
// when it does not. No sections list: a list that renders is the cards.
// Layout A — Full Width Content Shell

export const caseResultIndex = defineType({
  name: 'caseResultIndex',
  title: 'Case Results Page',
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
  ],
  fields: [
    {
      name: 'title',
      fieldset: 'pageSettings',
      title: 'Page Title',
      type: 'string',
      description: 'Internal label for this page — e.g. "Case Results"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'slug',
      fieldset: 'pageSettings',
      title: 'Slug',
      type: 'slug',
      description: 'Always case-results/ — do not change',
      readOnly: true,
      initialValue: {current: 'case-results'},
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
      description: '1200×630 px recommended. Optional — when empty, the site generates a branded share image automatically from the firm name, logo and brand color, so leaving this blank is a valid choice rather than a gap.',
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
      description: 'Optional. When set, the heading inside the hero is the page\'s H1. When left empty, a fallback header band renders the H1.',
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
    select: {subtitle: 'slug.current'},
    prepare({subtitle}) {
      const derived = subtitle ? subtitle.replace(/\//g, ' / ').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : null
      return {title: derived ?? 'Case Results Page', subtitle: subtitle ? `/${subtitle}` : ''}
    },
  },
})
