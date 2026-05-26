import {defineType} from 'sanity'

// Standalone Sanity document — reusable across any page
// Referenced by testimonialsGrid and featuredTestimonial sections

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    {
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 4,
      description: 'The testimonial text — describe the emotional journey, not just the legal outcome',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'name',
      title: 'Client Name',
      type: 'string',
      description: 'Full first name and last initial minimum — full name preferred',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'caseType',
      title: 'Case Type / Context',
      type: 'string',
      description: 'e.g. "Personal Injury Client" or "Family Law — Divorce" (optional)',
    },
    {
      name: 'numberOfStars',
      title: 'Star Rating',
      type: 'number',
      description: '1–5 — used by featuredTestimonial component',
      options: {
        list: [
          {title: '⭐', value: 1},
          {title: '⭐⭐', value: 2},
          {title: '⭐⭐⭐', value: 3},
          {title: '⭐⭐⭐⭐', value: 4},
          {title: '⭐⭐⭐⭐⭐', value: 5},
        ],
      },
      initialValue: 5,
    },
    {
      name: 'avatar',
      title: 'Client Photo',
      type: 'image',
      description: 'Optional — real photos significantly increase credibility',
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
  ],

  preview: {
    select: {title: 'name', subtitle: 'caseType'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Testimonial', subtitle}
    },
  },
})
