'use client'

import {LazyMotion, MotionConfig} from 'framer-motion'

// Lazy-load Framer Motion's DOM animation runtime instead of bundling it into
// initial page hydration. Every page's motion (header hamburger morph, mobile
// drawer, dropdowns/submenus, index-page crossfades) is interaction-triggered,
// so the ~18 KiB feature bundle is not needed for first paint. Deferring it to a
// dynamic import cuts hydration scriptEvaluation, which dominated the LCP render
// delay (measured in perf QA: ~2.2s render delay with TBT 0 and no render-blocking
// CSS/fonts). Subtree components use `m.*` (not `motion.*`) to bind these
// async-loaded features; the feature set lives in ./motionFeatures.
//
// Also routes the user's prefers-reduced-motion OS setting through MotionConfig
// (CSS transitions are handled by the global media query in globals.css).
const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default)

export function MotionRoot({children}: {children: React.ReactNode}) {
  return (
    <LazyMotion features={loadMotionFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
