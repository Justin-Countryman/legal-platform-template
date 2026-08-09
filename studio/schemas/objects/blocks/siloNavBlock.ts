import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'

// ─── Areas of Law block (silo nav) ────────────────────────────────────────────
//
// Beat 4, and the reason it is a BLOCK rather than the interior section.
//
// `BI-Homepage.md` lists Beat 4 as Required, fourth of nine. It was realized by
// `practiceAreaNav`, which is a Layer 2 SECTION. The homepage render order is
// fixed at hero → canvas → sections → CTA → coda, so a section always renders
// AFTER every canvas block: there is no value of any Sanity field, and no
// ordering of the canvas, that puts a section between two blocks. A Required
// beat therefore could not land at the position the framework specifies, and
// on the proof build it landed eighth of nine, immediately above the final CTA.
// That is an architecture gap rather than a composition mistake, and this file
// is its fix (monorepo `BI/OUTSTANDING.md` item 59, ruled 2026-08-08 by Justin).
//
// THE OPTION THAT WAS REJECTED, recorded so it is not rediscovered as the easy
// one. Letting `homePage.canvas` hold SECTION REFERENCES alongside inline blocks
// is cheaper and was rejected on the record: it reintroduces exactly the "two
// entries that look alike in one list and behave differently" failure that the
// canvas/sections split exists to prevent, where one entry edits this page and
// its neighbour silently edits every page pointing at the same document.
//
// THE SECTION STAYS. `practiceAreaNav` is unchanged and is still the tool for
// interior pages, where a stacked full-width band is correct and where its
// treatment controls have a band to control. What changed is that it is no
// longer the homepage's realization of Beat 4.
//
// ─── WHY THIS IS THINNER THAN THE SECTION ─────────────────────────────────────
//
// The section carries `layout`, `gridMode`, `sectionLayout`, `mobileDisplay`,
// `iconPosition`, `showArrow`, `hoverEffects` and an Appearance fieldset. Those
// exist so an operator can pick a treatment for a fixed full-width band on an
// interior page. On a composed homepage the treatment is written into the markup
// by whoever composes the canvas, so every one of them would render in Studio,
// accept input, and change nothing — the "control that appears to work and does
// not" failure the field test exists to prevent (BI-Library Layer 3).
//
// What survives is content the operator genuinely owns: what the band says, and
// which practice areas appear in it.
//
// ─── WHY `mode` SURVIVES THE FIELD TEST AND `layout` DOES NOT ─────────────────
//
// `mode` chooses WHICH ITEMS render, which the field test admits explicitly
// ("Which items yes"). `layout` chooses how they look, which it excludes.
//
// The default differs from the section's on purpose. The section defaults to
// `manual` because an interior page features a curated few. Beat 4 says the
// opposite for the homepage — "shows every area the firm practices … Never
// curate or hide areas; no View All" — so the default here is `allTopLevel`,
// the mode that satisfies the beat with no operator action at all. Curation
// stays reachable, because a firm that genuinely needs it should not have to
// change schema to get it, and the beat rule is the doctrine an operator is
// held to rather than something this schema can enforce.
//
// Items are `practiceAreaNavItem`, the SAME object type the section and the hero
// content strip already use, so the three share one item model and an operator
// who has learned it once has learned it everywhere.

export const siloNavBlock = defineType({
  name: 'siloNavBlock',
  title: 'Areas of Law',
  type: 'object',
  fields: [
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      components: {input: TokenStringInput},
    },
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
      name: 'mode',
      title: 'Practice Area Source',
      type: 'string',
      description:
        'Every area of law is the homepage default — Beat 4 says never curate or hide areas. Choose Curated only when the firm has a specific reason to.',
      options: {
        list: [
          {title: 'All top-level practice areas', value: 'allTopLevel'},
          {title: 'Curated — hand-pick and order', value: 'manual'},
        ],
        layout: 'radio',
      },
      initialValue: 'allTopLevel',
      validation: (Rule) => Rule.required().warning(),
    },
    defineField({
      name: 'items',
      title: 'Practice Areas',
      type: 'array',
      hidden: ({parent}) => parent?.mode !== 'manual',
      description:
        'Pick the practice-area pages to feature, in order of importance. Title, description, and image auto-fill from each page — override per item if needed.',
      of: [{type: 'practiceAreaNavItem'}],
      // A warning rather than an error, per the platform's schema convention.
      // The rendering degrades to nothing rather than assuming the bound holds.
      validation: (Rule) =>
        Rule.custom((items: unknown[] | undefined, context) => {
          const parent = context.parent as {mode?: string} | undefined
          if (parent?.mode === 'manual' && (!items || items.length === 0)) {
            return {message: 'Add at least one practice area', level: 'warning' as const}
          }
          return true
        }),
    }),
  ],

  // Blocks sit in an ordered list on one document, so the preview has to answer
  // "which block is this and is it filled in" at a glance.
  preview: {
    select: {heading: 'heading', mode: 'mode', items: 'items'},
    prepare({heading, mode, items}: {heading?: string; mode?: string; items?: unknown[]}) {
      const count = items?.length ?? 0
      const source =
        mode === 'manual'
          ? `${count} practice area${count === 1 ? '' : 's'}`
          : 'every top-level practice area'
      return {
        title: heading || 'Areas of Law',
        subtitle: `Areas of Law block — ${source}`,
      }
    },
  },
})
