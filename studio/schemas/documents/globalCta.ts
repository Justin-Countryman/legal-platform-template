import {defineType} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'

// Singleton — global CTA shown above footer on all pages
// Per-page: use hideCtaForm to hide, or ctaFormOverride to replace content

export const globalCta = defineType({
  name: 'globalCta',
  title: 'Global CTA',
  type: 'document',
  fields: [
    {
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Centered (text + buttons)', value: 'centered'},
          {title: 'Split (text + form)', value: 'split'},
        ],
        layout: 'radio',
      },
      initialValue: 'centered',
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
    // ─── Centered layout ──────────────────────────────────────────────────────
    {
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      of: [{type: 'ctaButton'}],
      description: 'Up to two CTAs. The first is rendered first (typically primary); editors can choose each button\'s visual variant.',
      hidden: ({document}) => (document as {layout?: string})?.layout === 'split',
      validation: (Rule) => Rule.max(2).warning('Limit to 2 buttons for layout consistency'),
    },
    // ─── Form (both layouts) ──────────────────────────────────────────────────
    {
      name: 'form',
      title: 'Form',
      type: 'reference',
      to: [{type: 'siteForm'}],
      description: 'Select the form to embed in the CTA section',
    },
  ],

  preview: {
    prepare() {
      return {title: 'Global CTA'}
    },
  },
})
