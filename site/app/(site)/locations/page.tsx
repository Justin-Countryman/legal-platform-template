// Locations index — server component lists every locationPage doc as a
// crawlable anchor card. Until this route existed, `/locations` returned a
// hard 404, the "Locations" main-nav link was dead, and individual location
// pages (e.g. /blaine-law-firm) were orphaned with no on-site link pointing
// at them. Modeled after `/attorneys/page.tsx`. There is no locationIndex
// singleton schema today — page metadata is derived from a small static
// default; promote to a real singleton later if operators need to override
// the SEO title / hero copy per-client.

export const revalidate = 3600

import type {Metadata} from 'next'
import {client} from '@/lib/sanity/client'
import {groq} from 'next-sanity'
import {NAP_TOKENS_QUERY, GLOBAL_CTA_QUERY} from '@/lib/sanity/queries'
import {expandNapTokens} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {Button} from '@/components/ui/Button'
import {GlobalCta} from '@/components/sections/GlobalCta'

// ─── Types + query ────────────────────────────────────────────────────────────

type LocationCard = {
  slug: string
  title: string | null
  heroHeading: string | null
  metaDescription: string | null
  city: string | null
  state: string | null
  address1: string | null
  address2: string | null
  zip: string | null
  officePhone: string | null
}

// Fetch every locationPage doc with the minimum surface needed for the card
// grid. `locationRef` pulls the canonical address/phone for display so the
// cards carry NAP info without requiring a duplicated copy on locationPage.
const LOCATIONS_INDEX_QUERY = groq`
  *[_type == "locationPage" && coalesce(noIndex, false) == false] | order(title asc) {
    "slug": slug.current,
    "title": coalesce(title, ""),
    "heroHeading": hero.heading,
    metaDescription,
    "city": locationRef->city,
    "state": locationRef->state,
    "address1": locationRef->address1,
    "address2": locationRef->address2,
    "zip": locationRef->zip,
    "officePhone": locationRef->officePhone
  }
`

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Our Locations'
  const description = 'Find a Wasche office near you. Locations and contact information for every office we operate.'
  return {
    title,
    description,
    alternates: {canonical: '/locations'},
    ...buildSocialMeta(title, description),
  }
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function LocationCard({location}: {location: LocationCard}) {
  const heading = location.heroHeading ?? location.title ?? location.city ?? 'Office'
  const addressLine = [location.address1, location.address2].filter(Boolean).join(', ')
  const cityLine = [location.city, location.state, location.zip].filter(Boolean).join(', ')

  return (
    <article className="flex h-full flex-col rounded-ui border border-border bg-background px-5 py-6 shadow-card-rest md:p-6">
      <h2 className="font-heading text-xl font-bold leading-snug text-foreground md:text-2xl">
        <a
          href={`/${location.slug}/`}
          className="text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-sm"
        >
          {heading}
        </a>
      </h2>

      <div className="mt-3 space-y-1 text-sm text-foreground-muted">
        {addressLine && <p>{addressLine}</p>}
        {cityLine && <p>{cityLine}</p>}
        {location.officePhone && (
          <p>
            <a
              href={`tel:${location.officePhone.replace(/\D/g, '')}`}
              className="hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-sm"
            >
              {location.officePhone}
            </a>
          </p>
        )}
      </div>

      {location.metaDescription && (
        <p className="mt-4 text-foreground-muted">{location.metaDescription}</p>
      )}

      <div className="mt-auto pt-6">
        <Button
          variant="tertiary"
          context="light"
          href={`/${location.slug}/`}
          aria-label={`Visit ${heading} location page`}
        >
          View Details
        </Button>
      </div>
    </article>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LocationsIndexPage() {
  const [locations, globalCtaData, rawTokens] = await Promise.all([
    client.fetch<LocationCard[]>(LOCATIONS_INDEX_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)

  return (
    <>
      <InternalPageHeader title="Our Locations" />

      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: 'Locations', href: '/locations/'}]} />
        </div>
      </div>

      <section className="px-[5%] pt-8 pb-16 md:pt-10 md:pb-24 lg:pb-28">
        <div className="container">
          {locations.length > 0 ? (
            <ul
              role="list"
              aria-label="Office locations"
              className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 md:gap-y-16 lg:grid-cols-3"
            >
              {locations.map((loc) => (
                <li key={loc.slug}>
                  <LocationCard location={loc} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-foreground-muted">No locations are configured yet.</p>
          )}
        </div>
      </section>

      {globalCtaData && <GlobalCta data={globalCtaData} napTokens={tokens} />}
    </>
  )
}
