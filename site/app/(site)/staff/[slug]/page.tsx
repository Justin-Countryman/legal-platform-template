export const revalidate = 3600

import type {Metadata} from 'next'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {notFound} from 'next/navigation'
import {client} from '@/lib/sanity/client'
import {
  STAFF_PAGE_QUERY,
  STAFF_SLUGS_QUERY,
  DESIGN_TOKENS_QUERY,
  GLOBAL_CTA_QUERY,
  NAP_TOKENS_QUERY,
} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString, titleFragment} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {GlobalCta} from '@/components/sections/GlobalCta'
import {SplitHeroLayout} from '@/components/staff/layouts/SplitHeroLayout'
import {ClassicSidebarLayout} from '@/components/staff/layouts/ClassicSidebarLayout'
import {FeatureGridLayout} from '@/components/staff/layouts/FeatureGridLayout'
import {PremiumHorizontalLayout} from '@/components/staff/layouts/PremiumHorizontalLayout'
import type {StaffMember} from '@/components/staff/types'
import type {NapTokens} from '@/lib/tokens'

// ─── Static params ────────────────────────────────────────────────────────────
// Staff slugs are stored as `staff/{name}` — the stored slug IS the URL path
// (single-convention ruling, item 69). The URL segment is the bare `{name}`;
// strip the prefix so Next gets the route-shaped param. Same idiom as
// attorneys/[slug] and blog/[slug].

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(STAFF_SLUGS_QUERY)
  return slugs
    .filter((s) => s.startsWith('staff/'))
    .map((s) => ({slug: s.slice('staff/'.length)}))
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PageProps = {params: Promise<{slug: string}>}

const DEFAULT_CTA = {label: 'Contact Us', href: '/contact/'}

function resolveProfileCta(napTokens: NapTokens): {label: string; href: string} {
  return napTokens.profileCtaLabel && napTokens.profileCtaUrl
    ? {label: napTokens.profileCtaLabel, href: napTokens.profileCtaUrl}
    : DEFAULT_CTA
}

// ─── Layout switch ────────────────────────────────────────────────────────────

function StaffLayout({member, napTokens, isDark}: {member: StaffMember; napTokens: NapTokens; isDark: boolean}) {
  const cta = resolveProfileCta(napTokens)
  switch (napTokens.profileLayout) {
    case 'classicSidebar':
      return <ClassicSidebarLayout member={member} napTokens={napTokens} cta={cta} isDark={isDark} />
    case 'featureGrid':
      return <FeatureGridLayout member={member} napTokens={napTokens} cta={cta} />
    case 'premiumHorizontal':
      return <PremiumHorizontalLayout member={member} napTokens={napTokens} cta={cta} />
    case 'splitHero':
    default:
      return <SplitHeroLayout member={member} napTokens={napTokens} cta={cta} isDark={isDark} />
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {slug: slugParam} = await params
  const slug = `staff/${slugParam}`
  const [member, rawTokens] = await Promise.all([
    client.fetch(STAFF_PAGE_QUERY, {slug}),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  if (!member) return {title: 'Staff Profile'}

  const tokens = expandNapTokens(rawTokens)
  const title = titleFragment(
    member.seoTitle,
    [member.firstName, member.lastName].filter(Boolean).join(' '),
    tokens,
  )
  const description = resolveTokenString(member.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(member.noIndex, member.noFollow)),
    alternates: {canonical: member.canonicalUrl ?? `/${slug}`},
    ...buildSocialMeta(title, description, member?.ogImage),
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StaffProfilePage({params}: PageProps) {
  const {slug: slugParam} = await params
  const slug = `staff/${slugParam}`

  const [member, globalCtaData, rawTokens, designTokens] = await Promise.all([
    client.fetch(STAFF_PAGE_QUERY, {slug}),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
    client.fetch(DESIGN_TOKENS_QUERY),
  ])

  if (!member) notFound()

  const napTokens = expandNapTokens(rawTokens)
  // Hero scheme — see attorneys/[slug]/page.tsx for the architectural note.
  const isDark = designTokens?.internalHeroBackground !== 'light'

  return (
    <>
      <StaffLayout member={member} napTokens={napTokens} isDark={isDark} />

      {!member.hideCtaForm && globalCtaData && (
        <GlobalCta
          data={
            member.ctaFormOverride
              ? {...globalCtaData, ...member.ctaFormOverride}
              : globalCtaData
          }
          napTokens={napTokens}
        />
      )}
    </>
  )
}
