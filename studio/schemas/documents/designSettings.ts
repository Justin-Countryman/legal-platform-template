import {defineType, defineField} from 'sanity'
import {PageLinkInput} from '../../components/PageLinkInput'
import {TokenStringInput} from '../../components/TokenStringInput'
import {ColorPreview} from '../../components/ColorPreview'
import {CornerPreview} from '../../components/CornerPreview'

// Design Settings
// Visual identity: logos, colors, typography, UI style
// Operational configuration lives in Site Settings

export const designSettings = defineType({
  name: 'designSettings',
  title: 'Design Settings',
  type: 'document',
  fieldsets: [
    {
      name: 'brandAssets',
      title: 'Brand Assets',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'colors',
      title: 'Brand Colors',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'typography',
      title: 'Typography',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'corners',
      title: 'Corners',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'uiElements',
      title: 'UI Elements',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'internalHero',
      title: 'Internal Hero',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'buttons',
      title: 'Buttons',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'people',
      title: 'People Settings',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'patternTexture',
      title: 'Pattern Texture',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    // ─── The section texture (Phase 16A, [R-472]) ─────────────────────────────
    // There is no site-wide background: interior pages are always a clean ground,
    // and a texture appears only on a HOMEPAGE section someone set to the Pattern
    // surface. This chooses which texture those sections wear. It replaces the
    // Phase 13 page background (texture, photo or gradient behind the whole site).
    //
    // NO `initialValue`: `designSettings` seeds are folded into every Site-Build
    // write, and a seeded texture would be stamped on every client and could never
    // be told from a choice (item 308, [R-450]). Absent means none, and a Pattern
    // section then looks like Light.
    defineField({
      name: 'patternTexture',
      title: 'Pattern Texture',
      type: 'string',
      fieldset: 'patternTexture',
      description:
        'The texture a homepage section set to the Pattern surface wears, drawn faintly in the dark ground color so text stays readable. Nothing else on the site shows it, and interior pages never do. Leave blank for none.',
      options: {
        list: [
          {title: 'Pinstripe \u2014 fine vertical lines', value: 'pinstripe'},
          {title: 'Diagonal hatch \u2014 fine diagonal lines', value: 'diagonalHatch'},
          {title: 'Diamond lattice \u2014 a fine crosshatch', value: 'diamondLattice'},
          {title: 'Scallop \u2014 a repeating arc', value: 'scallop'},
        ],
        layout: 'radio',
      },
    }),

    // ─── Brand Assets ─────────────────────────────────────────────────────────
    {
      name: 'logoOnLight',
      title: 'Logo — for Light Backgrounds',
      type: 'image',
      fieldset: 'brandAssets',
      description: 'Used in headers, footers, and sections with a light background. Typically your full-color or dark logo.',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          initialValue: '',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'logoOnDark',
      title: 'Logo — for Dark Backgrounds',
      type: 'image',
      fieldset: 'brandAssets',
      description: 'Used in dark headers, dark sections, and footers with a dark background. Typically a white or light version of your logo.',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          initialValue: '',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'logoMarkOnLight',
      title: 'Logo Mark — for Light Backgrounds',
      type: 'image',
      fieldset: 'brandAssets',
      description: 'Optional compact version of the logo (e.g. icon or monogram) shown when the sticky header compacts on scroll with a light scrolled scheme. If left blank, the full logo scales down automatically.',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          initialValue: '',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'logoMarkOnDark',
      title: 'Logo Mark — for Dark Backgrounds',
      type: 'image',
      fieldset: 'brandAssets',
      description: 'Compact logo mark shown when the sticky header compacts on scroll with a dark scrolled scheme. If left blank, the full dark-background logo scales down automatically.',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          initialValue: '',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      fieldset: 'brandAssets',
      description: '32×32 or 64×64 .ico or .png — shown in browser tabs and bookmarks.',
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },
    {
      name: 'webclipImage',
      title: 'Webclip Image (Apple Touch Icon)',
      type: 'image',
      fieldset: 'brandAssets',
      description: '180×180 .png — shown when a user saves the site to their phone home screen.',
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          validation: (Rule) => Rule.required().warning('Alt text is required'),
        },
      ],
    },

    // ─── Brand Colors ─────────────────────────────────────────────────────────

    // Four colour roles (Phase 14, WS-V1-PHASE14-DESIGN §7). Each is a hex and
    // none is required: an absent role renders the platform default, which is the
    // greyscale every site already ships with. None carries an initialValue: the
    // build folds initial values into the documents it writes (item 308), and a
    // seeded colour would be indistinguishable from one an operator chose.
    // verify-inline-sections.ts refuses an initialValue on any field in this
    // fieldset.
    //
    // The preview field comes first because it carries the palette picker:
    // choosing a preset writes the four hex fields below it.
    defineField({
      name: 'colorPreview',
      title: 'Palette',
      type: 'string',
      fieldset: 'colors',
      readOnly: true,
      components: {input: ColorPreview},
      description: 'Choose a palette to fill the four colours below, or type your own. The preview shows what the site renders: a colour that cannot be read against its background is adjusted the smallest step that reads, and shown here.',
    }),

    defineField({
      name: 'darkGround',
      title: 'Dark Ground',
      type: 'string',
      fieldset: 'colors',
      description: 'Hex, e.g. #14213D. Dark sections, the footer, and dark header and hero schemes. A deep navy, charcoal, forest or burgundy works best; a lighter or more vivid colour is deepened until white text reads on it.',
      validation: (Rule) => Rule.regex(/^#[0-9A-Fa-f]{6}$/, {name: 'hex'}).warning('Enter a 6-digit hex value, e.g. #14213D'),
    }),

    defineField({
      name: 'lightGround',
      title: 'Light Ground',
      type: 'string',
      fieldset: 'colors',
      description: 'Hex, e.g. #F5EEDC. The page itself; card and alternating section backgrounds are derived one step off it. Leave blank for white.',
      validation: (Rule) => Rule.regex(/^#[0-9A-Fa-f]{6}$/, {name: 'hex'}).warning('Enter a 6-digit hex value, e.g. #F5EEDC'),
    }),

    defineField({
      name: 'accent',
      title: 'Accent',
      type: 'string',
      fieldset: 'colors',
      description: 'Hex, e.g. #B8893A. The brand colour on small areas: taglines, highlighted heading words, icons, rules. Where it is too light to read as text, text uses a darker shade of the same colour.',
      validation: (Rule) => Rule.regex(/^#[0-9A-Fa-f]{6}$/, {name: 'hex'}).warning('Enter a 6-digit hex value, e.g. #B8893A'),
    }),

    defineField({
      name: 'action',
      title: 'Button Colour (optional)',
      type: 'string',
      fieldset: 'colors',
      description: 'Hex. Buttons and calls to action. Leave blank to use the accent.',
      validation: (Rule) => Rule.regex(/^#[0-9A-Fa-f]{6}$/, {name: 'hex'}).warning('Enter a 6-digit hex value'),
    }),

    // ─── Typography ───────────────────────────────────────────────────────────
    {
      name: 'fontPairingPreset',
      title: 'Font Pairing — Preset',
      type: 'number',
      fieldset: 'typography',
      description: 'Select a curated heading + body combination. When set, this overrides the individual font upload fields below — the preset fonts are self-hosted in the template and load with no external requests. Leave blank to use your own uploaded fonts.',
      // Ids 3 (Refined Practice) and 8 (Space Age Authority) were culled in
      // WS-Polish and are intentionally omitted from the selector. They remain
      // resolvable as `undefined` from getPresetById so any legacy designSettings
      // doc still set to those ids falls through to the customFonts upload path
      // (or returns null fonts) rather than crashing.
      options: {
        list: [
          {title: '1 — Classical Authority (Playfair Display + Source Sans 3)', value: 1},
          {title: '2 — Modern Counsel (DM Serif Display + DM Sans)', value: 2},
          {title: '4 — Editorial Authority (Fraunces + Inter)', value: 4},
          {title: '5 — Corporate Clarity (Libre Baskerville + Montserrat)', value: 5},
          {title: '6 — Humanist Trust (Lora + Work Sans)', value: 6},
          {title: '7 — Geometric Precision (Montserrat + Open Sans)', value: 7},
          {title: '9 — Neutral Professional (Merriweather + Open Sans)', value: 9},
          {title: '10 — Accessible Modern (Work Sans + Roboto)', value: 10},
          {title: '11 — Bold Advocate (Fraunces Bold + Source Sans 3)', value: 11},
          {title: '12 — Traditional Fallback (Libre Baskerville + Open Sans)', value: 12},
          {title: '13 — Heritage Old-Style (Sorts Mill Goudy + Open Sans)', value: 13},
          {title: '14 — Modern Practice (Poppins + Poppins, mono)', value: 14},
          {title: '15 — Heritage Voice (Spectral + Open Sans)', value: 15},
          {title: '16 — Stately Modern (Petrona + Inter)', value: 16},
          {title: '17 — Editorial Statement (Fraunces + Fraunces, mono)', value: 17},
          {title: '18 — Sovereign Mono (Source Serif 4 + Source Serif 4, mono)', value: 18},
        ],
        layout: 'radio',
      },
      validation: (Rule) =>
        Rule.custom<number | undefined>((val, ctx) => {
          const {customFonts} = (ctx.document ?? {}) as {customFonts?: {headingFont?: {regular?: {asset?: unknown}}; bodyFont?: {regular?: {asset?: unknown}}}}
          if (val && (customFonts?.headingFont?.regular?.asset || customFonts?.bodyFont?.regular?.asset)) {
            return 'Cannot use a preset and custom font uploads at the same time. Clear the heading and body font uploads if you want to use a preset.'
          }
          return true
        }).warning(),
    },
    {
      name: 'marketingScale',
      title: 'Marketing Type Scale',
      type: 'string',
      fieldset: 'typography',
      description: 'Controls headline size scale on homepage and landing pages. Default uses standard Tailwind sizing (same as internal pages). sm uses Perfect Fourth ratio (restrained marketing). md uses Augmented Fourth ratio (classic bold marketing). lg uses Golden Ratio (dramatic, hero-driven). Internal pages always use standard sizing regardless of this setting.',
      options: {
        list: [
          {title: 'Default — no marketing scaling; headlines stay at internal-page size (most restrained)', value: 'default'},
          {title: 'sm — Perfect Fourth (1.333) — restrained but clearly marketing', value: 'sm'},
          {title: 'md — Augmented Fourth (1.414) — classic bold marketing',         value: 'md'},
          {title: 'lg — Golden Ratio (1.618) — dramatic, hero-driven',              value: 'lg'},
        ],
        layout: 'radio',
      },
      initialValue: 'default',
    },
    {
      name: 'taglineStyle',
      title: 'Tagline style',
      type: 'string',
      fieldset: 'typography',
      description: 'Tagline style controls how decorative labels above headings render across the site. Plain uses uppercase with letter-spacing. Lined adds a short horizontal rule before the label. Title Case capitalizes the first letter of each word with no underline decoration. All three render in the brand accent color and adapt automatically to light or dark surfaces.',
      options: {
        list: [
          {title: 'Plain — UPPERCASE with letter-spacing', value: 'plain'},
          {title: 'Lined — UPPERCASE with leading horizontal rule', value: 'lined'},
          {title: 'Title Case — capitalize each word, no decoration', value: 'titlecase'},
        ],
        layout: 'radio',
      },
      initialValue: 'plain',
    },
    {
      name: 'customFonts',
      title: 'Custom Fonts — Upload Your Own',
      type: 'object',
      fieldset: 'typography',
      description: 'Upload your own .woff2 files for heading and body. Leave blank if using a preset above.',
      options: {collapsible: true, collapsed: true},
      fields: [
        {
          name: 'headingFont',
          title: 'Heading Font',
          type: 'object',
          description: 'Font used for all headings (H1–H6) site-wide. Upload .woff2 files — self-hosted for maximum performance.',
          options: {collapsible: true, collapsed: true},
          fields: [
            {
              name: 'name',
              title: 'Font Family Name',
              type: 'string',
              description: 'The exact name used in CSS — e.g. "Playfair Display". Must match the font file exactly.',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'regular',
              title: 'Regular (400)',
              type: 'file',
              description: 'Required. The standard weight file. Variable fonts (.woff2) uploaded here will cover all weights automatically.',
              options: {accept: '.woff2,.woff'},
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'bold',
              title: 'Bold (700)',
              type: 'file',
              description: 'Optional. Only needed if using a separate non-variable bold file.',
              options: {accept: '.woff2,.woff'},
            },
            {
              name: 'italic',
              title: 'Italic',
              type: 'file',
              description: 'Optional. Upload if the font has a distinct italic cut.',
              options: {accept: '.woff2,.woff'},
            },
          ],
        },
        {
          name: 'bodyFont',
          title: 'Body Font',
          type: 'object',
          description: 'Font used for all body copy, navigation, and UI text site-wide.',
          options: {collapsible: true, collapsed: true},
          fields: [
            {
              name: 'name',
              title: 'Font Family Name',
              type: 'string',
              description: 'The exact name used in CSS — e.g. "Open Sans".',
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'regular',
              title: 'Regular (400)',
              type: 'file',
              description: 'Required.',
              options: {accept: '.woff2,.woff'},
              validation: (Rule) => Rule.required().warning(),
            },
            {
              name: 'semibold',
              title: 'Semibold (600)',
              type: 'file',
              description: 'Optional. Used for subheadings, nav labels, and emphasized UI text.',
              options: {accept: '.woff2,.woff'},
            },
            {
              name: 'bold',
              title: 'Bold (700)',
              type: 'file',
              description: 'Optional.',
              options: {accept: '.woff2,.woff'},
            },
            {
              name: 'italic',
              title: 'Italic',
              type: 'file',
              description: 'Optional.',
              options: {accept: '.woff2,.woff'},
            },
            {
              name: 'boldItalic',
              title: 'Bold Italic',
              type: 'file',
              description: 'Optional.',
              options: {accept: '.woff2,.woff'},
            },
          ],
        },
      ],
    },

    // ─── Corners (Phase 16A, [R-473]) ──────────────────────────────────────────
    // Two stored fields chosen as one family: the picker writes both, and the site
    // reads each as before. See studio/components/CornerPreview.tsx.
    defineField({
      name: 'cornerPreview',
      title: 'Corner Family',
      type: 'string',
      fieldset: 'corners',
      readOnly: true,
      components: {input: CornerPreview},
      description: 'Choose a family to set card and button corners together, so they always belong together. The two fields below hold what it sets.',
    }),
    {
      name: 'uiRadius',
      title: 'UI Corner Radius',
      type: 'string',
      fieldset: 'corners',
      description: 'Corners on cards, images, form fields, badges, and section panels. Set by the Corner Family above; change it here only to mix on purpose.',
      options: {
        list: [
          {title: 'Sharp — 0px, formal and authoritative', value: 'sharp'},
          {title: 'Subtle — 4px, refined with a hint of softness', value: 'subtle'},
          {title: 'Rounded — 8px, balanced and professional', value: 'rounded'},
          {title: 'Soft — 16px, approachable and modern', value: 'soft'},
        ],
        layout: 'radio',
      },
      initialValue: 'rounded',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'buttonShape',
      title: 'Button Shape',
      type: 'string',
      fieldset: 'corners',
      description: 'The shape of every button. Set by the Corner Family above; a button rounder than the cards reads as a mismatch unless it is a pill.',
      options: {
        list: [
          {title: 'Square — 0px, sharp and authoritative', value: 'square'},
          {title: 'Rounded — 6px, clean and professional', value: 'rounded'},
          {title: 'Stadium — 12px, modern and friendly', value: 'stadium'},
          {title: 'Pill — fully rounded ends, bold and contemporary', value: 'pill'},
        ],
        layout: 'radio',
      },
      initialValue: 'rounded',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'buttonAnimation',
      title: 'Button Hover Animation',
      type: 'string',
      fieldset: 'buttons',
      description: 'Optional decorative hover effect layered on top of the standard color hover for primary and secondary buttons. Tertiary text-links always use the arrow nudge regardless. None = color hover only. Sweep = background fills from left to right. Fill-center = background fills from center outward. Inset = button gains pressed-in shadow depth on hover (premium tactile feel). Lift = elevation increases on hover (shadow + translateY).',
      options: {
        list: [
          {title: 'None — color hover only', value: 'none'},
          {title: 'Sweep — background fills left to right', value: 'sweep'},
          {title: 'Fill-center — background fills from center', value: 'fill-center'},
          {title: 'Inset — button gains pressed-in depth on hover', value: 'inset'},
          {title: 'Lift — elevation increases on hover', value: 'lift'},
        ],
        layout: 'radio',
      },
      initialValue: 'none',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'showBackToTop',
      title: 'Show "Back to Top" Button',
      type: 'boolean',
      fieldset: 'uiElements',
      description: 'Display a floating button in the bottom-right corner that scrolls the user back to the top of the page.',
      initialValue: true,
    },

    {
      name: 'internalHeroBackground',
      title: 'Internal Hero — Default Background',
      type: 'string',
      fieldset: 'internalHero',
      description: 'Default background style for internal page heroes when NO background image is present (site image below, or a per-page image). Light is a soft neutral tint — not stark white. A page can override this in its own Internal Hero settings.',
      options: {
        list: [
          {title: 'Dark — brand color background, white text', value: 'dark'},
          {title: 'Light — neutral tint background, dark text', value: 'light'},
        ],
        layout: 'radio',
      },
      initialValue: 'dark',
    },
    {
      name: 'siteHeroBackgroundImage',
      title: 'Internal Hero — Default Background Image',
      type: 'image',
      fieldset: 'internalHero',
      description: 'Optional site-wide background image for internal page heroes. Pages inherit this by default; a page can override with its own image or force no image. When an image is present the hero is always dark (scrim + white text).',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          description: 'Describe the image for screen readers and SEO.',
        },
        {
          name: 'fit',
          type: 'string',
          title: 'Fit',
          description: 'Cover fills the band (cropped to fit). Tile repeats the image as a pattern.',
          options: {
            list: [
              {title: 'Cover — fill the band', value: 'cover'},
              {title: 'Tile — repeat as a pattern', value: 'tile'},
            ],
            layout: 'radio',
          },
          initialValue: 'cover',
        },
      ],
    },
    {
      name: 'siteHeroForegroundImage',
      title: 'Internal Hero — Default Foreground Image',
      type: 'image',
      fieldset: 'internalHero',
      description: 'Optional site-wide foreground subject (e.g. attorney, building) shown bottom-right of every internal page hero, in full color above the scrim. Hidden on mobile. A page can override it with its own image or hide it.',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          description: 'Describe the image for screen readers and SEO.',
        },
      ],
    },
    {
      name: 'heroScrimOpacity',
      title: 'Internal Hero — Scrim Opacity',
      type: 'number',
      fieldset: 'internalHero',
      description: 'Darkening overlay strength over hero background images (0 = none, 100 = solid). Keeps heading text readable. A page can override this.',
      initialValue: 80,
      validation: (Rule) => Rule.min(0).max(100).warning(),
    },
    {
      name: 'tertiaryStyle',
      title: 'Tertiary CTA Style',
      type: 'string',
      fieldset: 'buttons',
      description: 'Tertiary CTA style. Plain uses standard letter-spacing for soft, conversational links. Tracked uses slightly wider letter-spacing for a more deliberate, considered feel. Both options use sentence case at text-base with an arrow trail and arrow-nudge hover. No uppercase, no underline — those treatments belong to other systems.',
      options: {
        list: [
          {title: 'Plain — standard letter-spacing, conversational', value: 'plain'},
          {title: 'Tracked — slightly wider letter-spacing, considered', value: 'tracked'},
        ],
        layout: 'radio',
      },
      initialValue: 'plain',
    },
    {
      name: 'elevationStyle',
      title: 'Card Elevation Style',
      type: 'string',
      fieldset: 'uiElements',
      description: 'Controls shadow treatment on cards and sidebar widgets across the site. Flat = borders only, editorial look. Dropdowns and modals always have appropriate structural elevation regardless of this setting. Preview all styles at /design-preview/elevation.',
      options: {
        list: [
          {title: '0 — Flat, no shadows, borders only',                         value: '0'},
          {title: '1 — Barely-there, minimal shadow, no hover lift',            value: '1'},
          {title: '2 — Whisper, subtle shadow, 1px hover lift',                 value: '2'},
          {title: '4 — Defined, clear 3-layer shadow, 2px hover lift',          value: '4'},
          {title: '6 — Bold, strong 3-layer shadow, 3px hover lift',            value: '6'},
        ],
        layout: 'radio',
      },
      initialValue: '0',
    },

    // ─── Sidebar (UI Elements) ────────────────────────────────────────────────
    // WS-Sidebar Phase 2.1 — three site-level settings governing sidebar nav
    // chrome. Behavior wired in Phase 2.5; doctrine in BI/BI-Sidebar.md §4–5.
    {
      name: 'sidebarNavIconStyle',
      title: 'Sidebar Nav — Icon Style',
      type: 'string',
      fieldset: 'uiElements',
      description: 'Icon decoration on sidebar nav rows (practice areas, page links, post lists). Arrows and chevrons both animate on hover. None replaces the icon with a hover background-color shift — quieter look, useful when the sidebar already carries visual weight. The accordion plus icon used to expand grandchild groupings is fixed and not affected by this setting.',
      options: {
        list: [
          {title: 'Chevrons — small angle, modern feel', value: 'chevrons'},
          {title: 'Arrows — right-pointing, deliberate', value: 'arrows'},
          {title: 'None — no icon; hover background shift instead', value: 'none'},
        ],
        layout: 'radio',
      },
      initialValue: 'chevrons',
    },
    {
      name: 'sidebarWidgetHeaderLine',
      title: 'Sidebar Widget — Underline Header',
      type: 'boolean',
      fieldset: 'uiElements',
      description: 'Render a thin separator line beneath every sidebar widget header ("Practice Areas", "Our Attorneys", "Contact Us Today", etc.). Off renders the header directly above the widget body without the underline.',
      initialValue: true,
    },
    {
      name: 'sidebarItemSeparators',
      title: 'Sidebar Widget — Item Separators',
      type: 'boolean',
      fieldset: 'uiElements',
      description: 'Render thin lines between sibling items at the same level within a widget. When a child page\'s grandchildren are expanded, the line directly under that expanded child is omitted so the grandchildren visually anchor to their parent — lines appear between the grandchildren themselves and resume between siblings after the expanded group closes (the Edwards pattern).',
      initialValue: true,
    },

    // ─── Motion Tempo ─────────────────────────────────────────────────────────
    {
      name: 'motionTempo',
      title: 'Motion Tempo',
      type: 'string',
      fieldset: 'uiElements',
      description: 'Controls how fast interactive animations run across the site — hover states, card transitions, chevron slides, color shifts. Relaxed is recommended for traditional premium firms — slower motion signals craft and deliberation. Balanced is a neutral modern pace. Snappy feels fast and contemporary, suited for tech-forward positioning. Dropdowns, modals, and structural animations are NOT affected by this setting — they stay at their tuned premium values. All motion respects individual user reduced-motion accessibility preferences regardless of this selection. Preview at /design-preview/motion.',
      options: {
        list: [
          {title: 'Snappy — fast, contemporary feel',    value: 'snappy'},
          {title: 'Balanced — neutral modern pace',      value: 'balanced'},
          {title: 'Relaxed — deliberate, premium feel',  value: 'relaxed'},
        ],
        layout: 'radio',
      },
      initialValue: 'relaxed',
    },

    // ─── People Settings ──────────────────────────────────────────────────────
    {
      name: 'profileLayout',
      title: 'Profile Page Layout',
      type: 'string',
      fieldset: 'people',
      description: 'Controls the visual layout for all attorney and staff profile pages',
      options: {
        list: [
          {title: 'Slate — photo left, dark info panel right', value: 'splitHero'},
          {title: 'Pillar — dark top banner, sticky sidebar + bio', value: 'classicSidebar'},
          {title: 'Mosaic — photo + bio side by side, credentials below', value: 'featureGrid'},
          {title: 'Horizon — editorial full-bleed split, display-scale name', value: 'premiumHorizontal'},
        ],
        layout: 'radio',
      },
      initialValue: 'splitHero',
    },
    {
      name: 'profileCtaLabel',
      title: 'Profile CTA Button — Label',
      type: 'string',
      fieldset: 'people',
      description: 'Primary call-to-action button shown on all attorney and staff profile pages',
      components: {input: TokenStringInput},
      initialValue: 'Contact Us',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'profileCtaUrl',
      title: 'Profile CTA Button — URL',
      type: 'string',
      fieldset: 'people',
      description: 'Relative path or full URL — e.g. /contact/',
      components: {input: PageLinkInput},
      initialValue: '/contact/',
      validation: (Rule) => Rule.required().warning(),
    },

  ],

  preview: {
    prepare() {
      return {title: 'Design Settings'}
    },
  },
})
