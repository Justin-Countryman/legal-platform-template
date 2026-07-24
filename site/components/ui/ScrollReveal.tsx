'use client'

import {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {useReducedMotion} from 'framer-motion'

// ─── ScrollReveal ─────────────────────────────────────────────────────────────
//
// The single sanctioned way to do scroll-triggered motion on the platform. A
// second implementation is a defect, not a choice.
//
// TRANSFORM ONLY. NO OPACITY. EVER.
//
// This is the load-bearing rule and every other decision here follows from it.
// Content is painted at all times — offset by 24px, never hidden — and slides
// into place when it scrolls into view. There is no state in which content is
// invisible waiting for a trigger to fire.
//
// The reason is the failure mode, not the aesthetic. An opacity-based reveal
// that never completes ships a blank space on a live client site, and nothing
// reports it: no error, no failed build, no warning. That is the same
// blank-field failure shape as `listedOnWebsite` and the case-result
// disclaimer, relocated into CSS. A transform-based reveal that never completes
// leaves a block sitting 24px low, which nobody notices and which costs
// nothing. Worst case is cosmetic rather than a missing section.
//
// This generalizes the doctrine already written for on-load hero motion at
// `components/layout/homeHero/shared.tsx` ("movement variants are
// TRANSFORM-ONLY — content is always painted, just offset"). Both entrance
// systems now answer to one rule.
//
// DELIBERATE EXCEPTION: this is the one effect on the platform that does not
// use Framer Motion. Framer is the animation library everywhere else and stays
// that way. It is wrong HERE because the `domAnimation` feature bundle loads
// asynchronously (see MotionRoot), so a Framer-driven reveal would either apply
// its starting state before the animator is ready — the exact risk the rule
// above exists to remove — or block on the import and jank. An
// IntersectionObserver trigger plus a CSS transition depends on neither. CSS
// transitions are an existing platform mechanism (every button animation in
// globals.css is one), not a second animation runtime. Do not "correct" this
// to `m.div`.
//
// See BI-Library.md → Scroll-reveal, for the usage rule and when NOT to apply it.

// Motion values. 24px and 600ms match the hero's `entrance` variant so the two
// entrance systems feel like one. The easing is the repo's `--ease-gentle`
// (globals.css), whose own comment designates it for content reveals: an even
// ease-out that decelerates across the whole duration, rather than the
// front-loaded `--ease-smooth` used for structural UI, which snaps early and
// reads as urgent for something arriving under the user's own scroll.
export const REVEAL_DISTANCE_PX = 24
export const REVEAL_DURATION_MS = 600
export const REVEAL_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)'
export const REVEAL_THRESHOLD = 0.15

// `unset` renders no styles at all — the server-rendered state, and the state
// every failure path falls back to.
type Phase = 'unset' | 'offset' | 'revealed'

// useLayoutEffect warns when it runs during SSR. The work below is client-only
// (it measures the DOM), so fall back to useEffect on the server, where neither
// runs. Layout effect on the client keeps the offset application inside the
// same frame as mount, so a user scrolling immediately cannot catch the element
// un-offset for a paint.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function ScrollReveal({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('unset')
  // NOT reactive, stated honestly (item 38 — verified in the installed
  // framer-motion 12.38.0 source): useReducedMotion reads the preference ONCE
  // per mount (`useState(prefersReducedMotion.current)`), so a mid-session OS
  // toggle applies from the next mount/navigation, not the same frame. The
  // prior comment here claimed the opposite. Returns null during SSR and
  // before mount, which coerces to "not reduced" — safe here because nothing
  // is applied until the effect below runs anyway.
  const reduce = useReducedMotion() ?? false

  // Armed once. Guarding on a ref rather than on `phase` keeps `phase` out of
  // the dependency list: a re-run triggered by the state update would tear down
  // the observer it had just attached.
  const armed = useRef(false)

  useIsomorphicLayoutEffect(() => {
    // Ruling: reduced motion means NO motion. Not a faster transition, not a
    // collapsed duration — the offset is never applied and the observer is
    // never attached. Content renders in place, complete.
    if (reduce) return
    if (armed.current) return

    const el = ref.current
    if (!el) return

    // Feature-detect before anything else. No observer means no way to complete
    // a reveal, so nothing is started.
    if (typeof IntersectionObserver === 'undefined') return

    // ONLY content strictly below the fold is ever touched. This is what makes
    // the primitive incapable of regressing LCP: the LCP element is by
    // definition painted in the initial viewport, so it lands here and returns
    // before any state is applied. It also removes the flicker of offsetting
    // something the user is already looking at.
    //
    // The single `top` comparison is deliberate and covers three cases at once:
    // fully visible, straddling the fold, and scrolled past above the viewport
    // (a restored scroll position or a hash anchor). The last is off-screen, so
    // offsetting it would be safe by the rule above — but it would mean content
    // the visitor has already scrolled past animates when they scroll back up,
    // which reads as a glitch rather than an arrival.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) return

    // Attach BEFORE applying any state. If the constructor or observe() throws,
    // the element is still untouched and renders exactly as the server sent it.
    let observer: IntersectionObserver
    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return
          setPhase('revealed')
          // Reveal once. An element that has revealed stays revealed — it is
          // never re-hidden on scroll away, and never re-animated on return.
          observer.disconnect()
        },
        {threshold: REVEAL_THRESHOLD},
      )
      observer.observe(el)
    } catch {
      return
    }

    armed.current = true
    setPhase('offset')

    return () => observer.disconnect()
  }, [reduce])

  // `reduce` short-circuits the style entirely rather than shortening a
  // duration, which is also what makes a mid-session toggle correct: the
  // transform is dropped instantly, with no transition to run.
  const style =
    reduce || phase === 'unset'
      ? undefined
      : phase === 'offset'
        ? {transform: `translateY(${REVEAL_DISTANCE_PX}px)`}
        : {
            transform: 'none',
            transition: `transform ${REVEAL_DURATION_MS}ms ${REVEAL_EASING}`,
          }

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}
