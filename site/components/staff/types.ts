// Staff profile page — canonical type used by all layout variants.
// Shape mirrors the output of STAFF_PAGE_QUERY.

export type StaffPhoto = {
  src: string
  alt: string
  width?: number | null
  height?: number | null
}

export type StaffLocation = {
  city?: string | null
  address1?: string | null
  address2?: string | null
  address3?: string | null
  state?: string | null
  zip?: string | null
  officePhone?: string | null
}

export type StaffMember = {
  slug: string
  seoTitle?: string | null
  metaDescription?: string | null
  noIndex?: boolean | null
  canonicalUrl?: string | null

  // Identity
  firstName?: string | null
  lastName?: string | null
  jobTitle?: string | null

  // Media & contact
  photo?: StaffPhoto | null
  email?: string | null
  phone?: string | null

  // Biography
  biography?: unknown[] | null

  // Location
  location?: StaffLocation | null

  // CTA section
  hideCtaForm?: boolean | null
  ctaFormOverride?: {
    tagline?: string | null
    heading?: string | null
    description?: string | null
    buttons?: Array<{title: string | null; url: string | null; variant: string | null} | null> | null
  } | null
}

export function buildStaffName(member: Pick<StaffMember, 'firstName' | 'lastName'>): string {
  return [member.firstName, member.lastName].filter(Boolean).join(' ')
}

export function formatStaffAddress(loc: StaffLocation): string {
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
