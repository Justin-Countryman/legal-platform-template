'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {hasImage} from '@/lib/sanity/image'
import {siloHover, type SiloHoverEffect} from '@/lib/siloHover'
import {CAROUSEL_SCROLLER, CAROUSEL_SLIDE_BASIS} from '../carouselClasses'
import type {SiloNavItem} from './types'
import {
  TileLink, TileImage, TileFill, TileGlow, TileBorder, TileIcon, TileLabel, TileBlurb, TileArrow,
} from './parts'

const CARD = 'flex h-full flex-col rounded-ui border border-border'

// Mobile swipe carousel for the silo nav. A horizontal CSS scroll-snap row of
// Spotlight-style cards with a peek of the next card + pagination dots — keeps the
// rich practice-area cards on phones without the long vertical scroll of a stacked
// grid. The desktop grid layouts render separately (this is hidden ≥ md). Mirrors
// AttorneySlider: no library, no autoplay, active dot derived from scroll position
// so native swipe stays in sync; programmatic scroll honours reduced-motion. Cards
// reuse the shared tile primitives, so they inherit the focus ring, the
// active:scale-95 touch press, and decorative-media a11y.
export function SiloCarousel({
  items, ariaLabel, hoverEffects, showArrow, className,
}: {
  items: SiloNavItem[]
  ariaLabel: string
  hoverEffects: SiloHoverEffect[]
  showArrow: boolean
  className?: string
}) {
  const fx = siloHover(hoverEffects)
  const scroller = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  const stepPx = useCallback(() => {
    const el = scroller.current
    if (!el) return 0
    const slides = el.querySelectorAll<HTMLElement>('[data-slide]')
    if (slides.length >= 2) return slides[1].offsetLeft - slides[0].offsetLeft
    return slides[0]?.offsetWidth ?? el.clientWidth
  }, [])

  const update = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const s = stepPx()
    const i = s > 0 ? Math.round(el.scrollLeft / s) : 0
    setActive(Math.max(0, Math.min(i, items.length - 1)))
  }, [items.length, stepPx])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    // Defer the first measure a frame so we don't setState synchronously in the
    // effect body (react-hooks/set-state-in-effect).
    const raf = requestAnimationFrame(update)
    el.addEventListener('scroll', update, {passive: true})
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update])

  // Honour reduced-motion for the dot-driven programmatic scroll (the global CSS
  // reset only covers html scroll-behavior + CSS animations, not JS scrollTo).
  const scrollBehavior = (): ScrollBehavior =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'
  const scrollToIndex = (i: number) =>
    scroller.current?.scrollTo({left: stepPx() * i, behavior: scrollBehavior()})

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul ref={scroller} role="list" className={CAROUSEL_SCROLLER}>
        {items.map((item, i) => {
          const onImage = hasImage(item.image)
          return (
            <li
              key={item._key}
              data-slide
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}`}
              className={`shrink-0 snap-start ${CAROUSEL_SLIDE_BASIS}`}
            >
              <TileLink href={item.href ?? '#'} dark={onImage} className={`${CARD} min-h-[15rem] ${fx.container}`}>
                {onImage ? <TileImage item={item} fx={fx} /> : <TileFill />}
                <TileGlow fx={fx} />
                <div className="relative z-10 flex h-full flex-col p-6">
                  <TileIcon item={item} fx={fx} onImage={onImage} size="sm" />
                  <div className="mt-auto pt-10">
                    <div className="flex items-end justify-between gap-4">
                      <TileLabel item={item} fx={fx} />
                      {showArrow && <TileArrow fx={fx} />}
                    </div>
                    <TileBlurb item={item} className="mt-2 text-sm leading-relaxed text-foreground-muted line-clamp-1" />
                  </div>
                </div>
                <TileBorder fx={fx} />
              </TileLink>
            </li>
          )
        })}
      </ul>

      {/* Pagination dots — derived from scroll position; only meaningful with >1 card.
          24×24 hit area (WCAG 2.5.8) with a small visual dot inside; the active dot
          widens. Clicking a dot scrolls to that card (keyboard-reachable too). */}
      {items.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-1" role="group" aria-label="Choose practice area">
          {items.map((item, i) => (
            <button
              key={item._key}
              type="button"
              aria-label={`Go to ${item.label ?? `item ${i + 1}`}, ${i + 1} of ${items.length}`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => scrollToIndex(i)}
              className="group grid h-6 w-6 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              <span
                className={[
                  'block h-2 rounded-full transition-[width,background-color] duration-ui-base',
                  i === active ? 'w-5 bg-action' : 'w-2 bg-border group-hover:bg-foreground-subtle',
                ].join(' ')}
              />
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
