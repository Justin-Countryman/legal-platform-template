import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {SectionHeader} from '@/components/ui/SectionHeader'
import {TestimonialCard, type TestimonialData} from '@/components/ui/TestimonialCard'
import {SectionShell} from './SectionShell'
import {type SeamProps, NO_SEAM} from './sectionFrame'
import {type TestimonialsGridProps} from './sectionProps'
import {headingFit} from '@/lib/headingFit'
import {cardGridClasses} from './cardGrid'

// ─── Types ────────────────────────────────────────────────────────────────────

// One props type for both renderings; no `_type`, the dispatchers own it. See
// sectionProps.ts.
export type TestimonialsGridSectionData = TestimonialsGridProps

// ─── Component ────────────────────────────────────────────────────────────────

// ─── The frame (Phase 13) ───────────────────────────────────────────────────
// Exported for the seam walk in `sectionFrame.ts`: the dispatchers need to
// know, before rendering anything, what ground this band will sit on and
// whether it will render at all.

/** The appearance this section will actually render with. */
export function resolveAppearance(data: TestimonialsGridSectionData) {
  return data.appearance
}

/** True when this section renders nothing, so the walk skips it and it never
 *  becomes the "previous band" for the one after it (item 312). */
export function isEmpty(data: TestimonialsGridSectionData): boolean {
  return (data.testimonials ?? []).filter((t) => t !== null && Boolean(t?.quote)).length === 0
}

export function TestimonialsGridSection({
  data,
  napTokens,
  seam = NO_SEAM,
  scale,
}: {
  data: TestimonialsGridSectionData
  napTokens?: NapTokens | null
  seam?: SeamProps
  /** The homepage passes `marketing`: the heading takes the marketing scale, as the content section's does, so every
   *  section on one page draws one heading size (monorepo `[R-641]`). Absent: the interior tier. */
  scale?: 'marketing'
}) {
  // Belt-and-suspenders null filter — paired with GROQ post-projection
  // [defined(_id)] (see queries.ts SECTIONS_FRAGMENT testimonials);
  // guards against future query regressions that bypass the canonical
  // safe-defaults pattern.
  const testimonials = (data.testimonials ?? []).filter(
    (t: TestimonialData | null): t is TestimonialData => t !== null
  )
  if (testimonials.length === 0) return null

  const tagline = resolveTokenString(data.tagline, napTokens)
  const heading = resolveTokenString(data.heading, napTokens)
  const emphasis = resolveTokenString(data.headingEmphasis, napTokens)
  const description = resolveTokenString(data.description, napTokens)
  // The columns follow the count (cardGrid.ts): a quote needs its measure, so four go two by two.
  const grid = cardGridClasses(testimonials.length, 3)

  return (
    <SectionShell
      appearance={resolveAppearance(data)}
      seam={seam}
    >

      {heading && (
        <SectionHeader emphasis={emphasis}
          scale={scale}
          tagline={tagline}
          heading={heading}
          fit={headingFit(heading, seam.site?.headingFace)}
          description={description}
          className="mx-auto mb-12 max-w-2xl"
        />
      )}

      <ul
        role="list"
        className={grid.list}
        aria-label="Client testimonials"
      >
        {testimonials.map((t, i) => (
          <li key={t._id} className={grid.items[i] || undefined}>
            <TestimonialCard t={t} />
          </li>
        ))}
      </ul>

    </SectionShell>
  )
}
