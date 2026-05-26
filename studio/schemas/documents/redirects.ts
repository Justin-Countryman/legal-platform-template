import {defineType} from 'sanity'

// Singleton — manages all site redirects (migration + ongoing)
// Site builder reads this array and generates 301 redirect rules at build time

export const redirects = defineType({
  name: 'redirects',
  title: 'Redirects',
  type: 'document',
  fields: [
    {
      name: 'items',
      title: 'Redirect Rules',
      type: 'array',
      description: 'Add a row for each redirect. From = old path, To = new path.',
      of: [
        {
          type: 'object',
          name: 'redirect',
          fields: [
            {
              name: 'from',
              title: 'From (old path)',
              type: 'string',
              description: 'e.g. /old-page/',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'to',
              title: 'To (new path)',
              type: 'string',
              description: 'e.g. /new-page/',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'type',
              title: 'Redirect Type',
              type: 'string',
              options: {
                list: [
                  {title: '301 — Permanent', value: '301'},
                  {title: '302 — Temporary', value: '302'},
                ],
                layout: 'radio',
              },
              initialValue: '301',
              validation: (Rule) => Rule.required().warning(),
            },
          ],
          preview: {
            select: {from: 'from', to: 'to'},
            prepare({from, to}) {
              return {title: from ?? '—', subtitle: `→ ${to ?? '—'}`}
            },
          },
        },
      ],
    },
  ],

  preview: {
    prepare() {
      return {title: 'Redirects'}
    },
  },
})
