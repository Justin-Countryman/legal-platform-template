import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

export const sidebarFormEmbed = defineType({
  name: 'sidebarFormEmbed',
  title: 'Sidebar Form',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Contact Form Sidebar"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'header',
      title: 'Header',
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
      name: 'form',
      title: 'Form',
      type: 'reference',
      to: [{type: 'siteForm'}],
      description: 'Select the form to embed in this sidebar widget',
      validation: (Rule) => Rule.required().warning('Select a form to display'),
    },
  ],
  preview: {
    select: {title: 'name', subtitle: 'header'},
    prepare({title, subtitle}) {
      return {
        title: title ?? 'Sidebar Form',
        subtitle: `Sidebar Form${subtitle ? ` — ${subtitle}` : ''}`,
      }
    },
  },
})
