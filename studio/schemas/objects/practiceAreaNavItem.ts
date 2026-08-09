import {defineType} from 'sanity'

// Reusable practice-area nav item — references a practice-area page (title /
// description / image auto-resolve from it) with per-item overrides. Used by BOTH
// the full-width Practice Area Navigation section AND the `siloNavBlock` canvas
// block, so the two share one item model. Extracted from the inline definition
// that previously lived in documents/sections/practiceAreaNav.ts (same name +
// fields, so existing section data is unaffected). The homepage hero's content
// strip was a third user of it until 2026-08-09, when the ruling on monorepo
// `OUTSTANDING.md` item 163 removed that strip.

export const practiceAreaNavItem = defineType({
  name: 'practiceAreaNavItem',
  title: 'Practice Area Item',
  type: 'object',
  fields: [
    {
      name: 'page',
      title: 'Practice Area Page',
      type: 'reference',
      to: [{type: 'practiceArea'}, {type: 'geoPracticeArea'}, {type: 'serviceAreaPage'}],
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'featured',
      title: 'Primary',
      type: 'boolean',
      description: 'Mark the firm’s priority practice area — it becomes the large hero tile in Bento grid mode.',
      initialValue: false,
      // Bento is a Practice Area Navigation section mode only — no other surface
      // using this item type has a Bento layout, so Primary does nothing there.
      // Hide it outside the section document to keep those surfaces clean.
      hidden: ({document}: {document?: {_type?: string}}) => document?._type !== 'practiceAreaNav',
    },
    {name: 'label', title: 'Label (override)', type: 'string', description: 'Defaults to the page title'},
    {
      name: 'description',
      title: 'Description (override)',
      type: 'text',
      rows: 2,
      description: 'Defaults to the page meta description',
    },
    {name: 'icon', title: 'Icon', type: 'image', description: 'Optional line/glyph icon for icon-based layouts'},
    {
      name: 'image',
      title: 'Image (override)',
      type: 'image',
      description: 'Defaults to the page hero image — used by image-based layouts',
    },
  ],
  preview: {
    select: {title: 'page.title', label: 'label', media: 'icon', featured: 'featured'},
    prepare({title, label, media, featured}) {
      return {title: label || title || 'Practice area', subtitle: featured ? '★ Primary' : undefined, media}
    },
  },
})
