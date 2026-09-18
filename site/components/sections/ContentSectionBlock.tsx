import Image from 'next/image'
import {BlockProse} from '@/components/ui/BlockProse'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {HeadingUnit, type HeadingUnitScale} from '@/components/ui/HeadingUnit'
import {SanityImage} from '@/components/ui/SanityImage'
import {VideoEmbed} from '@/components/media/VideoEmbed'
import {splitEmphasis} from '@/lib/headingEmphasis'
import {resolveTreatment, treatmentClasses, type TreatmentGround} from '@/lib/imageTreatment'
import {hasImage} from '@/lib/sanity/image'
import {formatPhone, resolveTokenString, type NapTokens} from '@/lib/tokens'
import {MarqueeRibbon} from './MarqueeRibbon'
import {SectionShell, type SectionAppearance} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import type {ContentSectionProps} from './sectionProps'

// ─── Content section ──────────────────────────────────────────────────────────
//
// The one prebuilt combined section, in five layouts (Phase 11, 2026-09-14;
// monorepo WS-V1-PHASE11-DESIGN §2 and §7, [R-434], [R-437]). The homepage list
// renders it for `contentSectionInline` at the marketing tier; an interior
// page's `sections` list renders it for the `contentSection` document at the
// interior tier. The DISPATCHER picks the tier and resolves the disclaimer.
//
// SLOTS PER LAYOUT (the schema hides a slot its layout does not render):
//   split          media one side (mediaSide, default right; stacks above the
//                  text on mobile); tagline, heading, body, items, pull quote,
//                  proof, buttons and phone the other. No media: one column.
//   twoColumnText  tagline and heading left; body, items, pull quote, proof,
//                  buttons and phone right.
//   statement      tagline, heading, body, proof, buttons and phone, centred.
//   ribbon         the heading as one line at body size; `marquee` scrolls it.
//   statRow        tagline and heading, then the items as number and caption.
//
// ─── THE RESULTS DISCLAIMER IS NOT OPTIONAL ───────────────────────────────────
//
// A proof number or a stat tile can state a past result ("$40M recovered"), and
// bar advertising rules pair past results with a disclaimer, always. So
// `disclaimer` is a REQUIRED prop, resolved by the dispatcher from the code
// constant (site/lib/legal.ts), and it renders whenever `rendersResultClaim`
// says a proof number or a stat tile renders. There is no per-item "this is a
// result" flag: a flag's blank default is a result published with no disclaimer
// (see CaseResultsSection.tsx). Phase 12's gate reads the same function.

export type ContentSectionData = ContentSectionProps

type Layout = 'split' | 'twoColumnText' | 'statement' | 'ribbon' | 'statRow'
type Item = NonNullable<ContentSectionData['items']>[number]

const has = (s?: string | null): s is string => Boolean(s && s.trim())

function layoutOf(data: ContentSectionData): Layout {
  const l = data.layout
  return l === 'twoColumnText' || l === 'statement' || l === 'ribbon' || l === 'statRow' ? l : 'split'
}

function renderableItems(data: ContentSectionData): Item[] {
  return (data.items ?? []).filter((item) => has(item.title) || has(item.body))
}

function hasMedia(media: ContentSectionData['media']): boolean {
  if (!media) return false
  if (media.kind === 'video') return has(media.video?.youTubeUrl)
  return hasImage(media.image)
}

/**
 * "Renders nothing", per layout (design §7 amendment 10). Both dispatchers call
 * it before rendering, so an empty section leaves no ScrollReveal wrapper; the
 * component calls it too, defensively. A statement or a ribbon is its heading;
 * a stat row is its items; a split needs body, items or media.
 */
export function isContentSectionEmpty(data: ContentSectionData | null | undefined): boolean {
  if (!data) return true
  const body = (data.body?.length ?? 0) > 0
  const items = renderableItems(data).length > 0
  switch (layoutOf(data)) {
    case 'statement':
    case 'ribbon':
      return !has(data.heading)
    case 'statRow':
      return !items
    case 'twoColumnText':
      return !has(data.heading) && !body && !items
    case 'split':
      return !body && !items && !hasMedia(data.media)
  }
}

/**
 * True when the section renders a figure that can be a past result: a proof
 * number on a layout that shows one, or a stat row with a tile. The disclaimer
 * renders exactly when this is true. Exported as the contract for Phase 12's
 * gate (the disclaimed slots are `proof.number`, and `items[].title` on a stat
 * row).
 */
export function rendersResultClaim(data: ContentSectionData): boolean {
  const layout = layoutOf(data)
  if (layout === 'statRow') return renderableItems(data).length > 0
  if (layout === 'ribbon') return false
  return has(data.proof?.number)
}

function itemsGridClass(count: number): string {
  return count > 1 ? 'grid grid-cols-1 gap-6 sm:grid-cols-2' : 'grid grid-cols-1 gap-6'
}

function statGridClass(count: number): string {
  if (count === 2) return 'grid grid-cols-1 gap-8 sm:grid-cols-2'
  if (count === 3) return 'grid grid-cols-1 gap-8 sm:grid-cols-3'
  return 'grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4'
}

// ─── The frame (Phase 13) ───────────────────────────────────────────────────
//
// THIS RESOLVER IS WHY THE SEAM IS A WALK AND NOT A COMPARISON. A ribbon with no
// stored spacing renders `compact`, decided HERE from the layout, and the
// composer stores no spacing at all (item 308, [R-450]). The record's predicate
// `curr.spacing !== 'compact'` reads the stored `undefined`, so it would have put
// a seam on an already-compact band — on exactly the band the build writes. The
// walk asks the component instead.

/** The appearance this section will actually render with, ribbon default and all. */
export function resolveAppearance(data: ContentSectionData): SectionAppearance | null | undefined {
  return layoutOf(data) === 'ribbon'
    ? {...data.appearance, spacing: data.appearance?.spacing ?? 'compact'}
    : data.appearance
}

export function ContentSectionBlock({
  data,
  disclaimer,
  napTokens,
  scale,
  seam = NO_SEAM,
}: {
  data: ContentSectionData
  /** Resolved by the dispatcher via resolveResultsDisclaimer(); never empty. Required. */
  disclaimer: string
  napTokens?: NapTokens | null
  scale: HeadingUnitScale
  seam?: SeamProps
}) {
  if (isContentSectionEmpty(data)) return null

  const layout = layoutOf(data)
  const t = (s?: string | null) => resolveTokenString(s, napTokens)
  const items = renderableItems(data)
  const claim = rendersResultClaim(data)
  const appearance = resolveAppearance(data)

  return (
    <SectionShell
      appearance={appearance}
      seam={seam}
    >
      {(surface) => {
        const center = layout === 'statement' || layout === 'statRow'
        // The media's ground is the section's own button context (Phase 15): light,
        // dark, or the accent fill, where a tint would wash nothing.
        const ground = surface.buttonContext

        const heading = has(data.heading) ? (
          <HeadingUnit
            tagline={data.tagline}
            heading={data.heading}
            headingEmphasis={data.headingEmphasis}
            tokens={napTokens}
            scale={scale}
            align={center ? 'center' : 'left'}
          />
        ) : null

        const body = (data.body?.length ?? 0) > 0 ? (
          <div className={layout === 'twoColumnText' ? 'text-foreground' : 'mt-6 text-foreground'}>
            <BlockProse value={data.body} napTokens={napTokens} />
          </div>
        ) : null

        const itemList =
          items.length > 0 && layout !== 'statRow' ? (
            <ul role="list" className={`mt-8 ${itemsGridClass(items.length)}`}>
              {items.map((item, i) => (
                <li key={item._key ?? i} className="border-t border-border pt-4">
                  {has(item.title) && <h3 className="font-heading text-xl font-bold text-foreground">{t(item.title)}</h3>}
                  {has(item.body) && <p className="mt-2 text-foreground-muted">{t(item.body)}</p>}
                </li>
              ))}
            </ul>
          ) : null

        const pullQuote = has(data.pullQuote?.text) ? (
          <figure className="mt-8 border-l-2 border-decor pl-6">
            <blockquote className="font-heading text-xl text-foreground">{t(data.pullQuote?.text)}</blockquote>
            {has(data.pullQuote?.attribution) && (
              <figcaption className="mt-3 text-sm text-foreground-muted">{t(data.pullQuote?.attribution)}</figcaption>
            )}
          </figure>
        ) : null

        // One number or a badge row; the number wins when both are set.
        const badges = (data.badges ?? []).filter((b) => b.src)
        const proof = has(data.proof?.number) ? (
          <div data-testid="proof" className="mt-8">
            <p className="font-heading text-4xl font-bold text-foreground md:text-5xl">{t(data.proof?.number)}</p>
            {has(data.proof?.caption) && <p className="mt-1 text-foreground-muted">{t(data.proof?.caption)}</p>}
          </div>
        ) : badges.length > 0 ? (
          <ul role="list" aria-label="Awards and recognition" className={`mt-8 flex flex-wrap items-center gap-6 ${center ? 'justify-center' : ''}`}>
            {badges.map((b, i) => (
              <li key={i}>
                <Image src={b.src as string} alt={b.alt ?? ''} width={b.width ?? 160} height={b.height ?? 160} className="h-14 w-auto object-contain" />
              </li>
            ))}
          </ul>
        ) : null

        // REQUIRED. See the header. Renders whenever a result figure renders.
        const resultsDisclaimer = claim ? (
          <p data-testid="results-disclaimer" className={`mt-4 text-sm text-foreground-subtle ${center ? 'text-center' : ''}`}>
            {disclaimer}
          </p>
        ) : null

        const cta = toCtaItems(data.buttons).slice(0, 2)
        const phone = data.showPhone ? napTokens?.primaryPhone : null
        const actions =
          cta.length > 0 || has(phone) ? (
            <div className={`mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 ${center ? 'justify-center' : ''}`}>
              {cta.length > 0 && <ButtonGroup items={cta} context={surface.buttonContext} align={center ? 'center' : 'start'} />}
              {has(phone) && (
                <a href={`tel:${phone.replace(/\D/g, '')}`} className="text-lg font-semibold text-foreground underline-offset-4 hover:underline">
                  {formatPhone(phone)}
                </a>
              )}
            </div>
          ) : null

        switch (layout) {
          case 'ribbon': {
            const line = t(data.heading)
            const parts = splitEmphasis(line, t(data.headingEmphasis))
            const content = parts ? (
              <>
                {parts[0]}
                <em className="heading-emphasis">{parts[1]}</em>
                {parts[2]}
              </>
            ) : (
              line
            )
            return data.marquee ? (
              <MarqueeRibbon>{content}</MarqueeRibbon>
            ) : (
              <p className="text-center text-lg font-semibold text-foreground">{content}</p>
            )
          }

          case 'statRow':
            return (
              <>
                {heading && <div className="mx-auto mb-10 max-w-3xl">{heading}</div>}
                <ul role="list" className={statGridClass(items.length)}>
                  {items.map((item, i) => (
                    <li key={item._key ?? i} className="text-center">
                      {has(item.title) && <p className="font-heading text-4xl font-bold text-foreground md:text-5xl">{t(item.title)}</p>}
                      {has(item.body) && <p className="mt-2 text-foreground-muted">{t(item.body)}</p>}
                    </li>
                  ))}
                </ul>
                {resultsDisclaimer && <div className="mt-4">{resultsDisclaimer}</div>}
              </>
            )

          case 'statement':
            return (
              <div className="mx-auto max-w-3xl text-center">
                {heading}
                {body}
                {proof}
                {resultsDisclaimer}
                {actions}
              </div>
            )

          case 'twoColumnText':
            return (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-16">
                <div className="md:col-span-5">{heading}</div>
                <div className="md:col-span-7">
                  {body}
                  {itemList}
                  {pullQuote}
                  {proof}
                  {resultsDisclaimer}
                  {actions}
                </div>
              </div>
            )

          case 'split': {
            const text = (
              <div>
                {heading}
                {body}
                {itemList}
                {pullQuote}
                {proof}
                {resultsDisclaimer}
                {actions}
              </div>
            )
            if (!hasMedia(data.media)) return <div className="mx-auto max-w-3xl">{text}</div>
            return (
              <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
                <div className={data.mediaSide === 'left' ? 'md:order-first' : 'md:order-last'}>
                  <ContentMedia data={data} ground={ground} />
                </div>
                {text}
              </div>
            )
          }
        }
      }}
    </SectionShell>
  )
}

function ContentMedia({data, ground}: {data: ContentSectionData; ground: TreatmentGround}) {
  const media = data.media
  if (media?.kind === 'video' && media.video?.youTubeUrl) {
    return <VideoEmbed video={media.video} />
  }
  if (!media || !hasImage(media.image)) return null
  const cutout = media.kind === 'cutout'
  // No site default exists until Phase 16, so `inherit` resolves to plain.
  const treatment = treatmentClasses(resolveTreatment(data.imageTreatment, undefined, cutout ? 'cutout' : 'contentMedia', ground))
  return (
    <div className={treatment.wrapper}>
      <SanityImage
        image={media.image}
        mode="natural"
        alt={media.image.alt ?? ''}
        sizes="(min-width: 768px) 50vw, 100vw"
        className={`${treatment.image} ${cutout ? 'object-contain' : 'object-cover'}`}
      />
    </div>
  )
}
