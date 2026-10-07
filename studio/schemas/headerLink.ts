import {defineField} from 'sanity'
import {PageLinkInput} from '../components/PageLinkInput'
import {TokenStringInput} from '../components/TokenStringInput'

// The "view all" link beside a section's heading (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.3, `[R-641]`; brandilaw's practice
// and results headers): a label and a page, drawn as a text link on the right of the heading. Blank draws the header as
// before. An inline object, not a named type, so the schema roster does not grow.
export function headerLinkField() {
  return defineField({
    name: 'headerLink',
    title: 'Header Link',
    type: 'object',
    description: 'Optional. A text link on the right of the heading, such as "All practice areas" or "All results". Setting it aligns the heading left.',
    options: {collapsible: true, collapsed: true},
    fields: [
      defineField({name: 'label', title: 'Label', type: 'string', components: {input: TokenStringInput}}),
      defineField({
        name: 'url',
        title: 'Page',
        type: 'string',
        description: 'Relative path (e.g. /practice-areas/) or full URL (https://...)',
        components: {input: PageLinkInput},
        validation: (Rule) =>
          Rule.custom<string>((value) => {
            if (!value || value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://')) return true
            return 'Must be a relative path (/practice-areas/) or a full URL (https://...)'
          }).warning(),
      }),
    ],
  })
}
