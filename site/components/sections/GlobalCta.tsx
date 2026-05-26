import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {FormEmbed} from '@/components/layout/footers/FormEmbed'

// ─── Types ────────────────────────────────────────────────────────────────────

type CtaButton = {
  title?: string | null
  url?: string | null
  variant?: 'primary' | 'secondary' | 'link' | null
}

export type GlobalCtaData = {
  layout?: 'centered' | 'split' | null
  tagline?: string | null
  heading?: string | null
  description?: string | null
  buttons?: CtaButton[] | null
  formEmbed?: string | null
}

// ─── Shared text block ────────────────────────────────────────────────────────

function CtaText({
  tagline,
  heading,
  description,
  centered = false,
}: {
  tagline?: string | null
  heading: string
  description?: string | null
  centered?: boolean
}) {
  return (
    <div className={centered ? 'text-center' : undefined}>
      <SectionHeader
        tagline={tagline}
        heading={heading}
        scale="xl"
        alignment={centered ? 'center' : 'left'}
      />
      {/* Description hand-rolled (not via SectionHeader) — GlobalCta is the platform's marquee
          bottom-of-page CTA; its description uses a desktop body-copy bump (`md:text-md` = 18px)
          that SectionHeader's canonical text-foreground-muted does not emit. */}
      {description && (
        <p className="text-foreground-muted md:text-md">{description}</p>
      )}
    </div>
  )
}

// ─── Centered layout ──────────────────────────────────────────────────────────

function CenteredCta({data}: {data: GlobalCtaData}) {
  const {tagline, heading, description, buttons, formEmbed} = data
  if (!heading) return null

  const items = toCtaItems(buttons)

  return (
    <section className="bg-muted text-foreground px-[5%] py-16 md:py-24 lg:py-28">
      <div className="mx-auto w-full max-w-lg text-center">
        <CtaText tagline={tagline} heading={heading} description={description} centered />

        {items.length > 0 && (
          <ButtonGroup items={items} align="center" className="mt-6 md:mt-8" />
        )}

        {formEmbed && (
          <div className="mt-8">
            <FormEmbed html={formEmbed} />
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Split layout ─────────────────────────────────────────────────────────────

function SplitCta({data}: {data: GlobalCtaData}) {
  const {tagline, heading, description, formEmbed} = data
  if (!heading) return null

  return (
    <section className="bg-muted text-foreground px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-x-12 lg:gap-x-20 md:items-start">

        {/* Left: text */}
        <div>
          <CtaText tagline={tagline} heading={heading} description={description} />
        </div>

        {/* Right: form */}
        {formEmbed && (
          <div>
            <FormEmbed html={formEmbed} />
          </div>
        )}

      </div>
    </section>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function GlobalCta({data, napTokens}: {data: GlobalCtaData; napTokens?: NapTokens | null}) {
  const resolved: GlobalCtaData = napTokens
    ? {
        ...data,
        tagline: resolveTokenString(data.tagline, napTokens) || data.tagline,
        heading: resolveTokenString(data.heading, napTokens) || data.heading,
        description: resolveTokenString(data.description, napTokens) || data.description,
        buttons: data.buttons?.map((btn) => ({
          ...btn,
          title: resolveTokenString(btn.title, napTokens) || btn.title,
        })),
      }
    : data
  if (resolved.layout === 'split') return <SplitCta data={resolved} />
  return <CenteredCta data={resolved} />
}
