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
    {
      name: 'thumbnail',
      title: 'Custom Thumbnail',
      type: 'image',
      description:
        'Optional. A branded poster for the Video Library grid. If left blank, the video\'s YouTube/Vimeo thumbnail is used automatically.',
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
    {
      name: 'duration',
      title: 'Duration',
      type: 'string',
      description: 'Optional. Display length like "3:45" or "1:02:03" — shown on the library card and used for video SEO.',
      validation: (Rule) =>
        Rule.regex(/^\d{1,2}(:\d{2}){1,2}$/, {name: 'duration'}).warning(
          'Use m:ss or h:mm:ss — e.g. 3:45 or 1:02:03',
        ),
    },
  ],

  preview: {
    select: {title: 'title', subtitle: 'videoType', media: 'thumbnail'},
    prepare({title, subtitle, media}) {
      return {title: title ?? 'Video', subtitle: subtitle ?? '', media}
    },
  },
})
