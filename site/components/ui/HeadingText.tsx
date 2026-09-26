import type {CSSProperties, ReactNode} from 'react'
import type {HeadingFit} from '@/lib/headingFit'

// ─── A section heading's words, fitted to its column ──────────────────────────
//
// Phase 17C session 3 (`[R-536]`, `[R-544]`; monorepo WS-V1-PHASE17C3-DESIGN §2.1). The heading
// element is a size container (`section-heading`, `globals.css`) and carries the two widths its
// words need (`headingFitStyle`); its words sit in one block span whose size is the heading's own,
// or less where they would wrap past the rule in the column (`.heading-fit`). Why a span: a
// container's own properties cannot read its own container units, and a smaller inline span in a
// large heading would keep the heading's line height. With no fit (an empty heading, or a caller
// that computes none) it renders the words as today, so `.section-heading:empty` still hides the
// rule. Type-only import of the fit: this file never carries the width table.

/** The heading element's style: the two widths, which the span and, in a layout whose heading
 *  column can widen, the heading's own intrinsic width read. */
export function headingFitStyle(fit: HeadingFit | null | undefined): CSSProperties | undefined {
  return fit ? ({'--heading-w3': fit.w3, '--heading-w4': fit.w4} as CSSProperties) : undefined
}

export function HeadingText({fit, children}: {fit: HeadingFit | null | undefined; children: ReactNode}) {
  return fit ? <span className="heading-fit">{children}</span> : <>{children}</>
}
