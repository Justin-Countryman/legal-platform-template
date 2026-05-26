import Image from 'next/image'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {Tagline} from '@/components/ui/Tagline'

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeImage = {
  src?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

type CtaButton = {
  title?: string | null
  url?: string | null
  variant?: string | null
}

// Badges has historically rendered every CTA as primary regardless of the
// per-item Sanity `variant` field; that behavior is preserved by the consumers
// passing `respectVariantField={false}` to <ButtonGroup>.

export type BadgesSectionBlockData = {
  _type: 'badgesSection'
  tagline?: string | null
  heading?: string | null
  description?: string | null
  layout?: 'inline' | 'centeredGrid' | 'split' | 'scrolling' | null
  buttons?: CtaButton[] | null
  badges?: BadgeImage[] | null
}

// ─── Badge list ───────────────────────────────────────────────────────────────

function BadgeList({badges, className, imageClassName}: {badges: BadgeImage[]; className?: string; imageClassName?: string}) {
  return (
    <div className={className ?? 'flex flex-wrap items-center justify-center gap-6'}>
      {badges.map((badge, i) =>
        badge.src ? (
          <Image
            key={i}
            src={badge.src}
            alt={badge.alt ?? ''}
            width={badge.width ?? 300}
            height={badge.height ?? 300}
            className={imageClassName ?? 'max-h-20 w-auto object-contain'}
          />
        ) : null,
      )}
    </div>
  )
}

// ─── Layouts ──────────────────────────────────────────────────────────────────

function CenteredGrid({data, tagline, heading, description, buttons}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null; buttons?: CtaButton[]}) {
  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container text-center">
        {heading && (
          <SectionHeader
            tagline={tagline}
            heading={heading}
            description={description}
            className={description ? 'mb-10' : undefined}
          />
        )}
        {data.badges && data.badges.length > 0 && (
          <BadgeList badges={data.badges} imageClassName="h-36 w-auto object-contain" />
        )}
        {buttons && buttons.length > 0 && (
          <ButtonGroup
            items={toCtaItems(buttons)}
            align="center"
            respectVariantField={false}
            className="mt-8"
          />
        )}
      </div>
    </section>
  )
}

function InlineBadges({data, tagline, heading, description, buttons}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null; buttons?: CtaButton[]}) {
  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container flex flex-col gap-8 md:flex-row md:items-center md:gap-12">
        <div className="shrink-0 md:w-1/3">
          {heading && (
            <SectionHeader
              tagline={tagline}
              heading={heading}
              description={description}
              alignment="left"
            />
          )}
          {buttons && buttons.length > 0 && (
            <ButtonGroup
              items={toCtaItems(buttons)}
              respectVariantField={false}
              className="mt-6"
            />
          )}
        </div>
        {data.badges && data.badges.length > 0 && (
          <div className="flex-1">
            <BadgeList badges={data.badges} className="flex flex-wrap items-center justify-start gap-8 md:justify-end" imageClassName="h-36 w-auto object-contain" />
          </div>
        )}
      </div>
    </section>
  )
}

function SplitBadges({data, tagline, heading, description, buttons}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null; buttons?: CtaButton[]}) {
  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container flex flex-col gap-12 md:flex-row md:items-start md:gap-16">
        <div className="shrink-0 md:w-1/3">
          {heading && (
            <SectionHeader
              tagline={tagline}
              heading={heading}
              description={description}
              alignment="left"
            />
          )}
          {buttons && buttons.length > 0 && (
            <ButtonGroup
              items={toCtaItems(buttons)}
              respectVariantField={false}
              className="mt-6"
            />
          )}
        </div>
        {data.badges && data.badges.length > 0 && (
          <div className="flex-1">
            <ul role="list" aria-label="Trust badges" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {data.badges.map((badge, i) =>
                badge.src ? (
                  <li key={i} className="flex items-center justify-center">
                    <Image
                      src={badge.src}
                      alt={badge.alt ?? ''}
                      width={badge.width ?? 300}
                      height={badge.height ?? 300}
                      className="h-28 w-auto object-contain"
                    />
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function ScrollingBadges({data, tagline, heading, description}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null}) {
  const badges = data.badges ?? []
  if (badges.length === 0) return null

  return (
    <section className="overflow-hidden py-12">
      {(tagline || heading || description) && (
        <div className="container mb-8 text-center">
          {tagline && <Tagline as="p">{tagline}</Tagline>}
          {heading && <h2 className="mb-4 text-3xl font-bold text-foreground">{heading}</h2>}
          {description && <p className="text-foreground-muted">{description}</p>}
        </div>
      )}
      <div className="w-full overflow-hidden" aria-label="Awards and recognition badges">
        <div className="flex w-max animate-[marquee-top_30s_linear_infinite] gap-16 hover:[animation-play-state:paused]">
          {[...badges, ...badges, ...badges, ...badges].map((badge, i) =>
            badge.src ? (
              <Image
                key={i}
                src={badge.src}
                alt={badge.alt ?? ''}
                width={badge.width ?? 300}
                height={badge.height ?? 300}
                className="h-20 w-auto object-contain"
                aria-hidden={i >= badges.length}
              />
            ) : null,
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function BadgesSectionBlock({
  data,
  napTokens,
}: {
  data: BadgesSectionBlockData
  napTokens?: NapTokens | null
}) {
  const badges = data.badges ?? []
  if (badges.length === 0) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)
  const buttons = data.buttons?.map((btn) => ({
    ...btn,
    title: resolveTokenString(btn.title, napTokens),
  }))

  if (data.layout === 'inline') return <InlineBadges data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} />
  if (data.layout === 'scrolling') return <ScrollingBadges data={data} tagline={tagline} heading={heading} description={description} />
  if (data.layout === 'split') return <SplitBadges data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} />
  return <CenteredGrid data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} />
}
