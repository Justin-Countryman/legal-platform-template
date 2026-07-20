import {defineType} from 'sanity'

// Standalone Sanity document — firm-wide reusable case outcomes.
// Consumed by the Case Results block (Phase 3) and, later, practice-area pages.
//
// NOT to be confused with `attorneyPage.representativeCases`, which is a
// blockContent field scoped to one attorney's own matters and stays as-is.
//
// There is deliberately no disclaimer field here. The results disclaimer lives
// once at the site level and renders automatically wherever case results
// render — see `site/lib/legal.ts` and `siteSettings.resultsDisclaimer`. A
// per-item field could be left blank, and a blank one publishes a case result
// with no disclaimer. See BI-Library.md, Case Result item.

export const caseResult = defineType({
  name: 'caseResult',
  title: 'Case Result',
  type: 'document',
  fields: [
    {
      name: 'amount',
      title: 'Result',
      type: 'string',
      description:
        'Display text exactly as it should appear — e.g. "$246 Million", "$1.2M", "Charges Dismissed". Non-monetary outcomes are valid results.',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'caseType',
      title: 'Case Type / Matter Type',
      type: 'string',
      description: 'e.g. "Truck Accident" or "Criminal Defense — Federal"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'caption',
      title: 'Caption',
      type: 'text',
      rows: 3,
      description:
        'Short description of the outcome. Must be accurate and verifiable — no guarantees, no superlatives, per the bar advertising rules in BI-Content.',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'year',
      title: 'Year',
      type: 'number',
      description: 'Optional. The year the matter concluded.',
      validation: (Rule) =>
        Rule.integer()
          .min(1900)
          .max(new Date().getFullYear())
          .warning('Use the four-digit year the matter concluded'),
    },
    {
      name: 'practiceArea',
      title: 'Practice Area',
      type: 'reference',
      to: [{type: 'practiceArea'}],
      description:
        'Optional. Reserved so results can be surfaced on the relevant practice-area page later — nothing consumes this yet.',
    },
  ],

  // A list of bare amounts is unreadable, and a case result has no natural
  // title field. The amount is what an operator scans for; caseType + year
  // keep two identical amounts distinguishable.
  preview: {
    select: {amount: 'amount', caseType: 'caseType', year: 'year'},
    prepare({amount, caseType, year}) {
      return {
        title: amount ?? 'Case Result',
        subtitle: [caseType, year].filter(Boolean).join(' — '),
      }
    },
  },
})
