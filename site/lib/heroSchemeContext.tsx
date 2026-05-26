'use client'

import {createContext, useContext} from 'react'

export type HeroScheme = 'dark' | 'light'

const HeroSchemeContext = createContext<HeroScheme>('dark')

export const useHeroScheme = () => useContext(HeroSchemeContext)

export function HeroSchemeProvider({scheme, children}: {scheme: HeroScheme; children: React.ReactNode}) {
  return <HeroSchemeContext.Provider value={scheme}>{children}</HeroSchemeContext.Provider>
}
