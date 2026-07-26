import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'
import {PageLinkInput} from '../../components/PageLinkInput'

export const attorneyPage = defineType({
  name: 'attorneyPage',
  title: 'Attorney',
  type: 'document',

  // ─── Fieldsets ────────────────────────────────────────────────────────────────
  fieldsets: [
    {
      name: 'name',
      title: 'Name',
      options: {columns: 2},
    },
    {
      name: 'pageSettings',
      title: 'Page Settings',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'seo',
      title: 'SEO Settings',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'contactVisibility',
      title: 'Contact & Visibility',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'credentials',
      title: 'Credentials',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'directoryProfiles',
      title: 'Directory Profiles',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'ctaSection',
      title: 'Global CTA Section',
      options: {collapsible: true, collapsed: true},
    },
  ],

  fields: [

    // ─── Page Settings (collapsed) ────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      description: 'Internal CMS label — e.g. "Jane Doe" or "Jane Doe, J.D."',
      fieldset: 'pageSettings',
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'e.g. attorneys/jane-doe',
      fieldset: 'pageSettings',
      options: {
        source: (doc) =>
          `attorneys/${(((doc as {title?: string}).title) ?? '').toLowerCase().replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '-')}`,
      },
      validation: (Rule) => Rule.required().error(),
    }),
    defineField({
      name: 'h1',
      title: 'H1 Override',
      type: 'string',
      description: 'Auto-built from name fields — only fill this in to override',
      fieldset: 'pageSettings',
    }),
    defineField({
      name: 'ctaOverride',
      title: 'CTA Button Override',
      type: 'object',
      description: 'Leave blank to use the global default set in Site Settings',
      fieldset: 'pageSettings',
      fields: [
        {
          name: 'label',
          title: 'Button Label',
          type: 'string',
        },
        {
          name: 'url',
          title: 'Button URL',
          type: 'string',
          description: 'Select a page or enter a relative path (e.g. /contact/) or full URL',
          components: {input: PageLinkInput},
        },
      ],
    }),

    // ─── SEO Settings (collapsed) ─────────────────────────────────────────────
    defineField({
      name: 'seoTitle',
      title: 'Title Tag',
      type: 'string',
      fieldset: 'seo',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().max(60).error('SEO title is required (keep under 60 characters)'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      fieldset: 'seo',
      components: {input: TokenTextInput},
      validation: (Rule) => Rule.required().max(160).error('Meta description is required (keep under 160 characters)'),
    }),
    defineField({
      name: 'ogImageOverride',
      title: 'OG Image (custom)',
      type: 'image',
      description: '1200×630px — overrides the auto-generated share image. Optional; when empty the site generates a branded one from the firm name, logo and brand colour.',
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
    }),
    defineField({
      name: 'noIndex',
      title: 'No Index',
      type: 'boolean',
      initialValue: false,
      fieldset: 'seo',
    }),
      // Ruled 2026-07-25: INDEPENDENT of No Index. Hiding a page does NOT
      // stop crawlers following its links — see BI-URL-Architecture.md,
      // Search visibility. Defaults OFF, nothing sets it on; it exists for
      // a client who one day needs it.
      defineField({
        name: 'noFollow',
        title: 'No Follow',
        type: 'boolean',
        initialValue: false,
        fieldset: 'seo',
        description: 'Stops search engines following links on this page. Independent of No Index — a hidden page still follows its links unless this is on. Leave off unless you have a specific reason.',
      }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL (override)',
      type: 'url',
      fieldset: 'seo',
    }),

    // ─── Name (always visible, 2-col grid) ───────────────────────────────────
    defineField({
      name: 'firstName',
      title: 'First Name',
      type: 'string',
      fieldset: 'name',
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
      fieldset: 'name',
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'middleName',
      title: 'Middle Name / Initial',
      type: 'string',
      fieldset: 'name',
    }),
    defineField({
      name: 'suffix',
      title: 'Suffix',
      type: 'string',
      description: 'e.g. J.D., LL.M.',
      fieldset: 'name',
    }),
    defineField({
      name: 'jobTitle',
      title: 'Job Title',
      type: 'string',
      description: 'e.g. Shareholder, Attorney',
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'photo',
      title: 'Headshot',
      type: 'image',
      description: 'Minimum 400×400px',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          description: 'Defaults to "[Name], [Job Title]" — editable here',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    }),

    // ─── Biography (always visible) ───────────────────────────────────────────
    defineField({
      name: 'fullBiography',
      title: 'Full Biography',
      type: 'blockContent',
    }),

    // ─── Practice Areas (always visible) ──────────────────────────────────────
    defineField({
      name: 'practiceAreas',
      title: 'Practice Areas',
      type: 'array',
      description: 'Displayed on profile. Link a page to enable navigation.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'label',
              title: 'Practice Area',
              type: 'string',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'page',
              title: 'Linked Page',
              type: 'reference',
              to: [{type: 'practiceArea'}],
              description: 'Optional — connects to a practice area page',
            },
          ],
          preview: {
            select: {title: 'label', subtitle: 'page.title'},
            prepare({title, subtitle}: {title?: string; subtitle?: string}) {
              return {
                title: title ?? 'Practice Area',
                subtitle: subtitle ? `→ ${subtitle}` : 'No page linked',
              }
            },
          },
        },
      ],
    }),

    // ─── Contact & Visibility (collapsed) ────────────────────────────────────
    defineField({
      name: 'email',
      title: 'Email Address',
      type: 'string',
      fieldset: 'contactVisibility',
    }),
    defineField({
      name: 'showEmail',
      title: 'Display Email Publicly',
      type: 'boolean',
      description: 'Show the email address on the profile page',
      initialValue: false,
      fieldset: 'contactVisibility',
    }),
    defineField({
      name: 'linkedIn',
      title: 'LinkedIn URL',
      type: 'url',
      fieldset: 'contactVisibility',
    }),
    defineField({
      name: 'location',
      title: 'Office Location',
      type: 'reference',
      to: [{type: 'locationPage'}],
      description: 'Which office this attorney works from',
      fieldset: 'contactVisibility',
    }),
    defineField({
      name: 'showLocations',
      title: 'Display Office Location Publicly',
      type: 'boolean',
      description: 'Show the office address and phone on the profile page',
      initialValue: false,
      fieldset: 'contactVisibility',
    }),
    defineField({
      name: 'videos',
      title: 'Videos',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'video'}]}],
      description: 'Attorney bio videos',
      fieldset: 'contactVisibility',
    }),

    // ─── Credentials (collapsed) ──────────────────────────────────────────────
    defineField({
      name: 'yearAdmittedToBar',
      title: 'Year Admitted to Bar',
      type: 'string',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'educationDegrees',
      title: 'Education & Degrees',
      type: 'blockContent',
      description: 'Institution, location, degree, year, honors per entry',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'barAdmissions',
      title: 'Bar Admissions',
      type: 'blockContent',
      description: 'Full list — courts and jurisdictions with year',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'stateBarAdmissions',
      title: 'State Bar Admissions',
      type: 'blockContent',
      description: 'States only — e.g. Minnesota, Wisconsin',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'certifiedLegalSpecialties',
      title: 'Certified Legal Specialties',
      type: 'blockContent',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'honors',
      title: 'Honors & Recognition',
      type: 'blockContent',
      description: 'Award name, years — e.g. Minnesota Super Lawyer 2001–2025',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'professionalAssociations',
      title: 'Professional Associations',
      type: 'blockContent',
      description: 'Organization name, role, years per entry',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'proBonoActivities',
      title: 'Pro-Bono Activities',
      type: 'blockContent',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'publications',
      title: 'Publications',
      type: 'blockContent',
      description: 'Title, publication name, date per entry',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'presentationsSeminars',
      title: 'Presentations & Seminars',
      type: 'blockContent',
      description: 'Title, organization, date per entry',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'representativeCases',
      title: 'Representative Cases',
      type: 'blockContent',
      description: 'Case name, court, date per entry',
      fieldset: 'credentials',
    }),
    defineField({
      name: 'pastPositions',
      title: 'Past Positions',
      type: 'blockContent',
      description: 'Title, organization, years per entry',
      fieldset: 'credentials',
    }),

    // ─── Directory Profiles (collapsed) ───────────────────────────────────────
    defineField({
      name: 'avvo',
      title: 'Avvo URL',
      type: 'url',
      description: 'Used in structured data sameAs — not displayed on page',
      fieldset: 'directoryProfiles',
    }),
    defineField({
      name: 'superLawyers',
      title: 'SuperLawyers URL',
      type: 'url',
      fieldset: 'directoryProfiles',
    }),
    defineField({
      name: 'findLaw',
      title: 'FindLaw URL',
      type: 'url',
      fieldset: 'directoryProfiles',
    }),
    defineField({
      name: 'martindale',
      title: 'Martindale URL',
      type: 'url',
      fieldset: 'directoryProfiles',
    }),
    defineField({
      name: 'lawyersCom',
      title: 'Lawyers.com URL',
      type: 'url',
      fieldset: 'directoryProfiles',
    }),
    defineField({
      name: 'justia',
      title: 'Justia URL',
      type: 'url',
      description: 'Used in structured data sameAs — not displayed on page',
      fieldset: 'directoryProfiles',
    }),

    // ─── CTA Settings (collapsed) ─────────────────────────────────────────────
    defineField({
      name: 'hideCtaForm',
      title: 'Hide Global CTA',
      type: 'boolean',
      description: 'Hide the global CTA section on this page',
      initialValue: false,
      fieldset: 'ctaSection',
    }),
    defineField({
      name: 'ctaFormOverride',
      title: 'Global CTA Override',
      type: 'ctaFormSection',
      fieldset: 'ctaSection',
    }),

  ],

  preview: {
    select: {
      title: 'title',
      subtitle: 'jobTitle',
      media: 'photo',
    },
    prepare({title, subtitle, media}) {
      return {
        title: title || 'Untitled Attorney',
        subtitle,
        media,
      }
    },
  },
})
