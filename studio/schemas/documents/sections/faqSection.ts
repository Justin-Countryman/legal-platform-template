import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

export const faqSection = defineType({
  name: 'faqSection',
  title: 'FAQ Section',
  type: 'document',
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
  ],
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}) {
      return {title: title ?? 'FAQ Section', subtitle}
    },
  },
})
