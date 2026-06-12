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

export const practiceAreaNav = defineType({
  name: 'practiceAreaNav',
  title: 'Practice Area Navigation',
  type: 'document',
  fieldsets: [
    {
      name: 'navigation',
      title: 'Navigation Settings',
      description: 'How the navigation looks and behaves — button layout, grid, header placement, icons, and hover.',
      options: {collapsible: true, collapsed: false},
    },
    appearanceFieldset,
  ],
  fields: [
    {
      name: 'name',
      title: 'Section Name',
      type: 'string',
      description: 'Internal label — e.g. "Home Practice Areas"',
      validation: (Rule) => Rule.required().warning(),
    },
    {name: 'tagline', title: 'Tagline', type: 'string', components: {input: TokenStringInput}},
    {name: 'heading', title: 'Heading', type: 'string', components: {input: TokenStringInput}},
    {name: 'description', title: 'Description', type: 'text', rows: 2, components: {input: TokenTextInput}},
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
      name: 'showArrow',
      title: 'Show Arrow',
      type: 'boolean',
      fieldset: 'navigation',
      description: 'Show the “→” affordance on each button (layouts that have one).',
      initialValue: true,
    },
    {
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
    },
    {
      name: 'mode',
      title: 'Practice Area Source',
      type: 'string',
      options: {
        list: [
          {title: 'Curated — hand-pick and order', value: 'manual'},
          {title: 'All top-level practice areas', value: 'allTopLevel'},
        ],
        layout: 'radio',
      },
      initialValue: 'manual',
      validation: (Rule) => Rule.required().warning(),
    },
    defineField({
      name: 'items',
      title: 'Practice Areas',
      type: 'array',
      fieldset: undefined,
      hidden: ({document}) => document?.mode === 'allTopLevel',
      description:
        'Pick the practice-area pages to feature, in order of importance. Title, description, and image auto-fill from each page — override per item if needed.',
      of: [
        {
          type: 'object',
          name: 'practiceAreaNavItem',
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
        },
      ],
      validation: (Rule) =>
        Rule.custom((items: unknown[] | undefined, context) => {
          if (context.document?.mode !== 'allTopLevel' && (!items || items.length === 0)) {
            return {message: 'Add at least one practice area', level: 'warning' as const}
          }
          return true
        }),
    }),
    ...appearanceFields({defaultSurface: 'light'}),
  ],
  preview: {
    select: {title: 'name', subtitle: 'heading'},
    prepare({title, subtitle}: {title?: string; subtitle?: string}) {
      return {title: title ?? 'Practice Area Navigation', subtitle}
    },
  },
})
