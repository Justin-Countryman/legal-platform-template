import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'

// ─── Narrative block ──────────────────────────────────────────────────────────
//
// The workhorse block: connective and explanatory prose. Serves BOTH the
// guide/about beat (BI-Homepage Beat 5) and the practice-area narrative beat
// (the optional deeper treatment under Beat 4).
//
// Fields per BI-Library Layer 3: `heading`, `body` (Portable Text), optional
// `image` plus alt, optional `ctaButton`, optional `internalLinks[]`.
//
// ─── One block, not two ───────────────────────────────────────────────────────
//
// The practice-area narrative is a VARIANT, not a second block. `internalLinks`
// is the only field that distinguishes it, and it is content rather than
// treatment, so the field test does not force a split. The real difference
// between the two uses is how the prose is rendered: the practice-area variant
// weaves anchor-text links to parent practice-area pages through the narrative,
// where the guide/about use does not. Rendering is what the client-owned half
// exists for, so splitting the SCHEMA to express a RENDERING difference would
// invert the platform/client split.
//
// Its cost, named rather than hidden: on the guide/about use an operator sees an
// `internalLinks` field they will usually leave empty. The field description
// says which use it serves, which is the mitigation available at schema level.
//
// ─── Why `body` is `blockProse` and not `blockContent` ────────────────────────
//
// `blockContent` allows H2 through H6, and interior pages render it through a
// component that maps those to the interior type scale. See blockProse.ts for
// the full reasoning; the short version is that a block already owns the only
// `h2` in its section, and a heading style inside a body is the one axis that
// could pull the interior scale onto the homepage.

export const narrativeBlock = defineType({
  name: 'narrativeBlock',
  title: 'Narrative',
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
      name: 'body',
      title: 'Body',
      type: 'blockProse',
      description:
        'Paragraphs, lists, and inline emphasis or links. Headings are deliberately unavailable: this section already has one, and a second would compete with it.',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      description: 'Optional. A supporting image beside the prose.',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description:
            'Describe the image for screen readers. Leave blank ONLY if the image is purely decorative.',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'ctaButton',
      title: 'CTA Button',
      type: 'ctaButton',
      description: 'Optional. Usually a link to the full About page.',
    },
    {
      name: 'internalLinks',
      title: 'Practice Area Links',
      type: 'array',
      description:
        'Optional, and only for the practice-area narrative use. Links to parent practice-area pages with the anchor text the prose should use. Leave empty on a guide/about narrative.',
      of: [
        {
          type: 'object',
          name: 'internalLink',
          fields: [
            {
              name: 'page',
              title: 'Practice Area',
              type: 'reference',
              // Parent practice areas only, per BI-Homepage: a narrative links to
              // the parent legal category, not to a geo or service-area
              // derivative. Same target as `caseResult.practiceArea`.
              to: [{type: 'practiceArea'}],
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'anchorText',
              title: 'Anchor Text',
              type: 'string',
              description:
                'The words the link is set on. This is the SEO-bearing part: write the phrase a reader would search, not "click here" or the bare page title.',
              components: {input: TokenStringInput},
              validation: (Rule) => Rule.required().warning(),
            },
          ],
          preview: {
            select: {title: 'anchorText', subtitle: 'page.title'},
          },
        },
      ],
    },
  ],

  preview: {
    select: {heading: 'heading', links: 'internalLinks'},
    prepare({heading, links}: {heading?: string; links?: unknown[]}) {
      const count = links?.length ?? 0
      return {
        title: heading || 'Narrative',
        subtitle: count > 0 ? `Narrative block — ${count} practice-area link${count === 1 ? '' : 's'}` : 'Narrative block',
      }
    },
  },
})
