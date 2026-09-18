import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {Tagline} from '@/components/ui/Tagline'
import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import {SectionShell, type SectionAppearance} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {type SectionSurface} from '@/lib/sectionSurface'

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
  appearance?: SectionAppearance | null
}

type Layout = 'centered' | 'split' | 'background' | 'textOnly'

function layoutOf(data: CtaSectionBlockData): Layout {
  const l = data.layout
  return l === 'centered' || l === 'split' || l === 'background' ? l : 'textOnly'
}

// ─── The frame (Phase 13) ─────────────────────────────────────────────────────
//
// THE DEFAULT SURFACE IS PER LAYOUT, NOT PER SECTION. This is the one component
// where the record's "the default per section equals its hardcoded band today"
// could not be met, because its four layouts shipped on three different grounds:
// `centered` and `textOnly` on `bg-muted`, `split` on nothing, and `background`
// on nothing at all despite setting a dark ring context and `text-foreground` —
// a live contrast bug that put white text on the page background, which Justin
// ruled on 2026-09-16 to fix by this move.
//
// The defaults live here in CODE rather than as a Studio `initialValue`, because
// `compose_canvas` folds a member `initialValue` into every band the build
// writes and the canvas keeps no per-field origin, so a seed could never be told
// from an operator's choice (item 308, [R-450]). A code default is also what
// Phase 16's `surfaceRhythm` replaces.
const DEFAULT_SURFACE: Record<Layout, SectionSurface> = {
  // `bg-muted` is the `accent` surface.
  centered: 'muted',
  textOnly: 'muted',
  // `light`, not `pattern`: Justin answered the question deferred here on
  // 2026-09-16 with `[R-472]` (no site-wide background; a texture only where a
  // section is deliberately set to Pattern). Both are the light ground.
  split: 'light',
  // THE FIX: white text needs a dark ground. With an image the shell paints the
  // photo and the scrim over this base, exactly as the old markup did.
  background: 'image',
}

// The classes each layout had on its own container, passed to the shell as
// `innerClassName` so the shell's container IS the grid. Without this the grid
// would nest one level deeper and every page rendering a CTA would change its
// RSC payload for no reason.
const INNER_CLASS: Record<Layout, string> = {
  centered:   'mx-auto max-w-2xl text-center',
  split:      'grid grid-cols-1 items-center gap-12 md:grid-cols-2 lg:gap-20',
  background: 'text-center text-foreground',
  textOnly:   'grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center md:gap-12',
}

/** The appearance this section will actually render with, for the seam walk. */
export function resolveAppearance(data: CtaSectionBlockData): SectionAppearance {
  const layout = layoutOf(data)
  const stored = data.appearance
  return {
    ...stored,
    surface: stored?.surface ?? DEFAULT_SURFACE[layout],
    // `background` with no image falls back to a flat dark band rather than an
    // image band, so the shell does not wait for an image that is not coming.
    ...(layout === 'background' && !hasImage(data.image) && !stored?.surface ? {surface: 'dark' as const} : {}),
    backgroundImage: layout === 'background' ? data.image ?? null : stored?.backgroundImage ?? null,
  }
}

/** A CTA with no heading was never authored. Matches GlobalCta, which bails on
 *  the same condition. */
export function isEmpty(data: CtaSectionBlockData): boolean {
  return !resolveTokenString(data.heading, null) && !data.heading
}

// ─── Layouts ──────────────────────────────────────────────────────────────────

function CenteredCta({data}: {data: CtaSectionBlockData}) {
  const {tagline, heading, description, buttons} = data
  return (
    <>
      {tagline && <Tagline as="p">{tagline}</Tagline>}
      <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">{heading}</h2>
      {description && <p className="text-foreground-muted">{description}</p>}
      {buttons && <ButtonGroup items={toCtaItems(buttons)} align="center" className="mt-6 md:mt-8" />}
    </>
  )
}

function SplitCta({data}: {data: CtaSectionBlockData}) {
  const {tagline, heading, description, buttons, image} = data
  return (
    <>
      <div>
        <SectionHeader tagline={tagline} heading={heading ?? ''} description={description} scale="lg" alignment="left" />
        {buttons && <ButtonGroup items={toCtaItems(buttons)} className="mt-6 md:mt-8" />}
      </div>
      {hasImage(image) && (
        <div className="relative h-96 w-full overflow-hidden">
          <SanityImage image={image} mode="fill" alt={image.alt ?? ''} sizes="(min-width:1024px) 50vw, 100vw" />
        </div>
      )}
    </>
  )
}

function BackgroundCta({data}: {data: CtaSectionBlockData}) {
  const {tagline, heading, description, buttons} = data
  return (
    <>
      <SectionHeader tagline={tagline} heading={heading ?? ''} scale="lg" />
      {/* Description hand-rolled (not via SectionHeader) — dark image scrim needs full-strength
          text-foreground for contrast; SectionHeader's default text-foreground-muted reads weakly
          against busy backgrounds. */}
      {description && <p className="mx-auto max-w-2xl text-foreground">{description}</p>}
      {buttons && <ButtonGroup items={toCtaItems(buttons)} align="center" context="dark" className="mt-6 md:mt-8" />}
    </>
  )
}

function TextOnlyCta({data}: {data: CtaSectionBlockData}) {
  const {tagline, heading, description, buttons} = data
  return (
    <>
      {/* Column-only header — the description and buttons live in the RIGHT column,
          so the header's canonical trailing gap has nothing below it and would only
          add height to the left column, shifting the grid's md:items-center row. */}
      <SectionHeader tagline={tagline} heading={heading ?? ''} scale="lg" alignment="left" noTrailingGap />
      <div>
        {description && <p className="mb-6 text-foreground-muted">{description}</p>}
        {buttons && <ButtonGroup items={toCtaItems(buttons)} className="mt-6 md:mt-8" />}
      </div>
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function CtaSectionBlock({
  data,
  napTokens,
  seam = NO_SEAM,
}: {
  data: CtaSectionBlockData
  napTokens?: NapTokens | null
  seam?: SeamProps
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

  if (isEmpty(resolved)) return null

  const layout = layoutOf(resolved)
  const body =
    layout === 'centered' ? <CenteredCta data={resolved} />
    : layout === 'split' ? <SplitCta data={resolved} />
    : layout === 'background' ? <BackgroundCta data={resolved} />
    : <TextOnlyCta data={resolved} />

  return (
    <SectionShell
      appearance={resolveAppearance(resolved)}
      // `centered` shipped at `py-10 md:py-12`, which matches no storable
      // spacing, so it takes the operator-invisible tight preset and its padding
      // does not move. Only when the operator has chosen no spacing of their own.
      tight={layout === 'centered' && !resolved.appearance?.spacing}
      innerClassName={INNER_CLASS[layout]}
      seamTop={seam.seamTop}
      previousGround={seam.previousGround}
      previousEdge={seam.previousEdge}
    >
      {body}
    </SectionShell>
  )
}
