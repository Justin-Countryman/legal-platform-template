import Image from 'next/image'
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
  image?: {src: string; alt?: string | null; width?: number | null; height?: number | null} | null
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

        {image?.src && (
          <div className="relative overflow-hidden">
            <Image
              src={image.src}
              alt={image.alt ?? ''}
              width={image.width ?? 800}
              height={image.height ?? 600}
              className="w-full max-h-96 object-cover"
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
      {image?.src && (
        <>
          <Image
            src={image.src}
            alt={image.alt ?? ''}
            fill
            className="object-cover"
            aria-hidden="true"
          />
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

        <div>
          {tagline && (
            <Tagline as="p">
              {tagline}
            </Tagline>
          )}
          <h2 className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">{heading}</h2>
        </div>

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
