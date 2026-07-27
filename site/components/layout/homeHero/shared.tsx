'use client'

// Shared building blocks for every homepage-hero variant. The goal: each variant
// file is tiny and purely structural — all surface/scheme/merge/typography/CTA
// plumbing lives here and is reused from the existing internal-hero system.

import {useSyncExternalStore, type CSSProperties, type ReactElement, type ReactNode} from 'react'
import {m, useReducedMotion, type Variants} from 'framer-motion'
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

// Re-exported for the skeletons that build their own flush layout (e.g. Split full-bleed).
export {HERO_HEADER_CLEARANCE}

// ─── Hydration gate ──────────────────────────────────────────────────────────
// `false` on the server and through the hydration render, `true` afterwards.
//
// This is the useSyncExternalStore form of the mount flag rather than
// `useState(false)` + `useEffect(() => setMounted(true), [])`. The two produce
// the same two-phase result, but the effect form calls setState synchronously
// inside an effect, which React's `react-hooks/set-state-in-effect` rule flags
// as a cascading render. Here the server snapshot IS `false` and the client
// snapshot IS `true`, so the value is read rather than assigned — no second
// render is scheduled by us, and nothing has to be suppressed.
//
// `subscribe` returns a no-op unsubscribe: hydration happens once and never
// changes again, so there is no external store to listen to.
const subscribeToNothing = () => () => {}
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,  // client
    () => false, // server + hydration render
  )
}

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
  uncapped = false,
  backdrop = false,
  backdropNode,
  imageBacked,
  center = false,
  flush = false,
  className,
  style,
  children,
}: {
  surface: ResolvedHeroSurface
  fullViewport: boolean
  /** Drop the full-viewport height ceiling so the band grows to fit its
   * content. Passed when the practice-area content strip renders (ruled
   * 2026-07-23, item 58): the strip may extend below the fold — the visitor
   * scrolls — but it must never be cut, which is exactly what the
   * `max-h-[60rem]` cap + `overflow-hidden` did (measured: a 412px strip
   * with 98px visible). No other consumer relies on the cap; it exists to
   * keep a strip-less full-viewport hero from stretching on very tall
   * displays, and that behavior is unchanged. */
  uncapped?: boolean
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
  return (
    <section
      // Non-flush bands reserve the (possibly merged) header height at the top.
      // Flush bands drop it so a full-bleed child reaches the top edge; the child
      // (e.g. the split text column) re-applies the clearance to itself.
      style={{...(flush ? {} : {paddingTop: HERO_HEADER_CLEARANCE}), ...style}}
      data-ring-context={surface.isDark ? 'dark' : undefined}
      data-hero-image={showBackdrop || imageBacked ? 'true' : undefined}
      className={[
        'relative isolate overflow-hidden',
        flush ? '' : 'px-[5%] pb-12 md:pb-16 lg:pb-20',
        '[--hero-pt:2rem] md:[--hero-pt:3rem] lg:[--hero-pt:4rem]',
        'flex flex-col',
        fullViewport ? (uncapped ? 'min-h-svh' : 'min-h-svh max-h-[60rem]') : '',
        center ? 'justify-center' : '',
        hasFullBackdrop ? '' : surface.isDark ? 'bg-brand-dark' : 'bg-hero-tint',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
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
    <h1 className={['marketing-h1 font-heading font-bold text-foreground', className ?? ''].filter(Boolean).join(' ')}>
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
// Premium, content-focused entrances. Two safety rules so the hero (and its LCP
// H1) is NEVER shipped hidden:
//   • Movement variants (entrance/slide/stagger/staggerRight) are TRANSFORM-ONLY
//     (no opacity) — content is always painted, just offset; safe for SSR / no-JS
//     / LCP, so they render immediately.
//   • `fade` animates opacity (would hide content), so it's gated behind a mount
//     flag: SSR / no-JS / reduced-motion render fully visible; the fade only runs
//     after hydration.
// Reduced-motion → no animation at all.
const EASE: [number, number, number, number] = [0.25, 0, 0, 1]
const WHOLE = {
  fade: {hidden: {opacity: 0}, show: {opacity: 1, transition: {duration: 1.2, ease: EASE}}},
  entrance: {hidden: {y: 24}, show: {y: 0, transition: {duration: 0.6, ease: EASE}}},
  slide: {hidden: {x: -48}, show: {x: 0, transition: {duration: 0.7, ease: EASE}}},
} satisfies Record<string, Variants>
const STAGGER_CONTAINER: Variants = {hidden: {}, show: {transition: {staggerChildren: 0.12, delayChildren: 0.08}}}
const STAGGER_ITEM: Variants = {hidden: {y: 20}, show: {y: 0, transition: {duration: 0.5, ease: EASE}}}
const STAGGER_ITEM_RIGHT: Variants = {hidden: {x: 48}, show: {x: 0, transition: {duration: 0.5, ease: EASE}}}

// A vertically-stacked text block (eyebrow → h1 → lede → CTAs) used by most
// variants. `align` centers the text and the CTA group. `motion` adds an on-load
// content animation.
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
  const reduce = useReducedMotion() ?? false
  // `fade` animates opacity → would hide content pre-hydration; only enable it
  // after mount (SSR / no-JS / first paint stay fully visible). Transform-only
  // variants are always safe to render (content is painted, just offset).
  const mounted = useIsHydrated()

  const centered = align === 'center'
  // mx-auto centers the max-width column when centered; explicit per-element
  // alignment guards against inherited-text-align surprises.
  const outerClass = [centered ? 'mx-auto text-center' : 'text-left', className ?? ''].filter(Boolean).join(' ')

  const pieces = [
    eyebrow ? <HeroEyebrow key="e" className={centered ? 'justify-center' : undefined}>{eyebrow}</HeroEyebrow> : null,
    <HeroHeading key="h" className={['mb-5 md:mb-6', centered ? 'text-center' : 'text-left', headingClassName ?? ''].filter(Boolean).join(' ')}>{heading}</HeroHeading>,
    description ? <HeroLede key="l" className={centered ? 'text-center' : 'text-left'}>{description}</HeroLede> : null,
    ctas.length ? <HeroCtas key="c" items={ctas} isDark={isDark} align={align} /> : null,
  ].filter(Boolean) as ReactElement[]

  const enabled = !reduce && motion !== 'none' && (motion !== 'fade' || mounted)
  const active = enabled ? motion : null
  if (!active) return <div className={outerClass}>{pieces}</div>

  if (active === 'stagger' || active === 'staggerRight') {
    const item = active === 'staggerRight' ? STAGGER_ITEM_RIGHT : STAGGER_ITEM
    return (
      <m.div className={outerClass} initial="hidden" animate="show" variants={STAGGER_CONTAINER}>
        {pieces.map((node) => (
          <m.div key={node.key} variants={item}>
            {node}
          </m.div>
        ))}
      </m.div>
    )
  }
  const variants = WHOLE[active as keyof typeof WHOLE]
  if (!variants) return <div className={outerClass}>{pieces}</div>
  return (
    <m.div className={outerClass} initial="hidden" animate="show" variants={variants}>
      {pieces}
    </m.div>
  )
}
