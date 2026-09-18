// ─── Shared section Appearance fieldset ─────────────────────────────────────────
// Spread into every full-width section (document and its inline copy) so the operator can place it on a
// surface (light / tint / dark / image / pattern) with a spacing rhythm — the
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
type SectionSurface = 'light' | 'tint' | 'dark' | 'image' | 'pattern' | 'saturated'
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
  {title: 'Image — background photo with overlay', value: 'image'},
  {title: 'Pattern — the page background shows through', value: 'pattern'},
]

// Offered only where a section passes its button context and draws nothing in the
// action colour, which can equal the fill: the content section (Phase 15, §7
// amendment 17). The label never starts with "Accent", so a band stored with the
// retired `accent` value (which renders a light step, not a fill) is not flipped
// to a colour fill by hand.
const SATURATED_OPTION = {title: 'Saturated — the accent colour fills the section; text turns white or dark to read', value: 'saturated'}

const SPACING_OPTIONS = [
  {title: 'Compact — tighter band (≈48–64px)', value: 'compact'},
  {title: 'Normal — standard rhythm (≈64–112px)', value: 'normal'},
  {title: 'Spacious — roomy, more prominence (≈96–160px)', value: 'spacious'},
]

export function appearanceFields(opts?: {
  defaultSurface?: SectionSurface
  defaultSpacing?: SectionSpacing
  /** Seed `surface` and `spacing` with a Studio default. TRUE for the six
   *  sections that already had this fieldset, so their stored data and their
   *  `initialDocument`s do not move; FALSE for the five Phase 13 added, because
   *  a seed here is folded into every band the build writes and could never be
   *  told from an operator's choice (item 308, [R-450]).
   *
   *  The asymmetry is deliberate and temporary. Phase 16 removes the seed from
   *  the other six, which is a visible change on two tint-default types and so
   *  is not this phase's to make, and deletes this parameter. Until then the
   *  five new sections take their default surface from CODE, per layout, which
   *  is also what lets Phase 16's `surfaceRhythm` reach them. */
  seed?: boolean
  /** Offer the `saturated` surface. Only the content section does (Phase 15). */
  offerSaturated?: boolean
}) {
  const seed = opts?.seed !== false
  const surfaceOptions = opts?.offerSaturated ? [...SURFACE_OPTIONS.slice(0, 3), SATURATED_OPTION, ...SURFACE_OPTIONS.slice(3)] : SURFACE_OPTIONS
  return [
    defineField({
      name: 'surface',
      title: 'Surface',
      type: 'string',
      fieldset: 'appearance',
      description: 'The background this section sits on. Alternate surfaces down a page for rhythm; text contrast resolves automatically. \u201CPattern\u201D paints no background of its own so the page background shows through, so it looks the same as \u201CLight\u201D on a site whose Design Settings set no page background.',
      options: {list: surfaceOptions, layout: 'radio'},
      ...(seed ? {initialValue: opts?.defaultSurface ?? 'light'} : {}),
    }),
    defineField({
      name: 'sectionBackgroundImage',
      title: 'Background Image',
      type: 'image',
      fieldset: 'appearance',
      description: 'Shown only when Surface is "Image". A dark overlay is applied for legible text.',
      // `parent`, never `document`: inside an inline section on the homepage
      // list `document` is the root homePage and this would hide the image on
      // every inline section. For a top-level document field `parent` IS the
      // document value (Phase 10, 2026-09-14).
      hidden: ({parent}) => (parent as {surface?: string} | undefined)?.surface !== 'image',
    }),
    // ─── The section frame (Phase 13) ──────────────────────────────────────
    // NONE OF THE THREE FIELDS BELOW CARRIES AN `initialValue`, and that is
    // load-bearing rather than an oversight. `compose_canvas` passes every
    // member through `fold_member_defaults`, which writes a schema default into
    // any empty key, so a seeded frame field would be stamped onto every band
    // the build writes and could never be told from an operator's choice
    // (item 308, [R-450]). A boolean is not the safe case: `initialValue: false`
    // is folded too, because `_is_empty(False)` is False. Measured both ways in
    // the Phase 13 challenge. `studio/scripts/verify-inline-sections.ts` holds
    // this by name.
    defineField({
      name: 'inset',
      title: 'Inset Panel',
      type: 'boolean',
      fieldset: 'appearance',
      description:
        'Render this section as a panel inside the page margin, with the page background showing around it, instead of edge to edge. The panel keeps the Surface you chose and takes the site\u2019s corner radius.',
    }),
    defineField({
      name: 'edgeBottom',
      title: 'Bottom Edge',
      type: 'string',
      fieldset: 'appearance',
      description:
        'The shape of the join where this section meets the next one. Angled suits a sharp-cornered, hard-edged design and looks out of place on a soft, rounded one. Desktop and tablet only: phones always render a straight edge. It draws nothing when this section has a background photo or the Pattern surface, because there is no solid colour to cut.',
      options: {
        list: [
          {title: 'Straight', value: 'flat'},
          {title: 'Angled \u2014 a diagonal cut into the next section', value: 'angled'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'overlapPrevious',
      title: 'Overlap the Section Above',
      type: 'string',
      fieldset: 'appearance',
      description:
        'Pull this section up so it rides over the one above it, tying the two together. It only ever covers the empty space at the bottom of the section above, never its text. Desktop and tablet only: phones stack normally.',
      options: {
        list: [
          {title: 'None', value: 'none'},
          {title: 'Small', value: 'small'},
          {title: 'Large', value: 'large'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'spacing',
      title: 'Vertical Spacing',
      type: 'string',
      fieldset: 'appearance',
      description:
        'The empty space (padding) above and below this section’s content — applied equally to the top and bottom (the left/right gutter is fixed). It controls how much the section breathes and how far it sits from the sections above and below. Each section adds its own, so the gap between two sections is the sum of both. Scales up on larger screens.',
      options: {list: SPACING_OPTIONS, layout: 'radio'},
      ...(seed ? {initialValue: opts?.defaultSpacing ?? 'normal'} : {}),
    }),
  ]
}
