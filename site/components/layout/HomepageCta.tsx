import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'
import {FormEmbed} from '@/components/layout/footers/FormEmbed'
import {SectionShell} from '@/components/sections/SectionShell'
import {type SectionSurface} from '@/lib/sectionSurface'
import {type SeamProps, NO_SEAM} from '@/components/sections/sectionFrame'
import {Tagline} from '@/components/ui/Tagline'

// ─── Homepage final CTA ───────────────────────────────────────────────────────
//
// Beat 9. A BOOKEND, not a block: fixed position, fixed source, not composed
// into the canvas and not editable per-block. Platform-owned, alongside the
// hero and footer primitives it sits between.
//
// ─── Why this exists rather than reusing <GlobalCta> ──────────────────────────
//
// The DATA is identical: the `globalCta` singleton, with the page's
// `ctaFormOverride` layered on top, exactly as every interior page does it. No
// new schema, and none was needed — BI-Library previously specified a CTA
// *block*, which would have been a second way to author `ctaFormOverride`'s
// content. Corrected 2026-07-20.
//
// What could not be reused is the RENDERING. `components/sections/GlobalCta`
// renders its heading through `SectionHeader` at `scale="xl"`, which resolves to
// `text-4xl md:text-5xl` — the interior three-tier table. On the homepage that
// makes `designSettings.marketingScale` do nothing to the page's closing
// headline: an operator changes the marketing scale and the last thing the
// visitor reads does not move. That is BI-Library Layer 3 rule 2, and it applies
// to a bookend for the same reason it applies to a block.
//
// So: same data, same override semantics, same `hideCtaForm` gate, marketing
// scale. Interior pages keep <GlobalCta> unchanged.
//
// TOKENS ONLY. Surface, text and spacing from role tokens and the scale.

export type HomepageCtaData = {
  layout?: string | null
  tagline?: string | null
  heading?: string | null
  description?: string | null
  buttons?: {title?: string | null; url?: string | null; variant?: string | null}[] | null
  formEmbed?: string | null
}

// ─── The frame (Phase 13) ─────────────────────────────────────────────────────
// `bg-muted` is the `accent` surface, and it stays the default. A PROP with a
// code default, not a schema field: the homepage CTA is the `globalCta`
// singleton, which has no appearance fieldset, and adding one would fold a
// `schema-default` into every Site-Build write (item 308, [R-450]). Design §7
// amendment 15's "HomepageCta takes a surface prop", exactly.
export const HOMEPAGE_CTA_DEFAULT_SURFACE: SectionSurface = 'muted'

export function HomepageCta({
  data,
  override,
  surface = HOMEPAGE_CTA_DEFAULT_SURFACE,
  seam = NO_SEAM,
}: {
  data?: HomepageCtaData | null
  surface?: SectionSurface
  seam?: SeamProps
  /** The page's ctaFormOverride. Shallow-merged over the singleton, matching
   *  the interior-page precedent: an override field that is present wins, and
   *  an absent one leaves the global value in place. */
  override?: Partial<HomepageCtaData> | null
}) {
  if (!data) return null
  const merged: HomepageCtaData = override ? {...data, ...override} : data

  // No heading means the CTA was never authored. Render nothing rather than an
  // empty band, consistent with <GlobalCta>, which bails on the same condition.
  if (!merged.heading) return null

  const items = toCtaItems(merged.buttons)

  return (
    <SectionShell appearance={{surface}} contained={false} className="text-foreground" seamTop={seam.seamTop} previousGround={seam.previousGround} previousEdge={seam.previousEdge}>
      <div className="mx-auto w-full max-w-3xl text-center">
        {merged.tagline ? <Tagline as="p">{merged.tagline}</Tagline> : null}

        {/* marketing-h2, not SectionHeader. See the header. */}
        <h2 className="marketing-h2 font-heading font-bold text-foreground">{merged.heading}</h2>

        {merged.description ? (
          <p className="mt-4 text-foreground-muted md:text-md">{merged.description}</p>
        ) : null}

        {items.length > 0 ? <ButtonGroup items={items} align="center" className="mt-6 md:mt-8" /> : null}

        {merged.formEmbed ? (
          <div className="mt-8">
            <FormEmbed html={merged.formEmbed} />
          </div>
        ) : null}
      </div>
    </SectionShell>
  )
}
