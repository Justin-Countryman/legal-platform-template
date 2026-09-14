import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'

// ─── One field list, two registrations (Phase 10, 2026-09-14) ─────────────────
//
// `fields({inline})` is the single source of this section's fields; the
// DOCUMENT (`featuredTestimonial`) is the shared section interior pages
// reference, the INLINE OBJECT (`featuredTestimonialInline`) is the page-owned
// copy on the homepage list. See practiceAreaNav.ts for the reasoning that
// applies to all seven sections.

export function fields({inline}: {inline: boolean}) {
  return [
    ...(inline
      ? []
      : [
          defineField({
            name: 'name',
            title: 'Section Name',
            type: 'string',
            description: 'Internal label — e.g. "Family Law Featured Testimonial"',
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
      title: 'H2 Heading',
      type: 'string',
      description: 'The section heading shown above the testimonial.',
      initialValue: 'Client Testimonial',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'testimonial',
      title: 'Testimonial',
      type: 'reference',
      to: [{type: 'testimonial'}],
      validation: (Rule) => Rule.required().warning(),
    }),
    ...appearanceFields({defaultSurface: 'tint'}),
  ]
}

export const featuredTestimonial = defineType({
  name: 'featuredTestimonial',
  title: 'Featured Testimonial',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name'},
    prepare({title}) {
      return {title: title ?? 'Featured Testimonial'}
    },
  },
})

export const featuredTestimonialInline = defineType({
  name: 'featuredTestimonialInline',
  title: 'Featured Testimonial',
  type: 'object',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', quote: 'testimonial.quote'},
    prepare({heading, quote}: {heading?: string; quote?: string}) {
      return {title: heading || 'Featured Testimonial', subtitle: quote ? `Featured Testimonial · “${quote.slice(0, 60)}”` : 'Featured Testimonial'}
    },
  },
})
