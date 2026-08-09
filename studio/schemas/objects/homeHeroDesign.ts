import {defineType, defineField} from 'sanity'
import {show} from './homeHeroReveal'
import {heroAltField, heroImageField} from './heroSurfaceFields'

// ─── Homepage Hero — Design ───────────────────────────────────────────────────
// The homepage hero's design + layout, lifted out of the homePage document and
// authored in Hero Settings (heroSettings.homepageHero) alongside the Internal
// Hero defaults — one editing surface for hero design. The homepage hero's
// CONTENT (eyebrow / heading / description / buttons) stays on homePage.hero.
//
// This is the same content/design split v0.4.0 used for the internal hero; the
// fields here are exactly homeHero's design fields (no content). Reveal predicates
// are shared with homeHero (homeHeroReveal.ts) and read `parent` (this object), so
// they work unchanged; only the Fit-on-Split predicate — which reads the top-level
// `document` — is repointed from `document.hero` to `document.homepageHero`.

type HiddenCtx = {parent?: Record<string, unknown>}
const hide = (pred: (p: Record<string, unknown> | undefined) => boolean) => ({parent}: HiddenCtx) => !pred(parent)

const radio = (list: {title: string; value: string}[]) => ({list, layout: 'radio' as const})

export const homeHeroDesign = defineType({
  name: 'homeHeroDesign',
  title: 'Homepage Hero Design',
  type: 'object',
  options: {collapsible: true, collapsed: false},
  fieldsets: [
    {name: 'layout', title: 'Layout', options: {collapsible: true, collapsed: false}},
    {name: 'background', title: 'Background', options: {collapsible: true, collapsed: false}},
    {name: 'foreground', title: 'Foreground Figure', options: {collapsible: true, collapsed: false}},
    {name: 'media', title: 'Media', options: {collapsible: true, collapsed: false}},
  ],
  fields: [
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
      description: 'Color scheme for the hero band: Dark = brand color + white text, Light = neutral tint + dark text. Also sets the Section Background scrim tone (dark scheme → dark scrim, light scheme → light scrim).',
      options: radio([{title: 'Inherit site default', value: 'inherit'}, {title: 'Dark — brand color, white text', value: 'dark'}, {title: 'Light — neutral tint, dark text', value: 'light'}]),
      initialValue: 'inherit',
      hidden: hide(show.scheme),
    }),
    // The full-bleed wallpaper behind the WHOLE hero (both layouts). Page-only (no
    // site default), so its presence = on — no "None" toggle. Pairs with the Scrim
    // controls below + the Background Scheme above (which sets the scrim tone).
    heroImageField({
      name: 'sectionBackgroundImage',
      title: 'Section Background',
      fieldset: 'background',
      altLabel: 'hero section background',
      description:
        'Optional full-bleed texture or repeating pattern behind the ENTIRE hero (Overlay with no backdrop, or Split — behind the text + media). Use Tile for a seamless pattern, Cover for a single texture. Keep it subtle — for a focal photo use the Backdrop / Feature Image below.',
      fit: {coverTitle: 'Cover (single texture)', tileTitle: 'Tile (repeat pattern)'},
      hidden: hide(show.sectionBg),
    }),
    heroImageField({
      name: 'backgroundImage',
      title: 'Backdrop / Feature Image',
      fieldset: 'background',
      altLabel: 'hero background image',
      description: 'Overlay: the full-bleed backdrop photo. Split: the side feature image / video poster.',
      // Tile only applies to the full-bleed Overlay backdrop; in Split the image is
      // always a cover panel/poster, so hide Fit there. `document.homepageHero` is this
      // design object (heroSettings.homepageHero) — the nested field can't see it via `parent`.
      fit: {hidden: ({document}) => show.split((document as {homepageHero?: Record<string, unknown>})?.homepageHero)},
      hidden: hide(show.bgImage),
    }),
    defineField({
      name: 'scrimStyle',
      title: 'Scrim Style',
      type: 'string',
      fieldset: 'background',
      description: 'Applies to the active full-bleed background (the Overlay backdrop or the Section Background). Flat = even overlay. Gradient = fades from full strength on the text side toward the image (more premium, keeps the image clearer).',
      options: radio([{title: 'Flat (even overlay)', value: 'flat'}, {title: 'Gradient (directional fade)', value: 'gradient'}]),
      initialValue: 'flat',
      hidden: hide(show.scrim),
    }),
    defineField({name: 'scrimOpacityOverride', title: 'Scrim Opacity (0–100)', type: 'number', fieldset: 'background', description: 'Overlay strength over the active background image (backdrop or Section Background), for text legibility. Leave empty to inherit.', validation: (Rule) => Rule.min(0).max(100), hidden: hide(show.scrim)}),
    // Gradient-only color + direction — shown when the scrim is active AND set to
    // Gradient. 'auto' keeps the derived look (color from scheme, direction from align).
    defineField({
      name: 'scrimColor',
      title: 'Gradient Color',
      type: 'string',
      fieldset: 'background',
      description: 'Color of the gradient scrim. Auto follows the Background Scheme; Action uses your CTA color; Black is a neutral darken.',
      options: radio([{title: 'Auto — from scheme', value: 'auto'}, {title: 'Action (CTA color)', value: 'action'}, {title: 'Black (neutral darken)', value: 'black'}]),
      initialValue: 'auto',
      hidden: ({parent}) => !(show.scrim(parent) && (parent as {scrimStyle?: string})?.scrimStyle === 'gradient'),
    }),
    defineField({
      name: 'scrimDirection',
      title: 'Gradient Direction',
      type: 'string',
      fieldset: 'background',
      description: 'Direction the gradient fades. Auto follows content alignment (left text → fades right; centered → fades up).',
      options: {list: [{title: 'Auto — follow text alignment', value: 'auto'}, {title: 'To right →', value: 'to-right'}, {title: 'To left ←', value: 'to-left'}, {title: 'To top ↑', value: 'to-top'}, {title: 'To bottom ↓', value: 'to-bottom'}, {title: 'To top-right ↗', value: 'to-top-right'}, {title: 'To top-left ↖', value: 'to-top-left'}, {title: 'To bottom-right ↘', value: 'to-bottom-right'}, {title: 'To bottom-left ↙', value: 'to-bottom-left'}], layout: 'dropdown'},
      initialValue: 'auto',
      hidden: ({parent}) => !(show.scrim(parent) && (parent as {scrimStyle?: string})?.scrimStyle === 'gradient'),
    }),

    // ─── Foreground figure ────────────────────────────────────────────────────
    // Toggle sits with its image upload (moved out of Layout) so the on/off control
    // and the asset live together. Shown for left-aligned overlays; the image field
    // reveals once the toggle is on.
    defineField({name: 'foreground', title: 'Foreground figure', type: 'boolean', fieldset: 'foreground', description: 'Cut-out subject in front of the backdrop (left-aligned overlays only).', initialValue: false, hidden: hide(show.foregroundToggle)}),
    heroImageField({name: 'foregroundImage', title: 'Foreground Image (cut-out)', fieldset: 'foreground', description: 'Cut-out subject (attorney, team) shown in front of the background.', altLabel: 'hero foreground image', hidden: hide(show.foreground)}),

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
    // REMOVED 2026-08-09 (Justin's ruling, OUTSTANDING item 163, option (a)).
    // `contentStrip`, `siloLayout` and `practiceAreaItems` used to put a
    // practice-area card row inside the hero band. They rendered the SAME
    // SiloTileLayout the `siloNavBlock` canvas block renders, so a homepage with
    // both showed two rows of identical tiles governed by two unrelated controls
    // in two different documents — and an operator who turned the strip off saw
    // the block's cards remain and concluded the setting did nothing. The block
    // is now the sole practice-area surface on the homepage, and it sits directly
    // beneath the hero, so what was given up is a band boundary, not a position.
  ],
  preview: {
    select: {skeleton: 'skeleton'},
    prepare({skeleton}) {
      return {title: 'Homepage Hero Design', subtitle: skeleton === 'split' ? 'Split layout' : 'Overlay layout'}
    },
  },
})
