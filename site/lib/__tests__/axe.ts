// axe-core over a rendered component in jsdom (monorepo WS-V1-ACCESSIBILITY-DESIGN-2026-10-13.md §2): the WCAG 2.0,
// 2.1 and 2.2 A and AA rules Verify runs on the served site (BE/Post-Deploy-Check/axe_scan.mjs), less the two that need
// a layout jsdom does not do. Contrast and target size are held by Verify's browser scan and colorGuarantee.test.ts.
import axe from 'axe-core'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const NEEDS_LAYOUT = {'color-contrast': {enabled: false}, 'target-size': {enabled: false}}

/** The violations under `root`, as `rule (nodes)`: an empty list is a pass. */
export async function axeViolations(root: Element): Promise<string[]> {
  const result = await axe.run(root, {runOnly: {type: 'tag', values: TAGS}, rules: NEEDS_LAYOUT, resultTypes: ['violations']})
  return result.violations.map((v) => `${v.id} (${v.nodes.length})`)
}
