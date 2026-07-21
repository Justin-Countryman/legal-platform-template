import {defineType} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

// ─── Badges / Awards block ────────────────────────────────────────────────────
//
// FIRST HOMEPAGE BLOCK. The worked example the block pattern is written from.
//
// A block is an INLINE OBJECT inside `homePage.canvas`, not a document. It
// belongs to the one homepage that holds it, so there is no `name` field: an
// internal label exists on the interior-page sections only because those are
// standalone entries an operator has to find in a list. A block is found by
// opening the homepage.
//
// WHY THIS IS NOT `badgesSection`, WHICH ALREADY EXISTS AND HAS MORE FIELDS.
// `badgesSection` carries `layout` (four options), `tagline`, `buttons` and a
// marquee choice. Those exist so an operator can pick a treatment for a fixed
// full-width band on an interior page. On a composed homepage the treatment is
// written into the markup by whoever composes the canvas, so those controls
// would render in Studio, accept input, and change nothing. A control that
// appears to work and does not is worse in a daily editing surface than a
// second schema (ruled 2026-07-20).
//
// What survives is content the operator genuinely owns: what the section says,
// and which badges appear in it.
//
// Badge artwork and copy are NOT duplicated here. They live once as `badge`
// items and are referenced, so the same award reused across the site is edited
// in one place. See BI-Library.md Layer 1.

export const badgesBlock = defineType({
  name: 'badgesBlock',
  title: 'Badges / Awards',
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
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      components: {input: TokenTextInput},
    },
    {
      name: 'badges',
      title: 'Badges',
      type: 'array',
      description:
        'Select from the badges you have built under Individual Items. Build each badge once and reuse it; there is no inline badge here by design.',
      validation: (Rule) => Rule.min(1).warning('At least one badge is required'),
      of: [{type: 'reference', to: [{type: 'badge'}]}],
    },
  ],

  // Blocks sit in an ordered list on one document, so the preview has to answer
  // "which block is this and is it filled in" at a glance. The heading is what
  // an operator scans for; the badge count is what tells them it is populated.
  preview: {
    select: {heading: 'heading', badges: 'badges'},
    prepare({heading, badges}: {heading?: string; badges?: unknown[]}) {
      const count = badges?.length ?? 0
      return {
        title: heading || 'Badges / Awards',
        subtitle: `Badges / Awards block — ${count} badge${count === 1 ? '' : 's'}`,
      }
    },
  },
})
