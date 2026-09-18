import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {Button} from '@/components/ui/Button'
import {FaqAccordion} from '@/components/ui/FaqAccordion'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {SectionShell, type SectionAppearance} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'

// ─── Types ────────────────────────────────────────────────────────────────────

// Post-WS-FAQ-Migration (2026-05-14): faqItem is a Sanity document type;
// faqSection.questions[] holds references. GROQ dereferences and projects
// question + answer + category + slug + tags. This component reads only
// question + answer; extras are forward-compat.
type FaqItem = {
  question: string
  answer: unknown[]
  category?: string | null
  slug?: string | null
  tags?: string[] | null
}

type CtaButton = {
  title?: string | null
  url?: string | null
  variant?: string | null
}

export type FaqSectionBlockData = {
  _type: 'faqSection'
  appearance?: SectionAppearance | null
  heading?: string | null
  description?: string | null
  questions?: FaqItem[] | null
  footerHeading?: string | null
  footerDescription?: string | null
  footerButton?: CtaButton | null
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── The frame (Phase 13) ─────────────────────────────────────────────────────
// An unset band is `light`, never `pattern`, which now paints the site's section
// texture (Phase 16A). Its inner `mx-auto max-w-3xl` rides on the shell's container
// through `innerClassName`, which is one of the two props the shell gained for
// exactly this (item 308 keeps the default in code, never as an `initialValue`).

/** The appearance this section will actually render with, for the seam walk. */
export function resolveAppearance(data: FaqSectionBlockData): SectionAppearance {
  return {...data.appearance, surface: data.appearance?.surface ?? 'light'}
}

/** An FAQ band IS its questions. */
export function isEmpty(data: FaqSectionBlockData): boolean {
  return (data.questions ?? []).length === 0
}

export function FaqSectionBlock({
  data,
  napTokens,
  seam = NO_SEAM,
}: {
  data: FaqSectionBlockData
  napTokens?: NapTokens | null
  seam?: SeamProps
}) {
  const questions = data.questions ?? []
  if (isEmpty(data)) return null

  const heading = resolveTokenString(data.heading, napTokens) ?? 'FAQs'
  const description = resolveTokenString(data.description, napTokens)
  const footerHeading = resolveTokenString(data.footerHeading, napTokens)
  const footerDescription = resolveTokenString(data.footerDescription, napTokens)
  const footerButtonTitle = resolveTokenString(data.footerButton?.title, napTokens)

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      innerClassName="mx-auto max-w-3xl"
      seam={seam}
    >
      <>

        <SectionHeader
          heading={heading}
          description={description}
          alignment="left"
          className="mb-10"
        />

        <FaqAccordion items={questions} napTokens={napTokens} headingLevel="h3" />

        {(footerHeading || footerDescription || footerButtonTitle) && (
          <div className="mt-12 text-center">
            {footerHeading && (
              <p className="mb-2 font-semibold text-foreground">{footerHeading}</p>
            )}
            {footerDescription && (
              <p className="mb-4 text-foreground-muted">{footerDescription}</p>
            )}
            {footerButtonTitle && data.footerButton?.url && (
              <Button href={data.footerButton.url}>
                {footerButtonTitle}
              </Button>
            )}
          </div>
        )}

      </>
    </SectionShell>
  )
}
