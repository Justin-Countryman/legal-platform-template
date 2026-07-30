import {Breadcrumbs} from '@/components/ui/Breadcrumbs'

type Props = {
  items: {label: string; href: string}[]
  domain?: string
}

/**
 * The breadcrumb in its own strip, ready to sit below a hero.
 *
 * `BI-PRINCIPLES.md` → CRUMB-1: the breadcrumb sits in its own strip BELOW the
 * hero, every page type, every layout.
 *
 * WHY THIS EXISTS. The band is four lines of markup — the `bg-muted` strip and
 * its `container` — written by hand at eighteen call sites. A block you have to
 * remember to type is not a mechanism, and the cost of that shows up as a call
 * site that simply never got one. Importing the band makes a change to the strip
 * one edit, and gives a new call site something to import rather than something
 * to copy.
 *
 * **IT WAS BUILT FOR THE PROFILE LAYOUTS AND THEY NO LONGER USE IT** (CRUMB-7,
 * 2026-07-29: profile pages render no breadcrumb at all). It is kept, and this is
 * not sentiment — the duplication it removes is real and independent of that
 * ruling, and the eleven page types that owe `BreadcrumbList` markup have to
 * re-wire their call sites anyway. **New call sites use this; the eighteen
 * hand-written bands migrate as the passes that touch them run.** Two shapes
 * exist in the tree until then.
 */
export function BreadcrumbBand({items, domain}: Props) {
  return (
    <div className="bg-muted border-b border-border px-[5%] py-3">
      <div className="container">
        <Breadcrumbs items={items} domain={domain} />
      </div>
    </div>
  )
}
