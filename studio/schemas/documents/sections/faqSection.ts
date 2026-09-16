import {defineType} from 'sanity'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

export const faqSection = defineType({
  name: 'faqSection',
  title: 'FAQ Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Estate Planning FAQs"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Defaults to "FAQs" if left blank',
      components: {input: TokenStringInput},
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      components: {input: TokenTextInput},
    },
    {
      name: 'questions',
      title: 'Questions',
      type: 'array',
      description:
        'References to FAQ documents. FAQs live as standalone documents (Individual Items → FAQs) and are referenced here so the same Q+A can appear on multiple pages and sections.',
      of: [{type: 'reference', to: [{type: 'faqItem'}]}],
      validation: (Rule) => Rule.min(1).warning('At least one question is required'),
    },
    {
      name: 'footerHeading',
      title: 'Footer Heading',
      type: 'string',
      description: 'Optional closing prompt displayed after the FAQ list — e.g. "Still have questions?"',
      components: {input: TokenStringInput},
    },
    {
      name: 'footerDescription',
      title: 'Footer Description',
      type: 'text',
      rows: 2,
      components: {input: TokenTextInput},
    },
    {
      name: 'footerButton',
      title: 'Footer Button',
      type: 'ctaButton',
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
      return {title: title ?? 'FAQ Section', subtitle}
    },
  },
})
