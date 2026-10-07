import {defineField} from 'sanity'
import {TokenStringInput} from '../components/TokenStringInput'
import {countOccurrences} from './documents/sections/contentSection'

// The heading emphasis a section header and the homepage headline take (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2
// amendment 12, `[R-641]`; nguyenandmaliklaw emphasises its hero, practice, testimonial and attorney headings): the
// content section's field and rule, shared. A phrase from the heading, case-sensitive, its first occurrence set in the
// site's emphasis style. Blank renders the heading as before.
export function headingEmphasisField() {
  return defineField({
    name: 'headingEmphasis',
    title: 'Heading Emphasis',
    type: 'string',
    description:
      'A word or phrase from the heading to set in the accent style. Write it exactly as it appears in the heading, tokens included; it is case-sensitive. Only its first occurrence is emphasised.',
    components: {input: TokenStringInput},
    validation: (Rule) =>
      Rule.custom((value, context) => {
        if (typeof value !== 'string' || !value) return true
        const heading = ((context.parent as {heading?: string | null} | undefined)?.heading) ?? ''
        const n = countOccurrences(heading, value)
        if (n === 1) return true
        return n === 0
          ? `"${value}" does not occur in the heading. Write it exactly as it appears there, tokens included; it is case-sensitive.`
          : `"${value}" occurs ${n} times in the heading; only the first is emphasised.`
      }).warning(),
  })
}
