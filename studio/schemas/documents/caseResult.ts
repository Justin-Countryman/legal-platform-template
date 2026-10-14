import {defineType, type Rule} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'
import {seoTitleValidation} from '../seoTitle'
import {metaDescriptionValidation} from '../metaDescription'
import {
  OG_DESCRIPTION_DESCRIPTION,
  OG_TITLE_DESCRIPTION,
  ogDescriptionValidation,
  ogTitleValidation,
} from '../socialOverrides'

// ─── Case Result: a card, and a page when switched on ─────────────────────────
//
// The case results CMS (monorepo backlog 454, WS-CASE-RESULTS-DESIGN-2026-10-13.md
// §11, ruled by Justin 2026-10-14: "a CMS in Sanity just like we've done with
// blogs"). Every result is a card. A result whose "own page" switch is on is also
// a page at `/case-results/<name>`, linked from its card; one whose switch is off
// has no page, no address and no sitemap entry. The page fields show only while
// the switch is on.
//
// Each result names its area of law, so a practice page shows only its own silo's
// results ("only displaying the correct case results in the practice area silo").
// Featured results are what the Featured Case Results section shows.
//
// NOT to be confused with `attorneyPage.representativeCases`, which is a
// blockContent field scoped to one attorney's own matters and stays as-is.
//
// There is deliberately no disclaimer field here. The results disclaimer lives
// once at the site level and renders automatically wherever case results
// render — see `site/lib/legal.ts` and `siteSettings.resultsDisclaimer`. A
// per-item field could be left blank, and a blank one publishes a case result
// with no disclaimer. See BI-Library.md, Case Result item.
//
// Every rule here is a warning: nothing blocks Publish (monorepo [R-162]).

// A page's fields show only while its switch is on. A predicate, never a literal
// `hidden: true`, which the field map reads as a retired field (monorepo traps).
const withoutPage = ({parent}: {parent?: {hasPage?: boolean}}) => parent?.hasPage !== true

// Required only while the page is on. `.warning()` chained on the rule: a level
// returned from `custom` is ignored (monorepo traps, Sanity 3.65).
function isBlank(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object' && (value as {_type?: string})._type === 'slug') return !(value as {current?: string}).current
  return false
}
const requiredForPage = (message: string) => (rule: Rule) =>
  rule.custom((value: unknown, context) =>
    (context.document as {hasPage?: boolean} | undefined)?.hasPage === true && isBlank(value) ? message : true,
  ).warning()

// A result is a claim, and no headline, search title or description carries one,
// even a true one (monorepo [R-702] rule 7; the bar's advertising rules). The
// result shows on the page itself, large, with the disclaimer under it. A money
// figure (the build's RESULT_MONEY: a dollar sign with a unit or 1,000 or more)
// or an outcome word is flagged. A warning: the operator decides.
const MONEY = /\$\s?(\d[\d,]*(?:\.\d+)?)\s*(million|billion|mil|m|k)?\b/gi
const OUTCOME = /\b(dismiss\w*|acquitt\w*|not guilty|won|wins?|awarded|granted|expunged|recover(?:ed|y)|victory|favorable)\b/i
export function resultClaimIn(text: unknown): string | null {
  if (typeof text !== 'string') return null
  for (const m of text.matchAll(MONEY)) {
    if (m[2] || Number(m[1].replace(/,/g, '')) >= 1000) return m[0].trim()
  }
  return text.match(OUTCOME)?.[0] ?? null
}
const noResultClaim = (rule: Rule) =>
  rule.custom((value: unknown) => {
    const claim = resultClaimIn(value)
    return claim
      ? `"${claim}" reads as a result. Name the case here, not its outcome: the Result shows on the page, ` +
        'with the disclaimer under it, and no headline, search title or description carries one, even a true one.'
      : true
  }).warning()

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export const caseResult = defineType({
  name: 'caseResult',
  title: 'Case Result',
  type: 'document',
  fieldsets: [
    {
      name: 'page',
      title: 'Its Own Page',
      options: {collapsible: true, collapsed: false},
      hidden: withoutPage,
    },
    {
      name: 'seo',
      title: 'SEO Settings',
      options: {collapsible: true, collapsed: true},
      hidden: withoutPage,
    },
  ],
  fields: [
    // ─── The card ─────────────────────────────────────────────────────────────
    {
      name: 'amount',
      title: 'Result',
      type: 'string',
      description:
        'The headline result, exactly as it should appear, saying what kind of result it was: "$1.5 Million Settlement", ' +
        '"$2.1 Million Jury Verdict", "Charges Dismissed", "Not Guilty", "Sole Custody Awarded". A dollar figure is what ' +
        'the client actually received; say whether it is before or after fees and costs. If a verdict was reduced, ' +
        'reversed or not collected, put the amount received here too, as prominently.',
      validation: (rule) => rule.required().warning(),
    },
    {
      name: 'caseType',
      title: 'Case Type',
      type: 'string',
      description: 'What the case was: "Medical Malpractice", "Felony DWI", "Child Custody", "Chapter 7 Bankruptcy".',
      validation: (rule) => rule.required().warning(),
    },
    {
      name: 'caption',
      title: 'Summary',
      type: 'text',
      rows: 3,
      description:
        'Optional. One to three sentences on what happened. Accurate and verifiable: no guarantees, no superlatives.',
    },
    {
      name: 'year',
      title: 'Year',
      type: 'number',
      description: 'Optional. The year the matter concluded. Lists show the newest first.',
      validation: (rule) =>
        rule.integer()
          .min(1900)
          .max(new Date().getFullYear())
          .warning('Use the four-digit year the matter concluded'),
    },
    {
      name: 'areaOfLaw',
      title: 'Area of Law',
      type: 'reference',
      to: [{type: 'practiceArea'}],
      options: {filter: '!defined(parentPage)'},
      description:
        'The area of law this result belongs to. A practice page shows only its own area of law’s results.',
      validation: (rule) => rule.required().warning('Pick the area of law, or no practice page will show this result'),
    },
    {
      name: 'practiceArea',
      title: 'Practice Area',
      type: 'reference',
      to: [{type: 'practiceArea'}],
      options: {
        filter: ({document}) => {
          const area = (document as {areaOfLaw?: {_ref?: string}}).areaOfLaw?._ref
          return area
            ? {
                filter: 'defined(parentPage) && $area in [parentPage._ref, parentPage->parentPage._ref, parentPage->parentPage->parentPage._ref]',
                params: {area},
              }
            : {filter: 'defined(parentPage)'}
        },
      },
      description: 'Optional. The practice area under that area of law. Its own page links to it.',
    },
    {
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
      description:
        'Show this result in the Featured Case Results section: on the homepage, and on its own area of law’s ' +
        'practice pages. The section shows up to six, newest first.',
    },
    {
      name: 'hasPage',
      title: 'Give This Result Its Own Page',
      type: 'boolean',
      initialValue: false,
      description:
        'Off: a card that links nowhere. On: the card links to a page of its own at /case-results/… with the write-up. ' +
        'Turning it off later takes the page down; add a redirect if it was live.',
    },
    // ─── Its own page ─────────────────────────────────────────────────────────
    {
      name: 'title',
      fieldset: 'page',
      title: 'Headline',
      type: 'string',
      components: {input: TokenStringInput},
      description:
        'The page’s name and its heading. Name the case and where, never the result: "Missed Cancer Diagnosis, ' +
        'Hennepin County". The Result shows large on the page, with the disclaimer under it.',
      hidden: withoutPage,
      validation: (rule) => [requiredForPage('A page needs its headline')(rule), noResultClaim(rule)],
    },
    {
      name: 'slug',
      fieldset: 'page',
      title: 'Slug',
      type: 'slug',
      description: 'Click Generate after writing the headline. Auto-prefixes case-results/.',
      hidden: withoutPage,
      options: {
        source: (doc) => {
          const title = ((doc as {title?: string}).title ?? '').trim()
          return title ? `case-results/${slugify(title)}` : ''
        },
      },
      validation: (rule) => [
        requiredForPage('A page needs its address')(rule),
        rule.custom((value: {current?: string} | undefined) => {
          const current = value?.current
          if (!current) return true
          return /^case-results\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current)
            ? true
            : 'The address is case-results/ and one name of lowercase words joined by dashes'
        }).warning(),
      ],
    },
    {
      name: 'navLabel',
      fieldset: 'page',
      title: 'Nav Label',
      type: 'string',
      description: 'Short label for menus, breadcrumbs and link text. Leave blank to use the Headline.',
      hidden: withoutPage,
    },
    {
      name: 'body',
      fieldset: 'page',
      title: 'Write-up',
      type: 'blockContent',
      description: 'The case in full: the facts, the court or county, the issue, what the firm did, the outcome.',
      hidden: withoutPage,
      validation: (rule) => requiredForPage('A page needs its write-up')(rule),
    },
    // ─── SEO Settings ─────────────────────────────────────────────────────────
    {
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      fieldset: 'seo',
      components: {input: TokenStringInput},
      hidden: withoutPage,
      validation: (rule) => [...seoTitleValidation(rule), noResultClaim(rule)],
    },
    {
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      fieldset: 'seo',
      components: {input: TokenTextInput},
      hidden: withoutPage,
      validation: (rule) => [metaDescriptionValidation(rule)].flat().concat(noResultClaim(rule)),
    },
    {
      name: 'ogTitle',
      title: 'Social Share Title',
      type: 'string',
      description: OG_TITLE_DESCRIPTION,
      fieldset: 'seo',
      components: {input: TokenStringInput},
      hidden: withoutPage,
      validation: ogTitleValidation,
    },
    {
      name: 'ogDescription',
      title: 'Social Share Description',
      type: 'text',
      rows: 3,
      description: OG_DESCRIPTION_DESCRIPTION,
      fieldset: 'seo',
      components: {input: TokenTextInput},
      hidden: withoutPage,
      validation: ogDescriptionValidation,
    },
    {
      name: 'ogImageOverride',
      title: 'OG Image',
      type: 'image',
      description: '1200×630 px recommended. Optional — when empty, the site generates a branded share image automatically from the firm name, logo and brand color, so leaving this blank is a valid choice rather than a gap.',
      fieldset: 'seo',
      hidden: withoutPage,
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          validation: (rule) => rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'noIndex',
      title: 'No Index',
      type: 'boolean',
      fieldset: 'seo',
      hidden: withoutPage,
      initialValue: false,
    },
    {
      name: 'noFollow',
      title: 'No Follow',
      type: 'boolean',
      initialValue: false,
      fieldset: 'seo',
      hidden: withoutPage,
      description: 'Stops search engines following links on this page. Independent of No Index — a hidden page still follows its links unless this is on. Leave off unless you have a specific reason.',
    },
    {
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      fieldset: 'seo',
      hidden: withoutPage,
      description: 'Override only — the canonical URL is set automatically from the page slug. Only fill this in if you need to point to a different URL.',
    },
  ],

  // The Result is what an operator scans for; the case type and year keep two
  // identical results apart, and a star marks the featured ones.
  preview: {
    select: {amount: 'amount', caseType: 'caseType', year: 'year', featured: 'featured', hasPage: 'hasPage'},
    prepare({amount, caseType, year, featured, hasPage}) {
      return {
        title: `${featured ? '★ ' : ''}${amount ?? 'Case Result'}`,
        subtitle: [caseType, year, hasPage ? 'own page' : null].filter(Boolean).join(' — '),
      }
    },
  },
})
