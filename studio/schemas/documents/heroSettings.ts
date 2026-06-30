import {defineType, defineField} from 'sanity'
import {heroImageField} from '../objects/heroSurfaceFields'

// ─── Hero Settings ────────────────────────────────────────────────────────────
// The single home for hero design across the site. Two INDEPENDENT sections:
//   • Internal Hero — site-level design defaults for every internal page hero
//     (scheme / background / foreground / scrim / scrim style / section bg). Each
//     page can override these in its own Hero settings (precedence: page > site).
//   • Homepage Hero — the homepage hero's design/layout (object `homeHeroDesign`),
//     decoupled from the internal defaults; the homepage hero's CONTENT (eyebrow /
//     heading / description / buttons) stays on the Homepage document.
//
// These defaults were moved here out of Design Settings ("Internal Hero" fieldset)
// to give hero a clear, prominent home. The Hero Merge / transparent-header
// behavior stays in Header Settings (it's a header behavior).

export const heroSettings = defineType({
  name: 'heroSettings',
  title: 'Hero Settings',
  type: 'document',
  groups: [
    {name: 'homepage', title: 'Homepage Hero', default: true},
    {name: 'internal', title: 'Internal Hero'},
  ],
  // Fieldsets give the flat "All fields" view (Sanity's auto tab whenever a doc
  // has field groups) a labeled, collapsible section, so an editor reading every
  // field at once can still tell the internal-page-hero defaults apart from the
  // homepage hero. Presentation only — field NAMES/VALUES/TYPES are unchanged, so
  // document shape, GROQ and rendering are unaffected (no migration).
  fieldsets: [
    {name: 'internalDefaults', title: 'Internal Hero', options: {collapsible: true, collapsed: false}},
  ],
  fields: [
    // ─── Homepage Hero (design) ───────────────────────────────────────────────
    // The homepage hero's design + layout. Its CONTENT (eyebrow / heading /
    // description / buttons) stays on the Homepage document (homePage.hero); only
    // the design lives here, so homepage + internal hero design sit side-by-side.
    // Declared first so the flat "All fields" view lists Homepage before Internal,
    // matching the group-tab order.
    defineField({
      name: 'homepageHero',
      title: 'Homepage Hero Design',
      type: 'homeHeroDesign',
      group: 'homepage',
      options: {collapsible: true, collapsed: false},
      description:
        'Design + layout for the homepage hero (the single unique hero on `/`). Pick a layout and set the backdrop / split / surface / scrim / section background / silo options here; the headline, copy, and buttons are authored on the Homepage document. • Hero Merge: when “Hero Merge” is enabled in Header Settings, the transparent header overlays this hero and the hero reserves the header’s clearance automatically — its header text/logo polarity follows the Background Scheme below. (Hero Merge is configured in Header Settings → Layout & Behavior.)',
    }),

    // ─── Internal Hero (site-level defaults) ──────────────────────────────────
    defineField({
      name: 'scheme',
      title: 'Default Background Scheme',
      type: 'string',
      group: 'internal',
      fieldset: 'internalDefaults',
      description:
        'Default color scheme for internal page heroes when NO background image is present. Dark = brand color + white text; Light = neutral tint + dark text. A page can override this. Also sets the Section Background scrim tone (dark → dark scrim, light → light scrim). • Hero Merge: when “Hero Merge” is enabled in Header Settings, the at-top header is transparent and overlays the hero — its text/logo polarity follows this scheme. (Hero Merge applies to internal heroes and the homepage hero alike; it’s configured in Header Settings → Layout & Behavior.)',
      options: {
        list: [
          {title: 'Dark — brand color, white text', value: 'dark'},
          {title: 'Light — neutral tint, dark text', value: 'light'},
        ],
        layout: 'radio',
      },
      initialValue: 'dark',
    }),
    heroImageField({
      name: 'backgroundImage',
      title: 'Default Background Image',
      group: 'internal',
      fieldset: 'internalDefaults',
      altLabel: 'internal hero background image',
      description:
        'Optional site-wide background image for internal page heroes (a focal photo). Pages inherit this; a page can override or force no image. When an image is present the hero is always dark (scrim + white text).',
      fit: {
        description: 'Cover fills the band (cropped). Tile repeats the image as a pattern.',
        coverTitle: 'Cover — fill the band',
        tileTitle: 'Tile — repeat as a pattern',
      },
    }),
    heroImageField({
      name: 'sectionBackgroundImage',
      title: 'Section Background',
      group: 'internal',
      fieldset: 'internalDefaults',
      altLabel: 'internal hero section background',
      description:
        'Optional full-bleed texture or repeating pattern behind internal heroes that have no focal Background Image. Use Tile for a seamless pattern, Cover for a single texture. Follows the Background Scheme for its scrim tone. A page can override or remove it.',
      fit: {coverTitle: 'Cover (single texture)', tileTitle: 'Tile (repeat pattern)'},
    }),
    defineField({
      name: 'scrimStyle',
      title: 'Scrim Style',
      type: 'string',
      group: 'internal',
      fieldset: 'internalDefaults',
      description:
        'Applies to the active full-bleed background (the Background Image or the Section Background). Flat = even overlay. Gradient = fades from full strength on the text side toward the image (more premium, keeps the image clearer). A page can override this.',
      options: {
        list: [
          {title: 'Flat (even overlay)', value: 'flat'},
          {title: 'Gradient (directional fade)', value: 'gradient'},
        ],
        layout: 'radio',
      },
      initialValue: 'flat',
    }),
    defineField({
      name: 'scrimOpacity',
      title: 'Scrim Opacity',
      type: 'number',
      group: 'internal',
      fieldset: 'internalDefaults',
      description:
        'Darkening overlay strength over hero background images (0 = none, 100 = solid). Keeps heading text readable. A page can override this.',
      initialValue: 80,
      validation: (Rule) => Rule.min(0).max(100),
    }),
    // Gradient-only controls — shown when Scrim Style = Gradient. 'auto' reproduces
    // the legacy behavior (color from the scheme, direction from content alignment).
    defineField({
      name: 'scrimColor',
      title: 'Gradient Color',
      type: 'string',
      group: 'internal',
      fieldset: 'internalDefaults',
      description:
        'Color of the gradient scrim. Auto follows the Background Scheme (brand color on dark heroes, page background on light). Action uses your CTA color; Black is a neutral darken.',
      options: {
        list: [
          {title: 'Auto — from scheme', value: 'auto'},
          {title: 'Action (CTA color)', value: 'action'},
          {title: 'Black (neutral darken)', value: 'black'},
        ],
        layout: 'radio',
      },
      initialValue: 'auto',
      hidden: ({document}) => (document as {scrimStyle?: string})?.scrimStyle !== 'gradient',
    }),
    defineField({
      name: 'scrimDirection',
      title: 'Gradient Direction',
      type: 'string',
      group: 'internal',
      fieldset: 'internalDefaults',
      description:
        'Direction the gradient fades. Auto follows content alignment (left text → fades right; centered text → fades up).',
      options: {
        list: [
          {title: 'Auto — follow text alignment', value: 'auto'},
          {title: 'To right →', value: 'to-right'},
          {title: 'To left ←', value: 'to-left'},
          {title: 'To top ↑', value: 'to-top'},
          {title: 'To bottom ↓', value: 'to-bottom'},
          {title: 'To top-right ↗', value: 'to-top-right'},
          {title: 'To top-left ↖', value: 'to-top-left'},
          {title: 'To bottom-right ↘', value: 'to-bottom-right'},
          {title: 'To bottom-left ↙', value: 'to-bottom-left'},
        ],
        layout: 'dropdown',
      },
      initialValue: 'auto',
      hidden: ({document}) => (document as {scrimStyle?: string})?.scrimStyle !== 'gradient',
    }),
    heroImageField({
      name: 'foregroundImage',
      title: 'Default Foreground Image',
      group: 'internal',
      fieldset: 'internalDefaults',
      altLabel: 'internal hero foreground image',
      description:
        'Optional site-wide foreground subject (e.g. attorney, building) shown bottom-right of every internal page hero, in full color above the scrim. Hidden on mobile. A page can override or hide it.',
    }),
    // Site-wide default internal-hero CTA buttons. Same shape as the per-page
    // internalHero `buttons` field (array of ctaButton) so the cascade (page
    // buttons override the site default, or "no buttons" on the page) resolves
    // without a shape mismatch. Wired in the runtime in commit 5.
    defineField({
      name: 'defaultButtons',
      title: 'Default Hero Buttons',
      type: 'array',
      group: 'internal',
      fieldset: 'internalDefaults',
      description:
        'Site-wide default CTA buttons shown on internal page heroes. Each page can override these with its own buttons, or suppress them, in its Hero settings.',
      of: [{type: 'ctaButton'}],
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Hero Settings'}
    },
  },
})
