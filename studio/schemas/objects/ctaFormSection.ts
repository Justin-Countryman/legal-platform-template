import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'

export const ctaFormSection = defineType({
  name: 'ctaFormSection',
  title: 'CTA Content Override',
  type: 'object',
  description: 'Override the Global CTA heading/text for this page only — leave blank to use Global CTA defaults. Form is always pulled from Site Settings.',
  options: {collapsible: true, collapsed: true},
  fields: [
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
      components: {input: TokenStringInput},
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
      description: 'Up to two CTAs override the Global CTA buttons for this page only — leave empty to use Global CTA defaults.',
      validation: (Rule) => Rule.max(2).warning('Limit to 2 buttons for layout consistency'),
    },
  ],
  preview: {
    select: {title: 'heading'},
    prepare({title}) {
      return {title: title ?? 'CTA Content Override'}
    },
  },
})
