import Image from 'next/image'
import {CardLink} from '@/components/ui/CardLink'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {TertiaryArrow} from '@/components/ui/TertiaryArrow'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type AttorneyCard = {
  _id: string
  title: string
  slug: string
  h1?: string | null
  photo?: {
    src: string
    alt?: string | null
    width?: number | null
    height?: number | null
  } | null
}

export type AttorneySectionBlockData = {
  _type: 'attorneySection'
  tagline?: string | null
  heading?: string | null
  description?: string | null
  mode?: 'practiceArea' | 'manual' | 'all' | null
  layout?: 'grid' | 'slider' | null
  attorneys?: AttorneyCard[] | null
  orderedAttorneyIds?: string[] | null
}

// ─── Attorney card ────────────────────────────────────────────────────────────

function AttorneyCardItem({attorney}: {attorney: AttorneyCard}) {
  return (
    <CardLink
      href={`/${attorney.slug}/`}
      aria-label={`View profile for ${attorney.h1 ?? attorney.title}`}
      className="flex min-h-[160px] overflow-hidden"
    >
      {/* Image */}
      <div className="relative w-1/3 shrink-0 self-stretch">
        {attorney.photo?.src ? (
          <Image
            src={attorney.photo.src}
            alt={attorney.photo.alt ?? attorney.title}
            fill
            className="object-cover object-top"
            sizes="(min-width: 1024px) 11vw, (min-width: 640px) 17vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
      </div>

      {/* Text */}
      <div className="flex flex-1 flex-col justify-center border-l border-border px-5 py-6">
        <p className="font-heading font-semibold leading-snug text-foreground">{attorney.h1 ?? attorney.title}</p>
        <span aria-hidden="true" className="mt-3 inline-flex items-center gap-1.5 text-base font-medium [text-transform:var(--tertiary-text-transform,none)] [letter-spacing:var(--tertiary-letter-spacing,0em)] text-action-text">
          View profile
          <TertiaryArrow />
        </span>
      </div>
    </CardLink>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttorneySectionBlock({
  data,
  napTokens,
}: {
  data: AttorneySectionBlockData
  napTokens?: NapTokens | null
}) {
  let attorneys = (data.attorneys ?? []).filter(Boolean)
  if (data.mode === 'practiceArea' && data.orderedAttorneyIds?.length) {
    const order = new Map(data.orderedAttorneyIds.map((id, i) => [id, i]))
    attorneys = [...attorneys].sort((a, b) => (order.get(a._id) ?? Infinity) - (order.get(b._id) ?? Infinity))
  }
  if (attorneys.length === 0) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)

  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container">

        {heading && (
          <SectionHeader
            tagline={tagline}
            heading={heading}
            description={description}
            className="mx-auto mb-12 max-w-2xl"
          />
        )}

        <ul role="list" className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-label="Attorneys">
          {attorneys.map((attorney) => (
            <li key={attorney._id}>
              <AttorneyCardItem attorney={attorney} />
            </li>
          ))}
        </ul>

      </div>
    </section>
  )
}
