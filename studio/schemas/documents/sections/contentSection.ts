import {defineArrayMember, defineField, defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'

// ─── Content section ──────────────────────────────────────────────────────────
//
// The one prebuilt combined section (Phase 11, 2026-09-14; monorepo
// WS-V1-PHASE11-DESIGN, [R-434], [R-437]): the story parts a firm combines
// (about with value, positioning with proof, guide with attorney) in one band
// with a bounded set of five layouts. One field list, two registrations, as in
// practiceAreaNav.ts: `contentSection` is the document an interior page's
// `sections` list references; `contentSectionInline` is the page-owned copy on
// the homepage list.
//
// THE HEADING IS A STRING. `headingEmphasis` is a second string that must occur
// in the heading; the renderer emphasises its first occurrence. A Portable Text
// heading would break token resolution, the composer and every gate that reads a
// heading as text (design §7 amendment 9).
//
// SLOTS PER LAYOUT. A field that a layout does not render is hidden for that
// layout; every `hidden` and `validation` callback reads `parent`, never
// `document`, because inside the homepage list `document` is the homePage.
//
// NO `initialValue` ON `imageTreatment`. It is a theme axis: absent means
// "inherit", and a seeded value would be folded into every composed member as
// if the operator had chosen it (design §7 amendments 1 and 19).
//
// PROOF NUMBERS AND STAT ROWS CARRY THE RESULTS DISCLAIMER. There is no field
// for it and no way to switch it off: the renderer resolves it from the code
// constant, as caseResultsSection.ts explains.

type Layout = 'split' | 'twoColumnText' | 'statement' | 'ribbon' | 'statRow'
type Member = {
  layout?: Layout
  heading?: string
  badges?: unknown[]
  media?: {kind?: string; image?: unknown}
}

const layoutOf = (parent: unknown) => (parent as Member | undefined)?.layout
const hiddenUnless = (...layouts: Layout[]) => ({parent}: {parent?: unknown}) => {
  const layout = layoutOf(parent)
  return !layout || !layouts.includes(layout)
}

/** How many times `needle` occurs in `haystack`, non-overlapping. Exported for the verifier. */
export function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let n = 0
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) n++
  return n
}

const LAYOUTS = [
  {title: 'Split: media on one side, text on the other (media stacks above the text on mobile)', value: 'split'},
  {title: 'Two-column text: heading on the left, body on the right (stacks on mobile)', value: 'twoColumnText'},
  {title: 'Statement: tagline, heading, body and buttons, centred', value: 'statement'},
  {title: 'Ribbon: one line at body size across the band (wraps on mobile)', value: 'ribbon'},
  {title: 'Stat row: number and caption tiles (two across on tablets, one on phones)', value: 'statRow'},
]

const TREATMENTS = [
  {title: 'Inherit: the site default (plain until a theme sets one)', value: 'inherit'},
  {title: 'Plain', value: 'plain'},
  {title: 'Framed: an accent border inside the image edge', value: 'framed'},
  {title: 'Slab: an offset dark block behind the image', value: 'slab'},
  {title: 'Rounded: the site corner radius', value: 'rounded'},
  {title: 'Scrim: a dark gradient over the image', value: 'scrim'},
  {title: 'Tint: an accent wash over the image (plain on a dark surface)', value: 'tint'},
]

export function fields({inline}: {inline: boolean}) {
  return [
    ...(inline
      ? []
      : [
          defineField({
            name: 'name',
            title: 'Section Name',
            type: 'string',
            description: 'Internal label, e.g. "About the firm, with the guarantee"',
            validation: (Rule) => Rule.required().warning(),
          }),
        ]),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {list: LAYOUTS, layout: 'radio'},
      initialValue: 'split',
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'mediaSide',
      title: 'Media Side',
      type: 'string',
      description: 'Which side the media sits on from tablet width up. On mobile it always stacks above the text. Default: right.',
      options: {list: [{title: 'Left', value: 'left'}, {title: 'Right', value: 'right'}], layout: 'radio'},
      hidden: hiddenUnless('split'),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'The short label above the heading.',
      components: {input: TokenStringInput},
      hidden: hiddenUnless('split', 'twoColumnText', 'statement', 'statRow'),
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Needed on a statement, a ribbon and two-column text. Optional on a split and a stat row.',
      components: {input: TokenStringInput},
      // Warn only where the layout needs a heading, and say why: a statement
      // and a ribbon render nothing without one (ContentSectionBlock's
      // isContentSectionEmpty), and two-column text puts it in the left
      // column. A split and a stat row stand without a heading, so they never
      // warn (a blanket required() warned on every headless split).
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (typeof value === 'string' && value.trim()) return true
          switch (layoutOf(context.parent)) {
            case 'statement':
              return 'A statement shows only with a heading; without one this section does not appear on the page.'
            case 'ribbon':
              return 'A ribbon is its heading; without one this section does not appear on the page.'
            case 'twoColumnText':
              return 'Two-column text puts the heading in the left column; without one that column is empty.'
            default:
              return true
          }
        }).warning(),
    }),
    defineField({
      name: 'headingEmphasis',
      title: 'Heading Emphasis',
      type: 'string',
      description:
        'A word or phrase from the heading to set in the accent style. Write it exactly as it appears in the heading, tokens included; it is case-sensitive. Only its first occurrence is emphasised.',
      components: {input: TokenStringInput},
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (typeof value !== 'string' || !value) return true
          const heading = (context.parent as Member | undefined)?.heading ?? ''
          const n = countOccurrences(heading, value)
          if (n === 1) return true
          return n === 0
            ? `"${value}" does not occur in the heading. Write it exactly as it appears there, tokens included; it is case-sensitive.`
            : `"${value}" occurs ${n} times in the heading; only the first is emphasised.`
        }).warning(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockProse',
      hidden: hiddenUnless('split', 'twoColumnText', 'statement'),
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      description:
        'Short points under the body, laid out in a grid by count. On a stat row each item is a tile: the title is the number (e.g. "$40M") and the body its caption; tiles sit four across on desktop, two on tablets and one on phones.',
      hidden: hiddenUnless('split', 'twoColumnText', 'statRow'),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'contentSectionItem',
          title: 'Item',
          fields: [
            defineField({name: 'title', title: 'Title', type: 'string', components: {input: TokenStringInput}}),
            defineField({name: 'body', title: 'Body', type: 'text', rows: 3, components: {input: TokenTextInput}}),
          ],
          preview: {select: {title: 'title', subtitle: 'body'}},
        }),
      ],
    }),
    defineField({
      name: 'pullQuote',
      title: 'Pull Quote',
      type: 'object',
      description: 'A short pledge or quotation set apart from the body.',
      hidden: hiddenUnless('split', 'twoColumnText'),
      fields: [
        defineField({name: 'text', title: 'Text', type: 'text', rows: 3, components: {input: TokenTextInput}}),
        defineField({name: 'attribution', title: 'Attribution', type: 'string'}),
      ],
    }),
    defineField({
      name: 'proof',
      title: 'Proof Number',
      type: 'object',
      description:
        'One number and its caption (e.g. "$40M" and "recovered for clients"), or badges below. If both are set, only the number renders. A proof number always renders with the results disclaimer.',
      hidden: hiddenUnless('split', 'twoColumnText', 'statement'),
      fields: [
        defineField({name: 'number', title: 'Number', type: 'string', components: {input: TokenStringInput}}),
        defineField({name: 'caption', title: 'Caption', type: 'string', components: {input: TokenStringInput}}),
      ],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const hasNumber = Boolean((value as {number?: string} | undefined)?.number)
          const badges = (context.parent as Member | undefined)?.badges
          const hasBadges = Array.isArray(badges) && badges.length > 0
          return hasNumber && hasBadges ? 'Both a proof number and badges are set; only the number renders.' : true
        }).warning(),
    }),
    defineField({
      name: 'badges',
      title: 'Badges',
      type: 'array',
      description: 'Awards shown as a row, from the badges built under Individual Items. Ignored when a proof number is set.',
      hidden: hiddenUnless('split', 'twoColumnText', 'statement'),
      of: [{type: 'reference', to: [{type: 'badge'}]}],
    }),
    defineField({
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      description: 'Up to two.',
      hidden: hiddenUnless('split', 'twoColumnText', 'statement'),
      of: [{type: 'ctaButton'}],
      validation: (Rule) => Rule.max(2).warning('Two buttons at most; the rest do not render.'),
    }),
    defineField({
      name: 'showPhone',
      title: 'Show Phone',
      type: 'boolean',
      description: "Adds the firm's primary phone number beside the buttons, as a tap-to-call link.",
      hidden: hiddenUnless('split', 'twoColumnText', 'statement'),
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'object',
      description:
        'A photo, a cutout figure (a transparent PNG, shown whole rather than cropped) or a video. On mobile the media stacks above the text.',
      hidden: hiddenUnless('split'),
      fields: [
        defineField({
          name: 'kind',
          title: 'Kind',
          type: 'string',
          options: {
            list: [
              {title: 'Photo', value: 'photo'},
              {title: 'Cutout figure', value: 'cutout'},
              {title: 'Video', value: 'video'},
            ],
            layout: 'radio',
          },
        }),
        defineField({
          name: 'image',
          title: 'Image',
          type: 'image',
          options: {hotspot: true},
          hidden: ({parent}) => (parent as Member['media'] | undefined)?.kind === 'video',
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              description: 'What the image shows, for screen readers. Leave empty only if it is purely decorative.',
            }),
          ],
        }),
        defineField({
          name: 'video',
          title: 'Video',
          type: 'reference',
          to: [{type: 'video'}],
          hidden: ({parent}) => (parent as Member['media'] | undefined)?.kind !== 'video',
        }),
      ],
    }),
    defineField({
      name: 'imageTreatment',
      title: 'Image Treatment',
      type: 'string',
      description: 'How the image is framed. A cutout figure takes only Slab; any other choice shows it plain.',
      options: {list: TREATMENTS, layout: 'radio'},
      hidden: ({parent}) => {
        const member = parent as Member | undefined
        return member?.layout !== 'split' || member?.media?.kind === 'video'
      },
    }),
    defineField({
      name: 'marquee',
      title: 'Scroll the Ribbon',
      type: 'boolean',
      description:
        'Scrolls the ribbon text across the band. Visitors get a pause button, it pauses on hover and keyboard focus, and it stays still for anyone who prefers reduced motion.',
      hidden: hiddenUnless('ribbon'),
    }),
    ...appearanceFields({defaultSurface: 'light'}),
  ]
}

export const contentSection = defineType({
  name: 'contentSection',
  title: 'Content Section',
  type: 'document',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}: {title?: string; subtitle?: string}) {
      return {title: title ?? 'Content Section', subtitle}
    },
  },
})

export const contentSectionInline = defineType({
  name: 'contentSectionInline',
  title: 'Content Section',
  type: 'object',
  fieldsets: [appearanceFieldset],
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', layout: 'layout'},
    prepare({heading, layout}: {heading?: string; layout?: string}) {
      return {title: heading || 'Content Section', subtitle: `Content Section · ${layout ?? 'split'}`}
    },
  },
})
