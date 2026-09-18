import {defineType, defineField} from 'sanity'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

// ─── One field list, two registrations (Phase 10, 2026-09-14) ─────────────────
//
// `fields({inline})` is the single source of this section's fields; the
// DOCUMENT (`badgesSection`) is the shared section interior pages reference,
// the INLINE OBJECT (`badgesSectionInline`) is the page-owned copy on the
// homepage list. See practiceAreaNav.ts for the reasoning that applies to all
// seven sections.

// ─── The Appearance fieldset (Phase 13) ──────────────────────────────────────
// `appearanceFields()`: this section renders through `SectionShell` from Phase 13,
// so the operator can place it on a surface and give it a frame. No appearance
// field is seeded on any section since Phase 16A (item 308): the default
// surface lives in CODE, per layout.

export function fields({inline}: {inline: boolean}) {
  return [
    ...(inline
      ? []
      : [
          defineField({
            name: 'name',
            title: 'Section Name',
            type: 'string',
            description: 'Internal label — e.g. "2024 Awards & Recognition"',
            validation: (Rule) => Rule.required().warning(),
          }),
        ]),
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
      rows: 2,
      components: {input: TokenTextInput},
    }),
    defineField({
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      of: [{type: 'ctaButton'}],
    }),
    defineField({
      name: 'badges',
      title: 'Badges',
      type: 'array',
      description:
        'Select from the badges you have built under Individual Items. Build each badge once and reuse it across sections — there is no inline badge here by design.',
      validation: (Rule) => Rule.min(1).warning('At least one badge is required'),
      of: [{type: 'reference', to: [{type: 'badge'}]}],
    }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Inline — heading left + badges right', value: 'inline'},
          {title: 'Centered Grid — heading centered + badge grid below', value: 'centeredGrid'},
          {title: 'Split — heading left + badge grid right', value: 'split'},
          {title: 'Scrolling Marquee', value: 'scrolling'},
        ],
        layout: 'radio',
      },
      initialValue: 'centeredGrid',
      validation: (Rule) => Rule.required().warning(),
    }),
    ...appearanceFields({offerPattern: inline}),
  ]
}

export const badgesSection = defineType({
  name: 'badgesSection',
  title: 'Badges Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name'},
    prepare({title}) {
      return {title: title ?? 'Badges Section'}
    },
  },
})

export const badgesSectionInline = defineType({
  name: 'badgesSectionInline',
  title: 'Badges Section',
  type: 'object',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', layout: 'layout', badges: 'badges'},
    prepare({heading, layout, badges}: {heading?: string; layout?: string; badges?: unknown[]}) {
      const count = badges?.length ?? 0
      return {
        title: heading || 'Badges Section',
        subtitle: `Badges Section · ${layout ?? 'centeredGrid'} · ${count} badge${count === 1 ? '' : 's'}`,
      }
    },
  },
})
