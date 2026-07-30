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
 * WHY THIS EXISTS RATHER THAN THE BLOCK BEING TYPED OUT AGAIN. The band is four
 * lines of markup that had been written by hand at eighteen call sites, and the
 * defect CRUMB-5 fixes is what that costs: `components/attorney/layouts/` holds
 * four files with the same four names as `components/staff/layouts/`, driven by
 * the same layout switch, and the attorney four were simply written without the
 * block their twins carry. Nothing failed, because there was nothing to fail —
 * a block you have to remember to type is not a mechanism.
 *
 * FOUR CALL SITES REMAIN AND THAT IS NOT A SHORTFALL, it is the boundary of what
 * this can fix. Each profile layout owns its own hero and closes it at a
 * different depth, so nothing above them knows where "below the hero" is. What
 * changes is that the BLOCK exists once: a change to the band, or to how the
 * trail is wrapped, is one edit rather than four, and a new layout has something
 * to import rather than something to copy. **Extracting the hero out of the four
 * layouts is what would remove the last four repetitions, and that is a
 * restructure, not a breadcrumb pass.**
 *
 * The eighteen existing hand-written bands are NOT migrated here — that is the
 * `staffPage` placement pass and the eleven-types markup pass, each of which has
 * to move or re-wire its call sites anyway. Two shapes exist until they run.
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
