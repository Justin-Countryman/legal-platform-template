import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'
import {seoTitleValidation} from '../seoTitle'

// Layout B — Content + Sidebar Shell

export const practiceArea = defineType({
  name: 'practiceArea',
  title: 'Practice Area',
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
      description: 'Short internal title used to generate the slug — e.g. "Employment Law"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'parentPage',
      fieldset: 'pageSettings',
      title: 'Parent Page',
      type: 'reference',
      to: [{type: 'practiceArea'}],
      description: 'Set if this is a child practice area — e.g. Employment Law → Business Law',
    },
    {
      name: 'slug',
      fieldset: 'pageSettings',
      title: 'Slug',
      type: 'slug',
      description: 'Click Generate after setting Page Title and Parent Page',
      options: {
        source: async (doc, {getClient}) => {
          const d = doc as {title?: string; parentPage?: {_ref?: string}}
          const name = d.title ?? ''
          if (!name) return ''
          const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          const parentRef = d.parentPage?._ref
          if (!parentRef) return slug
          const client = getClient({apiVersion: '2024-01-01'})
          const parentSlug: string = await client.fetch(`*[_id == $id][0].slug.current`, {id: parentRef})
          return parentSlug ? `${parentSlug}/${slug}` : slug
        },
      },
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
    // ─── Content ──────────────────────────────────────────────────────────────
    {
      name: 'hero',
      title: 'Internal Hero',
      type: 'internalHero',
      description: 'The heading inside the hero is the H1 for this page',
    },
    {
      name: 'body',
      title: 'Body Content',
      type: 'blockContent',
    },
    {
      name: 'faqItems',
      title: 'FAQ Items',
      type: 'array',
      description:
        'References to FAQ documents. Triggers FAQPage schema when populated. Uses same accordion as faqPage. FAQs live as standalone documents (Individual Items → FAQs) and are referenced here so the same Q+A can appear on multiple pages.',
      of: [{type: 'reference', to: [{type: 'faqItem'}]}],
    },
    // ─── Sidebar ──────────────────────────────────────────────────────────────
    {
      name: 'sidebar',
      fieldset: 'layout',
      title: 'Sidebar Components',
      type: 'array',
      description: 'Sidebar components — Layout B pages only. Empty array = no sidebar rendered.',
      of: [
        {
          type: 'reference',
          title: 'Sidebar Widget',
          to: [
            {type: 'sidebarNav'},
            {type: 'sidebarAttorneyList'},
            {type: 'sidebarCtaBox'},
            {type: 'sidebarFormEmbed'},
          ],
        },
        {type: 'sidebarTableOfContents'},
      ],
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
    select: {title: 'title', subtitle: 'slug.current'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Practice Area', subtitle: subtitle ? `/${subtitle}` : ''}
    },
  },
})
