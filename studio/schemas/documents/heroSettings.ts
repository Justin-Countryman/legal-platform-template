import {defineType, defineField} from 'sanity'
import {heroImageField} from '../objects/heroSurfaceFields'

// ─── Hero Settings ────────────────────────────────────────────────────────────
// The single home for hero design across the site. Two INDEPENDENT sections:
//   • Internal Hero — site-level design defaults for every internal page hero
//     (scheme / background / foreground / scrim / scrim style / section bg). Each
//     page can override these in its own Hero settings (precedence: page > site).
//   • Homepage Hero — added in Phase 2 (its own design/layout, decoupled from the
//     internal defaults; content stays on the Homepage document).
//
// These defaults were moved here out of Design Settings ("Internal Hero" fieldset)
// to give hero a clear, prominent home. The Hero Merge / transparent-header
// behavior stays in Header Settings (it's a header behavior).

export const heroSettings = defineType({
  name: 'heroSettings',
  title: 'Hero Settings',
  type: 'document',
  groups: [
    // 'homepage' group is added in Phase 2.
    {name: 'internal', title: 'Internal Hero', default: true},
  ],
  fields: [
    defineField({
      name: 'scheme',
      title: 'Default Background Scheme',
      type: 'string',
      group: 'internal',
      description:
        'Default color scheme for internal page heroes when NO background image is present. Dark = brand color + white text; Light = neutral tint + dark text. A page can override this. Also sets the Section Background scrim tone (dark → dark scrim, light → light scrim).',
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
      description:
        'Darkening overlay strength over hero background images (0 = none, 100 = solid). Keeps heading text readable. A page can override this.',
      initialValue: 80,
      validation: (Rule) => Rule.min(0).max(100),
    }),
    heroImageField({
      name: 'foregroundImage',
      title: 'Default Foreground Image',
      group: 'internal',
      altLabel: 'internal hero foreground image',
      description:
        'Optional site-wide foreground subject (e.g. attorney, building) shown bottom-right of every internal page hero, in full color above the scrim. Hidden on mobile. A page can override or hide it.',
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Hero Settings'}
    },
  },
})
