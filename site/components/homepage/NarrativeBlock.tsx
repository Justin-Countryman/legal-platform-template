import Image from 'next/image'
import Link from 'next/link'
import {BlockProse} from '@/components/ui/BlockProse'
import {Button} from '@/components/ui/Button'
import {type NapTokens} from '@/lib/tokens'

// ─── Narrative block ──────────────────────────────────────────────────────────
//
// CLIENT-OWNED. `components/homepage/` holds block components only; the
// dispatcher and the first-block motion rule are platform-owned at
// `components/layout/HomepageCanvas.tsx`. Keep the path and export name; the
// markup inside is yours to replace.
//
// TOKENS ONLY. No ScrollReveal here: motion belongs to the canvas, which is the
// only thing that knows whether this block is first.
//
// The heading is `marketing-h2` written directly, not <SectionHeader>, and the
// body renders through <BlockProse> rather than <PortableText>. Both are the
// same rule: an interior-page primitive decides type scale on the block's
// behalf. See BI-Library Layer 3 rule 2.
//
// ─── One block, two uses ──────────────────────────────────────────────────────
//
// Guide/about (Beat 5) fills heading, body, and usually image and ctaButton.
// The practice-area narrative fills `internalLinks` as well, and that is the
// only structural difference between them. The rendering absorbs it: with links
// present the block grows a link row beneath the prose; without them nothing is
// drawn. The operator never picks a variant.

export type NarrativeImage = {
  src?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export type NarrativeInternalLink = {
  _key?: string
  href?: string | null
  anchorText?: string | null
}

export type NarrativeBlockData = {
  _type: 'narrativeBlock'
  _key: string
  heading?: string | null
  body?: unknown[] | null
  image?: NarrativeImage | null
  ctaButton?: {title?: string | null; url?: string | null; variant?: string | null} | null
  internalLinks?: NarrativeInternalLink[] | null
}

export function NarrativeBlock({
  data,
  napTokens,
}: {
  data: NarrativeBlockData
  napTokens?: NapTokens | null
}) {
  const hasBody = Array.isArray(data.body) && data.body.length > 0
  const hasImage = Boolean(data.image?.src)
  // A link whose reference no longer resolves has no href; GROQ already drops
  // dangling refs, this covers a reference that resolved to a page with no slug.
  const links = (data.internalLinks ?? []).filter((l) => l.href && l.anchorText)
  const cta = data.ctaButton?.title && data.ctaButton?.url ? data.ctaButton : null

  // Nothing to say: render nothing rather than an empty band.
  if (!data.heading && !hasBody && !hasImage) return null

  return (
    <section className="px-[5%] py-16 md:py-24">
      <div
        className={
          hasImage
            ? 'container mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16'
            : 'container mx-auto max-w-3xl'
        }
      >
        <div>
          {data.heading ? (
            <h2 className="marketing-h2 font-heading font-bold text-foreground">{data.heading}</h2>
          ) : null}

          {hasBody ? (
            <div className="mt-6">
              <BlockProse value={data.body} napTokens={napTokens} />
            </div>
          ) : null}

          {/* The practice-area variant. Absent on a guide/about narrative, and
              the block simply does not draw this row. */}
          {links.length > 0 ? (
            <ul role="list" className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {links.map((l, i) => (
                <li key={l._key ?? i}>
                  <Link
                    href={l.href as string}
                    className="text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover"
                  >
                    {l.anchorText}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {cta ? (
            <div className="mt-8">
              <Button href={cta.url as string} variant={cta.variant === 'secondary' ? 'secondary' : 'primary'}>
                {cta.title}
              </Button>
            </div>
          ) : null}
        </div>

        {hasImage ? (
          <div className="overflow-hidden rounded-ui shadow-card">
            <Image
              src={data.image?.src as string}
              alt={data.image?.alt ?? ''}
              width={data.image?.width ?? 800}
              height={data.image?.height ?? 600}
              loading="lazy"
              sizes="(min-width: 768px) 50vw, 100vw"
              className="h-auto w-full object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
