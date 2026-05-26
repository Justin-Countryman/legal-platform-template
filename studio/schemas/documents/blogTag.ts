import {defineType} from 'sanity'

export const blogTag = defineType({
  name: 'blogTag',
  title: 'Blog Tag',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Display label — e.g. "FAQ", "Infographic", "Firm News", "Video"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      description: 'Used by the front end to filter posts — e.g. "faq", "infographic"',
      validation: (Rule) => Rule.required().error(),
    },
  ],

  preview: {
    select: {title: 'title', subtitle: 'slug.current'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Blog Tag', subtitle: subtitle ? `/${subtitle}` : ''}
    },
  },
})
