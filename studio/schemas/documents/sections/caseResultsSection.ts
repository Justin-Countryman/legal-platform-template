import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'

// ─── Case Results section ─────────────────────────────────────────────────────
//
// Promoted from the homepage canvas block `caseResultsBlock` (Phase 10,
// 2026-09-14; monorepo WS-V1-PHASE10-DESIGN): `heading`, `intro`,
// `caseResults[]` (references, never inline), `ctaButton`, and the shared
// Appearance fieldset. One field list, two registrations, as in
// practiceAreaNav.ts.
//
// BOTH NAMES ARE REGISTERED (Phase 11, 2026-09-14; monorepo backlog item 305).
// Phase 10 registered only the inline object, because a document no interior
// page can reference appears under "Create new" and renders nowhere. Phase 11
// offers `caseResultsSection` in every interior `sections` list beside
// `ctaSection`, and `PageSections` renders it with the disclaimer resolved from
// the page query; `scripts/verify-inline-sections.ts` holds the lists to it.
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
// disclaimer off. The platform-owned canvas resolves it and passes it to the
// component as a REQUIRED prop; a platform-owned test asserts it renders.

export function fields({inline}: {inline: boolean}) {
  return [
    ...(inline
      ? []
      : [
          defineField({
            name: 'name',
            title: 'Section Name',
            type: 'string',
            description: 'Internal label — e.g. "Personal Injury Results"',
            validation: (Rule) => Rule.required().warning(),
          }),
        ]),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      components: {input: TokenStringInput},
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 2,
      components: {input: TokenTextInput},
    }),
    defineField({
      name: 'caseResults',
      title: 'Case Results',
      type: 'array',
      description:
        'Select from the case results you have built under Individual Items. Build each result once and reuse it. The results disclaimer renders automatically below them and is not editable here.',
      validation: (Rule) => Rule.min(1).warning('At least one case result is required'),
      of: [{type: 'reference', to: [{type: 'caseResult'}]}],
    }),
    defineField({
      name: 'ctaButton',
      title: 'CTA Button',
      type: 'ctaButton',
      description: 'Optional. Usually a link to a fuller results page.',
    }),
    ...appearanceFields({defaultSurface: 'light', offerPattern: inline}),
  ]
}

export const caseResultsSection = defineType({
  name: 'caseResultsSection',
  title: 'Case Results Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Case Results Section', subtitle}
    },
  },
})

export const caseResultsSectionInline = defineType({
  name: 'caseResultsSectionInline',
  title: 'Case Results',
  type: 'object',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', caseResults: 'caseResults'},
    prepare({heading, caseResults}: {heading?: string; caseResults?: unknown[]}) {
      const count = caseResults?.length ?? 0
      return {
        title: heading || 'Case Results',
        subtitle: `Case Results · ${count} result${count === 1 ? '' : 's'}`,
      }
    },
  },
})
