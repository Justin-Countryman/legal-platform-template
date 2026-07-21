import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

// ─── Case Results block ───────────────────────────────────────────────────────
//
// Beat 3 (social proof). Fields per BI-Library Layer 3: `heading`, optional
// `intro`, `caseResults[]` (refs), optional `ctaButton`.
//
// ─── NO DISCLAIMER FIELD, AND THAT IS THE POINT ───────────────────────────────
//
// Bar advertising rules require past results to be paired with a disclaimer,
// always. "Always" has to survive every reachable state of the data, so the
// disclaimer is deliberately NOT an operator-facing field here:
//
//   - not a text field, because a blank one publishes a result with no
//     disclaimer;
//   - not a boolean, because a false one does the same;
//   - not optional anywhere in the chain.
//
// It resolves from a code constant (`site/lib/legal.ts` →
// `RESULTS_DISCLAIMER_DEFAULT`), with `siteSettings.resultsDisclaimer` as a
// WORDING override only. Undefined, null, empty and whitespace all fall through
// to the constant, so there is no value an operator can enter that switches the
// disclaimer off. See BI-Library Layer 1, Case Result item, for the full ruling
// and why the constant lives in code rather than in Sanity.
//
// The rendering chain enforces the same thing structurally: the platform-owned
// canvas resolves the disclaimer and passes it to the block as a REQUIRED prop,
// so a client rewriting the block markup cannot drop the source, and a
// platform-owned test asserts it renders. This is the first block carrying an
// obligation the operator cannot switch off.

export const caseResultsBlock = defineType({
  name: 'caseResultsBlock',
  title: 'Case Results',
  type: 'object',
  fields: [
    {
      name: 'heading',
      title: 'Heading',
      type: 'string',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 2,
      components: {input: TokenTextInput},
    },
    {
      name: 'caseResults',
      title: 'Case Results',
      type: 'array',
      description:
        'Select from the case results you have built under Individual Items. Build each result once and reuse it. The results disclaimer renders automatically below them and is not editable here.',
      validation: (Rule) => Rule.min(1).warning('At least one case result is required'),
      of: [{type: 'reference', to: [{type: 'caseResult'}]}],
    },
    {
      name: 'ctaButton',
      title: 'CTA Button',
      type: 'ctaButton',
      description: 'Optional. Usually a link to a fuller results page.',
    },
  ],

  preview: {
    select: {heading: 'heading', caseResults: 'caseResults'},
    prepare({heading, caseResults}: {heading?: string; caseResults?: unknown[]}) {
      const count = caseResults?.length ?? 0
      return {
        title: heading || 'Case Results',
        subtitle: `Case Results block — ${count} result${count === 1 ? '' : 's'}`,
      }
    },
  },
})
