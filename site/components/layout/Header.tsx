'use client'

import {usePathname} from 'next/navigation'
import {ApexHeader}  from './headers/ApexHeader'
import {LedgeHeader} from './headers/LedgeHeader'
import {MesaHeader}  from './headers/MesaHeader'
import {PrismHeader} from './headers/PrismHeader'
import {RidgeHeader} from './headers/RidgeHeader'
import {CrestHeader} from './headers/CrestHeader'
import {SpireHeader} from './headers/SpireHeader'
import {suppressMergeForRoute} from './headers/shared'
// Re-export types so layout.tsx import paths don't change
export type {NavChild, NavItem, HeaderData} from './headers/shared'

export function Header({data}: {data: import('./headers/shared').HeaderData}) {
  // Pages with bespoke (non-standard-hero) top sections can't host a merged
  // overlay header — fall back to a solid in-flow bar on those routes. usePathname
  // is static-render-safe (unlike useSearchParams) so this adds no dynamic deopt.
  const resolved = suppressMergeForRoute(data, usePathname())
  switch (resolved.headerLayout) {
    case 'ledge':  return <LedgeHeader  data={resolved} />
    case 'mesa':   return <MesaHeader   data={resolved} />
    case 'prism':  return <PrismHeader  data={resolved} />
    case 'ridge':  return <RidgeHeader  data={resolved} />
    case 'crest':  return <CrestHeader  data={resolved} />
    case 'spire':  return <SpireHeader  data={resolved} />
    case 'apex':
    default:       return <ApexHeader   data={resolved} />
  }
}
