'use client'

import {createContext, useContext, type ReactNode} from 'react'
import {
  type SidebarDesignSettings,
  DEFAULT_SIDEBAR_NAV_ICON_STYLE,
  DEFAULT_SIDEBAR_WIDGET_HEADER_LINE,
  DEFAULT_SIDEBAR_ITEM_SEPARATORS,
} from '@/lib/designTokens'

// WS-Sidebar Phase 2.5 — context-distribution of the three sidebar design
// settings shipped in Phase 2.1. Mirrors the HeroSchemeProvider pattern
// (see lib/heroSchemeContext.tsx) so the root layout fetches once and
// every Sidebar instance reads the resolved settings without prop threading.
//
// Default value matches `resolveSidebarDesignSettings(null)` — applied when
// the provider is absent (e.g., the existing DesignStudio stubs that render
// `<Sidebar>` directly without the layout chrome).

const DEFAULTS: SidebarDesignSettings = {
  sidebarNavIconStyle: DEFAULT_SIDEBAR_NAV_ICON_STYLE,
  sidebarWidgetHeaderLine: DEFAULT_SIDEBAR_WIDGET_HEADER_LINE,
  sidebarItemSeparators: DEFAULT_SIDEBAR_ITEM_SEPARATORS,
}

const SidebarDesignSettingsContext = createContext<SidebarDesignSettings>(DEFAULTS)

export const useSidebarDesignSettings = () => useContext(SidebarDesignSettingsContext)

export function SidebarDesignSettingsProvider({
  value,
  children,
}: {
  value: SidebarDesignSettings
  children: ReactNode
}) {
  return (
    <SidebarDesignSettingsContext.Provider value={value}>
      {children}
    </SidebarDesignSettingsContext.Provider>
  )
}
