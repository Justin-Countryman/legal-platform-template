import Image from 'next/image'
import Link from 'next/link'

// ─── Attorney Highlight block ─────────────────────────────────────────────────
//
// CLIENT-OWNED. Block components only live here; the dispatcher and the
// first-block motion rule are platform-owned at
// `components/layout/HomepageCanvas.tsx`. Keep the path and export name.
//
// TOKENS ONLY. No ScrollReveal here. Heading is `marketing-h2` written
// directly, never <SectionHeader>, per BI-Library Layer 3 rule 2.
//
// ─── Layout by firm size, decided here and not by the operator ────────────────
//
// BI-Homepage Beat 6: solo is a single hero card, a small firm shows all
// attorneys, larger firms slide or highlight owners. That is the field-test
// corollary again: the operator chooses WHO appears, and the rendering absorbs
// the layout consequence. One attorney gets a wide card rather than a lonely
// third of a row; two split; three and up is a grid that wraps.
//
// ─── Real headshots only ──────────────────────────────────────────────────────
//
// Beat 6 forbids stock photography for attorneys. A schema cannot enforce that,
// so the rendering does the next best thing: an attorney with no photo renders
// as a card WITHOUT an image rather than with a silhouette placeholder. A
// missing headshot should look like a gap the firm needs to fill, not like a
// design choice, and a generic avatar is the thing most likely to be mistaken
// for one.

export type AttorneyCard = {
  _id?: string
  name?: string | null
  jobTitle?: string | null
  href?: string | null
  photo?: {src?: string | null; alt?: string | null; width?: number | null; height?: number | null} | null
}

export type AttorneyHighlightBlockData = {
  _type: 'attorneyHighlightBlock'
  _key: string
  tagline?: string | null
  heading?: string | null
  mode?: string | null
  attorneys?: AttorneyCard[] | null
}

/**
 * Columns for a given attorney count, per Beat 6's firm-size rule. Exported so
 * the test pins the mapping rather than asserting on a copied class string.
 */
export function attorneyGridForCount(count: number): string {
  if (count === 1) return 'max-w-md mx-auto' // solo: one hero card, not a lonely column
  if (count === 2) return 'sm:grid-cols-2 max-w-3xl mx-auto'
  return 'sm:grid-cols-2 lg:grid-cols-3'
}

export function AttorneyHighlightBlock({data}: {data: AttorneyHighlightBlockData}) {
  // An attorney with no name and no link is not a card anyone can use.
  const attorneys = (data.attorneys ?? []).filter((a) => a.name && a.href)

  if (attorneys.length === 0) return null

  return (
    <section className="px-[5%] py-16 md:py-24">
      {data.heading || data.tagline ? (
        <div className="container mx-auto max-w-3xl text-center">
          {data.tagline ? (
            <p className="tagline">{data.tagline}</p>
          ) : null}
          {data.heading ? (
            <h2 className="marketing-h2 font-heading font-bold text-foreground">{data.heading}</h2>
          ) : null}
        </div>
      ) : null}

      <div className="container mx-auto mt-12 max-w-6xl">
        <ul role="list" className={`grid grid-cols-1 gap-8 ${attorneyGridForCount(attorneys.length)}`}>
          {attorneys.map((a, i) => (
            <li key={a._id ?? i}>
              {/* The whole card is the link: Beat 6 requires each card to reach
                  the full profile, and a card whose only target is a small text
                  link is a worse tap target on mobile. */}
              <Link
                href={a.href as string}
                className="group block overflow-hidden rounded-ui bg-surface-muted shadow-card transition-shadow duration-ui-base hover:shadow-card-hover"
              >
                {a.photo?.src ? (
                  <Image
                    src={a.photo.src}
                    alt={a.photo.alt || (a.name as string)}
                    width={a.photo.width ?? 600}
                    height={a.photo.height ?? 750}
                    loading="lazy"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="h-auto w-full object-cover"
                  />
                ) : null}
                <div className="p-6">
                  <h3 className="font-heading text-xl font-bold text-foreground">{a.name}</h3>
                  {a.jobTitle ? (
                    <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">
                      {a.jobTitle}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
