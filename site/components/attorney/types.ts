// Attorney profile page — canonical type used by all layout variants.
// Shape mirrors the output of ATTORNEY_PAGE_QUERY.
import type {SanityImage} from '@/lib/sanity/image'
import type {VideoItem} from '@/components/media/VideoEmbed'

// Projected via IMAGE_FRAGMENT — render with <SanityImage> (honors hotspot/crop).
export type AttorneyPhoto = SanityImage

export type PracticeAreaItem = {
  label: string
  slug: string | null
}

export type AttorneyLocation = {
  address1: string | null
  city: string | null
  state: string | null
  zip: string | null
  officePhone: string | null
  tollFreePhone: string | null
}

export type Attorney = {
  slug: string
  seoTitle: string | null
  metaDescription: string | null
  noIndex: boolean
  canonicalUrl: string | null

  // Identity
  firstName: string | null
  middleName: string | null
  lastName: string | null
  suffix: string | null
  h1: string | null
  jobTitle: string | null

  // Media & contact
  photo: AttorneyPhoto | null
  email: string | null
  showEmail: boolean
  showLocations: boolean
  linkedIn: string | null

  // Directory profiles — sameAs sources for Person JSON-LD; not displayed on page
  avvo: string | null
  superLawyers: string | null
  findLaw: string | null
  martindale: string | null

  // Biography
  fullBiography: unknown[] | null

  // Practice areas
  practiceAreas: PracticeAreaItem[] | null

  // Location (dereferenced; render only when showLocations === true)
  location: AttorneyLocation | null

  // Credentials — all blockContent
  yearAdmittedToBar: string | null
  barAdmissions: unknown[] | null
  stateBarAdmissions: unknown[] | null
  educationDegrees: unknown[] | null
  certifiedLegalSpecialties: unknown[] | null
  honors: unknown[] | null
  professionalAssociations: unknown[] | null
  proBonoActivities: unknown[] | null
  publications: unknown[] | null
  presentationsSeminars: unknown[] | null
  representativeCases: unknown[] | null
  pastPositions: unknown[] | null

  // Bio video(s) — "Attorney Bio" video docs linked via attorneyPage.videos
  videos: VideoItem[] | null

  // CTA
  hideCtaForm: boolean
  ctaFormOverride: {
    tagline: string | null
    heading: string | null
    description: string | null
    buttons: Array<{title: string | null; url: string | null; variant: string | null} | null> | null
  } | null
}

export function buildFullName(
  a: Pick<Attorney, 'h1' | 'firstName' | 'middleName' | 'lastName' | 'suffix'>,
): string {
  if (a.h1) return a.h1
  return [a.firstName, a.middleName, a.lastName, a.suffix].filter(Boolean).join(' ')
}

export function formatAddress(loc: AttorneyLocation): string {
  return [
    loc.address1,
    loc.city,
    loc.state && loc.zip
      ? `${loc.state} ${loc.zip}`
      : loc.state ?? loc.zip,
  ]
    .filter(Boolean)
    .join(', ')
}
