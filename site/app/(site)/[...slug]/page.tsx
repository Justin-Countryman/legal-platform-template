// Catch-all route per locked decision D3b: opt into on-demand SSG via
// `dynamicParams: true` (the default — declared explicitly to document
// the intent) with no `generateStaticParams` enumeration. Any slug not
// yet rendered gets generated and cached on first request, then revalidated
// every 3600s (or sooner via the Sanity webhook landing in Batch 6).
export const revalidate = 3600
export const dynamicParams = true

import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import {client} from '@/lib/sanity/client'
import {PRACTICE_AREA_QUERY, LOCATION_PAGE_QUERY, CONTENT_PAGE_QUERY, GLOBAL_CTA_QUERY, NAP_TOKENS_QUERY} from '@/lib/sanity/queries'
import {resolveTokenString, expandNapTokens, type NapTokens} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {ContentSidebarLayout} from '@/components/layout/ContentSidebarLayout'
import {InternalHero} from '@/components/layout/InternalHero'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs, buildBreadcrumbs} from '@/components/ui/Breadcrumbs'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {FaqAccordion} from '@/components/ui/FaqAccordion'
import {Sidebar} from '@/components/layout/Sidebar'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {PageSections} from '@/components/sections/PageSections'
import {OfficeHoursProvider} from '@/components/location/OfficeHoursContext'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {params: Promise<{slug: string[]}>}

// ─── Schema Builders ──────────────────────────────────────────────────────────

function buildLegalServiceSchema(page: unknown, tokens: NapTokens | null, domain: string) {
  const p = page as Record<string, unknown>
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: resolveTokenString(p.title as string | null | undefined, tokens),
    description: resolveTokenString(p.metaDescription as string | null | undefined, tokens),
    url: `https://${domain}/${p.slug}/`,
    provider: {
      '@type': 'LegalService',
      name: tokens?.firmName ?? '',
    },
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

function buildLocalBusinessSchema(
  page: {title?: string | null; slug?: string | null; metaDescription?: string | null; locationData?: LocationData | null},
  tokens: NapTokens | null,
  domain: string,
) {
  const loc = page.locationData ?? {}
  const sameAs = [loc.gbpCidUrl].filter((u): u is string => typeof u === 'string' && u.length > 0)
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
    '@type': 'LocalBusiness',
    name: resolveTokenString(page.title ?? '', tokens) || tokens?.firmName || '',
    description: resolveTokenString(page.metaDescription ?? '', tokens) || undefined,
    url: `https://${domain}/${page.slug}/`,
    telephone: loc.officePhone ?? undefined,
    address,
    // Service area — kept for Virtual/Home locations where the street address
    // is gated out (D9); still valid (and harmless) for Physical/Shared.
    areaServed: loc.city ?? loc.state ?? undefined,
    openingHoursSpecification: buildOpeningHours(loc.hours),
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    parentOrganization: {
      '@type': 'LegalService',
      name: tokens?.firmName ?? '',
      url: `https://${domain}/`,
    },
  }
}

// Post-WS-FAQ-Migration (2026-05-14): faqItems is now a dereferenced array of
// faqItem documents (GROQ resolves the references via `[defined(@->_id)]->`).
// The dangling-ref filter at query time guarantees the array is null-free
// here. Only question + answer are needed for FAQPage structured-data
// emission; additional fields (category, slug, tags) are ignored.
function buildFaqPageSchema(
  faqItems: Array<{question: string; answer: unknown[]}>,
  tokens: NapTokens | null,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: resolveTokenString(item.question, tokens),
      acceptedAnswer: {
        '@type': 'Answer',
        text: (item.answer ?? [])
          .flatMap((block: unknown) => {
            const b = block as {_type?: string; children?: unknown[]}
            return b._type === 'block'
              ? (b.children ?? []).map((span: unknown) => {
                  const s = span as {text?: string}
                  return s.text ?? ''
                })
              : []
          })
          .join(' '),
      },
    })),
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const slugStr = slug.join('/')

  const [practiceArea, locationPage, contentPage, rawTokens] = await Promise.all([
    client.fetch(PRACTICE_AREA_QUERY, {slug: slugStr}),
    client.fetch(LOCATION_PAGE_QUERY, {slug: slugStr}),
    client.fetch(CONTENT_PAGE_QUERY, {slug: slugStr}),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const page = practiceArea ?? locationPage ?? contentPage

  if (!page) return {}

  const tokens = expandNapTokens(rawTokens)
  const title = resolveTokenString(page.seoTitle, tokens)
  const description = resolveTokenString(page.metaDescription, tokens)

  return {
    title,
    description,
    ...(page.noIndex ? {robots: {index: false, follow: false}} : {}),
    alternates: {canonical: page.canonicalUrl ?? `/${slugStr}`},
    ...buildSocialMeta(title, description),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'example.com'

export default async function CatchAllPage({params}: Props) {
  const {slug} = await params
  const slugStr = slug.join('/')

  const [practiceArea, locationPage, contentPage, rawTokens, globalCtaData] = await Promise.all([
    client.fetch(PRACTICE_AREA_QUERY, {slug: slugStr}),
    client.fetch(LOCATION_PAGE_QUERY, {slug: slugStr}),
    client.fetch(CONTENT_PAGE_QUERY, {slug: slugStr}),
    client.fetch(NAP_TOKENS_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
  ])
  const page = practiceArea ?? locationPage ?? contentPage

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
      {/* LegalService schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildLegalServiceSchema(page, tokens, DOMAIN)),
        }}
      />

      {/* LocalBusiness schema — location pages only, sits alongside LegalService */}
      {isLocation && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildLocalBusinessSchema(page, tokens, DOMAIN)),
          }}
        />
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
            <Breadcrumbs items={breadcrumbs} domain={DOMAIN} />
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
            className="mt-10 w-full overflow-hidden rounded-sm [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full"
            dangerouslySetInnerHTML={{__html: page.mapEmbed}}
            aria-label="Office location map"
          />
        )}
      </ContentSidebarLayout>

      {/* Full Width Sections */}
      {page.sections && page.sections.length > 0 && (
        <PageSections sections={page.sections} napTokens={tokens} />
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
