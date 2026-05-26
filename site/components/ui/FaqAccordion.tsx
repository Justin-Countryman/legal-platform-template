'use client'

import {useState, useId} from 'react'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import type {NapTokens} from '@/lib/tokens'


// ─── Types ────────────────────────────────────────────────────────────────────

// Post-WS-FAQ-Migration (2026-05-14): faqItem is a Sanity document type with
// question + answer + category + slug + tags. The accordion only reads
// question + answer — the other fields are surfaced by upstream GROQ for
// future filtering work (e.g., category-aware FAQ selection). Extra fields
// here are forward-compat and intentionally optional.
type FaqItem = {
  question: string
  answer: unknown[]
  category?: string | null
  slug?: string | null
  tags?: string[] | null
}

type Props = {
  items: FaqItem[]
  napTokens?: NapTokens | null
  /**
   * Heading level for each accordion trigger.
   * Should be one level below the section heading above this component.
   * Defaults to 'h3'. Provide 'h4' if the FAQ lives inside an h3 section.
   */
  headingLevel?: 'h2' | 'h3' | 'h4'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FaqAccordion({items, napTokens, headingLevel = 'h3'}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const baseId = useId()
  const Heading = headingLevel

  if (!items || items.length === 0) return null

  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        const triggerId = `${baseId}-trigger-${i}`
        const panelId = `${baseId}-panel-${i}`

        return (
          <div key={i}>

            {/*
              Wrap the button in a heading so screen reader users can navigate
              directly to individual FAQ items via heading navigation (H key in
              JAWS/NVDA). This matches the ARIA APG accordion pattern.
            */}
            <Heading>
              {/*
                Focus ring uses `ring-inset` (no `ring-offset-2`) by intent — the
                accordion buttons sit between `divide-y divide-border` row
                separators, and an outset ring would visually fight the divider
                lines on the rows above/below the focused item. Inset ring stays
                within the button's own bounds. This is a deliberate exception
                to the platform-wide outset+offset focus-ring pattern, kept here
                because of the row-based UI; do not generalize.
              */}
              <button
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="group flex w-full items-center justify-between gap-4 py-5 text-left font-heading text-base font-semibold text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                <span className="transition-colors duration-ui-fast">{item.question}</span>

                {/* Decorative chevron — hidden from AT */}
                <span
                  aria-hidden="true"
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    'border border-border transition-colors duration-ui-base ease-smooth',
                    isOpen
                      ? 'bg-action border-action text-action-fg rotate-180'
                      : 'bg-transparent text-foreground group-hover:border-action',
                  ].join(' ')}
                >
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
            </Heading>

            {/*
              Panel — no role="region" (avoids landmark noise for simple FAQ content).
              aria-labelledby keeps the association for AT.
              aria-hidden hides content from the AT tree when closed.

              CSS grid height trick animates from 0fr → 1fr without JS measurement.
              The `inert` attribute on the inner wrapper prevents keyboard focus on
              any links or interactive elements inside a closed panel — this is the
              WCAG 2.1.1-compliant fix for focus leaking into visually hidden content.
            */}
            <div
              id={panelId}
              aria-labelledby={triggerId}
              aria-hidden={!isOpen}
              className={[
                'grid transition-[grid-template-rows] duration-structural-base ease-smooth',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              ].join(' ')}
            >
              <div
                className="overflow-hidden"
                inert={!isOpen}
              >
                <div
                  className={[
                    'pb-5 transition-opacity duration-structural-base ease-smooth',
                    isOpen ? 'opacity-100' : 'opacity-0',
                  ].join(' ')}
                >
                  {item.answer && (
                    <PortableTextRenderer value={item.answer} napTokens={napTokens} />
                  )}
                </div>
              </div>
            </div>

          </div>
        )
      })}
    </div>
  )
}
