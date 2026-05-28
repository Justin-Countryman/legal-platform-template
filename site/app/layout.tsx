import type {Metadata} from 'next'
import {Analytics} from '@vercel/analytics/next'
import {SpeedInsights} from '@vercel/speed-insights/next'
import {client} from '@/lib/sanity/client'
import {ORGANIZATION_SCHEMA_QUERY, SITE_METADATA_QUERY} from '@/lib/sanity/queries'
import './globals.css'

// Typography is fully driven at runtime by the active fontPairingPreset (or
// custom font uploads) in Design Settings — see buildFontCSS in lib/designTokens.
// When neither path provides fonts, --dynamic-font-* are absent and the CSS
// chain falls through to the system serif/sans-serif stacks defined in globals.
//
// Metadata is generated dynamically from siteSettings (firmName + primaryDomain)
// so the root shell stays client-agnostic — no hardcoded firm identity here.
// Per-page generateMetadata() in (site) routes overrides title/description per
// route; this root metadata supplies the title template, OG siteName, and
// metadataBase fallback.

type OrganizationData = {
  firmName?: string | null
  domain?: string | null
  logo?: string | null
  address?: {
    address1?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    officePhone?: string | null
    tollFreePhone?: string | null
  } | null
  socials?: {
    facebookUrl?: string | null
    instagramUrl?: string | null
    twitterUrl?: string | null
    linkedInUrl?: string | null
    youTubeUrl?: string | null
    avvoUrl?: string | null
    justiaUrl?: string | null
  } | null
}

function buildOrganizationSchema(data: OrganizationData) {
  const firmName = data.firmName ?? ''
  const domain = data.domain ?? process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'localhost:3000'
  const url = `https://${domain}/`

  const sameAs = [
    data.socials?.linkedInUrl,
    data.socials?.facebookUrl,
    data.socials?.twitterUrl,
    data.socials?.instagramUrl,
    data.socials?.youTubeUrl,
    data.socials?.avvoUrl,
    data.socials?.justiaUrl,
  ].filter((u): u is string => typeof u === 'string' && u.length > 0)

  const address = data.address && data.address.address1
    ? {
        '@type': 'PostalAddress',
        streetAddress: data.address.address1,
        addressLocality: data.address.city ?? undefined,
        addressRegion: data.address.state ?? undefined,
        postalCode: data.address.zip ?? undefined,
        addressCountry: 'US',
      }
    : undefined

  const contactPoint = data.address?.officePhone
    ? {
        '@type': 'ContactPoint',
        telephone: data.address.officePhone,
        contactType: 'customer service',
        areaServed: 'US',
        ...(data.address.tollFreePhone ? {alternateName: data.address.tollFreePhone} : {}),
      }
    : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: firmName,
    url,
    logo: data.logo ?? undefined,
    address,
    contactPoint,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await client.fetch<{firmName?: string; primaryDomain?: string} | null>(
    SITE_METADATA_QUERY,
  )
  const firmName = data?.firmName ?? 'Site'
  const domain = data?.primaryDomain ?? process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'localhost:3000'
  const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION

  return {
    title: {
      default: firmName,
      template: `%s | ${firmName}`,
    },
    metadataBase: new URL(`https://${domain}`),
    openGraph: {
      siteName: firmName,
      locale: 'en_US',
      type: 'website',
      images: [{url: '/api/og', width: 1200, height: 630, alt: firmName}],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/api/og'],
    },
    robots: {
      index: true,
      follow: true,
    },
    ...(gscVerification ? {verification: {google: gscVerification}} : {}),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const orgData = await client.fetch<OrganizationData>(ORGANIZATION_SCHEMA_QUERY)
  const organizationSchema = buildOrganizationSchema(orgData)

  return (
    <html lang="en-US">
      <body className="antialiased font-body text-foreground bg-background">
        {/* Site-wide Organization schema — fires on every route */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify(organizationSchema)}}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-5 focus:left-5 focus:z-[999999] focus:px-5 focus:py-3 focus:bg-brand-dark focus:text-foreground-on-dark focus:font-semibold focus:rounded-btn focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-text-on-dark/50 focus:whitespace-nowrap"
        >
          Skip to Main Content
        </a>
        {children}
        {/* Vercel runtime instrumentation — no-ops outside Vercel deploys */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
