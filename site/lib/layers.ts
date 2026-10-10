// ─── The six design layers, and which one owns each stored design field ────────
//
// Justin, 2026-10-03 (monorepo `[R-632]`, WS-V1-DESIGN-LAYERS-DESIGN §2, §4.1): "we do not want overlap of these theme
// concepts". The layers partition the design decisions: every design field the Studio stores belongs to exactly one
// layer, or to none (the firm's identity and the build's picks), and `layers.test.ts` holds this map to the schema: a
// field added to Design Settings, the homepage hero's design or a section's appearance fails the test until it is
// claimed here, and a name here the schema no longer has fails it too.
//
// A field named under TWO layers is a split still owed, recorded so it is seen: `cardHover` and `elevationStyle` each
// hold an Element theme's look and a Motion theme's movement in one value. `flow` is no longer among them: how a band sits
// is the Layout theme's own field (`pageLayout`, `lib/layouts.ts`), and the `sit` and `overlap` a theme carries are its
// own layout, what an absent one renders, as its `on` is its own background (monorepo WS-V1-LAYOUT-OPTIONS-DESIGN).

export const LAYERS = ['palette', 'element', 'flow', 'background', 'layout', 'motion'] as const
export type Layer = (typeof LAYERS)[number]
/** Not a layer: the firm's identity, the build's picks, and the Studio's own preview inputs. */
export type Claim = Layer | 'none' | readonly [Layer, Layer]

/** Design Settings, by top-level field. */
export const DESIGN_SETTINGS_LAYER: Readonly<Record<string, Claim>> = {
  // Palette: the four roles, from which every token is derived.
  darkGround: 'palette', lightGround: 'palette', accent: 'palette', action: 'palette', colorPreview: 'palette',
  // The color details (`lib/details.ts`): which role a heading, a color band and the accent on dark draw from.
  headingInk: 'palette', saturatedFrom: 'palette', accentOnDark: 'palette',
  // Element theme (the style set): what each element looks like.
  styleSetPicker: 'element', fontPairingPreset: 'element', customFonts: 'element', marketingScale: 'element', taglineStyle: 'element',
  headingEmphasisStyle: 'element', headingRule: 'element', headingWeight: 'element', headingCase: 'element', dropCap: 'element',
  cornerPreview: 'element', uiRadius: 'element', buttonShape: 'element', tertiaryStyle: 'element', imageFrame: 'element',
  // An element detail (`lib/details.ts`): the button's fill on a dark section.
  buttonOnDark: 'element',
  // The type details (`lib/details.ts`).
  heroHeadingWeight: 'element', leadIn: 'element', labelStyle: 'element',
  // The card detail (`lib/details.ts`).
  cardEdge: 'element', photoColor: 'element', photoEdge: 'element', cardGlow: 'element',
  attorneyCardStyle: 'element', sidebarNavIconStyle: 'element', sidebarWidgetHeaderLine: 'element', sidebarItemSeparators: 'element',
  // The pattern tile's kind is the Element theme's; where and how strongly it is drawn is the Background theme's, which reads it.
  patternTexture: 'element',
  cardHover: ['element', 'motion'], elevationStyle: ['element', 'motion'],
  // Flow theme: where the color goes down the page.
  flow: 'flow', internalHeroBackground: 'flow',
  // The retired fields the compat bridge reads for one pin, each under the layer its rule went to.
  sectionJoin: 'flow', dividerCarry: 'flow', sectionOverlap: 'layout', patternGround: 'background', brandGhost: 'background', sectionGradient: 'background',
  // Background theme: what sits on the grounds, its photographs and their approval, the scrim's strength.
  background: 'background', themePhotos: 'background', flowPhoto: 'background', flowPhotos: 'background',
  siteHeroBackgroundImage: 'background', heroScrimOpacity: 'background',
  // Layout theme: how things sit in and across the bands, its one stored id first.
  pageLayout: 'layout', siteHeroForegroundImage: 'layout',
  // Motion theme: how things move.
  motionTempo: 'motion', buttonAnimation: 'motion',
  // Not a layer.
  logoOnLight: 'none', logoOnDark: 'none', logoMarkOnLight: 'none', logoMarkOnDark: 'none', favicon: 'none', webclipImage: 'none',
  showBackToTop: 'none', profileLayout: 'none', profileCtaLabel: 'none', profileCtaUrl: 'none',
}

/** The homepage hero's design (`heroSettings.homepageHero`), by field. */
export const HOMEPAGE_HERO_LAYER: Readonly<Record<string, Claim>> = {
  skeleton: 'layout', heightMode: 'layout', contentAlign: 'layout', splitMedia: 'layout', splitImageStyle: 'layout', splitImageRatio: 'layout',
  mediaSide: 'layout', foreground: 'layout', foregroundSide: 'layout', foregroundImage: 'layout', textTreatment: 'layout',
  schemeOverride: 'flow',
  backdrop: 'background', backgroundImage: 'background', sectionBackgroundImage: 'background', galleryImages: 'background', videoUrl: 'background',
  scrimStyle: 'background', scrimOpacityOverride: 'background', scrimDirection: 'background',
  // The scrim's color is a color.
  scrimColor: 'palette',
  motion: 'motion',
}

/** A section's own appearance, set by hand in the Studio, which wins on its band: by field, on every section type. */
export const APPEARANCE_LAYER: Readonly<Record<string, Claim>> = {
  surface: 'flow', spacing: 'flow',
  sectionBackgroundImage: 'background',
  inset: 'layout', overlapPrevious: 'layout',
}
