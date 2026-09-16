import Image from 'next/image'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {SectionShell, type SectionAppearance} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {Tagline} from '@/components/ui/Tagline'
import {type BadgesSectionProps} from './sectionProps'

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

// One props type for both renderings; no `_type`, the dispatchers own it. See
// sectionProps.ts.
export type BadgesSectionBlockData = BadgesSectionProps

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
    <>
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
    </>
  )
}

function InlineBadges({data, tagline, heading, description, buttons}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null; buttons?: CtaButton[]}) {
  return (
    <>
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
    </>
  )
}

function SplitBadges({data, tagline, heading, description, buttons}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null; buttons?: CtaButton[]}) {
  return (
    <>
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
    </>
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

// ─── The frame (Phase 13) ─────────────────────────────────────────────────────
//
// Three of the four layouts move onto `SectionShell`. `scrolling` does NOT: its
// `py-12` matches no spacing preset at `md` (48px against the compact preset's
// 64px), and it is the one band on the platform that needs the container for its
// heading and NO gutter for its full-bleed marquee strip, which the shell cannot
// express at once. Moving it would change a live band for no gain.
//
// All three that move were transparent, so `pattern` is their default surface:
// it means "this band paints no background of its own", which keeps today's
// rendering exactly and leaves Phase 16's `surfaceRhythm` free to decide what an
// unset band should show. A code default, not an `initialValue`, because the
// composer folds a seed into every band it writes (item 308, [R-450]).

// Each moved layout's own wrapper classes, passed to the shell's container so no
// extra div appears.
const INNER_CLASS: Record<string, string> = {
  centeredGrid: 'text-center',
  inline:       'flex flex-col gap-8 md:flex-row md:items-center md:gap-12',
  split:        'flex flex-col gap-12 md:flex-row md:items-start md:gap-16',
}

/** The appearance this section will actually render with, for the seam walk. */
export function resolveAppearance(data: BadgesSectionBlockData): SectionAppearance {
  return {...data.appearance, surface: data.appearance?.surface ?? 'pattern'}
}

/** A badges band IS its badges. */
export function isEmpty(data: BadgesSectionBlockData): boolean {
  return (data.badges ?? []).length === 0
}

export function BadgesSectionBlock({
  data,
  napTokens,
  seam = NO_SEAM,
}: {
  data: BadgesSectionBlockData
  napTokens?: NapTokens | null
  seam?: SeamProps
}) {
  if (isEmpty(data)) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const description = resolveTokenString(data.description, napTokens)
  const buttons = data.buttons?.map((btn) => ({
    ...btn,
    title: resolveTokenString(btn.title, napTokens),
  }))

  // Off the shell, and staying off it.
  if (data.layout === 'scrolling') {
    return <ScrollingBadges data={data} tagline={tagline} heading={heading} description={description} />
  }

  const body =
    data.layout === 'inline' ? <InlineBadges data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} />
    : data.layout === 'split' ? <SplitBadges data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} />
    : <CenteredGrid data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} />

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      innerClassName={INNER_CLASS[data.layout === 'inline' ? 'inline' : data.layout === 'split' ? 'split' : 'centeredGrid']}
      seamTop={seam.seamTop}
      previousGround={seam.previousGround}
      previousEdge={seam.previousEdge}
    >
      {body}
    </SectionShell>
  )
}
