import type {CtaItem} from '@/components/ui/ButtonGroup'
import type {CtaButtonData} from '@/components/layout/InternalHero'
import type {HeroImage, HeroSchemePref, ResolvedHeroSurface} from '@/lib/heroSurface'
import type {SanityImage} from '@/lib/sanity/image'

// ─── Model ────────────────────────────────────────────────────────────────────
// 2 SKELETONS + a flat set of direct layout settings (no presets, no inherit
// cascade). The operator picks a Layout (skeleton) and sets the options directly;
// every field has a concrete default. See config.ts for resolveHeroConfig.

export type Skeleton = 'overlay' | 'split'

export type ContentAlign = 'left' | 'center'
export type Backdrop = 'none' | 'image' | 'mosaic'
export type SplitMedia = 'image' | 'video'
export type SplitImageStyle = 'contained' | 'full' | 'overlap'
// Aspect ratios for the contained image panel / video poster ('auto' = natural ratio, no crop).
export type SplitImageRatio = 'auto' | 'anamorphic' | 'univisium' | 'widescreen' | 'landscape' | 'square' | 'portrait'
export type TextTreatment = 'inline' | 'overlap'
export type MediaSide = 'left' | 'right'
// Content (on-load) animations — premium, content-focused (no image gimmicks).
export type Motion = 'none' | 'fade' | 'entrance' | 'stagger' | 'staggerRight' | 'slide'
export type HeightMode = 'content' | 'fullViewport'
// Backdrop scrim treatment (Overlay image/mosaic only). 'flat' = uniform brand-dark
// overlay at Scrim Opacity (legacy). 'gradient' = directional fade (full strength on
// the text side, lighter toward the photo) for a more premium, photo-forward look.
export type ScrimStyle = 'flat' | 'gradient'
// Silo Nav strip card style. Only the photo-cover layouts from the shared silo
// library work on the (typically dark) hero band — they carry their own surface
// via the image + scrim. 'cards' is the hero's own solid bg-background card
// (image-optional, always legible). Feature/Inline/Split are intentionally NOT
// offered here: they assume a light section surface and read dark-on-dark.
export type HeroSiloLayout = 'cards' | 'spotlight' | 'tile'

// The fully-resolved layout configuration the skeleton components consume.
export type HeroConfig = {
  skeleton: Skeleton
  heightMode: HeightMode
  contentAlign: ContentAlign
  // overlay
  backdrop: Backdrop
  foreground: boolean
  contentStrip: boolean
  siloLayout: HeroSiloLayout
  scrimStyle: ScrimStyle
  // split
  splitMedia: SplitMedia
  splitImageStyle: SplitImageStyle
  splitImageRatio: SplitImageRatio
  textTreatment: TextTreatment
  mediaSide: MediaSide
  // motion
  motion: Motion
}

// Resolved practice-area nav item (GROQ resolves the page reference → href +
// auto-filled title/description). Shared with the Practice Area Navigation section.
export type PracticeAreaItem = {
  _key?: string
  label?: string | null
  href?: string | null
  description?: string | null
  icon?: SanityImage | null
  image?: SanityImage | null
  featured?: boolean | null
}

// ─── Raw Sanity shape (merged from HOME_HERO_CONTENT_FRAGMENT + HOME_HERO_DESIGN_FRAGMENT) ─
export type HomeHeroData = {
  // Content
  eyebrow?: string | null
  heading: string
  description?: string | null
  buttons?: CtaButtonData[] | null
  // Layout (direct values)
  skeleton?: Skeleton | null
  heightMode?: HeightMode | null
  contentAlign?: ContentAlign | null
  backdrop?: Backdrop | null
  foreground?: boolean | null
  contentStrip?: boolean | null
  siloLayout?: HeroSiloLayout | null
  scrimStyle?: ScrimStyle | null
  splitMedia?: SplitMedia | null
  splitImageStyle?: SplitImageStyle | null
  splitImageRatio?: SplitImageRatio | null
  textTreatment?: TextTreatment | null
  mediaSide?: MediaSide | null
  motion?: Motion | null
  // Shared surface cascade — inherits SITE defaults (identical to internalHero)
  schemeOverride?: HeroSchemePref | null
  backgroundImage?: HeroImage
  backgroundNone?: boolean | null
  foregroundImage?: HeroImage
  foregroundNone?: boolean | null
  scrimOpacityOverride?: number | null
  // Section Background — a full-bleed pattern/texture behind the ENTIRE hero
  // (both layouts), with the shared scrim. Page-only (no site default), so its
  // mere presence = "on"; no *None flag. Scheme + scrim controls are reused.
  sectionBackgroundImage?: HeroImage
  // Assets
  galleryImages?: HeroImage[] | null
  videoUrl?: string | null
  practiceAreaItems?: PracticeAreaItem[] | null
}

// ─── Resolved content (NAP tokens applied, buttons mapped) ────────────────────
export type ResolvedHomeContent = {
  eyebrow?: string | null
  heading: string
  description?: string | null
  ctas: CtaItem[]
  galleryImages: HeroImage[]
  videoUrl?: string | null
  practiceAreaItems: PracticeAreaItem[]
}

// ─── Skeleton component contract ──────────────────────────────────────────────
export type SkeletonProps = {
  config: HeroConfig
  content: ResolvedHomeContent
  surface: ResolvedHeroSurface
  // The resolved full-bleed Section Background, or null when none is set. Rendered
  // as the band's z-0 backdrop (with scrim) beneath the layout's content + media.
  sectionBackground?: ResolvedHeroSurface | null
}
