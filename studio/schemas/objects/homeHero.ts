import {defineType, defineField} from 'sanity'
import {TokenStringInput} from '../../components/TokenStringInput'
import {TokenTextInput} from '../../components/TokenTextInput'
import {show} from './homeHeroReveal'
import {heroAltField, heroImageField} from './heroSurfaceFields'

// ─── Homepage Hero ────────────────────────────────────────────────────────────
// Pick a Layout (Overlay or Split), then set the options directly — fields reveal
// based on the layout + choices (see homeHeroReveal.ts). No presets / no inherit
// cascade for layout settings; every field has a concrete default. The shared
// surface fields (scheme / background / foreground images / scrim) still inherit
// the SITE design-settings defaults, exactly like internalHero.

type HiddenCtx = {parent?: Record<string, unknown>}
const hide = (pred: (p: Record<string, unknown> | undefined) => boolean) => ({parent}: HiddenCtx) => !pred(parent)

const radio = (list: {title: string; value: string}[]) => ({list, layout: 'radio' as const})

export const homeHero = defineType({
  name: 'homeHero',
  title: 'Homepage Hero',
  type: 'object',
  options: {collapsible: true, collapsed: false},
  fieldsets: [
    {name: 'content', title: 'Content', options: {collapsible: true, collapsed: false}},
    {name: 'layout', title: 'Layout', options: {collapsible: true, collapsed: false}},
    {name: 'background', title: 'Background', options: {collapsible: true, collapsed: false}},
    {name: 'foreground', title: 'Foreground Figure', options: {collapsible: true, collapsed: false}},
    {name: 'media', title: 'Media', options: {collapsible: true, collapsed: false}},
    {name: 'strip', title: 'Silo Nav', options: {collapsible: true, collapsed: false}},
  ],
  fields: [
    // ─── Content ──────────────────────────────────────────────────────────────
    defineField({name: 'eyebrow', title: 'Eyebrow / Tagline', type: 'string', fieldset: 'content', components: {input: TokenStringInput}, description: 'Optional small label above the headline.'}),
    defineField({name: 'heading', title: 'Heading (H1)', type: 'string', fieldset: 'content', components: {input: TokenStringInput}, validation: (Rule) => Rule.required().warning()}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 3, fieldset: 'content', components: {input: TokenTextInput}}),
    defineField({name: 'buttons', title: 'Buttons', type: 'array', fieldset: 'content', of: [{type: 'ctaButton'}]}),

    // ─── Layout ───────────────────────────────────────────────────────────────
    defineField({
      name: 'skeleton',
      title: 'Layout',
      type: 'string',
      fieldset: 'layout',
      description: 'Overlay = content over a backdrop. Split = text beside media.',
      options: radio([{title: 'Overlay (content over a backdrop)', value: 'overlay'}, {title: 'Split (text + media)', value: 'split'}]),
      initialValue: 'overlay',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'heightMode', title: 'Height', type: 'string', fieldset: 'layout', options: radio([{title: 'Content height', value: 'content'}, {title: 'Full viewport', value: 'fullViewport'}]), initialValue: 'content'}),
    defineField({name: 'contentAlign', title: 'Content Alignment', type: 'string', fieldset: 'layout', options: radio([{title: 'Left', value: 'left'}, {title: 'Center', value: 'center'}]), initialValue: 'left'}),
    // Overlay options
    defineField({name: 'backdrop', title: 'Backdrop', type: 'string', fieldset: 'layout', options: radio([{title: 'None (scheme color)', value: 'none'}, {title: 'Single image', value: 'image'}, {title: 'Image mosaic', value: 'mosaic'}]), initialValue: 'image', hidden: hide(show.overlay)}),
    defineField({name: 'foreground', title: 'Foreground figure', type: 'boolean', fieldset: 'layout', description: 'Cut-out subject in front of the backdrop (left-aligned overlays only).', initialValue: false, hidden: hide(show.foregroundToggle)}),
    defineField({name: 'contentStrip', title: 'Silo Nav strip', type: 'boolean', fieldset: 'layout', description: 'Practice-area card row beneath the hero content (works on both Overlay and Split).', initialValue: false}),
    // Split options
    defineField({name: 'splitMedia', title: 'Media type', type: 'string', fieldset: 'layout', options: radio([{title: 'Image', value: 'image'}, {title: 'Video lightbox', value: 'video'}]), initialValue: 'image', hidden: hide(show.split)}),
    defineField({name: 'splitImageStyle', title: 'Image style', type: 'string', fieldset: 'layout', description: 'Contained = rounded panel (set ratio below). Full = edge-to-edge. Overlap = 3-image collage (uses Gallery Images).', options: radio([{title: 'Contained (rounded panel)', value: 'contained'}, {title: 'Full (edge-to-edge)', value: 'full'}, {title: 'Overlap (3-image collage)', value: 'overlap'}]), initialValue: 'contained', hidden: hide(show.imageStyle)}),
    defineField({name: 'splitImageRatio', title: 'Image ratio', type: 'string', fieldset: 'layout', description: 'Aspect ratio of the contained image panel / video poster. Auto = natural ratio (no crop); video Auto = 16:9.', options: {list: [{title: 'Auto (natural ratio)', value: 'auto'}, {title: 'Anamorphic (2.39:1)', value: 'anamorphic'}, {title: 'Univisium (2:1)', value: 'univisium'}, {title: 'Widescreen (16:9)', value: 'widescreen'}, {title: 'Landscape (3:2)', value: 'landscape'}, {title: 'Square (1:1)', value: 'square'}, {title: 'Portrait (2:3)', value: 'portrait'}], layout: 'dropdown'}, initialValue: 'landscape', hidden: hide(show.imageRatio)}),
    defineField({name: 'textTreatment', title: 'Text treatment', type: 'string', fieldset: 'layout', options: radio([{title: 'Inline', value: 'inline'}, {title: 'Overlap (card over image)', value: 'overlap'}]), initialValue: 'inline', hidden: hide(show.split)}),
    defineField({name: 'mediaSide', title: 'Media side', type: 'string', fieldset: 'layout', options: radio([{title: 'Right', value: 'right'}, {title: 'Left', value: 'left'}]), initialValue: 'right', hidden: hide(show.split)}),
    // Motion (only valid values for the chosen layout take effect)
    defineField({name: 'motion', title: 'Content animation', type: 'string', fieldset: 'layout', description: 'On-load animation of the hero content (eyebrow / heading / copy / buttons). Respects reduced-motion.', options: {list: [{title: 'None', value: 'none'}, {title: 'Fade in (slow)', value: 'fade'}, {title: 'Entrance (fade + rise)', value: 'entrance'}, {title: 'Stagger — each line rises in sequence', value: 'stagger'}, {title: 'Stagger — each line from the right', value: 'staggerRight'}, {title: 'Slide in (from left)', value: 'slide'}], layout: 'dropdown'}, initialValue: 'none'}),

    // ─── Background ───────────────────────────────────────────────────────────
    defineField({
      name: 'schemeOverride',
      title: 'Background Scheme',
      type: 'string',
      fieldset: 'background',
      description: 'Color scheme for the text area (when text is not over a full-bleed image).',
      options: radio([{title: 'Inherit site default', value: 'inherit'}, {title: 'Dark — brand color, white text', value: 'dark'}, {title: 'Light — neutral tint, dark text', value: 'light'}]),
      initialValue: 'inherit',
      hidden: hide(show.scheme),
    }),
    heroImageField({
      name: 'backgroundImage',
      title: 'Background / Feature Image',
      fieldset: 'background',
      altLabel: 'hero background image',
      // Tile only applies to the full-bleed Overlay backdrop; in Split the image is
      // always a cover panel/poster, so hide Fit there. `document.hero` is the
      // homeHero object (homePage.hero) — the nested field can't see it via `parent`.
      fit: {hidden: ({document}) => show.split((document as {hero?: Record<string, unknown>})?.hero)},
      hidden: hide(show.bgImage),
    }),
    defineField({name: 'backgroundNone', title: 'No background image', type: 'boolean', fieldset: 'background', initialValue: false, hidden: hide(show.bgImage)}),
    defineField({
      name: 'scrimStyle',
      title: 'Scrim Style',
      type: 'string',
      fieldset: 'background',
      description: 'Flat = even dark overlay. Gradient = fades from full strength on the text side toward the photo (more premium, keeps the image clearer).',
      options: radio([{title: 'Flat (even overlay)', value: 'flat'}, {title: 'Gradient (directional fade)', value: 'gradient'}]),
      initialValue: 'flat',
      hidden: hide(show.scrim),
    }),
    defineField({name: 'scrimOpacityOverride', title: 'Scrim Opacity (0–100)', type: 'number', fieldset: 'background', description: 'Dark overlay strength over the background image, for text legibility. Leave empty to inherit.', validation: (Rule) => Rule.min(0).max(100), hidden: hide(show.scrim)}),

    // ─── Foreground figure ────────────────────────────────────────────────────
    heroImageField({name: 'foregroundImage', title: 'Foreground Image (cut-out)', fieldset: 'foreground', description: 'Cut-out subject (attorney, team) shown in front of the background.', altLabel: 'hero foreground image', hidden: hide(show.foreground)}),
    defineField({name: 'foregroundNone', title: 'No foreground image', type: 'boolean', fieldset: 'foreground', initialValue: false, hidden: hide(show.foreground)}),

    // ─── Media ────────────────────────────────────────────────────────────────
    defineField({
      name: 'galleryImages',
      title: 'Gallery Images',
      type: 'array',
      fieldset: 'media',
      description: 'Used by the Aperture-style mosaic backdrop and the Split “overlap” image collage (first 3: center, bottom-left, top-right).',
      of: [{type: 'image', options: {hotspot: true}, fields: [heroAltField('gallery image')]}],
      hidden: hide(show.gallery),
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      fieldset: 'media',
      description: 'YouTube or Vimeo URL for the lightbox. The Background / Feature Image is the poster.',
      validation: (Rule) => Rule.uri({scheme: ['http', 'https']}).custom((url?: string) => (!url ? true : /youtube\.com|youtu\.be|vimeo\.com/.test(url) || 'Must be a YouTube or Vimeo URL')),
      hidden: hide(show.video),
    }),

    // ─── Silo Nav ─────────────────────────────────────────────────────────────
    defineField({
      name: 'siloLayout',
      title: 'Card layout',
      type: 'string',
      fieldset: 'strip',
      description:
        'How each practice-area card looks. Only photo-forward styles are offered here — they read correctly over the hero. (The full-width Practice Area Navigation section has the complete set, incl. Feature / Inline / Bento, which need a light section background.)',
      options: radio([
        {title: 'Cards — solid card, photo on top, label + blurb (default)', value: 'cards'},
        {title: 'Spotlight — photo cover, large label over it', value: 'spotlight'},
        {title: 'Tile — compact, photo or fill with centered label', value: 'tile'},
      ]),
      initialValue: 'cards',
      hidden: hide(show.strip),
    }),
    defineField({
      name: 'practiceAreaItems',
      title: 'Practice Area Items',
      type: 'array',
      fieldset: 'strip',
      description: 'Quick-link practice-area cards anchored at the bottom of the hero. Same item type as the Practice Area Navigation section — each references a practice-area page (title / description / image auto-fill).',
      of: [{type: 'practiceAreaNavItem'}],
      hidden: hide(show.strip),
    }),
  ],
  preview: {
    select: {title: 'heading', skeleton: 'skeleton'},
    prepare({title, skeleton}) {
      return {title: title ?? 'Homepage Hero', subtitle: skeleton === 'split' ? 'Split layout' : 'Overlay layout'}
    },
  },
})
