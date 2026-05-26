import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {Button} from '@/components/ui/Button'
import {FaqAccordion} from '@/components/ui/FaqAccordion'
import {SectionHeader} from '@/components/ui/SectionHeader'

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
  heading?: string | null
  description?: string | null
  questions?: FaqItem[] | null
  footerHeading?: string | null
  footerDescription?: string | null
  footerButton?: CtaButton | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FaqSectionBlock({
  data,
  napTokens,
}: {
  data: FaqSectionBlockData
  napTokens?: NapTokens | null
}) {
  const questions = data.questions ?? []
  if (questions.length === 0) return null

  const heading = resolveTokenString(data.heading, napTokens) ?? 'FAQs'
  const description = resolveTokenString(data.description, napTokens)
  const footerHeading = resolveTokenString(data.footerHeading, napTokens)
  const footerDescription = resolveTokenString(data.footerDescription, napTokens)
  const footerButtonTitle = resolveTokenString(data.footerButton?.title, napTokens)

  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container mx-auto max-w-3xl">

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

      </div>
    </section>
  )
}
