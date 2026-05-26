export const revalidate = 3600

import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {client} from '@/lib/sanity/client'
import {
  ATTORNEY_PAGE_QUERY,
  ATTORNEY_SLUGS_QUERY,
  DESIGN_TOKENS_QUERY,
  GLOBAL_CTA_QUERY,
  NAP_TOKENS_QUERY,
} from '@/lib/sanity/queries'
import {resolveTokenString, expandNapTokens} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {SplitHeroLayout} from '@/components/attorney/layouts/SplitHeroLayout'
import {ClassicSidebarLayout} from '@/components/attorney/layouts/ClassicSidebarLayout'
import {FeatureGridLayout} from '@/components/attorney/layouts/FeatureGridLayout'
import {PremiumHorizontalLayout} from '@/components/attorney/layouts/PremiumHorizontalLayout'
import type {Attorney} from '@/components/attorney/types'
import type {NapTokens} from '@/lib/tokens'

// ─── Static params ────────────────────────────────────────────────────────────
// Sanity slugs are stored as `attorneys/{name}`; the URL segment is the
// bare `{name}`. Strip the prefix so Next gets the route-shaped param.

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(ATTORNEY_SLUGS_QUERY)
  return slugs
    .filter((s) => s.startsWith('attorneys/'))
    .map((s) => ({slug: s.slice('attorneys/'.length)}))
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PageProps = {params: Promise<{slug: string}>}
type ProfileCta = {label: string; href: string}

const DEFAULT_CTA: ProfileCta = {label: 'Contact Us', href: '/contact/'}
const DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'example.com'

// ─── Schema ───────────────────────────────────────────────────────────────────

function buildPersonSchema(attorney: Attorney, napTokens: NapTokens) {
  const firstName = (attorney.firstName ?? '').trim()
  const middleName = (attorney.middleName ?? '').trim()
  const lastName = (attorney.lastName ?? '').trim()
  const suffix = (attorney.suffix ?? '').trim()
  const name = [firstName, middleName, lastName, suffix].filter(Boolean).join(' ')

  const sameAs = [attorney.linkedIn, attorney.avvo, attorney.superLawyers, attorney.findLaw, attorney.martindale]
    .filter((u): u is string => typeof u === 'string' && u.length > 0)

  const url = `https://${DOMAIN}/${attorney.slug}/`
  const photoUrl = attorney.photo?.src

  const address = attorney.location && attorney.location.address1
    ? {
        '@type': 'PostalAddress',
        streetAddress: attorney.location.address1,
        addressLocality: attorney.location.city ?? undefined,
        addressRegion: attorney.location.state ?? undefined,
        postalCode: attorney.location.zip ?? undefined,
        addressCountry: 'US',
      }
    : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: attorney.jobTitle ?? undefined,
    image: photoUrl ?? undefined,
    url,
    worksFor: {
      '@type': 'LegalService',
      name: napTokens.firmName ?? '',
      url: `https://${DOMAIN}/`,
    },
    telephone: attorney.location?.officePhone ?? undefined,
    address,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveProfileCta(napTokens: NapTokens, override?: {label?: string; url?: string} | null): ProfileCta {
  const base: ProfileCta = napTokens.profileCtaLabel && napTokens.profileCtaUrl
    ? {label: napTokens.profileCtaLabel, href: napTokens.profileCtaUrl}
    : DEFAULT_CTA
  if (override?.label && override?.url) return {label: override.label, href: override.url}
  return base
}

// ─── Layout switch ────────────────────────────────────────────────────────────

function AttorneyLayout({attorney, napTokens, cta, isDark}: {attorney: Attorney; napTokens: NapTokens; cta: ProfileCta; isDark: boolean}) {
  switch (napTokens.profileLayout) {
    case 'classicSidebar':
      return <ClassicSidebarLayout attorney={attorney} napTokens={napTokens} cta={cta} isDark={isDark} />
    case 'featureGrid':
      return <FeatureGridLayout attorney={attorney} napTokens={napTokens} cta={cta} />
    case 'premiumHorizontal':
      return <PremiumHorizontalLayout attorney={attorney} napTokens={napTokens} cta={cta} />
    case 'splitHero':
    default:
      return <SplitHeroLayout attorney={attorney} napTokens={napTokens} cta={cta} isDark={isDark} />
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {slug: slugParam} = await params
  const slug = `attorneys/${slugParam}`
  const [attorney, rawTokens] = await Promise.all([
    client.fetch(ATTORNEY_PAGE_QUERY, {slug}),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  if (!attorney) return {title: 'Attorney Profile'}

  const tokens = expandNapTokens(rawTokens)
  const title = resolveTokenString(attorney.seoTitle, tokens)
  const description = resolveTokenString(attorney.metaDescription, tokens)
  return {
    title,
    description,
    ...(attorney.noIndex ? {robots: {index: false, follow: false}} : {}),
    alternates: {canonical: attorney.canonicalUrl ?? `/${slug}`},
    ...buildSocialMeta(title, description),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AttorneyProfilePage({params}: PageProps) {
  const {slug: slugParam} = await params
  const slug = `attorneys/${slugParam}`

  const [attorney, globalCtaData, rawTokens, designTokens] = await Promise.all([
    client.fetch(ATTORNEY_PAGE_QUERY, {slug}),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
    client.fetch(DESIGN_TOKENS_QUERY),
  ])

  if (!attorney) notFound()

  const napTokens = expandNapTokens(rawTokens)
  const cta = resolveProfileCta(napTokens, attorney.ctaOverride)
  // Hero scheme — server-side fetch matches the pattern used in
  // app/(site)/layout.tsx and blog/[slug]/page.tsx (async server components
  // can't consume the <HeroSchemeProvider> hook, so the design setting is
  // read directly and propagated as an isDark prop). Only ClassicSidebar
  // and SplitHero layouts have a colored hero band that flips with the
  // setting; FeatureGrid and PremiumHorizontal are light-by-design and
  // don't accept the prop. See WS7.7 audit Item 6 + Commit 3 for the
  // architectural distinction.
  const isDark = designTokens?.internalHeroBackground !== 'light'

  return (
    <>
      {/* Person schema — surfaces attorney to rich-result eligibility */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildPersonSchema(attorney, napTokens)),
        }}
      />

      <AttorneyLayout attorney={attorney} napTokens={napTokens} cta={cta} isDark={isDark} />

      {!attorney.hideCtaForm && globalCtaData && (
        <GlobalCta
          data={
            attorney.ctaFormOverride
              ? {...globalCtaData, ...attorney.ctaFormOverride}
              : globalCtaData
          }
          napTokens={napTokens}
        />
      )}
    </>
  )
}
