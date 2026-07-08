import type {Metadata} from 'next'
import {client} from '@/lib/sanity/client'
import {ORGANIZATION_SCHEMA_QUERY, SITE_METADATA_QUERY, SITE_SCRIPTS_QUERY} from '@/lib/sanity/queries'
import {HtmlEmbed} from '@/components/ui/HtmlEmbed'
import {WebVitals} from '@/components/analytics/WebVitals'
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
    findLawUrl?: string | null
    martindaleUrl?: string | null
    lawyersComUrl?: string | null
    yelpUrl?: string | null
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
    data.socials?.findLawUrl,
    data.socials?.martindaleUrl,
    data.socials?.lawyersComUrl,
    data.socials?.yelpUrl,
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

  // Office phone is the primary ContactPoint; toll-free (when present) is its
  // own ContactPoint in the array — not an alternateName (that property is a
  // text label, not a phone number).
  const contactPoint = data.address?.officePhone
    ? [
        {
          '@type': 'ContactPoint',
          telephone: data.address.officePhone,
          contactType: 'customer service',
          areaServed: 'US',
        },
        ...(data.address.tollFreePhone
          ? [
              {
                '@type': 'ContactPoint',
                telephone: data.address.tollFreePhone,
                contactType: 'customer service',
              },
            ]
          : []),
      ]
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
  const data = await client.fetch<{
    firmName?: string
    primaryDomain?: string
    gscVerification?: string | null
    faviconUrl?: string | null
    faviconMime?: string | null
    webclipUrl?: string | null
  } | null>(SITE_METADATA_QUERY)
  const firmName = data?.firmName ?? 'Site'
  const domain = data?.primaryDomain ?? process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'localhost:3000'
  // GSC verification token is entered in Sanity (Site Settings) and rendered
  // server-side into <head> — Google's verification crawler does not run JS.
  const gscVerification = data?.gscVerification || undefined

  // Browser-tab favicon + Apple touch icon are sourced from Design Settings
  // (designSettings.favicon / webclipImage). The asset URLs are absolute Sanity
  // CDN links, so they resolve independently of metadataBase. When unset, no
  // `icons` are emitted and the browser falls back to its default — there is no
  // static app/favicon.ico shadowing the Sanity-managed icon.
  const icons: Metadata['icons'] = data?.faviconUrl || data?.webclipUrl
    ? {
        ...(data?.faviconUrl
          ? {icon: [{url: data.faviconUrl, ...(data.faviconMime ? {type: data.faviconMime} : {})}]}
          : {}),
        ...(data?.webclipUrl ? {apple: [{url: data.webclipUrl}]} : {}),
      }
    : undefined

  return {
    title: {
      default: firmName,
      template: `%s | ${firmName}`,
    },
    metadataBase: new URL(`https://${domain}`),
    ...(icons ? {icons} : {}),
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
  const [orgData, consentScripts] = await Promise.all([
    client.fetch<OrganizationData>(ORGANIZATION_SCHEMA_QUERY),
    client.fetch<string | null>(SITE_SCRIPTS_QUERY),
  ])
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
        {/* GA4 (consent-gated, opt-out model) — operator-pasted snippet from
            Site Settings; HtmlEmbed executes its <script> tags and defines gtag. */}
        {consentScripts && <HtmlEmbed html={consentScripts} />}
        {/* Core Web Vitals → GA4 events (free; replaces Vercel Speed Insights). */}
        <WebVitals />
      </body>
    </html>
  )
}
