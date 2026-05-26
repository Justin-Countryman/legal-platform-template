import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'

export const internalHero = defineType({
  name: 'internalHero',
  title: 'Internal Hero',
  type: 'object',
  options: {collapsible: true, collapsed: true},
  fields: [
    {
      name: 'heading',
      title: 'Heading (H1)',
      type: 'string',
      description: 'Required when hero is used — this becomes the H1',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      components: {input: TokenTextInput},
    },
    {
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      of: [{type: 'ctaButton'}],
    },
    {
      name: 'backgroundImage',
      title: 'Background Image',
      type: 'image',
      description: 'Leave empty for plain background. Image will use a dark overlay.',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          validation: (Rule) => Rule.required().error('Alt text is required for the hero background image'),
        },
      ],
    },
  ],
  preview: {
    select: {title: 'heading'},
    prepare({title}) {
      return {title: title ?? 'Internal Hero'}
    },
  },
})
