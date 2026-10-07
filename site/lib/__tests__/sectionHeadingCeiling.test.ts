import {describe, it, expect} from 'vitest'
import {MARKETING_SCALE_MAP, SECTION_HEADING_MAX_REM} from '../designTokens'
import {RETIRED_STYLE_SETS, STYLE_SETS} from '../styleSets'

// The section heading's ceiling (Phase 18 session D, monorepo WS-DESIGN-ENGINE-GAPS-DESIGN.md §16.3 row 4, §19).
//
// A content section's heading and the close's are `.section-heading.marketing-h2` (`globals.css`):
//   max(1.25rem, clamp(1.5rem, 0.75rem + 4vw, var(--marketing-h2, 2.25rem)) × the face's capitals scale)
// so at every width the size is at most the scale's `h2`, and a face set in capitals only lowers it (its scale is
// at most 1). Measured on the study's 53 rated law sites at 1440, a page's section headings sit at a median of
// 43 px and no page's median passes 56; the md scale drew 64. The ceiling was 56, the top of the sites' range, until
// `[R-641]` put every homepage section on this tier and took the five premium references' top, 48 px: a statement band set large is a layout's, not every content section's (§16.4 item 2). The served
// pages hold the same rule in `scripts/ci/flow-metrics.mjs`.

const PX = 16
const sizeAt = (h2: string | undefined, width: number) =>
  Math.max(1.25 * PX, Math.min(Math.max(1.5 * PX, 0.75 * PX + 0.04 * width), h2 ? parseFloat(h2) * PX : 2.25 * PX))
const WIDTHS = [320, 390, 500, 768, 992, 1024, 1279, 1280, 1366, 1440, 1600, 1920, 2560]

describe('the section heading stays inside the sites’ range', () => {
  it('the ceiling is 48 px, the five premium references\u2019 top (monorepo `[R-641]`)', () => {
    expect(SECTION_HEADING_MAX_REM * PX).toBe(48)
  })

  it('no marketing scale sets a section heading above the ceiling, at any width', () => {
    for (const [scale, tokens] of Object.entries(MARKETING_SCALE_MAP)) {
      expect(parseFloat(tokens.h2), scale).toBeLessThanOrEqual(SECTION_HEADING_MAX_REM)
      for (const w of WIDTHS) expect(sizeAt(tokens.h2, w), `${scale} at ${w}`).toBeLessThanOrEqual(SECTION_HEADING_MAX_REM * PX)
    }
    for (const w of WIDTHS) expect(sizeAt(undefined, w), `default at ${w}`).toBeLessThanOrEqual(SECTION_HEADING_MAX_REM * PX)
  })

  it('every style set on the roster, offered or retired, keeps its section headings under the ceiling', () => {
    for (const set of [...STYLE_SETS, ...RETIRED_STYLE_SETS]) {
      const scale = String(set.settings.marketingScale ?? 'default')
      const h2 = MARKETING_SCALE_MAP[scale]?.h2
      for (const w of WIDTHS) expect(sizeAt(h2, w), `${set.id} (${scale}) at ${w}`).toBeLessThanOrEqual(SECTION_HEADING_MAX_REM * PX)
    }
  })

  it('every scale still steps down from the hero to the section heading to the smaller steps', () => {
    for (const [scale, t] of Object.entries(MARKETING_SCALE_MAP)) {
      const [h1, h2, h3, h4] = [t.h1, t.h2, t.h3, t.h4].map(parseFloat)
      expect(h1, scale).toBeGreaterThan(h2)
      expect(h2, scale).toBeGreaterThan(h3)
      expect(h3, scale).toBeGreaterThan(h4)
    }
  })
})
