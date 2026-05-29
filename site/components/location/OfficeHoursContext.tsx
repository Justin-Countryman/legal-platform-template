'use client'

// Supplies office hours to the in-content "Office Hours" block (PortableText).
// The (site) layout provides the firm's PRIMARY location hours as the default, so
// the block works on any page. Location pages wrap their content in this provider
// again with that page's own location hours, overriding the default for that page.
import {createContext, useContext} from 'react'
import type {OfficeHours as OfficeHoursType} from '@/components/layout/Footer'

const OfficeHoursContext = createContext<OfficeHoursType | null>(null)

export function OfficeHoursProvider({
  value,
  children,
}: {
  value: OfficeHoursType | null
  children: React.ReactNode
}) {
  return <OfficeHoursContext.Provider value={value}>{children}</OfficeHoursContext.Provider>
}

export function useOfficeHours(): OfficeHoursType | null {
  return useContext(OfficeHoursContext)
}
