import {defineType} from 'sanity'

// Standalone Sanity document — firm press mentions, the "In The News" /
// "As Seen In" beat.
//
// NOTHING RENDERS THIS BY DEFAULT, AND THAT IS DELIBERATE. Ruled 2026-07-25
// (Justin): a press / media block is NOT standard homepage composition. Press
// mentions are niche enough that a firm with real press gets the block built
// as a one-off. This type stays because it is the storage that one-off would
// use. An earlier comment here read "Consumed by the Press / Media block
// (Phase 3)" — that block was never standard and is not owed. Do not "restore"
// it on the strength of finding this type unconsumed.
//
// OUTLET AND HEADLINE ONLY. Never the article body, never an excerpt, never a
// pull quote. This is a copyright constraint, not a style preference: the
// articles belong to the outlets that published them, and storing their text
// would reproduce someone else's copyrighted work in the client's dataset.
// An outlet name is a fact and a headline is a citation; a paragraph is a
// copy. Link to the article and let the outlet host its own words.
//
// See BI-Library.md, Press / Media item.

export const pressItem = defineType({
  name: 'pressItem',
  title: 'Press Mention',
  type: 'document',
  description:
    'Storage only — nothing on the site displays these by default. A press / ' +
    'media block is not part of the standard build; a firm with real press ' +
    'coverage gets one built as a one-off, and it reads from here. Filling ' +
    'this in will not make anything appear on the site on its own. Outlet and ' +
    'headline only, never the article text (copyright).',
  fields: [
    {
      name: 'outlet',
      title: 'Outlet',
      type: 'string',
      description: 'The publication that ran the piece — e.g. "Los Angeles Times"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'headline',
      title: 'Headline',
      type: 'string',
      description:
        'The article headline as published, and nothing more. Do not paste the article text, an excerpt, or a quote from it — the outlet owns that writing. Link to the article instead.',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'url',
      title: 'Article URL',
      type: 'url',
      description: 'Optional. Link to the article on the outlet’s own site.',
    },
    {
      name: 'date',
      title: 'Publication Date',
      type: 'date',
      description:
        'Optional. The full date the piece ran — press mentions are conventionally cited with one, and a dated mention reads as more current than a bare year.',
      options: {dateFormat: 'YYYY-MM-DD'},
    },
    {
      name: 'outletLogo',
      title: 'Outlet Logo',
      type: 'image',
      description:
        'Optional — many firms have the mention without a usable logo. The block falls back to the outlet name set as text.',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
  ],

  // The headline is what an operator scans for; the outlet and date keep two
  // mentions of the same story distinguishable. Logo as media where one exists.
  preview: {
    select: {
      headline: 'headline',
      outlet: 'outlet',
      date: 'date',
      media: 'outletLogo',
    },
    prepare({headline, outlet, date, media}) {
      return {
        title: headline ?? 'Press Mention',
        subtitle: [outlet, date].filter(Boolean).join(' — '),
        media,
      }
    },
  },
})
