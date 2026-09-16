import {defineType, defineField} from 'sanity'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'
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

// ─── The Appearance fieldset (Phase 13) ──────────────────────────────────────
// `appearanceFields({seed: false})`: this section renders through `SectionShell`
// from Phase 13, so the operator can place it on a surface and give it a frame.
// UNSEEDED, unlike the six sections that already had this fieldset, because
// `compose_canvas` folds a member `initialValue` into every band it writes and
// the canvas keeps no per-field origin (item 308, [R-450]). The default surface
// therefore lives in CODE, per layout, which is also what lets Phase 16's
// `surfaceRhythm` reach a band with none. Phase 16 removes the seed from the
// other six and deletes the parameter.

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
    ...appearanceFields({seed: false}),
  ]
}

export const videoSection = defineType({
  name: 'videoSection',
  title: 'Video Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
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
  fieldsets: [appearanceFieldset],
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
