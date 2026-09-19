// Catch-all route per locked decision D3b: opt into on-demand SSG via
// `dynamicParams: true` (the default — declared explicitly to document
// the intent) with no build-time enumeration. Any slug not yet rendered
// gets generated and cached on first request, then revalidated every 3600s
// (or sooner: the Sanity webhook invalidates the whole layout).
//
// THE EMPTY `generateStaticParams` IS WHAT MAKES THAT SENTENCE TRUE. A dynamic
// segment with NO `generateStaticParams` at all is a fully dynamic route: Next
// rendered every practice-area, location, about, FAQ, general and landing page
// on every request (`Cache-Control: private, no-cache, no-store`, sixteen
// Sanity calls per view on the live fixture, `x-vercel-cache: MISS`), which is
// most of every client's pages, from this file's first commit until
// 2026-09-13. Next's own docs: "You must return an empty array from
// generateStaticParams in order to revalidate (ISR) paths at runtime."
// Measured after: the second request is `x-nextjs-cache: HIT` with zero Sanity
// calls (monorepo WS-V1-PHASE8-DESIGN §0). `build-against-stub.sh` asserts the
// route is in the prerender manifest. Two consequences to know: an unknown
// slug's 404 is cached for the hour too (the webhook's layout-wide
// invalidation clears it when the page is published), and enabling Next's
// `cacheComponents` turns an empty return into a build error.
export const revalidate = 3600
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

import {notFound} from 'next/navigation'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import type {Metadata} from 'next'
import {chromeGlobalCta, chromeNap, getCatchAllPage, getSiteChrome} from '@/lib/sanity/fetchers'
import {siteLookOf} from '@/components/sections/sectionFrame'
import {expandNapTokens, resolveTokenString, type NapTokens} from '@/lib/tokens'
import {aboutPageTitle, areaOfLawPageName, geoHubPageName, geoSpokePageName, locationPageName, resolveTitle, serviceAreaPageName} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {cityFromServiceAreaSlug} from '@/lib/serviceAreaCity'
import {ContentSidebarLayout} from '@/components/layout/ContentSidebarLayout'
import {InternalHero} from '@/components/layout/InternalHero'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs, buildBreadcrumbs} from '@/components/ui/Breadcrumbs'
import {buildFaqPageSchema} from '@/lib/faqPageSchema'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {FaqAccordion} from '@/components/ui/FaqAccordion'
import {Sidebar} from '@/components/layout/Sidebar'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {PageSections} from '@/components/sections/PageSections'
import {OfficeHoursProvider} from '@/components/location/OfficeHoursContext'
import {siteHost} from '@/lib/siteHost'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {params: Promise<{slug: string[]}>}

// ─── Schema Builders ──────────────────────────────────────────────────────────

/**
 * ENTITY-1 and ENTITY-4 (`BI-PRINCIPLES.md`). ONE `LegalService` per office, named
 * for the FIRM, with its own `@id`, `url` and address. **The address
 * distinguishes offices, not the name.**
 *
 * It used to read `p.title`, so `/about` announced a law firm called "About" and
 * `/disclaimer` one called "Disclaimer". A `LegalService` IS a law firm — not a
 * page, not a practice area, not a topic — so the name can only ever be the
 * firm's. There is deliberately no page fallback: a fallback would imply the
 * page was sometimes the right source, and it never is.
 *
 * ENTITY-2: only a `locationPage` calls this now. Topical pages emit no
 * top-level `LegalService` at all.
 */
function buildOfficeLegalServiceSchema(
  page: {slug?: string | null; locationData?: LocationData | null},
  tokens: NapTokens | null,
  domain: string,
) {
  const loc = page.locationData ?? {}
  const sameAs = [loc.gbpCidUrl].filter((u): u is string => typeof u === 'string' && u.length > 0)
  // GeoCoordinates — gated to Physical/Shared at the query layer (D9), so
  // Virtual/Home never emit coordinates. Both lat and lng must be present.
  const geo = typeof loc.geo?.lat === 'number' && typeof loc.geo?.lng === 'number'
    ? {'@type': 'GeoCoordinates', latitude: loc.geo.lat, longitude: loc.geo.lng}
    : undefined
  // No street address, no PostalAddress. Virtual and Home offices have the
  // street gated out at the query layer (D9).
  const address = loc.address1
    ? {
        '@type': 'PostalAddress',
        streetAddress: [loc.address1, loc.address2].filter(Boolean).join(', '),
        addressLocality: loc.city ?? undefined,
        addressRegion: loc.state ?? undefined,
        postalCode: loc.zip ?? undefined,
        addressCountry: 'US',
      }
    : undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    '@id': `https://${domain}/${page.slug}#office`,
    name: tokens?.firmName ?? '',
    url: `https://${domain}/${page.slug}`,
    telephone: loc.officePhone ?? undefined,
    address,
    geo,
    // Service area — kept for Virtual/Home locations where the street address is
    // gated out (D9); still valid (and harmless) for Physical/Shared.
    areaServed: loc.city ?? loc.state ?? undefined,
    openingHoursSpecification: buildOpeningHours(loc.hours),
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    // The office belongs to the firm. ENTITY-6: a nested entity that IS the firm
    // REFERENCES the firm's identifier and declares nothing else — not a second
    // `@type`, not a repeated `name`, not the firm's `url`. The `#firm` node is
    // emitted from the root layout on every route, so this always resolves.
    //
    // It carried `@type`, `name` and `url` alongside `@id` until 2026-07-31, and
    // doctrine's own closing note held it up as the pattern to copy. A node
    // carrying the firm's URL and its own identifier is still two assertions
    // about one entity; the `@id` makes it linkable, not singular.
    parentOrganization: {'@id': `https://${domain}/#firm`},
  }
}

type LocationHoursDay = {status?: string | null; open?: string | null; close?: string | null}
type LocationHours = Record<string, string | null | undefined>
type LocationData = {
  address1?: string | null
  address2?: string | null
  address3?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  officePhone?: string | null
  officeFax?: string | null
  tollFreePhone?: string | null
  hours?: LocationHours | null
  emergency24_7?: boolean | null
  emergencyPhone?: string | null
  appointmentRequired?: string | null
  gbpCidUrl?: string | null
  geo?: {lat?: number | null; lng?: number | null} | null
}

const DAY_PREFIXES: Array<{prefix: string; schema: string}> = [
  {prefix: 'monday', schema: 'Mo'},
  {prefix: 'tuesday', schema: 'Tu'},
  {prefix: 'wednesday', schema: 'We'},
  {prefix: 'thursday', schema: 'Th'},
  {prefix: 'friday', schema: 'Fr'},
  {prefix: 'saturday', schema: 'Sa'},
  {prefix: 'sunday', schema: 'Su'},
]

function buildOpeningHours(hours: LocationHours | null | undefined) {
  if (!hours) return undefined
  const specs = DAY_PREFIXES
    .map(({prefix, schema}): LocationHoursDay & {schema: string} => ({
      schema,
      status: hours[`${prefix}Status`] as string | null | undefined,
      open: hours[`${prefix}Open`] as string | null | undefined,
      close: hours[`${prefix}Close`] as string | null | undefined,
    }))
    .filter((d) => d.status === 'Open' && d.open && d.close)
    .map((d) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: d.schema,
      opens: d.open,
      closes: d.close,
    }))
  return specs.length > 0 ? specs : undefined
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const slugStr = slug.join('/')

  // ONE query for the eight types this route serves, shared with the page
  // below through React cache() (lib/sanity/fetchers.ts). Until 2026-09-13 this
  // was three typed queries sent here and again in the page: six POSTs per
  // render, four of them for the wrong type.
  const [page, rawTokens] = await Promise.all([getCatchAllPage(slugStr), chromeNap()])

  if (!page) return {}

  const tokens = expandNapTokens(rawTokens)
  // Per-type formulas for the two types in this route that have one. Every
  // other type here falls back to its own page name (TITLE-2).
  //
  // TITLE-11 — locationPage: the city and state of the location THIS page is
  // for, read off `locationData`, not the firm's primary office.
  const locationName = page._type === 'locationPage'
    ? locationPageName(page.locationData?.city, page.locationData?.state)
    : ''
  // The about page's formula is a COMPLETE title, not a page name: it puts the
  // firm name in the middle and closes on "Law Firm". Primary geo is the firm's
  // primary location city, which arrives as the `office.city` NAP token.
  const aboutTitle = page._type === 'aboutPage'
    ? aboutPageTitle(tokens?.firmName, tokens?.['office.city'])
    : ''
  // A practice area AT AREA-OF-LAW LEVEL uses its stored phrase. One BENEATH an
  // area of law gets nothing here and falls back to its page name — ruled
  // 2026-07-26: no derived formula and no stored list for the 195, the operator
  // corrects individual pages in Sanity.
  const areaOfLawName = page._type === 'practiceArea'
    ? areaOfLawPageName(page.title, Boolean(page.parentPage))
    : ''
  // TITLE-9 — serviceAreaPage: the city, then the firm's primary area-of-law
  // phrase, or `<city> Law Firm` when no phrase is available (a multi-area firm
  // with no ranking, or a lone area outside the fifteen). It shares the
  // homepage's PHRASE, not its construction — this is an interior page, so it
  // leads with its own subject and composeTitle appends the firm (TITLE-2).
  //
  // **THE ARGUMENT IS THE CITY, NOT THE PAGE NAME**, and it used to be
  // `page.title`. That was correct when it was written on 2026-07-27 and stopped
  // being correct on 2026-07-28, when the service area ruling made the Name
  // `{city} Law Firm` instead of the bare city: the formula appends `Law Firm`
  // itself, so it composed `Blaine Law Firm Law Firm`. Nothing rendered wrong,
  // because every Dudley row carries an SEO Title cell and TITLE-1's cell rung
  // wins before this runs — the defect was reachable only on a row with a blank
  // cell. `cityFromServiceAreaSlug` returns '' on an unreadable leaf, and the
  // fallback chain below then lands on `page.title`, which is the plainer
  // answer rather than a doubled one.
  const serviceAreaName = page._type === 'serviceAreaPage'
    ? serviceAreaPageName(cityFromServiceAreaSlug(page.slug), page.areasOfLaw ?? [])
    : ''
  // TITLE-8 — geoPracticeArea. A hub (no parent) is titled `{city} {practice}`
  // and renders city + the practice's stored phrase. A spoke takes the city from
  // its hub's title via parentPage, then its own page name. Both fall back to
  // the plain page name when the hub title cannot be split — see
  // splitGeoHubTitle for the four ways that happens.
  const geoName = page._type === 'geoPracticeArea'
    ? (page.parentPage
        ? geoSpokePageName(page.parentPage.title, page.title)
        : geoHubPageName(page.title))
    : ''
  const {title, label} = resolveTitle(
    page.seoTitle,
    geoName || serviceAreaName || areaOfLawName || locationName || page.title,
    tokens,
    tokens?.firmName,
    aboutTitle,
  )
  const description = resolveTokenString(page.metaDescription, tokens)

  return {
    title,
    description,
    ...(await buildRobotsMeta(page.noIndex, page.noFollow)),
    alternates: {canonical: page.canonicalUrl ?? `/${slugStr}`},
    ...buildSocialMeta(label, description, page?.ogImage, {
      ogTitle: page?.ogTitle, ogDescription: page?.ogDescription, tokens,
    }),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CatchAllPage({params}: Props) {
  const {slug} = await params
  const slugStr = slug.join('/')

  const [page, rawTokens, globalCtaData] = await Promise.all([
    getCatchAllPage(slugStr),
    chromeNap(),
    chromeGlobalCta(),
  ])

  if (!page) notFound()

  const isLocation = page._type === 'locationPage'
  // On location pages, office.* shortcodes resolve to THIS page's location;
  // elsewhere they fall back to the firm's primary office.
  const tokens = expandNapTokens(rawTokens, isLocation ? page.locationData?._id : undefined)
  const hasSidebar = page.sidebar && page.sidebar.filter((c: unknown) => (c as {_componentType?: unknown})._componentType).length > 0
  const hasFaqs = page.faqItems && page.faqItems.length > 0
  const breadcrumbs = buildBreadcrumbs(page)

  const content = (
    <>
      {/* ENTITY-2 (`BI-PRINCIPLES.md`): a top-level LegalService is emitted ONLY on
          a location page. It used to be emitted unconditionally here, on every
          page this route serves, which is why /disclaimer announced a law firm
          called "Disclaimer". A practice area, a service area, an about page and
          a general page are all SUBJECTS rather than places of business, and a
          subject is not a LegalService.

          ENTITY-4 (amended 2026-07-29): ONE node for the office, of the most
          specific type that fits. The separate LocalBusiness block is gone —
          LegalService is a SUBTYPE of LocalBusiness, so emitting both for one
          office said two businesses share an address. Its hours, geo,
          areaServed and sameAs moved onto this node. */}
      {isLocation && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(buildOfficeLegalServiceSchema(page, tokens, siteHost())),
            }}
          />
        </>
      )}

      {/* FAQPage schema — only when FAQ items are present */}
      {hasFaqs && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildFaqPageSchema(page.faqItems, tokens)),
          }}
        />
      )}

      {/* Hero */}
      {page.hero ? (
        <InternalHero data={page.hero} napTokens={tokens} />
      ) : (
        <InternalPageHeader title={page?.title || 'Page'} />
      )}

      {/* Breadcrumb band */}
      {breadcrumbs.length > 1 && (
        <div className="bg-muted border-b border-border px-[5%] py-3">
          <div className="container">
            <Breadcrumbs items={breadcrumbs} domain={siteHost()} />
          </div>
        </div>
      )}

      {/* Body */}
      <ContentSidebarLayout
        sidebar={
          hasSidebar ? (
            <Sidebar
              components={page.sidebar}
              napTokens={tokens}
              body={page.body}
            />
          ) : undefined
        }
      >
        {page.body && (
          <PortableTextRenderer value={page.body} napTokens={tokens} />
        )}

        {hasFaqs && (
          <section aria-label="Frequently Asked Questions" className="mt-12">
            <h2 className="mb-6 text-3xl font-bold text-foreground">
              Frequently Asked Questions
            </h2>
            <FaqAccordion items={page.faqItems} napTokens={tokens} />
          </section>
        )}

        {/* Map embed — location pages only, below content */}
        {isLocation && page.mapEmbed && (
          <div
            className="mt-10 w-full overflow-hidden rounded-ui [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full"
            dangerouslySetInnerHTML={{__html: page.mapEmbed}}
            aria-label="Office location map"
          />
        )}
      </ContentSidebarLayout>

      {/* Full Width Sections */}
      {page.sections && page.sections.length > 0 && (
        <PageSections sections={page.sections} napTokens={tokens} resultsDisclaimer={page.resultsDisclaimer} site={siteLookOf((await getSiteChrome())?.designTokens)} />
      )}

      {!page.hideCtaForm && globalCtaData && (
        <GlobalCta data={page.ctaOverride ? {...globalCtaData, ...page.ctaOverride} : globalCtaData} napTokens={tokens} />
      )}
    </>
  )

  // Location pages override the layout's default (primary-location) hours with
  // this page's own location, so an Office Hours block in the body shows the
  // right office.
  return isLocation && page.locationData?.hours ? (
    <OfficeHoursProvider value={page.locationData.hours}>{content}</OfficeHoursProvider>
  ) : (
    content
  )
}
