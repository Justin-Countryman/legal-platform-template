import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'

// ─── One field list, two registrations (Phase 10, 2026-09-14) ─────────────────
//
// `fields({inline})` is the single source of this section's fields; the
// DOCUMENT (`attorneySection`) is the shared section interior pages reference,
// the INLINE OBJECT (`attorneySectionInline`) is the page-owned copy on the
// homepage list. See practiceAreaNav.ts for the reasoning that applies to all
// seven sections. Callbacks read `parent`, never `document`.
//
// What differs inline: no `name`; the `practiceArea` mode and its
// `practiceAreaPage` reference are absent, because the homepage attorney beat
// shows the firm's people, never a practice-specific subset (the ruling
// recorded on the retired `attorneyHighlightBlock`), so `mode` defaults to
// `all` and the field that only that mode reads is not offered.

export function fields({inline}: {inline: boolean}) {
  return [
    ...(inline
      ? []
      : [
          defineField({
            name: 'name',
            title: 'Section Name',
            type: 'string',
            description: 'Internal label — e.g. "Home Page Attorneys" or "Family Law Attorneys"',
            validation: (Rule) => Rule.required().warning(),
          }),
          defineField({
            name: 'practiceAreaPage',
            title: 'Practice Area Page',
            type: 'reference',
            to: [{type: 'practiceArea'}],
            description: 'Attorneys with this practice area linked in their profile will appear',
            hidden: ({parent}) => (parent as {mode?: string} | undefined)?.mode !== 'practiceArea',
            validation: (Rule) =>
              Rule.custom((value, context) => {
                const parent = context.parent as {mode?: string} | undefined
                if (parent?.mode === 'practiceArea' && !value) {
                  return {message: 'Select a practice area page', level: 'warning' as const}
                }
                return true
              }).warning(),
          }),
        ]),
    defineField({
      name: 'mode',
      title: 'Attorney List Mode',
      type: 'string',
      options: {
        list: inline
          ? [
              {title: 'All Attorneys — show everyone at the firm', value: 'all'},
              {title: 'Manual — hand-pick specific attorneys', value: 'manual'},
            ]
          : [
              {title: 'Practice Area — shows attorneys associated with practice area', value: 'practiceArea'},
              {title: 'Manual — hand-pick specific attorneys', value: 'manual'},
              {title: 'All Attorneys — show everyone at the firm', value: 'all'},
            ],
        layout: 'radio',
      },
      initialValue: inline ? 'all' : 'practiceArea',
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'attorneys',
      title: 'Attorneys',
      type: 'array',
      description: 'Select the specific attorneys to display in this section',
      hidden: ({parent}) => (parent as {mode?: string} | undefined)?.mode !== 'manual',
      of: [{type: 'reference', to: [{type: 'attorneyPage'}]}],
      validation: (Rule) =>
        Rule.custom<unknown[]>((value, context) => {
          const parent = context.parent as {mode?: string} | undefined
          if (parent?.mode === 'manual' && (!value || value.length === 0)) {
            return {message: 'Select at least one attorney', level: 'warning' as const}
          }
          return true
        }).warning(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      components: {input: TokenStringInput},
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      components: {input: TokenStringInput},
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      components: {input: TokenTextInput},
    }),
    defineField({
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
    }),
    defineField({
      name: 'cardStyle',
      title: 'Card Style',
      description:
        'The look of each attorney card. Portrait, Avatar, Minimal, and Spotlight feature a larger photo — upload headshots for best results (a placeholder monogram shows when no photo is set; Avatar shows a clean initials circle).',
      type: 'string',
      options: {
        list: [
          {title: 'Classic — photo left, details right', value: 'classic'},
          {title: 'Portrait — photo on top, details below', value: 'portrait'},
          {title: 'Avatar — round headshot, centered', value: 'avatar'},
          {title: 'Minimal — frameless photo, lots of whitespace', value: 'minimal'},
          {title: 'Spotlight — photo with bio revealed on hover', value: 'spotlight'},
        ],
        layout: 'radio',
      },
      initialValue: 'classic',
      validation: (Rule) => Rule.required().warning(),
    }),
    ...appearanceFields({defaultSurface: 'light', offerPattern: inline}),
  ]
}

export const attorneySection = defineType({
  name: 'attorneySection',
  title: 'Attorney Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Attorney Section', subtitle}
    },
  },
})

export const attorneySectionInline = defineType({
  name: 'attorneySectionInline',
  title: 'Attorney Section',
  type: 'object',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', layout: 'layout', mode: 'mode'},
    prepare({heading, layout, mode}: {heading?: string; layout?: string; mode?: string}) {
      return {
        title: heading || 'Attorney Section',
        subtitle: `Attorney Section · ${layout ?? 'grid'} · ${mode === 'manual' ? 'selected attorneys' : 'all attorneys'}`,
      }
    },
  },
})
