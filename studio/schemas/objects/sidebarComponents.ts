import {defineType} from 'sanity'

export const sidebarTableOfContents = defineType({
  name: 'sidebarTableOfContents',
  title: 'Table of Contents',
  type: 'object',
  description: 'Auto-generated from H2/H3 headings in the page body content',
  fields: [
    {
      name: 'enabled',
      title: 'Enabled',
      type: 'boolean',
      initialValue: true,
    },
  ],
  preview: {
    prepare() {
      return {title: 'Table of Contents'}
    },
  },
})
