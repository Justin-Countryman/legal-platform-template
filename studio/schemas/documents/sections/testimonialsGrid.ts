import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'

// ─── One field list, two registrations (Phase 10, 2026-09-14) ─────────────────
//
// `fields({inline})` is the single source of this section's fields; the
// DOCUMENT (`testimonialsGrid`) is the shared section interior pages reference,
// the INLINE OBJECT (`testimonialsGridInline`) is the page-owned copy on the
// homepage list. See practiceAreaNav.ts for the reasoning that applies to all
// seven sections.

export function fields({inline}: {inline: boolean}) {
  return [
    ...(inline
      ? []
      : [
          defineField({
            name: 'name',
            title: 'Section Name',
            type: 'string',
            description: 'Internal label — e.g. "Home Page Testimonials"',
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
      name: 'testimonials',
      title: 'Testimonials',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'testimonial'}]}],
      validation: (Rule) => Rule.min(1).warning('At least one testimonial is required'),
    }),
    ...appearanceFields({defaultSurface: 'tint', offerPattern: inline}),
  ]
}

export const testimonialsGrid = defineType({
  name: 'testimonialsGrid',
  title: 'Grid Testimonials Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Grid Testimonials Section', subtitle}
    },
  },
})

export const testimonialsGridInline = defineType({
  name: 'testimonialsGridInline',
  title: 'Grid Testimonials Section',
  type: 'object',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', testimonials: 'testimonials'},
    prepare({heading, testimonials}: {heading?: string; testimonials?: unknown[]}) {
      const count = testimonials?.length ?? 0
      return {
        title: heading || 'Grid Testimonials Section',
        subtitle: `Grid Testimonials Section · ${count} testimonial${count === 1 ? '' : 's'}`,
      }
    },
  },
})
