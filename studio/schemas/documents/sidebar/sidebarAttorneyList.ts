import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'

export const sidebarAttorneyList = defineType({
  name: 'sidebarAttorneyList',
  title: 'Sidebar Attorney List',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Family Law Attorney List"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'header',
      title: 'Header',
      type: 'string',
      components: {input: TokenStringInput},
    },
    {
      name: 'mode',
      title: 'Attorney List Mode',
      type: 'string',
      options: {
        list: [
          {title: 'Practice Area — shows attorneys with this page linked in their practice areas list', value: 'practiceArea'},
          {title: 'Manual — hand-pick specific attorneys', value: 'manual'},
          {title: 'All Attorneys — show everyone at the firm', value: 'all'},
        ],
        layout: 'radio',
      },
      initialValue: 'practiceArea',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'practiceAreaPage',
      title: 'Practice Area Page',
      type: 'reference',
      to: [{type: 'practiceArea'}],
      description: 'Attorneys with this page linked in their practice areas list will appear',
      hidden: ({document}) => document?.mode !== 'practiceArea',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.mode === 'practiceArea' && !value) {
            return {message: 'Select a practice area page', level: 'warning' as const}
          }
          return true
        }),
    },
    {
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'List — arrow + name', value: 'list'},
          {title: 'Avatar — circular photo + name', value: 'avatar'},
        ],
        layout: 'radio',
      },
      initialValue: 'list',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'attorneys',
      title: 'Attorneys',
      type: 'array',
      description: 'Select the specific attorneys to display in this sidebar',
      hidden: ({document}) => document?.mode !== 'manual',
      of: [{type: 'reference', to: [{type: 'attorneyPage'}]}],
      validation: (Rule) =>
        Rule.custom<unknown[]>((value, context) => {
          if (context.document?.mode === 'manual' && (!value || value.length === 0)) {
            return {message: 'Select at least one attorney', level: 'warning' as const}
          }
          return true
        }),
    },
  ],
  preview: {
    select: {title: 'name', subtitle: 'mode'},
    prepare({title, subtitle}) {
      const labels: Record<string, string> = {
        practiceArea: 'Practice Area',
        manual: 'Manual',
        all: 'All Attorneys',
      }
      const modeLabel = subtitle ? labels[subtitle] : ''
      return {
        title: title ?? 'Sidebar Attorney List',
        subtitle: `Sidebar Attorney List${modeLabel ? ` — ${modeLabel}` : ''}`,
      }
    },
  },
})
