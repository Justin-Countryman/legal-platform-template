import {defineType} from 'sanity'

export const eventCategory = defineType({
  name: 'eventCategory',
  title: 'Event Category',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'e.g. "Estate Planning", "Family Law", "Firm News"',
      validation: (Rule) => Rule.required().warning(),
    },
  ],

  preview: {
    select: {title: 'title'},
    prepare({title}) {
      return {title: title ?? 'Event Category'}
    },
  },
})
