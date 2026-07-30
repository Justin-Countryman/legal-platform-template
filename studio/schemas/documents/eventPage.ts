import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'
import {seoTitleValidation} from '../seoTitle'

// Layout — Event Detail
// Route: /events/[slug]

export const eventPage = defineType({
  name: 'eventPage',
  title: 'Event',
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
      name: 'eventDetails',
      title: 'Event Details',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'registration',
      title: 'Registration',
      options: {collapsible: true, collapsed: false},
    },
  ],
  fields: [
    // ─── Page Settings ────────────────────────────────────────────────────────
    {
      name: 'title',
      fieldset: 'pageSettings',
      title: 'Event Title',
      type: 'string',
      description: 'The event name — used as H1 and in cards',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'slug',
      fieldset: 'pageSettings',
      title: 'Slug',
      type: 'slug',
      description: 'Click Generate after setting Event Title — auto-prefixed with events/ (the stored slug is the full URL path, e.g. events/open-house)',
      options: {
        source: (doc) => {
          const title = ((doc as {title?: string}).title) || ''
          if (!title) return ''
          const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          return `events/${slug}`
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
    // ─── Event Details ────────────────────────────────────────────────────────
    {
      name: 'eventDate',
      fieldset: 'eventDetails',
      title: 'Event Date & Start Time',
      type: 'datetime',
      description: 'Date and start time of the event',
      options: {dateFormat: 'MMMM D, YYYY', timeFormat: 'h:mm A'},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'eventEndDate',
      fieldset: 'eventDetails',
      title: 'Event End Date & Time',
      type: 'datetime',
      description: 'Optional — leave blank if end time is unknown',
      options: {dateFormat: 'MMMM D, YYYY', timeFormat: 'h:mm A'},
    },
    {
      name: 'eventType',
      fieldset: 'eventDetails',
      title: 'Event Type',
      type: 'string',
      options: {
        list: [
          {title: 'Seminar', value: 'seminar'},
          {title: 'Workshop', value: 'workshop'},
          {title: 'Webinar', value: 'webinar'},
          {title: 'Community Event', value: 'community-event'},
        ],
        layout: 'radio',
      },
    },
    {
      name: 'category',
      fieldset: 'eventDetails',
      title: 'Category',
      type: 'reference',
      to: [{type: 'eventCategory'}],
      description: 'Type to search or create a new event category',
    },
    {
      name: 'locationType',
      fieldset: 'eventDetails',
      title: 'Location Type',
      type: 'string',
      options: {
        list: [
          {title: 'In-Person', value: 'in-person'},
          {title: 'Virtual', value: 'virtual'},
          {title: 'Hybrid', value: 'hybrid'},
        ],
        layout: 'radio',
      },
    },
    {
      name: 'locationAddress',
      fieldset: 'eventDetails',
      title: 'Location Address',
      type: 'text',
      rows: 3,
      description: 'Full address — shown for in-person and hybrid events. Use the shortcode picker to insert a location address.',
      hidden: ({document}) => !['in-person', 'hybrid'].includes((document as {locationType?: string})?.locationType ?? ''),
      components: {input: TokenTextInput},
    },
    {
      name: 'virtualLink',
      fieldset: 'eventDetails',
      title: 'Virtual Event Link',
      type: 'url',
      description: 'Zoom/Teams/etc. link — shown for virtual and hybrid events',
      hidden: ({document}) => !['virtual', 'hybrid'].includes((document as {locationType?: string})?.locationType ?? ''),
    },
    {
      name: 'attorneys',
      fieldset: 'eventDetails',
      title: 'Presenting Attorneys',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'attorneyPage'}]}],
      description: 'Attorneys presenting or hosting this event',
    },
    // ─── Registration ─────────────────────────────────────────────────────────
    {
      name: 'registrationUrl',
      fieldset: 'registration',
      title: 'Registration URL',
      type: 'url',
      description: 'External registration link — only used when no Registration Form is selected',
      validation: (Rule) =>
        Rule.custom((url, ctx) => {
          const doc = ctx.document as any
          if (url && doc?.registrationForm) {
            return 'Registration Form is set — this URL will be ignored. Remove the form to use this link.'
          }
          return true
        }),
    },
    {
      name: 'registrationCta',
      fieldset: 'registration',
      title: 'Registration Button Label',
      type: 'string',
      initialValue: 'Register Now',
      description: 'Label for the registration button',
    },
    {
      name: 'registrationForm',
      fieldset: 'registration',
      title: 'Registration Form',
      type: 'reference',
      to: [{type: 'siteForm'}],
      description: 'Select a form from the library — takes priority over Registration URL',
    },
    // ─── Body Content ─────────────────────────────────────────────────────────
    {
      name: 'body',
      title: 'Body Content',
      type: 'blockContent',
    },
    // ─── CTA Section ──────────────────────────────────────────────────────────
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
    select: {title: 'title', subtitle: 'slug.current', eventDate: 'eventDate'},
    prepare({title, subtitle, eventDate}) {
      const dateStr = eventDate
        ? new Date(eventDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})
        : ''
      return {
        title: title ?? 'Event',
        subtitle: dateStr ? `${dateStr} · /${subtitle}` : (subtitle ? `/${subtitle}` : ''),
      }
    },
  },
})
