'use client'

import {MotionConfig} from 'framer-motion'

// Routes the user's prefers-reduced-motion OS setting through to every
// Framer Motion animation in the subtree (drawer, dropdown, submenu,
// hamburger morph, filter crossfade). CSS transitions are already
// handled by the global media query in globals.css.
export function MotionRoot({children}: {children: React.ReactNode}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
