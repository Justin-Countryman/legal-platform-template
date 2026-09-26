import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {FormEmbed} from '@/components/layout/footers/FormEmbed'
import {SectionShell} from './SectionShell'
import {type SectionSurface} from '@/lib/sectionSurface'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {headingFit, type HeadingFit} from '@/lib/headingFit'
import type {HeadingFace} from '@/lib/headingFace'

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
  fit,
}: {
  tagline?: string | null
  heading: string
  description?: string | null
  centered?: boolean
  fit?: HeadingFit | null
}) {
  return (
    <div className={centered ? 'text-center' : undefined}>
      <SectionHeader
        tagline={tagline}
        heading={heading}
        fit={fit}
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

function CenteredCta({data, surface, seam, face}: {data: GlobalCtaData; surface: SectionSurface; seam: SeamProps; face?: HeadingFace | null}) {
  const {tagline, heading, description, buttons, formEmbed} = data
  if (!heading) return null

  const items = toCtaItems(buttons)

  return (
    <SectionShell appearance={{surface}} contained={false} className="text-foreground" seam={seam}>
      <div className="mx-auto w-full max-w-lg text-center">
        <CtaText tagline={tagline} heading={heading} description={description} centered fit={headingFit(heading, face ?? seam.site?.headingFace)} />

        {items.length > 0 && (
          <ButtonGroup items={items} align="center" className="mt-6 md:mt-8" />
        )}

        {formEmbed && (
          <div className="mt-8">
            <FormEmbed html={formEmbed} />
          </div>
        )}
      </div>
    </SectionShell>
  )
}

// ─── Split layout ─────────────────────────────────────────────────────────────

function SplitCta({data, surface, seam, face}: {data: GlobalCtaData; surface: SectionSurface; seam: SeamProps; face?: HeadingFace | null}) {
  const {tagline, heading, description, formEmbed} = data
  if (!heading) return null

  return (
    <SectionShell appearance={{surface}} className="text-foreground" innerClassName="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-x-20 lg:items-start" seam={seam}>

        {/* Left: text */}
        <div>
          <CtaText tagline={tagline} heading={heading} description={description} fit={headingFit(heading, face ?? seam.site?.headingFace)} />
        </div>

        {/* Right: form */}
        {formEmbed && (
          <div>
            <FormEmbed html={formEmbed} />
          </div>
        )}

    </SectionShell>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

// ─── The frame (Phase 13) ─────────────────────────────────────────────────────
//
// Both layouts shipped on `bg-muted`, which is the `accent` surface, so that is
// the default. It is a PROP with a code default, not a schema field: `globalCta`
// has no appearance fieldset and adding one would fold a `schema-default` into
// every Site-Build write (item 308, [R-450]). This is what design §7 amendment
// 15 means by "HomepageCta takes a surface prop".
//
// The band also carries `text-foreground` in its own class list, which the shell
// cannot express as a surface, so it rides through `className`.
export const GLOBAL_CTA_DEFAULT_SURFACE: SectionSurface = 'muted'

/** A CTA with no heading was never authored; both layouts already bailed on it. */
export function isEmpty(data: GlobalCtaData): boolean {
  return !data.heading
}

export function GlobalCta({
  data,
  napTokens,
  surface = GLOBAL_CTA_DEFAULT_SURFACE,
  seam = NO_SEAM,
  headingFace,
}: {
  data: GlobalCtaData
  napTokens?: NapTokens | null
  surface?: SectionSurface
  seam?: SeamProps
  /** The face its heading is fitted in (Phase 17C session 3): the page passes it, since an interior
   *  page renders the close with no seam. */
  headingFace?: HeadingFace | null
}) {
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
  if (resolved.layout === 'split') return <SplitCta data={resolved} surface={surface} seam={seam} face={headingFace} />
  return <CenteredCta data={resolved} surface={surface} seam={seam} face={headingFace} />
}
