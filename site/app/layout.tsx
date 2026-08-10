import type {Metadata} from 'next'
import {resolveHidden} from '@/lib/searchVisibility'
import {titleTemplate} from '@/lib/seoTitle'
import {client} from '@/lib/sanity/client'
import {ORGANIZATION_SCHEMA_QUERY, SITE_METADATA_QUERY, SITE_SCRIPTS_QUERY} from '@/lib/sanity/queries'
import {HtmlEmbed} from '@/components/ui/HtmlEmbed'
import {WebVitals} from '@/components/analytics/WebVitals'
import './globals.css'
import {siteOrigin} from '@/lib/siteHost'
import {SITEWIDE_OG_IMAGE_URL} from '@/lib/socialMeta'

// Typography is fully driven at runtime by the active fontPairingPreset (or
// custom font uploads) in Design Settings — see buildFontCSS in lib/designTokens.
// When neither path provides fonts, --dynamic-font-* are absent and the CSS
// chain falls through to the system serif/sans-serif stacks defined in globals.
//
// Metadata is generated dynamically from siteSettings (firmName). The host is
// NOT read here: it comes from `siteHost` alone (BI-URL-Architecture HOST-1).
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
    superLawyersUrl?: string | null
    lawInfoUrl?: string | null
  } | null
}

function buildOrganizationSchema(data: OrganizationData) {
  const firmName = data.firmName ?? ''
  const url = `${siteOrigin()}/`

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
    data.socials?.superLawyersUrl,
    data.socials?.lawInfoUrl,
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
    // ENTITY-4 (`BI-PRINCIPLES.md`): the firm is one node and the office is
    // another. The office node carries `#office`; this is the firm, so it
    // carries `#firm` and an office can point at it by identifier.
    '@id': `${url}#firm`,
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
    gscVerification?: string | null
  hideFromSearch?: unknown
    faviconUrl?: string | null
    faviconMime?: string | null
    webclipUrl?: string | null
  } | null>(SITE_METADATA_QUERY)
  const firmName = data?.firmName ?? 'Site'

  // GSC verification token is entered in Sanity (Site Settings) and rendered
  // server-side into <head> — Google's verification crawler does not run JS.
  const gscVerification = data?.gscVerification || undefined
  const hiddenFromSearch = resolveHidden(data?.hideFromSearch)

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
    // NO `template`, deliberately (TITLE-1, 2026-07-26). A title is complete as
    // authored and NOTHING is ever appended to it, so there is no template for
    // a page title to pass through. Every route returns `title.absolute` via
    // `resolveTitle` in lib/seoTitle.ts.
    //
    // `default` stays: it is what renders when a route supplies no title at all
    // — today only the homepage with no stored seoTitle, whose from-scratch
    // formula (TITLE-7) is not built yet. Re-adding `template` here would
    // silently restore appending for any route that returns a plain string.
    // TITLE-1 (2026-07-26): a title is complete as authored and nothing is
    // appended to it. Every route therefore returns `title.absolute` via
    // `resolveTitle` (lib/seoTitle.ts) and NONE of them passes through the
    // template below.
    //
    // The template survives for EXACTLY ONE CONSUMER: the two not-found
    // boundaries. A not-found boundary cannot run `generateMetadata` — measured
    // 2026-07-26 with a clean build cache, it emits no title at all — so it
    // cannot read the firm name, and `Page Not Found - <firm name>` is what
    // doctrine's page-type table specifies. A static string plus this template
    // is the only way it gets one.
    //
    // **If you add a route that returns a plain-string title, it will silently
    // gain a firm-name suffix.** Return `resolveTitle(...).title` instead. The
    // route sweep in lib/__tests__/titleFallback.test.ts pins that every route
    // does.
    title: {default: firmName, template: titleTemplate(firmName)},
    metadataBase: new URL(siteOrigin()),
    ...(icons ? {icons} : {}),
    openGraph: {
      siteName: firmName,
      locale: 'en_US',
      type: 'website',
      images: [{url: SITEWIDE_OG_IMAGE_URL, width: 1200, height: 630, alt: firmName}],
    },
    twitter: {
      card: 'summary_large_image',
      images: [SITEWIDE_OG_IMAGE_URL],
    },
    // Site-wide search visibility (ruled 2026-07-25). FAIL-CLOSED: an absent or
    // unset `hideFromSearch` means hidden, so a freshly built client — whose
    // siteSettings is created by a tool and never sees Sanity's initialValue —
    // is hidden without anyone setting anything. Only an explicit `false`
    // makes a site visible. The rule lives in lib/searchVisibility.ts; this is
    // one of four surfaces it drives (meta here, header in next.config.ts,
    // robots.txt and sitemap.xml in their own routes), because a meta tag alone
    // does not reach sitemap.xml, the OG image route, RSC payloads or images.
    robots: hiddenFromSearch
      ? {index: false, follow: false}
      : {index: true, follow: true},
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
        {/* The skip link's dark surface is created by a VARIANT (`focus:bg-brand-dark`),
            which compiles to `.focus\:bg-brand-dark:focus` and therefore does not match
            the cascade trigger `.bg-brand-dark`. `data-ring-context="dark"` is the
            documented attribute for exactly that case — "containers whose dark
            appearance is created by an overlay or other non-class mechanisms"
            (app/globals.css, cascade rule) — and it lets the cascade-aware
            `focus:text-foreground` resolve to the on-dark value instead of being
            overridden per-component. Safe unfocused: the link is sr-only, so it has
            no visible surface until the same :focus that paints it dark. */}
        <a
          href="#main-content"
          data-ring-context="dark"
          className="sr-only focus:not-sr-only focus:fixed focus:top-5 focus:left-5 focus:z-[999999] focus:px-5 focus:py-3 focus:bg-brand-dark focus:text-foreground focus:font-semibold focus:rounded-btn focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-foreground-on-dark/50 focus:whitespace-nowrap"
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
