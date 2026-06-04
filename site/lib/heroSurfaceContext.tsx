'use client'

// Site-level hero background defaults (image + scrim) supplied once by the
// layout and consumed by InternalHero / InternalPageHeader deep in the page
// tree. The scheme axis travels separately via heroSchemeContext (which already
// supports per-route overrides); this carries only the new image/scrim defaults.

import {createContext, useContext} from 'react'
import {DEFAULT_SCRIM_OPACITY, type HeroImage} from './heroSurface'

export type HeroSurfaceDefaults = {
  bgImage: HeroImage
  foreground: HeroImage
  scrimOpacity: number
}

const DEFAULT: HeroSurfaceDefaults = {bgImage: null, foreground: null, scrimOpacity: DEFAULT_SCRIM_OPACITY}

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
