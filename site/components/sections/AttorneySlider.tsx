'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {IconButton} from '@/components/ui/IconButton'
import {AttorneyCard, type AttorneyCardStyle} from './AttorneyCard'
import {type AttorneyCard as AttorneyCardData} from './AttorneyCardParts'

// ─── Chevron ──────────────────────────────────────────────────────────────────

function Chevron({dir}: {dir: 'left' | 'right'}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
}

// ─── Slider ───────────────────────────────────────────────────────────────────
// Horizontal CSS scroll-snap row of attorney cards with prev/next arrows and
// pagination dots. No carousel library, no autoplay. Active index + edge state
// are derived from scroll position so native swipe/drag stays in sync.

export function AttorneySlider({
  attorneys,
  cardStyle,
}: {
  attorneys: AttorneyCardData[]
  cardStyle?: AttorneyCardStyle | null
}) {
  const scroller = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  // Distance between two adjacent slides (card width + gap). Falls back to the
  // container width when only one card is present.
  const stepPx = useCallback(() => {
    const el = scroller.current
    if (!el) return 0
    const items = el.querySelectorAll<HTMLElement>('[data-slide]')
    if (items.length >= 2) return items[1].offsetLeft - items[0].offsetLeft
    return items[0]?.offsetWidth ?? el.clientWidth
  }, [])

  const update = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const s = stepPx()
    const i = s > 0 ? Math.round(el.scrollLeft / s) : 0
    setActive(Math.max(0, Math.min(i, attorneys.length - 1)))
    setAtStart(el.scrollLeft <= 2)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
  }, [attorneys.length, stepPx])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    // Defer the initial measure to the next frame so we don't setState
    // synchronously inside the effect body (react-hooks/set-state-in-effect).
    const raf = requestAnimationFrame(update)
    el.addEventListener('scroll', update, {passive: true})
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update])

  // Honor the user's reduced-motion preference for programmatic scrolling — the
  // platform's global CSS reset only covers `html { scroll-behavior }` and CSS
  // animations, not JS smooth-scroll on this element.
  const scrollBehavior = (): ScrollBehavior =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'

  const scrollToIndex = (i: number) => {
    scroller.current?.scrollTo({left: stepPx() * i, behavior: scrollBehavior()})
  }
  const nudge = (dir: -1 | 1) => {
    scroller.current?.scrollBy({left: stepPx() * dir, behavior: scrollBehavior()})
  }

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label="Attorneys">
      {/* overflow-x:auto forces overflow-y to auto, which clips the cards' hover
          lift + shadow + focus ring. p-4 gives the scrollport room; the matching
          -m-4 offsets it so the track still aligns to the container. */}
      <ul
        ref={scroller}
        role="list"
        aria-label="Attorneys"
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory p-4 -m-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {attorneys.map((attorney, i) => (
          <li
            key={attorney._id}
            data-slide
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${attorneys.length}`}
            className="shrink-0 snap-start basis-[85%] sm:basis-[calc(50%-0.75rem)] lg:basis-[calc(33.333%-1rem)]"
          >
            <AttorneyCard attorney={attorney} cardStyle={cardStyle} />
          </li>
        ))}
      </ul>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-center gap-4">
        <IconButton
          icon={<Chevron dir="left" />}
          aria-label="Previous attorneys"
          onClick={() => nudge(-1)}
          disabled={atStart}
          className="border border-border"
        />

        <div className="flex items-center gap-1" role="group" aria-label="Choose attorney">
          {attorneys.map((attorney, i) => (
            // 24×24 hit area (WCAG 2.2 AA · 2.5.8 Target Size) with a small visual dot inside.
            <button
              key={attorney._id}
              type="button"
              aria-label={`Go to attorney ${i + 1} of ${attorneys.length}`}
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

        <IconButton
          icon={<Chevron dir="right" />}
          aria-label="Next attorneys"
          onClick={() => nudge(1)}
          disabled={atEnd}
          className="border border-border"
        />
      </div>
    </div>
  )
}
