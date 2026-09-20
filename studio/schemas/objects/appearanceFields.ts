// ─── Shared section Appearance fieldset ─────────────────────────────────────────
// Spread into every full-width section (document and its inline copy) so the operator can place it on a
// surface (light / tint / dark / image / pattern) with a spacing rhythm — the
// cohesion layer that lets a stacked page read as one design.
//
// NO FIELD HERE CARRIES AN `initialValue` (Phase 16A, item 308). A seed is folded
// into every band the build writes and stamped on every band an operator adds in
// Studio, where nothing can tell it from a choice, so a theme could never set it.
// An unset surface or spacing renders the section's code default (the shell's
// light and normal, or the section's own, such as a ribbon's compact).
//
// Usage in a section schema:
//   fieldsets: [appearanceFieldset, ...],
//   fields: [ ...sectionFields, ...appearanceFields({offerPattern: inline}) ]

import {defineField} from 'sanity'

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
]

// Offered on homepage sections only (Phase 16A, [R-472]): interior pages are
// always a clean ground, so the section documents they use never offer it, and a
// value stored on one before then renders as Light.
const PATTERN_OPTION = {title: 'Pattern — the site texture (Design Settings) on the light background', value: 'pattern'}

// Offered only where a section passes its button context and draws nothing in the
// action color, which can equal the fill: the content section (Phase 15, §7
// amendment 17). The label never starts with "Accent", so a band stored with the
// retired `accent` value (which renders a light step, not a fill) is not flipped
// to a color fill by hand.
const SATURATED_OPTION = {title: 'Saturated — the accent color fills the section; text turns white or dark to read', value: 'saturated'}

// Phase 16C ([R-481]): a section no longer asks for an edge. A divider is placed by one
// rule — under the hero, and wherever the homepage enters a dark or saturated section —
// with the shape the site picked in Design Settings, so `edgeBottom` is gone from every
// type. A value stored on a band before then renders nothing.

const SPACING_OPTIONS = [
  {title: 'Compact — tighter band (≈48–64px)', value: 'compact'},
  {title: 'Normal — standard rhythm (≈64–112px)', value: 'normal'},
  {title: 'Spacious — roomy, more prominence (≈96–160px)', value: 'spacious'},
]

export function appearanceFields(opts?: {
  /** Offer the `saturated` surface. Only the content section does (Phase 15). */
  offerSaturated?: boolean
  /** Offer the `pattern` surface. Only the homepage's inline copies do (Phase 16A). */
  offerPattern?: boolean
}) {
  const surfaceOptions = [
    ...SURFACE_OPTIONS.slice(0, 3),
    ...(opts?.offerSaturated ? [SATURATED_OPTION] : []),
    ...SURFACE_OPTIONS.slice(3),
    ...(opts?.offerPattern ? [PATTERN_OPTION] : []),
  ]
  return [
    defineField({
      name: 'surface',
      title: 'Surface',
      type: 'string',
      fieldset: 'appearance',
      description: 'The background this section sits on. Alternate surfaces down a page for rhythm; text contrast resolves automatically.',
      options: {list: surfaceOptions, layout: 'radio'},
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
      name: 'overlapPrevious',
      title: 'Overlap the Section Above',
      type: 'string',
      fieldset: 'appearance',
      description:
        'Pull this inset panel up so it rises into the section above, tying the two together. The section above makes room for it, so its text is never covered. Desktop and tablet only: phones stack normally.',
      // An inset panel only (Phase 16A, [R-475]): a full-width section that
      // overlapped only hid the bottom of the section above. `parent`, never
      // `document`, for the reason given on `sectionBackgroundImage` above.
      hidden: ({parent}) => (parent as {inset?: boolean} | undefined)?.inset !== true,
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
    }),
  ]
}
