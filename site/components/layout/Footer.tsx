import {AnchorFooter} from './footers/AnchorFooter'
import {MeridianFooter} from './footers/MeridianFooter'
import {PillarFooter} from './footers/PillarFooter'
import {DistrictsFooter} from './footers/DistrictsFooter'
import {LedgerFooter} from './footers/LedgerFooter'
import {CrestFooter} from './footers/CrestFooter'
import {BeaconFooter} from './footers/BeaconFooter'

// ─── Types ────────────────────────────────────────────────────────────────────

type FooterLink = {label: string; href: string | null}

export type OfficeHours = {
  mondayStatus?: string | null;    mondayOpen?: string | null;    mondayClose?: string | null
  tuesdayStatus?: string | null;   tuesdayOpen?: string | null;   tuesdayClose?: string | null
  wednesdayStatus?: string | null; wednesdayOpen?: string | null; wednesdayClose?: string | null
  thursdayStatus?: string | null;  thursdayOpen?: string | null;  thursdayClose?: string | null
  fridayStatus?: string | null;    fridayOpen?: string | null;    fridayClose?: string | null
  saturdayStatus?: string | null;  saturdayOpen?: string | null;  saturdayClose?: string | null
  sundayStatus?: string | null;    sundayOpen?: string | null;    sundayClose?: string | null
}

export type FooterLocation = {
  _id: string
  city?: string | null
  address1?: string | null
  address2?: string | null
  address3?: string | null
  state?: string | null
  zip?: string | null
  officePhone?: string | null
  tollFreePhone?: string | null
  pageSlug?: string | null
  hours?: OfficeHours | null
  emergency24_7?: boolean | null
  emergencyPhone?: string | null
  appointmentRequired?: string | null
}

export type FooterData = {
  firmName?: string | null
  logo?: {src: string; alt: string; width: number; height: number} | null
  address?: {
    address1?: string | null
    address2?: string | null
    address3?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    officePhone?: string | null
    tollFreePhone?: string | null
    hours?: OfficeHours | null
    emergency24_7?: boolean | null
    emergencyPhone?: string | null
    appointmentRequired?: string | null
  } | null
  ctaText?: string | null
  ctaUrl?: string | null
  actionButton1Label?: string | null
  actionButton1Url?: string | null
  actionButton2Label?: string | null
  actionButton2Url?: string | null
  column1?: FooterLink[] | null
  column2?: FooterLink[] | null
  facebookUrl?: string | null
  instagramUrl?: string | null
  twitterUrl?: string | null
  linkedInUrl?: string | null
  youTubeUrl?: string | null
  privacyPolicyUrl?: string | null
  disclaimerUrl?: string | null
  cookiesUrl?: string | null
  footerLayout?: string | null
  formEmbed?: string | null
  locations?: FooterLocation[] | null
}

// ─── Layout switcher ──────────────────────────────────────────────────────────

export function Footer({data}: {data: FooterData}) {
  switch (data.footerLayout) {
    case 'meridian':
      return <MeridianFooter data={data} />
    case 'pillar':
      return <PillarFooter data={data} />
    case 'districts':
      return <DistrictsFooter data={data} />
    case 'ledger':
      return <LedgerFooter data={data} />
    case 'crest':
      return <CrestFooter data={data} />
    case 'beacon':
      return <BeaconFooter data={data} />
    case 'anchor':
    default:
      return <AnchorFooter data={data} />
  }
}
