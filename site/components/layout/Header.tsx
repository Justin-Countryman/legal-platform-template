import {ApexHeader}  from './headers/ApexHeader'
import {LedgeHeader} from './headers/LedgeHeader'
import {MesaHeader}  from './headers/MesaHeader'
import {PrismHeader} from './headers/PrismHeader'
import {RidgeHeader} from './headers/RidgeHeader'
import {CrestHeader} from './headers/CrestHeader'
import {SpireHeader} from './headers/SpireHeader'
// Re-export types so layout.tsx import paths don't change
export type {NavChild, NavItem, HeaderData} from './headers/shared'

export function Header({data}: {data: import('./headers/shared').HeaderData}) {
  switch (data.headerLayout) {
    case 'ledge':  return <LedgeHeader  data={data} />
    case 'mesa':   return <MesaHeader   data={data} />
    case 'prism':  return <PrismHeader  data={data} />
    case 'ridge':  return <RidgeHeader  data={data} />
    case 'crest':  return <CrestHeader  data={data} />
    case 'spire':  return <SpireHeader  data={data} />
    case 'apex':
    default:       return <ApexHeader   data={data} />
  }
}
