// ─── Homepage coda ────────────────────────────────────────────────────────────
//
// The closing line. One centered statement on a quiet band, after the final CTA
// and before the footer, closing the page's emotional arc.
//
// A BOOKEND, not a canvas unit. Fixed position, fixed shape, one line, neither
// composed by CC nor editable per block, so it is platform-owned and sits with
// the other primitives. Render order: hero, canvas, CTA, coda, footer.
//
// ─── Two deliberate choices ───────────────────────────────────────────────────
//
// NOT A HEADING, and not a landmark. A coda is a statement, not a section
// title, so it renders as a <p>. The band is a plain <div> rather than a
// <section>, because a <section> with no accessible name adds an unlabelled
// landmark to the page for a single sentence.
//
// NOT MARKETING SCALE. `marketing-h*` exists for headings, and this is body
// text set with emphasis. Using a heading utility here would make the coda
// compete with the CTA heading immediately above it, which inverts the arc: the
// last thing before the footer should settle, not shout.
//
// TOKENS ONLY. Background, text and spacing from role tokens and the scale.

export function HomepageCoda({text}: {text?: string | null}) {
  // An unauthored coda renders nothing. There is no half-state worth showing:
  // an empty quiet band is just an unexplained gap above the footer.
  if (!text || text.trim() === '') return null

  return (
    <div className="bg-background px-[5%] py-12 md:py-16">
      <p className="mx-auto max-w-3xl text-center font-heading text-lg italic text-foreground-muted md:text-xl">
        {text}
      </p>
    </div>
  )
}
