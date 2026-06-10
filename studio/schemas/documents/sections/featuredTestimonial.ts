import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'

export const featuredTestimonial = defineType({
  name: 'featuredTestimonial',
  title: 'Featured Testimonial',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Family Law Featured Testimonial"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      components: {input: TokenStringInput},
    },
    {
      name: 'heading',
      title: 'H2 Heading',
      type: 'string',
      description: 'The section heading shown above the testimonial.',
      initialValue: 'Client Testimonial',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'testimonial',
      title: 'Testimonial',
      type: 'reference',
      to: [{type: 'testimonial'}],
      validation: (Rule) => Rule.required().warning(),
    },
  ],
  preview: {
    select: {title: 'name'},
    prepare({title}) {
      return {title: title ?? 'Featured Testimonial'}
    },
  },
})
