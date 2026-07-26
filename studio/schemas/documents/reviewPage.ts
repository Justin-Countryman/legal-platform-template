import {defineType} from 'sanity'

// Existing Sanity fields: title, slug, h1, blurb, reviewLinks, feedbackForm, noIndex
// Auto-created by Site Prep Tool — one per active location in CS-CLIENT-CONFIG.json
// Always noindex

export const reviewPage = defineType({
  name: 'reviewPage',
  title: 'Review Page',
  type: 'document',
  fieldsets: [
    {name: 'identity', title: 'Identity', options: {collapsible: true, collapsed: false}},
    {name: 'seo', title: 'SEO', options: {collapsible: true, collapsed: true}},
    {name: 'content', title: 'Content', options: {collapsible: true, collapsed: false}},
  ],
  fields: [
    // ─── Identity ─────────────────────────────────────────────────────────────
    {
      name: 'title',
      title: 'Page Title',
      type: 'string',
      fieldset: 'identity',
      description: 'Short internal title used to generate the slug — e.g. "Review [City]"',
      validation: (Rule) => Rule.required().warning(),
    },
    // ─── SEO ──────────────────────────────────────────────────────────────────
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      fieldset: 'seo',
      description: 'Click Generate after setting Page Title',
      options: {source: 'title'},
      validation: (Rule) => Rule.required().error(),
    },
    // ─── Content ──────────────────────────────────────────────────────────────
    {
      name: 'h1',
      title: 'H1',
      type: 'string',
      fieldset: 'content',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'blurb',
      title: 'Blurb',
      type: 'blockContent',
      fieldset: 'content',
      description: 'Optional intro text above review links',
    },
    {
      name: 'reviewLinks',
      title: 'Review Links',
      type: 'array',
      fieldset: 'content',
      description: 'Add a link for each platform where clients can leave a review — e.g. Google, Avvo, Facebook',
      validation: (Rule) => Rule.min(1).warning('At least one review link is required'),
      of: [
        {
          type: 'object',
          name: 'reviewLink',
          fields: [
            {
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: {
                list: [
                  {title: 'Google', value: 'google'},
                  {title: 'Facebook', value: 'facebook'},
                  {title: 'FindLaw', value: 'findlaw'},
                  {title: 'Martindale', value: 'martindale'},
                  {title: 'Lawyers.com', value: 'lawyersCom'},
                  {title: 'Avvo', value: 'avvo'},
                  {title: 'Yelp', value: 'yelp'},
                  {title: 'Other', value: 'other'},
                ],
              },
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'url',
              title: 'URL',
              type: 'url',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'label',
              title: 'Button Label',
              type: 'string',
              description: 'e.g. "Review Us on Google"',
            },
          ],
          preview: {
            select: {title: 'platform', subtitle: 'url'},
          },
        },
      ],
    },
    {
      name: 'feedbackForm',
      title: 'Feedback Form',
      type: 'reference',
      to: [{type: 'siteForm'}],
      fieldset: 'content',
      description: 'Select the form to show in the private feedback modal',
    },
    {
      name: 'noIndex',
      title: 'No Index',
      type: 'boolean',
      fieldset: 'seo',
      description: 'Always noindex — review pages are never indexed',
      initialValue: true,
      readOnly: true,
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
  ],

  preview: {
    select: {subtitle: 'slug.current'},
    prepare({subtitle}) {
      const derived = subtitle ? subtitle.replace(/\//g, ' / ').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : null
      return {title: derived ?? 'Review Page', subtitle: subtitle ? `/${subtitle}` : ''}
    },
  },
})
