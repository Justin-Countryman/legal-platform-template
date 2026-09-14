import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

// ─── One field list, two registrations (Phase 10, 2026-09-14) ─────────────────
//
// `fields({inline})` is the single source of this section's fields; the
// DOCUMENT (`videoSection`) is the shared section interior pages reference,
// the INLINE OBJECT (`videoSectionInline`) is the page-owned copy on the
// homepage list. See practiceAreaNav.ts for the reasoning that applies to all
// seven sections. This section has no Appearance fieldset today, so neither
// registration declares one.

export function fields({inline}: {inline: boolean}) {
  return [
    ...(inline
      ? []
      : [
          defineField({
            name: 'name',
            title: 'Section Name',
            type: 'string',
            description: 'Internal label — e.g. "Firm Overview Video" or "Attorney Videos"',
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
      name: 'layout',
      title: 'Layout',
      type: 'string',
      description:
        'Centered places the heading above the video (like other sections). Split puts the heading text in a left column with the video beside it on the right (best for a single video).',
      options: {
        list: [
          {title: 'Centered — heading above the video', value: 'centered'},
          {title: 'Split — heading left, video right', value: 'split'},
        ],
        layout: 'radio',
      },
      initialValue: 'centered',
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'videos',
      title: 'Videos',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'video'}]}],
      validation: (Rule) => Rule.required().min(1).warning('At least one video is required'),
    }),
  ]
}

export const videoSection = defineType({
  name: 'videoSection',
  title: 'Video Section',
  type: 'document',
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name'},
    prepare({title}) {
      return {title: title ?? 'Video Section'}
    },
  },
})

export const videoSectionInline = defineType({
  name: 'videoSectionInline',
  title: 'Video Section',
  type: 'object',
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', layout: 'layout', videos: 'videos'},
    prepare({heading, layout, videos}: {heading?: string; layout?: string; videos?: unknown[]}) {
      const count = videos?.length ?? 0
      return {
        title: heading || 'Video Section',
        subtitle: `Video Section · ${layout ?? 'centered'} · ${count} video${count === 1 ? '' : 's'}`,
      }
    },
  },
})
