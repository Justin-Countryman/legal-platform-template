import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'

// Layout C — Unique Content Layout
// Only created if Display Staff on Website = yes in Zite

export const staffPage = defineType({
  name: 'staffPage',
  title: 'Staff Member',
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
      name: 'slug',
      fieldset: 'pageSettings',
      title: 'Slug',
      type: 'slug',
      description: 'e.g. staff/jane-doe/ (multiple staff) or jane-doe/ (single staff)',
      options: {
        source: (doc: {firstName?: string; lastName?: string}) =>
          `${doc.firstName ?? ''} ${doc.lastName ?? ''}`.trim(),
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
      name: 'firstName',
      title: 'First Name',
      type: 'string',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'jobTitle',
      title: 'Job Title / Current Employment Position',
      type: 'string',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'photo',
      title: 'Headshot',
      type: 'image',
      description: 'Minimum 400x400px',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          description: 'Defaults to "[Name], [Job Title]"',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'email',
      title: 'Email Address',
      type: 'string',
    },
    {
      name: 'phone',
      title: 'Phone Number',
      type: 'string',
    },
    {
      name: 'biography',
      title: 'Biography',
      type: 'blockContent',
    },
    {
      name: 'location',
      title: 'Office Location',
      type: 'reference',
      to: [{type: 'locationPage'}],
      description: 'Powers "which office this staff member works from" (optional)',
    },
    // ─── CTA Form ─────────────────────────────────────────────────────────────
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
    select: {
      firstName: 'firstName',
      lastName: 'lastName',
      title: 'jobTitle',
      media: 'photo',
    },
    prepare({firstName, lastName, title, media}) {
      return {
        title: [firstName, lastName].filter(Boolean).join(' ') || 'Staff Member',
        subtitle: title,
        media,
      }
    },
  },
})
