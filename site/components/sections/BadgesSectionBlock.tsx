import Image from 'next/image'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {SectionShell, type SectionAppearance} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {type BadgesSectionProps} from './sectionProps'
import {headingFit, type HeadingFit} from '@/lib/headingFit'

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

function CenteredGrid({data, tagline, heading, description, buttons, fit}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null; buttons?: CtaButton[]; fit?: HeadingFit | null}) {
  return (
    <>
        {heading && (
          <SectionHeader
            tagline={tagline}
            heading={heading}
            fit={fit}
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

function InlineBadges({data, tagline, heading, description, buttons, fit}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null; buttons?: CtaButton[]; fit?: HeadingFit | null}) {
  return (
    <>
        <div className="heading-grows heading-flex-third shrink-0 lg:w-1/3">
          {heading && (
            <SectionHeader
              tagline={tagline}
              heading={heading}
              fit={fit}
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
            <BadgeList badges={data.badges} className="flex flex-wrap items-center justify-start gap-8 lg:justify-end" imageClassName="h-36 w-auto object-contain" />
          </div>
        )}
    </>
  )
}

function SplitBadges({data, tagline, heading, description, buttons, fit}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null; buttons?: CtaButton[]; fit?: HeadingFit | null}) {
  return (
    <>
        <div className="heading-grows heading-flex-third shrink-0 lg:w-1/3">
          {heading && (
            <SectionHeader
              tagline={tagline}
              heading={heading}
              fit={fit}
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

// The marquee layout, inside the shell like the other three (Phase 16A): its Surface
// and Buttons fields did nothing while it painted its own `<section>`. The shell
// runs without its gutter and container so the strip stays edge to edge; the
// heading and the buttons sit in a container of their own.
function ScrollingBadges({data, tagline, heading, description, buttons, fit}: {data: BadgesSectionBlockData; tagline?: string | null; heading?: string | null; description?: string | null; buttons?: CtaButton[]; fit?: HeadingFit | null}) {
  const badges = data.badges ?? []
  if (badges.length === 0) return null

  return (
    <>
      {heading && (
        <div className="container px-[5%]">
          <SectionHeader tagline={tagline} heading={heading} fit={fit} description={description} className={description ? 'mb-10' : undefined} />
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
      {buttons && buttons.length > 0 && (
        <div className="container px-[5%]">
          <ButtonGroup items={toCtaItems(buttons)} align="center" respectVariantField={false} className="mt-8" />
        </div>
      )}
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

// ─── The frame (Phase 13) ─────────────────────────────────────────────────────
//
// All four layouts render on `SectionShell`. `scrolling` joined in Phase 16A,
// where its Surface and Buttons fields were found doing nothing: the shell can
// now drop its gutter and container, and the band takes the spacing preset in
// place of its old `py-12`, like every other band.
//
// An unset band is `light`, never `pattern` (Phase 16A): `pattern` now paints the
// site's section texture, which only a band someone deliberately set to Pattern
// may wear. Both render the light ground, so nothing moves on a site with no
// texture. A code default, not an `initialValue`, because the composer folds a
// seed into every band it writes (item 308, [R-450]).

// Each moved layout's own wrapper classes, passed to the shell's container so no
// extra div appears.
const INNER_CLASS: Record<string, string> = {
  centeredGrid: 'text-center',
  inline:       'flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12',
  split:        'flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16',
}

/** The appearance this section will actually render with, for the seam walk. */
export function resolveAppearance(data: BadgesSectionBlockData): SectionAppearance {
  return {...data.appearance, surface: data.appearance?.surface ?? 'light'}
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
  // Phase 17C session 3: the widths the heading's words need, in the face the page wears.
  const fit = headingFit(heading, seam.site?.headingFace)
  const buttons = data.buttons?.map((btn) => ({
    ...btn,
    title: resolveTokenString(btn.title, napTokens),
  }))

  // Off the shell, and staying off it.
  if (data.layout === 'scrolling') {
    if (!data.badges || data.badges.length === 0) return null
    return (
      <SectionShell appearance={resolveAppearance(data)} contained={false} gutter={false} seam={seam}>
        <ScrollingBadges data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} fit={fit} />
      </SectionShell>
    )
  }

  const body =
    data.layout === 'inline' ? <InlineBadges data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} fit={fit} />
    : data.layout === 'split' ? <SplitBadges data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} fit={fit} />
    : <CenteredGrid data={data} tagline={tagline} heading={heading} description={description} buttons={buttons} fit={fit} />

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      innerClassName={INNER_CLASS[data.layout === 'inline' ? 'inline' : data.layout === 'split' ? 'split' : 'centeredGrid']}
      seam={seam}
    >
      {body}
    </SectionShell>
  )
}
