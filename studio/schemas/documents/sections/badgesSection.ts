import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

export const badgesSection = defineType({
  name: 'badgesSection',
  title: 'Badges Section',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "2024 Awards & Recognition"',
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
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      of: [{type: 'ctaButton'}],
    },
    {
      name: 'badges',
      title: 'Badges',
      type: 'array',
      description:
        'Select from the badges you have built under Individual Items. Build each badge once and reuse it across sections — there is no inline badge here by design.',
      validation: (Rule) => Rule.min(1).warning('At least one badge is required'),
      of: [{type: 'reference', to: [{type: 'badge'}]}],
    },
    {
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Inline — heading left + badges right', value: 'inline'},
          {title: 'Centered Grid — heading centered + badge grid below', value: 'centeredGrid'},
          {title: 'Split — heading left + badge grid right', value: 'split'},
          {title: 'Scrolling Marquee', value: 'scrolling'},
        ],
        layout: 'radio',
      },
      initialValue: 'centeredGrid',
      validation: (Rule) => Rule.required().warning(),
    },
  ],
  preview: {
    select: {title: 'name'},
    prepare({title}) {
      return {title: title ?? 'Badges Section'}
    },
  },
})
