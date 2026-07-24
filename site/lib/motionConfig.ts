// Named Framer Motion transition configs — import from here instead of inlining values.
// Structural configs (dropdown, drawer, subnav) are FIXED — they do NOT scale with
// the motionTempo design setting. Values align with --motion-structural-* CSS tokens.
// Easing curves: smooth (enter) = cubic-bezier(0.25,0,0,1), balanced (toggle) = cubic-bezier(0.45,0,0.55,1)

import {useReducedMotionConfig} from 'framer-motion'

type EaseCurve = [number, number, number, number]

const smooth:   EaseCurve = [0.25, 0, 0, 1]
const balanced: EaseCurve = [0.45, 0, 0.55, 1]

export const motionConfig = {
  // Structural — fixed, matches --motion-structural-slow (400ms)
  dropdown:  {duration: 0.4,  ease: smooth},
  // Structural — fixed, matches --motion-structural-slow (400ms)
  drawer:    {duration: 0.4,  ease: smooth},
  // Structural — fixed, matches --motion-structural-base (250ms)
  subnav:    {duration: 0.25, ease: smooth},
  // Structural — fixed micro, chevron rotate (no easing needed at this scale)
  chevron:   {duration: 0.15},
  // UI crossfade on filter/tab switch — fixed at structural-fast (150ms), symmetric
  crossfade: {duration: 0.15, ease: balanced},
}

// ─── Reduced motion (item 38 ruling) ─────────────────────────────────────────
//
// What "reduced motion" means on this platform, in one place:
//   - POSITIONAL animation (transforms, x/y, width/height) is disabled
//     entirely by `MotionConfig reducedMotion="user"` at the root
//     (components/ui/MotionRoot.tsx) — framer snaps those values.
//   - EVERYTHING ELSE collapses to ~10ms, not 0: the same doctrine the global
//     CSS rule in app/globals.css applies to CSS transitions/animations
//     (10ms avoids jump-cut artifacts in collapse animations and lets
//     AnimatePresence exit callbacks still fire).
//   - JS smooth-scrolling (AttorneySlider, SiloCarousel) switches to
//     behavior:'auto' — those components read matchMedia at CALL time, so a
//     mid-session OS toggle applies on the next interaction.
//
// MotionConfig's gate covers ONLY framer's positional keys — opacity is not
// one of them, so a fade animates at full duration under reduced motion
// (verified against installed framer-motion 12.38.0). Any framer transition
// that animates a NON-positional value (opacity, height-with-opacity pairs,
// crossfades) must therefore take its config from this hook rather than the
// static `motionConfig` object above: same configs normally, every duration
// collapsed to 10ms when the visitor prefers reduced motion.
//
// Built on framer's public `useReducedMotionConfig` — the SAME gate
// MotionConfig's positional check consults, so the two mechanisms cannot
// disagree: it honors the root `reducedMotion` prop ("user" in production,
// "always"/"never" overrides, which is also what tests drive) and falls
// through to the OS preference. Honestly stated (verified in the installed
// source, and the reason ScrollReveal's older "reactive" claim is wrong):
// framer reads the preference ONCE per component mount — a mid-session OS
// toggle applies from the next mount/navigation, not the same frame.
const REDUCED: typeof motionConfig = {
  dropdown:  {duration: 0.01, ease: smooth},
  drawer:    {duration: 0.01, ease: smooth},
  subnav:    {duration: 0.01, ease: smooth},
  chevron:   {duration: 0.01},
  crossfade: {duration: 0.01, ease: balanced},
}

export function useMotionConfig(): typeof motionConfig {
  const reduce = useReducedMotionConfig() ?? false
  return reduce ? REDUCED : motionConfig
}
