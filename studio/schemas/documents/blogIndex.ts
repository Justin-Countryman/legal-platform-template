import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'

// Existing Sanity fields: h1, metaDescription, noIndex, seoTitle, slug
// Layout A — Full Width Content Shell

export const blogIndex = defineType({
  name: 'blogIndex',
  title: 'Blog Index',
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
      title: 'CTA Section',
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
      description: 'Always blog/ — do not change',
      readOnly: true,
      initialValue: {current: 'blog'},
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
      initialValue: false,
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
    {
      name: 'hideCtaForm',
      fieldset: 'ctaSection',
      title: 'Hide CTA Section',
      type: 'boolean',
      description: 'Hide the global CTA section on this page',
      initialValue: true,
    },
    {
      name: 'ctaFormOverride',
      fieldset: 'ctaSection',
      title: 'CTA Content Override',
      type: 'ctaFormSection',
    },
  ],

  preview: {
    select: {subtitle: 'slug.current'},
    prepare({subtitle}) {
      const derived = subtitle ? subtitle.replace(/\//g, ' / ').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : null
      return {title: derived ?? 'Blog Index', subtitle: subtitle ? `/${subtitle}` : ''}
    },
  },
})
