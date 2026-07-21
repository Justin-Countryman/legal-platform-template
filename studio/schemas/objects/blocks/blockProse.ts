import {defineArrayMember, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'
import {ContentTokenInput} from '../../../components/ContentTokenInput'

// ─── blockProse ───────────────────────────────────────────────────────────────
//
// Portable Text scoped to the homepage canvas. Deliberately NOT `blockContent`.
//
// WHY A SECOND PORTABLE TEXT TYPE EXISTS, so nobody consolidates them later.
//
// `blockContent` offers H2 through H6. Interior pages render it through
// `site/components/ui/PortableText`, which maps `h2` to `text-3xl` and `h3` to
// `text-2xl` — the interior three-tier scale, never the marketing scale. A block
// whose body allowed headings and rendered through that map would pull the
// interior scale onto the homepage, which is BI-Library Layer 3 rule 2
// ("blocks never use interior-page primitives") reached by a second route.
//
// A second defect stacks on the first: a block already owns the only `h2` in its
// section, so an operator adding an `h2` inside a body creates a duplicate that
// the platform's `heading-cascade-discipline` lint rule exists to catch.
//
// The fix is here at the schema rather than in the renderer, because a renderer
// that simply refuses to draw a heading would silently discard content an
// operator typed. A style that cannot be chosen cannot be lost.
//
// WHAT SURVIVES: paragraphs, both list kinds, and the marks that carry meaning
// rather than scale. Bold and italic are emphasis; a link is navigation; a
// content token is firm data. None of them decides type size, which is the only
// axis that was dangerous.
//
// NOT INCLUDED, each for a reason: headings (above); `underline` and
// `strike-through` (underline reads as a broken link on the web, and strike is
// editorial revision marking with no place in marketing prose); `code` (no
// homepage use); inline images and `officeHours` (a block that needs an image
// has an `image` field, and office hours belong to the footer and location
// surfaces, not to narrative prose).

export const blockProse = defineType({
  name: 'blockProse',
  title: 'Prose',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      // Paragraphs only. See the header: this is the whole point of the type.
      styles: [{title: 'Normal', value: 'normal'}],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Strong', value: 'strong'},
          {title: 'Emphasis', value: 'em'},
        ],
        annotations: [
          {
            name: 'contentToken',
            type: 'object',
            title: 'Formatted Token',
            icon: TagIcon,
            fields: [
              {
                name: 'tokenKey',
                title: 'Token',
                type: 'string',
                components: {input: ContentTokenInput},
                validation: (Rule) => Rule.required().warning(),
              },
            ],
          },
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [
              {
                name: 'href',
                type: 'url',
                title: 'URL',
                validation: (Rule) =>
                  Rule.uri({
                    scheme: ['http', 'https', 'mailto', 'tel'],
                    allowRelative: true,
                  }),
              },
              {
                name: 'blank',
                type: 'boolean',
                title: 'Open in new tab',
                initialValue: false,
              },
            ],
          },
        ],
      },
    }),
  ],
})
