import {defineType, defineField} from 'sanity'
import {headingEmphasisField} from '../../headingEmphasis'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'

// ─── Featured Case Results section ────────────────────────────────────────────
//
// WHAT IT SHOWS, SINCE 2026-10-14 (monorepo backlog 454,
// WS-CASE-RESULTS-DESIGN-2026-10-13.md §11, ruled by Justin: "a single section that
// highlights featured case results ... the section doesn't link to the case results
// page"): the case results marked Featured, newest first, up to six (eight at four
// across). On the homepage any area of law; on a practice page that page's area of
// law; when Area of Law is set here, that area on any page. The hand-picked
// `caseResults` list, the `headerLink` and the `ctaButton` were deleted that day
// (`scripts/verify-inline-sections.ts` keeps them deleted): a picked list beside a
// Featured switch is two selectors, and the section links to nothing but each
// card's own page. The type names are unchanged.
//
// Promoted from the homepage canvas block `caseResultsBlock` (Phase 10,
// 2026-09-14; monorepo WS-V1-PHASE10-DESIGN): `heading`, `intro` and the shared
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
            description: 'Internal label — e.g. "Featured Results" or "Personal Injury Results"',
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
    headingEmphasisField(),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 2,
      components: {input: TokenTextInput},
    }),
    defineField({
      name: 'areaOfLaw',
      title: 'Area of Law',
      type: 'reference',
      to: [{type: 'practiceArea'}],
      options: {filter: '!defined(parentPage)'},
      description:
        'Leave blank and the section shows the featured results that fit where it sits: every area of law on the ' +
        'homepage and other pages, and the page’s own area of law on a practice area page. Pick one to show only ' +
        'that area’s, on any page; a geo practice page needs one picked to show any. Mark results Featured on ' +
        'each case result. The results disclaimer renders automatically below them and is not editable here.',
    }),
    // The premium package (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.3, `[R-641]`; brandilaw's ruled results, two rows of four).
    // Blank keeps the columns that follow the count up to three.
    defineField({
      name: 'across',
      title: 'Columns',
      type: 'string',
      description: 'Leave blank for up to three across, six results at most. Four across shows up to eight in two rows of four; the count still decides, and one result never sits alone on a row.',
      options: {list: [{title: 'Up to four across', value: 'four'}], layout: 'radio'},
    }),
    ...appearanceFields({offerPattern: inline}),
  ]
}

export const caseResultsSection = defineType({
  name: 'caseResultsSection',
  title: 'Featured Case Results Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Featured Case Results Section', subtitle}
    },
  },
})

export const caseResultsSectionInline = defineType({
  name: 'caseResultsSectionInline',
  title: 'Featured Case Results',
  type: 'object',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', area: 'areaOfLaw.title'},
    prepare({heading, area}: {heading?: string; area?: string}) {
      return {
        title: heading || 'Featured Case Results',
        subtitle: `Featured Case Results · ${area ?? 'the featured results that fit the page'}`,
      }
    },
  },
})
