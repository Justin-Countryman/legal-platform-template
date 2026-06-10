import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'

// Layout D — Conversion-Focused Stripped Layout
// No BreadcrumbList, no sidebar
// Header: logo only — no main navigation
// Footer: phone number, copyright, privacy policy link only
// noIndex by default — override to index per page if needed

export const landingPage = defineType({
  name: 'landingPage',
  title: 'Landing Page',
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
    // ─── Identity ─────────────────────────────────────────────────────────────
    {
      name: 'title',
      fieldset: 'pageSettings',
      title: 'Page Title',
      type: 'string',
      description: 'Internal title used to generate the slug — e.g. "Family Law Free Case Review"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'slug',
      fieldset: 'pageSettings',
      title: 'Slug',
      type: 'slug',
      description: 'Click Generate after setting Page Title — prefix lp/ manually if needed',
      options: {source: 'title'},
      validation: (Rule) => Rule.required().error(),
    },
    // ─── SEO Settings ─────────────────────────────────────────────────────────
    {
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      fieldset: 'seo',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().max(60).error(),
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
      description: '1200×630 px recommended',
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
      initialValue: true,
    },
    {
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      fieldset: 'seo',
      description: 'Override only — the canonical URL is set automatically from the page slug. Only fill this in if you need to point to a different URL.',
    },
    // ─── Form ─────────────────────────────────────────────────────────────────
    {
      name: 'hideCtaForm',
      fieldset: 'ctaSection',
      title: 'Hide Global CTA',
      type: 'boolean',
      description: 'Hide the CTA form on this page',
      initialValue: false,
    },
    {
      name: 'campaignForm',
      title: 'Campaign Form',
      type: 'reference',
      to: [{type: 'siteForm'}],
      description: 'Select a campaign-specific form — overrides the Simple Form from Site Settings on this page only',
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
  ],

  preview: {
    select: {subtitle: 'slug.current'},
    prepare({subtitle}) {
      const derived = subtitle ? subtitle.replace(/\//g, ' / ').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : null
      return {title: derived ?? 'Landing Page', subtitle: subtitle ? `/${subtitle}` : ''}
    },
  },
})
