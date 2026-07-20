import {defineType} from 'sanity'

// Standalone Sanity document — awards, designations and recognitions the firm
// has earned. Built once, selected into a Badges Section by reference, and
// reusable by the Badges / Awards block (Phase 3).
//
// Reference-only, like testimonial: `badgesSection` has no inline badge path.
// Re-uploading the same Super Lawyers image into six sections is exactly the
// duplication the item layer exists to remove.
//
// See BI-Library.md, Badge item.

export const badge = defineType({
  name: 'badge',
  title: 'Badge / Award',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Award Title',
      type: 'string',
      description: 'The recognition as it is formally named — e.g. "Super Lawyers Rising Star"',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'image',
      title: 'Badge Image',
      type: 'image',
      description: 'The badge or seal artwork. Transparent PNG or SVG reads best against any surface.',
      options: {hotspot: true},
      validation: (Rule) => Rule.required().warning(),
      fields: [
        {
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description:
            'Describe the badge for a screen reader — usually the award name and granting body, e.g. "Super Lawyers Rising Star, Thomson Reuters".',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'grantingBody',
      title: 'Granting Body',
      type: 'string',
      description:
        'WHO issued it — the organisation, publication or bar association behind the award, e.g. "Thomson Reuters" or "American Board of Trial Advocates". Not the award name, and not the firm. An award with no named issuer reads as self-awarded.',
    },
    {
      name: 'year',
      title: 'Year',
      type: 'string',
      description:
        'Optional. A single year ("2024") or a range ("2019–2021") — designations are often held for several consecutive years, so this is free text rather than a number.',
    },
    {
      name: 'explanation',
      title: 'Explanation',
      type: 'text',
      rows: 2,
      description:
        'One or two sentences on WHAT the award means and how hard it is to get — for visitors who will not recognise the name. "Awarded to the top 2.5% of attorneys under 40 in the state" earns trust; the bare logo does not. Leave blank only for recognitions a layperson already understands.',
    },
    {
      name: 'url',
      title: 'Source URL',
      type: 'url',
      description: 'Optional. Link to the award listing on the granting body’s own site, where the recognition can be verified.',
    },
  ],

  // The award name is what an operator scans for; the granting body and year
  // keep repeated annual designations distinguishable. Artwork as media.
  preview: {
    select: {
      name: 'name',
      grantingBody: 'grantingBody',
      year: 'year',
      media: 'image',
    },
    prepare({name, grantingBody, year, media}) {
      return {
        title: name ?? 'Badge / Award',
        subtitle: [grantingBody, year].filter(Boolean).join(' — '),
        media,
      }
    },
  },
})
