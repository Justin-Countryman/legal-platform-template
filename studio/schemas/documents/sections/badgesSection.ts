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
      validation: (Rule) => Rule.min(1).warning('At least one badge is required'),
      of: [
        {
          type: 'object',
          name: 'badge',
          fields: [
            {
              name: 'image',
              title: 'Badge Image',
              type: 'image',
              options: {hotspot: true},
              validation: (Rule) => Rule.required().warning(),
              fields: [
                {
                  name: 'alt',
                  title: 'Alt Text',
                  type: 'string',
                  validation: (Rule) => Rule.required().warning('Alt text is required for all badge images'),
                },
              ],
            },
          ],
          preview: {
            select: {title: 'image.alt', media: 'image'},
            prepare({title, media}: {title?: string; media?: any}) {
              return {title: title ?? 'Badge', media}
            },
          },
        },
      ],
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
