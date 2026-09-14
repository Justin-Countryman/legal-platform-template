import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../../components/TokenStringInput'
import {TokenTextInput} from '../../../components/TokenTextInput'
import {appearanceFieldset, appearanceFields} from '../../objects/appearanceFields'

// Practice-area "silo" navigation section — the curated grid of links to the
// firm's primary practice-area pages (ranked by importance; may mix parent + child
// levels, e.g. Family Law and its child Divorce). Each item references a page so
// the href, title, description, and image auto-resolve; per-item overrides let an
// operator tune the label/description/icon/image. `layout` selects the visual
// treatment (the cardStyle → dispatcher pattern); more variants land after review.
//
// ─── One field list, two registrations (Phase 10, 2026-09-14) ─────────────────
//
// `fields({inline})` is the single source of this section's fields. The DOCUMENT
// (`practiceAreaNav`) is the shared, referenced section interior pages use. The
// INLINE OBJECT (`practiceAreaNavInline`) is the page-owned copy the homepage
// list (`homePage.canvas`) holds, so editing it changes one page and no other
// (`[R-434]`; monorepo WS-V1-PHASE10-DESIGN). Two names because Sanity's type
// registry is one namespace. Every callback below reads `parent`, never
// `document`: inside an array member `document` is the root `homePage`, so a
// `document`-scoped callback hides and warns wrongly there. For a top-level
// document field `parent` IS the document value, so the document is unchanged.
//
// What differs inline: no `name` (a block is found by opening its page, not in
// a list), `mode` defaults to every top-level area (Beat 4: never curate or
// hide areas on the homepage), and the preview reads `heading`, never `name`.

const navigationFieldset = {
  name: 'navigation',
  title: 'Navigation Settings',
  description: 'How the navigation looks and behaves — button layout, grid, header placement, icons, and hover.',
  options: {collapsible: true, collapsed: false},
}

export function fields({inline}: {inline: boolean}) {
  return [
    ...(inline
      ? []
      : [
          defineField({
            name: 'name',
            title: 'Section Name',
            type: 'string',
            description: 'Internal label — e.g. "Home Practice Areas"',
            validation: (Rule) => Rule.required().warning(),
          }),
        ]),
    defineField({name: 'tagline', title: 'Tagline', type: 'string', components: {input: TokenStringInput}}),
    defineField({name: 'heading', title: 'Heading', type: 'string', components: {input: TokenStringInput}}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 2, components: {input: TokenTextInput}}),
    defineField({
      name: 'layout',
      title: 'Button Layout',
      type: 'string',
      fieldset: 'navigation',
      description: 'How each practice-area button is composed. Photo-capable: Spotlight, Feature, Tile, and the panel of Split.',
      options: {
        list: [
          {title: 'Spotlight — photo cover, large label over it', value: 'spotlight'},
          {title: 'Feature — tall editorial card: icon, label, blurb', value: 'feature'},
          {title: 'Tile — compact: icon + label + blurb (optional photo)', value: 'tile'},
          {title: 'Inline — fill row: icon, label, and blurb', value: 'inline'},
          {title: 'Split — two-column card: photo panel + content', value: 'split'},
        ],
        layout: 'radio',
      },
      initialValue: 'spotlight',
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'gridMode',
      title: 'Grid Mode',
      type: 'string',
      fieldset: 'navigation',
      description:
        'Equal renders your chosen Button Layout in an even grid. Bento renders a unified photo mosaic with the Primary practice area as a large hero tile (mark one below).',
      options: {
        list: [
          {title: 'Equal — even grid (uses Button Layout)', value: 'equal'},
          {title: 'Bento — Hero Left (2×2 hero, even field)', value: 'bentoLeft'},
          {title: 'Bento — Mosaic (hero + varied tiles for rhythm)', value: 'bentoMosaic'},
          {title: 'Bento — Feature & List (hero + scannable list)', value: 'bentoList'},
        ],
        layout: 'radio',
      },
      initialValue: 'equal',
    }),
    defineField({
      name: 'sectionLayout',
      title: 'Section Layout',
      type: 'string',
      fieldset: 'navigation',
      description: 'Where the heading/tagline/description sit relative to the buttons (independent of the button layout).',
      options: {
        list: [
          {title: 'Centered — header centered above the grid', value: 'centered'},
          {title: 'Left — header left-aligned above the grid', value: 'left'},
          {title: 'Aside — sticky header column on the left, grid on the right', value: 'aside'},
          {title: 'Banner — heading left, description right, grid below', value: 'banner'},
        ],
        layout: 'radio',
      },
      initialValue: 'centered',
    }),
    defineField({
      name: 'mobileDisplay',
      title: 'Mobile Display',
      type: 'string',
      fieldset: 'navigation',
      description:
        'How this section presents on phones (under ~768px). Desktop always uses the Button Layout above. Carousel = swipe through cards with a peek + dots. Stacked = full cards in a vertical list (all visible). Compact list = icon + label rows, no photos (fastest, most scannable).',
      options: {
        list: [
          {title: 'Carousel — swipe through cards (peek + dots)', value: 'carousel'},
          {title: 'Stacked — full cards, vertical (all visible)', value: 'stacked'},
          {title: 'Compact list — icon + label rows, no photos', value: 'list'},
        ],
        layout: 'radio',
      },
      initialValue: 'carousel',
    }),
    defineField({
      name: 'iconPosition',
      title: 'Icon Position',
      type: 'string',
      fieldset: 'navigation',
      description:
        'Where the icon sits relative to the label. Auto = each layout’s natural spot. None hides icons. Each layout uses the positions that fit its shape.',
      options: {
        list: [
          {title: 'Auto (layout default)', value: 'auto'},
          {title: 'Top of label', value: 'top'},
          {title: 'Left of label', value: 'left'},
          {title: 'Right of label', value: 'right'},
          {title: 'None — hide icons', value: 'none'},
        ],
        layout: 'radio',
      },
      initialValue: 'auto',
    }),
    defineField({
      name: 'showArrow',
      title: 'Show Arrow',
      type: 'boolean',
      fieldset: 'navigation',
      description: 'Show the “→” affordance on each button (layouts that have one).',
      initialValue: true,
    }),
    defineField({
      name: 'hoverEffects',
      title: 'Hover Effects',
      type: 'array',
      fieldset: 'navigation',
      of: [{type: 'string'}],
      description:
        'Pick one or more — every selected effect applies together on hover. Leave empty for the layout’s recommended default; choose None for a fully static hover (None overrides the others).',
      options: {
        list: [
          {title: 'Image Zoom — background photo scales', value: 'imageZoom'},
          {title: 'Grayscale → Color — photo is B&W at rest, colours on hover', value: 'grayscale'},
          {title: 'Lift — tile raises with soft elevation', value: 'lift'},
          {title: 'Glow — accent glow fades in', value: 'glow'},
          {title: 'Accent Border — border draws to the accent', value: 'accentBorder'},
          {title: 'Accent Underline — a rule draws under the label', value: 'accentUnderline'},
          {title: 'Icon Pop — the icon lifts and scales (icon tiles)', value: 'iconPop'},
          {title: 'None — fully static (focus ring only)', value: 'none'},
        ],
      },
    }),
    defineField({
      name: 'mode',
      title: 'Practice Area Source',
      type: 'string',
      description: inline
        ? 'Every area of law is the homepage default — Beat 4 says never curate or hide areas. Choose Curated only when the firm has a specific reason to.'
        : undefined,
      options: {
        list: inline
          ? [
              {title: 'All top-level practice areas', value: 'allTopLevel'},
              {title: 'Curated — hand-pick and order', value: 'manual'},
            ]
          : [
              {title: 'Curated — hand-pick and order', value: 'manual'},
              {title: 'All top-level practice areas', value: 'allTopLevel'},
            ],
        layout: 'radio',
      },
      initialValue: inline ? 'allTopLevel' : 'manual',
      validation: (Rule) => Rule.required().warning(),
    }),
    defineField({
      name: 'items',
      title: 'Practice Areas',
      type: 'array',
      hidden: ({parent}) => (parent as {mode?: string} | undefined)?.mode === 'allTopLevel',
      description:
        'Pick the practice-area pages to feature, in order of importance. Title, description, and image auto-fill from each page — override per item if needed.',
      of: [{type: 'practiceAreaNavItem'}],
      validation: (Rule) =>
        Rule.custom((items: unknown[] | undefined, context) => {
          const parent = context.parent as {mode?: string} | undefined
          if (parent?.mode !== 'allTopLevel' && (!items || items.length === 0)) {
            return {message: 'Add at least one practice area', level: 'warning' as const}
          }
          return true
        }).warning(),
    }),
    ...appearanceFields({defaultSurface: 'light'}),
  ]
}

export const practiceAreaNav = defineType({
  name: 'practiceAreaNav',
  title: 'Practice Area Navigation',
  type: 'document',
  fieldsets: [navigationFieldset, appearanceFieldset],
  fields: fields({inline: false}),
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}: {title?: string; subtitle?: string}) {
      return {title: title ?? 'Practice Area Navigation', subtitle}
    },
  },
})

export const practiceAreaNavInline = defineType({
  name: 'practiceAreaNavInline',
  title: 'Practice Area Navigation',
  type: 'object',
  fieldsets: [navigationFieldset, appearanceFieldset],
  fields: fields({inline: true}),
  preview: {
    select: {heading: 'heading', layout: 'layout', mode: 'mode'},
    prepare({heading, layout, mode}: {heading?: string; layout?: string; mode?: string}) {
      const source = mode === 'manual' ? 'curated' : 'every top-level practice area'
      return {
        title: heading || 'Practice Area Navigation',
        subtitle: `Practice Area Navigation · ${layout ?? 'spotlight'} · ${source}`,
      }
    },
  },
})
