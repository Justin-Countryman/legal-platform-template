// ─── Shared section Appearance fieldset ─────────────────────────────────────────
// Spread into every full-width section document so the operator can place it on a
// surface (light / tint / dark / accent / image) with a spacing rhythm — the
// cohesion layer that lets a stacked page read as one design. Each section sets a
// sensible default via appearanceFields({defaultSurface}), so an untouched page is
// clean and cohesive with zero effort. Mirrors the site's footerScheme cascade.
//
// Usage in a section schema:
//   fieldsets: [appearanceFieldset, ...],
//   fields: [ ...sectionFields, ...appearanceFields({defaultSurface: 'tint'}) ]

import {defineField} from 'sanity'

// Mirror of the site's SectionSurface/SectionSpacing unions — the studio is a separate
// package, so don't import across the studio↔site boundary (keeps studio tsc green and
// the file portable to the canonical template).
type SectionSurface = 'light' | 'tint' | 'dark' | 'accent' | 'image'
type SectionSpacing = 'compact' | 'normal' | 'spacious'

export const appearanceFieldset = {
  name: 'appearance',
  title: 'Section Appearance',
  options: {collapsible: true, collapsed: true},
}

const SURFACE_OPTIONS = [
  {title: 'Light — page background', value: 'light'},
  {title: 'Tint — soft neutral wash', value: 'tint'},
  {title: 'Dark — brand background, light text', value: 'dark'},
  {title: 'Accent — soft accent wash', value: 'accent'},
  {title: 'Image — background photo with overlay', value: 'image'},
]

const SPACING_OPTIONS = [
  {title: 'Compact — tighter band (≈48–64px)', value: 'compact'},
  {title: 'Normal — standard rhythm (≈64–112px)', value: 'normal'},
  {title: 'Spacious — roomy, more prominence (≈96–160px)', value: 'spacious'},
]

export function appearanceFields(opts?: {
  defaultSurface?: SectionSurface
  defaultSpacing?: SectionSpacing
}) {
  return [
    defineField({
      name: 'surface',
      title: 'Surface',
      type: 'string',
      fieldset: 'appearance',
      description: 'The background this section sits on. Alternate surfaces down a page for rhythm; text contrast resolves automatically.',
      options: {list: SURFACE_OPTIONS, layout: 'radio'},
      initialValue: opts?.defaultSurface ?? 'light',
    }),
    defineField({
      name: 'sectionBackgroundImage',
      title: 'Background Image',
      type: 'image',
      fieldset: 'appearance',
      description: 'Shown only when Surface is "Image". A dark overlay is applied for legible text.',
      hidden: ({document}) => document?.surface !== 'image',
    }),
    defineField({
      name: 'spacing',
      title: 'Vertical Spacing',
      type: 'string',
      fieldset: 'appearance',
      description:
        'The empty space (padding) above and below this section’s content — applied equally to the top and bottom (the left/right gutter is fixed). It controls how much the section breathes and how far it sits from the sections above and below. Each section adds its own, so the gap between two sections is the sum of both. Scales up on larger screens.',
      options: {list: SPACING_OPTIONS, layout: 'radio'},
      initialValue: opts?.defaultSpacing ?? 'normal',
    }),
  ]
}
