import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {Tagline} from '@/components/ui/Tagline'

// ─── Types ────────────────────────────────────────────────────────────────────

type CtaButton = {
  title?: string | null
  url?: string | null
  variant?: 'primary' | 'secondary' | 'link' | null
}

export type CtaSectionBlockData = {
  _type: 'ctaSection'
  tagline?: string | null
  heading?: string | null
  description?: string | null
  layout?: 'centered' | 'split' | 'background' | 'textOnly' | null
  buttons?: CtaButton[] | null
  image?: SanityImageData | null
}

// ─── Centered layout ──────────────────────────────────────────────────────────

function CenteredCta({data}: {data: CtaSectionBlockData}) {
  const {tagline, heading, description, buttons} = data
  if (!heading) return null

  return (
    <section className="bg-muted px-[5%] py-10 md:py-12">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          {tagline && (
            <Tagline as="p">
              {tagline}
            </Tagline>
          )}
          <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">{heading}</h2>
          {description && (
            <p className="text-foreground-muted">{description}</p>
          )}
          {buttons && <ButtonGroup items={toCtaItems(buttons)} align="center" className="mt-6 md:mt-8" />}
        </div>
      </div>
    </section>
  )
}

// ─── Split layout ─────────────────────────────────────────────────────────────

function SplitCta({data}: {data: CtaSectionBlockData}) {
  const {tagline, heading, description, buttons, image} = data
  if (!heading) return null

  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container grid grid-cols-1 items-center gap-12 md:grid-cols-2 lg:gap-20">

        <div>
          <SectionHeader
            tagline={tagline}
            heading={heading}
            description={description}
            scale="lg"
            alignment="left"
          />
          {buttons && <ButtonGroup items={toCtaItems(buttons)} className="mt-6 md:mt-8" />}
        </div>

        {hasImage(image) && (
          <div className="relative h-96 w-full overflow-hidden">
            <SanityImage
              image={image}
              mode="fill"
              alt={image.alt ?? ''}
              sizes="(min-width:1024px) 50vw, 100vw"
            />
          </div>
        )}

      </div>
    </section>
  )
}

// ─── Background layout ────────────────────────────────────────────────────────

function BackgroundCta({data}: {data: CtaSectionBlockData}) {
  const {tagline, heading, description, buttons, image} = data
  if (!heading) return null

  return (
    <section className="relative px-[5%] py-16 md:py-24 lg:py-28" data-ring-context="dark">
      {hasImage(image) && (
        <>
          <SanityImage image={image} mode="fill" alt={image.alt ?? ''} sizes="100vw" />
          <div className="absolute inset-0 bg-brand-dark/80" aria-hidden="true" />
        </>
      )}
      <div className="container relative text-center text-foreground">
        <SectionHeader
          tagline={tagline}
          heading={heading}
          scale="lg"
        />
        {/* Description hand-rolled (not via SectionHeader) — dark image scrim needs full-strength
            text-foreground for contrast; SectionHeader's default text-foreground-muted reads weakly
            against busy backgrounds. */}
        {description && <p className="mx-auto max-w-2xl text-foreground">{description}</p>}
        {buttons && <ButtonGroup items={toCtaItems(buttons)} align="center" context="dark" className="mt-6 md:mt-8" />}
      </div>
    </section>
  )
}

// ─── Text only layout ─────────────────────────────────────────────────────────

function TextOnlyCta({data}: {data: CtaSectionBlockData}) {
  const {tagline, heading, description, buttons} = data
  if (!heading) return null

  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28 bg-muted">
      <div className="container grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center md:gap-12">

        {/* Column-only header — the description and buttons live in the RIGHT column,
            so the header's canonical trailing gap has nothing below it and would only
            add height to the left column, shifting the grid's md:items-center row. */}
        <SectionHeader
          tagline={tagline}
          heading={heading}
          scale="lg"
          alignment="left"
          noTrailingGap
        />

        <div>
          {description && <p className="mb-6 text-foreground-muted">{description}</p>}
          {buttons && <ButtonGroup items={toCtaItems(buttons)} className="mt-6 md:mt-8" />}
        </div>

      </div>
    </section>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function CtaSectionBlock({
  data,
  napTokens,
}: {
  data: CtaSectionBlockData
  napTokens?: NapTokens | null
}) {
  const resolved: CtaSectionBlockData = {
    ...data,
    tagline: resolveTokenString(data.tagline, napTokens),
    heading: resolveTokenString(data.heading, napTokens),
    description: resolveTokenString(data.description, napTokens),
    buttons: data.buttons?.map((btn) => ({
      ...btn,
      title: resolveTokenString(btn.title, napTokens),
    })),
  }

  if (resolved.layout === 'centered') return <CenteredCta data={resolved} />
  if (resolved.layout === 'background') return <BackgroundCta data={resolved} />
  if (resolved.layout === 'split') return <SplitCta data={resolved} />
  return <TextOnlyCta data={resolved} />
}
