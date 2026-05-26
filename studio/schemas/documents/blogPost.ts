import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'

// Existing Sanity fields: body, h1, metaDescription, noIndex, redirectFrom, seoTitle, slug
// Layout B — Content + Sidebar Shell

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
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
      name: 'blogSettings',
      title: 'Blog Settings',
      options: {collapsible: true, collapsed: false},
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
      description: 'Click Generate after writing the H1 — auto-prefixes blog/',
      options: {
        source: (doc: any) => {
          const h1 = (doc.h1 as string) || ''
          if (!h1) return ''
          return 'blog/' + h1.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
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
      name: 'h1',
      title: 'H1 / Post Title',
      type: 'string',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'body',
      title: 'Body Content',
      type: 'blockContent',
    },
    // ─── Blog Settings ────────────────────────────────────────────────────────
    {
      name: 'useTemplateAsFeaturedImage',
      title: 'Use Template as Featured Image',
      type: 'boolean',
      fieldset: 'blogSettings',
      description: 'When on: the auto-generated template OG image also appears as the blog card thumbnail',
      initialValue: false,
    },
    {
      name: 'featuredImage',
      title: 'Featured Image (custom)',
      type: 'image',
      fieldset: 'blogSettings',
      description: 'Upload a custom image to use as both the blog card thumbnail and OG image — 1200x630px recommended',
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
      name: 'publishedAt',
      title: 'Published Date',
      type: 'datetime',
      fieldset: 'blogSettings',
      description: 'Used in byline, blog card, and Article schema',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'lastModified',
      title: 'Last Modified Date',
      type: 'datetime',
      fieldset: 'blogSettings',
      description: 'Used in Article schema dateModified — update whenever content changes',
    },
    {
      name: 'authors',
      title: 'Authors',
      type: 'array',
      fieldset: 'blogSettings',
      of: [{type: 'reference', to: [{type: 'attorneyPage'}]}],
      description: 'Links to attorney page(s) — powers byline, sidebar, and Article schema author',
      validation: (Rule) => Rule.required().min(1).warning('At least one author is required'),
    },
    {
      name: 'category',
      title: 'Category',
      type: 'reference',
      fieldset: 'blogSettings',
      to: [{type: 'blogCategory'}],
      description: 'Powers byline category link and category filter on blogIndex',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      fieldset: 'blogSettings',
      of: [{type: 'reference', to: [{type: 'blogTag'}]}],
      description: 'Select tags for this post — e.g. FAQ, Infographic, Firm News',
    },
    // ─── Sidebar ──────────────────────────────────────────────────────────────
    {
      name: 'sidebar',
      fieldset: 'layout',
      title: 'Sidebar Components',
      type: 'array',
      of: [
        {
          type: 'reference',
          title: 'Sidebar Component',
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
    select: {title: 'h1', subtitle: 'slug.current'},
    prepare({title, subtitle}) {
      const derived = subtitle ? subtitle.replace(/\//g, ' / ').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : null
      return {
        title: title ?? derived ?? 'Blog Post',
        subtitle: subtitle ? `/${subtitle}` : '',
      }
    },
  },
})
