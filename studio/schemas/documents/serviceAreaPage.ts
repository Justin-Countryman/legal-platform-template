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

// Layout B — Content + Sidebar Shell
// Slug: /service-area/{city}-law-firm/ — e.g. /service-area/woodbury-law-firm/
//
// RE-RULED 2026-07-28: the leaf was `{city}-{state}` (`woodbury-mn`). The state
// suffix is DROPPED so the leaf reads as what the page is about rather than as a
// filing-system entry. The `/service-area/` parent STAYS — it is what tells the
// index, the parent-child structure and BI-Content.md TITLE-9/TITLE-10 that
// these pages are one set. Nothing here parses the slug, so this is the URL and
// not an input to anything.
//
// The leaf is now shared with `locationPage`, which sits at the ROOT as
// `/{city}-law-firm/`. Only the parent folder tells them apart: an office page
// has an address, a service area page does not.
//
// CORRECTED 2026-07-26. This line read `/city-practice-area/`, which is the
// geoPracticeArea form and was never this type's URL — a copy-paste from that
// schema. A service area page is city × WHOLE FIRM, nested under the service
// area index; a geo page is city × ONE PRACTICE and sits at the root. Confusing
// the two is exactly what `BI-URL-Architecture.md` → "Service Area vs. GEO"
// exists to prevent.
// Schema: LocalBusiness (service area, no address) + BreadcrumbList
// No data section — purely content driven

export const serviceAreaPage = defineType({
  name: 'serviceAreaPage',
  title: 'Service Area Page',
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
      description: 'Short internal title used to generate the slug — e.g. "Minneapolis Family Law"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'parentPage',
      fieldset: 'pageSettings',
      title: 'Parent Page',
      type: 'reference',
      to: [{type: 'serviceAreaPage'}],
      description: 'Set if this is a child service area page',
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
        'References to FAQ documents. Triggers FAQPage schema when populated. FAQs live as standalone documents (Individual Items → FAQs) and are referenced here so the same Q+A can appear on multiple pages.',
      of: [{type: 'reference', to: [{type: 'faqItem'}]}],
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
      return {title: derived ?? 'Service Area Page', subtitle: subtitle ? `/${subtitle}` : ''}
    },
  },
})
