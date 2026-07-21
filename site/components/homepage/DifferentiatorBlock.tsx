// ─── Differentiator block ─────────────────────────────────────────────────────
//
// CLIENT-OWNED. `components/homepage/` holds block components only; the
// dispatcher and the first-block motion rule are platform-owned at
// `components/layout/HomepageCanvas.tsx`. Keep the file path and the export
// name — the dispatcher imports `DifferentiatorBlock` from this exact path on
// every client. The markup inside is yours to replace wholesale.
//
// TOKENS ONLY. Surface and text from role tokens, radius from --radius-ui,
// elevation from --shadow-card-rest, type from the marketing scale. No hex, no
// font family, no arbitrary radius or shadow. `platform/no-raw-color-value` and
// `platform/no-hardcoded-font-family` enforce this now.
//
// NO SCROLLREVEAL HERE. Motion is applied by the canvas, which is the only
// thing that knows whether this block is first on the page.
//
// ─── The grid is derived from the count, and that is the point ────────────────
//
// BI-Library's field test says a field belongs on a block only if the operator's
// answer changes what the visitor reads. `differentiators[]` passes: adding a
// fourth adds a sentence someone reads. But the count ALSO changes the right
// grid, which looks at first like the treatment control the doctrine says to cut.
//
// It is not, and the distinction is which side owns the consequence. The
// operator chooses content; the rendering absorbs the layout consequence. Three
// across reads evenly at three; four across gets cramped, so four goes 2x2. The
// operator never picks a grid and never sees one to pick.
//
// The schema's 3-to-4 bound is a WARNING, per platform convention, so it cannot
// be assumed. Every branch below therefore degrades rather than breaking: one or
// two items collapse to a single row, five or more wrap.

export type Differentiator = {
  _key?: string
  title?: string | null
  body?: string | null
}

export type DifferentiatorBlockData = {
  _type: 'differentiatorBlock'
  _key: string
  heading?: string | null
  intro?: string | null
  differentiators?: Differentiator[] | null
}

/**
 * Columns for a given count. Exported so the test pins the mapping rather than
 * asserting on a class string it copied out of the component.
 */
export function gridColumnsForCount(count: number): string {
  // Four across is cramped for a title plus a sentence, so four reads as 2x2.
  if (count === 4) return 'sm:grid-cols-2'
  // Three is the canonical case. One and two collapse naturally; five or more
  // wraps into a third row rather than shrinking further.
  return 'sm:grid-cols-2 lg:grid-cols-3'
}

export function DifferentiatorBlock({data}: {data: DifferentiatorBlockData}) {
  // An entry with neither a title nor a body renders nothing rather than an
  // empty card. The operator sees the gap in Studio.
  const items = (data.differentiators ?? []).filter((d) => d.title || d.body)

  // Nothing to say and nothing to list: render nothing rather than a heading
  // over a void.
  if (items.length === 0 && !data.heading && !data.intro) return null

  return (
    <section className="px-[5%] py-16 md:py-24">
      {data.heading || data.intro ? (
        <div className="container mx-auto max-w-3xl text-center">
          {data.heading ? (
            // marketing-h2, not <SectionHeader>. SectionHeader maps to the
            // interior three-tier scale and never emits the marketing scale, so
            // routing through it would make designSettings.marketingScale do
            // nothing here. See BI-Library Layer 3.
            <h2 className="marketing-h2 font-heading font-bold text-foreground">{data.heading}</h2>
          ) : null}
          {data.intro ? (
            <p className="mt-4 text-foreground-muted">{data.intro}</p>
          ) : null}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="container mx-auto mt-12 max-w-6xl">
          <ul role="list" className={`grid grid-cols-1 gap-6 ${gridColumnsForCount(items.length)}`}>
            {items.map((d, i) => (
              <li
                key={d._key ?? i}
                className="rounded-ui bg-surface-muted p-6 shadow-card md:p-8"
              >
                {d.title ? (
                  <h3 className="font-heading text-xl font-bold text-foreground">{d.title}</h3>
                ) : null}
                {d.body ? (
                  <p className="mt-3 text-foreground-muted">{d.body}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
