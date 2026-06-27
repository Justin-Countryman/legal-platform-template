'use client'

// Site-level hero background defaults (image + scrim) supplied once by the
// layout and consumed by InternalHero / InternalPageHeader deep in the page
// tree. The scheme axis travels separately via heroSchemeContext (which already
// supports per-route overrides); this carries only the new image/scrim defaults.

import {createContext, useContext} from 'react'
import {DEFAULT_SCRIM_OPACITY, type HeroImage, type HeroScrimStyle} from './heroSurface'

export type HeroSurfaceDefaults = {
  bgImage: HeroImage
  foreground: HeroImage
  scrimOpacity: number
  // Site-level scrim style + section background (full-bleed pattern behind heroes
  // with no focal bg image), sourced from Hero Settings.
  scrimStyle: HeroScrimStyle
  sectionBg: HeroImage
}

const DEFAULT: HeroSurfaceDefaults = {
  bgImage: null,
  foreground: null,
  scrimOpacity: DEFAULT_SCRIM_OPACITY,
  scrimStyle: 'flat',
  sectionBg: null,
}

const HeroSurfaceContext = createContext<HeroSurfaceDefaults>(DEFAULT)

export const useHeroSurfaceDefaults = () => useContext(HeroSurfaceContext)

export function HeroSurfaceProvider({
  value,
  children,
}: {
  value: HeroSurfaceDefaults
  children: React.ReactNode
}) {
  return <HeroSurfaceContext.Provider value={value}>{children}</HeroSurfaceContext.Provider>
}
