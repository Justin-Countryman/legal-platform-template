import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

export const videoSection = defineType({
  name: 'videoSection',
  title: 'Video Section',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Firm Overview Video" or "Attorney Videos"',
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
      name: 'layout',
      title: 'Layout',
      type: 'string',
      description:
        'Centered places the heading above the video (like other sections). Split puts the heading text in a left column with the video beside it on the right (best for a single video).',
      options: {
        list: [
          {title: 'Centered — heading above the video', value: 'centered'},
          {title: 'Split — heading left, video right', value: 'split'},
        ],
        layout: 'radio',
      },
      initialValue: 'centered',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'videos',
      title: 'Videos',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'video'}]}],
      validation: (Rule) => Rule.required().min(1).warning('At least one video is required'),
    },
  ],

  preview: {
    select: {title: 'name'},
    prepare({title}) {
      return {title: title ?? 'Video Section'}
    },
  },
})
