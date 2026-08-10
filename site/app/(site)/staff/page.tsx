export const revalidate = 3600

import type {Metadata} from 'next'
import {buildRobotsMeta} from '@/lib/robotsMeta'
import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import Link from 'next/link'
import {client} from '@/lib/sanity/client'
import {
  STAFF_INDEX_QUERY,
  STAFF_PAGES_QUERY,
  GLOBAL_CTA_QUERY,
  NAP_TOKENS_QUERY,
} from '@/lib/sanity/queries'
import {expandNapTokens, resolveTokenString} from '@/lib/tokens'
import {resolveTitle} from '@/lib/seoTitle'
import {buildSocialMeta} from '@/lib/socialMeta'
import {InternalHero} from '@/components/layout/InternalHero'
import {InternalPageHeader} from '@/components/layout/InternalPageHeader'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {INDEX_PAGE_PRESETS, resolvePageLabel} from '@/lib/pageLabel'
import {siteHost} from '@/lib/siteHost'
import {Button} from '@/components/ui/Button'
import {GlobalCta} from '@/components/sections/GlobalCta'

// ─── Types ────────────────────────────────────────────────────────────────────

type StaffCard = {
  slug: string
  firstName: string | null
  lastName: string | null
  jobTitle: string | null
  photo: SanityImageData | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullName(s: StaffCard): string {
  return [s.firstName, s.lastName].filter(Boolean).join(' ')
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const [indexPage, rawTokens] = await Promise.all([
    client.fetch(STAFF_INDEX_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  if (!indexPage) return {title: INDEX_PAGE_PRESETS.staffIndex}

  // NAME-1: the Search title reads `seoTitle` and falls back to NAME (NAME-2),
  // not to the heading. `indexPage.title` used to arrive as the hero heading via
  // the GROQ projection, so this surface read the H1 by accident.
  //
  // Passed INLINE: `titleFallback.test.ts` matches the second argument of this
  // call against a declared accessor, and a local variable name would make that
  // check vacuous.
  const {title, label} = resolveTitle(
    indexPage.seoTitle, resolvePageLabel(indexPage, 'staffIndex') ?? '',
    tokens, tokens?.firmName,
  )
  const description = resolveTokenString(indexPage.metaDescription, tokens)
  return {
    title,
    description,
    ...(await buildRobotsMeta(indexPage.noIndex, indexPage.noFollow)),
    alternates: {canonical: indexPage.canonicalUrl ?? '/staff'},
    ...buildSocialMeta(label, description, indexPage?.ogImage, {
      ogTitle: indexPage?.ogTitle, ogDescription: indexPage?.ogDescription, tokens,
    }),
  }
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({member, priority = false}: {member: StaffCard; priority?: boolean}) {
  const name = fullName(member)
  const href = `/${member.slug}/`

  return (
    <div className="flex flex-col">

      {/* Photo */}
      <Link href={href} className="group mb-5 block overflow-hidden md:mb-6">
        <div className="relative h-72 w-full overflow-hidden bg-muted">
          {hasImage(member.photo) ? (
            <SanityImage
              image={member.photo}
              mode="fill"
              alt={member.photo.alt || name}
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
              priority={priority}
              className="transition-transform duration-ui-slow ease-smooth group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-foreground-muted">
              {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
            </div>
          )}
        </div>
      </Link>

      {/* Name + title */}
      <div className="mb-4">
        <Link href={href} className="hover:underline">
          <h3 className="text-lg font-bold leading-snug text-foreground">{name}</h3>
        </Link>
        {member.jobTitle && (
          <p className="mt-0.5 text-sm text-foreground-muted">{member.jobTitle}</p>
        )}
      </div>

      <div className="mt-auto pt-2">
        <Button variant="tertiary" context="light" href={href}>View profile</Button>
      </div>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StaffIndexPage() {
  const [indexPage, allStaff, globalCtaData, rawTokens] = await Promise.all([
    client.fetch(STAFF_INDEX_QUERY),
    client.fetch(STAFF_PAGES_QUERY),
    client.fetch(GLOBAL_CTA_QUERY),
    client.fetch(NAP_TOKENS_QUERY),
  ])
  const tokens = expandNapTokens(rawTokens)
  // NAME-3: one resolver, and this route names nothing itself.
  const pageLabel = resolvePageLabel(indexPage, 'staffIndex') ?? ''

  // Merge: drag-ordered staff first, then remaining alphabetically.
  // Belt-and-suspenders null + slug filter — paired with GROQ post-projection
  // [defined(_id)] on orderedStaff (see queries.ts STAFF_INDEX_QUERY); guards
  // against future query regressions that bypass the canonical safe-defaults
  // pattern, and against documents that resolve but lack a usable slug.
  const orderedStaff = (indexPage?.orderedStaff ?? []).filter(
    (s: StaffCard | null): s is StaffCard => s !== null && Boolean(s.slug)
  )
  const orderedSlugs = new Set<string>(orderedStaff.map((s: StaffCard) => s.slug))
  const unordered = (allStaff ?? []).filter((s: StaffCard) => !orderedSlugs.has(s.slug))
  const members: StaffCard[] = [...orderedStaff, ...unordered]

  return (
    <>
      {/* Hero — InternalHero when configured, fallback header band otherwise. h1 always ships. */}
      {indexPage?.hero ? (
        <InternalHero data={indexPage.hero} napTokens={tokens} />
      ) : (
        // The H1 is the HEADING field (NAME-1), so it reads `hero.heading` and
        // falls back to the page's Name — never to a literal. Both literals here
        // said `Our Team`, which NAME-4 superseded to `Our Staff`.
        <InternalPageHeader title={indexPage?.hero?.heading ?? pageLabel} />
      )}

      {/* Breadcrumb */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[{label: 'Home', href: '/'}, {label: pageLabel, href: '/staff'}]} domain={siteHost()} />
        </div>
      </div>

      {/* Staff grid */}
      <section className="px-[5%] py-16 md:py-24 lg:py-28">
        <div className="container">
          {members.length > 0 ? (
            <ul role="list" aria-label="Staff" className="grid grid-cols-1 gap-x-14 gap-y-16 sm:grid-cols-2 md:gap-y-20 lg:grid-cols-4">
              {members.map((member, i) => (
                <li key={member.slug}>
                  <StaffCard member={member} priority={i < 4} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-foreground-muted">No team members found.</p>
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
