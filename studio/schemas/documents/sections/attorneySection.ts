import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

export const attorneySection = defineType({
  name: 'attorneySection',
  title: 'Attorney Section',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Home Page Attorneys" or "Family Law Attorneys"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'practiceAreaPage',
      title: 'Practice Area Page',
      type: 'reference',
      to: [{type: 'practiceArea'}],
      description: 'Attorneys with this practice area linked in their profile will appear',
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
      name: 'mode',
      title: 'Attorney List Mode',
      type: 'string',
      options: {
        list: [
          {title: 'Practice Area — shows attorneys associated with practice area', value: 'practiceArea'},
          {title: 'Manual — hand-pick specific attorneys', value: 'manual'},
          {title: 'All Attorneys — show everyone at the firm', value: 'all'},
        ],
        layout: 'radio',
      },
      initialValue: 'practiceArea',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'attorneys',
      title: 'Attorneys',
      type: 'array',
      description: 'Select the specific attorneys to display in this section',
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
      rows: 3,
      components: {input: TokenTextInput},
    },
    {
      name: 'layout',
      title: 'Layout',
      description: 'How the cards are arranged. Grid stacks them; Slider puts them in a swipeable carousel.',
      type: 'string',
      options: {
        list: [
          {title: 'Grid', value: 'grid'},
          {title: 'Slider', value: 'slider'},
        ],
        layout: 'radio',
      },
      initialValue: 'grid',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'cardStyle',
      title: 'Card Style',
      description:
        'The look of each attorney card. Portrait, Editorial, Minimal, and Spotlight feature a larger photo — upload headshots for best results (a placeholder monogram shows when no photo is set).',
      type: 'string',
      options: {
        list: [
          {title: 'Classic — photo left, details right', value: 'classic'},
          {title: 'Portrait — photo on top, details below', value: 'portrait'},
          {title: 'Editorial — name over a full-bleed photo', value: 'editorial'},
          {title: 'Minimal — frameless photo, lots of whitespace', value: 'minimal'},
          {title: 'Spotlight — photo with bio revealed on hover', value: 'spotlight'},
        ],
        layout: 'radio',
      },
      initialValue: 'classic',
      validation: (Rule) => Rule.required().warning(),
    },
  ],
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Attorney Section', subtitle}
    },
  },
})
