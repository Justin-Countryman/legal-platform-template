import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

export const reviewsSection = defineType({
  name: 'reviewsSection',
  title: 'Reviews Section',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Google Reviews"',
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
      name: 'reviewsEmbed',
      title: 'Reviews Embed Code',
      type: 'text',
      rows: 5,
      description: 'Elfsight Google Reviews widget embed code',
      validation: (Rule) => Rule.required().warning('Reviews embed code is required'),
    },
  ],
  preview: {
    select: {title: 'name'},
    prepare({title}) {
      return {title: title ?? 'Reviews Section'}
    },
  },
})
