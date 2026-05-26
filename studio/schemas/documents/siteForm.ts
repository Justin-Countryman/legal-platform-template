import {defineType} from 'sanity'

// Global form registry — all Fillout (or other provider) embed codes live here.
// Site Settings designates which form is the Simple Form (CTAs, sidebar)
// and which is the Full Form (contact page).
// Campaign forms are any additional entries — selectable on landing pages.

export const siteForm = defineType({
  name: 'siteForm',
  title: 'Form',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Form Name',
      type: 'string',
      description: 'Internal label — e.g. "Simple Form", "Full Contact Form", "PPC - Family Law"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'string',
      description: 'Optional notes — e.g. "Short 3-field form for sidebars and CTAs"',
    },
    {
      name: 'formEmbed',
      title: 'Embed Code',
      type: 'text',
      rows: 5,
      description: 'Paste the Fillout (or other provider) embed snippet here',
      validation: (Rule) => Rule.required().warning(),
    },
  ],

  preview: {
    select: {title: 'name', subtitle: 'description'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Form', subtitle}
    },
  },
})
