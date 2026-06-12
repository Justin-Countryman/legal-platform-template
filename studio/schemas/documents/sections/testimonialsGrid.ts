import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'

export const testimonialsGrid = defineType({
  name: 'testimonialsGrid',
  title: 'Grid Testimonials Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Home Page Testimonials"',
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
      title: 'Heading',
      type: 'string',
      components: {input: TokenStringInput},
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      components: {input: TokenTextInput},
    },
    {
      name: 'testimonials',
      title: 'Testimonials',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'testimonial'}]}],
      validation: (Rule) => Rule.min(1).warning('At least one testimonial is required'),
    },
    ...appearanceFields({defaultSurface: 'tint'}),
  ],
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Grid Testimonials Section', subtitle}
    },
  },
})
