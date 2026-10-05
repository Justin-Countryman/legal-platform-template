'use client'

// Shared building blocks for every homepage-hero variant. The goal: each variant
// file is tiny and purely structural — all surface/scheme/merge/typography/CTA
// plumbing lives here and is reused from the existing internal-hero system.

import {type CSSProperties, type ReactNode} from 'react'
import {
  resolveHeroSurface,
  type HeroScheme,
  type HeroSiteDefaults,
  type HeroPageOverrides,
  type ResolvedHeroSurface,
} from '@/lib/heroSurface'
import {HeroBackdrop} from '@/components/layout/HeroBackdrop'
import {HERO_HEADER_CLEARANCE} from '@/lib/heroLayout'
import {ButtonGroup, type CtaItem} from '@/components/ui/ButtonGroup'
import {Tagline} from '@/components/ui/Tagline'
import type {Motion} from './types'
import type {HeroGlow} from '@/lib/heroGround'

// Re-exported for the skeletons that build their own flush layout (e.g. Split full-bleed).
export {HERO_HEADER_CLEARANCE}

// ─── Image role + scheme resolution ───────────────────────────────────────────
// A variant interprets the background image differently:
//   • 'backdrop' — image sits BEHIND the text (full-bleed). Text needs the dark
//                  scrim treatment, so a present image forces the dark scheme
//                  (exactly resolveHeroSurface's default behavior).
//   • 'panel'    — image sits BESIDE/BELOW the text (its own column/area). The
//                  text is on the section's scheme background, NOT over the image,
//                  so the image must NOT force dark — the scheme follows settings.
//   • 'none'     — variant doesn't use a single backdrop image at all.
export type ImageRole = 'backdrop' | 'panel' | 'none'

// Resolve the surface for a variant, honoring its image role. Backdrop variants
// get the canonical cascade (image⇒dark). Panel/none variants get the same
// cascade but with the scheme decided by settings only (the side image never
// darkens the text column).
export function resolveVariantSurface(
  site: HeroSiteDefaults,
  page: HeroPageOverrides,
  imageRole: ImageRole,
): ResolvedHeroSurface {
  const base = resolveHeroSurface(site, page)
  if (imageRole === 'backdrop') return base
  const p = page ?? {}
  const scheme: HeroScheme =
    p.schemeOverride === 'dark' || p.schemeOverride === 'light'
      ? p.schemeOverride
      : site.scheme === 'light'
        ? 'light'
        : 'dark'
  return {...base, scheme, isDark: scheme === 'dark'}
}

// ─── Band wrapper ─────────────────────────────────────────────────────────────
// The <section> shell shared by all variants. Owns:
//   • the hero-merge contract (paddingTop reserves the overlaid header height)
//   • the height mode (content-driven vs. full-viewport)
//   • the scheme background (when there's no full-bleed backdrop)
//   • the cascade context attributes (data-ring-context / data-hero-image)
//   • the optional full-bleed backdrop image + scrim (backdrop variants)
// Variants render their own `container` inside `children`.
export function HeroBand({
  surface,
  fullViewport,
  backdrop = false,
  backdropNode,
  imageBacked,
  center = false,
  flush = false,
  className,
  style,
  children,
  edgeBelow = false,
  glow = null,
}: {
  /** A divider rises into this band's bottom (Phase 16C): a padded band grows by its
   *  depth, so the hero's own content never sits under it. A flush band has a child
   *  reaching the bottom edge, which is what the shape is meant to cut. */
  edgeBelow?: boolean
  /** The hero's place in the first run Gradient bloom lights (the roster eye of 2026-10-03, `[R-631]`; `walkPage().hero`).
   *  Drawn only where the band paints the dark ground: a light hero, or one behind a photograph, a mosaic or a section
   *  background, draws none, as a section does not over its photograph. */
  glow?: HeroGlow | null
  surface: ResolvedHeroSurface
  fullViewport: boolean
  /** Render the shared full-bleed background image + scrim (HeroBackdrop) behind the content. */
  backdrop?: boolean
  /** A custom full-bleed backdrop element (image+motion, mosaic, …) rendered at z-0 instead of HeroBackdrop. */
  backdropNode?: ReactNode
  /** Force the data-hero-image cascade (image-backed button treatment) for a custom backdrop. */
  imageBacked?: boolean
  /** Vertically center the content within the band (full-viewport / centered layouts). */
  center?: boolean
  /** Drop the section's horizontal gutter + bottom padding so a child (e.g. a full-bleed split image) can reach the viewport edge. The child owns its own padding. */
  flush?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const showBackdrop = backdrop && surface.hasImage
  const hasFullBackdrop = showBackdrop || !!backdropNode
  // The glow, as `SectionShell` draws a lit band's: its place and length in the run (`grad-i-*`, `grad-n-*`), its peak
  // (`grad-p-*`) and the side the light comes from; the band takes the photo band's colors (`data-glow`), under which
  // the glow is solved (`[R-557]`).
  const lit = glow && surface.isDark && !hasFullBackdrop ? glow : null
  return (
    <section
      // Non-flush bands reserve the (possibly merged) header height at the top.
      // Flush bands drop it so a full-bleed child reaches the top edge; the child
      // (e.g. the split text column) re-applies the clearance to itself.
      style={{...(flush ? {} : {paddingTop: HERO_HEADER_CLEARANCE}), ...style}}
      data-ring-context={surface.isDark ? 'dark' : undefined}
      data-hero-image={showBackdrop || imageBacked ? 'true' : undefined}
      data-glow={lit ? 'true' : undefined}
      className={[
        'relative isolate overflow-hidden',
        lit ? `band-glow grad-i-${Math.min(lit.index, 7)} grad-n-${Math.min(lit.length, 8)} grad-p-${Math.min(lit.peak ?? 0, 7)}` : '',
        lit?.side === 'left' ? 'glow-from-left' : '',
        flush ? '' : 'px-[5%] pb-12 md:pb-16 lg:pb-20',
        '[--hero-pt:2rem] md:[--hero-pt:3rem] lg:[--hero-pt:4rem]',
        'flex flex-col',
        // The 60rem ceiling keeps a full-viewport hero from stretching on very
        // tall displays. It had one escape hatch, `uncapped`, passed when the
        // practice-area content strip rendered (item 58, ruled 2026-07-23): the
        // strip could exceed the cap and `overflow-hidden` cut it. The strip was
        // removed on 2026-08-09 (item 163), so the only content that could ever
        // outgrow the ceiling is gone and the cap is unconditional again.
        fullViewport ? 'min-h-svh max-h-[60rem]' : '',
        center ? 'justify-center' : '',
        hasFullBackdrop ? '' : surface.isDark ? 'bg-brand-dark' : surface.lightGround === 'wash' ? 'bg-wash' : 'bg-hero-tint',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
      {edgeBelow && !flush && <div aria-hidden="true" className="h-divider shrink-0" />}
      {backdropNode ? backdropNode : showBackdrop && <HeroBackdrop surface={surface} />}
    </section>
  )
}

// ─── Content atoms ────────────────────────────────────────────────────────────
// Marketing-scale H1 (NOT the internal text-page-h1) + cascade-aware body/CTAs.

export function HeroEyebrow({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  if (!children) return null
  return (
    <Tagline as="p" className={className}>
      {children}
    </Tagline>
  )
}

export function HeroHeading({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    // `text-heading` (the roster eye of 2026-10-03, `[R-631]`): the dark ground on a light hero, the on-dark text on a dark one.
    <h1 className={['marketing-h1 font-heading font-bold text-heading', className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </h1>
  )
}

export function HeroLede({
  children,
  className,
}: {
  children?: ReactNode | null
  className?: string
}) {
  if (!children) return null
  return (
    <p className={['md:text-md text-foreground', className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </p>
  )
}

export function HeroCtas({
  items,
  isDark,
  align = 'start',
  className = 'mt-6 md:mt-8',
}: {
  items: CtaItem[]
  isDark: boolean
  align?: 'start' | 'center'
  className?: string
}) {
  if (!items.length) return null
  return <ButtonGroup items={items} context={isDark ? 'dark' : 'light'} align={align} className={className} />
}

// ─── Content (on-load) animation ──────────────────────────────────────────────
// CSS keyframes from the first paint (`globals.css`, `.hero-lines`), not Framer Motion, whose
// feature bundle loads after the page: the lines sat 20 px low until it arrived (4.4 s on a slow
// phone) and `fade` blanked the heading at hydration (monorepo WS-MOTION-LAYER-DESIGN.md §1.2).
// The values are the ones Framer ran. Movement is transform only, so content is always painted;
// the heading never fades (it is the largest paint; `fade` moves the lines around it); `slide`
// starts 24 px out under 768 px, where 48 cut the heading at the gutter; reduced motion draws none.

// A vertically-stacked text block (eyebrow → h1 → lede → CTAs) used by most
// variants. `align` centers the text and the CTA group. `motion` names the
// on-load content animation; each line is a child of the block, so the
// stylesheet can time them in turn.
export function HeroTextBlock({
  eyebrow,
  heading,
  description,
  ctas,
  isDark,
  align = 'start',
  motion = 'none',
  headingClassName,
  className,
}: {
  eyebrow?: string | null
  heading: ReactNode
  description?: ReactNode | null
  ctas: CtaItem[]
  isDark: boolean
  align?: 'start' | 'center'
  motion?: Motion
  headingClassName?: string
  className?: string
}) {
  const centered = align === 'center'
  // mx-auto centers the max-width column when centered; explicit per-element
  // alignment guards against inherited-text-align surprises.
  const outerClass = ['hero-lines', centered ? 'mx-auto text-center' : 'text-left', className ?? ''].filter(Boolean).join(' ')

  return (
    <div className={outerClass} data-hero-motion={motion === 'none' ? undefined : motion}>
      {eyebrow ? <HeroEyebrow className={centered ? 'justify-center' : undefined}>{eyebrow}</HeroEyebrow> : null}
      <HeroHeading className={['mb-5 md:mb-6', centered ? 'text-center' : 'text-left', headingClassName ?? ''].filter(Boolean).join(' ')}>{heading}</HeroHeading>
      {description ? <HeroLede className={centered ? 'text-center' : 'text-left'}>{description}</HeroLede> : null}
      {ctas.length ? <HeroCtas items={ctas} isDark={isDark} align={align} /> : null}
    </div>
  )
}
