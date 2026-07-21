import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

// ─── Differentiator block ─────────────────────────────────────────────────────
//
// The pain-plus-value beat (BI-Homepage Beat 2), and the SECOND homepage block.
// Built as the test of the provisional block-authoring doctrine in BI-Library
// Layer 3, because it adds the repeating sub-object that `badgesBlock` did not
// exercise.
//
// Fields per BI-Library Layer 3: `heading`, `intro` (the pain acknowledgment),
// `differentiators[]` (each: title, body). 3 to 4 differentiators, per the
// BI-Content rules cited there and BI-Homepage Beat 2.
//
// ─── Why `body` is plain text and not Portable Text ───────────────────────────
//
// BI-Library specifies "body" without a type. It names Portable Text for exactly
// one field in the whole library, the Narrative block's `body`, so the omission
// here reads as deliberate rather than unstated.
//
// Plain text is also the correct answer independently. `blockContent` carries
// H2 through H6, bullet and numbered lists, code, underline and strike. Inside a
// differentiator card, every one of those is either unusable or actively
// breaks the card: a nested H2 would put a second h2 in a section that already
// has one, which is a heading-hierarchy defect the platform's own
// `heading-cascade-discipline` rule exists to catch. A differentiator body is
// one to three sentences of benefit copy, and the field should not offer an
// authoring surface the layout cannot honor.
//
// ─── The count is content, not a layout control ───────────────────────────────
//
// Three differentiators and four differentiators want different grids. That does
// NOT make the count a treatment control the operator is choosing: they are
// choosing what the visitor reads, and the grid is a consequence the RENDERING
// absorbs. See the block component, which picks its columns from the count.
// This is the opposite of the `layout` field dropped from `badgesBlock`, which
// changed treatment and nothing else.

export const differentiatorBlock = defineType({
  name: 'differentiatorBlock',
  title: 'Differentiators',
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
      rows: 3,
      description:
        'The pain acknowledgment: two to three sentences naming the visitor’s specific situation before the differentiators answer it. Never end on the pain.',
      components: {input: TokenTextInput},
    },
    {
      name: 'differentiators',
      title: 'Differentiators',
      type: 'array',
      description:
        'Three or four, each specific to this firm and benefit-focused rather than feature-focused. At least one should describe the firm’s specific method, not just an outcome.',
      // Advisory, per platform convention: every schema here warns rather than
      // errors. The rendering therefore cannot ASSUME 3 or 4 and still has to
      // read correctly at any count, which is why it derives its grid rather
      // than hardcoding one.
      validation: (Rule) =>
        Rule.min(3)
          .max(4)
          .warning('Three or four differentiators — fewer reads thin, more dilutes each one'),
      of: [
        {
          type: 'object',
          name: 'differentiator',
          fields: [
            {
              name: 'title',
              title: 'Title',
              type: 'string',
              components: {input: TokenStringInput},
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'body',
              title: 'Body',
              type: 'text',
              rows: 3,
              components: {input: TokenTextInput},
              validation: (Rule) => Rule.required().warning(),
            },
          ],
          preview: {
            select: {title: 'title', subtitle: 'body'},
          },
        },
      ],
    },
  ],

  preview: {
    select: {heading: 'heading', differentiators: 'differentiators'},
    prepare({heading, differentiators}: {heading?: string; differentiators?: unknown[]}) {
      const count = differentiators?.length ?? 0
      return {
        title: heading || 'Differentiators',
        subtitle: `Differentiators block — ${count} item${count === 1 ? '' : 's'}`,
      }
    },
  },
})
