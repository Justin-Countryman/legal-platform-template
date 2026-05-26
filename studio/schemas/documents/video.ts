import {defineType} from 'sanity'

export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Internal label and display title — e.g. "Jane Doe — Attorney Bio"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'youTubeUrl',
      title: 'Video URL',
      type: 'url',
      description: 'YouTube or Vimeo URL — e.g. https://www.youtube.com/watch?v=XXXXX or https://vimeo.com/XXXXX',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Optional caption or short description — displayed below player if provided',
    },
    {
      name: 'videoType',
      title: 'Video Type',
      type: 'string',
      options: {
        list: [
          {title: 'Firm Overview', value: 'Firm Overview'},
          {title: 'Attorney Bio', value: 'Attorney Bio'},
          {title: 'Practice Area', value: 'Practice Area'},
          {title: 'Testimonial', value: 'Testimonial'},
          {title: 'Other', value: 'Other'},
        ],
        layout: 'radio',
      },
    },
  ],

  preview: {
    select: {title: 'title', subtitle: 'videoType'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Video', subtitle: subtitle ?? ''}
    },
  },
})
