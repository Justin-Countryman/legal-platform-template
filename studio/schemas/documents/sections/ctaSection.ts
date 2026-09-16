import {defineType} from 'sanity'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

export const ctaSection = defineType({
  name: 'ctaSection',
  title: 'Banner CTA Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Free Consultation CTA"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      components: {input: TokenStringInput},
    },
    {
      name: 'heading',
      title: 'H2 Heading',
      type: 'string',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      components: {input: TokenTextInput},
    },
    {
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      of: [{type: 'ctaButton'}],
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      description: 'Only shown when Layout is set to Split or Background — not used in Text Only',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Centered — single line heading centered, no image', value: 'centered'},
          {title: 'Split — text left + image right', value: 'split'},
          {title: 'Background — full image with dark overlay', value: 'background'},
          {title: 'Text Only — two column, no image', value: 'textOnly'},
        ],
        layout: 'radio',
      },
      initialValue: 'textOnly',
      validation: (Rule) => Rule.required().warning(),
    },
    // ─── The Appearance fieldset (Phase 13) ──────────────────────────────────────
    // `appearanceFields({seed: false})`: this section renders through `SectionShell`
    // from Phase 13, so the operator can place it on a surface and give it a frame.
    // UNSEEDED, unlike the six sections that already had this fieldset, because
    // `compose_canvas` folds a member `initialValue` into every band it writes and
    // the canvas keeps no per-field origin (item 308, [R-450]). The default surface
    // therefore lives in CODE, per layout, which is also what lets Phase 16's
    // `surfaceRhythm` reach a band with none. Phase 16 removes the seed from the
    // other six and deletes the parameter.
    ...appearanceFields({seed: false}),
  ],
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Banner CTA Section', subtitle}
    },
  },
})
