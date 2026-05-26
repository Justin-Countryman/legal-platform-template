import {defineType} from 'sanity'
import {PageLinkInput} from '../../components/PageLinkInput'
import {TokenStringInput} from '../../components/TokenStringInput'

export const ctaButton = defineType({
  name: 'ctaButton',
  title: 'CTA Button',
  type: 'object',
  fields: [
    {
      name: 'title',
      title: 'Button Label',
      type: 'string',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'url',
      title: 'URL',
      type: 'string',
      description: 'Relative path (e.g. /contact/) or full URL (https://...)',
      components: {input: PageLinkInput},
      validation: (Rule) =>
        Rule.custom<string>((value) => {
          if (!value) return true
          if (
            value.startsWith('/') ||
            value.startsWith('http://') ||
            value.startsWith('https://') ||
            value.startsWith('tel:') ||
            value.startsWith('mailto:')
          )
            return true
          return {message: 'Must be a relative path (/contact/) or full URL (https://...)', level: 'warning' as const}
        }),
    },
    {
      name: 'variant',
      title: 'Variant',
      type: 'string',
      options: {
        list: [
          {title: 'Primary', value: 'primary'},
          {title: 'Secondary', value: 'secondary'},
          {title: 'Link', value: 'link'},
        ],
        layout: 'radio',
      },
      initialValue: 'primary',
    },
  ],
  preview: {
    select: {title: 'title', subtitle: 'variant'},
  },
})
