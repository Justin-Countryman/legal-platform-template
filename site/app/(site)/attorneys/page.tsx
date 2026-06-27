export const revalidate = 3600

import type {Metadata} from 'next'
import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import Link from 'next/link'
import {client} from '@/lib/sanity/client'
import {
  ATTORNEY_INDEX_QUERY,
  ATTORNEY_PAGES_QUERY,
  GLOBAL_CTA_QUERY,
  NAP_TOKENS_QUERY,
} from '@/lib/sanity/queries'
import {resolveTokenString, expandNapTokens} from '@/lib/tokens'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalHero} from '@/components/layout/InternalHero'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {Button} from '@/components/ui/Button'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {GlobalCta} from '@/components/sections/GlobalCta'

// ─── Types ────────────────────────────────────────────────────────────────────

type Attorney = {
  slug: string
  firstName: string | null
  middleName: string | null
  lastName: string | null
  suffix: string | null
  h1: string | null
  jobTitle: string | null
  linkedIn: string | null
  photo: SanityImageData | null
  practiceAreas: Array<{label: string; slug: string | null}> | null
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const [indexPage, rawTokens] = await Promise.all([
    client.fetch(ATTORNEY_INDEX_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  if (!indexPage) return {title: 'Our Attorneys'}

  const title = resolveTokenString(indexPage.seoTitle, tokens)
  const description = resolveTokenString(indexPage.metaDescription, tokens)
  return {
    title,
    description,
    ...(indexPage.noIndex ? {robots: {index: false, follow: false}} : {}),
    alternates: {canonical: indexPage.canonicalUrl ?? '/attorneys'},
    ...buildSocialMeta(title, description),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fullName(a: Attorney): string {
  if (a.h1) return a.h1
  return [a.firstName, a.middleName, a.lastName, a.suffix]
    .filter(Boolean)
    .join(' ')
}

function Initials({attorney}: {attorney: Attorney}) {
  const first = attorney.firstName?.charAt(0) ?? ''
  const last = attorney.lastName?.charAt(0) ?? ''
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-3xl font-bold text-foreground-muted">
      {first}{last}
    </div>
  )
}

// ─── Attorney Card ────────────────────────────────────────────────────────────

function AttorneyCard({attorney, priority = false}: {attorney: Attorney; priority?: boolean}) {
  const name = fullName(attorney)
  const href = `/${attorney.slug}/`
  const areas = attorney.practiceAreas ?? []
  const visibleAreas = areas.slice(0, 3)
  const extraCount = areas.length - visibleAreas.length

  return (
    <div className="flex flex-col">

      {/* Photo */}
      <Link href={href} className="group mb-5 block overflow-hidden md:mb-6">
        <div className="relative h-72 w-full overflow-hidden bg-muted">
          {hasImage(attorney.photo) ? (
            <SanityImage
              image={attorney.photo}
              mode="fill"
              alt={attorney.photo.alt || name}
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
              priority={priority}
              className="transition-transform duration-ui-slow ease-smooth group-hover:scale-[1.03]"
            />
          ) : (
            <Initials attorney={attorney} />
          )}
        </div>
      </Link>

      {/* Name + title */}
      <div className="mb-3 md:mb-4">
        <Link href={href} className="hover:underline">
          <h3 className="text-lg font-bold leading-snug text-foreground">{name}</h3>
        </Link>
        {attorney.jobTitle && (
          <p className="mt-0.5 text-sm text-foreground-muted">{attorney.jobTitle}</p>
        )}
      </div>

      {/* Practice areas */}
      {visibleAreas.length > 0 && (
        <ul className="mb-4 space-y-0.5">
          {visibleAreas.map((area, i) => (
            <li key={i} className="text-sm text-foreground-muted">
              {area.slug ? (
                <Link href={`/${area.slug}/`} className="hover:underline hover:text-foreground">
                  {area.label}
                </Link>
              ) : (
                area.label
              )}
            </li>
          ))}
          {extraCount > 0 && (
            <li className="text-sm text-foreground-muted">+{extraCount} more</li>
          )}
        </ul>
      )}

      {/* View Profile */}
      <div className="mt-auto pt-2">
        <Button variant="tertiary" context="light" href={href}>View profile</Button>
      </div>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AttorneyIndexPage() {
  const [indexPage, attorneys, globalCtaData, rawTokens] = await Promise.all([
    client.fetch(ATTORNEY_INDEX_QUERY),
    client.fetch(ATTORNEY_PAGES_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)

  // Merge: drag-ordered attorneys first, then any not yet in the list alphabetically.
  // Belt-and-suspenders null + slug filter — paired with GROQ post-projection
  // [defined(_id)] on orderedAttorneys (see queries.ts ATTORNEY_INDEX_QUERY);
  // guards against future query regressions that bypass the canonical safe-
  // defaults pattern, and against documents that resolve but lack a usable slug.
  const orderedAttorneys = (indexPage?.orderedAttorneys ?? []).filter(
    (a: Attorney | null): a is Attorney => a !== null && Boolean(a.slug)
  )
  const orderedSlugs = new Set<string>(orderedAttorneys.map((a: Attorney) => a.slug))
  const unordered = (attorneys ?? []).filter((a: Attorney) => !orderedSlugs.has(a.slug))
  const allAttorneys: Attorney[] = [...orderedAttorneys, ...unordered]

  const tagline = resolveTokenString(indexPage?.tagline, tokens)
  const heading = resolveTokenString(indexPage?.heading, tokens)
  const description = resolveTokenString(indexPage?.description, tokens)
  const hasIntro = !!(tagline || heading || description)

  return (
    <>
      {/* Hero — InternalHero when configured, fallback header band otherwise. h1 always ships. */}
      {indexPage?.hero ? (
        <InternalHero data={indexPage.hero} napTokens={tokens} />
      ) : (
        <InternalPageHeader title={indexPage?.title ?? 'Our Attorneys'} />
      )}

      {/* Breadcrumb band */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: 'Attorneys', href: '/attorneys/'}]} />
        </div>
      </div>

      {/* Intro copy (optional) */}
      {hasIntro && heading && (
        <div className="px-[5%] py-10 md:py-12">
          <SectionHeader
            tagline={tagline}
            heading={heading}
            description={description}
            alignment="left"
            className="container max-w-lg"
          />
        </div>
      )}

      {/* Attorney grid */}
      <section className={`px-[5%] pb-16 md:pb-24 lg:pb-28 ${hasIntro ? '' : 'pt-10'}`}>
        <div className="container">
          {allAttorneys.length > 0 ? (
            <ul role="list" aria-label="Attorneys" className="grid grid-cols-1 gap-x-14 gap-y-16 sm:grid-cols-2 md:gap-y-20 lg:grid-cols-4">
              {allAttorneys.map((attorney: Attorney, i: number) => (
                <li key={attorney.slug}>
                  <AttorneyCard attorney={attorney} priority={i < 4} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-foreground-muted">No attorneys found.</p>
          )}
        </div>
      </section>

      {/* Global CTA */}
      {!(indexPage?.hideCtaForm) && globalCtaData && (
        <GlobalCta
          data={
            indexPage?.ctaOverride
              ? {...globalCtaData, ...indexPage.ctaOverride}
              : globalCtaData
          }
          napTokens={tokens}
        />
      )}
    </>
  )
}
