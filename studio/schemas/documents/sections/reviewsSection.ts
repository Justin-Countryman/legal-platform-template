import {defineType, defineField} from 'sanity'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

// ─── Reviews section: one field list, two registrations ───────────────────────
//
// `fields({inline})` is the single source of this section's fields, as in
// practiceAreaNav.ts (Phase 10's mechanism, [R-443]): the DOCUMENT
// (`reviewsSection`) is the shared section interior pages reference; the INLINE
// OBJECT (`reviewsSectionInline`, 2026-09-14, Justin) is the page-owned copy on
// the homepage list, which replaces the homepage's own reviews embed field (that
// field never rendered).
//
// A reviews band is a third-party widget with a heading above it: tagline,
// heading, description, up to two buttons, and a layout. Absent `layout` and
// `buttons` render exactly as the section always has. No Appearance fieldset
// yet: the section hardcodes its band, and moving it onto SectionShell is
// Phase 13's (requirement 5), for this section and the four others that do.

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
            description: 'Internal label, e.g. "Google Reviews"',
            validation: (Rule) => Rule.required().warning(),
          }),
        ]),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      description:
        'Stacked (the default): the heading, description and buttons centred above the reviews. Split: they sit to the left of the reviews from tablet width up; on mobile they stack above.',
      options: {
        list: [
          {title: 'Stacked: heading above the reviews', value: 'stacked'},
          {title: 'Split: heading on the left, reviews on the right', value: 'split'},
        ],
        layout: 'radio',
      },
    }),
    defineField({name: 'tagline', title: 'Tagline', type: 'string', components: {input: TokenStringInput}}),
    defineField({name: 'heading', title: 'Heading', type: 'string', components: {input: TokenStringInput}}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 2, components: {input: TokenTextInput}}),
    defineField({
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      description: 'Up to two, e.g. "Read all reviews" or "Leave a review".',
      of: [{type: 'ctaButton'}],
      validation: (Rule) => Rule.max(2).warning('Two buttons at most; the rest do not render.'),
    }),
    defineField({
      name: 'reviewsEmbed',
      title: 'Reviews Embed Code',
      type: 'text',
      rows: 5,
      description:
        'Paste the embed code from your reviews provider, for example an Elfsight Google Reviews widget. The section does not appear without it.',
      validation: (Rule) => Rule.required().warning('Reviews embed code is required'),
    }),
    ...appearanceFields({offerPattern: inline}),
  ]
}

export const reviewsSection = defineType({
  name: 'reviewsSection',
  title: 'Reviews Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name'},
    prepare({title}) {
      return {title: title ?? 'Reviews Section'}
    },
  },
})

export const reviewsSectionInline = defineType({
  name: 'reviewsSectionInline',
  title: 'Reviews',
  type: 'object',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', layout: 'layout'},
    prepare({heading, layout}: {heading?: string; layout?: string}) {
      return {title: heading || 'Reviews', subtitle: `Reviews · ${layout ?? 'stacked'}`}
    },
  },
})
